export function createWorkflow(authorName: string, authorEmail: string, repository: string) {
  const name = Buffer.from(authorName).toString("base64");
  const email = Buffer.from(authorEmail).toString("base64");
  const repo = Buffer.from(repository).toString("base64");

  return `# Managed by GitPulse
name: GitPulse daily commit

on:
  schedule:
    - cron: "30 3-15 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  pulse:
    runs-on: ubuntu-latest
    concurrency:
      group: gitpulse-daily
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
      - name: Create daily pulse at a random time
        env:
          AUTHOR_NAME: ${name}
          AUTHOR_EMAIL: ${email}
          REPOSITORY: ${repo}
          EVENT_NAME: \${{ github.event_name }}
        run: |
          git config user.name "$(printf '%s' "$AUTHOR_NAME" | base64 --decode)"
          git config user.email "$(printf '%s' "$AUTHOR_EMAIL" | base64 --decode)"
          repo="$(printf '%s' "$REPOSITORY" | base64 --decode)"
          today="$(TZ=Asia/Kolkata date '+%F')"
          marker=".gitpulse/last-scheduled-date.txt"
          if [ "$EVENT_NAME" = "schedule" ]; then
            last_date="$(cat "$marker" 2>/dev/null || true)"
            if [ "$last_date" = "$today" ]; then
              echo "Today's scheduled pulse already ran."
              exit 0
            fi
            hash="$(printf '%s' "$today:$repo" | sha256sum | cut -c1-8)"
            target_hour=$((16#$hash % 13 + 9))
            current_hour="$(TZ=Asia/Kolkata date '+%-H')"
            if [ "$current_hour" -lt "$target_hour" ]; then
              echo "Waiting for this repository's randomly assigned hour."
              exit 0
            fi
          fi
          mkdir -p .gitpulse
          printf '%s | %s\\n' "$(date -u '+%Y-%m-%d %H:%M UTC')" "$repo" >> .gitpulse/pulse.log
          if [ "$EVENT_NAME" = "schedule" ]; then
            printf '%s\\n' "$today" > "$marker"
            git add "$marker"
          fi
          git add .gitpulse/pulse.log
          if git diff --cached --quiet; then exit 0; fi
          if [ "$EVENT_NAME" = "schedule" ]; then
            git commit -m "chore(pulse): automated repository sync"
          else
            git commit -m "chore(pulse): manual repository sync"
          fi
          git push
`;
}
