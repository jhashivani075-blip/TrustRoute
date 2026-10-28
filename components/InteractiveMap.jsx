'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Interactive OpenStreetMap component using Leaflet directly
 * Handles both Dashboard overview pins and Form click-to-pin coordinate picker
 */
export default function InteractiveMap({
  incidents = [],
  selectedIncident = null,
  interactivePin = false,
  initialCenter = [26.1445, 91.7362], // Guwahati default
  initialZoom = 12,
  onLocationSelect = null,
  height = '100%',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const pickedMarkerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = (await import('leaflet')).default;

      // Ensure leaflet icons load correctly
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          attributionControl: false,
        });

        // High-contrast clean OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        L.control.attribution({ position: 'bottomright', prefix: 'OSM' }).addTo(map);

        const markersGroup = L.layerGroup().addTo(map);
        markersGroupRef.current = markersGroup;
        mapInstanceRef.current = map;

        // Click-to-pin mode for the submit form
        if (interactivePin && onLocationSelect) {
          map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            onLocationSelect(lat, lng);

            if (pickedMarkerRef.current) {
              pickedMarkerRef.current.setLatLng([lat, lng]);
            } else {
              const pinIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: `<div style="
                  background: #ef4444;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 3px solid #ffffff;
                  box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
                "></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });
              pickedMarkerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
            }
          });
        }
      }

      // Update cluster markers on map
      if (mapInstanceRef.current && markersGroupRef.current && incidents.length > 0) {
        markersGroupRef.current.clearLayers();

        incidents.forEach((inc) => {
          if (!inc.centroid_lat || !inc.centroid_lon) return;

          const isHigh = inc.priority_level === 'HIGH';
          const isMedium = inc.priority_level === 'MEDIUM';
          const color = isHigh ? '#ef4444' : isMedium ? '#f59e0b' : '#06b6d4';
          const hasFlags = (inc.flags || []).some((f) => f.state === 'ACTIVE');

          const customIcon = L.divIcon({
            className: 'cluster-marker-icon',
            html: `
              <div style="
                background: ${color};
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: ${hasFlags ? '2px dashed #ffffff' : '2px solid #ffffff'};
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-size: 11px;
                font-weight: 800;
                box-shadow: 0 0 12px ${color};
              ">
                ${inc.report_count || 1}
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          const marker = L.marker([inc.centroid_lat, inc.centroid_lon], { icon: customIcon });

          const popupContent = `
            <div style="font-family: inherit; font-size: 13px; color: #1e293b; min-width: 180px;">
              <strong style="color: #0f172a; display: block; font-size: 14px; margin-bottom: 4px;">
                ${inc.title}
              </strong>
              <div style="margin-bottom: 4px;">
                <span style="font-weight: 700; color: ${color};">${inc.priority_level} PRIORITY</span>
                (${inc.priority_score}/100)
              </div>
              <div style="color: #64748b; font-size: 12px; margin-bottom: 8px;">
                📍 ${inc.location_name}
              </div>
              <a href="/incidents/${inc.id}" style="
                display: inline-block;
                background: #3b82f6;
                color: #ffffff;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                text-decoration: none;
              ">
                Review Evidence →
              </a>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.addTo(markersGroupRef.current);
        });

        // Fit map bounds if multiple incidents
        if (incidents.length > 1 && !interactivePin) {
          const latLngs = incidents
            .filter((i) => i.centroid_lat && i.centroid_lon)
            .map((i) => [i.centroid_lat, i.centroid_lon]);
          if (latLngs.length > 0) {
            mapInstanceRef.current.fitBounds(latLngs, { padding: [40, 40], maxZoom: 14 });
          }
        }
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [incidents, interactivePin]);

  return (
    <div
      ref={mapContainerRef}
      className="map-container"
      style={{ height: height, minHeight: '260px' }}
    />
  );
}
