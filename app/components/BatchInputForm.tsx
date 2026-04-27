'use client'

import { useState, useRef, useEffect } from 'react'
import { JenisPengeluaran } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { saveJenisOffline, getJenisOffline, savePengeluaranOffline, saveXpOffline, getXpOffline } from '@/lib/idb'
import { syncQueue, upsertXp } from '@/lib/sync'
import { loadJenisOfflineFirst } from '@/lib/jenis'

function fmtInput(val: string) {
  return val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

type DraftEntry = {
  id: string
  jenis: JenisPengeluaran
  nominal: string   // formatted string e.g. "25.000"
  keterangan: string
}

type SheetStep = 'jenis' | 'nominal'

export default function BatchInputForm({ onSuccess }: { onSuccess: (count: number) => void }) {
  const [createdBy, setCreatedBy] = useState<'wiku' | 'dita' | null>(null)
  const [jenisList, setJenisList] = useState<JenisPengeluaran[]>([])
  const [entries, setEntries] = useState<DraftEntry[]>([])

  // Bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetStep, setSheetStep] = useState<SheetStep>('jenis')
  const [sheetJenis, setSheetJenis] = useState<JenisPengeluaran | null>(null)
  const [sheetNominal, setSheetNominal] = useState('')
  const [sheetKeterangan, setSheetKeterangan] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [xpAnim, setXpAnim] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const nominalRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadJenisOfflineFirst(setJenisList)
  }, [])

  useEffect(() => {
    if (sheetStep === 'nominal' && sheetOpen) {
      setTimeout(() => nominalRef.current?.focus(), 200)
    }
  }, [sheetStep, sheetOpen])

  // ── Sheet helpers ─────────────────────────────────────────────
  function openAddSheet() {
    setEditingId(null)
    setSheetJenis(null)
    setSheetNominal('')
    setSheetKeterangan('')
    setSheetStep('jenis')
    setSheetOpen(true)
  }

  function openEditSheet(entry: DraftEntry) {
    setEditingId(entry.id)
    setSheetJenis(entry.jenis)
    setSheetNominal(entry.nominal)
    setSheetKeterangan(entry.keterangan)
    setSheetStep('nominal')
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditingId(null)
  }

  function handleSheetSelectJenis(j: JenisPengeluaran) {
    setSheetJenis(j)
    setSheetStep('nominal')
  }

  function handleSheetAdd() {
    if (!sheetJenis || !sheetNominal || sheetNominal === '0') return
    if (editingId) {
      setEntries(prev => prev.map(e => e.id === editingId
        ? { ...e, jenis: sheetJenis!, nominal: sheetNominal, keterangan: sheetKeterangan }
        : e
      ))
    } else {
      setEntries(prev => [...prev, {
        id: crypto.randomUUID(),
        jenis: sheetJenis!,
        nominal: sheetNominal,
        keterangan: sheetKeterangan,
      }])
    }
    closeSheet()
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  // ── Save all ─────────────────────────────────────────────────
  async function handleSaveAll() {
    if (!createdBy || entries.length === 0) return
    setSubmitting(true)

    const now = new Date()
    const rows = entries.map((e, i) => ({
      id: crypto.randomUUID(),
      jenis_id: e.jenis.id,
      jenis_nama: e.jenis.nama,
      nominal: parseInt(e.nominal.replace(/\./g, '')),
      keterangan: e.keterangan.trim() || null,
      created_by: createdBy,
      synced_at: null as string | null,
      // offset by 1ms each so order is preserved
      created_at: new Date(now.getTime() + i).toISOString(),
    }))

    for (const row of rows) await savePengeluaranOffline(row)

    if (navigator.onLine) {
      const { error } = await supabase.from('pengeluaran').insert(
        rows.map(r => ({ ...r, synced_at: new Date().toISOString() }))
      )
      if (!error) rows.forEach(r => { r.synced_at = new Date().toISOString() })
    }
    await syncQueue()

    // XP: +10 per entry, per the actual creator
    const currentXp = await getXpOffline(createdBy)
    const newXp = currentXp + rows.length * 10
    await saveXpOffline(createdBy, newXp)
    if (navigator.onLine) upsertXp(createdBy, newXp).catch(() => {})

    // legacy localStorage streak for display
    const streak = parseInt(localStorage.getItem('input-streak') || '0')
    localStorage.setItem('input-streak', String(streak + rows.length))

    setXpAnim(true); setConfetti(true)
    setTimeout(() => setXpAnim(false), 1500)
    setTimeout(() => setConfetti(false), 2500)
    setSubmitting(false)

    setTimeout(() => {
      setCreatedBy(null)
      setEntries([])
      onSuccess(rows.length)
    }, 900)
  }

  const totalNominal = entries.reduce((s, e) => s + parseInt(e.nominal.replace(/\./g, '') || '0'), 0)

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Confetti */}
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-50">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="absolute animate-bounce"
              style={{ left: `${Math.random()*100}%`, top: `${Math.random()*60}%`,
                animationDelay: `${Math.random()*0.5}s`, animationDuration: `${0.5+Math.random()}s`, fontSize: '1.8rem' }}>
              {['🎉','✨','💸','🌟','💰'][Math.floor(Math.random()*5)]}
            </div>
          ))}
        </div>
      )}
      {xpAnim && (
        <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-ping text-5xl font-black text-purple-500">
          +{entries.length * 10} XP ⚡
        </div>
      )}

      {/* ── Step 1: Who ── */}
      {!createdBy ? (
        <div className="space-y-4">
          <div className="mb-6">
            <p className="text-xl font-black mb-1" style={{ color: 'var(--text)' }}>Catat Banyak 📝</p>
            <p className="text-base" style={{ color: 'var(--text-2)' }}>Tambah banyak pengeluaran sekaligus, simpan satu kali.</p>
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-2)' }}>Siapa yang catat?</p>
          {(['wiku', 'dita'] as const).map(name => (
            <button key={name} onClick={() => setCreatedBy(name)}
              className="w-full flex items-center gap-5 p-5 rounded-2xl border-2 hover:border-purple-500 active:scale-[0.98] transition-all group"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <span className="text-4xl">{name === 'wiku' ? '🧔' : '👩'}</span>
              <span className="text-xl font-bold capitalize" style={{ color: 'var(--text)' }}>{name}</span>
              <span className="ml-auto text-2xl text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          ))}
        </div>
      ) : (
        /* ── Step 2: Build list ── */
        <div className="space-y-4">
          {/* Session header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{createdBy === 'wiku' ? '🧔' : '👩'}</span>
              <div>
                <div className="text-lg font-black capitalize" style={{ color: 'var(--text)' }}>{createdBy}</div>
                <button onClick={() => { setCreatedBy(null); setEntries([]) }}
                  className="text-sm" style={{ color: 'var(--text-3)' }}>ganti →</button>
              </div>
            </div>
            {entries.length > 0 && (
              <div className="text-right">
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{entries.length} item</div>
                <div className="text-base font-black text-purple-500">{fmt(totalNominal)}</div>
              </div>
            )}
          </div>

          {/* Entry list */}
          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map((e, idx) => (
                <div key={e.id}
                  className="flex items-center gap-3 p-4 rounded-2xl border"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                  <span className="text-xs font-bold w-5 shrink-0 text-center" style={{ color: 'var(--text-3)' }}>
                    {idx + 1}
                  </span>
                  <span className="text-2xl shrink-0">{e.jenis.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold truncate" style={{ color: 'var(--text)' }}>{e.jenis.nama}</div>
                    {e.keterangan && (
                      <div className="text-sm truncate" style={{ color: 'var(--text-2)' }}>{e.keterangan}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-purple-500">Rp {e.nominal}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEditSheet(e)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border text-base active:scale-95 transition-all"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      ✏️
                    </button>
                    <button onClick={() => removeEntry(e.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl text-base active:scale-95 transition-all bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border-2 border-dashed"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-5xl">🧾</span>
              <p className="text-base font-semibold" style={{ color: 'var(--text-3)' }}>Belum ada item</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Tap tombol + di bawah untuk mulai</p>
            </div>
          )}

          {/* Add button */}
          <button onClick={openAddSheet}
            className="w-full py-4 rounded-2xl border-2 border-dashed text-base font-bold transition-all active:scale-[0.98] hover:border-purple-500 hover:text-purple-500 flex items-center justify-center gap-2"
            style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            <span className="text-2xl">+</span> Tambah Pengeluaran
          </button>

          {/* Save all */}
          {entries.length > 0 && (
            <button onClick={handleSaveAll} disabled={submitting}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xl transition-all shadow-lg shadow-purple-500/20">
              {submitting ? '⏳ Menyimpan...' : `✅ Simpan Semua (${entries.length}) +${entries.length * 10} XP`}
            </button>
          )}
        </div>
      )}

      {/* ── Bottom Sheet ── */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={closeSheet} />

          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-x max-h-[88vh] flex flex-col"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>
                {sheetStep === 'jenis' ? 'Pilih Kategori' : sheetJenis
                  ? <span className="flex items-center gap-2">{sheetJenis.icon} {sheetJenis.nama}</span>
                  : 'Isi Detail'}
              </h3>
              <div className="flex items-center gap-2">
                {sheetStep === 'nominal' && (
                  <button onClick={() => setSheetStep('jenis')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border active:scale-95"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                    ← Kategori
                  </button>
                )}
                <button onClick={closeSheet}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-xl"
                  style={{ color: 'var(--text-3)' }}>✕</button>
              </div>
            </div>

            {/* Sheet content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              {sheetStep === 'jenis' && (
                <div className="grid grid-cols-3 gap-3 pb-4">
                  {jenisList.map(j => (
                    <button key={j.id} onClick={() => handleSheetSelectJenis(j)}
                      className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 active:scale-95 transition-all ${
                        sheetJenis?.id === j.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' : ''
                      }`}
                      style={sheetJenis?.id !== j.id ? { background: 'var(--bg-input)', borderColor: 'var(--border)' } : {}}>
                      <span className="text-3xl">{j.icon}</span>
                      <span className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--text-2)' }}>{j.nama}</span>
                    </button>
                  ))}
                </div>
              )}

              {sheetStep === 'nominal' && (
                <div className="space-y-4 pt-1">
                  {/* Amount */}
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold" style={{ color: 'var(--text-3)' }}>Rp</span>
                    <input ref={nominalRef} type="text" inputMode="numeric" placeholder="0"
                      value={sheetNominal}
                      onChange={e => setSheetNominal(fmtInput(e.target.value))}
                      className="w-full pl-16 pr-5 py-5 text-3xl font-black rounded-2xl border-2 outline-none focus:border-purple-500 transition-colors"
                      style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }} />
                  </div>

                  {/* Quick amounts */}
                  <div className="grid grid-cols-5 gap-2">
                    {[10000, 25000, 50000, 100000, 200000].map(amt => (
                      <button key={amt} onClick={() => setSheetNominal(fmtInput(String(amt)))}
                        className="py-3 rounded-xl text-sm font-bold border active:scale-95 transition-all hover:border-purple-500 hover:text-purple-500"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                        {amt >= 1_000_000 ? `${amt/1_000_000}jt` : `${amt/1000}rb`}
                      </button>
                    ))}
                  </div>

                  {/* Keterangan */}
                  <input type="text" placeholder="Keterangan (opsional)..."
                    value={sheetKeterangan} onChange={e => setSheetKeterangan(e.target.value)}
                    className="w-full px-5 py-4 text-base rounded-2xl border-2 outline-none focus:border-purple-500 transition-colors"
                    style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }} />

                  {/* Add button */}
                  <button onClick={handleSheetAdd}
                    disabled={!sheetNominal || sheetNominal === '0'}
                    className="w-full py-5 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:opacity-40 text-white font-black text-xl transition-all">
                    {editingId ? '✓ Update' : '+ Tambah ke List'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
