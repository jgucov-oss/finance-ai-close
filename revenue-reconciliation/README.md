# Revenue reconciliation

Month-end question: does what we billed match what the ledger says, and does either match what
clients are contracted to pay? Three sources, three answers, one figure a controller can sign.

```bash
python reconcile.py            # fixtures/ in, output/report.md + output/exceptions.csv out
python -m pytest tests -q
```

## Stages

1. **Load:** read billing, ledger and contracts; reject any file whose columns are not the expected schema.
2. **Match:** pair billing documents with ledger postings by document number: clean match, amount mismatch, billed but not posted, or posted with no billing document.
3. **Bridge:** walk the billing total to the ledger total. Every difference lands in a named line; the last line is the unexplained residual.
4. **Expect:** compare billed revenue per client with the contracted amount; flag over, under and not billed.
5. **Validate:** invariants that must all hold or no report is written (exit 2):
   - no duplicate document numbers in billing or the ledger
   - every billing row and every ledger row lands in exactly one match bucket
   - the bridge residual is zero to the cent, and the bridge starts at the billing total
   - every billed client has a contract
   - credit memos carry negative amounts
6. **Report:** bridge table, exceptions to clear before close, billed-vs-contracted variances.

## What the sample month surfaces

The fixtures plant the problems a real close turns up: a transposed amount posted to the ledger
(27,600 billed, 27,060 posted), an invoice never posted, a manual journal entry with no billing
document, a credit memo that leaves a client under contract, a client billed above contract, and a
contracted client nobody invoiced. The run finds all six, and the bridge explains the full
difference with a residual of 0.00.

The tests also break it on purpose: a duplicated invoice, a credit memo with the wrong sign, a
client with no contract, a renamed column and a tampered bridge each block the report.
