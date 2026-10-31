"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  ExternalLink,
  X,
  ShieldAlert,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

interface TokenConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisconnect: () => void;
  onSaveToken: (token: string) => Promise<boolean>;
  currentToken: string;
}

export const TokenConfigModal: React.FC<TokenConfigModalProps> = ({
  isOpen,
  onClose,
  onDisconnect,
  onSaveToken,
  currentToken,
}) => {
  const [inputToken, setInputToken] = useState(currentToken);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);

  // Sync input when currentToken changes (e.g. from external state)
  useEffect(() => {
    setInputToken(currentToken);
  }, [currentToken]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputToken.trim();
    if (!trimmed) {
      setStatus({ text: "Please enter a valid GitHub token.", error: true });
      return;
    }

    setTesting(true);
    setStatus(null);

    const success = await onSaveToken(trimmed);
    setTesting(false);

    if (success) {
      setStatus({ text: "Token verified and connected successfully!" });
      setTimeout(onClose, 1100);
    } else {
      setStatus({
        text: "Authentication failed. Check your token permissions (repo scope required).",
        error: true,
      });
    }
  };

  // Close when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={16} />
        </button>

        {/* Header */}
        <div className="modal-header">
          <div
            className="modal-icon"
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              color: "var(--emerald)",
            }}
          >
            <Key size={20} />
          </div>
          <div>
            <div id="modal-title" className="modal-title">
              GitHub Connection
            </div>
            <div className="modal-subtitle">
              Use this same token to connect, make commits, and enable daily automation. You do not need a second token.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Token input */}
          <div className="input-group">
            <label className="label" htmlFor="github-token-input">
              One GitHub token
            </label>
            <div className="input-wrapper icon-right">
              <input
                id="github-token-input"
                type={showToken ? "text" : "password"}
                className="input input-mono"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={inputToken}
                onChange={(e) => {
                  setInputToken(e.target.value);
                  setStatus(null);
                }}
                autoFocus
                autoComplete="off"
              />
              <button
                type="button"
                className="input-icon-right"
                onClick={() => setShowToken((v) => !v)}
                tabIndex={-1}
                title={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Permissions info */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "var(--r-md)",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid var(--border-faint)",
              marginBottom: 16,
              fontSize: "0.8rem",
              lineHeight: 1.55,
              color: "var(--text-2)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: "var(--text-1)",
                marginBottom: 6,
                fontSize: "0.82rem",
              }}
            >
              One token, two GitHub permissions
            </div>
            <ul
              style={{
                paddingLeft: 16,
                marginBottom: 10,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <li>Classic token: <code>repo</code> and <code>workflow</code>. Fine-grained token: <strong>Contents</strong> and <strong>Workflows</strong> set to Read and write for the selected repos.</li>
            </ul>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=GitPulse"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--emerald)",
                fontWeight: 600,
                fontSize: "0.78rem",
              }}
            >
              Create the one token on GitHub <ExternalLink size={11} />
            </a>
          </div>

          {/* Status message */}
          {status && (
            <div
              className={`notice ${status.error ? "notice-error" : "notice-success"}`}
              style={{ marginBottom: 14 }}
            >
              {status.error ? <ShieldAlert size={15} /> : <CheckCircle2 size={15} />}
              {status.text}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            {currentToken && (
              <button type="button" className="btn btn-secondary" onClick={onDisconnect} disabled={testing}>
                Disconnect
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={testing}>Cancel</button>
            <button
              type="submit"
              id="save-token-submit-btn"
              className="btn btn-primary"
              disabled={testing || !inputToken.trim()}
            >
              {testing ? "Verifying…" : "Connect & Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
