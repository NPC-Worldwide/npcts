/**
 * OutsideChatOverlay - Chat panel for multiplayer outside world
 *
 * Fixed-position chat at bottom of screen with dark theme.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { OutsideChatMessage } from '../../../core/spatial';

// =============================================================================
// Props
// =============================================================================

export interface OutsideChatOverlayProps {
  messages: OutsideChatMessage[];
  onSend: (content: string) => void;
  playerName: string;
}

// =============================================================================
// Component
// =============================================================================

export const OutsideChatOverlay: React.FC<OutsideChatOverlayProps> = ({
  messages,
  onSend,
  playerName,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Expand when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setIsExpanded(true);
    }
  }, [messages.length]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      onSend(trimmed);
      setInputValue('');
    },
    [inputValue, onSend]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Stop propagation so game doesn't move while typing
    e.stopPropagation();
  }, []);

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 50,
        left: 16,
        width: 360,
        maxHeight: isExpanded ? 280 : 44,
        backgroundColor: 'rgba(15, 15, 25, 0.9)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header / toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.1)' : 'none',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#95d5b2', fontSize: 12, fontWeight: 600 }}>
          Chat
        </span>
        <span style={{ color: '#6b7280', fontSize: 10 }}>
          {isExpanded ? 'click to collapse' : `${messages.length} messages`}
        </span>
      </div>

      {/* Messages */}
      {isExpanded && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minHeight: 0,
          }}
        >
          {messages.length === 0 && (
            <div style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', padding: 20 }}>
              No messages yet. Say hello!
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} style={{ fontSize: 12 }}>
              <span style={{ color: '#6b7280', fontSize: 10, marginRight: 6 }}>
                {formatTime(msg.timestamp)}
              </span>
              <span
                style={{
                  color: msg.senderName === playerName ? '#95d5b2' : '#a5b4fc',
                  fontWeight: 600,
                }}
              >
                {msg.senderName}
              </span>
              <span style={{ color: '#d1d5db' }}>: {msg.content}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      {isExpanded && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            padding: '8px 10px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '6px 10px',
              color: '#e5e7eb',
              fontSize: 12,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              marginLeft: 6,
              backgroundColor: '#2d6a4f',
              color: '#95d5b2',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
};
