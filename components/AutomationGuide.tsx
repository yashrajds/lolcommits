import React from "react";
import { ExternalLink, Key, LockKeyhole, Radio } from "lucide-react";

export const AutomationGuide: React.FC = () => (
  <div className="card">
    <div className="card-header">
      <div>
        <div className="card-title">
          <Radio size={17} color="var(--violet)" />
          Daily automation setup
        </div>
        <p className="card-desc">Connect once, choose repositories, and let GitHub run one daily pulse at a changing time.</p>
      </div>
    </div>

    <div className="guide-steps">
      <div className="step-row">
        <div className="step-num">1</div>
        <div className="step-body">
          <div className="step-title">Create one GitHub token</div>
          <p className="step-desc">
            Use one classic token for both connecting and automation. GitHub preselects the <code>repo</code> and <code>workflow</code> scopes in the link below. You only create and paste this token once.
          </p>
          <a href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=GitPulse" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: "inline-flex" }}>
            <Key size={13} /> Create one token <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div className="step-row">
        <div className="step-num">2</div>
        <div className="step-body">
          <div className="step-title">Connect in GitPulse</div>
          <p className="step-desc">
            Enter the token in GitHub Connection. It is stored in this browser and sent to GitPulse when you connect, commit manually, or manage a workflow. GitPulse does not save it on Vercel.
          </p>
        </div>
      </div>

      <div className="step-row">
        <div className="step-num">3</div>
        <div className="step-body">
          <div className="step-title">Enable daily automation</div>
          <p className="step-desc">
            Select repositories, then choose <strong>Enable for selected repos</strong> on the dashboard. Each repo gets a random hour between 09:00 and 21:00 IST, recalculated daily. GitHub uses a short-lived, repository-scoped token.
          </p>
        </div>
      </div>

      <div className="step-row">
        <div className="step-num"><LockKeyhole size={15} /></div>
        <div className="step-body">
          <div className="step-title">Your token stays yours</div>
          <p className="step-desc">
            Disconnect to remove the token from this browser. Workflows already installed keep running until you remove `.github/workflows/gitpulse.yml` from their repositories.
          </p>
        </div>
      </div>
    </div>
  </div>
);
