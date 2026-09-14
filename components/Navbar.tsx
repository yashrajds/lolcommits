"use client";

import React from "react";
import { Activity, Key, RefreshCw } from "lucide-react";
import type { GitHubUser } from "@/lib/github";

interface NavbarProps {
  user: GitHubUser | null;
  loading: boolean;
  onOpenTokenModal: () => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  loading,
  onOpenTokenModal,
  onRefresh,
}) => {
  return (
    <header className="navbar">
      {/* Brand */}
      <div className="brand">
        <div className="brand-mark">
          <Activity size={16} />
          <span className="brand-pulse" />
        </div>
        <span className="brand-name">GitPulse</span>
        <span className="brand-tag">AutoCommit</span>
      </div>

      {/* Right Actions */}
      <div className="nav-right">
        {user ? (
          <>
            <button
              id="refresh-repos-btn"
              className="btn btn-secondary btn-sm"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh repositories"
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} />
              Refresh
            </button>

            <div className="user-chip">
              <div className="user-avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.login} />
                ) : (
                  <Activity size={14} color="var(--emerald)" />
                )}
              </div>
              <div className="user-info">
                <span className="user-login">@{user.login}</span>
                <span className="user-repos">
                  {(user.public_repos ?? 0) + (user.total_private_repos ?? 0)} repos
                </span>
              </div>
            </div>

            <button
              id="change-token-btn"
              className="btn btn-secondary btn-sm"
              onClick={onOpenTokenModal}
              title="Manage GitHub Token"
            >
              <Key size={13} />
              Config
            </button>
          </>
        ) : (
          <button
            id="connect-token-btn"
            className="btn btn-primary btn-sm"
            onClick={onOpenTokenModal}
          >
            <Key size={13} />
            Connect GitHub
          </button>
        )}
      </div>
    </header>
  );
};
