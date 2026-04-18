'use client'

import { Pengeluaran, Budget } from '@/lib/supabase'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function fmtShort(n: number) {
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
        {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
      </div>
    )
  }

  const total = data.reduce((s, p) => s + p.nominal, 0)
  const wiku  = data.filter(p => p.created_by === 'wiku').reduce((s, p) => s + p.nominal, 0)
  const dita  = data.filter(p => p.created_by === 'dita').reduce((s, p) => s + p.nominal, 0)

  const byJenis: Record<string, { nama: string; total: number }> = {}
  for (const p of data) {
    if (!byJenis[p.jenis_nama]) byJenis[p.jenis_nama] = { nama: p.jenis_nama, total: 0 }
    byJenis[p.jenis_nama].total += p.nominal
  }
  const sortedJenis = Object.values(byJenis).sort((a, b) => b.total - a.total)
  const maxJenis = sortedJenis[0]?.total || 1

  const weeks = [0, 0, 0, 0, 0]
  for (const p of data) {
    const weekIdx = Math.min(Math.floor((new Date(p.created_at).getDate() - 1) / 7), 4)
    weeks[weekIdx] += p.nominal
  }
  const maxWeek = Math.max(...weeks) || 1
  const now = new Date()
  const currentWeek = now.getFullYear() === year && now.getMonth() === month
    ? Math.min(Math.floor((now.getDate() - 1) / 7), 4) : -1

  const budgetMap: Record<string, number> = {}
  for (const b of budgets) budgetMap[b.jenis_nama] = b.monthly_limit

  const monthName = new Date(year, month).toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Total card */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
        <div className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">Total {monthName}</div>
        <div className="text-3xl font-black">{fmt(total)}</div>
        <div className="mt-3 space-y-1.5">
          {[{ label: '🧔 Wiku', val: wiku, color: 'bg-white/60' }, { label: '👩 Dita', val: dita, color: 'bg-white/40' }].map(({ label, val, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs w-14 opacity-90">{label}</span>
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-700`}
                  style={{ width: total > 0 ? `${(val / total) * 100}%` : '0%' }} />
              </div>
              <span className="text-xs font-bold w-16 text-right opacity-90">{fmtShort(val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly chart */}
      {data.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Minggu ini</div>
          <div className="flex items-end gap-2 h-20">
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>{w > 0 ? fmtShort(w) : ''}</div>
                <div className="w-full rounded-t-lg transition-all duration-700"
                  style={{
                    height: `${Math.max((w / maxWeek) * 56, w > 0 ? 6 : 0)}px`,
                    background: i === currentWeek ? '#6366f1' : 'var(--border)',
                  }} />
                <div className="text-[10px] font-semibold"
                  style={{ color: i === currentWeek ? '#6366f1' : 'var(--text-3)' }}>W{i+1}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Kategori</div>
          <button onClick={onOpenBudget}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity">
            ⚙ Set Budget
          </button>
        </div>
        {sortedJenis.length === 0
          ? <div className="text-center text-sm py-4" style={{ color: 'var(--text-3)' }}>Belum ada data</div>
          : <div className="space-y-3">
              {sortedJenis.map(j => {
                const budget = budgetMap[j.nama]
                const pct = budget ? Math.min((j.total / budget) * 100, 100) : (j.total / maxJenis) * 100
                const over  = budget && j.total > budget
                const near  = budget && j.total > budget * 0.8 && !over
                const barBg = over ? '#ef4444' : near ? '#f59e0b' : '#6366f1'
                return (
                  <div key={j.nama}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: 'var(--text-2)' }}>{j.nama}</span>
                      <div className="text-right">
                        <span className="font-semibold" style={{ color: over ? '#ef4444' : near ? '#f59e0b' : 'var(--text)' }}>
                          {fmtShort(j.total)}
                        </span>
                        {budget && <span className="text-xs ml-1" style={{ color: 'var(--text-3)' }}>/ {fmtShort(budget)}</span>}
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barBg }} />
                    </div>
                    {over && <div className="text-[10px] text-red-500 mt-0.5 text-right">⚠ +{fmtShort(j.total - budget)} over budget</div>}
                  </div>
                )
              })}
            </div>
        }
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Transaksi', val: String(data.length) },
          { label: 'Rata-rata', val: data.length > 0 ? fmtShort(Math.round(total / data.length)) : '-' },
          { label: 'Kategori', val: String(Object.keys(byJenis).length) },
        ].map(({ label, val }) => (
          <div key={label} className="rounded-2xl border p-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{label}</div>
            <div className="text-xl font-black">{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
