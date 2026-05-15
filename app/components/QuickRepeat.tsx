'use client'

import { useState, useEffect } from 'react'
import { supabase, JenisPengeluaran } from '@/lib/supabase'
import { savePengeluaranOffline, saveXpOffline, getXpOffline } from '@/lib/idb'
import { syncQueue, upsertXp } from '@/lib/sync'

// ── Types ──────────────────────────────────────────────────────────────────
export type QuickShortcut = {
  id: string
  label: string          // custom display name e.g. "Parkir kantor"
  jenis_id: number
  jenis_nama: string
  jenis_icon: string
  nominal: number
  keterangan: string | null
  created_by: 'wiku' | 'dita'
}

const STORAGE_KEY = 'quick-shortcuts'

function loadShortcuts(): QuickShortcut[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function persistShortcuts(list: QuickShortcut[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

function fmtRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n)
}

function fmtInput(val: string) {
  return val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// ── Add/Edit modal ─────────────────────────────────────────────────────────
function ShortcutModal({
  jenisList,
  initial,
  onSave,
  onClose,
}: {
  jenisList: JenisPengeluaran[]
  initial?: QuickShortcut | null
  onSave: (s: QuickShortcut) => void
  onClose: () => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [selectedJenis, setSelectedJenis] = useState<JenisPengeluaran | null>(
    initial ? jenisList.find(j => j.id === initial.jenis_id) ?? null : null
  )
  const [nominal, setNominal] = useState(initial ? fmtInput(String(initial.nominal)) : '')
  const [keterangan, setKeterangan] = useState(initial?.keterangan ?? '')
  const [createdBy, setCreatedBy] = useState<'wiku' | 'dita'>(initial?.created_by ?? 'wiku')
  const [jenisSearch, setJenisSearch] = useState('')

  const filteredJenis = jenisSearch.trim()
    ? jenisList.filter(j => j.nama.toLowerCase().includes(jenisSearch.toLowerCase()))
    : jenisList

  function handleSave() {
    if (!selectedJenis || !nominal || !label.trim()) return
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      label: label.trim(),
      jenis_id: selectedJenis.id,
      jenis_nama: selectedJenis.nama,
      jenis_icon: selectedJenis.icon,
      nominal: parseInt(nominal.replace(/\./g, '')),
      keterangan: keterangan.trim() || null,
      created_by: createdBy,
    })
  }

  const isValid = !!selectedJenis && !!nominal && nominal !== '0' && label.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl border-t border-x flex flex-col max-h-[90vh]"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>
            {initial ? 'Edit Shortcut' : 'Tambah Shortcut'}
          </h3>
          <button onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-xl"
            style={{ color: 'var(--text-3)' }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
          {/* Label */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest block mb-2"
              style={{ color: 'var(--text-3)' }}>
              Nama shortcut
            </label>
            <input type="text" placeholder='e.g. "Parkir kantor", "Kopi harian"'
              value={label} onChange={e => setLabel(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border-2 text-base outline-none focus:border-indigo-500 transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }} />
          </div>

          {/* Who */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest block mb-2"
              style={{ color: 'var(--text-3)' }}>Siapa</label>
            <div className="flex gap-2">
              {(['wiku', 'dita'] as const).map(name => (
                <button key={name} onClick={() => setCreatedBy(name)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-base transition-all active:scale-95 ${
                    createdBy === name ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''
                  }`}
                  style={createdBy !== name ? { background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' } : { color: 'var(--text)' }}>
                  <span>{name === 'wiku' ? '🧔' : '👩'}</span>
                  <span className="capitalize">{name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest block mb-2"
              style={{ color: 'var(--text-3)' }}>Kategori</label>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base"
                style={{ color: 'var(--text-3)' }}>🔍</span>
              <input type="text" placeholder="Cari kategori..."
                value={jenisSearch} onChange={e => setJenisSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none focus:border-indigo-500 transition-colors"
                style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }} />
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
              {filteredJenis.map(j => (
                <button key={j.id} onClick={() => setSelectedJenis(j)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold text-center active:scale-95 transition-all ${
                    selectedJenis?.id === j.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : ''
                  }`}
                  style={selectedJenis?.id !== j.id ? { background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' } : { color: 'var(--text)' }}>
                  <span className="text-2xl">{j.icon}</span>
                  <span className="leading-tight">{j.nama}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nominal */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest block mb-2"
              style={{ color: 'var(--text-3)' }}>Nominal</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-bold"
                style={{ color: 'var(--text-3)' }}>Rp</span>
              <input type="text" inputMode="numeric" placeholder="0"
                value={nominal} onChange={e => setNominal(fmtInput(e.target.value))}
                className="w-full pl-14 pr-5 py-4 text-2xl font-black rounded-2xl border-2 outline-none focus:border-indigo-500 transition-colors"
                style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }} />
            </div>
            {/* Quick amounts */}
            <div className="grid grid-cols-5 gap-2 mt-2">
              {[5000, 8000, 10000, 15000, 20000].map(amt => (
                <button key={amt} onClick={() => setNominal(fmtInput(String(amt)))}
                  className="py-2.5 rounded-xl text-xs font-bold border active:scale-95 transition-all hover:border-indigo-500 hover:text-indigo-500"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                  {amt >= 1000 ? `${amt/1000}rb` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest block mb-2"
              style={{ color: 'var(--text-3)' }}>Keterangan (opsional)</label>
            <input type="text" placeholder='e.g. "Parkir Sudirman"'
              value={keterangan} onChange={e => setKeterangan(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border-2 text-base outline-none focus:border-indigo-500 transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }} />
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={!isValid}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-40 text-white font-black text-lg transition-all">
            {initial ? '✓ Update Shortcut' : '+ Simpan Shortcut'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
type Props = {
  jenisList: JenisPengeluaran[]
  onSuccess: () => void
}

export default function QuickInput({ jenisList, onSuccess }: Props) {
  const [shortcuts, setShortcuts] = useState<QuickShortcut[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<QuickShortcut | null>(null)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    setShortcuts(loadShortcuts())
  }, [])

  async function handleTap(s: QuickShortcut) {
    if (editMode) { setEditTarget(s); setShowModal(true); return }
    if (saving) return
    setSaving(s.id)

    const item = {
      id: crypto.randomUUID(),
      jenis_id: s.jenis_id,
      jenis_nama: s.jenis_nama,
      nominal: s.nominal,
      keterangan: s.keterangan,
      created_by: s.created_by,
      synced_at: null as string | null,
      created_at: new Date().toISOString(),
    }

    await savePengeluaranOffline(item)
    if (navigator.onLine) {
      const { error } = await supabase.from('pengeluaran').insert({
        ...item, synced_at: new Date().toISOString(),
      })
      if (!error) item.synced_at = new Date().toISOString()
    }
    await syncQueue()

    const currentXp = await getXpOffline(s.created_by)
    const newXp = currentXp + 10
    await saveXpOffline(s.created_by, newXp)
    if (navigator.onLine) upsertXp(s.created_by, newXp).catch(() => {})

    const streak = parseInt(localStorage.getItem('input-streak') || '0')
    localStorage.setItem('input-streak', String(streak + 1))

    setSaving(null)
    setSaved(s.id)
    setTimeout(() => { setSaved(null); onSuccess() }, 700)
  }

  function handleSaveShortcut(s: QuickShortcut) {
    setShortcuts(prev => {
      const exists = prev.findIndex(x => x.id === s.id)
      const next = exists >= 0
        ? prev.map(x => x.id === s.id ? s : x)
        : [...prev, s]
      persistShortcuts(next)
      return next
    })
    setShowModal(false)
    setEditTarget(null)
  }

  function handleDelete(id: string) {
    setShortcuts(prev => {
      const next = prev.filter(x => x.id !== id)
      persistShortcuts(next)
      return next
    })
  }

  return (
    <>
      {(showModal || editTarget) && (
        <ShortcutModal
          jenisList={jenisList}
          initial={editTarget}
          onSave={handleSaveShortcut}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
        />
      )}

      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
            ⚡ Quick Input
          </span>
          <div className="flex items-center gap-2">
            {shortcuts.length > 0 && (
              <button
                onClick={() => setEditMode(p => !p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                  editMode
                    ? 'bg-amber-500 text-white border-amber-500'
                    : ''
                }`}
                style={!editMode ? { background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' } : {}}>
                {editMode ? '✓ Selesai' : '✏️ Edit'}
              </button>
            )}
            <button
              onClick={() => { setEditTarget(null); setShowModal(true) }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95">
              + Tambah
            </button>
          </div>
        </div>

        {/* Shortcut list */}
        {shortcuts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2"
            style={{ color: 'var(--text-3)' }}>
            <span className="text-3xl">⚡</span>
            <span className="text-sm font-semibold">Belum ada shortcut</span>
            <span className="text-xs">Tap "+ Tambah" untuk buat shortcut pertama</span>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {shortcuts.map(s => {
              const isSaving = saving === s.id
              const isSaved  = saved  === s.id

              return (
                <div key={s.id}
                  className="flex items-center gap-3 px-4 py-3.5 active:opacity-80 transition-opacity"
                  style={isSaved ? { background: 'rgba(99,102,241,0.08)' } : {}}>

                  {/* Category icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: 'var(--bg-input)' }}>
                    {s.jenis_icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                      {s.label}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {s.jenis_nama}
                      {s.keterangan ? ` · ${s.keterangan}` : ''}
                      {' · '}
                      <span className={s.created_by === 'wiku'
                        ? 'text-indigo-500 dark:text-indigo-300'
                        : 'text-pink-500 dark:text-pink-300'}>
                        {s.created_by}
                      </span>
                    </div>
                  </div>

                  {/* Amount + action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black text-indigo-500 dark:text-indigo-300">
                      {fmtRupiah(s.nominal)}
                    </span>

                    {editMode ? (
                      <div className="flex items-center gap-1.5">
                        {/* Edit */}
                        <button
                          onClick={() => { setEditTarget(s); setShowModal(true) }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl text-base border active:scale-90 transition-all"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                          ✏️
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl text-base bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 active:scale-90 transition-all">
                          🗑
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleTap(s)}
                        disabled={!!saving}
                        className="h-9 px-3 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 active:scale-95 transition-all">
                        {isSaving ? '⏳' : isSaved ? '✅' : '+ Catat'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
