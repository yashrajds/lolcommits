# GitHub Personal Access Token (PAT) Setup Guide for GitPulse

## Step 1: Generate a PAT (Personal Access Token)

### Option A: Fine-Grained Token (Recommended)
1. Go to: https://github.com/settings/tokens/new
2. **Token name**: `GitPulse-AutoCommit`
3. **Expiration**: Select preferred duration (or "No expiration")
4. **Resource owner**: Select your user account
5. **Repository access**: 
   - Select "Only select repositories" 
   - Or select all repositories
6. **Permissions**: Select `Contents: Read and write`
7. Click **Generate token**
8. **Copy the generated token** immediately - GitHub won't show it again

### Option B: Classic Token (Also Works)
1. Go to: https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. **Note**: `GitPulse-AutoCommit`
4. **Expiration**: Set preferred duration
5. **Select scopes**: Check `repo` (Full control of private and public repositories)
6. Click **Generate token**
7. **Copy the generated token** immediately

## Step 2: Configure Environment Variables

Create/update `.env.local` in the project root:

```env
# Required: Your GitHub PAT
GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere

# Required: Cron secret for Vercel webhook verification
CRON_SECRET=super_secret_passphrase_here

# Optional: Dashboard password
SITE_PASSWORD=choose_a_long_unique_password

# Optional: Batch size per run
COMMIT_BATCH_SIZE=10

# Optional: Exclude forks
EXCLUDE_FORKS=true
```

## Step 3: Run the Automation

### Local Development - Scheduler (automatic daily pulses):
```bash
# Start the scheduler daemon
node scripts/pulse-daemon.mjs
# Or using npm:
npm run scheduler
```

This will:
- Start the GitPulse scheduler for today
- Schedule 1-13 commits between 9AM-9PM IST
- Keep running and manage scheduler state
- Output status every minute

### Local Development - Manual Pulse:
```bash
# Commit a pulse to all repositories
node scripts/run-pulse.mjs

# Or target specific repos
node scripts/run-pulse.mjs --repos owner/repo1,owner/repo2

# With custom concurrency
node scripts/run-pulse.mjs --concurrency 3
```

### Using the Web Dashboard:
```bash
npm run dev
# Open http://localhost:3000
# Connect your GitHub token and manage pulses via UI
```

### Vercel Deployment (for always-on automation):
1. Push this project to GitHub
2. Import to Vercel at https://vercel.com/new
3. Set environment variables in Vercel dashboard:
   - `GITHUB_TOKEN` - your PAT
   - `CRON_SECRET` - matching the secret in `.env.local`
4. Vercel will automatically deploy and configure the cron jobs from `vercel.json`:
   - Daily at 3:30 UTC: triggers `/api/schedule?action=start`
   - Daily at 6:29 UTC: triggers `/api/cleanup`

## Step 4: Test the Setup

### Test the scheduler:
```bash
node scripts/pulse-daemon.mjs
# Expected output:
# GitPulse scheduler daemon starting...
# IST Time: <current date>
# Scheduler enabled: true
# Commits scheduled: <number>
```

### Test a manual pulse:
```bash
node scripts/run-pulse.mjs
# If no GITHUB_TOKEN set, will error: "ERROR: Missing GITHUB_TOKEN environment variable."
# After setting token, it will pulse your repositories
```

## Important Notes

1. **Token Scope**: The `repo` scope (classic) or `Contents: Read and write` (fine-grained) is required
2. **Rate Limits**: GitHub API rate limits apply (typically 5,000/hour for authenticated users)
3. **Contribution Graph**: Commits count toward your GitHub contribution graph if:
   - Email matches a verified email on your GitHub account
   - Commits are to the repository's default branch (usually `main` or `master`)
4. **Vercel Cron**: The `vercel.json` is pre-configured with crons at `30 3 * * *` and `29 18 * * *` (IST 7:30 PM and 6:29 AM next day)