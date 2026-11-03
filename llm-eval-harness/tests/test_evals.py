import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import evals as ev  # noqa: E402

CASES = ev.load_cases(Path(__file__).resolve().parents[1] / "cases" / "invoices.jsonl")


def perfect_outputs():
    return {c["id"]: copy.deepcopy(c["golden"]) for c in CASES}


def test_perfect_answers_pass_the_gate():
    rep = ev.evaluate(CASES, perfect_outputs(), "perfect")
    assert rep.field_accuracy == 1.0
    assert rep.gate_failures() == []


def test_formatting_differences_are_not_errors():
    out = perfect_outputs()
    out["inv-01"]["total"] = "$18,500.00"
    out["inv-01"]["vendor"] = "  northwind logistics   llc "
    out["inv-06"]["total"] = "($2,250.00)"
    rep = ev.evaluate(CASES, out, "formatted")
    assert rep.gate_failures() == []


def test_one_fabricated_field_fails_the_gate_even_at_high_accuracy():
    out = perfect_outputs()
    out["inv-03"]["due_date"] = "2026-10-31"  # document says "upon receipt"
    rep = ev.evaluate(CASES, out, "fabricator")
    assert rep.field_accuracy > 0.95
    assert rep.fabrications == 1
    assert any("fabricated" in f for f in rep.gate_failures())


def test_subtotal_instead_of_total_is_wrong():
    out = perfect_outputs()
    out["inv-02"]["total"] = 40000.00
    res = ev.score_case(CASES[1], out["inv-02"])
    assert res.wrong == ["total"]


def test_missing_response_counts_as_failure_not_skip():
    out = perfect_outputs()
    del out["inv-05"]
    rep = ev.evaluate(CASES, out, "dropped")
    assert rep.parse_failures == 1
    assert rep.gate_failures()


def test_unparseable_date_scores_wrong():
    out = perfect_outputs()
    out["inv-04"]["invoice_date"] = "05.10.2026"
    assert ev.score_case(CASES[3], out["inv-04"]).wrong == ["invoice_date"]


def test_parse_json_object_handles_prose_around_json():
    assert ev.parse_json_object('Here you go:\n{"total": 5}\nThanks') == {"total": 5}
    assert ev.parse_json_object("no json here") is None


def test_recorded_responses_cover_every_case():
    ids = {c["id"] for c in CASES}
    for name in ("haiku_prompt_v1", "haiku_prompt_v2"):
        assert set(ev.recorded(name)) == ids
