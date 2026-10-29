"use client";

import { Activity, CheckCircle, AlertTriangle } from "lucide-react";
import "./ScoreBreakdown.css";

export default function ScoreBreakdown({ report }) {
    if (!report) {
        return (
            <section className="score-card">
                <h2>Priority Breakdown</h2>
                <p>Incident information is unavailable.</p>
            </section>
        );
    }

    const category = String(report.category || "").toLowerCase();
    const description = String(report.description || "").trim();
    const location = String(report.location || "").trim();

    const factors = [
        {
            label: "Incident category",
            points:
                category.includes("flood") ||
                category.includes("fire")
                    ? 40
                    : category
                      ? 20
                      : 0,
            available: Boolean(category),
        },
        {
            label: "Location provided",
            points: location ? 15 : 0,
            available: Boolean(location),
        },
        {
            label: "Description provided",
            points: description ? 15 : 0,
            available: Boolean(description),
        },
        {
            label: "Observation time provided",
            points: report.observedAt ? 10 : 0,
            available: Boolean(report.observedAt),
        },
        {
            label: "Verified status",
            points:
                String(report.status || "").toLowerCase() === "verified"
                    ? 20
                    : 0,
            available:
                String(report.status || "").toLowerCase() === "verified",
        },
    ];

    const calculatedScore = Math.min(
        100,
        factors.reduce((total, factor) => total + factor.points, 0)
    );

    const hasStoredScore =
        report.priorityScore !== undefined &&
        report.priorityScore !== null &&
        report.priorityScore !== "" &&
        Number.isFinite(Number(report.priorityScore));

    const score = hasStoredScore
        ? Math.min(100, Math.max(0, Number(report.priorityScore)))
        : calculatedScore;

    const priorityLabel =
        score >= 70
            ? "High priority"
            : score >= 40
              ? "Medium priority"
              : "Low priority";

    return (
        <section className="score-card">
            <div className="score-heading">
                <div>
                    <h2>Priority Breakdown</h2>
                    <p>Rule-based demonstration score</p>
                </div>

                <Activity size={21} />
            </div>

            <div className="score-total">
                <strong>{score}</strong>
                <span>/ 100</span>
            </div>

            <div className="score-progress">
                <div
                    className="score-progress-fill"
                    style={{ width: `${score}%` }}
                />
            </div>

            <div className="score-priority-label">
                {score >= 70 ? (
                    <AlertTriangle size={16} />
                ) : (
                    <CheckCircle size={16} />
                )}
                <span>{priorityLabel}</span>
            </div>

            <div className="score-factor-list">
                {factors.map((factor) => (
                    <div className="score-factor" key={factor.label}>
                        <div>
                            <span>{factor.label}</span>
                            <small>
                                {factor.available
                                    ? "Information available"
                                    : "Information missing"}
                            </small>
                        </div>

                        <strong>+{factor.points}</strong>
                    </div>
                ))}
            </div>

        
        </section>
    );
}