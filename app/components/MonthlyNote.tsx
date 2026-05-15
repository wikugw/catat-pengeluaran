'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchNote, upsertNote } from '@/lib/sync'
import { saveNoteOffline, getNoteOffline } from '@/lib/idb'

type Props = {
  year: number
  month: number
}

type SaveState = 'idle' | 'saving' | 'saved' | 'offline'

export default function MonthlyNote({ year, month }: Props) {
  const [note, setNote]         = useState('')
  const [expanded, setExpanded] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [charCount, setCharCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const MAX_CHARS = 500

  const monthLabel = new Date(year, month).toLocaleString('id-ID', {
    month: 'long', year: 'numeric',
  })

  // Load note when month changes — offline-first
  useEffect(() => {
    let cancelled = false

    async function load() {
      // 1. Show cached immediately
      const cached = await getNoteOffline(year, month)
      if (!cancelled) {
        setNote(cached)
        setCharCount(cached.length)
        if (cached.trim()) setExpanded(true)
      }

      // 2. Fetch from Supabase in background
      try {
        const remote = await fetchNote(year, month)
        if (!cancelled && remote !== null) {
          setNote(remote)
          setCharCount(remote.length)
          await saveNoteOffline(year, month, remote)
          if (remote.trim()) setExpanded(true)
        }
      } catch { /* use cached */ }
    }

    load()
    return () => { cancelled = true }
  }, [year, month])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && expanded) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [note, expanded])

  const handleSave = useCallback(async (value: string) => {
    setSaveState('saving')
    await saveNoteOffline(year, month, value)

    if (navigator.onLine) {
      const ok = await upsertNote(year, month, value)
      setSaveState(ok ? 'saved' : 'offline')
    } else {
      setSaveState('offline')
    }

    setTimeout(() => setSaveState('idle'), 2000)
  }, [year, month])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    if (val.length > MAX_CHARS) return
    setNote(val)
    setCharCount(val.length)

    // Debounce auto-save 800ms after typing stops
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => handleSave(val), 800)
  }

  const saveLabel: Record<SaveState, string> = {
    idle:    '',
    saving:  '💾 Menyimpan...',
    saved:   '✅ Tersimpan',
    offline: '📵 Tersimpan offline',
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Header — always visible, tap to expand/collapse */}
      <button
        onClick={() => {
          setExpanded(p => !p)
          if (!expanded) setTimeout(() => textareaRef.current?.focus(), 150)
        }}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-colors active:opacity-70"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📝</span>
          <div className="text-left">
            <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              Catatan {monthLabel}
            </div>
            {!expanded && note.trim() && (
              <div className="text-xs truncate max-w-[220px]" style={{ color: 'var(--text-2)' }}>
                {note.trim()}
              </div>
            )}
            {!expanded && !note.trim() && (
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                Tap untuk tambah catatan bulan ini...
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveState !== 'idle' && (
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              {saveLabel[saveState]}
            </span>
          )}
          {note.trim() && !expanded && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
          )}
          <span
            className="text-base transition-transform duration-200"
            style={{
              color: 'var(--text-3)',
              display: 'inline-block',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ›
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <div
            className="h-px w-full"
            style={{ background: 'var(--border)' }}
          />
          <textarea
            ref={textareaRef}
            value={note}
            onChange={handleChange}
            placeholder={`Catatan untuk ${monthLabel}...\n\nContoh: "Ada kondangan 2x bulan ini" atau "Dita sakit minggu ke-3, banyak ke apotek"`}
            className="w-full resize-none outline-none text-sm leading-relaxed bg-transparent min-h-[100px]"
            style={{ color: 'var(--text)', caretColor: '#6366f1' }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: charCount > MAX_CHARS * 0.9 ? '#f59e0b' : 'var(--text-3)' }}>
              {charCount}/{MAX_CHARS}
            </span>
            <div className="flex items-center gap-2">
              {saveState !== 'idle' && (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {saveLabel[saveState]}
                </span>
              )}
              <button
                onClick={() => handleSave(note)}
                disabled={saveState === 'saving'}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all active:scale-95"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
