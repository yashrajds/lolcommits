# GitPulse

GitPulse connects to GitHub with a token entered by each user. It lists repositories, makes manual pulse commits, and can install a daily GitHub Actions workflow in selected repositories. The token stays in the user's browser; GitPulse does not require Vercel environment secrets.

## Use it

1. Open the dashboard and connect a GitHub personal access token.
2. Select repositories.
3. Choose **Enable for selected repos** to install daily automation.

Daily workflows run once per enabled repository at an independently randomized hour between 09:00 and 21:00 India Standard Time. The selected hour changes daily. They use GitHub's short-lived, repository-scoped `GITHUB_TOKEN` and do not need a saved PAT after installation. Each workflow appends a timestamp to `.gitpulse/pulse.log` on the repository's default branch.

## Token permissions

- Fine-grained PAT: repository access to the selected repositories, with **Contents: Read and write** and **Workflows: Read and write**.
- Classic PAT: `repo` and `workflow` scopes.

The extra workflow permission is needed only to create or update `.github/workflows/gitpulse.yml`. GitHub's [Contents API documentation](https://docs.github.com/en/rest/repos/contents) describes these requirements.

## Local development

```bash
npm install
npm run dev
```

No `.env.local` file is required. Each user connects their own token through the dashboard.

## Hosting

Deploy the Next.js app to Vercel or another Next.js host. No cron, site password, shared GitHub token, or cron secret is required. Scheduled work runs from each repository's GitHub Actions workflow.

## Notes

- Removing the token from the browser does not remove workflows already installed in repositories. Delete `.github/workflows/gitpulse.yml` in each repository to stop its schedule.
- GitHub scheduled workflows run from the repository's default branch and may start later than the scheduled minute during high load.
- GitHub attributes commits to a profile when the author email is associated with the account and the commit reaches the default branch. GitPulse uses the account's GitHub no-reply address when no public email is available. See [GitHub contribution criteria](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference).
