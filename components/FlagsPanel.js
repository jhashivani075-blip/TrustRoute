"use client";

import {
    AlertTriangle,
    Clock3,
    MapPin,
    ShieldCheck,
    ShieldAlert,
    CheckCircle2,
    Info,
    FileWarning,
} from "lucide-react";
import "./FlagsPanel.css";

export default function FlagsPanel({ report }) {
    if (!report) {
        return (
            <section className="flags-card">
                <div className="flags-heading">
                    <div>
                        <h2>Verification Flags</h2>
                        <p>Report quality and review checks</p>
                    </div>
                </div>
                <p>Incident information is unavailable.</p>
            </section>
        );
    }

    const flags = [];
    const now = Date.now();
    const observedTime = report.observedAt
        ? new Date(report.observedAt).getTime()
        : NaN;

    const hasValidObservationTime =
        Number.isFinite(observedTime);

    // Observation time checks
    if (!report.observedAt) {
        flags.push({
            icon: Clock3,
            title: "Observation time missing",
            description:
                "No observation date or time was provided. Add it to help reviewers assess when the incident occurred.",
            type: "Review needed",
            level: "warning",
        });
    } else if (!hasValidObservationTime) {
        flags.push({
            icon: FileWarning,
            title: "Invalid observation time",
            description:
                "The supplied date or time could not be read. Check the report details.",
            type: "Review needed",
            level: "warning",
        });
    } else if (observedTime > now) {
        flags.push({
            icon: Clock3,
            title: "Observation time is in the future",
            description:
                "The observation time is later than the current time. Confirm that the date and time are correct.",
            type: "Check date",
            level: "warning",
        });
    } else {
        const ageHours = (now - observedTime) / 3600000;

        if (ageHours > 24) {
            flags.push({
                icon: Clock3,
                title: "Report may be outdated",
                description:
                    "The observation was recorded more than 24 hours ago. Reviewers should check whether the information is still current.",
                type: "Older than 24 hours",
                level: "warning",
            });
        } else {
            flags.push({
                icon: CheckCircle2,
                title: "Observation time available",
                description:
                    "The observation time is within the last 24 hours. This indicates recency only, not that the incident has been confirmed.",
                type: "Within 24 hours",
                level: "success",
            });
        }
    }

    // Location check
    if (
        typeof report.location !== "string" ||
        !report.location.trim()
    ) {
        flags.push({
            icon: MapPin,
            title: "Location missing",
            description:
                "No location was supplied. A location is needed to assess where the incident was reported.",
            type: "Information missing",
            level: "warning",
        });
    } else {
        flags.push({
            icon: MapPin,
            title: "Location provided",
            description:
                `Reported location: ${report.location}. This location has not been independently checked by this panel.`,
            type: "Provided",
            level: "info",
        });
    }

    // Source check
    if (
        typeof report.source !== "string" ||
        !report.source.trim()
    ) {
        flags.push({
            icon: ShieldAlert,
            title: "Report source missing",
            description:
                "The report does not identify its source. Reviewers should establish where the information came from.",
            type: "Information missing",
            level: "warning",
        });
    } else {
        flags.push({
            icon: Info,
            title: "Source identified",
            description:
                `Submitted source: ${report.source}. This field identifies the stated source but does not establish its reliability.`,
            type: "Provided",
            level: "info",
        });
    }

    // Verification status check
    const status = report.status || "Pending";

    if (
        status === "Pending" ||
        status === "Request Verification" ||
        status === "Verification Requested"
    ) {
        flags.push({
            icon: ShieldAlert,
            title: "Verification required",
            description:
                "This report is awaiting review. Check the submitted details and supporting information before relying on it.",
            type: "Pending review",
            level: "warning",
        });
    } else if (status === "Verified") {
        flags.push({
            icon: ShieldCheck,
            title: "Marked as verified",
            description:
                "The report status is Verified. This panel does not independently confirm the incident or validate the evidence.",
            type: "Status: Verified",
            level: "success",
        });
    } else if (status === "Rejected") {
        flags.push({
            icon: AlertTriangle,
            title: "Report rejected",
            description:
                "This report is marked as Rejected. Review the recorded decision and its supporting notes if available.",
            type: "Status: Rejected",
            level: "danger",
        });
    } else if (status === "Resolved") {
        flags.push({
            icon: CheckCircle2,
            title: "Marked as resolved",
            description:
                "The report is marked as Resolved. This status alone does not independently establish the incident's outcome.",
            type: "Status: Resolved",
            level: "success",
        });
    } else {
        flags.push({
            icon: Info,
            title: "Review status",
            description:
                `Current report status: ${status}. Check the incident record for the review history.`,
            type: "Status information",
            level: "info",
        });
    }

    const warningCount = flags.filter(
        (flag) => flag.level === "warning" || flag.level === "danger"
    ).length;

    return (
        <section className="flags-card">
            <div className="flags-heading">
                <div>
                    <p className="flags-eyebrow">
                        TRUSTROUTE / REPORT REVIEW
                    </p>
                    <h2>Verification Flags</h2>
                    <p>
                        Automatic checks to help reviewers assess this report
                    </p>
                </div>

                <span className="flags-heading-icon">
                    <ShieldCheck size={23} />
                </span>
            </div>

            <div className="flags-summary">
                <div className="flags-summary-icon">
                    <AlertTriangle size={19} />
                </div>
                <div>
                    <strong>
                        {warningCount === 0
                            ? "No immediate review warnings"
                            : `${warningCount} item${warningCount === 1 ? "" : "s"} need${warningCount === 1 ? "s" : ""} attention`}
                    </strong>
                    <p>
                        {flags.length} checks based on the information provided
                    </p>
                </div>
            </div>

            <div className="flags-list">
                {flags.map((flag, index) => {
                    const Icon = flag.icon;

                    return (
                        <article
                            className={`flag-item flag-${flag.level}`}
                            key={`${flag.title}-${index}`}
                        >
                            <div className="flag-icon">
                                <Icon size={19} />
                            </div>

                            <div className="flag-details">
                                <div className="flag-title-row">
                                    <h3>{flag.title}</h3>
                                    <span className="flag-status">
                                        {flag.type}
                                    </span>
                                </div>
                                <p>{flag.description}</p>
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="flags-note">
                <Info size={18} />
                <p>
                    <strong>Important:</strong> These automated checks examine
                    report fields, timestamps, and status. They do not verify
                    the incident against independent sources or prove that the
                    information is true or false.
                </p>
            </div>
        </section>
    );
}