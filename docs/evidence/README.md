# Evidence Folder

This folder stores **append-only** evidence artifacts for security/performance sign-off.

## Structure

- Create per-run folders: `docs/evidence/YYYY-MM-DD/`
- Put a filled-out evidence file in each run folder:
  - Start from `docs/evidence/EVIDENCE_TEMPLATE.md`
  - Add screenshots/exports only if needed

## Notes

- Do not store secrets (tokens, passwords, full cookies, DSNs).
- Prefer reproducible evidence (commands + outputs) over large binary files.

