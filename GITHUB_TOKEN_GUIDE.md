# GitHub token setup

GitPulse uses one token supplied by each user. It keeps that token in the browser and sends it to GitHub only for the requested action. It is not saved in Vercel environment variables or by the automation workflow.

## Create one token

1. Open [GitHub's preconfigured classic token form](https://github.com/settings/tokens/new?scopes=repo,workflow&description=GitPulse). It selects the two scopes GitPulse needs.
2. Generate that single token and paste it into GitPulse Config.

GitHub requires `repo` access for commits and `workflow` access for adding the scheduled workflow file. The same token is used for both; there are no separate tokens or Vercel secrets.

## Enable scheduled commits

After connecting, select repositories and choose **Enable for selected repos** on the dashboard. GitPulse installs or updates one workflow file per repository. Each workflow makes one commit per day at an independently randomized hour between 09:00 and 21:00 IST, using a short-lived token scoped to that repository.

To stop a repository's schedule, remove `.github/workflows/gitpulse.yml` from that repository. Disconnecting GitPulse only removes the token from the current browser.

For a manually triggered commit, the connected token needs **Contents: Read and write** access to the target repository.
