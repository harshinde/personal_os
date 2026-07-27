# CPA return comparison workflow

Follow this sequence. Prefer the `itr-india` skill references under
`.claude/skills/itr-india/references/` for detail.

## 0. Establish the frame

- Assessment Year (AY) and Financial Year (FY)
- Residential status, age band (senior slabs differ)
- Income picture: salary / profession / capital gains / interest / other
- Regime the CPA used, and whether Form 10-IEA applies (business filers)

Record answers at the top of `outputs/variance-report.md`.

## 1. Inventory documents

Use [checklist.md](./checklist.md). Every income head and every old-regime
deduction claim needs a proof path under `inputs/source-docs/`.

## 2. Extract CPA figures

From `inputs/cpa-return/` (ITR preview, computation sheet, or JSON), capture:

| Line | CPA amount | Source page / schedule |
| --- | ---: | --- |
| Gross salary | | |
| Income from business/profession | | |
| Capital gains (STCG / LTCG split) | | |
| Other sources (interest, dividend, …) | | |
| Gross total income | | |
| Chapter VI-A deductions (itemised) | | |
| Taxable income | | |
| Tax + surcharge + cess | | |
| 234B / 234C interest | | |
| TDS / TCS / advance / self-assessment | | |
| Amount payable / refund | | |
| Regime + ITR form | | |

## 3. Reconcile income to sources

Build `outputs/reconciliation.md` using the pattern in
`references/income-reconciliation.md`:

- One number per head, each tied to a document
- Cross-tie Form 16 ↔ 26AS (192), platforms ↔ bank credits, broker ↔ bank
- Flag AIS/26AS gaps that are still taxable

Do not move on until every material rupee has a source or an explicit open question.

## 4. Independent tax computation + regime compare

Write `outputs/regime-comparison.md`:

1. Re-confirm current-year slabs (`references/tax-regimes-and-slabs.md`).
2. Compute taxable income **separately** under old and new regimes.
3. Apply special rates (e.g. 111A/112A, VDA 115BBH) on top of slab tax, then 4% cess.
4. Apply 87A rebate where eligible.
5. Pick the cheaper outcome and list assumptions.

Old-regime deduction catalogue: `references/deductions-old-regime.md`.

## 5. Variance report (CPA vs independent)

Fill `outputs/variance-report.md`:

| Area | CPA | Independent | Δ | Severity | Action |
| --- | ---: | ---: | ---: | --- | --- |
| Income head … | | | | | |
| Deduction … | | | | | |
| Tax / payable … | | | | | |

Severity guide:

- **Blocker** — wrong income, wrong TDS credit, or math that changes payable/refund
- **Ask CPA** — judgment calls, classification, or missing proof
- **Info** — presentation / schedule mapping only

## 6. Decision

- **Match within rounding (s.288B nearest ₹10):** safe to proceed with CPA filing path
- **Material variance:** send the variance table to the CPA before submit/e-verify
- **Cheaper regime unused:** document the delta; decide with the CPA whether to switch

Hard stops (user only): portal password/OTP, payment, Submit, e-Verify.
