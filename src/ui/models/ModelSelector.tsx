import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, Cpu, Star, Trash2 } from 'lucide-react'
import type { ModelInfo } from '../../core/types'

export interface ModelSelectorProps {
  models: ModelInfo[]
  byProvider: Record<string, ModelInfo[]>
  providers: string[]
  selectedModelId?: string | null
  onSelect: (model: ModelInfo) => void
  loading?: boolean
  error?: string | null
  placeholder?: string
  favoriteModels?: Set<string>
  onToggleFavorite?: (id: string) => void
  disabled?: boolean
  toolbar?: React.ReactNode
  dropdownFooter?: React.ReactNode | ((close: () => void) => React.ReactNode)
  placement?: 'top' | 'bottom'
  className?: string
  onRemoveProvider?: (provider: string) => void
}

const modelLabel = (m?: ModelInfo, fallback = '') => {
  const raw = m?.displayName || m?.id || fallback
  const withoutProvider = raw.split(' | ')[0] || raw
  if (withoutProvider.includes('/') && withoutProvider.includes('.')) {
    return withoutProvider.split('/').pop() || withoutProvider
  }
  return withoutProvider
}

const providerMeta: Record<string, { name: string; color: string }> = {
  openai: { name: 'OpenAI', color: 'text-green-400' },
  anthropic: { name: 'Anthropic', color: 'text-orange-400' },
  google: { name: 'Google', color: 'text-blue-400' },
  gemini: { name: 'Gemini', color: 'text-blue-400' },
  openrouter: { name: 'OpenRouter', color: 'text-purple-400' },
  orcarouter: { name: 'OrcaRouter', color: 'text-cyan-400' },
  darkbloom: { name: 'Darkbloom', color: 'text-pink-400' },
  ollama: { name: 'Ollama', color: 'text-amber-400' },
  lmstudio: { name: 'LM Studio', color: 'text-yellow-400' },
  llamacpp: { name: 'llama.cpp', color: 'text-red-400' },
  gguf: { name: 'GGUF', color: 'text-lime-400' },
  minimax: { name: 'MiniMax', color: 'text-indigo-400' },
  qwen: { name: 'Qwen', color: 'text-rose-400' },
  kimi: { name: 'Kimi', color: 'text-teal-400' },
  xai: { name: 'xAI', color: 'text-gray-400' },
}

const providerLabel = (p: string) => providerMeta[p]?.name || p

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  byProvider,
  providers,
  selectedModelId,
  onSelect,
  loading,
  error,
  placeholder = 'Select a model',
  favoriteModels,
  onToggleFavorite,
  disabled,
  toolbar,
  dropdownFooter,
  placement = 'bottom',
  className = '',
  onRemoveProvider,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [pos, setPos] = useState<{ top?: number; left: number; bottom?: number } | null>(null)

  const selected = models.find(m => m.id === selectedModelId)
  const buttonLabel = loading ? 'Loading...' : error ? 'Error' : modelLabel(selected, placeholder)

  const close = () => {
    setOpen(false)
    setSearch('')
  }

  useEffect(() => {
    if (!open) return
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      if (placement === 'top') {
        setPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left })
      } else {
        setPos({ top: rect.bottom + 4, left: rect.left })
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open, placement])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!buttonRef.current?.contains(target) && !document.getElementById('npcts-model-selector-dropdown')?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const filteredModels = (provider: string) => {
    const list = byProvider[provider] || []
    if (!search) return list
    const term = search.toLowerCase()
    return list.filter(m => {
      const text = `${m.displayName || m.id} ${m.provider || ''}`.toLowerCase()
      return text.includes(term)
    })
  }

  const filteredProviders = providers.filter(p => {
    if (!search) return true
    const term = search.toLowerCase()
    return providerLabel(p).toLowerCase().includes(term) || filteredModels(p).length > 0
  })

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled || loading || !!error}
        className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-white ${className}`}
      >
        <Cpu size={12} className="text-purple-400" />
        <span className="truncate max-w-[180px]">{buttonLabel}</span>
        <ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && pos && createPortal(
        <div
          id="npcts-model-selector-dropdown"
          className="fixed z-[100] bg-[#0f0f17] border border-white/10 rounded-lg shadow-2xl overflow-hidden min-w-[260px] max-w-[320px]"
          style={pos}
        >
          <div className="px-2 py-1.5 border-b border-white/10">
            <input
              type="text"
              placeholder="Search models..."
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
            />
          </div>
          {toolbar && <div className="px-2 py-1 border-b border-white/10">{toolbar}</div>}
          <div className="max-h-72 overflow-y-auto p-1">
            {loading && <div className="px-2 py-3 text-xs text-white/40 text-center">Loading models…</div>}
            {error && <div className="px-2 py-3 text-xs text-red-400 text-center">{error}</div>}
            {!loading && !error && models.length === 0 && (
              <div className="px-2 py-3 text-xs text-white/40 text-center">No models available.</div>
            )}
            {filteredProviders.map(provider => {
              const isExpanded = expanded.has(provider) || !!search
              const modelsList = filteredModels(provider)
              if (!modelsList.length) return null
              return (
                <div key={provider}>
                  <div className="group flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-white/40 hover:bg-white/5"
                  >
                    <button
                      onClick={() => setExpanded(prev => {
                        const next = new Set(prev)
                        if (next.has(provider)) next.delete(provider)
                        else next.add(provider)
                        return next
                      })}
                      className="flex items-center gap-1 text-left"
                    >
                      <ChevronRight size={10} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      <span className={providerMeta[provider]?.color}>{providerLabel(provider)}</span>
                    </button>
                    <span className="text-white/20">{modelsList.length}</span>
                    {onRemoveProvider && (
                      <button
                        onClick={e => { e.stopPropagation(); onRemoveProvider(provider) }}
                        className="p-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title={`Remove ${providerLabel(provider)} provider`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  {isExpanded && modelsList.map(m => {
                    const isSelected = selectedModelId === m.id
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center gap-2 pl-6 pr-2 py-1 text-xs ${isSelected ? 'bg-purple-600/40 text-white' : 'text-white/70 hover:bg-white/5'} cursor-pointer`}
                        onClick={() => { onSelect(m); close() }}
                      >
                        <span className="truncate flex-1">{m.displayName || m.id}</span>
                        {onToggleFavorite && (
                          <button
                            onClick={e => { e.stopPropagation(); onToggleFavorite(m.id) }}
                            className="p-0.5 rounded hover:bg-white/10"
                          >
                            <Star size={10} className={favoriteModels?.has(m.id) ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          {dropdownFooter && <div className="border-t border-white/10 p-1.5">{typeof dropdownFooter === 'function' ? dropdownFooter(close) : dropdownFooter}</div>}
        </div>,
        document.body
      )}
    </div>
  )
}
