"use client";

import React, { useState } from "react";
import {
  Rocket,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Key,
  Globe,
  HelpCircle,
} from "lucide-react";

const ENV_SAMPLE = `GITHUB_TOKEN=ghp_yourGitHubPersonalAccessToken
CRON_SECRET=my_custom_secret_key_998877
TARGET_FILE=.github-pulse.md
COMMIT_BATCH_SIZE=10
EXCLUDE_FORKS=true`;

const CURL_SAMPLE = `curl -X POST https://your-app.vercel.app/api/cron \\
  -H "Authorization: Bearer my_custom_secret_key_998877"`;

interface CopyBtnProps {
  text: string;
}
function CopyBtn({ text }: CopyBtnProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      className={`code-copy-btn ${copied ? "copied" : ""}`}
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export const VercelDeployGuide: React.FC = () => {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">
            <Rocket size={17} color="var(--violet)" />
            Vercel Deployment Guide
          </div>
          <p className="card-desc">
            Step-by-step walkthrough to deploy GitPulse on Vercel and activate
            automated scheduled commits.
          </p>
        </div>
      </div>

      <div className="guide-steps">
        {/* Step 1 */}
        <div className="step-row">
          <div className="step-num">1</div>
          <div className="step-body">
            <div className="step-title">Generate a GitHub Personal Access Token</div>
            <p className="step-desc">
              GitHub requires a token to commit to your repositories via the REST
              API. Create a Classic token with the{" "}
              <code
                style={{
                  background: "rgba(255,255,255,0.08)",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: "0.78rem",
                }}
              >
                repo
              </code>{" "}
              scope, or a Fine-Grained token with{" "}
              <strong>Contents: Read and write</strong>.
            </p>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=GitPulse-Vercel"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: "inline-flex" }}
            >
              <Key size={13} />
              Open GitHub Token Page
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Step 2 */}
        <div className="step-row">
          <div className="step-num">2</div>
          <div className="step-body">
            <div className="step-title">Deploy to Vercel</div>
            <p className="step-desc">
              Push this project to a GitHub repository, then import it in your
              Vercel Dashboard. Vercel will automatically detect the Next.js
              framework.
            </p>
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex" }}
            >
              <Globe size={13} />
              Open Vercel Project Importer
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Step 3 */}
        <div className="step-row">
          <div className="step-num">3</div>
          <div className="step-body">
            <div className="step-title">Configure Environment Variables</div>
            <p className="step-desc">
              In Vercel Dashboard → <strong>Project Settings → Environment
              Variables</strong>, add the following values:
            </p>
            <div className="code-box">
              <div className="code-box-header">
                <span className="code-box-label">Recommended .env Configuration</span>
                <CopyBtn text={ENV_SAMPLE} />
              </div>
              <div className="code-body">
                <pre>{ENV_SAMPLE}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="step-row">
          <div className="step-num">4</div>
          <div className="step-body">
            <div className="step-title">Vercel Cron Automation</div>
            <p className="step-desc">
              The repository includes a pre-configured{" "}
              <code
                style={{
                  background: "rgba(255,255,255,0.08)",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: "0.78rem",
                }}
              >
                vercel.json
              </code>{" "}
              pointing to{" "}
              <code
                style={{
                  background: "rgba(255,255,255,0.08)",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: "0.78rem",
                }}
              >
                /api/cron
              </code>
              .
            </p>
            <div className="info-box" style={{ marginBottom: 12 }}>
              <Clock size={16} className="info-box-icon" />
              <div>
                <strong style={{ color: "var(--emerald)" }}>
                  Schedule: 0 9 * * * (Every Day at 09:00 UTC)
                </strong>
                <br />
                Vercel automatically provisions this Cron job upon deployment.
                Monitor execution logs under{" "}
                <strong>Vercel Dashboard → Settings → Cron Jobs</strong>.
              </div>
            </div>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-2)",
                marginBottom: 8,
              }}
            >
              Test your deployed cron endpoint manually:
            </p>
            <div className="code-box">
              <div className="code-box-header">
                <span className="code-box-label">Manual cron trigger via curl</span>
                <CopyBtn text={CURL_SAMPLE} />
              </div>
              <div className="code-body">
                <pre>{CURL_SAMPLE}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="step-row">
          <div className="step-num">5</div>
          <div className="step-body">
            <div className="step-title">
              <HelpCircle
                size={15}
                style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }}
              />
              Multiple Commits Per Day on Hobby? (Pro-Tip)
            </div>
            <p className="step-desc">
              Vercel Hobby plan limits built-in crons to once per day. To commit
              multiple times per day on the free tier:
            </p>
            <ul
              style={{
                paddingLeft: 18,
                fontSize: "0.82rem",
                color: "var(--text-2)",
                lineHeight: 1.7,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <li>
                Create a free account on{" "}
                <a
                  href="https://cron-job.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--emerald)", fontWeight: 600 }}
                >
                  cron-job.org
                </a>{" "}
                or use GitHub Actions.
              </li>
              <li>
                Set the target URL to{" "}
                <code
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontSize: "0.75rem",
                  }}
                >
                  https://your-app.vercel.app/api/cron?secret=YOUR_CRON_SECRET
                </code>
                .
              </li>
              <li>Choose your preferred schedule (e.g. every 4 hours, or twice daily).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
