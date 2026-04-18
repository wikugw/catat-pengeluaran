'use client'

import { useState, useEffect } from 'react'
import { JenisPengeluaran, Budget } from '@/lib/supabase'
import { fetchBudgets, upsertBudget } from '@/lib/sync'
import { saveBudgetsOffline, getBudgetsOffline } from '@/lib/idb'

function formatRupiah(val: string) {
  const num = val.replace(/\D/g, '')
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

type Props = {
  jenisList: JenisPengeluaran[]
  onClose: () => void
}

export default function BudgetModal({ jenisList, onClose }: Props) {
  const [budgets, setBudgets] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      let data: Budget[] | null = null
      if (navigator.onLine) {
        data = await fetchBudgets()
        if (data) await saveBudgetsOffline(data)
      } else {
        data = await getBudgetsOffline()
      }
      if (data) {
        const map: Record<string, string> = {}
        for (const b of data) {
          map[b.jenis_nama] = b.monthly_limit.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        }
        setBudgets(map)
      }
    }
    load()
  }, [])

  async function handleSave(jenis_nama: string) {
    const val = budgets[jenis_nama]
    if (!val) return
    setSaving(jenis_nama)
    const limit = parseInt(val.replace(/\./g, ''))
    await upsertBudget(jenis_nama, limit)
    await saveBudgetsOffline([{ jenis_nama, monthly_limit: limit }])
    setSaving(null)
    setSaved(jenis_nama)
    setTimeout(() => setSaved(null), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-t-3xl p-5 pb-10 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-lg font-black text-white">Budget per Kategori</h2>
            <p className="text-xs text-slate-400">Set batas pengeluaran bulanan</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="overflow-y-auto space-y-2 pr-1">
          {jenisList.map(j => (
            <div key={j.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800 border border-slate-700">
              <span className="text-xl shrink-0">{j.icon}</span>
              <span className="text-sm text-slate-300 w-28 shrink-0 truncate">{j.nama}</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Tidak dibatasi"
                  value={budgets[j.nama] || ''}
                  onChange={e => setBudgets(prev => ({ ...prev, [j.nama]: formatRupiah(e.target.value) }))}
                  className="w-full pl-8 pr-2 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-indigo-500 outline-none text-white text-sm transition-colors"
                />
              </div>
              <button
                onClick={() => handleSave(j.nama)}
                disabled={saving === j.nama}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0"
              >
                {saved === j.nama ? '✓' : saving === j.nama ? '...' : 'Set'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
