'use client'

import { Pengeluaran } from '@/lib/supabase'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type Props = {
  data: Pengeluaran[]
  loading: boolean
}

export default function PengeluaranTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="text-4xl mb-2">💸</div>
        <div className="text-sm">Belum ada pengeluaran bulan ini</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {data.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-colors"
        >
          <div className="flex flex-col items-center justify-center w-8 shrink-0">
            <span className="text-xs text-slate-500">{p.created_by === 'wiku' ? '🧔' : '👩'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">{p.jenis_nama}</span>
              {!p.synced_at && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400 border border-amber-700/50 shrink-0">
                  offline
                </span>
              )}
            </div>
            {p.keterangan && (
              <div className="text-xs text-slate-400 truncate">{p.keterangan}</div>
            )}
            <div className="text-xs text-slate-500">{formatDate(p.created_at)}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-indigo-300">{formatRupiah(p.nominal)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
