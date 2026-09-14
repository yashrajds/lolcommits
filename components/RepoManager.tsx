"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  CheckSquare,
  Square,
  Star,
  GitBranch,
  Lock,
  Globe,
  GitFork,
  Send,
  ExternalLink,
  FolderGit2,
} from "lucide-react";
import type { GitHubRepo } from "@/lib/github";

type Filter = "all" | "public" | "private" | "non-forks";

interface RepoManagerProps {
  repos: GitHubRepo[];
  selectedRepoIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSingleCommit: (repo: GitHubRepo) => void;
  isCommitting: boolean;
}

export const RepoManager: React.FC<RepoManagerProps> = ({
  repos,
  selectedRepoIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onSingleCommit,
  isCommitting,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("non-forks");

  const filtered = useMemo(() => {
    return repos.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false);
      if (!matchSearch) return false;
      if (activeFilter === "public") return !r.private;
      if (activeFilter === "private") return r.private;
      if (activeFilter === "non-forks") return !r.fork;
      return true;
    });
  }, [repos, searchQuery, activeFilter]);

  const counts = {
    all: repos.length,
    "non-forks": repos.filter((r) => !r.fork).length,
    public: repos.filter((r) => !r.private).length,
    private: repos.filter((r) => r.private).length,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "non-forks", label: "Original" },
    { key: "public", label: "Public" },
    { key: "private", label: "Private" },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">
            <FolderGit2 size={17} color="var(--violet)" />
            Repository Manager
            <span className="badge badge-violet">
              {selectedRepoIds.size} / {repos.length}
            </span>
          </div>
          <p className="card-desc">
            Choose which repositories will receive automated heartbeat commits.
          </p>
        </div>

        <div className="repo-toolbar-right">
          <button
            id="select-all-btn"
            className="btn btn-secondary btn-sm"
            onClick={onSelectAll}
            title="Select all repositories"
          >
            <CheckSquare size={13} />
            Select All
          </button>
          <button
            id="deselect-all-btn"
            className="btn btn-secondary btn-sm"
            onClick={onDeselectAll}
            title="Deselect all repositories"
          >
            <Square size={13} />
            Clear
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="repo-toolbar">
        <div className="repo-toolbar-left">
          <div
            className="input-wrapper"
            style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
          >
            <Search size={14} className="input-icon-left" />
            <input
              id="repo-search-input"
              type="text"
              className="input"
              placeholder="Search repositories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {filters.map(({ key, label }) => (
              <button
                key={key}
                className={`filter-pill ${activeFilter === key ? "active" : ""}`}
                onClick={() => setActiveFilter(key)}
              >
                {label}
                <span className="filter-count">{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Repo list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FolderGit2 size={32} />
          </div>
          <div className="empty-title">
            {repos.length === 0
              ? "No repositories found"
              : "No repositories match your filter"}
          </div>
          <div className="empty-desc">
            {repos.length === 0
              ? "Connect your GitHub token to load repositories."
              : "Try adjusting the search query or filter."}
          </div>
        </div>
      ) : (
        <div className="repo-list" id="repo-list-container">
          {filtered.map((repo) => {
            const isSelected = selectedRepoIds.has(repo.id);
            return (
              <div
                key={repo.id}
                className={`repo-row ${isSelected ? "selected" : ""}`}
                id={`repo-item-${repo.name}`}
              >
                <div className="repo-left">
                  <input
                    type="checkbox"
                    className="repo-check"
                    checked={isSelected}
                    onChange={() => onToggleSelect(repo.id)}
                    id={`checkbox-${repo.name}`}
                    title="Toggle auto-commit target"
                  />
                  <div className="repo-info">
                    <div className="repo-name-row">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="repo-name"
                      >
                        {repo.name}
                        <ExternalLink size={11} color="var(--text-4)" />
                      </a>

                      {repo.private ? (
                        <span className="badge badge-amber">
                          <Lock size={9} />
                          Private
                        </span>
                      ) : (
                        <span className="badge badge-cyan">
                          <Globe size={9} />
                          Public
                        </span>
                      )}

                      {repo.fork && (
                        <span className="badge badge-muted">
                          <GitFork size={9} />
                          Fork
                        </span>
                      )}
                    </div>

                    <div className="repo-meta-row">
                      <span className="meta-item">
                        <GitBranch size={11} />
                        {repo.default_branch}
                      </span>
                      {repo.stargazers_count > 0 && (
                        <span className="meta-item">
                          <Star size={11} color="var(--amber)" />
                          {repo.stargazers_count}
                        </span>
                      )}
                      <span className="meta-item">
                        Updated {new Date(repo.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => onSingleCommit(repo)}
                    disabled={isCommitting}
                    title="Test instant pulse commit to this repository"
                    id={`test-pulse-${repo.name}`}
                  >
                    <Send size={11} />
                    Test Pulse
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
