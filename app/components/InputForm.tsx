'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, JenisPengeluaran } from '@/lib/supabase'
import { saveJenisOffline, getJenisOffline, savePengeluaranOffline } from '@/lib/idb'
import { syncQueue } from '@/lib/sync'

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
    async function loadJenis() {
      try {
        const { data, error } = await supabase.from('jenis_pengeluaran').select('*').order('nama')
        if (data && !error) { setJenisList(data); await saveJenisOffline(data) }
        else throw new Error()
      } catch {
        const cached = await getJenisOffline()
        if (cached.length > 0) setJenisList(cached)
      }
    }
    loadJenis()
  }, [])

  useEffect(() => {
    if (step === 'nominal') setTimeout(() => nominalRef.current?.focus(), 100)
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
    setStreak(newStreak); localStorage.setItem('input-streak', String(newStreak))
    setXpAnim(true); setConfetti(true)
    setTimeout(() => setXpAnim(false), 1500)
    setTimeout(() => setConfetti(false), 2500)
    setSubmitting(false)
    setTimeout(() => { resetForm(); onSuccess() }, 1000)
  }

  function resetForm() { setStep('who'); setCreatedBy(null); setSelectedJenis(null); setNominal(''); setKeterangan('') }

  const progress = { who: 20, jenis: 40, nominal: 60, keterangan: 80, confirm: 100 }[step]

  // shared input style
  const inputCls = "w-full outline-none transition-colors border-2 focus:border-indigo-500 rounded-2xl"
  const inputStyle = { background: 'var(--bg-input)', color: 'var(--text)', borderColor: 'var(--border)' }

  return (
    <div className="relative overflow-hidden">
      {/* Confetti */}
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-50">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="absolute animate-bounce"
              style={{ left: `${Math.random()*100}%`, top: `${Math.random()*60}%`, animationDelay: `${Math.random()*0.5}s`, animationDuration: `${0.5+Math.random()}s`, fontSize: '1.5rem' }}>
              {['🎉','✨','💸','🌟','💰'][Math.floor(Math.random()*5)]}
            </div>
          ))}
        </div>
      )}
      {xpAnim && (
        <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-ping text-4xl font-black text-indigo-500">
          +10 XP ⚡
        </div>
      )}

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            {step === 'who' && 'Siapa kamu?'}{step === 'jenis' && 'Kategori'}{step === 'nominal' && 'Berapa?'}{step === 'keterangan' && 'Keterangan'}{step === 'confirm' && 'Konfirmasi'}
          </span>
          <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">🔥 {streak} entries</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step: Who */}
      {step === 'who' && (
        <div className="space-y-3">
          <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Pilih dulu siapa yang catat:</p>
          {(['wiku', 'dita'] as const).map(name => (
            <button key={name} onClick={() => { setCreatedBy(name); setStep('jenis') }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 hover:border-indigo-500 transition-all duration-200 group"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <span className="text-3xl">{name === 'wiku' ? '🧔' : '👩'}</span>
              <span className="text-lg font-bold capitalize" style={{ color: 'var(--text)' }}>{name}</span>
              <span className="ml-auto text-indigo-400 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          ))}
        </div>
      )}

      {/* Step: Jenis */}
      {step === 'jenis' && (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Pilih kategori:</p>
          <div className="grid grid-cols-3 gap-2">
            {jenisList.map(j => (
              <button key={j.id} onClick={() => { setSelectedJenis(j); setStep('nominal') }}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl border-2 hover:border-indigo-500 transition-all active:scale-95"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <span className="text-2xl">{j.icon}</span>
                <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-2)' }}>{j.nama}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep('who')} className="mt-4 text-xs transition-colors" style={{ color: 'var(--text-3)' }}>← Ganti siapa</button>
        </div>
      )}

      {/* Step: Nominal */}
      {step === 'nominal' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedJenis?.icon}</span>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{selectedJenis?.nama}</span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg" style={{ color: 'var(--text-3)' }}>Rp</span>
            <input ref={nominalRef} type="text" inputMode="numeric" placeholder="0"
              value={nominal} onChange={e => setNominal(fmtInput(e.target.value))}
              className={`${inputCls} pl-12 pr-4 py-4 text-2xl font-bold`} style={inputStyle} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[10000,25000,50000,100000,200000].map(amt => (
              <button key={amt} onClick={() => setNominal(fmtInput(String(amt)))}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-indigo-600 hover:text-white border"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                {(amt/1000).toFixed(0)}rb
              </button>
            ))}
          </div>
          <button disabled={!nominal || nominal === '0'} onClick={() => setStep('keterangan')}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-lg transition-all">
            Lanjut →
          </button>
          <button onClick={() => setStep('jenis')} className="w-full text-xs transition-colors" style={{ color: 'var(--text-3)' }}>← Ganti kategori</button>
        </div>
      )}

      {/* Step: Keterangan */}
      {step === 'keterangan' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedJenis?.icon}</span>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{selectedJenis?.nama}</span>
            <span className="ml-auto font-bold text-indigo-500">Rp {nominal}</span>
          </div>
          <textarea placeholder="Keterangan (opsional)..." value={keterangan} onChange={e => setKeterangan(e.target.value)} rows={3}
            className={`${inputCls} px-4 py-3 resize-none`} style={inputStyle} />
          <button onClick={() => setStep('confirm')}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all">
            Review →
          </button>
          <button onClick={() => setStep('nominal')} className="w-full text-xs" style={{ color: 'var(--text-3)' }}>← Ganti nominal</button>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{createdBy === 'wiku' ? '🧔' : '👩'}</span>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>Dicatat oleh</div>
                <div className="font-bold capitalize" style={{ color: 'var(--text)' }}>{createdBy}</div>
              </div>
            </div>
            <hr style={{ borderColor: 'var(--border)' }} />
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedJenis?.icon}</span>
              <div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>Kategori</div>
                <div className="font-semibold" style={{ color: 'var(--text)' }}>{selectedJenis?.nama}</div>
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>Nominal</div>
              <div className="text-2xl font-black text-indigo-500 dark:text-indigo-400">Rp {nominal}</div>
            </div>
            {keterangan && (
              <div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>Keterangan</div>
                <div className="text-sm" style={{ color: 'var(--text)' }}>{keterangan}</div>
              </div>
            )}
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-lg transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
            {submitting ? '⏳ Menyimpan...' : '✅ Simpan +10XP'}
          </button>
          <button onClick={() => setStep('keterangan')} className="w-full text-xs" style={{ color: 'var(--text-3)' }}>← Edit</button>
        </div>
      )}
    </div>
  )
}
