import React, { useState, useEffect, useCallback, useRef, useMemo, memo, lazy, Suspense } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

// Lazy load CoordinateMapView to avoid loading leaflet for non-coordinate maps
const CoordinateMapView = lazy(() => import('./CoordinateMapView').then(m => ({ default: m.CoordinateMapView })));

// ---- Types ----
export type MapType = 'freeform' | 'flowchart' | 'coordinate' | 'hierarchy';

export interface MindMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  parentId: string | null;
  lat?: number;
  lng?: number;
  nodeType?: 'start' | 'end' | 'process' | 'decision' | 'default';
  level?: number;
  collapsed?: boolean;
  notes?: string;
}

export interface MindMapLink {
  source: string;
  target: string;
  label?: string;
}

export interface MindMapData {
  name: string;
  mapType: MapType;
  nodes: MindMapNode[];
  links: MindMapLink[];
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

export interface NamedLocation {
  name: string;
  lat: number;
  lng: number;
  zoom?: number;
}

export interface MindMapViewerProps {
  initialData?: MindMapData;
  onChange?: (data: MindMapData) => void;
  onSave?: (data: MindMapData) => void | Promise<void>;
  onClose?: () => void;
  defaultEditMode?: boolean;
  className?: string;
  showBack?: boolean;
  namedLocations?: NamedLocation[];
  onAddNamedLocation?: (location: NamedLocation) => void;
  onRemoveNamedLocation?: (name: string) => void;
  defaultLocation?: NamedLocation;
}

const NODE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const MAP_TYPE_INFO: Record<MapType, { label: string; description: string }> = {
  freeform: { label: 'Free Association', description: 'Free-form mind map with no structure' },
  flowchart: { label: 'Flowchart', description: 'Process flow with decisions and steps' },
  coordinate: { label: 'Coordinate Map', description: 'Spatial map with queryable coordinates' },
  hierarchy: { label: 'Hierarchy', description: 'Tree structure with parent-child relationships' },
};

const FLOWCHART_SHAPES: Record<string, string> = {
  start: '●', end: '◉', process: '▬', decision: '◇', default: '○',
};

const COORD_SCALE = 800;

function latLngToCanvas(lat: number, lng: number, center: { lat: number; lng: number }): { x: number; y: number } {
  return { x: (lng - center.lng) * COORD_SCALE, y: -(lat - center.lat) * COORD_SCALE };
}

function canvasToLatLng(x: number, y: number, center: { lat: number; lng: number }): { lat: number; lng: number } {
  return { lat: center.lat - y / COORD_SCALE, lng: center.lng + x / COORD_SCALE };
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 100) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

const zoomBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 6,
  background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.15)',
  color: '#e2e8f0', fontSize: '1rem', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

export const MindMapViewer: React.FC<MindMapViewerProps> = ({
  initialData,
  onChange,
  onSave,
  onClose,
  defaultEditMode = true,
  className = '',
  showBack = true,
  namedLocations,
  onAddNamedLocation,
  onRemoveNamedLocation,
  defaultLocation,
}) => {
  const [nodes, setNodes] = useState<MindMapNode[]>(initialData?.nodes || []);
  const [links, setLinks] = useState<MindMapLink[]>(initialData?.links || []);
  const [mapName, setMapName] = useState(initialData?.name || 'Untitled Mind Map');
  const [mapType, setMapType] = useState<MapType>(initialData?.mapType || 'freeform');
  const [bounds, setBounds] = useState(initialData?.bounds);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [linkMode, setLinkMode] = useState<{ active: boolean; sourceId: string | null }>({ active: false, sourceId: null });
  const [isEditMode, setIsEditMode] = useState(defaultEditMode);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; canvasX?: number; canvasY?: number; lat?: number; lng?: number } | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddLabel, setQuickAddLabel] = useState('');
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editNodeType, setEditNodeType] = useState<string>('default');
  const [editLinkLabel, setEditLinkLabel] = useState('');
  const [newNodeLat, setNewNodeLat] = useState('');
  const [newNodeLng, setNewNodeLng] = useState('');
  const [quickAddLat, setQuickAddLat] = useState('');
  const [quickAddLng, setQuickAddLng] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Undo/redo
  const [history, setHistory] = useState<Array<{ nodes: MindMapNode[]; links: MindMapLink[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);
  const lastSnapshotRef = useRef('');

  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Snapshot history on changes (debounced via JSON comparison)
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const snap = JSON.stringify({ nodes, links });
    if (snap === lastSnapshotRef.current) return;
    lastSnapshotRef.current = snap;
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1);
      const next = [...truncated, { nodes, links }];
      if (next.length > 50) next.shift();
      return next;
    });
    setHistoryIndex(prev => {
      const newIdx = prev + 1;
      return Math.min(newIdx, 49);
    });
  }, [nodes, links]); // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    isUndoRedoRef.current = true;
    const prev = history[historyIndex - 1];
    setNodes(prev.nodes);
    setLinks(prev.links);
    setHistoryIndex(i => i - 1);
    lastSnapshotRef.current = JSON.stringify(prev);
    setHasChanges(true);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    isUndoRedoRef.current = true;
    const next = history[historyIndex + 1];
    setNodes(next.nodes);
    setLinks(next.links);
    setHistoryIndex(i => i + 1);
    lastSnapshotRef.current = JSON.stringify(next);
    setHasChanges(true);
  }, [history, historyIndex]);

  // Coordinate map: compute center and bounds
  const coordInfo = useMemo(() => {
    const geoNodes = nodes.filter(n => n.lat !== undefined && n.lng !== undefined);
    if (geoNodes.length === 0) return { center: { lat: 0, lng: 0 }, bounds: null, hasGeo: false };
    const lats = geoNodes.map(n => n.lat!);
    const lngs = geoNodes.map(n => n.lng!);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return {
      center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
      bounds: { minLat, maxLat, minLng, maxLng },
      hasGeo: true,
    };
  }, [nodes]);

  const currentData = useCallback((): MindMapData => ({
    name: mapName, mapType, nodes, links, bounds: coordInfo.bounds || bounds,
  }), [mapName, mapType, nodes, links, bounds, coordInfo.bounds]);

  const markChanged = useCallback(() => { setHasChanges(true); }, []);

  useEffect(() => {
    if (hasChanges && onChange) onChange(currentData());
  }, [nodes, links, mapName, mapType, bounds, hasChanges, onChange, currentData]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try { await onSave(currentData()); setHasChanges(false); }
    catch (err) { console.error('Save failed:', err); }
    finally { setIsSaving(false); }
  }, [onSave, currentData]);

  // ---- Node operations ----
  const addNode = useCallback((label: string, x: number, y: number, parentId: string | null = null, extra: Partial<MindMapNode> = {}) => {
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const color = NODE_COLORS[nodes.length % NODE_COLORS.length];
    const parentNode = parentId ? nodes.find(n => n.id === parentId) : null;
    const level = parentNode ? (parentNode.level || 0) + 1 : 0;
    let finalX = x, finalY = y;
    if (mapType === 'coordinate' && extra.lat !== undefined && extra.lng !== undefined) {
      const pos = latLngToCanvas(extra.lat, extra.lng, coordInfo.center);
      finalX = pos.x; finalY = pos.y;
    }
    const newNode: MindMapNode = {
      id, label, x: finalX, y: finalY, color, parentId, level,
      nodeType: mapType === 'flowchart' ? 'default' : undefined,
      ...extra,
    };
    setNodes(prev => [...prev, newNode]);
    if (parentId) setLinks(prev => [...prev, { source: parentId, target: id }]);
    markChanged();
    setSelectedNode(id);
    return id;
  }, [nodes, mapType, markChanged, coordInfo.center]);

  const updateNode = useCallback((nodeId: string, updates: Partial<MindMapNode>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
    markChanged();
  }, [markChanged]);

  const deleteNodeTree = useCallback((nodeId: string) => {
    const getDescendants = (id: string): string[] => {
      const children = links.filter(l => l.source === id).map(l => l.target);
      return [id, ...children.flatMap(getDescendants)];
    };
    const toDelete = new Set(getDescendants(nodeId));
    setNodes(prev => prev.filter(n => !toDelete.has(n.id)));
    setLinks(prev => prev.filter(l => !toDelete.has(l.source) && !toDelete.has(l.target)));
    if (selectedNode && toDelete.has(selectedNode)) setSelectedNode(null);
    markChanged();
  }, [links, selectedNode, markChanged]);

  const toggleCollapse = useCallback((nodeId: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n));
    markChanged();
  }, [markChanged]);

  // ---- Link operations ----
  const handleLinkClick = useCallback((nodeId: string) => {
    if (!linkMode.active) return;
    if (!linkMode.sourceId) {
      setLinkMode({ active: true, sourceId: nodeId });
    } else if (linkMode.sourceId !== nodeId) {
      const existing = links.find(l =>
        (l.source === linkMode.sourceId && l.target === nodeId) ||
        (l.source === nodeId && l.target === linkMode.sourceId)
      );
      if (existing) setLinks(prev => prev.filter(l => l !== existing));
      else setLinks(prev => [...prev, { source: linkMode.sourceId!, target: nodeId }]);
      setLinkMode({ active: false, sourceId: null });
      markChanged();
    }
  }, [linkMode, links, markChanged]);

  const removeLink = useCallback((source: string, target: string) => {
    setLinks(prev => prev.filter(l => !(l.source === source && l.target === target)));
    markChanged();
  }, [markChanged]);

  // ---- Editing ----
  const startEditing = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setEditingNode(nodeId);
    setEditLabel(node.label);
    setEditNotes(node.notes || '');
    if (mapType === 'coordinate') { setEditLat(node.lat?.toString() || ''); setEditLng(node.lng?.toString() || ''); }
    if (mapType === 'flowchart') setEditNodeType(node.nodeType || 'default');
  }, [nodes, mapType]);

  const saveEdit = useCallback(() => {
    if (!editingNode || !editLabel.trim()) { setEditingNode(null); return; }
    const updates: Partial<MindMapNode> = { label: editLabel.trim(), notes: editNotes || undefined };
    if (mapType === 'coordinate') {
      if (editLat) updates.lat = parseFloat(editLat);
      if (editLng) updates.lng = parseFloat(editLng);
      if (editLat && editLng) {
        const pos = latLngToCanvas(parseFloat(editLat), parseFloat(editLng), coordInfo.center);
        updates.x = pos.x; updates.y = pos.y;
      }
    }
    if (mapType === 'flowchart') updates.nodeType = editNodeType as any;
    updateNode(editingNode, updates);
    setEditingNode(null);
    setEditLabel('');
    setEditNotes('');
  }, [editingNode, editLabel, editNotes, editLat, editLng, editNodeType, mapType, updateNode, coordInfo.center]);

  // ---- Add child node ----
  const addChildNode = useCallback((parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;
    const childCount = links.filter(l => l.source === parentId).length;
    const angle = (childCount * 60 + 30) * (Math.PI / 180);
    const x = parent.x + Math.cos(angle) * 150;
    const y = parent.y + Math.sin(angle) * 120;
    const id = addNode('New Node', x, y, parentId);
    startEditing(id);
  }, [nodes, links, addNode, startEditing]);

  // ---- Quick add ----
  const handleQuickAdd = useCallback(() => {
    if (!quickAddLabel.trim() || !pendingPos) return;
    const extra: Partial<MindMapNode> = {};
    if (mapType === 'coordinate') {
      if (quickAddLat && quickAddLng) { extra.lat = parseFloat(quickAddLat); extra.lng = parseFloat(quickAddLng); }
      else {
        const ll = canvasToLatLng(pendingPos.x, pendingPos.y, coordInfo.center);
        extra.lat = Math.round(ll.lat * 10000) / 10000;
        extra.lng = Math.round(ll.lng * 10000) / 10000;
      }
    }
    addNode(quickAddLabel.trim(), pendingPos.x, pendingPos.y, selectedNode, extra);
    setQuickAddLabel(''); setQuickAddLat(''); setQuickAddLng('');
    setShowQuickAdd(false); setPendingPos(null);
  }, [quickAddLabel, quickAddLat, quickAddLng, pendingPos, selectedNode, addNode, mapType, coordInfo.center]);

  // ---- Add from sidebar ----
  const handleAddFromSidebar = useCallback(() => {
    if (!newNodeLabel.trim()) return;
    let x = 200 + Math.random() * 400, y = 100 + Math.random() * 200;
    const extra: Partial<MindMapNode> = {};
    if (mapType === 'coordinate' && newNodeLat && newNodeLng) {
      extra.lat = parseFloat(newNodeLat); extra.lng = parseFloat(newNodeLng);
      const pos = latLngToCanvas(extra.lat, extra.lng, coordInfo.center);
      x = pos.x; y = pos.y;
    } else if (selectedNode) {
      const parent = nodes.find(n => n.id === selectedNode);
      if (parent) {
        const cc = links.filter(l => l.source === selectedNode).length;
        const angle = (cc * 45 + 45) * (Math.PI / 180);
        x = parent.x + Math.cos(angle) * 150; y = parent.y + Math.sin(angle) * 100;
      }
    }
    addNode(newNodeLabel.trim(), x, y, selectedNode, extra);
    setNewNodeLabel(''); setNewNodeLat(''); setNewNodeLng('');
  }, [newNodeLabel, newNodeLat, newNodeLng, selectedNode, nodes, links, addNode, mapType, coordInfo.center]);

  // Arrow key navigation
  const navigateToNearest = useCallback((key: string) => {
    const sel = nodes.find(n => n.id === selectedNode);
    if (!sel) return;
    const dirs: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const dir = dirs[key];
    if (!dir) return;
    let best: string | null = null, bestScore = Infinity;
    for (const n of nodes) {
      if (n.id === sel.id) continue;
      const dx = n.x - sel.x, dy = n.y - sel.y;
      const dot = dx * dir[0] + dy * dir[1];
      if (dot <= 0) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestScore) { bestScore = dist; best = n.id; }
    }
    if (best) setSelectedNode(best);
  }, [nodes, selectedNode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl+S: save (always)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); return; }
      // Ctrl+Z: undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      // Ctrl+Shift+Z or Ctrl+Y: redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }

      if (isInput) return; // Don't intercept typing

      // Escape: deselect / cancel
      if (e.key === 'Escape') {
        if (editingNode) setEditingNode(null);
        else if (linkMode.active) setLinkMode({ active: false, sourceId: null });
        else if (selectedNode) setSelectedNode(null);
        return;
      }

      if (!isEditMode) {
        // Arrow navigation in view mode
        if (e.key.startsWith('Arrow') && selectedNode) { e.preventDefault(); navigateToNearest(e.key); }
        return;
      }

      // Edit mode shortcuts
      if (e.key === 'Tab' && selectedNode) { e.preventDefault(); addChildNode(selectedNode); }
      if (e.key === 'F2' && selectedNode) { e.preventDefault(); startEditing(selectedNode); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode && !editingNode) { e.preventDefault(); deleteNodeTree(selectedNode); }
      if (e.key.startsWith('Arrow') && selectedNode && !editingNode) { e.preventDefault(); navigateToNearest(e.key); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, undo, redo, selectedNode, editingNode, isEditMode, linkMode.active, addChildNode, startEditing, deleteNodeTree, navigateToNearest]);

  // ---- Graph data (with collapse filtering) ----
  const graphData = useMemo(() => {
    // Build set of hidden nodes (descendants of collapsed nodes)
    const hiddenNodes = new Set<string>();
    const queue = nodes.filter(n => n.collapsed).map(n => n.id);
    while (queue.length > 0) {
      const parentId = queue.pop()!;
      for (const link of links) {
        const srcId = typeof link.source === 'string' ? link.source : (link.source as any).id;
        if (srcId === parentId) {
          const tgtId = typeof link.target === 'string' ? link.target : (link.target as any).id;
          if (!hiddenNodes.has(tgtId)) {
            hiddenNodes.add(tgtId);
            queue.push(tgtId);
          }
        }
      }
    }
    return {
      nodes: nodes.filter(n => !hiddenNodes.has(n.id)).map(n => ({ ...n, val: n.parentId ? 6 : 10 })),
      links: links.filter(l => {
        const srcId = typeof l.source === 'string' ? l.source : (l.source as any).id;
        const tgtId = typeof l.target === 'string' ? l.target : (l.target as any).id;
        return !hiddenNodes.has(srcId) && !hiddenNodes.has(tgtId);
      }).map(l => ({ ...l })),
    };
  }, [nodes, links]);

  // Filtered node list for search
  const filteredNodes = useMemo(() => {
    if (!searchFilter) return nodes;
    const q = searchFilter.toLowerCase();
    return nodes.filter(n => n.label.toLowerCase().includes(q) || n.notes?.toLowerCase().includes(q));
  }, [nodes, searchFilter]);

  const searchMatchIds = useMemo(() => {
    if (!searchFilter) return new Set<string>();
    return new Set(filteredNodes.map(n => n.id));
  }, [searchFilter, filteredNodes]);

  const selectedNodeData = nodes.find(n => n.id === selectedNode);
  const selectedOutgoing = selectedNode ? links.filter(l => l.source === selectedNode) : [];
  const selectedIncoming = selectedNode ? links.filter(l => l.target === selectedNode) : [];

  // Count children (for collapse indicator)
  const childCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of links) {
      const srcId = typeof l.source === 'string' ? l.source : (l.source as any).id;
      counts[srcId] = (counts[srcId] || 0) + 1;
    }
    return counts;
  }, [links]);

  // ---- Node canvas rendering ----
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label || '';
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
    const tw = ctx.measureText(label).width;
    const pad = fontSize * 0.4;
    const w = tw + pad * 2;
    const h = fontSize * 1.4;

    let fill = node.color || '#3b82f6';
    if (linkMode.sourceId === node.id) fill = '#fbbf24';
    else if (selectedNode === node.id) fill = '#f59e0b';

    // Search highlight glow
    if (searchFilter && searchMatchIds.has(node.id) && selectedNode !== node.id) {
      ctx.save();
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12 / globalScale;
      ctx.fillStyle = 'transparent';
      ctx.fillRect(node.x - w / 2 - 2, node.y - h / 2 - 2, w + 4, h + 4);
      ctx.restore();
    }

    // Flowchart shapes
    if (mapType === 'flowchart' && node.nodeType === 'decision') {
      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = fill;
      const s = Math.max(w, h) * 0.7;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    } else if (mapType === 'flowchart' && (node.nodeType === 'start' || node.nodeType === 'end')) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(node.x - w / 2 - 4, node.y - h / 2, w + 8, h, h / 2);
      ctx.fill();
    } else {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(node.x - w / 2, node.y - h / 2, w, h, 4 / globalScale);
      ctx.fill();
    }

    // Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(label, node.x, node.y);

    // Collapse indicator
    const cc = childCounts[node.id] || 0;
    if (cc > 0 && node.collapsed) {
      ctx.font = `bold ${fontSize * 0.65}px -apple-system, sans-serif`;
      ctx.fillStyle = '#06b6d4';
      ctx.textAlign = 'left';
      ctx.fillText(`+${cc}`, node.x + w / 2 + fontSize * 0.3, node.y);
    }

    // Notes indicator
    if (node.notes) {
      ctx.font = `${fontSize * 0.55}px -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(251,191,36,0.7)';
      ctx.textAlign = 'right';
      ctx.fillText('\u{1F4DD}', node.x - w / 2 - fontSize * 0.2, node.y - h / 2 + fontSize * 0.3);
    }

    // Coordinate badge
    if (mapType === 'coordinate' && node.lat !== undefined && node.lng !== undefined) {
      const coordText = `${node.lat.toFixed(2)}, ${node.lng.toFixed(2)}`;
      ctx.font = `${fontSize * 0.6}px -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText(coordText, node.x, node.y + h / 2 + fontSize * 0.5);
    }
  }, [linkMode.sourceId, selectedNode, mapType, searchFilter, searchMatchIds, childCounts]);

  // ---- Link canvas rendering ----
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source;
    const end = link.target;
    if (typeof start !== 'object' || typeof end !== 'object') return;
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const fontSize = 10 / globalScale;
    ctx.font = `${fontSize}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (link.label) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(link.label, mx, my - fontSize * 0.6);
    }

    if (mapType === 'coordinate' && start.lat != null && start.lng != null && end.lat != null && end.lng != null) {
      const dist = haversineDistance(start.lat, start.lng, end.lat, end.lng);
      ctx.fillStyle = 'rgba(6,182,212,0.6)';
      ctx.font = `${fontSize * 0.8}px -apple-system, sans-serif`;
      ctx.fillText(formatDistance(dist), mx, my + fontSize * 0.6);
    }
  }, [mapType]);

  return (
    <div className={`mindmap-viewer ${className}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="mindmap-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, background: 'rgba(0,0,0,0.3)' }}>
        {showBack && onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }} title="Back">
            &larr; Back
          </button>
        )}
        <input
          value={mapName}
          onChange={e => { setMapName(e.target.value); markChanged(); }}
          style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.85rem', width: 160 }}
        />
        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
        <select
          value={mapType}
          onChange={e => { setMapType(e.target.value as MapType); markChanged(); }}
          style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.75rem' }}
        >
          {Object.entries(MAP_TYPE_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

        {/* Undo/Redo */}
        <button onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)"
          style={{ padding: '4px 6px', background: 'none', border: 'none', color: historyIndex > 0 ? '#e2e8f0' : '#475569', cursor: historyIndex > 0 ? 'pointer' : 'default', fontSize: '0.9rem' }}>
          &#x21B6;
        </button>
        <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)"
          style={{ padding: '4px 6px', background: 'none', border: 'none', color: historyIndex < history.length - 1 ? '#e2e8f0' : '#475569', cursor: historyIndex < history.length - 1 ? 'pointer' : 'default', fontSize: '0.9rem' }}>
          &#x21B7;
        </button>

        {onSave && (
          <button onClick={handleSave} disabled={isSaving || !hasChanges} title="Save (Ctrl+S)"
            style={{ padding: '4px 8px', background: 'none', border: 'none', color: hasChanges ? '#e2e8f0' : '#475569', cursor: hasChanges ? 'pointer' : 'default', fontSize: '0.8rem' }}>
            &#x1F4BE;
          </button>
        )}
        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

        {/* View/Edit toggle */}
        <div style={{ display: 'flex', gap: 2, padding: 2, background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={() => setIsEditMode(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: 'none', borderRadius: 4, fontSize: '0.7rem', cursor: 'pointer', background: !isEditMode ? '#0891b2' : 'transparent', color: !isEditMode ? '#fff' : '#64748b' }}>
            View
          </button>
          <button onClick={() => setIsEditMode(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: 'none', borderRadius: 4, fontSize: '0.7rem', cursor: 'pointer', background: isEditMode ? '#ea580c' : 'transparent', color: isEditMode ? '#fff' : '#64748b' }}>
            Edit
          </button>
        </div>
        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
        {isEditMode && (
          <button
            onClick={() => setLinkMode({ active: !linkMode.active, sourceId: null })}
            style={{ padding: '4px 8px', background: linkMode.active ? '#0891b2' : 'transparent', border: '1px solid ' + (linkMode.active ? '#0891b2' : 'transparent'), borderRadius: 4, color: linkMode.active ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
            title={linkMode.active ? 'Cancel linking' : 'Link/unlink nodes'}
          >
            Link
          </button>
        )}
        <div style={{ flex: 1 }} />
        {isEditMode && <span style={{ fontSize: '0.6rem', color: '#475569' }}>Tab=child Del=delete F2=edit</span>}
        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 8 }}>
          {nodes.length}n {links.length}e
          {hasChanges && <span style={{ color: '#eab308', marginLeft: 4 }}>*</span>}
        </span>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 240, borderRight: '1px solid rgba(255,255,255,0.08)', padding: 10, display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(0,0,0,0.15)', overflowY: 'auto', flexShrink: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>
          {/* Map type info */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 8, background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{MAP_TYPE_INFO[mapType].label}</div>
            <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '2px 0 0' }}>{MAP_TYPE_INFO[mapType].description}</p>
            {mapType === 'coordinate' && <p style={{ fontSize: '0.65rem', color: '#06b6d4', marginTop: 4 }}>Nodes have lat/lng for spatial queries</p>}
            {mapType === 'flowchart' && <p style={{ fontSize: '0.65rem', color: '#06b6d4', marginTop: 4 }}>Use node types: start, end, process, decision</p>}
          </div>

          {/* Coordinate bounds info */}
          {mapType === 'coordinate' && coordInfo.hasGeo && coordInfo.bounds && (
            <div style={{ border: '1px solid rgba(6,182,212,0.2)', borderRadius: 6, padding: 8, background: 'rgba(6,182,212,0.05)' }}>
              <label style={{ fontSize: '0.65rem', color: '#06b6d4', display: 'block', marginBottom: 4 }}>Coordinate Bounds</label>
              <div style={{ fontSize: '0.65rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
                <span style={{ color: '#64748b' }}>Lat:</span>
                <span style={{ color: '#94a3b8' }}>{coordInfo.bounds.minLat.toFixed(4)} — {coordInfo.bounds.maxLat.toFixed(4)}</span>
                <span style={{ color: '#64748b' }}>Lng:</span>
                <span style={{ color: '#94a3b8' }}>{coordInfo.bounds.minLng.toFixed(4)} — {coordInfo.bounds.maxLng.toFixed(4)}</span>
                <span style={{ color: '#64748b' }}>Center:</span>
                <span style={{ color: '#06b6d4' }}>{coordInfo.center.lat.toFixed(4)}, {coordInfo.center.lng.toFixed(4)}</span>
              </div>
              <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>
                {nodes.filter(n => n.lat != null).length} of {nodes.length} nodes have coordinates
              </div>
            </div>
          )}

          {/* Add node */}
          {isEditMode && (
            <div>
              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Add Node</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)} placeholder="Node text..."
                  onKeyDown={e => e.key === 'Enter' && handleAddFromSidebar()}
                  style={{ flex: 1, padding: '6px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.8rem' }}
                />
                <button onClick={handleAddFromSidebar} disabled={!newNodeLabel.trim()}
                  style={{ padding: '6px 10px', background: '#0891b2', border: 'none', borderRadius: 4, color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: newNodeLabel.trim() ? 1 : 0.4 }}>
                  +
                </button>
              </div>
              {mapType === 'coordinate' && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <input value={newNodeLat} onChange={e => setNewNodeLat(e.target.value)} placeholder="Lat"
                    style={{ flex: 1, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 4, color: '#06b6d4', fontSize: '0.7rem' }} />
                  <input value={newNodeLng} onChange={e => setNewNodeLng(e.target.value)} placeholder="Lng"
                    style={{ flex: 1, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 4, color: '#06b6d4', fontSize: '0.7rem' }} />
                </div>
              )}
            </div>
          )}

          {/* Selected node */}
          {selectedNodeData && (
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 8, background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Selected Node</span>
                <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>&times;</button>
              </div>

              {editingNode === selectedNode ? (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()} autoFocus
                      style={{ flex: 1, padding: '4px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.8rem' }}
                    />
                    <button onClick={saveEdit} style={{ padding: '4px 10px', background: '#10b981', border: 'none', borderRadius: 4, color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>OK</button>
                  </div>
                  {/* Notes */}
                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes..."
                    rows={3}
                    style={{ width: '100%', padding: '4px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.7rem', resize: 'vertical', marginBottom: 6 }}
                  />
                  {mapType === 'coordinate' && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      <input value={editLat} onChange={e => setEditLat(e.target.value)} placeholder="Latitude"
                        style={{ flex: 1, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.7rem' }} />
                      <input value={editLng} onChange={e => setEditLng(e.target.value)} placeholder="Longitude"
                        style={{ flex: 1, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.7rem' }} />
                    </div>
                  )}
                  {mapType === 'flowchart' && (
                    <select value={editNodeType} onChange={e => setEditNodeType(e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.7rem', marginBottom: 6 }}>
                      <option value="default">Default</option>
                      <option value="start">Start</option>
                      <option value="end">End</option>
                      <option value="process">Process</option>
                      <option value="decision">Decision</option>
                    </select>
                  )}
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedNodeData.label}</p>
                  {selectedNodeData.notes && (
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 0 8px', whiteSpace: 'pre-wrap', maxHeight: 80, overflowY: 'auto' }}>{selectedNodeData.notes}</p>
                  )}
                </>
              )}

              {isEditMode && editingNode !== selectedNode && (
                <>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <button onClick={() => startEditing(selectedNode!)} style={{ flex: 1, padding: 6, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 4, color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>Edit</button>
                    {(childCounts[selectedNode!] || 0) > 0 && (
                      <button onClick={() => toggleCollapse(selectedNode!)}
                        style={{ padding: '6px 8px', background: 'rgba(6,182,212,0.15)', border: 'none', borderRadius: 4, color: '#06b6d4', cursor: 'pointer', fontSize: '0.7rem' }}>
                        {selectedNodeData.collapsed ? 'Expand' : 'Collapse'}
                      </button>
                    )}
                    <button onClick={() => deleteNodeTree(selectedNode!)} style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 4, color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Del</button>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Color</label>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {NODE_COLORS.map(c => (
                        <button key={c} onClick={() => updateNode(selectedNode!, { color: c })}
                          style={{ width: 18, height: 18, borderRadius: 4, background: c, border: selectedNodeData.color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Properties */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, marginTop: 8, fontSize: '0.7rem' }}>
                <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Properties</label>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Position:</span><span style={{ color: '#94a3b8' }}>({Math.round(selectedNodeData.x)}, {Math.round(selectedNodeData.y)})</span></div>
                {mapType === 'coordinate' && selectedNodeData.lat !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Coords:</span><span style={{ color: '#06b6d4' }}>{selectedNodeData.lat?.toFixed(4)}, {selectedNodeData.lng?.toFixed(4)}</span></div>
                )}
                {mapType === 'flowchart' && selectedNodeData.nodeType && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Type:</span><span style={{ color: '#f59e0b' }}>{FLOWCHART_SHAPES[selectedNodeData.nodeType]} {selectedNodeData.nodeType}</span></div>
                )}
                {mapType === 'hierarchy' && selectedNodeData.level !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Level:</span><span style={{ color: '#94a3b8' }}>{selectedNodeData.level}</span></div>
                )}
              </div>

              {/* Connections */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, marginTop: 8 }}>
                <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Connections ({selectedOutgoing.length + selectedIncoming.length})</label>
                {selectedOutgoing.map((l, i) => {
                  const tgt = nodes.find(n => n.id === l.target);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: tgt?.color || '#64748b', flexShrink: 0 }} />
                      &rarr; {tgt?.label || l.target}
                      {l.label && <span style={{ color: '#64748b', marginLeft: 'auto' }}>{l.label}</span>}
                      {isEditMode && <button onClick={() => removeLink(l.source, l.target)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>&times;</button>}
                    </div>
                  );
                })}
                {selectedIncoming.map((l, i) => {
                  const src = nodes.find(n => n.id === l.source);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: src?.color || '#64748b', flexShrink: 0 }} />
                      &larr; {src?.label || l.source}
                      {isEditMode && <button onClick={() => removeLink(l.source, l.target)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>&times;</button>}
                    </div>
                  );
                })}
                {selectedOutgoing.length === 0 && selectedIncoming.length === 0 && <p style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic', margin: 0 }}>No connections</p>}
              </div>
            </div>
          )}

          {/* Link mode indicator */}
          {linkMode.active && (
            <div style={{ border: '1px solid #0891b2', borderRadius: 6, padding: 8, background: 'rgba(8,145,178,0.15)' }}>
              <p style={{ fontSize: '0.7rem', color: '#06b6d4', margin: '0 0 4px' }}>
                {linkMode.sourceId ? 'Click target node to link/unlink' : 'Click source node'}
              </p>
              <button onClick={() => setLinkMode({ active: false, sourceId: null })} style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: '#06b6d4', cursor: 'pointer' }}>Cancel</button>
            </div>
          )}

          {/* Node list with search */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <input value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="Search nodes..."
              style={{ width: '100%', padding: '4px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.7rem', marginBottom: 4 }}
            />
            <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 4 }}>
              {searchFilter ? `${filteredNodes.length} of ${nodes.length}` : `All Nodes (${nodes.length})`}
            </label>
            {filteredNodes.map(node => (
              <button key={node.id}
                onClick={() => linkMode.active ? handleLinkClick(node.id) : setSelectedNode(node.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '5px 8px', border: 'none', borderRadius: 4, fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: selectedNode === node.id ? '#fff' : '#94a3b8',
                  background: selectedNode === node.id ? '#0891b2' : 'transparent',
                  cursor: 'pointer', marginBottom: 1,
                }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: node.color, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{node.label}</span>
                {node.collapsed && <span style={{ fontSize: '0.55rem', color: '#06b6d4' }}>+{childCounts[node.id] || 0}</span>}
                {node.notes && <span style={{ fontSize: '0.55rem', color: '#fbbf24' }}>N</span>}
                {mapType === 'coordinate' && node.lat != null && (
                  <span style={{ fontSize: '0.55rem', color: '#06b6d4', flexShrink: 0 }}>{node.lat.toFixed(2)},{node.lng?.toFixed(2)}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Coordinate map: Leaflet view */}
        {mapType === 'coordinate' ? (
          <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>Loading map...</div>}>
            <CoordinateMapView
              nodes={nodes}
              links={links}
              selectedNode={selectedNode}
              isEditMode={isEditMode}
              linkMode={linkMode}
              onNodeClick={(nodeId) => {
                if (linkMode.active) handleLinkClick(nodeId);
                else setSelectedNode(nodeId);
              }}
              onNodeDragEnd={(nodeId, lat, lng) => {
                const pos = latLngToCanvas(lat, lng, coordInfo.center);
                updateNode(nodeId, { lat, lng, x: pos.x, y: pos.y });
              }}
              onAddNode={(lat, lng) => {
                setQuickAddLat(lat.toString());
                setQuickAddLng(lng.toString());
                setPendingPos({ x: 0, y: 0 });
                setShowQuickAdd(true);
                setQuickAddLabel('');
              }}
              onContextMenu={(x, y, nodeId, lat, lng) => {
                setContextMenu({ x, y, nodeId, lat, lng });
              }}
              namedLocations={namedLocations}
              onAddNamedLocation={onAddNamedLocation}
              defaultLocation={defaultLocation}
            />
          </Suspense>
        ) : (
          /* Force graph canvas for other map types */
          <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0f172a' }}
            onDoubleClick={e => {
              if (!isEditMode) return;
              const rect = containerRef.current!.getBoundingClientRect();
              setPendingPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              setShowQuickAdd(true);
              setQuickAddLabel('');
            }}
            onContextMenu={e => {
              e.preventDefault();
              if (!isEditMode) return;
              const rect = containerRef.current!.getBoundingClientRect();
              setContextMenu({ x: e.clientX, y: e.clientY, canvasX: e.clientX - rect.left, canvasY: e.clientY - rect.top });
            }}
          >
            {nodes.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Start building your map</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>{isEditMode ? 'Double-click or right-click to add a node' : 'Switch to Edit mode'}</p>
              </div>
            ) : (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={(node: any) => node.label}
                nodeVal={(node: any) => node.val}
                nodeCanvasObject={nodeCanvasObject}
                linkWidth={(link: any) => {
                  const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                  const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                  return selectedNode && (srcId === selectedNode || tgtId === selectedNode) ? 3 : 1.5;
                }}
                linkColor={(link: any) => {
                  const srcId = typeof link.source === 'object' ? link.source.id : link.source;
                  const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
                  return selectedNode && (srcId === selectedNode || tgtId === selectedNode) ? 'rgba(56,189,248,0.7)' : 'rgba(255,255,255,0.2)';
                }}
                linkCurvature={0.15}
                linkDirectionalArrowLength={8}
                linkDirectionalArrowRelPos={0.85}
                linkDirectionalArrowColor={() => 'rgba(255,255,255,0.4)'}
                linkCanvasObjectMode={() => 'after'}
                linkCanvasObject={linkCanvasObject}
                dagMode={mapType === 'hierarchy' ? 'td' : mapType === 'flowchart' ? 'lr' : undefined}
                dagLevelDistance={mapType === 'hierarchy' || mapType === 'flowchart' ? 80 : undefined}
                onNodeClick={(node: any) => {
                  if (linkMode.active) handleLinkClick(node.id);
                  else setSelectedNode(node.id);
                }}
                onNodeRightClick={(node: any, event: MouseEvent) => {
                  event.preventDefault();
                  if (!isEditMode) return;
                  setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
                }}
                onNodeDragEnd={(node: any) => {
                  updateNode(node.id, { x: Math.round(node.x), y: Math.round(node.y) });
                }}
                enableNodeDrag={isEditMode && !linkMode.active}
                backgroundColor="transparent"
                onEngineStop={() => {
                  if ((mapType === 'hierarchy' || mapType === 'flowchart') && graphRef.current) {
                    graphRef.current.zoomToFit(400, 40);
                  }
                }}
              />
            )}

            {/* Zoom controls */}
            {nodes.length > 0 && (
              <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
                <button onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300)} style={zoomBtnStyle} title="Zoom in">+</button>
                <button onClick={() => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300)} style={zoomBtnStyle} title="Zoom out">&minus;</button>
                <button onClick={() => graphRef.current?.zoomToFit(400, 40)} style={zoomBtnStyle} title="Fit to screen">&#x229E;</button>
              </div>
            )}
          </div>
        )}

        {/* Quick add popup */}
        {showQuickAdd && (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#1e293b', border: '1px solid #0891b2', borderRadius: 8, padding: 10, zIndex: 1100, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>+ Quick Add</span>
              <button onClick={() => { setShowQuickAdd(false); setPendingPos(null); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>
            <input value={quickAddLabel} onChange={e => setQuickAddLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); if (e.key === 'Escape') { setShowQuickAdd(false); setPendingPos(null); } }}
              placeholder="Node label..." autoFocus
              style={{ width: 200, padding: '6px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.85rem' }}
            />
            {mapType === 'coordinate' && (
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <input value={quickAddLat} onChange={e => setQuickAddLat(e.target.value)} placeholder="Lat"
                  style={{ flex: 1, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 4, color: '#06b6d4', fontSize: '0.7rem' }} />
                <input value={quickAddLng} onChange={e => setQuickAddLng(e.target.value)} placeholder="Lng"
                  style={{ flex: 1, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 4, color: '#06b6d4', fontSize: '0.7rem' }} />
              </div>
            )}
            {selectedNode && <p style={{ fontSize: '0.65rem', color: '#06b6d4', margin: '4px 0 0' }}>Will link to: {nodes.find(n => n.id === selectedNode)?.label}</p>}
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              <button onClick={handleQuickAdd} disabled={!quickAddLabel.trim()} style={{ flex: 1, padding: 6, background: '#0891b2', border: 'none', borderRadius: 4, color: '#fff', fontSize: '0.8rem', cursor: 'pointer', opacity: quickAddLabel.trim() ? 1 : 0.4 }}>Add</button>
              <button onClick={() => { setShowQuickAdd(false); setPendingPos(null); }} style={{ flex: 1, padding: 6, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 4, color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Context menu */}
        {contextMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1050 }} onClick={() => setContextMenu(null)} />
            <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', padding: '4px 0', zIndex: 1060, minWidth: 160 }}>
              {contextMenu.nodeId ? (
                <>
                  <div style={{ padding: '4px 12px', fontSize: '0.65rem', color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {nodes.find(n => n.id === contextMenu.nodeId)?.label}
                  </div>
                  <button onClick={() => { addChildNode(contextMenu.nodeId!); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <span style={{ color: '#10b981' }}>+</span> Add Child
                  </button>
                  <button onClick={() => { setLinkMode({ active: true, sourceId: contextMenu.nodeId! }); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <span style={{ color: '#06b6d4' }}>~</span> Link to...
                  </button>
                  <button onClick={() => { startEditing(contextMenu.nodeId!); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Edit
                  </button>
                  {(childCounts[contextMenu.nodeId!] || 0) > 0 && (
                    <button onClick={() => { toggleCollapse(contextMenu.nodeId!); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#06b6d4', fontSize: '0.8rem', cursor: 'pointer' }}>
                      {nodes.find(n => n.id === contextMenu.nodeId)?.collapsed ? 'Expand' : 'Collapse'}
                    </button>
                  )}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                  <button onClick={() => { deleteNodeTree(contextMenu.nodeId!); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => {
                    const extra: Partial<MindMapNode> = {};
                    if (contextMenu.lat != null && contextMenu.lng != null) {
                      extra.lat = contextMenu.lat; extra.lng = contextMenu.lng;
                    }
                    const id = addNode('New Node', contextMenu.canvasX || 200, contextMenu.canvasY || 200, null, extra);
                    startEditing(id); setContextMenu(null);
                  }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <span style={{ color: '#10b981' }}>+</span> Add Node Here
                    {contextMenu.lat != null && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#06b6d4' }}>{contextMenu.lat.toFixed(2)}, {contextMenu.lng?.toFixed(2)}</span>}
                  </button>
                  {selectedNode && (
                    <button onClick={() => {
                      const extra: Partial<MindMapNode> = {};
                      if (contextMenu.lat != null && contextMenu.lng != null) {
                        extra.lat = contextMenu.lat; extra.lng = contextMenu.lng;
                      }
                      const id = addNode('New Node', contextMenu.canvasX || 200, contextMenu.canvasY || 200, selectedNode, extra);
                      startEditing(id); setContextMenu(null);
                    }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <span style={{ color: '#06b6d4' }}>~</span> Add & Link to Selected
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default memo(MindMapViewer);
