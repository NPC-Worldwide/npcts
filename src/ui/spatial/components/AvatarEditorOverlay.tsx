/**
 * AvatarEditorOverlay Component - Real Avatar Editor
 *
 * Features:
 * - Upload custom sprite sheet
 * - Pick from avatar gallery
 * - Character part customization (hair, eyes, body, clothes)
 * - Display name and status
 * - Live preview
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Types
export type AvatarAccessory = 'none' | 'hat' | 'glasses' | 'crown' | 'halo' | 'horns' | 'cat-ears' | 'headphones' | 'bow' | 'bandana';
export type AvatarTrailEffect = 'none' | 'sparkle' | 'glow' | 'shadow' | 'hearts' | 'fire' | 'ice' | 'leaves';
export type AvatarEmote = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'sleeping' | 'love' | 'cool';

export interface AvatarParts {
  body?: string;
  hair?: string;
  eyes?: string;
  clothes?: string;
}

export interface AvatarSettings {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  outlineColor: string;
  size: number;
  showNameTag: boolean;
  nameTagColor: string;
  trailEffect: AvatarTrailEffect;
  accessory: AvatarAccessory;
  statusMessage?: string;
  emote?: AvatarEmote;
  moveSpeed?: number;
  nameTagStyle?: 'default' | 'bubble' | 'minimal' | 'fancy';
  useCustomColors?: boolean;
  // New fields for real avatar editing
  customSprite?: string; // URL to custom uploaded sprite
  selectedAvatar?: string; // ID of selected gallery avatar
  parts?: AvatarParts; // Selected parts for modular avatar
}

export interface AvatarEditorOverlayProps {
  visible: boolean;
  onClose: () => void;
  settings: AvatarSettings;
  onSave: (settings: AvatarSettings) => void;
  previewSpriteUrl?: string;
  onUploadSprite?: (file: File) => Promise<string>;
}

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
  statusMessage: '',
  emote: 'neutral',
  moveSpeed: 1.0,
  nameTagStyle: 'default',
  useCustomColors: false,
};

// Pre-made avatar gallery
const AVATAR_GALLERY = [
  { id: 'aureliano', name: 'Aureliano', preview: '/images/sprites/aureliano/0.png' },
  { id: 'martian', name: 'Martian', preview: '/images/sprites/martian_sprite.png' },
];

// Part options (would be loaded from /api/avatar-parts in production)
const PART_OPTIONS = {
  body: [
    { id: 'default', name: 'Default', color: '#f5d0c5' },
    { id: 'tan', name: 'Tan', color: '#d4a574' },
    { id: 'dark', name: 'Dark', color: '#8d5524' },
    { id: 'pale', name: 'Pale', color: '#ffe4d6' },
  ],
  hair: [
    { id: 'none', name: 'None', color: 'transparent' },
    { id: 'black', name: 'Black', color: '#1a1a1a' },
    { id: 'brown', name: 'Brown', color: '#4a3728' },
    { id: 'blonde', name: 'Blonde', color: '#d4a855' },
    { id: 'red', name: 'Red', color: '#8b2500' },
    { id: 'blue', name: 'Blue', color: '#3b82f6' },
    { id: 'pink', name: 'Pink', color: '#ec4899' },
    { id: 'white', name: 'White', color: '#e5e5e5' },
  ],
  eyes: [
    { id: 'brown', name: 'Brown', color: '#5c4033' },
    { id: 'blue', name: 'Blue', color: '#4a90d9' },
    { id: 'green', name: 'Green', color: '#22c55e' },
    { id: 'gray', name: 'Gray', color: '#6b7280' },
    { id: 'purple', name: 'Purple', color: '#8b5cf6' },
    { id: 'red', name: 'Red', color: '#ef4444' },
  ],
  clothes: [
    { id: 'casual', name: 'Casual', color: '#3b82f6' },
    { id: 'formal', name: 'Formal', color: '#1e293b' },
    { id: 'sporty', name: 'Sporty', color: '#22c55e' },
    { id: 'punk', name: 'Punk', color: '#ef4444' },
    { id: 'cozy', name: 'Cozy', color: '#f59e0b' },
  ],
};

type TabType = 'gallery' | 'parts' | 'details';

export const AvatarEditorOverlay: React.FC<AvatarEditorOverlayProps> = ({
  visible,
  onClose,
  settings,
  onSave,
  previewSpriteUrl,
  onUploadSprite,
}) => {
  const [local, setLocal] = useState<AvatarSettings>(settings);
  const [activeTab, setActiveTab] = useState<TabType>('gallery');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(settings);
  }, [settings, visible]);

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

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadSprite) return;

    setIsUploading(true);
    try {
      const url = await onUploadSprite(file);
      setLocal(prev => ({ ...prev, customSprite: url, selectedAvatar: undefined }));
    } catch (err) {
      console.error('Failed to upload sprite:', err);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSprite]);

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  if (!visible) return null;

  // Determine which sprite to show in preview
  const previewSprite = local.customSprite ||
    (local.selectedAvatar ? AVATAR_GALLERY.find(a => a.id === local.selectedAvatar)?.preview : null) ||
    previewSpriteUrl;

  return (
    <>
      <style>{`
        @keyframes avatarFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes avatarSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'avatarFadeIn 0.15s',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1e1e2e',
            borderRadius: 16,
            width: 500,
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            animation: 'avatarSlideUp 0.2s',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>Avatar Editor</span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 22,
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
              }}
            >×</button>
          </div>

          {/* Preview + Tabs */}
          <div style={{ display: 'flex', padding: 20, gap: 20 }}>
            {/* Preview */}
            <div style={{
              width: 140,
              height: 160,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              flexShrink: 0,
            }}>
              {previewSprite ? (
                <img
                  src={previewSprite}
                  alt="Avatar preview"
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                  }}
                />
              ) : (
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${local.parts?.body ? PART_OPTIONS.body.find(b => b.id === local.parts?.body)?.color || '#f5d0c5' : '#f5d0c5'}, #e0c0b5)`,
                  border: '3px solid #ccc',
                }} />
              )}
              {local.showNameTag && (
                <div style={{
                  fontSize: 12,
                  color: local.nameTagColor,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  padding: '2px 8px',
                  borderRadius: 4,
                }}>
                  {local.name || 'Player'}
                </div>
              )}
              {local.statusMessage && (
                <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                  "{local.statusMessage}"
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {(['gallery', 'parts', 'details'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: activeTab === tab ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                      border: activeTab === tab ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                      borderRadius: 8,
                      color: activeTab === tab ? '#fff' : '#94a3b8',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{ minHeight: 180 }}>
                {activeTab === 'gallery' && (
                  <div>
                    {/* Upload Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !onUploadSprite}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(59,130,246,0.1)',
                        border: '2px dashed rgba(59,130,246,0.3)',
                        borderRadius: 8,
                        color: '#3b82f6',
                        fontSize: 13,
                        cursor: onUploadSprite ? 'pointer' : 'not-allowed',
                        marginBottom: 12,
                        opacity: onUploadSprite ? 1 : 0.5,
                      }}
                    >
                      {isUploading ? 'Uploading...' : '📤 Upload Custom Sprite'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUpload}
                      style={{ display: 'none' }}
                    />

                    {/* Gallery Grid */}
                    <div style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>
                      Or pick from gallery:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {AVATAR_GALLERY.map((avatar) => (
                        <button
                          key={avatar.id}
                          onClick={() => setLocal(prev => ({
                            ...prev,
                            selectedAvatar: avatar.id,
                            customSprite: undefined,
                          }))}
                          style={{
                            padding: 8,
                            background: local.selectedAvatar === avatar.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                            border: local.selectedAvatar === avatar.id ? '2px solid #3b82f6' : '2px solid transparent',
                            borderRadius: 10,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <img
                            src={avatar.preview}
                            alt={avatar.name}
                            style={{
                              width: 48,
                              height: 48,
                              objectFit: 'contain',
                              imageRendering: 'pixelated',
                            }}
                          />
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{avatar.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'parts' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Body/Skin */}
                    <div>
                      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Skin Tone</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {PART_OPTIONS.body.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setLocal(prev => ({
                              ...prev,
                              parts: { ...prev.parts, body: opt.id },
                            }))}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: opt.color,
                              border: local.parts?.body === opt.id ? '3px solid #3b82f6' : '2px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer',
                            }}
                            title={opt.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Hair */}
                    <div>
                      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Hair</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {PART_OPTIONS.hair.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setLocal(prev => ({
                              ...prev,
                              parts: { ...prev.parts, hair: opt.id },
                            }))}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: opt.color === 'transparent' ? 'repeating-linear-gradient(45deg, #333, #333 4px, #444 4px, #444 8px)' : opt.color,
                              border: local.parts?.hair === opt.id ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer',
                            }}
                            title={opt.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Eyes */}
                    <div>
                      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Eyes</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {PART_OPTIONS.eyes.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setLocal(prev => ({
                              ...prev,
                              parts: { ...prev.parts, eyes: opt.id },
                            }))}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: opt.color,
                              border: local.parts?.eyes === opt.id ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer',
                            }}
                            title={opt.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Clothes */}
                    <div>
                      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Outfit</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {PART_OPTIONS.clothes.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => setLocal(prev => ({
                              ...prev,
                              parts: { ...prev.parts, clothes: opt.id },
                            }))}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              background: local.parts?.clothes === opt.id ? opt.color : 'rgba(255,255,255,0.05)',
                              border: local.parts?.clothes === opt.id ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                              color: local.parts?.clothes === opt.id ? '#fff' : '#94a3b8',
                              fontSize: 11,
                              cursor: 'pointer',
                            }}
                          >
                            {opt.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'details' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Name */}
                    <div>
                      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Display Name</div>
                      <input
                        type="text"
                        value={local.name}
                        onChange={(e) => setLocal(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your name"
                        maxLength={20}
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
                        }}
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>Status Message</div>
                      <input
                        type="text"
                        value={local.statusMessage || ''}
                        onChange={(e) => setLocal(prev => ({ ...prev, statusMessage: e.target.value }))}
                        placeholder="What's on your mind?"
                        maxLength={50}
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
                        }}
                      />
                    </div>

                    {/* Show Name Tag Toggle */}
                    <div
                      onClick={() => setLocal(prev => ({ ...prev, showNameTag: !prev.showNameTag }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: '#94a3b8', fontSize: 13 }}>Show Name Tag</span>
                      <div style={{
                        width: 36,
                        height: 20,
                        borderRadius: 10,
                        background: local.showNameTag ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                        position: 'relative',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 2,
                          left: local.showNameTag ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'all 0.2s',
                        }} />
                      </div>
                    </div>

                    {/* Move Speed */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#64748b', fontSize: 11 }}>Move Speed</span>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{Math.round((local.moveSpeed || 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={local.moveSpeed || 1}
                        onChange={(e) => setLocal(prev => ({ ...prev, moveSpeed: parseFloat(e.target.value) }))}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 20px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 8,
                color: '#94a3b8',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >Save Avatar</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AvatarEditorOverlay;
