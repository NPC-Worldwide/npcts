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
  footer: {
    padding: '20px 28px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
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
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box' as const,
  },
  fileInput: {
    display: 'none',
  },
  fileLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '14px 20px',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    border: '2px dashed rgba(99, 102, 241, 0.3)',
    borderRadius: 10,
    color: '#818cf8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
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
  buttonDanger: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    padding: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#818cf8',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  commandList: {
    maxHeight: 150,
    overflowY: 'auto' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 8,
  },
  commandItem: {
    padding: '8px 12px',
    borderRadius: 6,
    color: '#e5e7eb',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
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
          {/* Header */}
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

          {/* Body */}
          <div style={styles.body}>{children}</div>
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
