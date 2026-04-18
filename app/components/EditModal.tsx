'use client'

import { useState } from 'react'
import { Pengeluaran, JenisPengeluaran } from '@/lib/supabase'
import { updatePengeluaran, deletePengeluaran } from '@/lib/sync'
import { updatePengeluaranOffline, deletePengeluaranOffline } from '@/lib/idb'

function formatRupiah(val: string) {
  const num = val.replace(/\D/g, '')
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

type Props = {
  item: Pengeluaran
  jenisList: JenisPengeluaran[]
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}

export default function EditModal({ item, jenisList, onClose, onUpdated, onDeleted }: Props) {
  const [selectedJenis, setSelectedJenis] = useState<JenisPengeluaran>(
    jenisList.find(j => j.nama === item.jenis_nama) || jenisList[0]
  )
  const [nominal, setNominal] = useState(
    item.nominal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
  const [keterangan, setKeterangan] = useState(item.keterangan || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    if (!nominal) return
    setSaving(true)
    const fields = {
      jenis_id: selectedJenis.id,
      jenis_nama: selectedJenis.nama,
      nominal: parseInt(nominal.replace(/\./g, '')),
      keterangan: keterangan.trim() || null,
    }
    await updatePengeluaranOffline(item.id, fields)
    if (navigator.onLine) await updatePengeluaran(item.id, fields)
    setSaving(false)
    onUpdated()
  }

  async function handleDelete() {
    setSaving(true)
    await deletePengeluaranOffline(item.id)
    if (navigator.onLine) await deletePengeluaran(item.id)
    setSaving(false)
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-t-3xl p-5 space-y-4 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Edit Transaksi</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Jenis picker */}
        <div>
          <div className="text-xs text-slate-400 mb-2">Kategori</div>
          <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {jenisList.map(j => (
              <button
                key={j.id}
                onClick={() => setSelectedJenis(j)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs ${
                  selectedJenis.id === j.id
                    ? 'border-indigo-500 bg-indigo-900/40 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                <span className="text-lg">{j.icon}</span>
                <span className="text-center leading-tight">{j.nama}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nominal */}
        <div>
          <div className="text-xs text-slate-400 mb-2">Nominal</div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={nominal}
              onChange={e => setNominal(formatRupiah(e.target.value))}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 outline-none text-white text-xl font-bold transition-colors"
            />
          </div>
        </div>

        {/* Keterangan */}
        <div>
          <div className="text-xs text-slate-400 mb-2">Keterangan</div>
          <input
            type="text"
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            placeholder="Opsional..."
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 outline-none text-white transition-colors"
          />
        </div>

        <div className="flex gap-2 pt-1">
          {!confirmDelete ? (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-3 rounded-xl bg-red-900/40 border border-red-700/50 text-red-400 hover:bg-red-900/70 transition-colors text-sm font-semibold"
              >
                🗑 Hapus
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all"
              >
                {saving ? 'Menyimpan...' : '✓ Simpan Perubahan'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold transition-all"
              >
                {saving ? 'Menghapus...' : '🗑 Hapus Sekarang'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
