# IT Returns — CPA comparison

Compare and verify Income Tax Returns prepared by a CPA against source documents
and an independent computation, using the vendored **`itr-india`** skill.

> Not professional tax advice. You remain responsible for figures filed.
> Rules change every assessment year — re-confirm current slabs, limits, and forms.

## Skill used

| Item | Detail |
| --- | --- |
| Skill | `itr-india` |
| Installed at | [`.claude/skills/itr-india/`](../../.claude/skills/itr-india/) |
| Upstream | [shivprime94/file-itr](https://github.com/shivprime94/file-itr) |
| Trigger cues | ITR, Form 16, 26AS, AIS, old vs new regime, 80C/80D, capital gains, CPA return review |

See [`.claude/skills/UPSTREAM.md`](../../.claude/skills/UPSTREAM.md) for install/refresh notes.

## Goal

Answer, with a document-backed trail:

1. Does the CPA return match Form 16 / 26AS / AIS / bank / broker figures?
2. Is the chosen regime (old vs new) actually cheaper on the real numbers?
3. Were legitimate deductions claimed (or missed) under the old regime?
4. Does independent tax math match Part B-TTI (tax, cess, interest, TDS, payable)?
5. What variances need a CPA question or a correction before filing?

## Folder layout

```
it-returns/
├── README.md
├── WORKFLOW.md              # step-by-step comparison process
├── checklist.md             # documents to collect
├── inputs/
│   ├── cpa-return/          # CPA ITR draft, computation sheet, JSON/preview
│   └── source-docs/         # Form 16, 26AS, AIS/TIS, banks, broker, proofs
└── outputs/
    ├── reconciliation.md    # income heads ↔ source docs
    ├── regime-comparison.md # old vs new tax on the same numbers
    └── variance-report.md   # CPA figures vs independent figures
```

Drop files into `inputs/` (PDFs are gitignored). Working notes land in `outputs/`.

## Quick start

1. Fill `checklist.md` for the Assessment Year / Financial Year you care about.
2. Put the CPA draft return + computation into `inputs/cpa-return/`.
3. Put source docs into `inputs/source-docs/`.
4. Ask the agent (with this project open), for example:

   > Review my CPA ITR draft in `projects/it-returns/inputs/cpa-return/` against
   > the source docs in `inputs/source-docs/`. Reconcile income, compare old vs
   > new regime, and write a variance report under `outputs/`.

5. Walk through [WORKFLOW.md](./WORKFLOW.md). The `itr-india` skill supplies
   reconciliation rules, slabs, deduction catalogue, and verification discipline.

## Privacy

Tax documents stay local. `*.pdf` / `*.docx` are gitignored at the repo root.
Do not commit PAN, Aadhaar, passwords, OTPs, or full AIS dumps.
