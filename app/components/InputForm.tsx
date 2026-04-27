'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, JenisPengeluaran } from '@/lib/supabase'
import { saveJenisOffline, getJenisOffline, savePengeluaranOffline, saveXpOffline, getXpOffline } from '@/lib/idb'
import { syncQueue, upsertXp } from '@/lib/sync'
import { loadJenisOfflineFirst } from '@/lib/jenis'

type Step = 'who' | 'jenis' | 'nominal' | 'keterangan' | 'confirm'

function fmtInput(val: string) {
  return val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function InputForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<Step>('who')
  const [createdBy, setCreatedBy] = useState<'wiku' | 'dita' | null>(null)
  const [jenisList, setJenisList] = useState<JenisPengeluaran[]>([])
  const [selectedJenis, setSelectedJenis] = useState<JenisPengeluaran | null>(null)
  const [nominal, setNominal] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [xpAnim, setXpAnim] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [streak, setStreak] = useState(0)
  const nominalRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setStreak(parseInt(localStorage.getItem('input-streak') || '0'))
    loadJenisOfflineFirst(setJenisList)
  }, [])

  useEffect(() => {
    if (step === 'nominal') setTimeout(() => nominalRef.current?.focus(), 150)
  }, [step])

  async function handleSubmit() {
    if (!createdBy || !selectedJenis || !nominal) return
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
      const { error } = await supabase.from('pengeluaran').insert({ ...item, synced_at: new Date().toISOString() })
      if (!error) item.synced_at = new Date().toISOString()
    }
    await syncQueue()
    const newStreak = streak + 1
    setStreak(newStreak)
    localStorage.setItem('input-streak', String(newStreak))
    // Sync XP — load current from IDB, add 10, save + push to Supabase
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
    setStep('who'); setCreatedBy(null); setSelectedJenis(null); setNominal(''); setKeterangan('')
  }

  const stepLabel = { who: 'Siapa kamu?', jenis: 'Kategori', nominal: 'Berapa?', keterangan: 'Keterangan', confirm: 'Konfirmasi' }[step]
  const progress  = { who: 20, jenis: 40, nominal: 60, keterangan: 80, confirm: 100 }[step]

  return (
    <div className="relative">
      {/* Confetti */}
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-50">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="absolute animate-bounce"
              style={{ left: `${Math.random()*100}%`, top: `${Math.random()*60}%`, animationDelay: `${Math.random()*0.5}s`, animationDuration: `${0.5+Math.random()}s`, fontSize: '1.8rem' }}>
              {['🎉','✨','💸','🌟','💰'][Math.floor(Math.random()*5)]}
            </div>
          ))}
        </div>
      )}
      {xpAnim && (
        <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-ping text-5xl font-black text-indigo-500">
          +10 XP ⚡
        </div>
      )}

      {/* Progress header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-bold" style={{ color: 'var(--text)' }}>{stepLabel}</span>
          <span className="text-sm font-bold text-indigo-500 dark:text-indigo-400">🔥 {streak} entries</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ── Step: Who ── */}
      {step === 'who' && (
        <div className="space-y-4">
          <p className="text-base" style={{ color: 'var(--text-2)' }}>Pilih dulu siapa yang catat:</p>
          {(['wiku', 'dita'] as const).map(name => (
            <button key={name}
              onClick={() => { setCreatedBy(name); setStep('jenis') }}
              className="w-full flex items-center gap-5 p-5 rounded-2xl border-2 hover:border-indigo-500 active:scale-[0.98] transition-all duration-150 group"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <span className="text-4xl">{name === 'wiku' ? '🧔' : '👩'}</span>
              <span className="text-xl font-bold capitalize" style={{ color: 'var(--text)' }}>{name}</span>
              <span className="ml-auto text-2xl text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Step: Jenis ── */}
      {step === 'jenis' && (
        <div>
          <div className="grid grid-cols-3 gap-3">
            {jenisList.map(j => (
              <button key={j.id}
                onClick={() => { setSelectedJenis(j); setStep('nominal') }}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 hover:border-indigo-500 active:scale-95 transition-all"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <span className="text-3xl">{j.icon}</span>
                <span className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--text-2)' }}>{j.nama}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep('who')}
            className="mt-5 w-full py-3 rounded-xl text-base font-semibold border transition-colors active:scale-[0.98]"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            ← Ganti siapa
          </button>
        </div>
      )}

      {/* ── Step: Nominal ── */}
      {step === 'nominal' && (
        <div className="space-y-5">
          {/* Category chip */}
          <div className="flex items-center gap-3 p-4 rounded-2xl border"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <span className="text-3xl">{selectedJenis?.icon}</span>
            <span className="text-lg font-bold" style={{ color: 'var(--text)' }}>{selectedJenis?.nama}</span>
          </div>

          {/* Amount input */}
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold" style={{ color: 'var(--text-3)' }}>Rp</span>
            <input ref={nominalRef} type="text" inputMode="numeric" placeholder="0"
              value={nominal} onChange={e => setNominal(fmtInput(e.target.value))}
              className="w-full pl-16 pr-5 py-5 text-3xl font-black rounded-2xl border-2 outline-none focus:border-indigo-500 transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }} />
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-5 gap-2">
            {[10000, 25000, 50000, 100000, 200000].map(amt => (
              <button key={amt} onClick={() => setNominal(fmtInput(String(amt)))}
                className="py-3 rounded-xl text-sm font-bold border active:scale-95 transition-all hover:border-indigo-500 hover:text-indigo-500"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                {amt >= 100000 ? `${amt/1000}rb` : `${amt/1000}rb`}
              </button>
            ))}
          </div>

          <button disabled={!nominal || nominal === '0'} onClick={() => setStep('keterangan')}
            className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-40 text-white font-black text-xl transition-all">
            Lanjut →
          </button>
          <button onClick={() => setStep('jenis')}
            className="w-full py-3 rounded-xl text-base font-semibold border transition-colors active:scale-[0.98]"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            ← Ganti kategori
          </button>
        </div>
      )}

      {/* ── Step: Keterangan ── */}
      {step === 'keterangan' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-2xl border"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedJenis?.icon}</span>
              <span className="text-lg font-bold" style={{ color: 'var(--text)' }}>{selectedJenis?.nama}</span>
            </div>
            <span className="text-lg font-black text-indigo-500">Rp {nominal}</span>
          </div>
          <textarea
            placeholder="Keterangan (opsional)... misal: indomaret, gojek, dll"
            value={keterangan} onChange={e => setKeterangan(e.target.value)} rows={4}
            className="w-full px-5 py-4 text-base rounded-2xl border-2 outline-none focus:border-indigo-500 resize-none transition-colors"
            style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }} />
          <button onClick={() => setStep('confirm')}
            className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black text-xl transition-all">
            Review →
          </button>
          <button onClick={() => setStep('nominal')}
            className="w-full py-3 rounded-xl text-base font-semibold border transition-colors active:scale-[0.98]"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            ← Ganti nominal
          </button>
        </div>
      )}

      {/* ── Step: Confirm ── */}
      {step === 'confirm' && (
        <div className="space-y-5">
          <div className="rounded-2xl border divide-y overflow-hidden"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-4 p-5" style={{ borderColor: 'var(--border)' }}>
              <span className="text-4xl">{createdBy === 'wiku' ? '🧔' : '👩'}</span>
              <div>
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>Dicatat oleh</div>
                <div className="text-lg font-black capitalize" style={{ color: 'var(--text)' }}>{createdBy}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5">
              <span className="text-4xl">{selectedJenis?.icon}</span>
              <div>
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>Kategori</div>
                <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{selectedJenis?.nama}</div>
              </div>
            </div>
            <div className="p-5">
              <div className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>Nominal</div>
              <div className="text-3xl font-black text-indigo-500 dark:text-indigo-400">Rp {nominal}</div>
            </div>
            {keterangan && (
              <div className="p-5">
                <div className="text-sm mb-1" style={{ color: 'var(--text-3)' }}>Keterangan</div>
                <div className="text-base" style={{ color: 'var(--text)' }}>{keterangan}</div>
              </div>
            )}
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xl transition-all shadow-lg shadow-indigo-500/20">
            {submitting ? '⏳ Menyimpan...' : '✅ Simpan +10 XP'}
          </button>
          <button onClick={() => setStep('keterangan')}
            className="w-full py-3 rounded-xl text-base font-semibold border transition-colors active:scale-[0.98]"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            ← Edit dulu
          </button>
        </div>
      )}
    </div>
  )
}
