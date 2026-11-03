"""Eval harness for LLM invoice-field extraction.

Scores model output against a golden set, field by field, and applies a release gate.
A fabricated value (the model returns something where the document has nothing) fails
the gate outright, whatever the accuracy: in accounts payable an invented due date or
PO number is worse than a blank one.

Sources of model output:
  recorded:<name>   read responses/<name>.jsonl (offline, reproducible, used in CI)
  live:<model_id>   call the Anthropic API with --prompt (needs ANTHROPIC_API_KEY and `pip install anthropic`)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
FIELDS = ["vendor", "invoice_number", "invoice_date", "due_date", "currency", "total", "po_number"]

GATE = {
    "min_field_accuracy": 0.95,
    "min_case_pass_rate": 0.85,
    "max_fabrications": 0,
    "max_parse_failures": 0,
}


def load_cases(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


# ---------- normalization: compare meaning, not formatting ----------

def norm_text(v) -> str | None:
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip().lower()
    return s or None


def norm_date(v) -> str | None:
    if v is None or str(v).strip() == "":
        return None
    try:
        return date.fromisoformat(str(v).strip()).isoformat()
    except ValueError:
        return f"unparsed:{v}"  # never equals a golden ISO date, so it scores wrong


def norm_amount(v) -> float | None:
    if v is None or str(v).strip() == "":
        return None
    if isinstance(v, (int, float)):
        return round(float(v), 2)
    s = str(v).strip()
    negative = s.startswith("(") and s.endswith(")") or s.startswith("-")
    digits = re.sub(r"[^\d.]", "", s)
    try:
        val = round(float(digits), 2)
    except ValueError:
        return None
    return -val if negative else val


NORMALIZERS = {
    "invoice_date": norm_date,
    "due_date": norm_date,
    "total": norm_amount,
}


def normalize(fld: str, v):
    return NORMALIZERS.get(fld, norm_text)(v)


# ---------- scoring ----------

@dataclass
class CaseResult:
    case_id: str
    parsed: bool
    wrong: list[str] = field(default_factory=list)
    fabricated: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return self.parsed and not self.wrong and not self.fabricated


def score_case(case: dict, output) -> CaseResult:
    res = CaseResult(case["id"], parsed=isinstance(output, dict))
    if not res.parsed:
        res.wrong = list(FIELDS)
        return res
    for f in FIELDS:
        gold = normalize(f, case["golden"][f])
        got = normalize(f, output.get(f))
        if gold is None and got is not None:
            res.fabricated.append(f)
        elif gold != got:
            res.wrong.append(f)
    return res


@dataclass
class Report:
    source: str
    results: list[CaseResult]

    @property
    def field_accuracy(self) -> float:
        total = len(self.results) * len(FIELDS)
        bad = sum(len(r.wrong) + len(r.fabricated) for r in self.results)
        return (total - bad) / total if total else 0.0

    @property
    def case_pass_rate(self) -> float:
        return sum(r.passed for r in self.results) / len(self.results) if self.results else 0.0

    @property
    def fabrications(self) -> int:
        return sum(len(r.fabricated) for r in self.results)

    @property
    def parse_failures(self) -> int:
        return sum(not r.parsed for r in self.results)

    def gate_failures(self, gate: dict = GATE) -> list[str]:
        out = []
        if self.field_accuracy < gate["min_field_accuracy"]:
            out.append(f"field accuracy {self.field_accuracy:.1%} < {gate['min_field_accuracy']:.0%}")
        if self.case_pass_rate < gate["min_case_pass_rate"]:
            out.append(f"case pass rate {self.case_pass_rate:.1%} < {gate['min_case_pass_rate']:.0%}")
        if self.fabrications > gate["max_fabrications"]:
            out.append(f"{self.fabrications} fabricated value(s)")
        if self.parse_failures > gate["max_parse_failures"]:
            out.append(f"{self.parse_failures} unparseable response(s)")
        return out


def evaluate(cases: list[dict], outputs: dict[str, object], source: str) -> Report:
    # A missing response is a parse failure, never a skipped case.
    return Report(source, [score_case(c, outputs.get(c["id"])) for c in cases])


# ---------- model output sources ----------

def parse_json_object(text: str):
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        obj = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    return obj if isinstance(obj, dict) else None


def recorded(name: str) -> dict[str, object]:
    path = HERE / "responses" / f"{name}.jsonl"
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    return {r["id"]: r["output"] for r in rows}


def live(model: str, prompt_path: Path, cases: list[dict]) -> dict[str, object]:
    import anthropic  # optional dependency, only for live runs

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    template = prompt_path.read_text(encoding="utf-8")
    out = {}
    for c in cases:
        msg = client.messages.create(
            model=model, max_tokens=512, temperature=0,
            messages=[{"role": "user", "content": template.replace("{document}", c["document"])}],
        )
        out[c["id"]] = parse_json_object("".join(b.text for b in msg.content if b.type == "text"))
    return out


# ---------- CLI ----------

def print_report(rep: Report) -> None:
    print(f"\n== {rep.source}")
    print(f"field accuracy {rep.field_accuracy:.1%} | cases passed {sum(r.passed for r in rep.results)}/"
          f"{len(rep.results)} | fabrications {rep.fabrications} | parse failures {rep.parse_failures}")
    for r in rep.results:
        if not r.passed:
            detail = ", ".join([f"wrong: {w}" for w in r.wrong] + [f"FABRICATED: {f}" for f in r.fabricated])
            print(f"  {r.case_id}: {detail}")
    fails = rep.gate_failures()
    print("  GATE: PASS" if not fails else "  GATE: FAIL  (" + "; ".join(fails) + ")")


def main() -> None:
    p = argparse.ArgumentParser(description="Score invoice extraction against the golden set.")
    p.add_argument("--source", action="append", required=True,
                   help="recorded:<name> or live:<model_id>; repeat to compare")
    p.add_argument("--prompt", type=Path, default=HERE / "prompts" / "extract_v2.txt")
    p.add_argument("--cases", type=Path, default=HERE / "cases" / "invoices.jsonl")
    a = p.parse_args()

    cases = load_cases(a.cases)
    any_fail = False
    for src in a.source:
        kind, _, name = src.partition(":")
        outputs = recorded(name) if kind == "recorded" else live(name, a.prompt, cases)
        rep = evaluate(cases, outputs, src)
        print_report(rep)
        any_fail |= bool(rep.gate_failures())
    sys.exit(1 if any_fail else 0)


if __name__ == "__main__":
    main()
