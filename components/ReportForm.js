"use client";

import { useState } from "react";
import { Send, MapPin, FileText } from "lucide-react";
import "./ReportForm.css";

export default function ReportForm({ selectedLocation }) {
    const [submitted, setSubmitted] = useState(false);
    const [location, setLocation] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resetKey, setResetKey] = useState(0);

    const mapCoordinates = selectedLocation
        ? `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`
        : "";

    const displayedLocation = location || mapCoordinates;

    async function handleSubmit(event) {
        event.preventDefault();

        setLoading(true);
        setError("");

        const form = event.currentTarget;
        const formData = new FormData(form);

        const report = {
            title: String(formData.get("title") || "").trim(),
            category: formData.get("category"),
            description: String(formData.get("description") || "").trim(),
            location: displayedLocation.trim(),
            source: formData.get("source"),
            observedAt: formData.get("observedAt"),
            evidence: String(formData.get("evidence") || "").trim(),
        };

        if (
            !report.title ||
            !report.category ||
            !report.description ||
            !report.location ||
            !report.source ||
            !report.observedAt
        ) {
            setError("Please complete all required fields.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/reports", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(report),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.message || "Unable to save the report. Please try again."
                );
            }

            setSubmitted(true);
        } catch (err) {
            setError(
                err.message || "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    function handleLocationChange(event) {
        setLocation(event.target.value);
    }

    function handleAnotherReport() {
        setSubmitted(false);
        setLocation("");
        setError("");
        setResetKey((previous) => previous + 1);
    }

    if (submitted) {
        return (
            <section className="report-success" role="status">
                <div className="report-success-icon">
                    <FileText size={30} />
                </div>

                <h2>Report submitted successfully!</h2>

                <p>
                    Your report has been saved and is awaiting verification.
                </p>

                <button
                    type="button"
                    onClick={handleAnotherReport}
                >
                    Submit another report
                </button>
            </section>
        );
    }

    return (
        <form
            key={resetKey}
            className="report-form"
            onSubmit={handleSubmit}
        >
            <div className="report-form-grid">
                <label>
                    Report title *
                    <input
                        type="text"
                        name="title"
                        placeholder="e.g. Severe waterlogging"
                        required
                    />
                </label>

                <label>
                    Incident category *
                    <select
                        name="category"
                        required
                        defaultValue=""
                    >
                        <option value="" disabled>
                            Select category
                        </option>
                        <option>Flooding</option>
                        <option>Fire</option>
                        <option>Landslide</option>
                        <option>Storm</option>
                        <option>Other</option>
                    </select>
                </label>

                <label className="report-full-width">
                    Description *
                    <textarea
                        name="description"
                        placeholder="Describe what happened and what you observed..."
                        rows="5"
                        required
                    />
                </label>

                <label className="report-full-width">
                    <span className="report-label-icon">
                        <MapPin size={15} />
                        Reported location *
                    </span>

                    <input
                        type="text"
                        name="location"
                        placeholder="Enter an address or select a point on the map below"
                        value={displayedLocation}
                        onChange={handleLocationChange}
                        required
                    />

                    {selectedLocation && !location && (
                        <small>Location selected from the map.</small>
                    )}
                </label>

                <label>
                    Information source *
                    <select
                        name="source"
                        required
                        defaultValue=""
                    >
                        <option value="" disabled>
                            Select source
                        </option>
                        <option>Citizen report</option>
                        <option>Field worker</option>
                        <option>Official advisory</option>
                        <option>News report</option>
                        <option>Other</option>
                    </select>
                </label>

                <label>
                    Date and time observed *
                    <input
                        type="datetime-local"
                        name="observedAt"
                        required
                    />
                </label>

                <label className="report-full-width">
                    Supporting evidence (optional)
                    <input
                        type="text"
                        name="evidence"
                        placeholder="Add an evidence link or reference"
                    />
                </label>
            </div>

            {error && (
                <p
                    role="alert"
                    style={{ color: "#c0392b", marginTop: "12px" }}
                >
                    {error}
                </p>
            )}

            <div className="report-form-note">
                <FileText size={17} />
                Provide accurate information. Submitting this form does not mean
                the incident has been independently verified.
            </div>

            <button
                className="report-submit-button"
                type="submit"
                disabled={loading}
            >
                <Send size={17} />
                {loading ? "Saving report..." : "Submit Report"}
            </button>
        </form>
    );
}