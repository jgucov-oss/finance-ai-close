# LLM eval harness: invoice extraction

Before an LLM extraction step feeds accounts payable, it has to clear a gate on a golden set. This
harness scores model output field by field, compares prompt versions or models side by side, and
blocks release on any fabricated value.

```bash
python evals.py --source recorded:haiku_prompt_v1 --source recorded:haiku_prompt_v2   # offline
pip install anthropic && export ANTHROPIC_API_KEY=...
python evals.py --source live:<model-id> --prompt prompts/extract_v2.txt              # live
python -m pytest tests -q
```

## How it scores

- **Normalize meaning, not format.** `"$18,500.00"`, `18500` and `18500.0` are the same total;
  `"(2,250.00)"` is negative. Dates must parse as ISO 8601.
- **Wrong vs fabricated.** A wrong value is an error. A value where the document has none (an
  invented due date or PO number) is a **fabrication**, and the gate allows zero. In AP a blank
  field gets a human look; an invented one gets paid.
- **Missing or unparseable response = failure.** Nothing is silently skipped.
- **Gate:** field accuracy ≥ 95%, case pass rate ≥ 85%, 0 fabrications, 0 parse failures.

## Golden set

Eight synthetic documents, seven of them traps: tax before the total, no due date stated, a German
invoice with `27.600,00 EUR`, a Colombian invoice with `COP $4.500.000` and day-first dates, a
credit note in parentheses, a customer account number next to the invoice number, and a prior
balance shown above the current charges.

## Recorded results

`responses/` holds real outputs from Claude Haiku, one run per prompt version, recorded through
Claude Code subagents rather than the raw API (so not temperature-0 API calls).

| Run | Field accuracy | Cases passed | Fabrications | Gate |
|---|---:|---:|---:|---|
| Haiku, prompt v1 (bare field list) | 98.2% | 7 / 8 | 0 | PASS |
| Haiku, prompt v2 (explicit rules) | 98.2% | 7 / 8 | 0 | PASS |

What the results say:

- **The one miss is `Harbor &amp; Pine`:** an HTML-escaped ampersand in both runs, most likely
  from the transport layer rather than the model. The scorer counts it wrong on purpose: that
  string would land in the vendor master as-is. The fix belongs in the pipeline (unescape at the
  boundary), not in the scorer.
- **The two prompts tie, so this set is too easy to separate them.** The model already handles
  every trap. The next step is harder cases (multi-page documents, conflicting dates, partial
  credits) until the set discriminates. An eval that cannot tell two candidates apart is not yet
  doing its job.
