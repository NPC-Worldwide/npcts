import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Bot } from 'lucide-react';

export interface NPCOption {
  value: string;
  display_name?: string;
  source?: string;
  team?: string;
  teamPath?: string;
  [key: string]: any;
}

export interface NPCSelectorProps {
  availableNPCs: NPCOption[];
  selectedNPCs: string[];
  onChangeSelected: (selected: string[]) => void;
  currentNPC?: string;
  onSelectCurrent?: (value: string) => void;
  loading?: boolean;
  error?: string | null;
  broadcastMode?: boolean;
  onToggleBroadcast?: () => void;
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  placement?: 'top' | 'bottom';
  onOpen?: () => void;
}

export const NPCSelector: React.FC<NPCSelectorProps> = ({
  availableNPCs,
  selectedNPCs,
  onChangeSelected,
  currentNPC,
  onSelectCurrent,
  loading,
  error,
  broadcastMode = false,
  onToggleBroadcast,
  placeholder = 'Agent',
  className = '',
  dropdownClassName = '',
  placement = 'top',
  onOpen,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredNPCs = useMemo(() => {
    if (!search.trim()) return availableNPCs;
    const q = search.toLowerCase();
    return availableNPCs.filter((n) =>
      (n.display_name || n.value || '').toLowerCase().includes(q)
    );
  }, [availableNPCs, search]);

  const label = loading ? '...' : error ? 'Error' :
    selectedNPCs.length === 1
      ? ((availableNPCs.find((n) => n.value === selectedNPCs[0])?.display_name || selectedNPCs[0]).split(' | ')[0])
      : selectedNPCs.length === 0
        ? placeholder
        : `${selectedNPCs.length} agents`;

  useEffect(() => {
    if (!open) return;
    setSearch('');
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!buttonRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleNpc = (value: string) => {
    if (broadcastMode) {
      const next = selectedNPCs.includes(value)
        ? selectedNPCs.filter((v) => v !== value)
        : [...selectedNPCs, value];
      onChangeSelected(next.length ? next : [currentNPC || value]);
      if (!selectedNPCs.includes(value)) onSelectCurrent?.(value);
    } else {
      onChangeSelected([value]);
      onSelectCurrent?.(value);
      setOpen(false);
    }
  };

  const selectAll = () => {
    onChangeSelected(filteredNPCs.map((n) => n.value));
  };

  const reset = () => {
    onChangeSelected([]);
  };

  const sourceIcon = (source?: string) => {
    if (source === 'project') return '📁';
    if (source === 'global') return '🌐';
    return '';
  };

  return (
    <div className={`relative flex-1 min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={loading || !!error}
        onClick={() => setOpen((v) => {
          if (!v) onOpen?.();
          return !v;
        })}
        className={`w-full h-7 flex items-center justify-center gap-1 rounded-lg text-xs font-medium transition-all duration-200 border px-2 ${
          selectedNPCs.length > 1
            ? 'bg-gradient-to-br from-green-500/30 to-emerald-600/30 text-green-200 border-green-400/40'
            : 'bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700'
        } ${className}`}
      >
        {selectedNPCs.length > 1 && (
          <span className="w-4 h-4 rounded bg-green-500 text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0">{selectedNPCs.length}</span>
        )}
        {selectedNPCs.length <= 1 && <Bot size={12} className="flex-shrink-0 opacity-70" />}
        <span className="truncate">{label}</span>
        <ChevronDown size={12} className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !loading && !error && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 z-50 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden ${placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${dropdownClassName}`}
        >
          <div className="px-2 py-1.5 border-b border-gray-700">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-green-500/50"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="px-2 py-1 border-b border-gray-700 flex items-center justify-between">
            {onToggleBroadcast && (
              <button
                onClick={onToggleBroadcast}
                className={`text-[9px] px-1.5 py-0.5 rounded ${broadcastMode ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
              >
                {broadcastMode ? '● Multi' : '○ Single'}
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              {broadcastMode && (
                <button onClick={selectAll} className="text-[9px] text-green-400 hover:text-green-300">All</button>
              )}
              <button onClick={reset} className="text-[9px] text-gray-400 hover:text-gray-300">Reset</button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredNPCs.map((npc) => {
              const value = npc.value;
              const checked = selectedNPCs.includes(value);
              return (
                <div
                  key={`${npc.source || 'npc'}-${value}`}
                  onClick={() => toggleNpc(value)}
                  className={`px-2 py-1.5 text-xs rounded cursor-pointer flex items-center gap-2 transition-all ${
                    checked ? 'bg-green-500/20 text-green-200' : 'hover:bg-white/5 text-gray-300'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="truncate flex-1">{npc.display_name || value}</span>
                  <span className="text-[9px] text-gray-600 flex-shrink-0">{sourceIcon(npc.source)}</span>
                </div>
              );
            })}
            {filteredNPCs.length === 0 && (
              <div className="px-2 py-3 text-xs text-gray-500 text-center">No agents found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
