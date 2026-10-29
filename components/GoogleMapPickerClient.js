"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    useMap,
    useMapEvents,
} from "react-leaflet";

function MapResizeHandler() {
    const map = useMap();

    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 300);

        return () => clearTimeout(timer);
    }, [map]);

    return null;
}

function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click(event) {
            onLocationSelect({
                lat: event.latlng.lat,
                lng: event.latlng.lng,
            });
        },
    });

    return null;
}

function MapSearchController({ searchLocation }) {
    const map = useMap();

    useEffect(() => {
        if (searchLocation) {
            map.flyTo(
                [searchLocation.lat, searchLocation.lng],
                15,
                { duration: 1.5 }
            );
        }
    }, [searchLocation, map]);

    return null;
}

export default function GoogleMapPickerClient({
    selectedLocation,
    onLocationSelect,
}) {
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLocation, setSearchLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSearch(event) {
        event.preventDefault();

        const query = searchText.trim();

        if (!query) {
            setError("Please enter a place or address.");
            setSearchResults([]);
            return;
        }

        setLoading(true);
        setError("");
        setSearchResults([]);

        try {
            const url = new URL(
                "https://nominatim.openstreetmap.org/search"
            );

            url.searchParams.set("format", "jsonv2");
            url.searchParams.set("limit", "5");
            url.searchParams.set("q", query);

            const response = await fetch(url.toString(), {
                headers: {
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Location service unavailable.");
            }

            const results = await response.json();

            if (!Array.isArray(results) || results.length === 0) {
                setError(
                    "No locations found. Try a city, area, landmark, or full address."
                );
                return;
            }

            setSearchResults(results);
        } catch (err) {
            console.error("Location search error:", err);

            setError(
                "Location search is unavailable right now. You can still click directly on the map to select a location."
            );
        } finally {
            setLoading(false);
        }
    }

    function handleResultSelect(result) {
        const location = {
            lat: Number(result.lat),
            lng: Number(result.lon),
        };

        if (
            !Number.isFinite(location.lat) ||
            !Number.isFinite(location.lng)
        ) {
            setError("This location has invalid coordinates. Try another.");
            return;
        }

        setSearchLocation(location);
        onLocationSelect(location);
        setSearchText(result.display_name);
        setSearchResults([]);
        setError("");
    }

    return (
        <div className="map-picker-content">
            <form className="map-search-form" onSubmit={handleSearch}>
                <input
                    type="search"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search city, area, landmark, or address..."
                    aria-label="Search for a location"
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Searching..." : "Search"}
                </button>
            </form>

            {error && (
                <p
                    className="map-search-message map-search-error"
                    role="status"
                >
                    {error}
                </p>
            )}

            {searchResults.length > 0 && (
                <div className="map-search-results">
                    {searchResults.map((result) => (
                        <button
                            type="button"
                            key={result.place_id}
                            className="map-search-result"
                            onClick={() => handleResultSelect(result)}
                        >
                            <strong>
                                {result.name ||
                                    result.display_name.split(",")[0]}
                            </strong>

                            <span>{result.display_name}</span>
                        </button>
                    ))}
                </div>
            )}

            <MapContainer
                center={[28.6139, 77.209]}
                zoom={11}
                scrollWheelZoom={true}
                style={{
                    width: "100%",
                    height: "350px",
                }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapResizeHandler />

                <MapClickHandler
                    onLocationSelect={(location) => {
                        onLocationSelect(location);
                        setSearchLocation(location);
                    }}
                />

                <MapSearchController
                    searchLocation={searchLocation}
                />

                {selectedLocation && (
                    <Marker
                        position={[
                            selectedLocation.lat,
                            selectedLocation.lng,
                        ]}
                    />
                )}
            </MapContainer>
        </div>
    );
}
