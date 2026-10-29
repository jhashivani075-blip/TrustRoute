"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import "./GoogleMapPicker.css";

const GoogleMapPickerClient = dynamic(
    () => import("./GoogleMapPickerClient"),
    {
        ssr: false,
        loading: () => <p>Loading map...</p>,
    }
);

export default function GoogleMapPicker({ onLocationSelect }) {
    const [selectedLocation, setSelectedLocation] = useState(null);

    function handleLocationSelect(location) {
        setSelectedLocation(location);

        if (onLocationSelect) {
            onLocationSelect(location);
        }
    }

    return (
        <section className="google-map-picker">
            <h3>Select Incident Location</h3>

            <p>Click anywhere on the map to select the incident location.</p>

            <div className="google-map-area">
                <GoogleMapPickerClient
                    selectedLocation={selectedLocation}
                    onLocationSelect={handleLocationSelect}
                />
            </div>

            {selectedLocation && (
                <div className="selected-location">
                    <strong>Selected Coordinates</strong>
                    <p>Latitude: {selectedLocation.lat.toFixed(5)}</p>
                    <p>Longitude: {selectedLocation.lng.toFixed(5)}</p>
                </div>
            )}
        </section>
    );
}