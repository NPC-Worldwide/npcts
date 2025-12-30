/**
 * AvatarEditorOverlay Component
 *
 * Lets users customize their character appearance - colors, accessories, name display.
 * Inspired by MMO character customization (Puzzle Pirates, etc.)
 */

import React, { useState, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface AvatarSettings {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  outlineColor: string;
  size: number; // 0.5 to 2.0 scale
  showNameTag: boolean;
  nameTagColor: string;
  trailEffect: 'none' | 'sparkle' | 'glow' | 'shadow';
  accessory: 'none' | 'hat' | 'glasses' | 'crown' | 'halo';
}

export interface AvatarEditorOverlayProps {
  visible: boolean;
  onClose: () => void;
  settings: AvatarSettings;
  onSave: (settings: AvatarSettings) => void;
  /** Sprite URL to show in preview (e.g., Aurelianos sprite) */
  previewSpriteUrl?: string;
}

// =============================================================================
// Default Avatar Settings
// =============================================================================

export const DEFAULT_AVATAR_SETTINGS: AvatarSettings = {
  name: 'Player',
  primaryColor: '#4a90d9',
  secondaryColor: '#2d5a8a',
  outlineColor: '#1a3a5c',
  size: 1.0,
  showNameTag: true,
  nameTagColor: '#ffffff',
  trailEffect: 'none',
  accessory: 'none',
};

// =============================================================================
// Color Presets
// =============================================================================

const COLOR_PRESETS = [
  { name: 'Ocean', primary: '#4a90d9', secondary: '#2d5a8a', outline: '#1a3a5c' },
  { name: 'Forest', primary: '#4ade80', secondary: '#22c55e', outline: '#166534' },
  { name: 'Sunset', primary: '#fb923c', secondary: '#ea580c', outline: '#9a3412' },
  { name: 'Berry', primary: '#c084fc', secondary: '#a855f7', outline: '#6b21a8' },
  { name: 'Rose', primary: '#fb7185', secondary: '#e11d48', outline: '#9f1239' },
  { name: 'Gold', primary: '#fbbf24', secondary: '#d97706', outline: '#92400e' },
  { name: 'Slate', primary: '#94a3b8', secondary: '#64748b', outline: '#334155' },
  { name: 'Midnight', primary: '#6366f1', secondary: '#4f46e5', outline: '#3730a3' },
];

const ACCESSORY_OPTIONS = [
  { id: 'none', label: 'None', emoji: '—' },
  { id: 'hat', label: 'Hat', emoji: '🎩' },
  { id: 'glasses', label: 'Glasses', emoji: '👓' },
  { id: 'crown', label: 'Crown', emoji: '👑' },
  { id: 'halo', label: 'Halo', emoji: '😇' },
];

const TRAIL_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'sparkle', label: 'Sparkle ✨' },
  { id: 'glow', label: 'Glow 🌟' },
  { id: 'shadow', label: 'Shadow 👤' },
];

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
    maxWidth: 600,
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
    background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
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
    display: 'flex',
    gap: 24,
  },
  previewColumn: {
    flex: '0 0 180px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 16,
  },
  previewContainer: {
    width: 150,
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  previewAvatar: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAccessory: {
    position: 'absolute' as const,
    top: -15,
    fontSize: 24,
  },
  previewNameTag: {
    position: 'absolute' as const,
    bottom: -24,
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    whiteSpace: 'nowrap' as const,
  },
  settingsColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  colorPreset: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 10,
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  colorPresetSelected: {
    borderColor: '#fff',
    boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.5)',
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8,
  },
  optionButton: {
    padding: '10px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: '#e5e7eb',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
    color: '#fff',
  },
  slider: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    appearance: 'none' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  toggleLabel: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative' as const,
  },
  toggleSwitchOn: {
    backgroundColor: '#6366f1',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: 2,
    left: 2,
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#fff',
    transition: 'all 0.2s',
  },
  toggleKnobOn: {
    left: 22,
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
    background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    color: '#fff',
  },
  buttonSecondary: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#e5e7eb',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
};

// =============================================================================
// AvatarEditorOverlay Component
// =============================================================================

// Helper to calculate color filter from hex color
const getColorFilter = (hexColor: string) => {
  if (!hexColor) return 'none';

  const hex = hexColor;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Calculate hue from RGB
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;

  if (max !== min) {
    const d = max - min;
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else hue = ((r - g) / d + 4) * 60;
  }

  // Aurelianos is roughly blue (hue ~200), so calculate offset
  const baseHue = 200;
  const hueRotate = hue - baseHue;

  // Also adjust saturation based on color intensity
  const saturation = max === 0 ? 0 : ((max - min) / max) * 100;
  const saturationAdjust = saturation / 50;

  return `hue-rotate(${hueRotate}deg) saturate(${saturationAdjust})`;
};

export const AvatarEditorOverlay: React.FC<AvatarEditorOverlayProps> = ({
  visible,
  onClose,
  settings,
  onSave,
  previewSpriteUrl,
}) => {
  const [local, setLocal] = useState<AvatarSettings>(settings);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  useEffect(() => {
    setLocal(settings);
    // Find matching preset
    const presetIndex = COLOR_PRESETS.findIndex(
      p => p.primary === settings.primaryColor && p.secondary === settings.secondaryColor
    );
    setSelectedPreset(presetIndex >= 0 ? presetIndex : null);
  }, [settings, visible]);

  // ESC to close
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  const handlePresetSelect = (index: number) => {
    const preset = COLOR_PRESETS[index];
    setSelectedPreset(index);
    setLocal(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      outlineColor: preset.outline,
    }));
  };

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Generate color filter for sprite
  const colorFilter = getColorFilter(local.primaryColor);

  // Generate avatar preview style
  const avatarStyle: React.CSSProperties = {
    ...styles.previewAvatar,
    width: 60 * local.size,
    height: 60 * local.size,
    ...(previewSpriteUrl ? {} : {
      background: `radial-gradient(circle at 30% 30%, ${local.primaryColor}, ${local.secondaryColor})`,
      border: `3px solid ${local.outlineColor}`,
    }),
    boxShadow: local.trailEffect === 'glow'
      ? `0 0 20px ${local.primaryColor}80`
      : local.trailEffect === 'shadow'
      ? '5px 5px 15px rgba(0,0,0,0.5)'
      : 'none',
  };

  // Sprite style with color filter
  const spriteStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    imageRendering: 'pixelated',
    filter: colorFilter,
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
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .avatar-editor-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
        }
      `}</style>

      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.container} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.titleContainer}>
              <div style={styles.titleIcon}>🎭</div>
              <div>
                <h2 style={styles.title}>Customize Avatar</h2>
                <p style={styles.subtitle}>Make it yours</p>
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
            {/* Preview Column */}
            <div style={styles.previewColumn}>
              <div style={styles.previewContainer}>
                <div style={avatarStyle}>
                  {/* Accessory above character */}
                  {local.accessory !== 'none' && (
                    <div style={{
                      ...styles.previewAccessory,
                      top: local.accessory === 'halo' ? -5 : -18,
                      filter: local.accessory === 'crown'
                        ? 'drop-shadow(0 2px 4px rgba(255,215,0,0.5))'
                        : local.accessory === 'halo'
                        ? 'drop-shadow(0 0 8px rgba(255,255,200,0.8))'
                        : 'none',
                    }}>
                      {ACCESSORY_OPTIONS.find(a => a.id === local.accessory)?.emoji}
                    </div>
                  )}

                  {/* Actual sprite or fallback circle */}
                  {previewSpriteUrl ? (
                    <img
                      src={previewSpriteUrl}
                      alt="Avatar preview"
                      style={spriteStyle}
                      draggable={false}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 30% 30%, ${local.primaryColor}, ${local.secondaryColor})`,
                      border: `3px solid ${local.outlineColor}`,
                    }} />
                  )}

                  {/* Sparkle effect */}
                  {local.trailEffect === 'sparkle' && (
                    <>
                      <span style={{ position: 'absolute', top: -8, right: -8, animation: 'sparkle 1s infinite', fontSize: 14 }}>✨</span>
                      <span style={{ position: 'absolute', bottom: -5, left: -10, animation: 'sparkle 1s infinite 0.3s', fontSize: 12 }}>✨</span>
                      <span style={{ position: 'absolute', top: '40%', right: -12, animation: 'sparkle 1s infinite 0.6s', fontSize: 10 }}>✨</span>
                    </>
                  )}
                </div>

                {/* Name tag */}
                {local.showNameTag && (
                  <div style={{ ...styles.previewNameTag, color: local.nameTagColor }}>
                    {local.name || 'Player'}
                  </div>
                )}
              </div>
              <p style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', margin: 0 }}>
                Preview
              </p>
            </div>

            {/* Settings Column */}
            <div style={styles.settingsColumn}>
              {/* Name */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Display Name</div>
                <input
                  type="text"
                  value={local.name}
                  onChange={(e) => setLocal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                  style={styles.input}
                  onKeyDown={(e) => e.stopPropagation()}
                  maxLength={20}
                />
              </div>

              {/* Color Presets */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Color Theme</div>
                <div style={styles.colorGrid}>
                  {COLOR_PRESETS.map((preset, index) => (
                    <div
                      key={preset.name}
                      title={preset.name}
                      style={{
                        ...styles.colorPreset,
                        background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.secondary} 100%)`,
                        ...(selectedPreset === index ? styles.colorPresetSelected : {}),
                      }}
                      onClick={() => handlePresetSelect(index)}
                      onMouseEnter={(e) => {
                        if (selectedPreset !== index) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Size */}
              <div style={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={styles.sectionTitle}>Size</div>
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>{Math.round(local.size * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={local.size}
                  onChange={(e) => setLocal(prev => ({ ...prev, size: parseFloat(e.target.value) }))}
                  style={styles.slider}
                  className="avatar-editor-slider"
                />
              </div>

              {/* Accessories */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Accessory</div>
                <div style={styles.optionGrid}>
                  {ACCESSORY_OPTIONS.map((acc) => (
                    <div
                      key={acc.id}
                      style={{
                        ...styles.optionButton,
                        ...(local.accessory === acc.id ? styles.optionButtonSelected : {}),
                      }}
                      onClick={() => setLocal(prev => ({ ...prev, accessory: acc.id as AvatarSettings['accessory'] }))}
                    >
                      <span style={{ fontSize: 18 }}>{acc.emoji}</span>
                      <span>{acc.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trail Effect */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Trail Effect</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {TRAIL_OPTIONS.map((trail) => (
                    <div
                      key={trail.id}
                      style={{
                        ...styles.optionButton,
                        ...(local.trailEffect === trail.id ? styles.optionButtonSelected : {}),
                      }}
                      onClick={() => setLocal(prev => ({ ...prev, trailEffect: trail.id as AvatarSettings['trailEffect'] }))}
                    >
                      {trail.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Show Name Tag */}
              <div style={styles.toggle}>
                <span style={styles.toggleLabel}>Show Name Tag</span>
                <div
                  style={{
                    ...styles.toggleSwitch,
                    ...(local.showNameTag ? styles.toggleSwitchOn : {}),
                  }}
                  onClick={() => setLocal(prev => ({ ...prev, showNameTag: !prev.showNameTag }))}
                >
                  <div
                    style={{
                      ...styles.toggleKnob,
                      ...(local.showNameTag ? styles.toggleKnobOn : {}),
                    }}
                  />
                </div>
              </div>
            </div>
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
              Save Avatar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AvatarEditorOverlay;
