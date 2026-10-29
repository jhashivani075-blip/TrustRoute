"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search,
    RefreshCw,
    History,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Trash2,
    AlertTriangle,
} from "lucide-react";

import "./audit.css";

export default function AuditPage() {
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("All");
    const [auditEntries, setAuditEntries] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchAuditEntries = useCallback(async () => {
        setRefreshing(true);
        setError("");

        try {
            const response = await fetch("/api/audit", {
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to load audit entries."
                );
            }

            if (!Array.isArray(data)) {
                throw new Error("The audit API returned invalid data.");
            }

            setAuditEntries(data);
        } catch (err) {
            console.error("Audit log loading error:", err);
            setError(err.message || "Unable to load audit entries.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAuditEntries();
    }, [fetchAuditEntries]);

    const filteredEntries = auditEntries.filter((entry) => {
        const query = search.trim().toLowerCase();

        const matchesSearch =
            !query ||
            [
                entry.action,
                entry.incidentTitle,
                entry.incidentId,
                entry.reviewer,
                entry.notes,
                entry.previousStatus,
                entry.newStatus,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query);

        const matchesAction =
            actionFilter === "All" || entry.action === actionFilter;

        return matchesSearch && matchesAction;
    });

    async function confirmDelete() {
        if (!deleteTarget || deleting) return;

        setDeleting(true);
        setError("");
        setNotice("");

        try {
            const url =
                deleteTarget.type === "all"
                    ? "/api/audit?clear=all"
                    : `/api/audit?id=${encodeURIComponent(
                          deleteTarget.id
                      )}`;

            const response = await fetch(url, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to delete audit history."
                );
            }

            setDeleteTarget(null);
            setNotice(
                deleteTarget.type === "all"
                    ? `Audit history cleared. ${data.deletedCount} entries deleted.`
                    : "Audit entry deleted successfully."
            );

            await fetchAuditEntries();
        } catch (err) {
            setError(err.message || "Unable to delete audit history.");
        } finally {
            setDeleting(false);
        }
    }

    function formatDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Invalid date";
        }

        return date.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
        });
    }

    function getActionClass(action = "") {
        const value = action.toLowerCase();

        if (
            value.includes("verify") ||
            value.includes("confirm") ||
            value.includes("resolve")
        ) {
            return "audit-action-verified";
        }

        if (value.includes("reject")) {
            return "audit-action-rejected";
        }

        if (value.includes("delet")) {
            return "audit-action-deleted";
        }

        return "audit-action-default";
    }

    const submissions = auditEntries.filter((entry) =>
        entry.action?.toLowerCase().includes("submitted")
    ).length;

    const verified = auditEntries.filter((entry) =>
        ["verify", "verified"].some((word) =>
            entry.action?.toLowerCase().includes(word)
        )
    ).length;

    const rejected = auditEntries.filter((entry) =>
        entry.action?.toLowerCase().includes("reject")
    ).length;

    return (
        <main className="audit-page">
            <header className="audit-header">
                <div>
                    <p className="audit-eyebrow">
                        TRUSTROUTE / ACCOUNTABILITY
                    </p>
                    <h1>Audit Log</h1>
                    <p className="audit-subtitle">
                        Track actions and status changes across incident reports.
                    </p>
                </div>

                <div className="audit-header-actions">
                    <button
                        type="button"
                        className="audit-refresh-button"
                        onClick={fetchAuditEntries}
                        disabled={refreshing || deleting}
                    >
                        <RefreshCw
                            size={16}
                            className={refreshing ? "audit-spinning" : ""}
                        />
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>

                    <button
                        type="button"
                        className="audit-clear-button"
                        onClick={() =>
                            setDeleteTarget({ type: "all" })
                        }
                        disabled={
                            auditEntries.length === 0 ||
                            refreshing ||
                            deleting
                        }
                    >
                        <Trash2 size={16} />
                        Clear History
                    </button>
                </div>
            </header>

            {notice && (
                <div className="audit-notice" role="status">
                    <CheckCircle size={17} />
                    <span>{notice}</span>
                    <button
                        type="button"
                        onClick={() => setNotice("")}
                        aria-label="Dismiss message"
                    >
                        ×
                    </button>
                </div>
            )}

            {error && !loading && (
                <div className="audit-error" role="alert">
                    <AlertTriangle size={17} />
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError("")}
                        aria-label="Dismiss error"
                    >
                        ×
                    </button>
                </div>
            )}

            <section className="audit-stats">
                <article className="audit-stat-card">
                    <div className="audit-stat-icon">
                        <History size={19} />
                    </div>
                    <span>Total Activities</span>
                    <strong>{auditEntries.length}</strong>
                </article>

                <article className="audit-stat-card">
                    <div className="audit-stat-icon">
                        <FileText size={19} />
                    </div>
                    <span>Submissions</span>
                    <strong>{submissions}</strong>
                </article>

                <article className="audit-stat-card">
                    <div className="audit-stat-icon">
                        <CheckCircle size={19} />
                    </div>
                    <span>Verified</span>
                    <strong>{verified}</strong>
                </article>

                <article className="audit-stat-card">
                    <div className="audit-stat-icon">
                        <XCircle size={19} />
                    </div>
                    <span>Rejected</span>
                    <strong>{rejected}</strong>
                </article>
            </section>

            <section className="audit-list-section">
                <div className="audit-list-heading">
                    <div>
                        <h2>Activity History</h2>
                        <p>
                            A record of actions performed on incident reports.
                        </p>
                    </div>

                    <span className="audit-count">
                        {filteredEntries.length} activities
                    </span>
                </div>

                <div className="audit-toolbar">
                    <div className="audit-search">
                        <Search size={18} />
                        <input
                            type="search"
                            placeholder="Search incidents, actions, reviewers..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            aria-label="Search audit entries"
                        />
                    </div>

                    <div className="audit-filter">
                        <label htmlFor="audit-action-filter">Action</label>
                        <select
                            id="audit-action-filter"
                            value={actionFilter}
                            onChange={(event) =>
                                setActionFilter(event.target.value)
                            }
                        >
                            <option value="All">All actions</option>
                            {[...new Set(
                                auditEntries.map((entry) => entry.action)
                            )]
                                .filter(Boolean)
                                .sort()
                                .map((action) => (
                                    <option key={action} value={action}>
                                        {action}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="audit-empty">
                        <History size={32} />
                        <h3>Loading activity...</h3>
                        <p>Fetching the latest audit records.</p>
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="audit-empty">
                        <History size={32} />
                        <h3>No activity found</h3>
                        <p>
                            Try changing your search or action filter.
                        </p>
                    </div>
                ) : (
                    <div className="audit-table-wrapper">
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Incident</th>
                                    <th>Status Change</th>
                                    <th>Reviewer</th>
                                    <th>Date &amp; Time</th>
                                    <th>Manage</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredEntries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>
                                            <span
                                                className={`audit-action-badge ${getActionClass(
                                                    entry.action
                                                )}`}
                                            >
                                                {entry.action}
                                            </span>
                                        </td>

                                        <td>
                                            <strong>
                                                {entry.incidentTitle ||
                                                    "Untitled incident"}
                                            </strong>
                                            <small>
                                                {entry.incidentId || "No ID"}
                                            </small>
                                        </td>

                                        <td>
                                            <div className="audit-status-change">
                                                <span>
                                                    {entry.previousStatus ||
                                                        "—"}
                                                </span>
                                                <span className="audit-status-arrow">
                                                    →
                                                </span>
                                                <span>
                                                    {entry.newStatus || "—"}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            {entry.reviewer || "Unknown"}
                                        </td>

                                        <td>
                                            <span className="audit-date">
                                                <Clock size={13} />
                                                {formatDate(entry.timestamp)}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="audit-delete-button"
                                                onClick={() =>
                                                    setDeleteTarget({
                                                        type: "single",
                                                        id: entry.id,
                                                        title:
                                                            entry.incidentTitle ||
                                                            "this activity",
                                                    })
                                                }
                                                disabled={deleting}
                                                aria-label={`Delete audit entry for ${
                                                    entry.incidentTitle ||
                                                    "this activity"
                                                }`}
                                                title="Delete this entry"
                                            >
                                                <Trash2 size={15} />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {deleteTarget && (
                <div
                    className="audit-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !deleting) {
                            setDeleteTarget(null);
                        }
                    }}
                >
                    <section
                        className="audit-confirm-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="audit-confirm-title"
                    >
                        <div className="audit-modal-icon">
                            <AlertTriangle size={25} />
                        </div>

                        <h2 id="audit-confirm-title">
                            {deleteTarget.type === "all"
                                ? "Clear all audit history?"
                                : "Delete this audit entry?"}
                        </h2>

                        <p>
                            {deleteTarget.type === "all"
                                ? `This will permanently delete all ${auditEntries.length} audit entries. This action cannot be undone.`
                                : `This will permanently delete the audit entry for "${deleteTarget.title}". This action cannot be undone.`}
                        </p>

                        <div className="audit-modal-actions">
                            <button
                                type="button"
                                className="audit-cancel-button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="audit-confirm-delete-button"
                                onClick={confirmDelete}
                                disabled={deleting}
                            >
                                <Trash2 size={16} />
                                {deleting
                                    ? "Deleting..."
                                    : deleteTarget.type === "all"
                                      ? "Clear All"
                                      : "Delete Entry"}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}