# Settings & configuration pattern

## Principle

**Configurable items live in Settings; feature pages stay focused on viewing and acting on data.**

- **Settings** (`/settings`): Where users *change* connections, bankroll, and (later) preferences.
- **Portfolio Risk** (`/prediction-markets/portfolio`): View positions, run risk analysis, sync positions. Bankroll and connection status are **read-only** here with links to Settings to edit.
- **Dashboard**: Shows summaries (e.g. bankroll card); links to Settings for configuration, or to the relevant feature page for detail.

## Current structure

| Area | Location | Purpose |
|------|----------|---------|
| **Connections** | Settings → Connections section | Connect/disconnect Kalshi API and Polymarket wallet. |
| **Bankroll & risk** | Settings → Bankroll section | Set risk capital (USD) and Kelly fraction. |
| **Profile / account** | Account page; Settings links there | Name, email, subscription; "Edit profile" / "Change password" (coming soon) live under account. |

## Adding new config

- **User-level config** (applies across the app): Add a new section or sub-page under **Settings** (e.g. "Notifications", "Defaults"). Use the same layout: section title, short description, form or toggles, save action.
- **Feature-specific views** (e.g. portfolio): Keep them **read-only** for that config; add "Edit in Settings" (or "Manage in Settings") linking to the right section.

## Multi-tenant

All settings are scoped by `session.user.id`. Connections and bankroll are stored per user; no shared config.
