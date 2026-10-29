"use client";

import {
    ArrowRightLeft,
    FileText,
    MapPin,
    Clock,
    ShieldCheck,
    AlertCircle,
} from "lucide-react";
import "./AdvisoryComparison.css";

export default function AdvisoryComparison({ report }) {
    const formatDate = (value) => {
        if (!value) return "Not provided";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "Not provided";

        return date.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    if (!report) {
        return (
            <section className="advisory-card">
                <div className="advisory-heading">
                    <div>
                        <h2>Advisory Comparison</h2>
                        <p>Review incident details and confirmation status</p>
                    </div>
                    <ArrowRightLeft size={20} />
                </div>
                <p>Incident information is unavailable.</p>
            </section>
        );
    }

    const hasLocation = Boolean(report.location);
    const hasDescription = Boolean(report.description);
    const hasObservationTime = Boolean(report.observedAt);

    return (
        <section className="advisory-card">
            <div className="advisory-heading">
                <div>
                    <h2>Advisory Comparison</h2>
                    <p>Review the submitted information before confirmation</p>
                </div>
                <ArrowRightLeft size={20} />
            </div>

            <div className="advisory-grid">
                <article className="advisory-item">
                    <div className="advisory-source">
                        <div className="advisory-source-icon advisory-blue">
                            <FileText size={19} />
                        </div>

                        <div>
                            <h3>Submitted Report</h3>
                            <span>
                                {formatDate(report.createdAt)} ·{" "}
                                {report.source || "Source not provided"}
                            </span>
                        </div>
                    </div>

                    <span className="advisory-level advisory-blue">
                        {report.status || "Pending"}
                    </span>

                    <p className="advisory-message">
                        {report.description ||
                            "No incident description was provided."}
                    </p>

                    <div className="advisory-detail-list">
                        <div>
                            <span>Description</span>
                            <strong>
                                {hasDescription ? "Provided" : "Missing"}
                            </strong>
                        </div>

                        <div>
                            <span>Reported source</span>
                            <strong>
                                {report.source || "Not provided"}
                            </strong>
                        </div>
                    </div>
                </article>

                <article className="advisory-item">
                    <div className="advisory-source">
                        <div className="advisory-source-icon advisory-orange">
                            <MapPin size={19} />
                        </div>

                        <div>
                            <h3>Location & Observation</h3>
                            <span>
                                <Clock size={13} />{" "}
                                {formatDate(report.observedAt)}
                            </span>
                        </div>
                    </div>

                    <span className="advisory-level advisory-orange">
                        <AlertCircle size={14} />
                        Independent check pending
                    </span>

                    <p className="advisory-message">
                        {hasLocation
                            ? `Reported location: ${report.location}.`
                            : "No location was provided."}
                        {" "}
                        {hasObservationTime
                            ? "An observation time has been supplied."
                            : "The observation time is missing."}
                    </p>

                    <div className="advisory-detail-list">
                        <div>
                            <span>Location</span>
                            <strong>
                                {hasLocation ? "Provided" : "Missing"}
                            </strong>
                        </div>

                        <div>
                            <span>Observation time</span>
                            <strong>
                                {hasObservationTime ? "Provided" : "Missing"}
                            </strong>
                        </div>
                    </div>
                </article>
            </div>

            <div className="advisory-observation">
                <div className="advisory-observation-icon">
                    <ShieldCheck size={20} />
                </div>

                <div>
                    <strong>Review recommendation</strong>
                    <p>
                        Check the submitted description, location, and
                        observation time against a reliable independent
                        source before confirming the incident. This panel
                        displays report data only; it does not fetch or verify
                        external advisories.
                    </p>
                </div>
            </div>
        </section>
    );
}