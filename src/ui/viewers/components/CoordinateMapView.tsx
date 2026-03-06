import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, useMap, GeoJSON } from 'react-leaflet';
import type { MindMapNode, MindMapLink, NamedLocation } from './MindMapViewer';

// Inject leaflet CSS if not already present
const LEAFLET_CSS_ID = 'npcts-leaflet-css';
function ensureLeafletCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(LEAFLET_CSS_ID)) return;
  const link = document.createElement('link');
  link.id = LEAFLET_CSS_ID;
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

// Fix default marker icons (leaflet's icon path issue with bundlers)
function fixMarkerIcons() {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// Create colored marker icon
function createColorIcon(color: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 16 : 12;
  const border = isSelected ? '3px solid #fff' : '2px solid rgba(255,255,255,0.6)';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [size + 6, size + 6],
    iconAnchor: [(size + 6) / 2, (size + 6) / 2],
  });
}

// Available GeoJSON overlay sources
const GEO_LAYERS: Record<string, { label: string; url: string; style: any }> = {
  countries: {
    label: 'Country Borders',
    url: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
    style: { color: 'rgba(6,182,212,0.4)', weight: 1, fillColor: 'rgba(6,182,212,0.05)', fillOpacity: 1 },
  },
  us_states: {
    label: 'US States',
    url: 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',
    style: { color: 'rgba(139,92,246,0.5)', weight: 1, fillColor: 'rgba(139,92,246,0.05)', fillOpacity: 1 },
  },
};

// Map dark tile layers
const TILE_LAYERS: Record<string, { label: string; url: string; attribution: string }> = {
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  osm: {
    label: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  topo: {
    label: 'Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
};

interface CoordinateMapViewProps {
  nodes: MindMapNode[];
  links: MindMapLink[];
  selectedNode: string | null;
  isEditMode: boolean;
  linkMode: { active: boolean; sourceId: string | null };
  onNodeClick: (nodeId: string) => void;
  onNodeDragEnd: (nodeId: string, lat: number, lng: number) => void;
  onAddNode: (lat: number, lng: number) => void;
  onContextMenu: (x: number, y: number, nodeId?: string, lat?: number, lng?: number) => void;
  namedLocations?: NamedLocation[];
  onAddNamedLocation?: (location: NamedLocation) => void;
  defaultLocation?: NamedLocation;
}

// Sub-component to handle map events
function MapEventHandler({ isEditMode, onAddNode, onContextMenu }: {
  isEditMode: boolean;
  onAddNode: (lat: number, lng: number) => void;
  onContextMenu: (x: number, y: number, lat: number, lng: number) => void;
}) {
  useMapEvents({
    dblclick(e) {
      if (!isEditMode) return;
      onAddNode(
        Math.round(e.latlng.lat * 10000) / 10000,
        Math.round(e.latlng.lng * 10000) / 10000,
      );
    },
    contextmenu(e) {
      if (!isEditMode) return;
      onContextMenu(
        e.originalEvent.clientX,
        e.originalEvent.clientY,
        Math.round(e.latlng.lat * 10000) / 10000,
        Math.round(e.latlng.lng * 10000) / 10000,
      );
    },
  });
  return null;
}

// Sub-component to fit bounds when nodes change
function FitBounds({ nodes, defaultLocation }: { nodes: MindMapNode[]; defaultLocation?: NamedLocation }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    fitted.current = true;
    const geoNodes = nodes.filter(n => n.lat != null && n.lng != null);

    if (geoNodes.length === 1) {
      map.setView([geoNodes[0].lat!, geoNodes[0].lng!], 10);
    } else if (geoNodes.length > 1) {
      const bounds = L.latLngBounds(geoNodes.map(n => [n.lat!, n.lng!] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (defaultLocation) {
      map.setView([defaultLocation.lat, defaultLocation.lng], defaultLocation.zoom || 10);
    }
  }, [nodes, map, defaultLocation]);

  return null;
}

// Sub-component to fly to a location
function FlyToLocation({ location }: { location: NamedLocation | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo([location.lat, location.lng], location.zoom || 12, { duration: 1.5 });
  }, [location, map]);
  return null;
}

// Draggable marker component
function DraggableMarker({ node, isSelected, isEditMode, linkMode, onClick, onDragEnd }: {
  node: MindMapNode;
  isSelected: boolean;
  isEditMode: boolean;
  linkMode: { active: boolean; sourceId: string | null };
  onClick: () => void;
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const isLinkSource = linkMode.sourceId === node.id;
  const color = isLinkSource ? '#fbbf24' : isSelected ? '#f59e0b' : node.color;
  const icon = useMemo(() => createColorIcon(color, isSelected || isLinkSource), [color, isSelected, isLinkSource]);
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(() => ({
    click: onClick,
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onDragEnd(
          Math.round(pos.lat * 10000) / 10000,
          Math.round(pos.lng * 10000) / 10000,
        );
      }
    },
  }), [onClick, onDragEnd]);

  if (node.lat == null || node.lng == null) return null;

  return (
    <Marker
      ref={markerRef}
      position={[node.lat, node.lng]}
      icon={icon}
      draggable={isEditMode && !linkMode.active}
      eventHandlers={eventHandlers}
    >
      <Popup>
        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{node.label}</div>
        <div style={{ fontSize: '0.7rem', color: '#666' }}>{node.lat.toFixed(4)}, {node.lng?.toFixed(4)}</div>
      </Popup>
    </Marker>
  );
}

export const CoordinateMapView: React.FC<CoordinateMapViewProps> = ({
  nodes,
  links,
  selectedNode,
  isEditMode,
  linkMode,
  onNodeClick,
  onNodeDragEnd,
  onAddNode,
  onContextMenu,
  namedLocations,
  onAddNamedLocation,
  defaultLocation,
}) => {
  const [tileLayer, setTileLayer] = useState<string>('dark');
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [geoData, setGeoData] = useState<Record<string, any>>({});
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const [flyTarget, setFlyTarget] = useState<NamedLocation | null>(null);
  const [showSaveLocation, setShowSaveLocation] = useState(false);
  const [saveLocName, setSaveLocName] = useState('');
  const mapRef = useRef<any>(null);

  // Inject CSS and fix icons on mount
  useEffect(() => {
    ensureLeafletCSS();
    fixMarkerIcons();
  }, []);

  // Load GeoJSON data when layers are toggled
  const toggleLayer = useCallback(async (layerId: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
        // Fetch if not already loaded
        if (!geoData[layerId]) {
          setLoadingLayers(prev2 => new Set(prev2).add(layerId));
          fetch(GEO_LAYERS[layerId].url)
            .then(r => r.json())
            .then(data => {
              setGeoData(prev2 => ({ ...prev2, [layerId]: data }));
              setLoadingLayers(prev2 => {
                const s = new Set(prev2);
                s.delete(layerId);
                return s;
              });
            })
            .catch(err => {
              console.error(`Failed to load ${layerId}:`, err);
              setLoadingLayers(prev2 => {
                const s = new Set(prev2);
                s.delete(layerId);
                return s;
              });
            });
        }
      }
      return next;
    });
  }, [geoData]);

  // Build polylines from links
  const polylines = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return links
      .map(l => {
        const src = nodeMap.get(typeof l.source === 'string' ? l.source : (l.source as any).id);
        const tgt = nodeMap.get(typeof l.target === 'string' ? l.target : (l.target as any).id);
        if (!src?.lat || !src?.lng || !tgt?.lat || !tgt?.lng) return null;
        return {
          positions: [[src.lat, src.lng], [tgt.lat, tgt.lng]] as [number, number][],
          color: selectedNode && (src.id === selectedNode || tgt.id === selectedNode) ? '#06b6d4' : 'rgba(6,182,212,0.4)',
        };
      })
      .filter(Boolean) as { positions: [number, number][]; color: string }[];
  }, [nodes, links, selectedNode]);

  // Default center
  const geoNodes = nodes.filter(n => n.lat != null && n.lng != null);
  const defaultCenter: [number, number] = defaultLocation
    ? [defaultLocation.lat, defaultLocation.lng]
    : geoNodes.length > 0
      ? [geoNodes[0].lat!, geoNodes[0].lng!]
      : [20, 0];

  const tile = TILE_LAYERS[tileLayer];

  const handleSaveLocation = useCallback(() => {
    if (!saveLocName.trim() || !onAddNamedLocation || !mapRef.current) return;
    const center = mapRef.current.getCenter();
    const zoom = mapRef.current.getZoom();
    onAddNamedLocation({
      name: saveLocName.trim(),
      lat: Math.round(center.lat * 10000) / 10000,
      lng: Math.round(center.lng * 10000) / 10000,
      zoom,
    });
    setSaveLocName('');
    setShowSaveLocation(false);
  }, [saveLocName, onAddNamedLocation]);

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Named locations dropdown (top-left) */}
      {namedLocations && namedLocations.length > 0 && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, display: 'flex', gap: 4 }}>
          <select
            onChange={e => {
              const loc = namedLocations.find(l => l.name === e.target.value);
              if (loc) setFlyTarget({ ...loc });
              e.target.value = '';
            }}
            defaultValue=""
            style={{ padding: '4px 8px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#e2e8f0', fontSize: '0.7rem', cursor: 'pointer' }}
          >
            <option value="" disabled>Jump to...</option>
            {namedLocations.map(loc => (
              <option key={loc.name} value={loc.name}>{loc.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Save current view as location (top-left, below dropdown) */}
      {onAddNamedLocation && (
        <div style={{ position: 'absolute', top: namedLocations && namedLocations.length > 0 ? 42 : 10, left: 10, zIndex: 1000 }}>
          {showSaveLocation ? (
            <div style={{ background: 'rgba(15,23,42,0.95)', borderRadius: 6, padding: 8, border: '1px solid rgba(255,255,255,0.15)', display: 'flex', gap: 4 }}>
              <input value={saveLocName} onChange={e => setSaveLocName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveLocation(); if (e.key === 'Escape') setShowSaveLocation(false); }}
                placeholder="Location name..." autoFocus
                style={{ padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.7rem', width: 120 }}
              />
              <button onClick={handleSaveLocation} disabled={!saveLocName.trim()}
                style={{ padding: '4px 8px', background: '#0891b2', border: 'none', borderRadius: 4, color: '#fff', fontSize: '0.65rem', cursor: 'pointer', opacity: saveLocName.trim() ? 1 : 0.4 }}>Save</button>
              <button onClick={() => setShowSaveLocation(false)}
                style={{ padding: '4px 6px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.7rem' }}>&times;</button>
            </div>
          ) : (
            <button onClick={() => setShowSaveLocation(true)}
              style={{ padding: '4px 8px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#94a3b8', fontSize: '0.65rem', cursor: 'pointer' }}>
              + Save Location
            </button>
          )}
        </div>
      )}

      {/* Tile layer + GeoJSON layer controls */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Tile selector */}
        <div style={{ background: 'rgba(15,23,42,0.9)', borderRadius: 6, padding: '4px 6px', display: 'flex', gap: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
          {Object.entries(TILE_LAYERS).map(([k, v]) => (
            <button key={k} onClick={() => setTileLayer(k)}
              style={{ padding: '3px 8px', border: 'none', borderRadius: 4, fontSize: '0.65rem', cursor: 'pointer',
                background: tileLayer === k ? '#0891b2' : 'transparent', color: tileLayer === k ? '#fff' : '#94a3b8' }}>
              {v.label}
            </button>
          ))}
        </div>
        {/* GeoJSON layers */}
        <div style={{ background: 'rgba(15,23,42,0.9)', borderRadius: 6, padding: '6px 8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: 4 }}>Overlays</div>
          {Object.entries(GEO_LAYERS).map(([k, v]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#94a3b8', cursor: 'pointer', padding: '2px 0' }}>
              <input type="checkbox" checked={activeLayers.has(k)} onChange={() => toggleLayer(k)}
                style={{ accentColor: '#0891b2' }} />
              {v.label}
              {loadingLayers.has(k) && <span style={{ fontSize: '0.6rem', color: '#06b6d4' }}>...</span>}
            </label>
          ))}
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={defaultCenter}
        zoom={defaultLocation?.zoom || (geoNodes.length > 0 ? 4 : 2)}
        style={{ flex: 1, background: '#0f172a' }}
        doubleClickZoom={!isEditMode}
      >
        <TileLayer url={tile.url} attribution={tile.attribution} />
        <FitBounds nodes={nodes} defaultLocation={defaultLocation} />
        <FlyToLocation location={flyTarget} />
        <MapEventHandler
          isEditMode={isEditMode}
          onAddNode={onAddNode}
          onContextMenu={(x, y, lat, lng) => onContextMenu(x, y, undefined, lat, lng)}
        />

        {/* GeoJSON overlays */}
        {Array.from(activeLayers).map(layerId => {
          const data = geoData[layerId];
          if (!data) return null;
          const layerInfo = GEO_LAYERS[layerId];
          return (
            <GeoJSON
              key={layerId}
              data={data}
              style={() => layerInfo.style}
              onEachFeature={(feature, layer) => {
                const name = feature.properties?.ADMIN || feature.properties?.name || feature.properties?.NAME || '';
                if (name) {
                  layer.bindTooltip(name, { sticky: true, className: '' });
                }
              }}
            />
          );
        })}

        {/* Links as polylines */}
        {polylines.map((pl, i) => (
          <Polyline key={i} positions={pl.positions} color={pl.color} weight={2} opacity={0.8} />
        ))}

        {/* Nodes as markers */}
        {nodes.map(node => (
          <DraggableMarker
            key={node.id}
            node={node}
            isSelected={selectedNode === node.id}
            isEditMode={isEditMode}
            linkMode={linkMode}
            onClick={() => onNodeClick(node.id)}
            onDragEnd={(lat, lng) => onNodeDragEnd(node.id, lat, lng)}
          />
        ))}
      </MapContainer>
    </div>
  );
};
