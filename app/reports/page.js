"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Search,
    RefreshCw,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    MapPin,
    Trash2,
    AlertTriangle,
    X,
    Check,
} from "lucide-react";

import "./reports.css";

export default function ReportsPage() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [reportToDelete, setReportToDelete] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [refreshing, setRefreshing] = useState(false);

    const loadReports = useCallback(async (showRefresh = false) => {
        if (showRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await fetch("/api/reports", {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Unable to load reports.");
            }

            const data = await response.json();

            setReports(Array.isArray(data) ? data : []);
            setError("");
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    useEffect(() => {
        if (!successMessage && !error) return;

        const timer = setTimeout(() => {
            setSuccessMessage("");
            setError("");
        }, 4000);

        return () => clearTimeout(timer);
    }, [successMessage, error]);

    useEffect(() => {
        if (!reportToDelete) return;

        function handleEscape(event) {
            if (event.key === "Escape" && deletingId === null) {
                setReportToDelete(null);
            }
        }

        window.addEventListener("keydown", handleEscape);

        return () => window.removeEventListener("keydown", handleEscape);
    }, [reportToDelete, deletingId]);

    async function updateReportStatus(id, action) {
        if (updatingId !== null || deletingId !== null) return;

        setUpdatingId(id);
        setError("");
        setSuccessMessage("");

        try {
            const response = await fetch("/api/reports", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id, action }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to update report status."
                );
            }

            if (result.report) {
                setReports((currentReports) =>
                    currentReports.map((report) =>
                        String(report.id) === String(id)
                            ? result.report
                            : report
                    )
                );

                setSuccessMessage(`Report ${action.toLowerCase()}ed successfully.`);
            } else {
                await loadReports(true);
                setSuccessMessage("Report status updated successfully.");
            }
        } catch (err) {
            setError(err.message || "Unable to update report status.");
        } finally {
            setUpdatingId(null);
        }
    }

    async function deleteReport() {
        if (!reportToDelete || updatingId !== null || deletingId !== null) {
            return;
        }

        const report = reportToDelete;

        setDeletingId(report.id);
        setError("");
        setSuccessMessage("");

        try {
            const response = await fetch(
                `/api/reports?id=${encodeURIComponent(report.id)}`,
                {
                    method: "DELETE",
                    cache: "no-store",
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to delete this report."
                );
            }

            setReports((currentReports) =>
                currentReports.filter(
                    (item) => String(item.id) !== String(report.id)
                )
            );

            setReportToDelete(null);
            setSuccessMessage("Report deleted successfully.");
        } catch (err) {
            setError(err.message || "Unable to delete this report.");
        } finally {
            setDeletingId(null);
        }
    }

    const getStatus = (report) => report.status || "Pending";

    const pendingCount = reports.filter((report) =>
        ["Pending", "Awaiting Verification", "Verification Requested"].includes(
            getStatus(report)
        )
    ).length;

    const verifiedCount = reports.filter(
        (report) => getStatus(report) === "Verified"
    ).length;

    const rejectedCount = reports.filter(
        (report) => getStatus(report) === "Rejected"
    ).length;

    const filteredReports = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...reports]
            .filter((report) => {
                const searchableText = [
                    report.title,
                    report.description,
                    report.category,
                    report.location,
                    report.source,
                    report.id,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const matchesSearch = !query || searchableText.includes(query);
                const matchesStatus =
                    statusFilter === "All" ||
                    getStatus(report) === statusFilter;

                return matchesSearch && matchesStatus;
            })
            .reverse();
    }, [reports, search, statusFilter]);

    function formatDate(value) {
        if (!value) return "Not provided";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Invalid date";

        return date.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
        });
    }

    function getStatusClass(status) {
        switch (status) {
            case "Verified":
            case "Confirmed":
                return "status-verified";
            case "Rejected":
                return "status-rejected";
            case "Resolved":
                return "status-resolved";
            default:
                return "status-pending";
        }
    }

    return (
        <main className="reports-page">
            <header className="reports-header">
                <div>
                    <p className="reports-eyebrow">
                        TRUSTROUTE / MONITORING
                    </p>

                    <h1>Incident Reports</h1>

                    <p className="reports-subtitle">
                        Review submitted incidents and manage their
                        verification status.
                    </p>
                </div>

                <div className="reports-header-actions">
                    <button
                        type="button"
                        className="reports-refresh-button"
                        onClick={() => loadReports(true)}
                        disabled={refreshing || loading}
                    >
                        <RefreshCw
                            size={16}
                            className={refreshing ? "refresh-spinning" : ""}
                        />
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>

                    <Link href="/submit" className="new-report-button">
                        + Submit Report
                    </Link>
                </div>
            </header>

            <section className="reports-stats">
                <article className="report-stat-card">
                    <div className="report-stat-icon">
                        <FileText size={19} />
                    </div>
                    <span>Total Reports</span>
                    <strong>{reports.length}</strong>
                </article>

                <article className="report-stat-card pending-card">
                    <div className="report-stat-icon">
                        <Clock size={19} />
                    </div>
                    <span>Pending Verification</span>
                    <strong>{pendingCount}</strong>
                </article>

                <article className="report-stat-card verified-card">
                    <div className="report-stat-icon">
                        <CheckCircle size={19} />
                    </div>
                    <span>Verified Reports</span>
                    <strong>{verifiedCount}</strong>
                </article>

                <article className="report-stat-card rejected-card">
                    <div className="report-stat-icon">
                        <XCircle size={19} />
                    </div>
                    <span>Rejected Reports</span>
                    <strong>{rejectedCount}</strong>
                </article>
            </section>

            <section className="reports-list-section">
                <div className="reports-list-heading">
                    <div>
                        <h2>Submitted Incidents</h2>
                        <p>Review reports received from the community.</p>
                    </div>

                    <span className="report-count">
                        {filteredReports.length} of {reports.length} reports
                    </span>
                </div>

                <div className="reports-toolbar">
                    <div className="reports-search">
                        <Search size={18} />

                        <input
                            type="search"
                            placeholder="Search incidents, categories, locations..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            aria-label="Search incident reports"
                        />
                    </div>

                    <div className="reports-filter">
                        <label htmlFor="report-status-filter">Status</label>

                        <select
                            id="report-status-filter"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="All">All statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Awaiting Verification">
                                Awaiting Verification
                            </option>
                            <option value="Verification Requested">
                                Verification Requested
                            </option>
                            <option value="Verified">Verified</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    </div>
                </div>

                {successMessage && (
                    <div className="reports-toast success-message" role="status">
                        <CheckCircle size={19} />
                        <span>{successMessage}</span>
                        <button
                            type="button"
                            onClick={() => setSuccessMessage("")}
                            aria-label="Dismiss success message"
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

                {error && (
                    <div className="reports-toast error-message" role="alert">
                        <AlertTriangle size={19} />
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError("")}
                            aria-label="Dismiss error message"
                        >
                            <X size={17} />
                        </button>
                    </div>
                )}

                {loading ? (
                    <p className="reports-message">Loading reports...</p>
                ) : reports.length === 0 ? (
                    <div className="reports-empty">
                        <FileText size={34} />
                        <h3>No reports yet</h3>
                        <p>
                            Submitted incident reports will appear here.
                        </p>
                        <Link href="/submit">Submit your first report</Link>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="reports-empty">
                        <Search size={30} />
                        <h3>No matching reports</h3>
                        <p>
                            Try another search term or change the status
                            filter.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setStatusFilter("All");
                            }}
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="reports-table-wrapper">
                        <table className="reports-table">
                            <thead>
                                <tr>
                                    <th>Incident</th>
                                    <th>Category</th>
                                    <th>Location</th>
                                    <th>Date Observed</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredReports.map((report) => {
                                    const status = getStatus(report);
                                    const isUpdating =
                                        String(updatingId) ===
                                        String(report.id);
                                    const isDeleting =
                                        String(deletingId) ===
                                        String(report.id);
                                    const busy =
                                        updatingId !== null ||
                                        deletingId !== null;

                                    const canReview = [
                                        "Pending",
                                        "Awaiting Verification",
                                        "Verification Requested",
                                    ].includes(status);

                                    return (
                                        <tr key={report.id}>
                                            <td>
                                                <Link
                                                    href={`/incidents/${encodeURIComponent(
                                                        report.id
                                                    )}`}
                                                    className="incident-title-link"
                                                >
                                                    {report.title ||
                                                        "Untitled incident"}
                                                </Link>

                                                <small>
                                                    {report.description ||
                                                        "No description provided"}
                                                </small>
                                            </td>

                                            <td>{report.category || "Other"}</td>

                                            <td>
                                                <span className="report-location">
                                                    <MapPin size={13} />
                                                    {report.location ||
                                                        "Not provided"}
                                                </span>
                                            </td>

                                            <td>{formatDate(report.observedAt)}</td>

                                            <td>
                                                <span
                                                    className={`report-status ${getStatusClass(
                                                        status
                                                    )}`}
                                                >
                                                    {status}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="report-actions">
                                                    {canReview ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="verify-button"
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    updateReportStatus(
                                                                        report.id,
                                                                        "Verify"
                                                                    )
                                                                }
                                                            >
                                                                {isUpdating
                                                                    ? "Saving..."
                                                                    : "Verify"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="reject-button"
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    updateReportStatus(
                                                                        report.id,
                                                                        "Reject"
                                                                    )
                                                                }
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="action-complete">
                                                            Reviewed
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="delete-button"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            setReportToDelete(
                                                                report
                                                            )
                                                        }
                                                    >
                                                        <Trash2 size={14} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {reportToDelete && (
                <div
                    className="delete-modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            deletingId === null
                        ) {
                            setReportToDelete(null);
                        }
                    }}
                >
                    <section
                        className="delete-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-modal-title"
                        aria-describedby="delete-modal-description"
                    >
                        <button
                            type="button"
                            className="delete-modal-close"
                            onClick={() => setReportToDelete(null)}
                            disabled={deletingId !== null}
                            aria-label="Close confirmation"
                        >
                            <X size={20} />
                        </button>

                        <div className="delete-modal-icon">
                            <Trash2 size={25} />
                        </div>

                        <h2 id="delete-modal-title">Delete this report?</h2>

                        <p id="delete-modal-description">
                            You are about to delete{" "}
                            <strong>
                                {reportToDelete.title || "Untitled incident"}
                            </strong>
                            . This action cannot be undone.
                        </p>

                        <div className="delete-modal-actions">
                            <button
                                type="button"
                                className="delete-cancel-button"
                                onClick={() => setReportToDelete(null)}
                                disabled={deletingId !== null}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="delete-confirm-button"
                                onClick={deleteReport}
                                disabled={deletingId !== null}
                            >
                                <Trash2 size={16} />
                                {deletingId !== null
                                    ? "Deleting..."
                                    : "Yes, Delete"}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}