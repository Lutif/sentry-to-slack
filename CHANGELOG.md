# Changelog

## Unreleased

### Fixed
- Slack alerts were arriving blank ("Unknown Project", "No message provided", "Unknown Culprit", level `info`) for Sentry integration webhooks. The handler was reading from `body.data.event`, but integration webhooks deliver the alert at `body.data.issue`. The extractor now reads from `data.issue` first and falls back to `data.event` for the older event-alert payload shape.

### Changed
- Title in Slack messages now links to the Sentry issue via `issue.permalink`.
- Project is taken from `issue.project.slug || issue.project.name`; message body from `metadata.value`; level from `issue.level` so error issues are correctly flagged.
- Culprit is rendered as inline code and no longer shares the `*Message:*` label.
