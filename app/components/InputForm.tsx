'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, JenisPengeluaran } from '@/lib/supabase'
import { savePengeluaranOffline, saveXpOffline, getXpOffline } from '@/lib/idb'
import { syncQueue, upsertXp } from '@/lib/sync'
import { loadJenisOfflineFirst } from '@/lib/jenis'
import JenisPicker from './JenisPicker'

type Step = 'jenis' | 'nominal' | 'keterangan' | 'confirm'

function fmtInput(val: string) {
  return val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const LAST_USER_KEY = 'last-input-user'

export default function InputForm({ onSuccess }: { onSuccess: () => void }) {
  // Persist last selected user — load immediately, no step needed
  const [createdBy, setCreatedBy] = useState<'wiku' | 'dita'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(LAST_USER_KEY) as 'wiku' | 'dita') ?? 'wiku'
    }
    return 'wiku'
  })

  const [step, setStep] = useState<Step>('jenis')
  const [jenisList, setJenisList] = useState<JenisPengeluaran[]>([])
  const [selectedJenis, setSelectedJenis] = useState<JenisPengeluaran | null>(null)
  const [nominal, setNominal] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [xpAnim, setXpAnim] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const nominalRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadJenisOfflineFirst(setJenisList)
  }, [])

  useEffect(() => {
    if (step === 'nominal') setTimeout(() => nominalRef.current?.focus(), 150)
  }, [step])

  function switchUser() {
    const next = createdBy === 'wiku' ? 'dita' : 'wiku'
    setCreatedBy(next)
    localStorage.setItem(LAST_USER_KEY, next)
  }

  async function handleSubmit() {
    if (!selectedJenis || !nominal) return
    setSubmitting(true)

    const item = {
      id: crypto.randomUUID(),
      jenis_id: selectedJenis.id,
      jenis_nama: selectedJenis.nama,
      nominal: parseInt(nominal.replace(/\./g, '')),
      keterangan: keterangan.trim() || null,
      created_by: createdBy,
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

    const streak = parseInt(localStorage.getItem('input-streak') || '0') + 1
    localStorage.setItem('input-streak', String(streak))

    const currentXp = await getXpOffline(createdBy)
    const newXp = currentXp + 10
    await saveXpOffline(createdBy, newXp)
    if (navigator.onLine) upsertXp(createdBy, newXp).catch(() => {})

    setXpAnim(true); setConfetti(true)
    setTimeout(() => setXpAnim(false), 1500)
    setTimeout(() => setConfetti(false), 2500)
    setSubmitting(false)
    setTimeout(() => { resetForm(); onSuccess() }, 900)
  }

  function resetForm() {
    setStep('jenis')
    setSelectedJenis(null)
    setNominal('')
    setKeterangan('')
  }

  // Step config — 3 real steps now (who is gone)
  const steps: Step[] = ['jenis', 'nominal', 'keterangan', 'confirm']
  const stepIndex = steps.indexOf(step)
  const progress = ((stepIndex + 1) / steps.length) * 100

  const stepLabel: Record<Step, string> = {
    jenis:      'Pilih kategori',
    nominal:    'Masukkan nominal',
    keterangan: 'Tambah keterangan',
    confirm:    'Konfirmasi',
  }

  return (
    <div className="relative">
      {/* Confetti */}
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-50">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random()}s`,
                fontSize: '1.8rem',
              }}>
              {['🎉', '✨', '💸', '🌟', '💰'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {xpAnim && (
        <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-ping text-5xl font-black text-indigo-500">
          +10 XP ⚡
        </div>
      )}

      {/* ── Who bar — always visible, tap to switch ── */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{createdBy === 'wiku' ? '🧔' : '👩'}</span>
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-3)' }}>Mencatat sebagai</span>
            <div className="text-base font-black capitalize" style={{ color: 'var(--text)' }}>
              {createdBy}
            </div>
          </div>
        </div>
        <button
          onClick={switchUser}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all active:scale-95"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
        >
          <span>{createdBy === 'wiku' ? '👩' : '🧔'}</span>
          Ganti ke {createdBy === 'wiku' ? 'Dita' : 'Wiku'}
        </button>
      </div>

      {/* ── Progress ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-sm font-bold" style={{ color: 'var(--text-2)' }}>
            {stepLabel[step]}
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
            {stepIndex + 1} / {steps.length}
          </span>
        </div>
        {/* Segmented progress — feels more intentional than a sliding bar */}
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all duration-400"
                style={{
                  width: i <= stepIndex ? '100%' : '0%',
                  background: i <= stepIndex
                    ? 'linear-gradient(90deg, #6366f1, #a855f7)'
                    : 'transparent',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Step: Jenis ── */}
      {step === 'jenis' && (
        <JenisPicker
          jenisList={jenisList}
          selected={selectedJenis}
          onSelect={j => { setSelectedJenis(j); setStep('nominal') }}
          accentColor="indigo"
        />
      )}

      {/* ── Step: Nominal ── */}
      {step === 'nominal' && (
        <div className="space-y-5">
          {/* Selected category pill */}
          <button
            onClick={() => setStep('jenis')}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border w-full text-left transition-all active:scale-[0.98]"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}
          >
            <span className="text-2xl">{selectedJenis?.icon}</span>
            <span className="text-base font-bold flex-1" style={{ color: 'var(--text)' }}>
              {selectedJenis?.nama}
            </span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>ganti</span>
          </button>

          {/* Amount input */}
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold"
              style={{ color: 'var(--text-3)' }}>Rp</span>
            <input
              ref={nominalRef}
              type="text" inputMode="numeric" placeholder="0"
              value={nominal} onChange={e => setNominal(fmtInput(e.target.value))}
              className="w-full pl-16 pr-5 py-5 text-3xl font-black rounded-2xl border-2 outline-none focus:border-indigo-500 transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }}
            />
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-5 gap-2">
            {[10000, 25000, 50000, 100000, 200000].map(amt => (
              <button key={amt} onClick={() => setNominal(fmtInput(String(amt)))}
                className="py-3 rounded-xl text-sm font-bold border active:scale-95 transition-all hover:border-indigo-500 hover:text-indigo-500"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                {amt >= 1_000_000 ? `${amt / 1_000_000}jt` : `${amt / 1000}rb`}
              </button>
            ))}
          </div>

          <button
            disabled={!nominal || nominal === '0'}
            onClick={() => setStep('keterangan')}
            className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-40 text-white font-black text-xl transition-all"
          >
            Lanjut →
          </button>
        </div>
      )}

      {/* ── Step: Keterangan ── */}
      {step === 'keterangan' && (
        <div className="space-y-5">
          {/* Summary chip */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl border"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedJenis?.icon}</span>
              <span className="text-base font-bold" style={{ color: 'var(--text)' }}>
                {selectedJenis?.nama}
              </span>
            </div>
            <span className="text-lg font-black text-indigo-500">Rp {nominal}</span>
          </div>

          <textarea
            autoFocus
            placeholder="Keterangan (opsional)... misal: indomaret, gojek, dll"
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            rows={3}
            className="w-full px-5 py-4 text-base rounded-2xl border-2 outline-none focus:border-indigo-500 resize-none transition-colors"
            style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }}
          />

          <button
            onClick={() => setStep('confirm')}
            className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black text-xl transition-all"
          >
            Review →
          </button>

          <button
            onClick={() => setStep('nominal')}
            className="w-full py-3 rounded-xl text-base font-semibold border transition-colors active:scale-[0.98]"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            ← Ganti nominal
          </button>
        </div>
      )}

      {/* ── Step: Confirm ── */}
      {step === 'confirm' && (
        <div className="space-y-5">
          <div className="rounded-2xl border overflow-hidden divide-y"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', '--tw-divide-opacity': 1 } as React.CSSProperties}>

            {/* Who */}
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="text-3xl">{createdBy === 'wiku' ? '🧔' : '👩'}</span>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>Dicatat oleh</div>
                <div className="text-base font-black capitalize" style={{ color: 'var(--text)' }}>{createdBy}</div>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="text-3xl">{selectedJenis?.icon}</span>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>Kategori</div>
                <div className="text-base font-bold" style={{ color: 'var(--text)' }}>{selectedJenis?.nama}</div>
              </div>
            </div>

            {/* Amount */}
            <div className="px-5 py-4">
              <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Nominal</div>
              <div className="text-3xl font-black text-indigo-500 dark:text-indigo-400">Rp {nominal}</div>
            </div>

            {/* Keterangan — only if filled */}
            {keterangan.trim() && (
              <div className="px-5 py-4">
                <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Keterangan</div>
                <div className="text-base" style={{ color: 'var(--text)' }}>{keterangan}</div>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xl transition-all shadow-lg shadow-indigo-500/20"
          >
            {submitting ? '⏳ Menyimpan...' : '✅ Simpan +10 XP'}
          </button>

          <button
            onClick={() => setStep('keterangan')}
            className="w-full py-3 rounded-xl text-base font-semibold border transition-colors active:scale-[0.98]"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            ← Edit dulu
          </button>
        </div>
      )}
    </div>
  )
}
