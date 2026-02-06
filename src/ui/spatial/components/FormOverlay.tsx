/**
 * FormOverlay Component
 *
 * A modern, reusable form overlay for Add App, Add Room, and Edit App forms.
 * Provides consistent styling and animations across all forms.
 */

import React, { useState, useRef, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface FormOverlayProps {
  /** Title of the form */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Icon to show in header (emoji or component) */
  icon?: React.ReactNode;
  /** Whether the form is visible */
  visible: boolean;
  /** Called when form should close */
  onClose: () => void;
  /** Form content */
  children: React.ReactNode;
  /** Optional width */
  width?: number | string;
}

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}

export interface FormInputProps {
  id?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export interface FormButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export interface FormTabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export interface FormFileInputProps {
  id?: string;
  name?: string;
  accept?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.15s ease-out',
  },
  container: {
    position: 'relative' as const,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 0,
    maxWidth: 520,
    width: '90%',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    animation: 'slideUp 0.25s ease-out',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  titleIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
  },
  title: {
    margin: 0,
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 600,
  },
  subtitle: {
    margin: '2px 0 0 0',
    color: '#64748b',
    fontSize: 12,
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b',
    fontSize: 18,
    transition: 'all 0.15s',
  },
  body: {
    padding: '20px 24px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
  // Form elements
  field: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
    marginLeft: 2,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
    transition: 'all 0.15s',
    boxSizing: 'border-box' as const,
  },
  fileInput: {
    display: 'none',
  },
  fileLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 16px',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    border: '1px dashed rgba(59, 130, 246, 0.25)',
    borderRadius: 8,
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  button: {
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: 'none',
  },
  buttonPrimary: {
    background: '#3b82f6',
    color: '#fff',
  },
  buttonSecondary: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  buttonDanger: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  tabs: {
    display: 'flex',
    gap: 2,
    padding: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: '8px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: '#64748b',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  commandList: {
    maxHeight: 150,
    overflowY: 'auto' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 6,
  },
  commandItem: {
    padding: '7px 10px',
    borderRadius: 4,
    color: '#cbd5e1',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

// =============================================================================
// FormOverlay Component
// =============================================================================

export const FormOverlay: React.FC<FormOverlayProps> = ({
  title,
  subtitle,
  icon = '📝',
  visible,
  onClose,
  children,
  width,
}) => {
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
        <div
          style={{
            ...styles.container,
            ...(width ? { maxWidth: width } : {}),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - only if title provided */}
          {title ? (
            <div style={styles.header}>
              <div style={styles.titleContainer}>
                <div style={styles.titleIcon}>{icon}</div>
                <div>
                  <h2 style={styles.title}>{title}</h2>
                  {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
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
          ) : (
            /* Just X button floating in corner */
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: 18,
                cursor: 'pointer',
                padding: 4,
                lineHeight: 1,
                zIndex: 1,
              }}
            >
              ×
            </button>
          )}

          {/* Body */}
          <div style={{
            ...styles.body,
            ...(!title ? { paddingTop: 28 } : {}),
          }}>{children}</div>
        </div>
      </div>
    </>
  );
};

// =============================================================================
// Form Sub-components
// =============================================================================

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required,
  children,
}) => (
  <div style={styles.field}>
    <label style={styles.label} htmlFor={htmlFor}>
      {label}
      {required && <span style={styles.required}>*</span>}
    </label>
    {children}
  </div>
);

export const FormInput: React.FC<FormInputProps> = ({
  id,
  name,
  type = 'text',
  placeholder,
  required,
  value,
  onChange,
  onKeyDown,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={onChange}
      onKeyDown={(e) => {
        e.stopPropagation();
        onKeyDown?.(e);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        ...styles.input,
        borderColor: isFocused ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.15)',
        boxShadow: isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none',
      }}
    />
  );
};

export const FormFileInput: React.FC<FormFileInputProps> = ({
  id,
  name,
  accept = 'image/*',
  onChange,
  label = 'Choose File',
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
    onChange?.(e);
  };

  return (
    <div>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={styles.fileInput}
      />
      <label
        htmlFor={id}
        style={{
          ...styles.fileLabel,
          backgroundColor: isHovered ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
          borderColor: isHovered ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.3)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span>📁</span>
        <span>{fileName || label}</span>
      </label>
    </div>
  );
};

export const FormButton: React.FC<FormButtonProps> = ({
  type = 'button',
  variant = 'primary',
  onClick,
  disabled,
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const variantStyles = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    danger: styles.buttonDanger,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.button,
        ...variantStyles[variant],
        opacity: disabled ? 0.5 : isHovered ? 0.9 : 1,
        transform: isHovered && !disabled ? 'translateY(-1px)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
};

export const FormTabs: React.FC<FormTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => (
  <div style={styles.tabs}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        style={{
          ...styles.tab,
          ...(activeTab === tab.id ? styles.tabActive : {}),
        }}
        onClick={() => onTabChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export const FormRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={styles.row}>{children}</div>
);

export const FormFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={styles.footer}>{children}</div>
);

export const FormCommandList: React.FC<{
  commands: string[];
  onSelect: (command: string) => void;
}> = ({ commands, onSelect }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div style={styles.commandList}>
      {commands.length > 0 ? (
        commands.map((cmd, idx) => (
          <div
            key={idx}
            style={{
              ...styles.commandItem,
              backgroundColor: hoveredIndex === idx ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            }}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {cmd}
          </div>
        ))
      ) : (
        <div style={{ ...styles.commandItem, color: '#6b7280' }}>Loading commands...</div>
      )}
    </div>
  );
};

// =============================================================================
// Door Orientation Selector
// =============================================================================

export interface DoorOrientationSelectorProps {
  value: 'up' | 'down' | 'left' | 'right' | '';
  onChange: (value: 'up' | 'down' | 'left' | 'right') => void;
}

export const DoorOrientationSelector: React.FC<DoorOrientationSelectorProps> = ({
  value,
  onChange,
}) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const buttonStyle = (direction: string): React.CSSProperties => {
    const isSelected = value === direction;
    const isHovered = hoveredButton === direction;

    return {
      width: 44,
      height: 44,
      borderRadius: 10,
      border: 'none',
      backgroundColor: isSelected
        ? 'rgba(99, 102, 241, 0.3)'
        : isHovered
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.05)',
      color: isSelected ? '#818cf8' : '#9ca3af',
      fontSize: 18,
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Top */}
      <button
        type="button"
        style={buttonStyle('up')}
        onClick={() => onChange('up')}
        onMouseEnter={() => setHoveredButton('up')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        ▲
      </button>

      {/* Middle row */}
      <div style={{ display: 'flex', gap: 24 }}>
        <button
          type="button"
          style={buttonStyle('left')}
          onClick={() => onChange('left')}
          onMouseEnter={() => setHoveredButton('left')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          ◀
        </button>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}
        />
        <button
          type="button"
          style={buttonStyle('right')}
          onClick={() => onChange('right')}
          onMouseEnter={() => setHoveredButton('right')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          ▶
        </button>
      </div>

      {/* Bottom */}
      <button
        type="button"
        style={buttonStyle('down')}
        onClick={() => onChange('down')}
        onMouseEnter={() => setHoveredButton('down')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        ▼
      </button>
    </div>
  );
};

// =============================================================================
// Position Slider
// =============================================================================

export interface PositionSliderProps {
  value: number;
  onChange: (value: number) => void;
  orientation: 'horizontal' | 'vertical';
  label?: string;
}

export const PositionSlider: React.FC<PositionSliderProps> = ({
  value,
  onChange,
  orientation,
  label,
}) => {
  return (
    <div style={{ marginTop: 16 }}>
      {label && (
        <div
          style={{
            color: '#e5e7eb',
            fontSize: 13,
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{label}</span>
          <span style={{ color: '#818cf8', fontWeight: 600 }}>{value}%</span>
        </div>
      )}
      <div
        style={{
          position: 'relative',
          height: orientation === 'horizontal' ? 48 : 120,
          width: orientation === 'horizontal' ? '100%' : 48,
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Track fill */}
        <div
          style={{
            position: 'absolute',
            ...(orientation === 'horizontal'
              ? { left: 0, top: 0, bottom: 0, width: `${value}%` }
              : { left: 0, right: 0, bottom: 0, height: `${value}%` }),
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
          }}
        />

        {/* Door indicator */}
        <div
          style={{
            position: 'absolute',
            ...(orientation === 'horizontal'
              ? { left: `${value}%`, top: '50%', transform: 'translate(-50%, -50%)' }
              : { top: `${value}%`, left: '50%', transform: 'translate(-50%, -50%)' }),
            width: 24,
            height: 24,
            borderRadius: 6,
            backgroundColor: '#6366f1',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
          }}
        />

        {/* Input */}
        <input
          type="range"
          min={5}
          max={95}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
};

export default FormOverlay;
