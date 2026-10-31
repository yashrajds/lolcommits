# 🤙 lolcommits

> Keep your GitHub contribution graph green — automatically.

A zero-dependency, pure HTML/CSS/JS website that makes random daily GitHub commits on your behalf using the GitHub Contents API.

## Features

| Feature | Description |
|---|---|
| 🔑 Token setup | Paste your GitHub PAT once — stored in `localStorage` |
| ⏰ Auto-commit | Schedules N random commits per day inside your chosen time window |
| 🧪 Test commit | One-click to verify your token & repo are working |
| ✍️ Manual commit | Custom message commit with a modal dialog |
| 📋 Today's log | Live list of all commits made today (auto / manual / test) |

## Usage

1. Open `index.html` in any browser (no server needed).
2. Paste a GitHub **Personal Access Token** with `repo` scope.
3. Enter your **repo owner**, **repo name**, and **branch**.
4. Configure your daily commit window & message pool.
5. Toggle **Enable auto-commit** — done!

## How it works

- All commits touch a single file `.lolcommits` in your repo root with a timestamp + random salt.
- The scheduler picks `N` random timestamps between your `startHour` and `endHour` using `setTimeout`.
- Commits survive a page refresh because scheduled times are saved to `localStorage` — but **re-enable auto-commit after page reload** to re-arm the timers.

## Keeping it running

Since this is a browser tab, the page must stay open for auto-commits to fire.
For fully headless commits consider a GitHub Action cron instead — but this tool is perfect for keeping a tab running on a work machine.

## No tracking. No server. No dependencies.

Everything runs locally in the browser.  Your token never leaves your machine.
