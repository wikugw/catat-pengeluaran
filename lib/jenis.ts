import { JenisPengeluaran } from './supabase'
import { supabase } from './supabase'
import { saveJenisOffline, getJenisOffline } from './idb'

// Hardcoded seed — used when both network AND IndexedDB are empty (first cold offline load)
export const JENIS_SEED: JenisPengeluaran[] = [
  { id: 1,  nama: 'Admin',                    icon: '📋', color: '#6B7280' },
  { id: 2,  nama: 'Belanja',                  icon: '🛒', color: '#F59E0B' },
  { id: 3,  nama: 'Bensin',                   icon: '⛽', color: '#EF4444' },
  { id: 4,  nama: 'Body care',                icon: '🧴', color: '#EC4899' },
  { id: 5,  nama: 'Fashion',                  icon: '👗', color: '#8B5CF6' },
  { id: 6,  nama: 'Invest',                   icon: '📈', color: '#10B981' },
  { id: 7,  nama: 'Jajan',                    icon: '🍿', color: '#F97316' },
  { id: 8,  nama: 'Keperluan apart',          icon: '🏠', color: '#3B82F6' },
  { id: 9,  nama: 'Keperluan Rumah',          icon: '🏡', color: '#06B6D4' },
  { id: 10, nama: 'Kesehatan',                icon: '💊', color: '#14B8A6' },
  { id: 11, nama: 'Kirim ke rumah',           icon: '📦', color: '#84CC16' },
  { id: 12, nama: 'Kirim ke ade',             icon: '💌', color: '#F43F5E' },
  { id: 13, nama: 'Kopi',                     icon: '☕', color: '#92400E' },
  { id: 14, nama: 'Lain-lain',                icon: '✨', color: '#A3A3A3' },
  { id: 15, nama: 'Laundry',                  icon: '👕', color: '#818CF8' },
  { id: 16, nama: 'Maen / hobi',              icon: '🎮', color: '#A855F7' },
  { id: 17, nama: 'Makan / Minum',            icon: '🍜', color: '#EF4444' },
  { id: 18, nama: 'Paket data & emoney',      icon: '📱', color: '#0EA5E9' },
  { id: 19, nama: 'Parkir',                   icon: '🅿️', color: '#64748B' },
  { id: 20, nama: 'Perkakas',                 icon: '🔧', color: '#B45309' },
  { id: 21, nama: 'Servis & keperluan motor', icon: '🏍️', color: '#DC2626' },
  { id: 22, nama: 'Transportasi',             icon: '🚌', color: '#0284C7' },
]

/**
 * Offline-first category loader.
 * Order: IndexedDB → render → fetch network in background → update + save IDB
 * If IDB empty and network fails → fall back to hardcoded seed
 */
export async function loadJenisOfflineFirst(
  setJenisList: (list: JenisPengeluaran[]) => void
) {
  // 1. Load from IDB immediately — render without waiting for network
  const cached = await getJenisOffline()
  if (cached.length > 0) {
    setJenisList(cached)
  } else {
    // IDB cold/empty — show seed immediately so the form isn't blank
    setJenisList(JENIS_SEED)
  }

  // 2. Try network in background (don't block render)
  try {
    const { data, error } = await supabase
      .from('jenis_pengeluaran')
      .select('*')
      .order('nama')

    if (data && !error && data.length > 0) {
      setJenisList(data)
      await saveJenisOffline(data) // warm the cache for next offline session
    }
  } catch {
    // Network failed — already showing cached or seed, nothing more to do
  }
}
