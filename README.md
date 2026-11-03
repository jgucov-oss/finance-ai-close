# finance-ai-close

Two pieces of the work an AI engineer does inside a finance team at month-end: reconcile the
numbers so a controller can sign off, and prove an LLM step is dependable before anyone relies on
it. Python standard library plus pytest. All data is synthetic.

| Folder | What it shows |
|---|---|
| [`revenue-reconciliation/`](revenue-reconciliation/) | Billing system, general ledger and contracts reconciled into one month-end figure. A bridge explains every dollar between billing and the ledger, and invariants block the report if anything does not tie to the cent. |
| [`llm-eval-harness/`](llm-eval-harness/) | Invoice-field extraction scored against a golden set with deliberate traps (subtotal vs total, European number format, a peso written with "$", a credit note, a missing due date). One fabricated value fails the release gate regardless of accuracy. |

Both are patterns I run in production at a multi-entity BPO (QuickBooks, monday.com, Microsoft
365), rebuilt here on synthetic data so they can be read and run by anyone.

```bash
pip install pytest
python -m pytest                                            # 17 tests
python revenue-reconciliation/reconcile.py                  # writes output/report.md
python llm-eval-harness/evals.py --source recorded:haiku_prompt_v1 --source recorded:haiku_prompt_v2
```

Design choices that carry across both:

- **Fail closed.** A failed invariant or gate exits non-zero and writes nothing downstream. A missing
  model response counts as a failure, never a skipped case.
- **Every check can fail.** Each gate has a test that breaks it on purpose, so a passing run means
  something.
- **Money is Decimal.** No floats anywhere a ledger total is computed.
