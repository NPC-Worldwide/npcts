/**
 * EditRoomOverlay Component
 *
 * Allows editing existing room properties like name and background image.
 */

import React, { useState, useEffect, useRef } from 'react';
import { FloorTilePicker, type FloorTileOption } from './FloorTilePicker';

// =============================================================================
// Types
// =============================================================================

export interface RoomData {
  name: string;
  backgroundImage?: string;
  floorTile?: boolean;
  floorTileSize?: number;
  floorPattern?: string;
  floorPatternSize?: string;
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
  onSave: (
    oldName: string,
    newName: string,
    backgroundImage?: string,
    floorTile?: boolean,
    floorTileSize?: number,
    floorPattern?: string,
    floorPatternSize?: string
  ) => void;
  onDelete?: (roomName: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  canDelete?: boolean;
}

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  container: {
    backgroundColor: '#1e1e2e',
    borderRadius: 20,
    padding: 0,
    maxWidth: 480,
    width: '90%',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    animation: 'slideUp 0.3s ease-out',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 28px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },
  title: {
    margin: 0,
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#9ca3af',
    fontSize: 13,
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 10,
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: 22,
    transition: 'all 0.2s',
  },
  body: {
    padding: '24px 28px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imagePreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  imagePreviewPlaceholder: {
    color: '#6b7280',
    fontSize: 14,
  },
  fileInputContainer: {
    position: 'relative' as const,
  },
  fileInputLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    color: '#e5e7eb',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  fileInput: {
    position: 'absolute' as const,
    width: 0,
    height: 0,
    opacity: 0,
  },
  dangerZone: {
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
  },
  dangerTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 8,
  },
  dangerDescription: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 12,
  },
  deleteButton: {
    padding: '10px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  footer: {
    padding: '20px 28px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    padding: '12px 24px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff',
  },
  buttonSecondary: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#e5e7eb',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
};

// =============================================================================
// EditRoomOverlay Component
// =============================================================================

export const EditRoomOverlay: React.FC<EditRoomOverlayProps> = ({
  visible,
  onClose,
  roomName,
  backgroundImage,
  floorTile = false,
  floorTileSize = 100,
  floorPattern,
  floorPatternSize,
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
  const [isUploading, setIsUploading] = useState(false);
  const [showCustomUpload, setShowCustomUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNewName(roomName);
    setNewBackgroundImage(backgroundImage || '');
    setNewFloorTile(floorTile);
    setNewFloorTileSize(floorTileSize);
    setNewFloorPattern(floorPattern || '');
    setNewFloorPatternSize(floorPatternSize || '');
  }, [roomName, backgroundImage, floorTile, floorTileSize, floorPattern, floorPatternSize, visible]);

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
    onSave(
      roomName,
      newName.trim(),
      newBackgroundImage || undefined,
      newFloorTile,
      newFloorTileSize,
      newFloorPattern || undefined,
      newFloorPatternSize || undefined
    );
    onClose();
  };

  const handleTileSelect = (tile: FloorTileOption) => {
    if (tile.type === 'pattern') {
      // It's a procedural pattern
      setNewBackgroundImage('');
      setNewFloorPattern(tile.pattern || '');
      setNewFloorPatternSize(tile.patternSize || '');
      setNewFloorTile(false);
    } else {
      // It's an image tile
      setNewBackgroundImage(tile.url || '');
      setNewFloorPattern('');
      setNewFloorPatternSize('');
      setNewFloorTile(true); // Auto-enable tiling for built-in tiles
      setNewFloorTileSize(100);
    }
  };

  const handleCustomUpload = () => {
    setShowCustomUpload(true);
    fileInputRef.current?.click();
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to delete "${roomName}"? This cannot be undone.`)) {
      onDelete(roomName);
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.container} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.titleContainer}>
              <div style={styles.titleIcon}>🏠</div>
              <div>
                <h2 style={styles.title}>Edit Room</h2>
                <p style={styles.subtitle}>Modify room properties</p>
              </div>
            </div>
            <button
              style={styles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={styles.body}>
            {/* Room Name */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Room Name</div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter room name"
                style={styles.input}
                onKeyDown={(e) => e.stopPropagation()}
                maxLength={50}
              />
            </div>

            {/* Floor Style */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Floor Style</div>

              {/* Preview */}
              <div style={{
                ...styles.imagePreview,
                marginBottom: 16,
              }}>
                {newBackgroundImage ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${newBackgroundImage})`,
                    backgroundSize: newFloorTile ? `${newFloorTileSize}px ${newFloorTileSize}px` : 'cover',
                    backgroundRepeat: newFloorTile ? 'repeat' : 'no-repeat',
                    backgroundPosition: 'center',
                  }} />
                ) : newFloorPattern ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: newFloorPattern,
                    backgroundSize: newFloorPatternSize,
                  }} />
                ) : (
                  <span style={styles.imagePreviewPlaceholder}>Select a floor style below</span>
                )}
              </div>

              {/* Floor Tile Picker */}
              <FloorTilePicker
                value={newFloorPattern || newBackgroundImage}
                isPattern={!!newFloorPattern}
                onSelect={handleTileSelect}
                onUploadCustom={onUploadImage ? handleCustomUpload : undefined}
              />

              {/* Hidden file input for custom uploads */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={isUploading}
              />

              {/* Tile size slider - only for image tiles */}
              {newBackgroundImage && newFloorTile && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>Tile size:</span>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="10"
                    value={newFloorTileSize}
                    onChange={(e) => setNewFloorTileSize(Number(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <span style={{ color: '#e5e7eb', fontSize: 13, minWidth: 50 }}>
                    {newFloorTileSize}px
                  </span>
                </div>
              )}

              {/* Clear button */}
              {(newBackgroundImage || newFloorPattern) && (
                <button
                  onClick={() => {
                    setNewBackgroundImage('');
                    setNewFloorPattern('');
                    setNewFloorPatternSize('');
                    setNewFloorTile(false);
                  }}
                  style={{
                    ...styles.fileInputLabel,
                    marginTop: 12,
                    display: 'inline-flex',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  Clear Floor Style
                </button>
              )}
            </div>

            {/* Danger Zone */}
            {canDelete && onDelete && (
              <div style={styles.section}>
                <div style={styles.dangerZone}>
                  <div style={styles.dangerTitle}>Danger Zone</div>
                  <div style={styles.dangerDescription}>
                    Deleting this room will remove all its contents including apps and doors.
                  </div>
                  <button
                    style={styles.deleteButton}
                    onClick={handleDelete}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    }}
                  >
                    🗑️ Delete Room
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              Cancel
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonPrimary }}
              onClick={handleSave}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditRoomOverlay;
