/**
 * EditAppOverlay Component
 *
 * Allows editing existing application properties like name, command, and image.
 */

import React, { useState, useEffect, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface AppData {
  name: string;
  command?: string;
  image?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditAppOverlayProps {
  visible: boolean;
  onClose: () => void;
  app: AppData | null;
  appKey: string;
  onSave: (appKey: string, updates: Partial<AppData>) => void;
  onDelete?: (appKey: string) => void;
  onUploadImage?: (file: File) => Promise<string>;
  availableCommands?: string[];
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
    maxWidth: 520,
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
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
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
  row: {
    display: 'flex',
    gap: 16,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    flex: 1,
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
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
  imagePreviewPlaceholder: {
    color: '#6b7280',
    fontSize: 24,
  },
  fileInputLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    color: '#e5e7eb',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  fileInput: {
    position: 'absolute' as const,
    width: 0,
    height: 0,
    opacity: 0,
  },
  commandList: {
    maxHeight: 120,
    overflowY: 'auto' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    marginBottom: 10,
  },
  commandItem: {
    padding: '10px 14px',
    color: '#e5e7eb',
    fontSize: 13,
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'all 0.2s',
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
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: '#fff',
  },
  buttonSecondary: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#e5e7eb',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
};

// =============================================================================
// EditAppOverlay Component
// =============================================================================

export const EditAppOverlay: React.FC<EditAppOverlayProps> = ({
  visible,
  onClose,
  app,
  appKey,
  onSave,
  onDelete,
  onUploadImage,
  availableCommands = [],
}) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [image, setImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (app) {
      setName(app.name || '');
      setCommand(app.command || '');
      setImage(app.image || '');
    }
  }, [app, visible]);

  if (!visible || !app) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;

    setIsUploading(true);
    try {
      const uploadedUrl = await onUploadImage(file);
      setImage(uploadedUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('App name is required');
      return;
    }
    onSave(appKey, {
      name: name.trim(),
      command: command.trim() || undefined,
      image: image || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      onDelete(appKey);
      onClose();
    }
  };

  const handleCommandSelect = (cmd: string) => {
    setCommand(cmd);
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
              <div style={styles.titleIcon}>📱</div>
              <div>
                <h2 style={styles.title}>Edit Application</h2>
                <p style={styles.subtitle}>Modify app properties</p>
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
            {/* Name and Image Row */}
            <div style={styles.row}>
              <div style={{ ...styles.section, flex: 1 }}>
                <div style={styles.sectionTitle}>App Name</div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Application"
                  style={styles.input}
                  onKeyDown={(e) => e.stopPropagation()}
                  maxLength={50}
                />
              </div>
              <div style={{ ...styles.section, flex: 0 }}>
                <div style={styles.sectionTitle}>Icon</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={styles.imagePreview}>
                    {image ? (
                      <img src={image} alt="App icon" style={styles.imagePreviewImg} />
                    ) : (
                      <span style={styles.imagePreviewPlaceholder}>📱</span>
                    )}
                  </div>
                  <label
                    style={styles.fileInputLabel}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    {isUploading ? '⏳' : '📁'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={styles.fileInput}
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Command */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Command</div>
              {availableCommands.length > 0 && (
                <div style={styles.commandList}>
                  {availableCommands.slice(0, 5).map((cmd) => (
                    <div
                      key={cmd}
                      style={{
                        ...styles.commandItem,
                        backgroundColor: command === cmd ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      }}
                      onClick={() => handleCommandSelect(cmd)}
                      onMouseEnter={(e) => {
                        if (command !== cmd) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (command !== cmd) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {cmd}
                    </div>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter command to execute"
                style={styles.input}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>

            {/* Danger Zone */}
            {onDelete && (
              <div style={styles.section}>
                <div style={styles.dangerZone}>
                  <div style={styles.dangerTitle}>Danger Zone</div>
                  <div style={styles.dangerDescription}>
                    Permanently delete this application from the room.
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
                    🗑️ Delete Application
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

export default EditAppOverlay;
