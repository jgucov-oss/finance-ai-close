import shutil
import sys
from decimal import Decimal
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import reconcile as rc  # noqa: E402

FIX = Path(__file__).resolve().parents[1] / "fixtures"


@pytest.fixture
def src(tmp_path):
    d = tmp_path / "src"
    shutil.copytree(FIX, d)
    return d


def _load(d):
    return (rc.load(d / "billing.csv", "billing"), rc.load(d / "ledger.csv", "ledger"),
            rc.load(d / "contracts.csv", "contracts"))


def test_clean_month_passes_and_writes_report(src, tmp_path):
    assert rc.run(src, tmp_path / "out") == 0
    report = (tmp_path / "out" / "report.md").read_text(encoding="utf-8")
    assert "| Unexplained residual | 0.00 |" in report


def test_every_planted_exception_is_found(src):
    billing, ledger, contracts = _load(src)
    m = rc.match(billing, ledger)
    assert [b["doc_no"] for b, _ in m.amount_mismatch] == ["INV-1004"]
    assert [b["doc_no"] for b in m.missing_in_ledger] == ["INV-1007"]
    assert [g["doc_no"] for g in m.ledger_only] == ["JE-0457"]


def test_contract_variances_flag_credit_overbilling_and_missed_invoice(src):
    billing, _, contracts = _load(src)
    kinds = {v["client_id"]: v["kind"] for v in rc.expect(billing, contracts, Decimal("1.00"))}
    assert kinds == {"C02": "under contract", "C09": "over contract", "C10": "not billed"}


def test_bridge_residual_is_zero(src):
    billing, ledger, _ = _load(src)
    lines = rc.bridge(billing, ledger, rc.match(billing, ledger))
    assert lines[-1] == ("Unexplained residual", Decimal("0.00"))


def test_duplicate_billing_row_blocks_the_report(src, tmp_path):
    with (src / "billing.csv").open("a", encoding="utf-8") as f:
        f.write("INV-1001,C01,Northwind Logistics,invoice,18500.00\n")
    assert rc.run(src, tmp_path / "out") == 2
    assert not (tmp_path / "out" / "report.md").exists()


def test_positive_credit_memo_blocks_the_report(src, tmp_path):
    p = src / "billing.csv"
    p.write_text(p.read_text(encoding="utf-8").replace("credit,-2250.00", "credit,2250.00"), encoding="utf-8")
    assert rc.run(src, tmp_path / "out") == 2


def test_billing_for_unknown_client_blocks_the_report(src, tmp_path):
    with (src / "billing.csv").open("a", encoding="utf-8") as f:
        f.write("INV-1099,C99,Unknown Co,invoice,500.00\n")
    assert rc.run(src, tmp_path / "out") == 2


def test_wrong_schema_is_rejected(src):
    p = src / "ledger.csv"
    p.write_text(p.read_text(encoding="utf-8").replace("account", "gl_account", 1), encoding="utf-8")
    with pytest.raises(rc.SchemaError):
        rc.load(p, "ledger")


def test_tampered_bridge_fails_validation(src):
    """The residual check can actually fail: corrupt one bridge line and it must trip."""
    billing, ledger, contracts = _load(src)
    m = rc.match(billing, ledger)
    lines = rc.bridge(billing, ledger, m)
    lines[-1] = ("Unexplained residual", Decimal("0.01"))
    assert "bridge residual is zero to the cent" in rc.validate(billing, ledger, contracts, m, lines)
