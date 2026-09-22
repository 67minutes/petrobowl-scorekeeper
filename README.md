# 🏆 Petrobowl Scorekeeper

**Offline tournament manager and live big-screen scoreboard for Petrobowl**, styled in the SPE ITB SC identity. It runs entirely in a browser on one laptop — no internet, no accounts, no server to set up — and ships ready to run with a **Petrobowl APAC 2026** preset.

<sub>Built by the SPE ITB Student Chapter · Solutions. People. Energy.℠</sub>

---

## What it does

- **Any format** — groups, round robin, single-elimination knockout, Swiss, or groups → knockout playoffs. Fully customizable scoring, group points and tiebreakers.
- **Group draw** — a fair, repeatable randomizer with a live team-by-team reveal on the big screen. Keep same-country teams apart, seed or lock teams, or drag to adjust.
- **Live match scoring** — big correct / wrong / steal buttons and keyboard shortcuts, an optional timer, undo, and judge adjustments. Knockout ties go to sudden death.
- **Two synced screens** — the **laptop** is the operator console (all the controls); the **projector** shows a clean scoreboard, standings, bracket or draw. They update together, instantly.
- **Petrobowl APAC 2026 preset** — 13 teams, groups A–C of 3 and D of 4, top 2 advance to an 8-team knockout, +10 / −5 scoring. Load it and go.

## Two screens at a glance

| Laptop (operator console) | Projector (big screen) |
| --- | --- |
| Set up the tournament, run the draw, and score every match. Full controls. | Scores only — scoreboard, group tables, bracket, or the draw reveal. No controls. |

---

## 📖 Guides

- **[Installation Guide](docs/INSTALL.md)** — get the program onto a laptop and open it, step by step (no experience needed).
- **[User Guide](docs/GUIDE.md)** — run a whole tournament from start to trophy, in plain language.

### The 30-second version

1. [Download or clone this project](docs/INSTALL.md) onto the laptop.
2. Double-click **`run.bat`**. Your browser opens the operator console.
3. Click **Open big screen ↗**, drag that new window to the projector, press **F11**.
4. Load a preset (or build your own format) → run the draw → score matches. Done.

> Works offline on Windows. Use Chrome or Edge. Everything you enter is saved automatically in that browser; use **Setup → Export JSON** to back it up or move it to another laptop.

---

## For developers

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install       # install dependencies
npm run dev       # hot-reload dev server (or double-click dev.bat)
npm test          # run the tournament-engine unit tests
npm run build     # rebuild dist/ (the folder run.bat serves)
```

`run.bat` serves the pre-built `dist/` folder with a tiny PowerShell static server, so the venue laptop needs **no Node.js**. Rebuild `dist/` and commit it whenever the app changes.

### Project layout

| Path | What's inside |
| --- | --- |
| `src/engine/` | Pure TypeScript tournament logic — scoring, standings & tiebreakers, round robin, knockout, Swiss, the draw, and presets. Covered by `engine.test.ts`. |
| `src/store/` | App state (Zustand), saved to the browser. The two windows stay in sync through it. |
| `src/ui/console/` | The operator (laptop) screens. |
| `src/ui/display/` | The big-screen (projector) views. |
| `scripts/serve.ps1` | The dependency-free static server used by `run.bat`. |

Tech: React + TypeScript + Vite, Zustand, Vitest. Fonts (Poppins / Montserrat) are bundled, so it stays fully offline.

---

<sub>Not affiliated with SPE International. Team names and logos belong to their respective owners.</sub>
