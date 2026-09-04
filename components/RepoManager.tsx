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
} from "lucide-react";
import { GitHubRepo } from "@/lib/github";

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
  const [activeFilter, setActiveFilter] = useState<"all" | "public" | "private" | "non-forks">("non-forks");

  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      // Search matching
      const matchesSearch =
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter matching
      if (activeFilter === "public") return !repo.private;
      if (activeFilter === "private") return repo.private;
      if (activeFilter === "non-forks") return !repo.fork;

      return true;
    });
  }, [repos, searchQuery, activeFilter]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <span>Repository Manager</span>
            <span className="brand-badge" style={{ fontSize: "0.7rem" }}>
              {selectedRepoIds.size} of {repos.length} selected
            </span>
          </h2>
          <p className="card-description">
            Choose which repositories will receive automated heartbeat commits.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            id="select-all-btn"
            className="btn btn-secondary btn-sm"
            onClick={onSelectAll}
          >
            <CheckSquare size={14} /> Select All
          </button>
          <button
            id="deselect-all-btn"
            className="btn btn-secondary btn-sm"
            onClick={onDeselectAll}
          >
            <Square size={14} /> Clear
          </button>
        </div>
      </div>

      <div className="repo-search-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            id="repo-search-input"
            type="text"
            className="text-input"
            placeholder="Search repositories by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="repo-filters">
          <span
            className={`filter-badge ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All ({repos.length})
          </span>
          <span
            className={`filter-badge ${activeFilter === "non-forks" ? "active" : ""}`}
            onClick={() => setActiveFilter("non-forks")}
          >
            Original ({repos.filter((r) => !r.fork).length})
          </span>
          <span
            className={`filter-badge ${activeFilter === "public" ? "active" : ""}`}
            onClick={() => setActiveFilter("public")}
          >
            Public ({repos.filter((r) => !r.private).length})
          </span>
          <span
            className={`filter-badge ${activeFilter === "private" ? "active" : ""}`}
            onClick={() => setActiveFilter("private")}
          >
            Private ({repos.filter((r) => r.private).length})
          </span>
        </div>
      </div>

      {filteredRepos.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.9rem",
          }}
        >
          {repos.length === 0
            ? "No repositories found. Connect your GitHub token above."
            : "No repositories match your search or filter."}
        </div>
      ) : (
        <div className="repo-list" id="repo-list-container">
          {filteredRepos.map((repo) => {
            const isSelected = selectedRepoIds.has(repo.id);
            return (
              <div
                key={repo.id}
                className={`repo-item ${isSelected ? "selected" : ""}`}
                id={`repo-item-${repo.name}`}
              >
                <div className="repo-info">
                  <input
                    type="checkbox"
                    className="repo-checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(repo.id)}
                    id={`checkbox-${repo.name}`}
                    title="Toggle auto-commit target"
                  />

                  <div className="repo-name-box">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="repo-name-link"
                      >
                        {repo.name}
                        <ExternalLink size={12} color="var(--text-muted)" />
                      </a>

                      {repo.private ? (
                        <span className="meta-pill" style={{ color: "var(--accent-amber)" }}>
                          <Lock size={10} style={{ display: "inline", marginRight: "3px" }} />
                          Private
                        </span>
                      ) : (
                        <span className="meta-pill" style={{ color: "var(--accent-cyan)" }}>
                          <Globe size={10} style={{ display: "inline", marginRight: "3px" }} />
                          Public
                        </span>
                      )}

                      {repo.fork && (
                        <span className="meta-pill" style={{ color: "var(--text-muted)" }}>
                          <GitFork size={10} style={{ display: "inline", marginRight: "3px" }} />
                          Fork
                        </span>
                      )}
                    </div>

                    <div className="repo-meta">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                        <GitBranch size={11} /> {repo.default_branch}
                      </span>
                      {repo.stargazers_count > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <Star size={11} color="#f59e0b" /> {repo.stargazers_count}
                        </span>
                      )}
                      <span>
                        Updated {new Date(repo.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="repo-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSingleCommit(repo)}
                    disabled={isCommitting}
                    title="Test instant pulse commit to this repository"
                  >
                    <Send size={12} /> Test Pulse
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
