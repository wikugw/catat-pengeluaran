import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type JenisPengeluaran = {
  id: number
  nama: string
  icon: string
  color: string
}

export type Pengeluaran = {
  id: string
  jenis_id: number | null
  jenis_nama: string
  nominal: number
  keterangan: string | null
  created_by: 'wiku' | 'dita'
  created_at: string
  synced_at: string | null
  deleted_at?: string | null
}

export type PengeluaranInsert = Omit<Pengeluaran, 'id' | 'created_at' | 'synced_at' | 'deleted_at'>

export type Budget = {
  jenis_nama: string
  monthly_limit: number
}

// Gamification
export type Level = {
  level: number
  title: string
  minXp: number
  maxXp: number
  icon: string
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Newbie', minXp: 0, maxXp: 50, icon: '🌱' },
  { level: 2, title: 'Pencatat', minXp: 50, maxXp: 150, icon: '📝' },
  { level: 3, title: 'Hemat Pro', minXp: 150, maxXp: 300, icon: '💡' },
  { level: 4, title: 'Finance Nerd', minXp: 300, maxXp: 500, icon: '📊' },
  { level: 5, title: 'Money Master', minXp: 500, maxXp: 999999, icon: '👑' },
]

export function getLevelFromXp(xp: number): Level {
  return LEVELS.slice().reverse().find(l => xp >= l.minXp) || LEVELS[0]
}

export type Achievement = {
  id: string
  title: string
  desc: string
  icon: string
  check: (xp: number, data: Pengeluaran[]) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_entry', title: 'Langkah Pertama', desc: 'Catat pengeluaran pertamamu', icon: '🎯', check: (xp) => xp >= 10 },
  { id: 'ten_entries', title: 'Rajin Banget', desc: '10 transaksi tercatat', icon: '🔥', check: (xp) => xp >= 100 },
  { id: 'fifty_entries', title: 'Konsisten!', desc: '50 transaksi tercatat', icon: '💪', check: (xp) => xp >= 500 },
  { id: 'big_saver', title: 'Hemat Jutaan', desc: 'Total pengeluaran bulan ini > 1 juta', icon: '💰', check: (_, data) => data.reduce((s, p) => s + p.nominal, 0) > 1_000_000 },
  { id: 'duo_entry', title: 'Tim Solid', desc: 'Wiku & Dita sama-sama catat bulan ini', icon: '👫', check: (_, data) => data.some(p => p.created_by === 'wiku') && data.some(p => p.created_by === 'dita') },
  { id: 'variety', title: 'Multi-Tasker', desc: 'Pakai 5+ kategori berbeda', icon: '🌈', check: (_, data) => new Set(data.map(p => p.jenis_nama)).size >= 5 },
]
