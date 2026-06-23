import { Vector3 } from "three";
import type { BoundingBox } from "../types/imagery.js";

export const IMAGERY_ZOOM_MIN_DEGREES = 0.09;
export const IMAGERY_ZOOM_MAX_DEGREES = 12;
export const DEFAULT_IMAGERY_ZOOM_DEGREES = 2;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeLongitude(lon: number) {
  return ((lon + 540) % 360) - 180;
}

export function pointToLatLon(point: Vector3, radius = 1) {
  const normalized = point.clone().normalize();
  const lat = 90 - (Math.acos(clamp(normalized.y / radius, -1, 1)) * 180) / Math.PI;
  const lon = ((Math.atan2(normalized.z, -normalized.x) * 180) / Math.PI + 540) % 360 - 180;

  return { lat, lon };
}

export function latLonToVector(lat: number, lon: number, radius = 1) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const cosLat = Math.cos(latRad);

  return new Vector3(
    -radius * cosLat * Math.cos(lonRad),
    radius * Math.sin(latRad),
    radius * cosLat * Math.sin(lonRad),
  );
}

export function bboxFromPoint(lat: number, lon: number, size: number): BoundingBox {
  const half = size / 2;

  return {
    minLat: clamp(lat - half, -85, 85),
    maxLat: clamp(lat + half, 85, 85),
    minLon: clamp(lon - half, -180, 180),
    maxLon: clamp(lon + half, 180, 180),
  };
}

export function zoomPercentToDegrees(value: number) {
  const clamped = clamp(value, 0, 100);
  const min = Math.log(IMAGERY_ZOOM_MIN_DEGREES);
  const max = Math.log(IMAGERY_ZOOM_MAX_DEGREES);
  const next = max - (clamped / 100) * (max - min);

  return Number(Math.exp(next).toFixed(4));
}

export function degreesToZoomPercent(degrees: number) {
  const clamped = clamp(degrees, IMAGERY_ZOOM_MIN_DEGREES, IMAGERY_ZOOM_MAX_DEGREES);
  const min = Math.log(IMAGERY_ZOOM_MIN_DEGREES);
  const max = Math.log(IMAGERY_ZOOM_MAX_DEGREES);

  return Math.round(((max - Math.log(clamped)) / (max - min)) * 100);
}

export function formatApproxDistance(sizeDegrees: number) {
  const kilometers = sizeDegrees * 111;

  if (kilometers >= 100) {
    return `${Math.round(kilometers).toLocaleString()} km`;
  }

  if (kilometers >= 10) {
    return `${kilometers.toFixed(1)} km`;
  }

  return `${kilometers.toFixed(2)} km`;
}

export function bboxWidthKm(bbox: BoundingBox) {
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const lonKm = Math.cos((centerLat * Math.PI) / 180) * 111;

  return Math.max(0, (bbox.maxLon - bbox.minLon) * lonKm);
}

export function bboxHeightKm(bbox: BoundingBox) {
  return Math.max(0, (bbox.maxLat - bbox.minLat) * 111);
}

export function formatCoordinates(lat: number, lon: number) {
  const latSuffix = lat >= 0 ? "N" : "S";
  const lonSuffix = lon >= 0 ? "E" : "W";

  return `${Math.abs(lat).toFixed(2)}°${latSuffix}, ${Math.abs(lon).toFixed(2)}°${lonSuffix}`;
}
