'use client'

import { useState } from 'react'
import { Pengeluaran, JenisPengeluaran } from '@/lib/supabase'
import EditModal from './EditModal'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

type Props = {
  data: Pengeluaran[]
  jenisList: JenisPengeluaran[]
  loading: boolean
  onRefresh: () => void
}

export default function PengeluaranTable({ data, jenisList, loading, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState<string>('all')
  const [filterWho, setFilterWho] = useState<string>('all')
  const [editItem, setEditItem] = useState<Pengeluaran | null>(null)

  const filtered = data.filter(p => {
    const matchSearch = !search ||
      p.jenis_nama.toLowerCase().includes(search.toLowerCase()) ||
      (p.keterangan || '').toLowerCase().includes(search.toLowerCase())
    const matchJenis = filterJenis === 'all' || p.jenis_nama === filterJenis
    const matchWho = filterWho === 'all' || p.created_by === filterWho
    return matchSearch && matchJenis && matchWho
  })

  const total = filtered.reduce((s, p) => s + p.nominal, 0)

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      {editItem && (
        <EditModal
          item={editItem}
          jenisList={jenisList}
          onClose={() => setEditItem(null)}
          onUpdated={() => { setEditItem(null); onRefresh() }}
          onDeleted={() => { setEditItem(null); onRefresh() }}
        />
      )}

      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* Who filter */}
          {(['all', 'wiku', 'dita'] as const).map(w => (
            <button
              key={w}
              onClick={() => setFilterWho(w)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterWho === w
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {w === 'all' ? '👥 Semua' : w === 'wiku' ? '🧔 Wiku' : '👩 Dita'}
            </button>
          ))}
          <div className="w-px bg-slate-700 shrink-0" />
          {/* Jenis filter */}
          <button
            onClick={() => setFilterJenis('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filterJenis === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            Semua Kategori
          </button>
          {jenisList.map(j => (
            <button
              key={j.id}
              onClick={() => setFilterJenis(j.nama)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterJenis === j.nama ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {j.icon} {j.nama}
            </button>
          ))}
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div className="flex justify-between items-center px-1">
            <span className="text-xs text-slate-400">{filtered.length} transaksi</span>
            <span className="text-xs font-bold text-indigo-300">{formatRupiah(total)}</span>
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">Tidak ada transaksi</div>
          </div>
        ) : (
          filtered.map(p => (
            <button
              key={p.id}
              onClick={() => setEditItem(p)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800 border border-slate-700/50 hover:border-indigo-600/50 hover:bg-slate-750 transition-all text-left active:scale-[0.98]"
            >
              <div className="flex flex-col items-center justify-center w-8 shrink-0">
                <span className="text-lg">{p.created_by === 'wiku' ? '🧔' : '👩'}</span>
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
                <div className="text-[10px] text-slate-600 mt-0.5">tap to edit</div>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  )
}
