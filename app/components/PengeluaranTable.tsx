'use client'

import { useState, useRef } from 'react'
import { Pengeluaran, JenisPengeluaran } from '@/lib/supabase'
import { deletePengeluaran } from '@/lib/sync'
import { deletePengeluaranOffline } from '@/lib/idb'
import EditModal from './EditModal'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Swipeable row ──────────────────────────────────────────────
function SwipeRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Pengeluaran
  onEdit: () => void
  onDelete: () => void
}) {
  const startX = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const DELETE_THRESHOLD = 80

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffset(Math.max(dx, -120))
  }
  function onTouchEnd() {
    if (offset < -DELETE_THRESHOLD) {
      setDeleting(true)
      setTimeout(onDelete, 260)
    } else {
      setOffset(0)
    }
    startX.current = null
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete bg */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 rounded-xl">
        <span className="text-white font-bold text-sm">🗑 Hapus</span>
      </div>

      {/* Row */}
      <div
        className={`relative flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer
          bg-[var(--bg-card)] border-[var(--border)] hover:border-indigo-400/50
          ${deleting ? 'slide-out' : ''}`}
        style={{ transform: `translateX(${deleting ? -200 : offset}px)`, transition: deleting ? undefined : offset === 0 ? 'transform 0.2s ease' : undefined }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (offset === 0) onEdit() }}
      >
        <div className="w-8 shrink-0 text-center">
          <span className="text-lg">{item.created_by === 'wiku' ? '🧔' : '👩'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{item.jenis_nama}</span>
            {!item.synced_at && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 shrink-0">
                offline
              </span>
            )}
          </div>
          {item.keterangan && (
            <div className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{item.keterangan}</div>
          )}
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDate(item.created_at)}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-indigo-500 dark:text-indigo-300">{formatRupiah(item.nominal)}</div>
          <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>← swipe hapus</div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
type Props = {
  data: Pengeluaran[]
  jenisList: JenisPengeluaran[]
  loading: boolean
  onRefresh: () => void
}

export default function PengeluaranTable({ data, jenisList, loading, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('all')
  const [filterWho, setFilterWho] = useState('all')
  const [editItem, setEditItem] = useState<Pengeluaran | null>(null)

  async function handleDelete(id: string) {
    await deletePengeluaranOffline(id)
    if (navigator.onLine) await deletePengeluaran(id)
    onRefresh()
  }

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
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }}>🔍</span>
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors border"
            style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: search ? 'var(--border-focus)' : 'var(--border)' }}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'wiku', 'dita'] as const).map(w => (
            <button key={w} onClick={() => setFilterWho(w)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                filterWho === w ? 'bg-indigo-600 text-white border-indigo-600' : 'border-[var(--border)] text-[var(--text-2)]'
              }`}
              style={filterWho !== w ? { background: 'var(--bg-card)' } : {}}>
              {w === 'all' ? '👥 Semua' : w === 'wiku' ? '🧔 Wiku' : '👩 Dita'}
            </button>
          ))}
          <div className="w-px shrink-0" style={{ background: 'var(--border)' }} />
          <button onClick={() => setFilterJenis('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              filterJenis === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-[var(--border)] text-[var(--text-2)]'
            }`}
            style={filterJenis !== 'all' ? { background: 'var(--bg-card)' } : {}}>
            Semua Kategori
          </button>
          {jenisList.map(j => (
            <button key={j.id} onClick={() => setFilterJenis(j.nama)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                filterJenis === j.nama ? 'bg-indigo-600 text-white border-indigo-600' : 'border-[var(--border)] text-[var(--text-2)]'
              }`}
              style={filterJenis !== j.nama ? { background: 'var(--bg-card)' } : {}}>
              {j.icon} {j.nama}
            </button>
          ))}
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div className="flex justify-between items-center px-1">
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{filtered.length} transaksi</span>
            <span className="text-xs font-bold text-indigo-500 dark:text-indigo-300">{formatRupiah(total)}</span>
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-3)' }}>
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">Tidak ada transaksi</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <SwipeRow
                key={p.id}
                item={p}
                onEdit={() => setEditItem(p)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
