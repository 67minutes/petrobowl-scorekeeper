# Installation Guide

This guide gets **Petrobowl Scorekeeper** onto a Windows laptop and open on the screen. No coding or technical experience is needed — just follow the steps in order.

You only need to do this **once** per laptop. After that, opening the program is a single double-click.

> **What you need:** a Windows laptop (Windows 10 or 11) and, for the day itself, a projector or second screen. The program runs **completely offline** — you don't need internet at the venue, only to download it the first time.

---

## Step 1 — Get the program onto the laptop

Pick **one** of the two options below. Option A is the easiest and needs nothing installed.

### 🟢 Option A — Download the ZIP (easiest, recommended)

1. Open this page in your browser:
   **https://github.com/67minutes/petrobowl-scorekeeper**
2. Click the green **`< > Code`** button near the top right.
3. In the little menu, click **Download ZIP**.
4. Find the downloaded file (usually in your **Downloads** folder). It's called `petrobowl-scorekeeper-main.zip`.
5. **Right-click** it → **Extract All…** → **Extract**. This makes a normal folder you can open.
6. Move that folder somewhere easy to find, like your **Desktop**.

✅ Done — skip to **Step 2**.

### 🔵 Option B — Clone with Git (if you'd rather use Git)

1. Install **Git for Windows** from https://git-scm.com/download/win (accept all the default options during setup).
2. Open the folder where you want the program (e.g. your Desktop): click the address bar in that File Explorer window, type `cmd`, and press **Enter**. A black command window opens.
3. Type this and press **Enter**:
   ```bash
   git clone https://github.com/67minutes/petrobowl-scorekeeper.git
   ```
4. A folder called `petrobowl-scorekeeper` appears. You can close the black window.

✅ Done — continue to **Step 2**.

---

## Step 2 — Open the program

1. Open the `petrobowl-scorekeeper` folder.
2. Find the file named **`run.bat`** (it may just show as **`run`** with a little gear icon).
3. **Double-click it.**

A black window appears with a title like "PETROBOWL SCOREKEEPER". Then your web browser opens automatically showing the program. That black window is the engine — **leave it open** the whole time you're using the program. Closing it stops the program.

> **"Windows protected your PC" message?** Windows sometimes warns about files downloaded from the internet. Click **More info**, then **Run anyway**. This is safe — it only starts the local program on your own laptop.

> **Nothing opened, or you got an error about `dist`?** See [Troubleshooting](#troubleshooting) below.

---

## Step 3 — Put the scoreboard on the projector

The laptop screen is your **control panel**. The projector shows the **big scoreboard**. Here's how to split them:

1. Plug in the projector or second screen and make sure Windows is showing your desktop on it (press **Windows key + P** and choose **Extend** if it's mirroring).
2. In the program (on the laptop), click the gold **Open big screen ↗** button at the top right.
3. A second browser window opens. **Drag it onto the projector screen.**
4. Click that window once, then press **F11** to make it fill the whole screen. (You can also just double-click inside it.)

That's it. The projector now shows the scoreboard; the laptop keeps all the buttons. They stay in sync automatically.

> **Tip:** Press **F11** again any time to leave full-screen.

---

## Opening it next time

You don't repeat the download. Just open the `petrobowl-scorekeeper` folder and **double-click `run.bat`** again. Your teams, scores and settings are still there — the program remembers everything from last time in that browser.

---

## Moving to a different laptop

Everything you enter is saved inside the browser on that one laptop. To move a tournament to another laptop:

1. On the first laptop, open the program → **Setup** tab → **Export JSON**. Save the file (e.g. to a USB stick).
2. Install the program on the second laptop (Step 1) and open it (Step 2).
3. Go to **Setup → Import JSON…** and pick the file you saved.

It's also a good idea to **Export JSON** as a backup during the event, in case anything happens to the laptop.

---

## Troubleshooting

**The black window says something about `dist\index.html` not found.**
The ready-to-run files are missing. This happens if only part of the project was copied. Re-download using **Option A** above and make sure you extracted the **whole** ZIP.

**The browser didn't open by itself.**
Look at the black window — it shows a line like `Running at http://localhost:5173/`. Open your browser (Chrome or Edge) and type that address in yourself.

**The big screen shows a plain title, not the scoreboard.**
Open the match you want on the laptop first: go to the **Scorer** tab and pick the match. The big screen switches to it automatically. You can also use the **Big screen** dropdown at the top of the laptop window to choose what the projector shows.

**Both windows aren't matching up.**
Make sure both windows are the **same browser** (both Chrome, or both Edge) on the **same laptop**. The two screens share their memory through the browser, so they must be the same one.

**It's slow or looks broken.**
Use **Google Chrome** or **Microsoft Edge**. Very old browsers aren't supported.

Still stuck? Contact the SPE ITB SC team, or open an issue at
https://github.com/67minutes/petrobowl-scorekeeper/issues

---

➡️ Ready to run an event? See the **[User Guide](GUIDE.md)**.
