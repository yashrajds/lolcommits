"use client";

import React, { useState } from "react";
import {
  Rocket,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Clock,
  Key,
  Globe,
  HelpCircle,
} from "lucide-react";

export const VercelDeployGuide: React.FC = () => {
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const envSample = `GITHUB_TOKEN=ghp_yourGitHubPersonalAccessToken
CRON_SECRET=my_custom_secret_key_998877
TARGET_FILE=.github-pulse.md
COMMIT_BATCH_SIZE=10
EXCLUDE_FORKS=true`;

  const curlSample = `curl -X POST https://your-app.vercel.app/api/cron \\
  -H "Authorization: Bearer my_custom_secret_key_998877"`;

  const copyToClipboard = (text: string, setFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Rocket size={20} color="var(--accent-purple)" />
            <span>Vercel Deployment & Automation Guide</span>
          </h2>
          <p className="card-description">
            Complete step-by-step walkthrough to deploy GitPulse on Vercel and activate automated scheduled commits.
          </p>
        </div>
      </div>

      <div className="guide-step">
        <div className="step-number">1</div>
        <div className="step-content">
          <h3 className="step-title">Generate your GitHub Personal Access Token</h3>
          <p className="step-desc">
            GitHub requires a token to commit to your repositories via the REST API.
          </p>
          <div style={{ marginBottom: "12px" }}>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=GitPulse-Vercel"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <Key size={14} /> Open GitHub Token Creation Page <ExternalLink size={12} />
            </a>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Select the <code>repo</code> scope (Full control of private repositories and public repositories) and set your preferred expiration.
          </p>
        </div>
      </div>

      <div className="guide-step">
        <div className="step-number">2</div>
        <div className="step-content">
          <h3 className="step-title">Deploy to Vercel</h3>
          <p className="step-desc">
            Push this project to a new repository on your GitHub account, then import it in your Vercel Dashboard.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              <Globe size={14} /> Open Vercel Project Importer <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      <div className="guide-step">
        <div className="step-number">3</div>
        <div className="step-content">
          <h3 className="step-title">Configure Environment Variables in Vercel</h3>
          <p className="step-desc">
            In Vercel Dashboard &gt; <strong>Project Settings &gt; Environment Variables</strong>, add the following values:
          </p>

          <div className="code-snippet" style={{ alignItems: "flex-start", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "8px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Recommended .env Configuration</span>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(envSample, setCopiedEnv)}
              >
                {copiedEnv ? <Check size={12} style={{ display: "inline", marginRight: "4px" }} /> : <Copy size={12} style={{ display: "inline", marginRight: "4px" }} />}
                {copiedEnv ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", color: "#38bdf8", width: "100%" }}>{envSample}</pre>
          </div>
        </div>
      </div>

      <div className="guide-step">
        <div className="step-number">4</div>
        <div className="step-content">
          <h3 className="step-title">Vercel Cron Automation (`vercel.json`)</h3>
          <p className="step-desc">
            The repository contains a pre-configured <code>vercel.json</code> file pointing to <code>/api/cron</code>.
          </p>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              marginBottom: "12px",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", color: "var(--accent-emerald)", fontWeight: 600 }}>
              <Clock size={16} /> Schedule: 0 9 * * * (Every Day at 09:00 UTC)
            </div>
            Vercel automatically provisions this Cron job upon deployment. You can monitor execution logs under Vercel Dashboard &gt; Settings &gt; Cron Jobs.
          </div>

          <div style={{ marginTop: "10px" }}>
            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Test your deployed cron endpoint manually at any time:
            </div>
            <div className="code-snippet">
              <span style={{ color: "var(--accent-cyan)", overflowX: "auto" }}>
                https://your-app.vercel.app/api/cron?secret=YOUR_CRON_SECRET
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="guide-step" style={{ marginBottom: 0 }}>
        <div className="step-number">5</div>
        <div className="step-content">
          <h3 className="step-title">Multiple Commits Per Day on Vercel Hobby? (Pro-Tip)</h3>
          <p className="step-desc">
            Vercel Hobby plan natively limits built-in crons to once per day. If you want commits multiple times per day (e.g. every 4 or 6 hours) on the free tier:
          </p>
          <ul style={{ paddingLeft: "18px", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            <li>Create a free account on <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-emerald)" }}>cron-job.org</a> or use GitHub Actions.</li>
            <li>Set the target URL to <code>https://your-app.vercel.app/api/cron?secret=YOUR_CRON_SECRET</code>.</li>
            <li>Choose your preferred schedule (e.g. every 4 hours, or twice daily).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
