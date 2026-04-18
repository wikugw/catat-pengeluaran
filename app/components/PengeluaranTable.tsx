'use client'

import { useState, useRef } from 'react'
import { Pengeluaran, JenisPengeluaran } from '@/lib/supabase'
import { deletePengeluaran } from '@/lib/sync'
import { deletePengeluaranOffline } from '@/lib/idb'
import EditModal from './EditModal'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Swipeable row ──────────────────────────────────────────────────────────
function SwipeRow({ item, onEdit, onDelete }: { item: Pengeluaran; onEdit: () => void; onDelete: () => void }) {
  const startX = useRef<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const THRESHOLD = 90

  function onTouchStart(e: React.TouchEvent) { startX.current = e.touches[0].clientX }
  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffset(Math.max(dx, -130))
  }
  function onTouchEnd() {
    if (offset < -THRESHOLD) { setDeleting(true); setTimeout(onDelete, 280) }
    else setOffset(0)
    startX.current = null
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete reveal */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-2xl">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-2xl">🗑</span>
          <span className="text-white text-xs font-bold">Hapus</span>
        </div>
      </div>

      {/* Main row */}
      <div
        className={`relative flex items-center gap-4 px-4 py-4 rounded-2xl border cursor-pointer active:opacity-90 ${deleting ? 'slide-out' : ''}`}
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          transform: `translateX(${deleting ? -220 : offset}px)`,
          transition: deleting ? undefined : offset === 0 ? 'transform 0.2s ease' : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (offset === 0) onEdit() }}
      >
        {/* Avatar */}
        <div className="text-2xl shrink-0">{item.created_by === 'wiku' ? '🧔' : '👩'}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base font-bold truncate" style={{ color: 'var(--text)' }}>{item.jenis_nama}</span>
            {!item.synced_at && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 shrink-0 font-semibold">
                offline
              </span>
            )}
          </div>
          {item.keterangan && (
            <div className="text-sm truncate" style={{ color: 'var(--text-2)' }}>{item.keterangan}</div>
          )}
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{fmtDate(item.created_at)}</div>
        </div>

        {/* Amount + hint */}
        <div className="text-right shrink-0">
          <div className="text-base font-black text-indigo-500 dark:text-indigo-300">{fmt(item.nominal)}</div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>swipe ←</div>
        </div>
      </div>
    </div>
  )
}

// ── Filter chip ────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all active:scale-95 ${
        active ? 'bg-indigo-600 text-white border-indigo-600' : 'border-[var(--border)]'
      }`}
      style={!active ? { background: 'var(--bg-card)', color: 'var(--text-2)' } : {}}>
      {label}
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
type Props = { data: Pengeluaran[]; jenisList: JenisPengeluaran[]; loading: boolean; onRefresh: () => void }

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
    const q = search.toLowerCase()
    return (!search || p.jenis_nama.toLowerCase().includes(q) || (p.keterangan || '').toLowerCase().includes(q))
      && (filterJenis === 'all' || p.jenis_nama === filterJenis)
      && (filterWho === 'all' || p.created_by === filterWho)
  })
  const total = filtered.reduce((s, p) => s + p.nominal, 0)

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}
    </div>
  )

  return (
    <>
      {editItem && (
        <EditModal item={editItem} jenisList={jenisList}
          onClose={() => setEditItem(null)}
          onUpdated={() => { setEditItem(null); onRefresh() }}
          onDeleted={() => { setEditItem(null); onRefresh() }} />
      )}

      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--text-3)' }}>🔍</span>
          <input type="text" placeholder="Cari transaksi..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-4 rounded-2xl text-base border-2 outline-none transition-colors focus:border-indigo-500"
            style={{ background: 'var(--bg-input)', color: 'var(--text)', borderColor: search ? 'var(--border-focus)' : 'var(--border)' }} />
        </div>

        {/* Who filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Chip label="👥 Semua" active={filterWho === 'all'} onClick={() => setFilterWho('all')} />
          <Chip label="🧔 Wiku"  active={filterWho === 'wiku'} onClick={() => setFilterWho('wiku')} />
          <Chip label="👩 Dita"  active={filterWho === 'dita'} onClick={() => setFilterWho('dita')} />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Chip label="Semua" active={filterJenis === 'all'} onClick={() => setFilterJenis('all')} />
          {jenisList.map(j => (
            <Chip key={j.id} label={`${j.icon} ${j.nama}`} active={filterJenis === j.nama} onClick={() => setFilterJenis(j.nama)} />
          ))}
        </div>

        {/* Summary bar */}
        {filtered.length > 0 && (
          <div className="flex justify-between items-center px-1 py-1">
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>{filtered.length} transaksi</span>
            <span className="text-sm font-black text-indigo-500 dark:text-indigo-300">{fmt(total)}</span>
          </div>
        )}

        {/* List */}
        {filtered.length === 0
          ? <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--text-3)' }}>
              <span className="text-5xl">🔍</span>
              <span className="text-base">Tidak ada transaksi</span>
            </div>
          : <div className="space-y-3">
              {filtered.map(p => (
                <SwipeRow key={p.id} item={p}
                  onEdit={() => setEditItem(p)}
                  onDelete={() => handleDelete(p.id)} />
              ))}
            </div>
        }
      </div>
    </>
  )
}
