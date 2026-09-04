"use client";

import React, { useState } from "react";
import { Key, ExternalLink, X, ShieldAlert, CheckCircle2, Lock } from "lucide-react";

interface TokenConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToken: (token: string) => Promise<boolean>;
  currentToken: string;
  hasEnvToken: boolean;
}

export const TokenConfigModal: React.FC<TokenConfigModalProps> = ({
  isOpen,
  onClose,
  onSaveToken,
  currentToken,
  hasEnvToken,
}) => {
  const [inputToken, setInputToken] = useState(currentToken);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      setStatusMessage({ text: "Please enter a valid GitHub token.", error: true });
      return;
    }

    setTesting(true);
    setStatusMessage(null);
    const success = await onSaveToken(inputToken.trim());
    setTesting(false);

    if (success) {
      setStatusMessage({ text: "Token verified and connected successfully!" });
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setStatusMessage({
        text: "Failed to authenticate with GitHub. Check your token permissions.",
        error: true,
      });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          position: "relative",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              padding: "10px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(16, 185, 129, 0.15)",
              color: "var(--accent-emerald)",
            }}
          >
            <Key size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>GitHub Connection</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Provide a Personal Access Token to commit safely across your repositories.
            </p>
          </div>
        </div>

        {hasEnvToken && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(6, 182, 212, 0.1)",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              marginBottom: "16px",
              fontSize: "0.82rem",
              color: "var(--accent-cyan)",
            }}
          >
            <Lock size={16} />
            <span>Found <code>GITHUB_TOKEN</code> configured in environment variables.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="github-token-input">
              Personal Access Token (Classic or Fine-Grained)
            </label>
            <input
              id="github-token-input"
              type="password"
              className="text-input mono"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              autoFocus
            />
          </div>

          <div
            style={{
              padding: "12px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              marginBottom: "18px",
              fontSize: "0.8rem",
              lineHeight: "1.5",
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              Required Token Permissions:
            </div>
            <ul style={{ paddingLeft: "18px", marginBottom: "8px" }}>
              <li><strong>Classic Token</strong>: Check the <code>repo</code> scope.</li>
              <li><strong>Fine-Grained Token</strong>: Grant <strong>Contents: Read and write</strong> on All Repositories.</li>
            </ul>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=GitPulse-Vercel-AutoCommit"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--accent-emerald)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Generate Token on GitHub <ExternalLink size={12} />
            </a>
          </div>

          {statusMessage && (
            <div
              style={{
                padding: "10px",
                borderRadius: "var(--radius-sm)",
                marginBottom: "16px",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: statusMessage.error ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
                color: statusMessage.error ? "var(--accent-rose)" : "var(--accent-emerald)",
                border: `1px solid ${statusMessage.error ? "rgba(244, 63, 94, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
              }}
            >
              {statusMessage.error ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
              {statusMessage.text}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={testing}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-token-submit-btn"
              className="btn btn-primary"
              disabled={testing || !inputToken.trim()}
            >
              {testing ? "Verifying..." : "Connect & Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
