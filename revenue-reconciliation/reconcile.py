"""Month-end revenue reconciliation: billing system vs general ledger vs contracts.

Stages:
  1. load      read the three sources and check their schemas
  2. match     pair billing documents with ledger postings by document number
  3. bridge    walk billing total to ledger total; every dollar of difference gets a category
  4. expect    compare billed revenue to contracted revenue per client
  5. validate  invariants that must all hold before a report is written
  6. report    write report.md and exceptions.csv

Money is Decimal end to end. Any invariant failure exits 2 and writes no report.
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path

CENT = Decimal("0.01")

SCHEMAS = {
    "billing": ["doc_no", "client_id", "client_name", "type", "amount"],
    "ledger": ["doc_no", "client_id", "account", "amount"],
    "contracts": ["client_id", "client_name", "contracted_monthly"],
}


class SchemaError(Exception):
    pass


def money(raw: str) -> Decimal:
    return Decimal(raw.strip()).quantize(CENT)


def load(path: Path, kind: str) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != SCHEMAS[kind]:
            raise SchemaError(f"{path.name}: expected columns {SCHEMAS[kind]}, got {reader.fieldnames}")
        rows = list(reader)
    amount_col = "contracted_monthly" if kind == "contracts" else "amount"
    for r in rows:
        r[amount_col] = money(r[amount_col])
    return rows


@dataclass
class Match:
    matched: list[tuple[dict, dict]] = field(default_factory=list)
    amount_mismatch: list[tuple[dict, dict]] = field(default_factory=list)
    missing_in_ledger: list[dict] = field(default_factory=list)
    ledger_only: list[dict] = field(default_factory=list)


def match(billing: list[dict], ledger: list[dict]) -> Match:
    by_doc = {r["doc_no"]: r for r in ledger}
    m = Match()
    seen = set()
    for b in billing:
        g = by_doc.get(b["doc_no"])
        if g is None:
            m.missing_in_ledger.append(b)
            continue
        seen.add(b["doc_no"])
        if g["amount"] == b["amount"] and g["client_id"] == b["client_id"]:
            m.matched.append((b, g))
        else:
            m.amount_mismatch.append((b, g))
    m.ledger_only = [g for g in ledger if g["doc_no"] not in seen]
    return m


def total(rows, col="amount") -> Decimal:
    return sum((r[col] for r in rows), Decimal("0.00"))


def bridge(billing: list[dict], ledger: list[dict], m: Match) -> list[tuple[str, Decimal]]:
    """Billing total -> ledger total. The last line is the unexplained residual and must be zero."""
    lines = [("Billing system total", total(billing))]
    lines.append(("Less: billed but not posted to ledger", -total(m.missing_in_ledger)))
    lines.append(("Add: amount differences on matched documents",
                  sum((g["amount"] - b["amount"] for b, g in m.amount_mismatch), Decimal("0.00"))))
    lines.append(("Add: ledger postings with no billing document", total(m.ledger_only)))
    explained = sum((v for _, v in lines), Decimal("0.00"))
    lines.append(("Ledger total", total(ledger)))
    lines.append(("Unexplained residual", total(ledger) - explained))
    return lines


def expect(billing: list[dict], contracts: list[dict], tolerance: Decimal) -> list[dict]:
    billed = defaultdict(lambda: Decimal("0.00"))
    for b in billing:
        billed[b["client_id"]] += b["amount"]
    out = []
    for c in contracts:
        got = billed.get(c["client_id"], Decimal("0.00"))
        diff = got - c["contracted_monthly"]
        if abs(diff) > tolerance:
            kind = "not billed" if c["client_id"] not in billed else ("over contract" if diff > 0 else "under contract")
            out.append({"client_id": c["client_id"], "client_name": c["client_name"],
                        "contracted": c["contracted_monthly"], "billed": got, "variance": diff, "kind": kind})
    return out


def validate(billing, ledger, contracts, m: Match, bridge_lines) -> list[str]:
    """Return failed invariant names. Empty list means the report may be written."""
    failures = []

    def check(name: str, ok: bool):
        if not ok:
            failures.append(name)

    dup_b = [d for d, n in Counter(r["doc_no"] for r in billing).items() if n > 1]
    dup_l = [d for d, n in Counter(r["doc_no"] for r in ledger).items() if n > 1]
    check(f"no duplicate billing documents {dup_b}", not dup_b)
    check(f"no duplicate ledger documents {dup_l}", not dup_l)

    accounted = len(m.matched) + len(m.amount_mismatch) + len(m.missing_in_ledger)
    check("every billing row lands in exactly one match bucket", accounted == len(billing))
    accounted_l = len(m.matched) + len(m.amount_mismatch) + len(m.ledger_only)
    check("every ledger row lands in exactly one match bucket", accounted_l == len(ledger))

    check("bridge residual is zero to the cent", bridge_lines[-1][1] == Decimal("0.00"))
    check("bridge starts at the billing total", bridge_lines[0][1] == total(billing))

    known = {c["client_id"] for c in contracts}
    orphans = sorted({b["client_id"] for b in billing} - known)
    check(f"every billed client has a contract {orphans}", not orphans)

    credits_positive = [b["doc_no"] for b in billing if b["type"] == "credit" and b["amount"] > 0]
    check(f"credit memos carry negative amounts {credits_positive}", not credits_positive)
    return failures


def render(billing, m: Match, bridge_lines, variances) -> str:
    def fmt(d: Decimal) -> str:
        return f"{d:,.2f}"

    out = ["# Revenue reconciliation", "", "## Bridge: billing system to general ledger", "",
           "| Line | Amount |", "|---|---:|"]
    out += [f"| {name} | {fmt(v)} |" for name, v in bridge_lines]
    out += ["", f"Documents matched clean: {len(m.matched)} of {len(billing)} billing rows.", "",
            "## Exceptions to clear before close", ""]
    for b, g in m.amount_mismatch:
        out.append(f"- **{b['doc_no']}** ({b['client_name']}): billed {fmt(b['amount'])}, "
                   f"posted {fmt(g['amount'])}, difference {fmt(g['amount'] - b['amount'])}")
    for b in m.missing_in_ledger:
        out.append(f"- **{b['doc_no']}** ({b['client_name']}): billed {fmt(b['amount'])}, not posted to the ledger")
    for g in m.ledger_only:
        out.append(f"- **{g['doc_no']}** ({g['client_id']}): ledger posting {fmt(g['amount'])} with no billing document")
    out += ["", "## Billed vs contracted", "", "| Client | Contracted | Billed | Variance | Flag |",
            "|---|---:|---:|---:|---|"]
    out += [f"| {v['client_name']} | {fmt(v['contracted'])} | {fmt(v['billed'])} | {fmt(v['variance'])} | {v['kind']} |"
            for v in variances]
    return "\n".join(out) + "\n"


def run(src: Path, out: Path, tolerance: Decimal = Decimal("1.00")) -> int:
    billing = load(src / "billing.csv", "billing")
    ledger = load(src / "ledger.csv", "ledger")
    contracts = load(src / "contracts.csv", "contracts")
    m = match(billing, ledger)
    bridge_lines = bridge(billing, ledger, m)
    variances = expect(billing, contracts, tolerance)

    failures = validate(billing, ledger, contracts, m, bridge_lines)
    if failures:
        print("BLOCKED: invariant failures, no report written:")
        for f in failures:
            print(f"  - {f}")
        return 2

    out.mkdir(parents=True, exist_ok=True)
    (out / "report.md").write_text(render(billing, m, bridge_lines, variances), encoding="utf-8")
    with (out / "exceptions.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["doc_no", "issue", "billing_amount", "ledger_amount"])
        for b, g in m.amount_mismatch:
            w.writerow([b["doc_no"], "amount mismatch", b["amount"], g["amount"]])
        for b in m.missing_in_ledger:
            w.writerow([b["doc_no"], "not posted", b["amount"], ""])
        for g in m.ledger_only:
            w.writerow([g["doc_no"], "no billing document", "", g["amount"]])
    print(f"OK: all invariants passed. Report: {out / 'report.md'}")
    return 0


def main() -> None:
    here = Path(__file__).parent
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--src", type=Path, default=here / "fixtures")
    p.add_argument("--out", type=Path, default=here / "output")
    p.add_argument("--tolerance", type=Decimal, default=Decimal("1.00"))
    a = p.parse_args()
    sys.exit(run(a.src, a.out, a.tolerance))


if __name__ == "__main__":
    main()
