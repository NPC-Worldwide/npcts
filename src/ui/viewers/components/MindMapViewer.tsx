import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

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

export interface MindMapViewerProps {
  /** Initial data to load */
  initialData?: MindMapData;
  /** Called when data changes (for external persistence) */
  onChange?: (data: MindMapData) => void;
  /** Called when save is requested (Ctrl+S or save button) */
  onSave?: (data: MindMapData) => void | Promise<void>;
  /** Called when close/back is requested */
  onClose?: () => void;
  /** Start in edit mode */
  defaultEditMode?: boolean;
  /** CSS class for the root element */
  className?: string;
  /** Show the back button */
  showBack?: boolean;
}

const NODE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const MAP_TYPE_INFO: Record<MapType, { label: string; description: string }> = {
  freeform: { label: 'Free Association', description: 'Free-form mind map with no structure' },
  flowchart: { label: 'Flowchart', description: 'Process flow with decisions and steps' },
  coordinate: { label: 'Coordinate Map', description: 'Spatial map with queryable coordinates' },
  hierarchy: { label: 'Hierarchy', description: 'Tree structure with parent-child relationships' },
};

// Flowchart node shapes
const FLOWCHART_SHAPES: Record<string, string> = {
  start: '●', end: '◉', process: '▬', decision: '◇', default: '○',
};

export const MindMapViewer: React.FC<MindMapViewerProps> = ({
  initialData,
  onChange,
  onSave,
  onClose,
  defaultEditMode = true,
  className = '',
  showBack = true,
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; canvasX?: number; canvasY?: number } | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddLabel, setQuickAddLabel] = useState('');
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  // Coordinate map fields
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  // Flowchart fields
  const [editNodeType, setEditNodeType] = useState<string>('default');
  const [editLinkLabel, setEditLinkLabel] = useState('');

  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Build current data object
  const currentData = useCallback((): MindMapData => ({
    name: mapName, mapType, nodes, links, bounds,
  }), [mapName, mapType, nodes, links, bounds]);

  // Notify changes
  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  useEffect(() => {
    if (hasChanges && onChange) {
      onChange(currentData());
    }
  }, [nodes, links, mapName, mapType, bounds, hasChanges, onChange, currentData]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(currentData());
      setHasChanges(false);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, currentData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // ---- Node operations ----
  const addNode = useCallback((label: string, x: number, y: number, parentId: string | null = null, extra: Partial<MindMapNode> = {}) => {
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const color = NODE_COLORS[nodes.length % NODE_COLORS.length];
    const parentNode = parentId ? nodes.find(n => n.id === parentId) : null;
    const level = parentNode ? (parentNode.level || 0) + 1 : 0;

    const newNode: MindMapNode = {
      id, label, x, y, color, parentId,
      level,
      nodeType: mapType === 'flowchart' ? 'default' : undefined,
      ...extra,
    };
    setNodes(prev => [...prev, newNode]);

    if (parentId) {
      setLinks(prev => [...prev, { source: parentId, target: id }]);
    }

    markChanged();
    setSelectedNode(id);
    return id;
  }, [nodes, mapType, markChanged]);

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
      if (existing) {
        setLinks(prev => prev.filter(l => l !== existing));
      } else {
        setLinks(prev => [...prev, { source: linkMode.sourceId!, target: nodeId }]);
      }
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
    if (mapType === 'coordinate') {
      setEditLat(node.lat?.toString() || '');
      setEditLng(node.lng?.toString() || '');
    }
    if (mapType === 'flowchart') {
      setEditNodeType(node.nodeType || 'default');
    }
  }, [nodes, mapType]);

  const saveEdit = useCallback(() => {
    if (!editingNode || !editLabel.trim()) { setEditingNode(null); return; }
    const updates: Partial<MindMapNode> = { label: editLabel.trim() };
    if (mapType === 'coordinate') {
      if (editLat) updates.lat = parseFloat(editLat);
      if (editLng) updates.lng = parseFloat(editLng);
    }
    if (mapType === 'flowchart') {
      updates.nodeType = editNodeType as any;
    }
    updateNode(editingNode, updates);
    setEditingNode(null);
    setEditLabel('');
  }, [editingNode, editLabel, editLat, editLng, editNodeType, mapType, updateNode]);

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
    addNode(quickAddLabel.trim(), pendingPos.x, pendingPos.y, selectedNode);
    setQuickAddLabel('');
    setShowQuickAdd(false);
    setPendingPos(null);
  }, [quickAddLabel, pendingPos, selectedNode, addNode]);

  // ---- Add from sidebar ----
  const handleAddFromSidebar = useCallback(() => {
    if (!newNodeLabel.trim()) return;
    let x = 200 + Math.random() * 400, y = 100 + Math.random() * 200;
    if (selectedNode) {
      const parent = nodes.find(n => n.id === selectedNode);
      if (parent) {
        const cc = links.filter(l => l.source === selectedNode).length;
        const angle = (cc * 45 + 45) * (Math.PI / 180);
        x = parent.x + Math.cos(angle) * 150;
        y = parent.y + Math.sin(angle) * 100;
      }
    }
    addNode(newNodeLabel.trim(), x, y, selectedNode);
    setNewNodeLabel('');
  }, [newNodeLabel, selectedNode, nodes, links, addNode]);

  // ---- Graph data ----
  const graphData = useMemo(() => ({
    nodes: nodes.map(n => ({ ...n, val: n.parentId ? 6 : 10 })),
    links: links.map(l => ({ ...l })),
  }), [nodes, links]);

  const selectedNodeData = nodes.find(n => n.id === selectedNode);
  const selectedOutgoing = selectedNode ? links.filter(l => l.source === selectedNode) : [];
  const selectedIncoming = selectedNode ? links.filter(l => l.target === selectedNode) : [];

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

    // Flowchart: different shapes
    if (mapType === 'flowchart' && node.nodeType === 'decision') {
      // Diamond
      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = fill;
      const s = Math.max(w, h) * 0.7;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    } else if (mapType === 'flowchart' && (node.nodeType === 'start' || node.nodeType === 'end')) {
      // Rounded pill
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(node.x - w / 2 - 4, node.y - h / 2, w + 8, h, h / 2);
      ctx.fill();
    } else {
      // Default rounded rect
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

    // Coordinate badge
    if (mapType === 'coordinate' && node.lat !== undefined && node.lng !== undefined) {
      const coordText = `${node.lat.toFixed(2)}, ${node.lng.toFixed(2)}`;
      ctx.font = `${fontSize * 0.6}px -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(coordText, node.x, node.y + h / 2 + fontSize * 0.5);
    }
  }, [linkMode.sourceId, selectedNode, mapType]);

  // ---- Link canvas rendering (for flowchart labels) ----
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!link.label) return;
    const start = link.source;
    const end = link.target;
    if (typeof start !== 'object' || typeof end !== 'object') return;
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const fontSize = 10 / globalScale;
    ctx.font = `${fontSize}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(link.label, mx, my - fontSize * 0.6);
  }, []);

  return (
    <div className={`mindmap-viewer ${className}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="mindmap-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, background: 'rgba(0,0,0,0.3)' }}>
        {showBack && onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }} title="Back">
            ← Back
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
        {onSave && (
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            style={{ padding: '4px 8px', background: 'none', border: 'none', color: hasChanges ? '#e2e8f0' : '#475569', cursor: hasChanges ? 'pointer' : 'default', fontSize: '0.8rem' }}
            title="Save (Ctrl+S)"
          >
            💾
          </button>
        )}
        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
        {/* View/Edit toggle */}
        <div style={{ display: 'flex', gap: 2, padding: 2, background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setIsEditMode(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: 'none', borderRadius: 4, fontSize: '0.7rem', cursor: 'pointer', background: !isEditMode ? '#0891b2' : 'transparent', color: !isEditMode ? '#fff' : '#64748b' }}
          >
            👁 View
          </button>
          <button
            onClick={() => setIsEditMode(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: 'none', borderRadius: 4, fontSize: '0.7rem', cursor: 'pointer', background: isEditMode ? '#ea580c' : 'transparent', color: isEditMode ? '#fff' : '#64748b' }}
          >
            ✏️ Edit
          </button>
        </div>
        <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
        {isEditMode && (
          <button
            onClick={() => setLinkMode({ active: !linkMode.active, sourceId: null })}
            style={{ padding: '4px 8px', background: linkMode.active ? '#0891b2' : 'transparent', border: '1px solid ' + (linkMode.active ? '#0891b2' : 'transparent'), borderRadius: 4, color: linkMode.active ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
            title={linkMode.active ? 'Cancel linking' : 'Link/unlink nodes'}
          >
            🔗
          </button>
        )}
        <div style={{ flex: 1 }} />
        {isEditMode && <span style={{ fontSize: '0.65rem', color: '#475569' }}>Double-click to add node</span>}
        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 8 }}>
          {nodes.length} nodes, {links.length} links
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

          {/* Add node */}
          {isEditMode && (
            <div>
              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Add Node (or double-click canvas)</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  value={newNodeLabel}
                  onChange={e => setNewNodeLabel(e.target.value)}
                  placeholder="Node text..."
                  onKeyDown={e => e.key === 'Enter' && handleAddFromSidebar()}
                  style={{ flex: 1, padding: '6px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.8rem' }}
                />
                <button
                  onClick={handleAddFromSidebar}
                  disabled={!newNodeLabel.trim()}
                  style={{ padding: '6px 10px', background: '#0891b2', border: 'none', borderRadius: 4, color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: newNodeLabel.trim() ? 1 : 0.4 }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Selected node */}
          {selectedNodeData && (
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 8, background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Selected Node</span>
                <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>×</button>
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
                  {/* Coordinate fields */}
                  {mapType === 'coordinate' && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      <input value={editLat} onChange={e => setEditLat(e.target.value)} placeholder="Latitude"
                        style={{ flex: 1, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.7rem' }} />
                      <input value={editLng} onChange={e => setEditLng(e.target.value)} placeholder="Longitude"
                        style={{ flex: 1, padding: '4px 6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.7rem' }} />
                    </div>
                  )}
                  {/* Flowchart node type */}
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
                <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedNodeData.label}</p>
              )}

              {isEditMode && editingNode !== selectedNode && (
                <>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <button onClick={() => startEditing(selectedNode!)} style={{ flex: 1, padding: 6, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 4, color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>✏️ Edit</button>
                    <button onClick={() => deleteNodeTree(selectedNode!)} style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 4, color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>🗑</button>
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
                      → {tgt?.label || l.target}
                      {l.label && <span style={{ color: '#64748b', marginLeft: 'auto' }}>{l.label}</span>}
                      {isEditMode && <button onClick={() => removeLink(l.source, l.target)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>×</button>}
                    </div>
                  );
                })}
                {selectedIncoming.map((l, i) => {
                  const src = nodes.find(n => n.id === l.source);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: src?.color || '#64748b', flexShrink: 0 }} />
                      ← {src?.label || l.source}
                      {isEditMode && <button onClick={() => removeLink(l.source, l.target)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>×</button>}
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
                {linkMode.sourceId ? `Click target node to link/unlink` : 'Click source node'}
              </p>
              <button onClick={() => setLinkMode({ active: false, sourceId: null })} style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: '#06b6d4', cursor: 'pointer' }}>Cancel</button>
            </div>
          )}

          {/* Node list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <label style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginBottom: 4 }}>All Nodes ({nodes.length})</label>
            {nodes.map(node => (
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
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Graph canvas */}
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
              linkWidth={2}
              linkColor={() => 'rgba(255,255,255,0.25)'}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowRelPos={0.9}
              linkCanvasObjectMode={mapType === 'flowchart' ? () => 'after' : undefined}
              linkCanvasObject={mapType === 'flowchart' ? linkCanvasObject : undefined}
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
            />
          )}

          {/* Quick add popup */}
          {showQuickAdd && pendingPos && (
            <div style={{ position: 'absolute', left: Math.min(pendingPos.x, (containerRef.current?.clientWidth || 300) - 220), top: Math.min(pendingPos.y, (containerRef.current?.clientHeight || 200) - 120), background: '#1e293b', border: '1px solid #0891b2', borderRadius: 8, padding: 10, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>+ Quick Add</span>
                <button onClick={() => { setShowQuickAdd(false); setPendingPos(null); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>×</button>
              </div>
              <input value={quickAddLabel} onChange={e => setQuickAddLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); if (e.key === 'Escape') { setShowQuickAdd(false); setPendingPos(null); } }}
                placeholder="Node label..." autoFocus
                style={{ width: 180, padding: '6px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#e2e8f0', fontSize: '0.85rem' }}
              />
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
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setContextMenu(null)} />
              <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', padding: '4px 0', zIndex: 50, minWidth: 160 }}>
                {contextMenu.nodeId ? (
                  <>
                    <div style={{ padding: '4px 12px', fontSize: '0.65rem', color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {nodes.find(n => n.id === contextMenu.nodeId)?.label}
                    </div>
                    <button onClick={() => { addChildNode(contextMenu.nodeId!); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <span style={{ color: '#10b981' }}>+</span> Add Connected Node
                    </button>
                    <button onClick={() => { setLinkMode({ active: true, sourceId: contextMenu.nodeId! }); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <span style={{ color: '#06b6d4' }}>🔗</span> Link to Another Node
                    </button>
                    <button onClick={() => { startEditing(contextMenu.nodeId!); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <span style={{ color: '#f59e0b' }}>✏️</span> Edit
                    </button>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                    <button onClick={() => { deleteNodeTree(contextMenu.nodeId!); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}>
                      🗑 Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => {
                      const id = addNode('New Node', contextMenu.canvasX || 200, contextMenu.canvasY || 200);
                      startEditing(id);
                      setContextMenu(null);
                    }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <span style={{ color: '#10b981' }}>+</span> Add Node Here
                    </button>
                    {selectedNode && (
                      <button onClick={() => {
                        const id = addNode('New Node', contextMenu.canvasX || 200, contextMenu.canvasY || 200, selectedNode);
                        startEditing(id);
                        setContextMenu(null);
                      }} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <span style={{ color: '#06b6d4' }}>🔗</span> Add & Link to Selected
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(MindMapViewer);
