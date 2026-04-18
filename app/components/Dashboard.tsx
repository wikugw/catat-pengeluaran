'use client'

import { Pengeluaran } from '@/lib/supabase'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

type Props = {
  data: Pengeluaran[]
  loading: boolean
}

export default function Dashboard({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-slate-800 animate-pulse" />
        ))}
      </div>
    )
  }

  const total = data.reduce((s, p) => s + p.nominal, 0)
  const wiku = data.filter((p) => p.created_by === 'wiku').reduce((s, p) => s + p.nominal, 0)
  const dita = data.filter((p) => p.created_by === 'dita').reduce((s, p) => s + p.nominal, 0)

  // Group by jenis
  const byJenis: Record<string, { nama: string; total: number; count: number }> = {}
  for (const p of data) {
    if (!byJenis[p.jenis_nama]) byJenis[p.jenis_nama] = { nama: p.jenis_nama, total: 0, count: 0 }
    byJenis[p.jenis_nama].total += p.nominal
    byJenis[p.jenis_nama].count += 1
  }
  const sorted = Object.values(byJenis).sort((a, b) => b.total - a.total)
  const topJenis = sorted.slice(0, 5)
  const maxVal = topJenis[0]?.total || 1

  const now = new Date()
  const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      {/* Month total */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-700/50 p-5">
        <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total {monthName}</div>
        <div className="text-3xl font-black text-white">{formatRupiah(total)}</div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧔</span>
            <div>
              <div className="text-xs text-slate-400">Wiku</div>
              <div className="text-sm font-bold text-indigo-300">{formatRupiah(wiku)}</div>
            </div>
          </div>
          <div className="w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="text-lg">👩</span>
            <div>
              <div className="text-xs text-slate-400">Dita</div>
              <div className="text-sm font-bold text-purple-300">{formatRupiah(dita)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top categories */}
      {topJenis.length > 0 && (
        <div className="rounded-2xl bg-slate-800 border border-slate-700 p-5">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-4">Top Kategori</div>
          <div className="space-y-3">
            {topJenis.map((j) => (
              <div key={j.nama}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{j.nama}</span>
                  <span className="text-white font-semibold">{formatRupiah(j.total)}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                    style={{ width: `${(j.total / maxVal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">Transaksi</div>
          <div className="text-2xl font-black text-white">{data.length}</div>
          <div className="text-xs text-slate-500">bulan ini</div>
        </div>
        <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">Rata-rata</div>
          <div className="text-2xl font-black text-white">
            {data.length > 0 ? formatRupiah(Math.round(total / data.length)) : '-'}
          </div>
          <div className="text-xs text-slate-500">per transaksi</div>
        </div>
      </div>
    </div>
  )
}
