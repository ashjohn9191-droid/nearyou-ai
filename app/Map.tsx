"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

type PlacePin = { title: string; lat: number; lng: number; emoji: string };
type MapProps = { places?: PlacePin[]; center?: { lat: number; lng: number }; zoom?: number };

function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
  return null;
}

export default function Map({ places = [], center, zoom = 15 }: MapProps) {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  });

  const blueIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  });

  const mapCenter: [number, number] = center
    ? [center.lat, center.lng]
    : places.length > 0 ? [places[0].lat, places[0].lng] : [17.385, 78.4867];

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "450px" }}>
      <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom dragging touchZoom doubleClickZoom
        style={{ width: "100%", height: "100%", minHeight: "450px" }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {center && <RecenterMap center={[center.lat, center.lng]} zoom={zoom} />}
        {center && (
          <Marker position={[center.lat, center.lng]} icon={redIcon}>
            <Popup><strong>📍 You are here</strong></Popup>
          </Marker>
        )}
        {places.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={blueIcon}>
            <Popup><strong>{p.emoji} {p.title}</strong></Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}