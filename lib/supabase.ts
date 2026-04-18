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
}

export type PengeluaranInsert = Omit<Pengeluaran, 'id' | 'created_at' | 'synced_at'>
