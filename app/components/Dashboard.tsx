'use client'

import { Pengeluaran, Budget } from '@/lib/supabase'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatRupiahShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`
  return String(n)
}

type Props = {
  data: Pengeluaran[]
  budgets: Budget[]
  loading: boolean
  year: number
  month: number
  onOpenBudget: () => void
}

export default function Dashboard({ data, budgets, loading, year, month, onOpenBudget }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-800 animate-pulse" />
        ))}
      </div>
    )
  }

  const total = data.reduce((s, p) => s + p.nominal, 0)
  const wiku = data.filter(p => p.created_by === 'wiku').reduce((s, p) => s + p.nominal, 0)
  const dita = data.filter(p => p.created_by === 'dita').reduce((s, p) => s + p.nominal, 0)
  const wikulead = wiku >= dita

  // Group by jenis
  const byJenis: Record<string, { nama: string; total: number; count: number }> = {}
  for (const p of data) {
    if (!byJenis[p.jenis_nama]) byJenis[p.jenis_nama] = { nama: p.jenis_nama, total: 0, count: 0 }
    byJenis[p.jenis_nama].total += p.nominal
    byJenis[p.jenis_nama].count += 1
  }
  const sortedJenis = Object.values(byJenis).sort((a, b) => b.total - a.total)
  const maxJenis = sortedJenis[0]?.total || 1

  // Weekly chart (4-5 weeks)
  const weeks: number[] = [0, 0, 0, 0, 0]
  const startOfMonth = new Date(year, month, 1)
  for (const p of data) {
    const d = new Date(p.created_at)
    const dayOfMonth = d.getDate() - 1
    const weekIdx = Math.min(Math.floor(dayOfMonth / 7), 4)
    weeks[weekIdx] += p.nominal
  }
  const maxWeek = Math.max(...weeks) || 1
  const today = new Date()
  const currentWeek = today.getFullYear() === year && today.getMonth() === month
    ? Math.min(Math.floor((today.getDate() - 1) / 7), 4)
    : -1

  const monthName = new Date(year, month).toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  const budgetMap: Record<string, number> = {}
  for (const b of budgets) budgetMap[b.jenis_nama] = b.monthly_limit

  const hasBudgets = budgets.length > 0

  return (
    <div className="space-y-4">
      {/* Month total */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-700/50 p-5">
        <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total {monthName}</div>
        <div className="text-3xl font-black text-white">{formatRupiah(total)}</div>

        {/* Wiku vs Dita */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm w-14 text-slate-300">🧔 Wiku</span>
            <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: total > 0 ? `${(wiku / total) * 100}%` : '0%' }} />
            </div>
            <span className={`text-xs font-bold w-20 text-right ${wikulead ? 'text-indigo-300' : 'text-slate-400'}`}>{formatRupiahShort(wiku)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm w-14 text-slate-300">👩 Dita</span>
            <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all duration-700"
                style={{ width: total > 0 ? `${(dita / total) * 100}%` : '0%' }} />
            </div>
            <span className={`text-xs font-bold w-20 text-right ${!wikulead ? 'text-purple-300' : 'text-slate-400'}`}>{formatRupiahShort(dita)}</span>
          </div>
        </div>
      </div>

      {/* Weekly bar chart */}
      {data.length > 0 && (
        <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">Pengeluaran per Minggu</div>
          <div className="flex items-end gap-2 h-20">
            {weeks.map((w, i) => {
              const isStarted = new Date(year, month, i * 7 + 1) <= startOfMonth || w > 0
              if (!isStarted && i > currentWeek + 1) return null
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] text-slate-500">{w > 0 ? formatRupiahShort(w) : ''}</div>
                  <div className="w-full rounded-t-lg transition-all duration-700 relative overflow-hidden"
                    style={{ height: `${Math.max((w / maxWeek) * 60, w > 0 ? 8 : 0)}px` }}>
                    <div className={`absolute inset-0 ${i === currentWeek ? 'bg-indigo-500' : 'bg-slate-600'} rounded-t-lg`} />
                  </div>
                  <div className={`text-[10px] ${i === currentWeek ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>W{i + 1}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top categories with budget */}
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-400 uppercase tracking-widest">Kategori</div>
          <button
            onClick={onOpenBudget}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            ⚙ Set Budget
          </button>
        </div>
        {sortedJenis.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-4">Belum ada data</div>
        ) : (
          <div className="space-y-3">
            {sortedJenis.map(j => {
              const budget = budgetMap[j.nama]
              const pct = budget ? Math.min((j.total / budget) * 100, 100) : (j.total / maxJenis) * 100
              const overBudget = budget && j.total > budget
              const nearBudget = budget && j.total > budget * 0.8 && !overBudget
              const barColor = overBudget
                ? 'from-red-500 to-red-400'
                : nearBudget
                ? 'from-amber-500 to-orange-400'
                : 'from-indigo-500 to-purple-500'

              return (
                <div key={j.nama}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{j.nama}</span>
                    <div className="text-right">
                      <span className={`font-semibold ${overBudget ? 'text-red-400' : nearBudget ? 'text-amber-400' : 'text-white'}`}>
                        {formatRupiahShort(j.total)}
                      </span>
                      {budget && (
                        <span className="text-slate-500 text-xs"> / {formatRupiahShort(budget)}</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {overBudget && (
                    <div className="text-[10px] text-red-400 mt-0.5 text-right">
                      ⚠ Melebihi budget +{formatRupiahShort(j.total - budget)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3">
          <div className="text-xs text-slate-400 mb-1">Transaksi</div>
          <div className="text-xl font-black text-white">{data.length}</div>
        </div>
        <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3">
          <div className="text-xs text-slate-400 mb-1">Rata-rata</div>
          <div className="text-xl font-black text-white">
            {data.length > 0 ? formatRupiahShort(Math.round(total / data.length)) : '-'}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-800 border border-slate-700 p-3">
          <div className="text-xs text-slate-400 mb-1">Kategori</div>
          <div className="text-xl font-black text-white">{Object.keys(byJenis).length}</div>
        </div>
      </div>
    </div>
  )
}
