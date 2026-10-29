"use client";

import { useEffect, useState } from "react";
import {
    MapPin,
    FileText,
    CheckCircle2,
    Activity,
    AlertCircle,
    Clock,
} from "lucide-react";
import "./ReportTimeline.css";

export default function ReportTimeline({ report }) {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [auditError, setAuditError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadAuditLogs() {
            if (!report?.id) {
                setAuditLogs([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setAuditError("");

                const response = await fetch("/api/audit", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error("Unable to load audit history.");
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error("Invalid audit history format.");
                }

                if (!cancelled) {
                    setAuditLogs(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setAuditError(
                        error.message || "Unable to load audit history."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadAuditLogs();

        return () => {
            cancelled = true;
        };
    }, [report?.id]);

    function formatDate(value) {
        if (!value) return "Time unavailable";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Time unavailable";
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    }

    function getEventDate(event) {
        return (
            event.timestamp ||
            event.createdAt ||
            event.updatedAt ||
            event.time ||
            event.date ||
            null
        );
    }

    function getEventAction(event) {
        return String(
            event.action ||
            event.type ||
            event.event ||
            event.activity ||
            "Incident updated"
        );
    }

    function getEventDescription(event) {
        if (typeof event.notes === "string" && event.notes.trim()) {
            return event.notes;
        }

        if (
            typeof event.description === "string" &&
            event.description.trim()
        ) {
            return event.description;
        }

        if (
            typeof event.message === "string" &&
            event.message.trim()
        ) {
            return event.message;
        }

        if (
            typeof event.details === "string" &&
            event.details.trim()
        ) {
            return event.details;
        }

        return "";
    }

    function getEventId(event) {
        return (
            event.incidentId ??
            event.reportId ??
            event.targetId ??
            event.recordId ??
            event.entityId ??
            event.report?.id ??
            event.incident?.id ??
            event.details?.incidentId ??
            event.details?.reportId ??
            event.metadata?.incidentId ??
            event.metadata?.reportId
        );
    }

    if (!report) {
        return (
            <section className="timeline-card">
                <div className="section-heading">
                    <div>
                        <h2>Report Timeline</h2>
                        <p>Track the history of this incident</p>
                    </div>
                </div>
                <p>Incident information is unavailable.</p>
            </section>
        );
    }

    const relatedEvents = auditLogs.filter((event) => {
        const eventId = getEventId(event);

        return (
            eventId != null &&
            String(eventId) === String(report.id)
        );
    });

    const events = relatedEvents.map((event, index) => {
        const action = getEventAction(event);

        return {
            key: `audit-${event.id ?? `${getEventDate(event)}-${index}`}`,
            time: getEventDate(event),
            title: action,
            description: getEventDescription(event),
            source:
                event.reviewer ||
                event.actor ||
                event.user ||
                "Audit log",
            icon: /reject/i.test(action)
                ? AlertCircle
                : /submit/i.test(action)
                  ? FileText
                  : /resolve|verify|confirm/i.test(action)
                    ? CheckCircle2
                    : Activity,
        };
    });

    const hasSubmissionEvent = relatedEvents.some((event) =>
        /report submitted|new report submitted/i.test(
            getEventAction(event)
        )
    );

    if (report.createdAt && !hasSubmissionEvent) {
        events.push({
            key: "report-created",
            time: report.createdAt,
            title: "Report submitted",
            description: "The incident report was received by TrustRoute.",
            source: report.source || "Report record",
            icon: FileText,
        });
    }

    if (report.observedAt) {
        events.push({
            key: "report-observed",
            time: report.observedAt,
            title: "Incident observed",
            description:
                `Category: ${report.category || "Not specified"}. ` +
                `Location: ${report.location || "Not provided"}.`,
            source: "Submitted observation",
            icon: MapPin,
        });
    }

    // Keep the latest occurrence of each review action.
    // Preserve submission and observation as separate events.
    const latestByAction = new Map();

    events.forEach((event) => {
        const action = event.title.trim().toLowerCase();

        const isReportDetail =
            action === "report submitted" ||
            action === "new report submitted" ||
            action === "incident observed";

        const identity = isReportDetail
            ? event.key
            : action;

        const existing = latestByAction.get(identity);

        const time = new Date(event.time || "").getTime();
        const existingTime = existing
            ? new Date(existing.time || "").getTime()
            : NaN;

        if (!existing) {
            latestByAction.set(identity, event);
        } else if (
            Number.isFinite(time) &&
            (
                !Number.isFinite(existingTime) ||
                time > existingTime
            )
        ) {
            latestByAction.set(identity, event);
        }
    });

    const timelineEvents = [...latestByAction.values()].sort((a, b) => {
        const timeA = new Date(a.time || "").getTime();
        const timeB = new Date(b.time || "").getTime();

        if (!Number.isFinite(timeA)) return 1;
        if (!Number.isFinite(timeB)) return -1;

        return timeB - timeA;
    });

    return (
        <section className="timeline-card">
            <div className="section-heading">
                <div>
                    <h2>Report Timeline</h2>
                    <p>Track the history of this incident</p>
                </div>

                <span className="timeline-count">
                    {timelineEvents.length} events
                </span>
            </div>

            {loading && (
                <p className="timeline-message">
                    Loading incident history...
                </p>
            )}

            {auditError && (
                <p className="timeline-message" role="status">
                    <AlertCircle size={16} />
                    {auditError}
                </p>
            )}

            {!loading &&
                !auditError &&
                relatedEvents.length === 0 && (
                    <p className="timeline-message">
                        No matching audit actions were found. Available
                        report timestamps are shown below.
                    </p>
                )}

            {!loading && timelineEvents.length === 0 && (
                <p className="timeline-message">
                    No timeline events are available yet.
                </p>
            )}

            <div className="timeline-list">
                {timelineEvents.map((event, index) => {
                    const Icon = event.icon || Activity;

                    return (
                        <article
                            className="timeline-item"
                            key={event.key}
                        >
                            <div className="timeline-marker">
                                <div className="timeline-icon">
                                    <Icon size={18} />
                                </div>

                                {index < timelineEvents.length - 1 && (
                                    <span className="timeline-connector" />
                                )}
                            </div>

                            <div className="timeline-content">
                                <div className="timeline-title-row">
                                    <h3>{event.title}</h3>

                                    <span className="timeline-date">
                                        <Clock size={13} />
                                        {formatDate(event.time)}
                                    </span>
                                </div>

                                {event.description && (
                                    <p>{event.description}</p>
                                )}

                                <small>
                                    Recorded by: {event.source}
                                </small>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}