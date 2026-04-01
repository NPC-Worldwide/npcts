import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Polygon, CircleMarker,
    GeoJSON, useMap, useMapEvents, ZoomControl, Popup } from 'react-leaflet';

// ---- Leaflet bootstrap ----

const LEAFLET_CSS_ID = 'npcts-gis-leaflet-css';
function ensureLeafletCSS() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(LEAFLET_CSS_ID)) return;
    const link = document.createElement('link');
    link.id = LEAFLET_CSS_ID;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
}

function fixMarkerIcons() {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
}

// ---- Types ----

export type DrawMode = 'select' | 'marker' | 'line' | 'polygon' | 'circle' | 'measure';

export interface GeoFeature {
    id: string;
    type: 'marker' | 'line' | 'polygon' | 'circle';
    name: string;
    coordinates: [number, number][] | [number, number];
    radius?: number;
    properties: Record<string, any>;
    color: string;
    visible: boolean;
    layerId: string;
}

export interface MapLayer {
    id: string;
    name: string;
    visible: boolean;
    color: string;
    features: string[];
    locked: boolean;
}

export interface GISProject {
    version: 2;
    name: string;
    center: [number, number];
    zoom: number;
    basemap: string;
    layers: MapLayer[];
    features: GeoFeature[];
}

export const BASEMAPS: Record<string, { name: string; url: string; attribution: string }> = {
    osm: { name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
    satellite: { name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri' },
    topo: { name: 'Topographic', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenTopoMap' },
    dark: { name: 'Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; CARTO' },
    light: { name: 'Light', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attribution: '&copy; CARTO' },
};

export const LAYER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// ---- Built-in reference overlay layers (free GeoJSON sources) ----

export const REFERENCE_LAYERS: Record<string, { name: string; url: string; style: any; category: string }> = {
    countries: {
        name: 'Country Borders',
        url: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
        style: { color: 'rgba(59,130,246,0.5)', weight: 1, fillColor: 'rgba(59,130,246,0.05)', fillOpacity: 1 },
        category: 'political',
    },
    us_states: {
        name: 'US States',
        url: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
        style: { color: 'rgba(139,92,246,0.5)', weight: 1, fillColor: 'rgba(139,92,246,0.05)', fillOpacity: 1 },
        category: 'political',
    },
    populated_places: {
        name: 'Major Cities',
        url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson',
        style: { color: '#f59e0b', weight: 0, fillColor: '#f59e0b', fillOpacity: 0.8 },
        category: 'infrastructure',
    },
    airports: {
        name: 'Airports',
        url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_airports.geojson',
        style: { color: '#06b6d4', weight: 0, fillColor: '#06b6d4', fillOpacity: 0.8 },
        category: 'infrastructure',
    },
    ports: {
        name: 'Ports',
        url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_ports.geojson',
        style: { color: '#10b981', weight: 0, fillColor: '#10b981', fillOpacity: 0.8 },
        category: 'infrastructure',
    },
    rivers: {
        name: 'Rivers (major)',
        url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson',
        style: { color: 'rgba(56,189,248,0.6)', weight: 1.5, fillOpacity: 0 },
        category: 'physical',
    },
    lakes: {
        name: 'Lakes',
        url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson',
        style: { color: 'rgba(56,189,248,0.4)', weight: 1, fillColor: 'rgba(56,189,248,0.15)', fillOpacity: 1 },
        category: 'physical',
    },
    railroads: {
        name: 'Railroads',
        url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_railroads.geojson',
        style: { color: 'rgba(244,63,94,0.5)', weight: 1, dashArray: '4 3' },
        category: 'infrastructure',
    },
    roads: {
        name: 'Roads (major)',
        url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_roads.geojson',
        style: { color: 'rgba(253,186,116,0.6)', weight: 1.5 },
        category: 'infrastructure',
    },
    timezones: {
        name: 'Timezones',
        url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_time_zones.geojson',
        style: { color: 'rgba(168,85,247,0.3)', weight: 0.5, fillColor: 'rgba(168,85,247,0.05)', fillOpacity: 1 },
        category: 'reference',
    },
    urban_areas: {
        name: 'Urban Areas',
        url: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_urban_areas.geojson',
        style: { color: 'rgba(251,191,36,0.4)', weight: 0.5, fillColor: 'rgba(251,191,36,0.15)', fillOpacity: 1 },
        category: 'infrastructure',
    },
};

export const DEFAULT_PROJECT: GISProject = {
    version: 2,
    name: 'Untitled Map',
    center: [39.8283, -98.5795],
    zoom: 4,
    basemap: 'osm',
    layers: [{ id: 'default', name: 'Default Layer', visible: true, color: '#3b82f6', features: [], locked: false }],
    features: [],
};

// ---- GeoJSON conversion helpers ----

export function featuresToGeoJSON(features: GeoFeature[]): any {
    return {
        type: 'FeatureCollection',
        features: features.map(f => {
            let geometry: any;
            if (f.type === 'marker') {
                const c = f.coordinates as [number, number];
                geometry = { type: 'Point', coordinates: [c[1], c[0]] };
            } else if (f.type === 'line') {
                geometry = { type: 'LineString', coordinates: (f.coordinates as [number, number][]).map(c => [c[1], c[0]]) };
            } else if (f.type === 'polygon') {
                const ring = (f.coordinates as [number, number][]).map(c => [c[1], c[0]]);
                if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) ring.push(ring[0]);
                geometry = { type: 'Polygon', coordinates: [ring] };
            } else if (f.type === 'circle') {
                const c = f.coordinates as [number, number];
                geometry = { type: 'Point', coordinates: [c[1], c[0]] };
            }
            return { type: 'Feature', id: f.id, geometry, properties: { ...f.properties, name: f.name, _color: f.color, _type: f.type, _radius: f.radius } };
        }),
    };
}

export function geoJSONToFeatures(geojson: any, layerId: string, baseColor: string): GeoFeature[] {
    const fc = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
    return fc.map((feat: any, i: number) => {
        const id = `import_${Date.now()}_${i}`;
        const props = feat.properties || {};
        const name = props.name || props.NAME || props.title || `Feature ${i + 1}`;
        const color = props._color || baseColor;
        const geom = feat.geometry;
        if (!geom) return null;

        if (geom.type === 'Point') {
            return { id, type: 'marker' as const, name, color, visible: true, layerId, coordinates: [geom.coordinates[1], geom.coordinates[0]] as [number, number], radius: props._radius, properties: props };
        } else if (geom.type === 'LineString') {
            return { id, type: 'line' as const, name, color, visible: true, layerId, coordinates: geom.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]), properties: props };
        } else if (geom.type === 'Polygon') {
            return { id, type: 'polygon' as const, name, color, visible: true, layerId, coordinates: geom.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]), properties: props };
        } else if (geom.type === 'MultiPolygon') {
            return { id, type: 'polygon' as const, name, color, visible: true, layerId, coordinates: geom.coordinates[0][0].map((c: number[]) => [c[1], c[0]] as [number, number]), properties: props };
        } else if (geom.type === 'MultiLineString') {
            return { id, type: 'line' as const, name, color, visible: true, layerId, coordinates: geom.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]), properties: props };
        }
        return null;
    }).filter(Boolean) as GeoFeature[];
}

// ---- Haversine distance (no turf dependency) ----

function haversineKm(a: [number, number], b: [number, number]): number {
    const R = 6371;
    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function polylineDistanceKm(points: [number, number][]): number {
    let d = 0;
    for (let i = 1; i < points.length; i++) d += haversineKm(points[i - 1], points[i]);
    return d;
}

// ---- Map interaction sub-component ----

function MapInteraction({ mode, onMapClick, onMapMove, drawingCoords }: {
    mode: DrawMode;
    onMapClick: (latlng: L.LatLng) => void;
    onMapMove: (center: [number, number], zoom: number) => void;
    drawingCoords: [number, number][];
}) {
    const map = useMap();
    useMapEvents({
        click(e) { onMapClick(e.latlng); },
        moveend() { const c = map.getCenter(); onMapMove([c.lat, c.lng], map.getZoom()); },
    });
    return (
        <>
            {drawingCoords.length > 1 && (mode === 'line' || mode === 'polygon' || mode === 'measure') && (
                <Polyline positions={drawingCoords} pathOptions={{ color: '#fbbf24', weight: 2, dashArray: '6 4' }} />
            )}
        </>
    );
}

function BasemapLayer({ basemap }: { basemap: string }) {
    const bm = BASEMAPS[basemap] || BASEMAPS.osm;
    return <TileLayer key={basemap} url={bm.url} attribution={bm.attribution} />;
}

// ---- Props ----

export interface OsintMarkerSet {
    key: string;
    color: string;
    markers: { lat: number; lng: number; name: string; tags?: Record<string, string> }[];
}

export interface GISMapViewProps {
    project: GISProject;
    onProjectChange: (updater: (prev: GISProject) => GISProject) => void;
    mode: DrawMode;
    onModeChange: (mode: DrawMode) => void;
    selectedFeatureId: string | null;
    onSelectFeature: (id: string | null) => void;
    mapRef?: React.MutableRefObject<L.Map | null>;
    className?: string;
    activeOverlays?: Set<string>;
    osintLayers?: OsintMarkerSet[];
}

// ---- Main component ----

export const GISMapView: React.FC<GISMapViewProps> = ({
    project,
    onProjectChange,
    mode,
    onModeChange,
    selectedFeatureId,
    onSelectFeature,
    mapRef: externalMapRef,
    className,
    activeOverlays,
    osintLayers,
}) => {
    const [drawingCoords, setDrawingCoords] = useState<[number, number][]>([]);
    const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
    const [measureDistance, setMeasureDistance] = useState<number | null>(null);
    const [overlayData, setOverlayData] = useState<Record<string, any>>({});
    const [loadingOverlays, setLoadingOverlays] = useState<Set<string>>(new Set());
    const internalMapRef = useRef<L.Map | null>(null);
    const mapRef = externalMapRef || internalMapRef;
    const [activeLayerId, setActiveLayerId] = useState(project.layers[0]?.id || 'default');

    useEffect(() => { ensureLeafletCSS(); fixMarkerIcons(); }, []);

    const addFeature = useCallback((feature: GeoFeature) => {
        onProjectChange(prev => ({
            ...prev,
            features: [...prev.features, feature],
            layers: prev.layers.map(l => l.id === feature.layerId ? { ...l, features: [...l.features, feature.id] } : l),
        }));
    }, [onProjectChange]);

    const handleMapClick = useCallback((latlng: L.LatLng) => {
        const coord: [number, number] = [latlng.lat, latlng.lng];

        if (mode === 'select') { onSelectFeature(null); return; }

        if (mode === 'measure') {
            const pts = [...measurePoints, coord];
            setMeasurePoints(pts);
            if (pts.length >= 2) setMeasureDistance(polylineDistanceKm(pts));
            return;
        }

        if (mode === 'marker') {
            const id = `feat_${Date.now()}`;
            const layer = project.layers.find(l => l.id === activeLayerId);
            addFeature({ id, type: 'marker', name: `Marker ${project.features.length + 1}`, coordinates: coord, color: layer?.color || '#3b82f6', visible: true, layerId: activeLayerId, properties: {} });
            onSelectFeature(id);
            onModeChange('select');
            return;
        }

        if (mode === 'circle') {
            const id = `feat_${Date.now()}`;
            const layer = project.layers.find(l => l.id === activeLayerId);
            addFeature({ id, type: 'circle', name: `Circle ${project.features.length + 1}`, coordinates: coord, radius: 500, color: layer?.color || '#3b82f6', visible: true, layerId: activeLayerId, properties: {} });
            onSelectFeature(id);
            onModeChange('select');
            return;
        }

        if (mode === 'line' || mode === 'polygon') {
            setDrawingCoords(prev => [...prev, coord]);
        }
    }, [mode, activeLayerId, project, addFeature, measurePoints, onSelectFeature, onModeChange]);

    const finishDrawing = useCallback(() => {
        if (drawingCoords.length < 2) { setDrawingCoords([]); return; }
        const id = `feat_${Date.now()}`;
        const layer = project.layers.find(l => l.id === activeLayerId);
        addFeature({ id, type: mode === 'polygon' ? 'polygon' : 'line', name: `${mode === 'polygon' ? 'Polygon' : 'Line'} ${project.features.length + 1}`, coordinates: drawingCoords, color: layer?.color || '#3b82f6', visible: true, layerId: activeLayerId, properties: {} });
        setDrawingCoords([]);
        onSelectFeature(id);
        onModeChange('select');
    }, [drawingCoords, mode, activeLayerId, project, addFeature, onSelectFeature, onModeChange]);

    const handleMapMove = useCallback((center: [number, number], zoom: number) => {
        onProjectChange(prev => ({ ...prev, center, zoom }));
    }, [onProjectChange]);

    // Keyboard
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (drawingCoords.length > 0) finishDrawing();
                else { onModeChange('select'); setMeasurePoints([]); setMeasureDistance(null); onSelectFeature(null); }
            }
            if (e.key === 'Enter' && drawingCoords.length >= 2) finishDrawing();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [drawingCoords, finishDrawing, onModeChange, onSelectFeature]);

    // Load reference overlay GeoJSON when toggled
    useEffect(() => {
        if (!activeOverlays) return;
        activeOverlays.forEach(layerId => {
            if (overlayData[layerId] || loadingOverlays.has(layerId)) return;
            const ref = REFERENCE_LAYERS[layerId];
            if (!ref) return;
            setLoadingOverlays(prev => new Set(prev).add(layerId));
            fetch(ref.url)
                .then(r => r.json())
                .then(data => {
                    setOverlayData(prev => ({ ...prev, [layerId]: data }));
                    setLoadingOverlays(prev => { const s = new Set(prev); s.delete(layerId); return s; });
                })
                .catch(err => {
                    console.error(`Failed to load overlay ${layerId}:`, err);
                    setLoadingOverlays(prev => { const s = new Set(prev); s.delete(layerId); return s; });
                });
        });
    }, [activeOverlays, overlayData, loadingOverlays]);

    // Visible features
    const visibleLayers = useMemo(() => new Set(project.layers.filter(l => l.visible).map(l => l.id)), [project.layers]);
    const visibleFeatures = useMemo(() => project.features.filter(f => f.visible && visibleLayers.has(f.layerId)), [project.features, visibleLayers]);

    return (
        <div className={className} style={{ flex: 1, position: 'relative' }}>
            <MapContainer
                center={project.center}
                zoom={project.zoom}
                style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
                zoomControl={false}
                ref={mapRef}
            >
                <BasemapLayer basemap={project.basemap} />
                <ZoomControl position="bottomright" />
                <MapInteraction mode={mode} onMapClick={handleMapClick} onMapMove={handleMapMove} drawingCoords={drawingCoords} />

                {visibleFeatures.map(f => {
                    const isSelected = selectedFeatureId === f.id;
                    if (f.type === 'marker') {
                        return (
                            <CircleMarker key={f.id} center={f.coordinates as [number, number]} radius={isSelected ? 8 : 6}
                                pathOptions={{ color: isSelected ? '#fbbf24' : f.color, fillColor: f.color, fillOpacity: 0.8, weight: isSelected ? 3 : 2 }}
                                eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onSelectFeature(f.id); } }}>
                                <Popup><strong>{f.name}</strong><br /><span style={{ color: '#999', fontSize: '0.75rem' }}>{(f.coordinates as [number, number])[0].toFixed(5)}, {(f.coordinates as [number, number])[1].toFixed(5)}</span></Popup>
                            </CircleMarker>
                        );
                    }
                    if (f.type === 'line') {
                        return <Polyline key={f.id} positions={f.coordinates as [number, number][]} pathOptions={{ color: isSelected ? '#fbbf24' : f.color, weight: isSelected ? 4 : 3 }}
                            eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onSelectFeature(f.id); } }} />;
                    }
                    if (f.type === 'polygon') {
                        return <Polygon key={f.id} positions={f.coordinates as [number, number][]} pathOptions={{ color: isSelected ? '#fbbf24' : f.color, fillColor: f.color, fillOpacity: 0.2, weight: isSelected ? 3 : 2 }}
                            eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onSelectFeature(f.id); } }} />;
                    }
                    if (f.type === 'circle') {
                        return <CircleMarker key={f.id} center={f.coordinates as [number, number]} radius={Math.max(10, (f.radius || 500) / 100)}
                            pathOptions={{ color: isSelected ? '#fbbf24' : f.color, fillColor: f.color, fillOpacity: 0.15, weight: 2 }}
                            eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onSelectFeature(f.id); } }} />;
                    }
                    return null;
                })}

                {/* Reference overlays */}
                {activeOverlays && Array.from(activeOverlays).map(layerId => {
                    const data = overlayData[layerId];
                    if (!data) return null;
                    const ref = REFERENCE_LAYERS[layerId];
                    if (!ref) return null;
                    return (
                        <GeoJSON
                            key={layerId}
                            data={data}
                            style={() => ref.style}
                            pointToLayer={(feature, latlng) => {
                                return L.circleMarker(latlng, { radius: 4, ...ref.style });
                            }}
                            onEachFeature={(feature, layer) => {
                                const name = feature.properties?.ADMIN || feature.properties?.name || feature.properties?.NAME || feature.properties?.NAME_EN || '';
                                if (name) layer.bindTooltip(name, { sticky: true });
                            }}
                        />
                    );
                })}

                {/* OSINT cached layers */}
                {osintLayers && osintLayers.map(layer => (
                    layer.markers.map((m, i) => (
                        <CircleMarker key={`${layer.key}_${i}`} center={[m.lat, m.lng]} radius={5}
                            pathOptions={{ color: layer.color, fillColor: layer.color, fillOpacity: 0.7, weight: 1 }}>
                            <Popup><strong>{m.name}</strong>{m.tags && Object.keys(m.tags).length > 0 && <br />}{m.tags && <span style={{ fontSize: '0.7rem', color: '#666' }}>{Object.entries(m.tags).filter(([k]) => k !== 'name').slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(', ')}</span>}</Popup>
                        </CircleMarker>
                    ))
                ))}

                {measurePoints.length > 1 && <Polyline positions={measurePoints} pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '8 4' }} />}
                {measurePoints.map((p, i) => <CircleMarker key={`m_${i}`} center={p} radius={4} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 1 }} />)}
            </MapContainer>

            {/* Drawing hint */}
            {mode !== 'select' && (
                <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', padding: '4px 12px', borderRadius: 12, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: '#e2e8f0', zIndex: 1000, pointerEvents: 'none' }}>
                    {mode === 'marker' && 'Click to place marker'}
                    {mode === 'line' && (drawingCoords.length === 0 ? 'Click to start line' : `${drawingCoords.length} pts — Enter to finish`)}
                    {mode === 'polygon' && (drawingCoords.length === 0 ? 'Click to start polygon' : `${drawingCoords.length} pts — Enter to finish`)}
                    {mode === 'circle' && 'Click to place circle'}
                    {mode === 'measure' && (measureDistance != null ? `${measureDistance < 1 ? `${(measureDistance * 1000).toFixed(0)}m` : `${measureDistance.toFixed(2)}km`} (${(measureDistance * 0.621371).toFixed(2)}mi)` : 'Click to start measuring')}
                </div>
            )}

            {/* Coords display */}
            <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '2px 8px', borderRadius: 4, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.65rem', color: '#94a3b8', zIndex: 1000, fontFamily: 'monospace' }}>
                {project.center[0].toFixed(4)}, {project.center[1].toFixed(4)} | z{project.zoom}
            </div>
        </div>
    );
};
