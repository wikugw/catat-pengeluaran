'use client'

import { useState, useEffect } from 'react'
import { JenisPengeluaran, Budget } from '@/lib/supabase'
import { fetchBudgets, upsertBudget, deleteBudget } from '@/lib/sync'
import { saveBudgetsOffline, getBudgetsOffline, deleteBudgetOffline } from '@/lib/idb'

function fmtInput(val: string) {
  return val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function BudgetModal({ jenisList, onClose }: { jenisList: JenisPengeluaran[]; onClose: () => void }) {
  const [budgets, setBudgets] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved]   = useState<string | null>(null)
  const [clearing, setClearing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      let data: Budget[] | null = null
      if (navigator.onLine) { data = await fetchBudgets(); if (data) await saveBudgetsOffline(data) }
      else data = await getBudgetsOffline()
      if (data) {
        const map: Record<string, string> = {}
        for (const b of data) map[b.jenis_nama] = b.monthly_limit.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        setBudgets(map)
      }
    }
    load()
  }, [])

  async function handleSave(jenis_nama: string) {
    const val = budgets[jenis_nama]; if (!val) return
    setSaving(jenis_nama)
    const limit = parseInt(val.replace(/\./g, ''))
    await upsertBudget(jenis_nama, limit)
    await saveBudgetsOffline([{ jenis_nama, monthly_limit: limit }])
    setSaving(null); setSaved(jenis_nama)
    setTimeout(() => setSaved(null), 1500)
  }

  async function handleClear(jenis_nama: string) {
    setClearing(jenis_nama)
    await deleteBudgetOffline(jenis_nama)
    if (navigator.onLine) await deleteBudget(jenis_nama)
    setBudgets(prev => { const next = { ...prev }; delete next[jenis_nama]; return next })
    setClearing(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl border-t border-x p-5 pb-10 max-h-[85vh] flex flex-col"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>Budget per Kategori</h2>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Set atau hapus batas pengeluaran bulanan</p>
          </div>
          <button onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-xl transition-colors active:scale-90"
            style={{ color: 'var(--text-3)' }}>✕</button>
        </div>

        <div className="overflow-y-auto space-y-2">
          {jenisList.map(j => {
            const hasBudget = !!budgets[j.nama]
            return (
              <div key={j.id} className="rounded-2xl border overflow-hidden"
                style={{ borderColor: 'var(--border)' }}>
                {/* Category header row */}
                <div className="flex items-center gap-3 px-4 py-3"
                  style={{ background: 'var(--bg-input)' }}>
                  <span className="text-xl shrink-0">{j.icon}</span>
                  <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--text)' }}>{j.nama}</span>
                  {hasBudget && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 font-bold shrink-0">
                      Rp {budgets[j.nama]}
                    </span>
                  )}
                </div>

                {/* Input + actions */}
                <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: 'var(--bg-card)' }}>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--text-3)' }}>Rp</span>
                    <input type="text" inputMode="numeric"
                      placeholder={hasBudget ? budgets[j.nama] : 'Tidak dibatasi'}
                      value={budgets[j.nama] || ''}
                      onChange={e => setBudgets(prev => ({ ...prev, [j.nama]: fmtInput(e.target.value) }))}
                      className="w-full pl-8 pr-2 py-2.5 rounded-xl border text-sm outline-none transition-colors focus:border-indigo-500"
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                  </div>

                  {/* Set button */}
                  <button onClick={() => handleSave(j.nama)}
                    disabled={saving === j.nama || !budgets[j.nama]}
                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold transition-all active:scale-95 shrink-0">
                    {saved === j.nama ? '✓' : saving === j.nama ? '...' : 'Set'}
                  </button>

                  {/* Clear button — only shown if budget exists */}
                  {hasBudget && (
                    <button onClick={() => handleClear(j.nama)}
                      disabled={clearing === j.nama}
                      className="h-10 w-10 flex items-center justify-center rounded-xl border text-base transition-all active:scale-95 shrink-0
                        bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500"
                      title="Hapus budget">
                      {clearing === j.nama ? '…' : '✕'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
