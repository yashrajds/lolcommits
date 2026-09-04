# ⚡ GitPulse — Automated GitHub Auto-Commit Engine for Vercel

> Automatically commit small, safe, non-destructive changes across your GitHub repositories on a schedule using Vercel Crons, keeping your GitHub activity alive and your repositories maintained.

![GitPulse Banner](https://raw.githubusercontent.com/github/explore/main/topics/git/git.png)

---

## 🌟 Highlights

- ⏱ **Vercel Cron Automation**: Pre-configured `vercel.json` scheduled to execute every day at 09:00 UTC (or custom cron intervals).
- 🛡 **Non-Destructive & Safe**: Never edits your application code, dependencies, or build scripts. Commits only touch a designated tracking file (default: `.github-pulse.md` or `ACTIVITY.md`).
- 🟩 **Contribution Graph Ready**: Automatically commits using your verified GitHub email and pushes directly to your default branch (`main` or `master`), ensuring every commit counts on your GitHub profile heatmap.
- 🚀 **High Performance Concurrency**: Processes multiple repositories in parallel with bounded worker pools to avoid Vercel serverless function timeouts.
- 🎨 **Modern Cyber Developer UI**: Built with Next.js App Router, TypeScript, and a responsive Vanilla CSS design with glowing radar pulses, real-time commit logs, and repository filters.
- 🔒 **Secure Authorization**: Guarded by `CRON_SECRET` to prevent unauthorized webhooks or trigger abuse.

---

## 📂 Project Structure

```
geetcom/
├── app/
│   ├── api/
│   │   ├── auth/verify/route.ts   # Authenticates GitHub token & profile
│   │   ├── commit/route.ts        # Manual & batch commit runner
│   │   ├── cron/route.ts          # Vercel Cron scheduled endpoint
│   │   └── repos/route.ts         # Lists & filters user repositories
│   ├── globals.css                # Obsidian & emerald glassmorphism styling
│   ├── layout.tsx                 # Root layout & ambient backdrop
│   └── page.tsx                   # Main dashboard, live console & repo manager
├── components/
│   ├── CommitConsole.tsx          # Real-time streaming log & trigger button
│   ├── Navbar.tsx                 # Brand header & connected profile badge
│   ├── RepoManager.tsx            # Multi-select repo list & filter badges
│   ├── StatsOverview.tsx          # Metric cards & contribution preview
│   ├── TokenConfigModal.tsx       # Direct token input & scope guide
│   └── VercelDeployGuide.tsx      # Step-by-step Vercel guide & templates
├── lib/
│   └── github.ts                  # Octokit-style GitHub REST API integration
├── .env.example                   # Environment variable template
├── vercel.json                    # Vercel Cron schedule configuration
└── package.json
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd geetcom
npm install
```

### 2. Configure Environment (Optional)

Create a `.env.local` file:

```env
GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
CRON_SECRET=super_secret_passphrase_here
TARGET_FILE=.github-pulse.md
COMMIT_BATCH_SIZE=10
EXCLUDE_FORKS=true
```

> **Note**: You can also launch without `.env.local` and connect your GitHub token directly via the web dashboard interface!

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Keep scheduling active after the browser closes

GitPulse now has a separate IST background worker. In a second terminal, start it once:

```bash
npm run scheduler
```

It creates a fresh set of random commit windows for each IST day and reads the **Stop for Today** control immediately. Keep this worker alive with your usual process manager (PM2, Windows Task Scheduler, Docker restart policy, or systemd) so it survives sign-out and restarts. The dashboard itself is not involved in running scheduled work.

Set `SITE_PASSWORD` before opening the dashboard. The supplied local setup uses the password provided during configuration; use a unique environment variable value when deploying.

---

## ☁️ Deploying to Vercel

Deploying GitPulse to Vercel takes less than 2 minutes:

### Step 1: Push to GitHub
Create a new repository on your GitHub account and push this project:
```bash
git init
git add .
git commit -m "feat: initial commit for GitPulse"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gitpulse-autocommit.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to [vercel.com/new](https://vercel.com/new).
2. Select your newly created repository and click **Import**.

### Step 3: Set Environment Variables
In the Vercel project configuration screen, add the following variables under **Environment Variables**:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | GitHub Personal Access Token (with `repo` scope) | `ghp_xxxxxxxxxxxx` |
| `CRON_SECRET` | Secret token to authenticate cron triggers | `my_cron_secret_123` |
| `TARGET_FILE` | (Optional) File to write pulse logs to | `.github-pulse.md` |
| `COMMIT_BATCH_SIZE` | (Optional) Number of repos per run, or `all` | `10` |
| `EXCLUDE_FORKS` | (Optional) Ignore forked repositories | `true` |
| `INCLUDE_REPOS` | (Optional) Comma-separated whitelist of repos | `my-repo,app-2` |
| `EXCLUDE_REPOS` | (Optional) Comma-separated blacklist of repos | `legacy-project` |

### Step 4: Deploy!
Click **Deploy**. Vercel will build the application and automatically configure the Cron job defined in `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 9 * * *"
    }
  ]
}
```

---

## 🔑 How to Generate a GitHub Personal Access Token (PAT)

1. Open [GitHub Token Creation Page](https://github.com/settings/tokens/new?scopes=repo&description=GitPulse-Vercel).
2. Set **Expiration** to your preference (e.g., 90 days or No expiration).
3. Select the **`repo`** scope (Full control of private and public repositories).
4. Click **Generate token** and copy the `ghp_...` string.

---

## 🧪 Testing the Cron Endpoint

You can test your deployed cron trigger at any time using `curl` or your browser:

### Using cURL:
```bash
curl -X POST https://your-app.vercel.app/api/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Using Browser / URL Query:
```text
https://your-app.vercel.app/api/cron?secret=YOUR_CRON_SECRET
```

---

## 💡 How Contribution Heatmaps Work on GitHub

GitHub counts commits towards your contribution graph under the following conditions:
1. **Email match**: The email used in the commit must match an email address registered and verified on your GitHub account. GitPulse automatically queries the `/user/emails` API to retrieve your primary verified address.
2. **Default branch**: Commits must be made to the repository's default branch (usually `main` or `master`). GitPulse inspects each repository's `default_branch` property dynamically.
3. **Standalone repository**: The repository must belong to you (or for forks, have opened PRs merged). By default, GitPulse filters out forked repositories so all commits count.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Serverless Routes)
- **Language**: TypeScript
- **Styling**: Vanilla CSS with modern custom properties, glassmorphism, and responsive grid
- **Hosting**: [Vercel](https://vercel.com) with native Vercel Cron Jobs
- **Icons**: Lucide Icons & Custom SVG

---

## 📄 License
MIT © GitPulse Team
