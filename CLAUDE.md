# Global AI Instructions

Your context for this personal OS.

## Preferences
- Prefer concise, actionable project notes under `projects/`
- Keep private tax documents out of git (PDFs are gitignored)

## Skills

Skills live under `.claude/skills/`. See `.claude/skills/UPSTREAM.md`.

### itr-india (installed)

- **Path:** `.claude/skills/itr-india/`
- **Upstream:** https://github.com/shivprime94/file-itr
- **Use for:** Indian personal ITR prep/e-file help, income reconciliation (Form 16 / 26AS / AIS), old vs new regime comparison, and **reviewing/comparing CPA-prepared returns**
- **Primary project:** `projects/it-returns/`

When the user mentions ITR, Form 16, 26AS, AIS, tax regime, or CPA return review, load the `itr-india` skill (`SKILL.md` + needed `references/`) and prefer the workflow in `projects/it-returns/WORKFLOW.md` for CPA comparison work.

## Active projects

- `projects/it-returns/` — compare CPA IT returns against source docs and independent computation
