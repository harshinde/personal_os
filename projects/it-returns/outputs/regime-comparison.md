# Old vs new regime comparison

**FY / AY:** 2025-26 / 2026-27  
**Assessee:** Yerahalli Jayadev Nagaveni (Resident · Senior citizen, age 65–66)  
**Source:** CPA computation CSVs (New Regime + Old Regime), dated 25-Jul-2026  
**Slabs:** `references/tax-regimes-and-slabs.md` (FY 2025-26) — independently recomputed

> Not professional tax advice. Figures below recompute the CPA sheets; source docs (26AS/AIS/banks) were not available to reconcile income.

## Assumptions (from CPA sheets)

- Income: pension ₹5,65,278 + interest ₹9,52,558
- No capital gains / house property / business income disclosed
- Old-regime deductions claimed: 80C PPF ₹1,20,000 · 80D ₹50,000 · 80TTB ₹50,000
- TDS credit: ₹28,000 (Bank of Baroda, u/s 194A only)
- No Form 10-IEA issue (no business income — regime chosen in the return)

## Taxable income build

| Component | Old regime (₹) | New regime (₹) |
| --- | ---: | ---: |
| Pension (gross) | 5,65,278 | 5,65,278 |
| (−) Standard deduction | 50,000 | 75,000 |
| Income from salaries | 5,15,278 | 4,90,278 |
| Interest (other sources) | 9,52,558 | 9,52,558 |
| Gross total income | 14,67,836 | 14,42,836 |
| (−) Chapter VI-A | 2,20,000 | — |
| **Total income (pre-288A)** | **12,47,836** | **14,42,836** |
| Rounded u/s 288A | 12,47,840 | 14,42,840 |

### Chapter VI-A (old regime, as filed)

| Section | Proof (per sheet) | Amount (₹) |
| --- | --- | ---: |
| 80C | PPF | 1,20,000 |
| 80D | Medical expenses (senior self; capped) | 50,000 |
| 80TTB | Bank/PO interest | 50,000 |
| **Total** | | **2,20,000** |

## Tax computation (independent check — matches CPA)

| Line | Old (₹) | New (₹) |
| --- | ---: | ---: |
| Slab tax | 1,84,352 | 96,426 |
| (+) Cess 4% | 7,374 | 3,857 |
| **Tax with cess** | **1,91,726** | **1,00,283** |
| (−) TDS | 28,000 | 28,000 |
| **Balance payable** | **~1,63,730** | **~72,280** |

### New-regime slab check (TI ₹14,42,840)

| Band | Rate | Tax (₹) |
| --- | ---: | ---: |
| 0 – 4L | 0% | 0 |
| 4L – 8L | 5% | 20,000 |
| 8L – 12L | 10% | 40,000 |
| 12L – 14,42,840 | 15% | 36,426 |
| **Total** | | **96,426** |

### Old-regime slab check — senior (TI ₹12,47,840)

| Band | Rate | Tax (₹) |
| --- | ---: | ---: |
| 0 – 3L | 0% | 0 |
| 3L – 5L | 5% | 10,000 |
| 5L – 10L | 20% | 1,00,000 |
| 10L – 12,47,840 | 30% | 74,352 |
| **Total** | | **1,84,352** |

## Recommendation

- **Cheaper regime: New (115BAC)** by **₹91,443** (tax with cess).
- Payable under new ≈ **₹72,280** vs old ≈ **₹1,63,730**.
- Even stacking optimistic extra old-regime claims (full 80C ₹1.5L + NPS 80CCD(1B) ₹50k + parents 80D ₹50k) still leaves old **~₹50k+ more expensive** than new. Extra old-regime hunting will not flip the choice for this year.

**File under the new regime** unless a material income head is missing from these sheets.
