/**
 * EditRoomOverlay Component - Compact Version
 */

import React, { useState, useEffect, useRef } from 'react';
import { FloorTilePicker, type FloorTileOption } from './FloorTilePicker';

export interface RoomData {
  name: string;
  backgroundImage?: string;
  floorTile?: boolean;
  floorTileSize?: number;
  floorPattern?: string;
  floorPatternSize?: string;
  outside?: boolean;
}

export interface EditRoomOverlayProps {
  visible: boolean;
  onClose: () => void;
  roomName: string;
  backgroundImage?: string;
  floorTile?: boolean;
  floorTileSize?: number;
  floorPattern?: string;
  floorPatternSize?: string;
  outside?: boolean;
  onSave: (
    oldName: string,
    newName: string,
    backgroundImage?: string,
    floorTile?: boolean,
    floorTileSize?: number,
    floorPattern?: string,
    floorPatternSize?: string,
    outside?: boolean
  ) => void;
  onDelete?: (roomName: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  canDelete?: boolean;
}

export const EditRoomOverlay: React.FC<EditRoomOverlayProps> = ({
  visible,
  onClose,
  roomName,
  backgroundImage,
  floorTile = false,
  floorTileSize = 100,
  floorPattern,
  floorPatternSize,
  outside = false,
  onSave,
  onDelete,
  onUploadImage,
  canDelete = true,
}) => {
  const [newName, setNewName] = useState(roomName);
  const [newBackgroundImage, setNewBackgroundImage] = useState(backgroundImage || '');
  const [newFloorTile, setNewFloorTile] = useState(floorTile);
  const [newFloorTileSize, setNewFloorTileSize] = useState(floorTileSize);
  const [newFloorPattern, setNewFloorPattern] = useState(floorPattern || '');
  const [newFloorPatternSize, setNewFloorPatternSize] = useState(floorPatternSize || '');
  const [newOutside, setNewOutside] = useState(outside);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNewName(roomName);
    setNewBackgroundImage(backgroundImage || '');
    setNewFloorTile(floorTile);
    setNewFloorTileSize(floorTileSize);
    setNewFloorPattern(floorPattern || '');
    setNewFloorPatternSize(floorPatternSize || '');
    setNewOutside(outside);
  }, [roomName, backgroundImage, floorTile, floorTileSize, floorPattern, floorPatternSize, outside, visible]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;
    setIsUploading(true);
    try {
      const uploadedUrl = await onUploadImage(file);
      setNewBackgroundImage(uploadedUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!newName.trim()) {
      alert('Room name is required');
      return;
    }
    onSave(roomName, newName.trim(), newBackgroundImage || undefined, newFloorTile, newFloorTileSize, newFloorPattern || undefined, newFloorPatternSize || undefined, newOutside);
    onClose();
  };

  const handleTileSelect = (tile: FloorTileOption) => {
    if (tile.type === 'pattern') {
      setNewBackgroundImage('');
      setNewFloorPattern(tile.pattern || '');
      setNewFloorPatternSize(tile.patternSize || '');
      setNewFloorTile(false);
    } else {
      setNewBackgroundImage(tile.url || '');
      setNewFloorPattern('');
      setNewFloorPatternSize('');
      setNewFloorTile(true);
      setNewFloorTileSize(100);
    }
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Delete "${roomName}"? This cannot be undone.`)) {
      onDelete(roomName);
      onClose();
    }
  };

  return (
    <>
      <style>{`
        @keyframes editRoomFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes editRoomSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'editRoomFadeIn 0.15s',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1e1e2e',
            borderRadius: 12,
            width: 340,
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            animation: 'editRoomSlideUp 0.2s',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header - just close button */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '10px 12px 0',
          }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 18,
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >×</button>
          </div>

          {/* Body */}
          <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
            {/* Room Name */}
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Room name"
              onKeyDown={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />

            {/* Online Toggle */}
            <div
              onClick={() => setNewOutside(!newOutside)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: newOutside ? 'rgba(45,106,79,0.2)' : 'rgba(255,255,255,0.03)',
                border: newOutside ? '1px solid rgba(45,106,79,0.4)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              <span style={{ color: newOutside ? '#95d5b2' : '#94a3b8', fontSize: 13 }}>
                Online (Multiplayer)
              </span>
              <div style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: newOutside ? '#2d6a4f' : 'rgba(255,255,255,0.1)',
                position: 'relative',
                transition: 'all 0.2s',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 2,
                  left: newOutside ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'all 0.2s',
                }} />
              </div>
            </div>

            {/* Floor Picker */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Floor</div>
              <FloorTilePicker
                value={newFloorPattern || newBackgroundImage}
                isPattern={!!newFloorPattern}
                onSelect={handleTileSelect}
                onUploadCustom={onUploadImage ? () => fileInputRef.current?.click() : undefined}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            </div>

            {/* Tile size slider */}
            {newBackgroundImage && !newFloorPattern && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>Size</span>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={newFloorTileSize}
                  onChange={(e) => { setNewFloorTileSize(Number(e.target.value)); setNewFloorTile(true); }}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={{ color: '#94a3b8', fontSize: 11, minWidth: 40 }}>{newFloorTileSize}px</span>
              </div>
            )}

            {/* Delete */}
            {canDelete && onDelete && (
              <button
                onClick={handleDelete}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: 0,
                  marginTop: 8,
                }}
              >
                Delete Room
              </button>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 6,
                color: '#94a3b8',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >Save</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditRoomOverlay;
