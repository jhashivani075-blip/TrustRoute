"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    MapPin,
    Clock,
    ShieldAlert,
    CheckCircle,
    AlertTriangle,
    FileText,
    Activity,
    GitMerge,
    Split,
} from "lucide-react";

import ReportTimeline from "../../../components/ReportTimeline";
import FlagsPanel from "../../../components/FlagsPanel";
import ScoreBreakdown from "../../../components/ScoreBreakdown";
import AdvisoryComparison from "../../../components/AdvisoryComparison";
import MiniMap from "../../../components/MiniMap";

import "./incident-details.css";

export default function IncidentDetailsPage({ params }) {
    const [report, setReport] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [otherId, setOtherId] = useState("");
    const [splitNote, setSplitNote] = useState("");

    const incidentId = params?.id;

    async function loadReports() {
        const response = await fetch("/api/reports", {
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error("Unable to load incident reports.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid report data received.");
        }

        setReports(data);
        return data;
    }

    useEffect(() => {
        let active = true;

        async function loadReport() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch("/api/reports", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error("Unable to load incident reports.");
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error("Invalid report data received.");
                }

                const selected = data.find(
                    (item) => String(item.id) === String(incidentId)
                );

                if (!selected) {
                    throw new Error("Incident not found.");
                }

                if (active) {
                    setReports(data);
                    setReport(selected);
                }
            } catch (err) {
                if (active) {
                    setError(err.message || "Unable to load incident.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        if (incidentId) {
            loadReport();
        } else {
            setError("Incident ID is missing.");
            setLoading(false);
        }

        return () => {
            active = false;
        };
    }, [incidentId]);

    async function updateIncident(action, extra = {}) {
        if (!report || saving || report.mergedInto) return;

        setSaving(true);
        setError("");
        setFeedback("");

        try {
            const response = await fetch("/api/reports", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: report.id,
                    action,
                    ...extra,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    `Unable to ${action.toLowerCase()} incident.`
                );
            }

            const data = await loadReports();

            const updated = data.find(
                (item) => String(item.id) === String(report.id)
            );

            if (!updated) {
                throw new Error(
                    "The incident was updated but could not be reloaded."
                );
            }

            setReport(updated);

            // Also refresh the selected incident after merging.
            if (action === "Merge" && extra.otherId) {
                const mergedReport = data.find(
                    (item) => String(item.id) === String(extra.otherId)
                );

                if (mergedReport) {
                    setFeedback(
                        `Reports merged successfully. "${mergedReport.title}" is now marked as Merged.`
                    );
                    return;
                }
            }

            const messages = {
                Verify: "Incident verified successfully.",
                Resolve: "Incident resolved successfully.",
                Reject: "Incident rejected successfully.",
                Confirm: "Incident confirmed successfully.",
                "Request Verification":
                    "Verification requested successfully.",
                Merge: "Reports merged successfully.",
                Split: "Incident marked for separate review.",
            };

            setFeedback(
                messages[action] ||
                result.message ||
                "Incident updated successfully."
            );
        } catch (err) {
            setError(err.message || "Unable to update incident.");
        } finally {
            setSaving(false);
        }
    }

    async function handleMerge(event) {
        event.preventDefault();

        if (!otherId) {
            setError("Please select an incident to merge.");
            return;
        }

        if (String(otherId) === String(report?.id)) {
            setError("You cannot merge an incident into itself.");
            return;
        }

        await updateIncident("Merge", {
            otherId,
            notes: `Merged incident ${otherId} into incident ${report?.id}.`,
        });

        setOtherId("");
    }

    async function handleSplit(event) {
        event.preventDefault();

        const note = splitNote.trim();

        if (!note) {
            setError(
                "Please explain why this incident needs separate review."
            );
            return;
        }

        await updateIncident("Split", { notes: note });
        setSplitNote("");
    }

    if (loading) {
        return (
            <main className="incident-page">
                <p>Loading incident details...</p>
            </main>
        );
    }

    if (error && !report) {
        return (
            <main className="incident-page">
                <p className="review-feedback" role="alert">
                    {error}
                </p>

                <Link href="/reports" className="back-link">
                    <ArrowLeft size={17} /> Back to Reports
                </Link>
            </main>
        );
    }

    if (!report) {
        return (
            <main className="incident-page">
                <p>Incident not found.</p>

                <Link href="/reports" className="back-link">
                    <ArrowLeft size={17} /> Back to Reports
                </Link>
            </main>
        );
    }

    const hasPriorityScore =
        report.priorityScore !== undefined &&
        report.priorityScore !== null &&
        report.priorityScore !== "" &&
        Number.isFinite(Number(report.priorityScore));

    const priority = hasPriorityScore
        ? Math.min(100, Math.max(0, Number(report.priorityScore)))
        : null;

    const priorityLabel =
        priority === null
            ? report.priority || "Not assessed"
            : priority >= 70
                ? "High priority"
                : priority >= 40
                    ? "Medium priority"
                    : "Low priority";

    const observedDate = report.observedAt
        ? new Date(report.observedAt)
        : null;

    const observedLabel =
        observedDate && !Number.isNaN(observedDate.getTime())
            ? `Observed ${observedDate.toLocaleString()}`
            : "Observation date not provided";

    const status = report.status || "Pending";

    const statusClass =
        status === "Verified" || status === "Confirmed"
            ? "status-verified"
            : status === "Rejected"
                ? "status-rejected"
                : status === "Resolved"
                    ? "status-resolved"
                    : "status-pending";

    const mergeCandidates = reports.filter(
        (item) =>
            String(item.id) !== String(report.id) &&
            !item.mergedInto &&
            item.status !== "Merged"
    );

    const relatedReports = reports.filter(
        (item) =>
            Array.isArray(report.relatedIncidents) &&
            report.relatedIncidents.includes(item.id)
    );

    const isMerged = Boolean(report.mergedInto);

    const actionAlreadyCompleted = (action) => {
        if (action === "Verify") {
            return status === "Verified";
        }

        if (action === "Resolve") {
            return status === "Resolved";
        }

        if (action === "Reject") {
            return status === "Rejected";
        }

        if (action === "Confirm") {
            return status === "Confirmed";
        }

        if (action === "Request Verification") {
            return status === "Verification Requested";
        }

        return false;
    };

    const actions = [
        "Verify",
        "Reject",
        "Confirm",
        "Request Verification",
        "Resolve",
    ];

    return (
        <main className="incident-page">
            <header className="incident-topbar">
                <Link href="/reports" className="back-link">
                    <ArrowLeft size={17} /> Back to Reports
                </Link>

                <div className="topbar-right">
                    <span className="system-status">
                        <span className="status-dot" />
                        Incident Review Dashboard
                    </span>
                </div>
            </header>

            <section className="incident-heading">
                <div>
                    <div className="eyebrow">
                        INCIDENT MANAGEMENT / {report.id}
                    </div>

                    <h1>{report.title || "Untitled incident"}</h1>

                    <p className="incident-subtitle">
                        {report.description ||
                            "No incident description provided."}
                    </p>
                </div>

                <span className={`review-badge ${statusClass}`}>
                    <Clock size={15} /> {status}
                </span>
            </section>

            {error && (
                <div className="review-feedback" role="alert">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {feedback && (
                <div className="review-feedback" role="status">
                    <CheckCircle size={18} /> {feedback}
                </div>
            )}

            <section className="incident-summary-grid">
                <article className="summary-card">
                    <div className="summary-icon blue-icon">
                        <MapPin size={20} />
                    </div>
                    <div>
                        <span>Reported location</span>
                        <h3>{report.location || "Not provided"}</h3>
                        <p>Location from submitted report</p>
                    </div>
                </article>

                <article className="summary-card">
                    <div className="summary-icon orange-icon">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <span>Incident category</span>
                        <h3>{report.category || "Uncategorised"}</h3>
                        <p>Reported hazard type</p>
                    </div>
                </article>

                <article className="summary-card">
                    <div className="summary-icon red-icon">
                        <Activity size={20} />
                    </div>
                    <div>
                        <span>Priority score</span>
                        <h3>
                            {priority !== null
                                ? `${priority} / 100`
                                : priorityLabel}
                        </h3>
                        <p>{priorityLabel}</p>
                    </div>
                </article>

                <article className="summary-card">
                    <div className="summary-icon green-icon">
                        <FileText size={20} />
                    </div>
                    <div>
                        <span>Report status</span>
                        <h3>{status}</h3>
                        <p>{observedLabel}</p>
                    </div>
                </article>
            </section>

            {isMerged && (
                <div className="review-feedback" role="status">
                    This report was merged into incident {report.mergedInto}.
                    <Link
                        href={`/incidents/${encodeURIComponent(report.mergedInto)}`}
                    >
                        {" "}View the main incident
                    </Link>
                </div>
            )}

            {relatedReports.length > 0 && (
                <section className="review-section">
                    <h2>Related merged reports</h2>

                    <ul>
                        {relatedReports.map((item) => (
                            <li key={item.id}>
                                <Link
                                    href={`/incidents/${encodeURIComponent(item.id)}`}
                                >
                                    {item.title || "Untitled incident"}
                                </Link>
                                {" — "}
                                {item.status}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className="incident-content-grid">
                <div className="incident-main-column">
                    <ReportTimeline report={report} />
                    <AdvisoryComparison report={report} />
                    <MiniMap
                        location={report.location}
                        title={report.title}
                    />
                </div>

                <aside className="incident-side-column">
                    <FlagsPanel report={report} />
                    <ScoreBreakdown report={report} />
                </aside>
            </div>

            <section className="review-section">
                <div className="review-section-heading">
                    <div>
                        <h2>Review Decision</h2>
                        <p>
                            Review the submitted information before changing
                            the incident status.
                        </p>
                    </div>

                    <AlertTriangle size={22} />
                </div>

                <div className="incident-action-buttons">
                    {actions.map((action) => {
                        const completed = actionAlreadyCompleted(action);

                        return (
                            <button
                                type="button"
                                key={action}
                                disabled={
                                    saving ||
                                    isMerged ||
                                    completed
                                }
                                aria-label={`${action} incident`}
                                onClick={() => updateIncident(action)}
                            >
                                {saving
                                    ? "Saving..."
                                    : completed
                                        ? action === "Request Verification"
                                            ? "Verification Requested"
                                            : `${action}ed`
                                        : action}
                            </button>
                        );
                    })}
                </div>

                {saving && (
                    <p role="status">Saving changes...</p>
                )}
            </section>

            <section className="review-section merge-split-section">
                <div className="review-section-heading">
                    <div>
                        <h2>Merge & Split Reports</h2>
                        <p>
                            Link duplicate incidents or flag a report for
                            separate investigation.
                        </p>
                    </div>

                    <GitMerge size={22} />
                </div>

                <form
                    onSubmit={handleMerge}
                    className="merge-report-form"
                >
                    <label htmlFor="merge-report-select">
                        Merge another report into this incident
                    </label>

                    <select
                        id="merge-report-select"
                        value={otherId}
                        onChange={(event) =>
                            setOtherId(event.target.value)
                        }
                        disabled={
                            saving ||
                            isMerged ||
                            mergeCandidates.length === 0
                        }
                    >
                        <option value="">
                            {mergeCandidates.length === 0
                                ? "No eligible reports available"
                                : "Select a report to merge"}
                        </option>

                        {mergeCandidates.map((item) => (
                            <option value={item.id} key={item.id}>
                                {item.title} — {item.category} (
                                {item.status})
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        disabled={saving || isMerged || !otherId}
                    >
                        <GitMerge size={16} />
                        {saving ? "Saving..." : "Merge Reports"}
                    </button>
                </form>

                <form
                    onSubmit={handleSplit}
                    className="split-report-form"
                >
                    <label htmlFor="split-report-note">
                        Reason for separate review
                    </label>

                    <textarea
                        id="split-report-note"
                        rows={3}
                        value={splitNote}
                        onChange={(event) =>
                            setSplitNote(event.target.value)
                        }
                        placeholder="Explain why this incident needs a separate investigation..."
                        disabled={saving || isMerged}
                    />

                    <button
                        type="submit"
                        disabled={
                            saving ||
                            isMerged ||
                            !splitNote.trim()
                        }
                    >
                        <Split size={16} />
                        {saving ? "Saving..." : "Split for Review"}
                    </button>
                </form>

                <p className="merge-split-note">
                    Merge links the selected report to this incident and
                    marks the selected report as merged. Split marks this
                    report for separate review; it does not create a second
                    report.
                </p>
            </section>
        </main>
    );
}
