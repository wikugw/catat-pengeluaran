'use client'

import { useState, useRef } from 'react'
import { Pengeluaran, JenisPengeluaran } from '@/lib/supabase'
import { deletePengeluaran } from '@/lib/sync'
import { deletePengeluaranOffline } from '@/lib/idb'
import { exportToExcel } from '@/lib/export'
import EditModal from './EditModal'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ── Swipeable row ──────────────────────────────────────────────────────────
function SwipeRow({
  item, jenisIcon, onEdit, onDelete, showSwipeHint,
}: {
  item: Pengeluaran
  jenisIcon: string
  onEdit: () => void
  onDelete: () => void
  showSwipeHint: boolean
}) {
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

  const keterangan = item.keterangan?.trim()
  const spenderStyle = item.created_by === 'wiku'
    ? { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-600 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700/50' }
    : { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-600 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-700/50' }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete bg */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-2xl">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-2xl">🗑</span>
          <span className="text-white text-xs font-bold">Hapus</span>
        </div>
      </div>

      {/* Row */}
      <div
        className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border cursor-pointer ${deleting ? 'slide-out' : ''}`}
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
        {/* Category icon */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-2xl"
          style={{ background: 'var(--bg-input)' }}>
          {jenisIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
            {item.jenis_nama}
          </div>
          {keterangan && (
            <div className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{keterangan}</div>
          )}
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            {fmtDate(item.created_at)}
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="text-base font-black text-indigo-500 dark:text-indigo-300">
            {fmt(item.nominal)}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${spenderStyle.bg} ${spenderStyle.text} ${spenderStyle.border}`}>
            {item.created_by === 'wiku' ? '🧔 wiku' : '👩 dita'}
          </span>
          {/* Swipe hint — only on first row, one line, no repeat */}
          {showSwipeHint && (
            <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>← swipe hapus</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Filter bottom sheet ────────────────────────────────────────────────────
function FilterSheet({
  jenisList,
  filterWho,
  filterJenis,
  onChangeWho,
  onChangeJenis,
  onClose,
  onReset,
}: {
  jenisList: JenisPengeluaran[]
  filterWho: string
  filterJenis: string
  onChangeWho: (v: string) => void
  onChangeJenis: (v: string) => void
  onClose: () => void
  onReset: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl border-t border-x flex flex-col max-h-[75vh]"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>Filter</h3>
          <div className="flex items-center gap-2">
            <button onClick={onReset}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border active:scale-95 transition-all"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
              Reset
            </button>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full text-xl"
              style={{ color: 'var(--text-3)' }}>✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">
          {/* Who */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-3)' }}>Siapa</div>
            <div className="flex gap-2">
              {[
                { val: 'all',  label: '👥 Semua' },
                { val: 'wiku', label: '🧔 Wiku' },
                { val: 'dita', label: '👩 Dita' },
              ].map(o => (
                <button key={o.val} onClick={() => onChangeWho(o.val)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
                    filterWho === o.val ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''
                  }`}
                  style={filterWho !== o.val ? { background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' } : { color: 'var(--text)' }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-3)' }}>Kategori</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeJenis('all')}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 ${
                  filterJenis === 'all' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''
                }`}
                style={filterJenis !== 'all' ? { background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' } : { color: 'var(--text)' }}>
                Semua
              </button>
              {jenisList.map(j => (
                <button key={j.id} onClick={() => onChangeJenis(j.nama)}
                  className={`py-3 px-3 rounded-xl text-sm font-semibold border-2 text-left flex items-center gap-2 transition-all active:scale-95 ${
                    filterJenis === j.nama ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''
                  }`}
                  style={filterJenis !== j.nama ? { background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-2)' } : { color: 'var(--text)' }}>
                  <span>{j.icon}</span>
                  <span className="truncate">{j.nama}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Apply */}
        <div className="px-5 pb-8 pt-2 shrink-0">
          <button onClick={onClose}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black text-lg transition-all">
            Terapkan Filter
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
type Props = {
  data: Pengeluaran[]
  jenisList: JenisPengeluaran[]
  loading: boolean
  year: number
  month: number
  onRefresh: () => void
}

export default function PengeluaranTable({ data, jenisList, loading, year, month, onRefresh }: Props) {
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterJenis, setFilterJenis] = useState('all')
  const [filterWho, setFilterWho] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [editItem, setEditItem] = useState<Pengeluaran | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const iconMap: Record<string, string> = {}
  for (const j of jenisList) iconMap[j.nama] = j.icon

  async function handleDelete(id: string) {
    await deletePengeluaranOffline(id)
    if (navigator.onLine) await deletePengeluaran(id)
    onRefresh()
  }

  const filtered = data.filter(p => {
    const q = search.toLowerCase()
    return (
      (!search || p.jenis_nama.toLowerCase().includes(q) || (p.keterangan || '').toLowerCase().includes(q))
      && (filterJenis === 'all' || p.jenis_nama === filterJenis)
      && (filterWho === 'all' || p.created_by === filterWho)
    )
  })
  const total = filtered.reduce((s, p) => s + p.nominal, 0)

  const hasActiveFilter = filterWho !== 'all' || filterJenis !== 'all'
  const activeFilterCount = (filterWho !== 'all' ? 1 : 0) + (filterJenis !== 'all' ? 1 : 0)

  function resetFilters() {
    setFilterWho('all')
    setFilterJenis('all')
  }

  function openSearch() {
    setSearchOpen(true)
    setTimeout(() => searchRef.current?.focus(), 100)
  }

  function closeSearch() {
    setSearchOpen(false)
    setSearch('')
  }

  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-[72px] rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />
      ))}
    </div>
  )

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

      {filterOpen && (
        <FilterSheet
          jenisList={jenisList}
          filterWho={filterWho}
          filterJenis={filterJenis}
          onChangeWho={setFilterWho}
          onChangeJenis={setFilterJenis}
          onClose={() => setFilterOpen(false)}
          onReset={resetFilters}
        />
      )}

      <div className="space-y-3">

        {/* ── Toolbar: search + filter + export ── */}
        <div className="flex items-center gap-2">
          {searchOpen ? (
            /* Expanded search — takes full width */
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base"
                style={{ color: 'var(--text-3)' }}>🔍</span>
              <input
                ref={searchRef}
                type="text"
                placeholder="Cari transaksi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm border-2 outline-none focus:border-indigo-500 transition-colors"
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text)',
                  borderColor: 'var(--border-focus)',
                }}
              />
              <button
                onClick={closeSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold px-2 py-1 rounded-lg"
                style={{ color: 'var(--text-3)' }}>
                ✕
              </button>
            </div>
          ) : (
            <>
              {/* Search icon button */}
              <button
                onClick={openSearch}
                className="w-11 h-11 flex items-center justify-center rounded-2xl border text-xl flex-shrink-0 transition-all active:scale-95"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                🔍
              </button>

              {/* Filter button — shows badge if active */}
              <button
                onClick={() => setFilterOpen(true)}
                className={`flex items-center gap-2 px-4 h-11 rounded-2xl border text-sm font-bold flex-shrink-0 transition-all active:scale-95 ${
                  hasActiveFilter ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''
                }`}
                style={!hasActiveFilter ? { background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-2)' } : { color: 'var(--text)' }}>
                <span>⊞</span>
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Export */}
              <button
                onClick={() => exportToExcel(data, year, month)}
                disabled={data.length === 0}
                className="flex items-center gap-1.5 px-3 h-11 rounded-2xl border text-sm font-bold flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                📥 Excel
              </button>
            </>
          )}
        </div>

        {/* ── Active filter chips (only shown when filters are applied) ── */}
        {hasActiveFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterWho !== 'all' && (
              <button
                onClick={() => setFilterWho('all')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-indigo-600 text-white border-indigo-600 active:scale-95 transition-all">
                {filterWho === 'wiku' ? '🧔 Wiku' : '👩 Dita'}
                <span className="opacity-80">✕</span>
              </button>
            )}
            {filterJenis !== 'all' && (
              <button
                onClick={() => setFilterJenis('all')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-indigo-600 text-white border-indigo-600 active:scale-95 transition-all">
                {iconMap[filterJenis]} {filterJenis}
                <span className="opacity-80">✕</span>
              </button>
            )}
            <button
              onClick={resetFilters}
              className="text-xs font-semibold"
              style={{ color: 'var(--text-3)' }}>
              Reset semua
            </button>
          </div>
        )}

        {/* ── Summary bar ── */}
        {data.length > 0 && (
          <div className="flex justify-between items-center px-1">
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>
              {filtered.length !== data.length
                ? `${filtered.length} dari ${data.length} transaksi`
                : `${data.length} transaksi`}
            </span>
            <span className="text-sm font-black text-indigo-500 dark:text-indigo-300">
              {fmt(total)}
            </span>
          </div>
        )}

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3"
            style={{ color: 'var(--text-3)' }}>
            <span className="text-5xl">{search || hasActiveFilter ? '🔍' : '💸'}</span>
            <span className="text-base">
              {search || hasActiveFilter ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi'}
            </span>
            {hasActiveFilter && (
              <button onClick={resetFilters}
                className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">
                Reset filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p, i) => (
              <SwipeRow
                key={p.id}
                item={p}
                jenisIcon={iconMap[p.jenis_nama] || '💸'}
                showSwipeHint={i === 0} // hint only on first row
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
