"use client";

import { useState } from "react";
import ReportForm from "../../components/ReportForm";
import GoogleMapPicker from "../../components/GoogleMapPicker";
import "./submit.css";

export default function SubmitPage() {
    const [selectedLocation, setSelectedLocation] = useState(null);

    return (
        <main className="submit-page">
            <div className="submit-header">
                <a href="/" className="submit-back-link">
                    ← Back to Dashboard
                </a>

                <span className="submit-eyebrow">INCIDENT MANAGEMENT</span>

                <h1>Submit a Report</h1>

                <p>
                    Share incident information to help reviewers understand and assess
                    the situation.
                </p>
            </div>

            <section className="submit-form-section">
                <div className="submit-section-heading">
                    <h2>Incident Information</h2>
                    <p>Fields marked with * are required.</p>
                </div>

                <ReportForm selectedLocation={selectedLocation} />

                <GoogleMapPicker
                    onLocationSelect={setSelectedLocation}
                />

                {selectedLocation && (
                    <div className="selected-location-summary">
                        <strong>Incident location selected</strong>
                        <p>
                            Latitude: {selectedLocation.lat.toFixed(5)}
                        </p>
                        <p>
                            Longitude: {selectedLocation.lng.toFixed(5)}
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}