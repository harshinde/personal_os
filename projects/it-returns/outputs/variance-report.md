# CPA new vs old computation — review

**FY / AY:** 2025-26 / 2026-27  
**ITR form (likely):** ITR-1 (pension + interest only, if no CG / HP / foreign assets)  
**Regime to file:** **New (115BAC)**  
**Reviewer / date:** itr-india skill pass · 2026-07-27  

## Summary

- Overall status: `ask-cpa` on a few proof/TDS gaps; **regime choice is clear**
- Payable — New: ₹72,280 · Old: ₹1,63,730 · **Δ favouring new: ≈ ₹91,450**
- CPA math on both sheets: **verified to the rupee** (slab tax + 4% cess)
- Opportunity to “make old better” with more deductions: **does not beat new** on these numbers

## Frame

| Item | Value |
| --- | --- |
| Residential status | Resident · Senior citizen |
| Income in sheets | Pension + bank/PO interest |
| Documents reviewed | Two CPA computation CSVs only |
| Still missing for full reconcile | Form 16 / pension certificate, 26AS, AIS/TIS, bank interest certificates, PPF proof, 80D bills |

## Side-by-side

| Area | New (₹) | Old (₹) | Notes |
| --- | ---: | ---: | --- |
| Pension gross | 5,65,278 | 5,65,278 | Same |
| Std deduction | 75,000 | 50,000 | Correct per regime |
| Interest | 9,52,558 | 9,52,558 | Same breakup both sheets |
| Chapter VI-A | 0 | 2,20,000 | 80C 1.2L + 80D 50k + 80TTB 50k |
| Total income (288A) | 14,42,840 | 12,47,840 | |
| Tax + cess | 1,00,283 | 1,91,726 | Independent recompute matches |
| TDS | 28,000 | 28,000 | Only BoB 194A |
| Payable | 72,280 | 1,63,730 | Prefer new |

## Gaps / questions (severity)

| # | Finding | Severity | Action |
| --- | --- | --- | --- |
| 1 | **Large interest with ₹0 TDS** — Canara ₹5,03,597, KS Apex ₹60,563, CPRC ₹57,856 (plus savings interest). Only BoB shows TDS ₹28,000. Likely Form 15H, but must match **26AS/AIS**. | ask-cpa | Pull 26AS + AIS; confirm 15H / why no 194A on Canara & others |
| 2 | **Income not reconciled to bank/AIS** — sheets alone; no source pack in this review. | ask-cpa / blocker if filing | Drop Form 16/pension cert, 26AS, AIS, interest certificates into `inputs/source-docs/` |
| 3 | **80D schedule looks odd** — Schedule 7 shows medical expenses ₹1,00,000 *and* health check-up ₹1,00,000, then allowable ₹50,000. For seniors without insurance, 80D allows medical expenditure up to ₹50k — amount claimed is at the cap, but the dual ₹1L lines need a clean proof trail. | ask-cpa | Keep bills totaling ≥ ₹50k; clarify insurance vs medical-expense claim |
| 4 | **80C only ₹1,20,000 PPF** — ₹30k headroom under ₹1.5L cap. Filling it would save tax **only in old regime**, and old still loses to new by a wide margin. | info | Optional for next year planning; irrelevant to this year’s regime pick |
| 5 | **No 80CCD(1B) NPS** claimed — same as above; even +₹50k NPS does not flip old vs new. | info | Ask only if NPS contribution actually exists this year |
| 6 | **Parents’ 80D** not claimed — only if parents’ premiums/medical expenses exist and are eligible. Still won’t beat new regime here. | info | Confirm with assessee |
| 7 | **HRA** shown as ₹0 — expected for pure pensioner unless rent paid without HRA (then 80GG — usually small). | info | Skip unless rent paid |
| 8 | **Refund bank** = Vijaya Bank (IFS VIJB0004085) — confirm account still active / mapped (Vijaya→BoB merger legacy). | ask-cpa | Confirm pre-filing |
| 9 | **ITR form** — if only pension + interest → **ITR-1**; any CG, more than one HP, or foreign assets → ITR-2. | ask-cpa | Confirm no equity/MF sales, no foreign assets |

## Opportunities to make it better

| Opportunity | Impact this year |
| --- | --- |
| **Choose new regime** | Saves ≈ **₹91k** vs old as filed |
| Max out remaining old-regime deductions | **Does not beat new** (still ~₹50k+ worse in optimistic case) |
| Ensure all interest is reported (including any bank missing from sheet) | Accuracy / under-reporting risk — verify vs AIS & statements |
| Claim any missed TDS from 26AS | Could reduce ₹72,280 payable if more TDS exists |
| Keep 80D/PPF proofs even if filing new | Not used in new regime, but retain for records / future years |

## Questions for the CPA

1. Please confirm filing under **new regime** (cheaper by ~₹91k on these sheets).
2. Please share **26AS + AIS** extract — especially why Canara / KS Apex / CPRC interest has **nil TDS** while fully offered.
3. Is any TDS beyond BoB’s ₹28,000 available to credit?
4. Please share clean **80D** supporting bills (and whether claim is insurance or medical expenditure).
5. Confirm **no capital gains / foreign assets** so ITR-1 is correct.
6. Confirm refund account (Vijaya / BoB) is valid for credit.

## Decision

- [x] Prefer **new regime** computation for filing
- [ ] Hold filing until 26AS/AIS interest + TDS reconcile
- [ ] Request CPA clarification on items 1–6 above
