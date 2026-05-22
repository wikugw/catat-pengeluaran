'use client'

import { useState } from 'react'
import { Pengeluaran, Budget } from '@/lib/supabase'
import { exportToExcel } from '@/lib/export'
import MonthlyNote from './MonthlyNote'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n)
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
  const [showAllKategori, setShowAllKategori] = useState(false)
  const monthName = new Date(year, month).toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
        ))}
      </div>
    )
  }

  const total = data.reduce((s, p) => s + p.nominal, 0)
  const wiku  = data.filter(p => p.created_by === 'wiku').reduce((s, p) => s + p.nominal, 0)
  const dita  = data.filter(p => p.created_by === 'dita').reduce((s, p) => s + p.nominal, 0)

  // Stats
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month
  const daysElapsed = isCurrentMonth
    ? now.getDate()
    : new Date(year, month + 1, 0).getDate()
  const avgPerDay = daysElapsed > 0 ? Math.round(total / daysElapsed) : 0

  // Categories
  const byJenis: Record<string, { nama: string; total: number }> = {}
  for (const p of data) {
    if (!byJenis[p.jenis_nama]) byJenis[p.jenis_nama] = { nama: p.jenis_nama, total: 0 }
    byJenis[p.jenis_nama].total += p.nominal
  }
  const sortedJenis = Object.values(byJenis).sort((a, b) => b.total - a.total)
  const maxJenis = sortedJenis[0]?.total || 1
  const visibleJenis = showAllKategori ? sortedJenis : sortedJenis.slice(0, 5)
  const hiddenCount = sortedJenis.length - 5

  // Weekly
  const weeks = [0, 0, 0, 0, 0]
  for (const p of data) {
    const weekIdx = Math.min(Math.floor((new Date(p.created_at).getDate() - 1) / 7), 4)
    weeks[weekIdx] += p.nominal
  }
  const maxWeek = Math.max(...weeks) || 1
  const currentWeek = isCurrentMonth
    ? Math.min(Math.floor((now.getDate() - 1) / 7), 4) : -1

  const budgetMap: Record<string, number> = {}
  for (const b of budgets) budgetMap[b.jenis_nama] = b.monthly_limit

  const overBudgetCount = sortedJenis.filter(j => budgetMap[j.nama] && j.total > budgetMap[j.nama]).length

  return (
    <div className="space-y-3">

      {/* ── 1. Total card ── */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
        <div className="flex items-start justify-between mb-1">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-75">
            Total {monthName}
          </div>
          <button
            onClick={() => data.length > 0 && exportToExcel(data, year, month)}
            disabled={data.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
              bg-white/15 hover:bg-white/25 active:scale-95 disabled:opacity-40
              transition-all border border-white/20"
          >
            📥 Excel
          </button>
        </div>

        <div className="text-4xl font-black mb-4">{fmt(total)}</div>

        {/* Wiku vs Dita */}
        <div className="space-y-2">
          {[
            { label: '🧔 Wiku', val: wiku },
            { label: '👩 Dita', val: dita },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs w-16 opacity-90 shrink-0">{label}</span>
              <div className="flex-1 h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/70 rounded-full transition-all duration-700"
                  style={{ width: total > 0 ? `${(val / total) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-sm font-bold w-14 text-right opacity-90 shrink-0">
                {fmtShort(val)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Stats row — immediately below total, always visible ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Transaksi',       val: String(data.length),                          sub: 'total' },
          { label: 'Rata-rata/hari',  val: data.length > 0 ? fmtShort(avgPerDay) : '-',  sub: `${daysElapsed} hari` },
          { label: 'Kategori',        val: String(Object.keys(byJenis).length),           sub: 'aktif' },
        ].map(({ label, val, sub }) => (
          <div key={label} className="rounded-2xl border p-3.5"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="text-[11px] font-semibold mb-1 leading-tight" style={{ color: 'var(--text-3)' }}>
              {label}
            </div>
            <div className="text-xl font-black leading-none mb-0.5">{val}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── 3. Weekly chart ── */}
      {data.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-3)' }}>Per Minggu</div>
          <div className="flex items-end gap-2" style={{ height: '80px' }}>
            {weeks.map((w, i) => {
              const barH = w > 0
                ? Math.max((w / maxWeek) * 64, 10) // min 10px so it's always visible
                : 4 // empty weeks: 4px stub
              const isActive = i === currentWeek
              const isFuture = isCurrentMonth && i > currentWeek

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  {/* Amount label */}
                  <div className="text-[10px] font-semibold"
                    style={{ color: isActive ? '#6366f1' : 'var(--text-3)', minHeight: '14px' }}>
                    {w > 0 ? fmtShort(w) : ''}
                  </div>
                  {/* Bar */}
                  <div
                    className="w-full rounded-t-lg transition-all duration-700"
                    style={{
                      height: `${barH}px`,
                      background: isFuture
                        ? 'var(--border)'
                        : isActive
                          ? '#6366f1'
                          : w > 0 ? '#818cf8' : 'var(--border)',
                      opacity: isFuture ? 0.3 : 1,
                    }}
                  />
                  {/* Week label */}
                  <div className="text-[10px] font-bold"
                    style={{ color: isActive ? '#6366f1' : 'var(--text-3)' }}>
                    W{i + 1}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 4. Categories ── */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-3)' }}>Kategori</span>
            {overBudgetCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                ⚠ {overBudgetCount} over budget
              </span>
            )}
          </div>
          <button
            onClick={onOpenBudget}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
          >
            ⚙ Budget
          </button>
        </div>

        {sortedJenis.length === 0 ? (
          <div className="text-center text-sm py-8 px-4" style={{ color: 'var(--text-3)' }}>
            Belum ada data bulan ini
          </div>
        ) : (
          <div className="px-4 pb-2 space-y-4">
            {visibleJenis.map(j => {
              const budget = budgetMap[j.nama]
              const pct    = budget
                ? Math.min((j.total / budget) * 100, 100)
                : (j.total / maxJenis) * 100
              const over = budget && j.total > budget
              const near = budget && j.total > budget * 0.8 && !over
              const barBg = over ? '#ef4444' : near ? '#f59e0b' : '#6366f1'

              return (
                <div key={j.nama}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {j.nama}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Over budget badge — prominent, not subtext */}
                      {over && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                          bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400
                          border border-red-200 dark:border-red-800 whitespace-nowrap">
                          +{fmtShort(j.total - budget)} over
                        </span>
                      )}
                      {near && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full
                          bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400
                          border border-amber-200 dark:border-amber-800">
                          hampir
                        </span>
                      )}
                      <span className="text-sm font-bold"
                        style={{ color: over ? '#ef4444' : near ? '#f59e0b' : 'var(--text)' }}>
                        {fmtShort(j.total)}
                        {budget && (
                          <span className="font-normal text-xs ml-1" style={{ color: 'var(--text-3)' }}>
                            /{fmtShort(budget)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: barBg }}
                    />
                  </div>
                </div>
              )
            })}

            {/* Show more / less */}
            {sortedJenis.length > 5 && (
              <button
                onClick={() => setShowAllKategori(p => !p)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98] mt-1"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
              >
                {showAllKategori
                  ? '↑ Tampilkan lebih sedikit'
                  : `↓ Lihat ${hiddenCount} kategori lainnya`}
              </button>
            )}
          </div>
        )}

        <div className="h-3" />
      </div>

      {/* ── 5. Monthly note — bottom, it's editorial not financial ── */}
      <MonthlyNote year={year} month={month} />

    </div>
  )
}
