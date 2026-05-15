'use client'

import { useState, useRef, useEffect } from 'react'
import { JenisPengeluaran } from '@/lib/supabase'

type Props = {
  jenisList: JenisPengeluaran[]
  selected?: JenisPengeluaran | null
  onSelect: (j: JenisPengeluaran) => void
  accentColor?: 'indigo' | 'purple'
}

export default function JenisPicker({ jenisList, selected, onSelect, accentColor = 'indigo' }: Props) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Auto-focus search when mounted
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [])

  const filtered = query.trim()
    ? jenisList.filter(j => j.nama.toLowerCase().includes(query.toLowerCase()))
    : jenisList

  const accent = accentColor === 'purple'
    ? { border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/30', focus: 'focus:border-purple-500' }
    : { border: 'border-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/30', focus: 'focus:border-indigo-500' }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none"
          style={{ color: 'var(--text-3)' }}>🔍</span>
        <input
          ref={searchRef}
          type="text"
          placeholder="Ketik nama kategori..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className={`w-full pl-11 pr-4 py-4 rounded-2xl border-2 text-base outline-none transition-colors ${accent.focus}`}
          style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: query ? undefined : 'var(--border)' }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); searchRef.current?.focus() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-lg"
            style={{ color: 'var(--text-3)' }}>
            ✕
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-2" style={{ color: 'var(--text-3)' }}>
          <span className="text-3xl">🤷</span>
          <span className="text-sm">Kategori "{query}" tidak ditemukan</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map(j => {
            const isSelected = selected?.id === j.id
            return (
              <button
                key={j.id}
                onClick={() => onSelect(j)}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 active:scale-95 transition-all ${
                  isSelected ? `${accent.border} ${accent.bg}` : ''
                }`}
                style={!isSelected ? { background: 'var(--bg-input)', borderColor: 'var(--border)' } : {}}
              >
                <span className="text-3xl">{j.icon}</span>
                <span className="text-xs font-semibold text-center leading-tight"
                  style={{ color: isSelected ? undefined : 'var(--text-2)' }}>
                  {j.nama}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
