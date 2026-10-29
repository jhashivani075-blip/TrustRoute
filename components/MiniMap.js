"use client";

import { MapPin, Navigation, ExternalLink } from "lucide-react";
import "./MiniMap.css";

function getCoordinates(location) {
  if (!location) return null;

  let lat;
  let lng;

  if (typeof location === "string") {
    const parts = location.split(",").map((part) => part.trim());

    if (parts.length !== 2) return null;

    lat = Number(parts[0]);
    lng = Number(parts[1]);
  } else if (typeof location === "object") {
    lat = Number(location.lat ?? location.latitude);
    lng = Number(location.lng ?? location.longitude);
  } else {
    return null;
  }

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}

export default function MiniMap({ location, title }) {
  const coordinates = getCoordinates(location);

  return (
    <section className="mini-map-card">
      <div className="mini-map-heading">
        <div>
          <h2>Incident Location</h2>
          <p>{location || "Location not provided"}</p>
        </div>
        <Navigation size={19} />
      </div>

      {coordinates ? (
        <>
          <iframe
            title={`Map showing ${title || "incident location"}`}
            width="100%"
            height="350"
            style={{ border: 0, borderRadius: "14px" }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.lng - 0.01
              }%2C${coordinates.lat - 0.01}%2C${coordinates.lng + 0.01
              }%2C${coordinates.lat + 0.01}&layer=mapnik&marker=${coordinates.lat}%2C${coordinates.lng}`}
          />

          <div className="map-footer">
            <MapPin size={16} />
            <span>
              {coordinates.lat}, {coordinates.lng}
            </span>

            <a
              href={`https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lng}#map=16/${coordinates.lat}/${coordinates.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Open map <ExternalLink size={14} />
            </a>
          </div>
        </>
      ) : (
        <div className="mini-map-visual">
          <MapPin size={30} />
          <p>Exact coordinates are unavailable for this report.</p>
          <small>Received location: {String(location ?? "None")}</small>
        </div>
      )}
    </section>
  );
}