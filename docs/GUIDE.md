# User Guide

How to run a whole tournament with **Petrobowl Scorekeeper**, from setup to the trophy. No technical knowledge needed.

New here? Do the **[Installation Guide](INSTALL.md)** first, then come back.

---

## The idea in one picture

- The **laptop** is your control panel. Every button lives here.
- The **projector** shows the audience a clean scoreboard, standings or bracket. No controls.
- Along the top of the laptop are **tabs** — you'll work through them left to right: **Setup → Teams → Draw → Schedule → Scorer → Standings → Bracket**.
- The **Big screen** dropdown (top right of the laptop) chooses what the projector shows at any moment.

Everything saves automatically. You can close and reopen the program without losing anything.

---

## Quick start: run the Petrobowl APAC 2026 preset

If you just want the APAC 2026 tournament, this is the whole flow:

1. **Setup tab** → under "Start from", click **Load preset** (Petrobowl APAC 2026). Teams and format are filled in for you.
2. **Draw tab** → click **Run draw** to sort the 13 teams into groups A, B, C and D. (Optional: click **Show on big screen** and **Reveal next** to reveal teams one by one for the audience.) Then click **Confirm groups & generate fixtures**.
3. Still on the Draw tab, scroll to the Knockout stage and click **Generate bracket**.
4. **Scorer tab** → pick a match and score it (see [Scoring a match](#scoring-a-match)).
5. Repeat until the groups are done, then keep scoring the quarterfinals, semifinals and final. Standings and the bracket fill in automatically.

That's the entire event. The rest of this guide explains each part in more detail and how to build your own tournament.

---

## Setting up a tournament

Open the **Setup** tab.

### Start from a preset or a format
- **Load preset** gives you Petrobowl APAC 2026, ready to go.
- Or pick a **format** from the dropdown and click **Apply format** (this keeps your current teams):
  - **Groups → Knockout** — groups first, then a knockout bracket.
  - **Round robin (league)** — everyone plays everyone; the table decides the winner.
  - **Round robin → Top 4 playoff** — a league, then semifinals and final.
  - **Single elimination** — one straight knockout bracket.
  - **Swiss** — a set number of rounds, opponents matched by record.
- Choose the number of groups, how many teams advance, rounds, and a 3rd-place match where they apply.

### Set the scoring
- **Correct / Incorrect / Steal** points. The APAC default is **+10 correct, −5 wrong** (same for steals).
- **Questions per match** and a **Timer** are optional — leave them **off** if you run matches by hand.
- **Group points** (default win 2, draw 1, loss 0) and the **tiebreaker order** (default: head-to-head → point difference → points scored → drawing lots). Use the ↑ / ↓ arrows to reorder tiebreakers.

### Add your logo (optional)
Under **Details**, click **Upload…** next to Logo to show your event's logo on the big screen.

---

## Adding teams

Open the **Teams** tab (skip this if you loaded a preset).

- Type teams in the box on the right — **one per line**. You can also add a short name and country, separated by commas:
  ```
  Institut Teknologi Bandung, ITB, Indonesia
  Universiti Teknologi PETRONAS, UTP, Malaysia
  ```
  Then click **Add teams**. You can paste a list straight from a spreadsheet.
- The **short name** is what shows on the big screen, so keep it snappy (ITB, UTP…).
- The **country** lets the draw keep same-country teams in different groups.
- Edit any name later by clicking in its box.

---

## Running the group draw

Open the **Draw** tab (only for formats with groups).

1. Optional but nice for the audience: click **Show on big screen** so the projector shows the draw.
2. (Optional) Turn on **Spread same-country teams**, or open **Seeds & locks…** to seed strong teams into different groups or lock a team to a specific group.
3. Click **Run draw**. Teams are sorted into groups instantly.
4. To reveal it live to the audience, use **Reveal next ▶** to drop teams in one at a time, or **Reveal all** to show everything.
5. Want to change something? **Click two teams to swap them**, or click the **✕** on a team to send it back to unplaced.
6. When you're happy, click **Confirm groups & generate fixtures**. This creates all the group matches.
7. For a knockout stage, scroll down and click **Generate bracket**.

### Setting groups by hand (no draw)

Prefer to decide the groups yourself? Click **Set groups manually…** at the top of the Draw tab. You get a list of every team with a group dropdown — just pick a group for each team. **Clear all groups** empties them to start over. Full groups are marked so you can't over-fill them. When every team is placed, click **Confirm groups & generate fixtures** as usual. (You can freely mix this with the random draw and the swap/✕ controls.)

> The draw uses a **seed** (a short code) so the same seed always gives the same draw — handy for transparency. Write it down if you want to prove the draw wasn't rigged.

---

## The schedule

Open the **Schedule** tab to see every match in playing order.

- **Next up** at the top shows the upcoming match — click **Score this match ▶** to jump straight to it.
- Use the ↑ / ↓ arrows to reorder matches, and type a time or room next to any match.
- Click **Score ▶** on any match to open it in the scorer.
- Running a **Swiss** tournament? After each round finishes, come back here and click **Generate round 2** (etc.).

---

## Scoring a match

Open the **Scorer** tab and pick a match (or open it from the Schedule). As soon as you open it, the big screen shows that match's scoreboard.

Each team has two big buttons:

| Button | What it does |
| --- | --- |
| **Correct** | Adds the correct-answer points (default +10). |
| **Wrong** | Subtracts the wrong-answer points (default −5). |

- After a **wrong** answer, the other team gets a chance to **steal** — its panel lights up gold and its buttons become **Steal ✓** / **Steal ✗**. Score the steal, or press **N** for no steal.
- **Undo** removes the last action if you make a mistake.
- **± Adjust** lets you add or remove points manually for a judge's ruling (with a note).
- Use the ◀ ▶ arrows to move between questions.

### Keyboard shortcuts (faster than clicking)

| Key | Action |
| --- | --- |
| **Q** / **W** | Team A correct / wrong |
| **O** / **P** | Team B correct / wrong |
| **N** or **→** | Next question (or "no steal") |
| **Z** | Undo the last action |
| **Space** | Start / pause the timer (if you set one) |

During a steal, the same letter keys score the steal for the team that has it.

### Ending a match
- Click **End & finalize match**, confirm, and the result is locked in. Standings and the bracket update automatically.
- **Knockout tie?** In a knockout match that ends level, you'll be offered **sudden death** — the first correct answer wins. The big screen shows a "SUDDEN DEATH" banner.
- Made a mistake after finalizing? Open the match again and click **Reopen match**.

### Exporting the answer log

Every answer, steal and adjustment is recorded. To save it as a spreadsheet file (CSV, opens in Excel or Google Sheets):

- **One match:** in the Scorer, click **⬇ Export CSV** above the answer log.
- **The whole tournament:** on the **Schedule** tab, click **⬇ Export answer logs (CSV)** to get one file covering every match.

Each row shows the match, question number, which team answered, the action, points, the running score after that answer, any note, and a timestamp — handy for records or reviewing disputes.

---

## Standings and bracket

- **Standings tab** — live group tables (played, won, drawn, lost, points for/against, points). The top teams that qualify are highlighted in gold. If two teams end up truly tied with no way to separate them, a **Draw lots** button appears.
- **Bracket tab** — the knockout bracket, filling in automatically as groups finish and matches are decided.
- Each has a **Show on big screen** button so you can put tables or the bracket up for the audience between matches.

---

## What to show the audience, and when

Use the **Big screen** dropdown (top right of the laptop) at any time:

| Moment | Show |
| --- | --- |
| Before it starts / breaks | **Title slide** |
| During the draw | **Draw reveal** |
| During a match | **Scoreboard** (happens automatically when you open a match) |
| Between matches | **Standings**, **Bracket**, or **Schedule** |

---

## Saving and backups

- Everything saves automatically in the browser on that laptop.
- For safety, go to **Setup → Export JSON** now and then to save a backup file. If anything goes wrong, **Import JSON…** restores it.
- To move the event to another laptop, export on one and import on the other.

---

## Common questions

**Can I change the scoring or format after I've started?**
Yes, in Setup — but changing the format or teams clears existing fixtures and results, so do big changes before you play. Editing team names is always safe.

**The big screen shows the wrong match.**
Open the match you want on the **Scorer** tab; the big screen follows it. Or pick it with the **Big screen** dropdown.

**A game ended in a draw in the group stage — is that allowed?**
Yes. Group matches can be draws (1 point each by default). Only knockout matches must have a winner, which is why they go to sudden death.

**How do I break a tie in the group table?**
The program applies your tiebreakers automatically. If teams are still perfectly level, use the **Draw lots** button on the Standings tab.

---

⬅️ Back to the **[README](../README.md)** · Need to install it? **[Installation Guide](INSTALL.md)**
