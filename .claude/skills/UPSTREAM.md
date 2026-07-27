# Installed skills — upstream sources

## itr-india

| Field | Value |
| --- | --- |
| Skill name | `itr-india` |
| Path | `.claude/skills/itr-india/` |
| One-click package | `.claude/skills/itr-india.skill` |
| Upstream | https://github.com/shivprime94/file-itr |
| Upstream path | `skills/itr-india/` |
| License | MIT |
| Vendored from | `e92c5d0cbf858479ac47f25fb142446702c4e289` (2026-07-22) |

### How it loads

- **Claude Code / Agent SDK:** place (or keep) the folder under `.claude/skills/`; the agent reads `SKILL.md` frontmatter `description` to decide when to trigger.
- **Claude Cowork:** import `itr-india.skill` via Settings → Capabilities → Skills (or drag into chat → Save skill).
- **This personal OS:** the skill is vendored in-repo so any agent session in this workspace can use it for Indian ITR work, including CPA return comparison under `projects/it-returns/`.

### Refresh from upstream

```bash
git clone --depth 1 https://github.com/shivprime94/file-itr.git /tmp/file-itr
rm -rf .claude/skills/itr-india
cp -r /tmp/file-itr/skills/itr-india .claude/skills/
cp /tmp/file-itr/itr-india.skill .claude/skills/itr-india.skill
```

Then update the commit hash in this file.
