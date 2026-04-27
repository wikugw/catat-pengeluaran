import { supabase } from './supabase'
import { getSyncQueue, removeSyncQueueItem, markSynced } from './idb'

export async function syncQueue() {
  if (!navigator.onLine) return
  const queue = await getSyncQueue()
  if (queue.length === 0) return

  for (const item of queue) {
    const { error } = await supabase.from('pengeluaran').upsert({
      id: item.id,
      jenis_id: item.data.jenis_id,
      jenis_nama: item.data.jenis_nama,
      nominal: item.data.nominal,
      keterangan: item.data.keterangan,
      created_by: item.data.created_by,
      synced_at: new Date().toISOString(),
    })
    if (!error) {
      await removeSyncQueueItem(item.id)
      await markSynced(item.id)
    }
  }
}

export async function fetchPengeluaran(year: number, month: number) {
  const start = new Date(year, month, 1).toISOString()
  const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('pengeluaran')
    .select('*')
    .gte('created_at', start)
    .lte('created_at', end)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return null
  return data
}

export async function fetchPengeluaranBulanIni() {
  const now = new Date()
  return fetchPengeluaran(now.getFullYear(), now.getMonth())
}

export async function deletePengeluaran(id: string) {
  const { error } = await supabase
    .from('pengeluaran')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

export async function updatePengeluaran(id: string, fields: { nominal?: number; keterangan?: string | null; jenis_id?: number; jenis_nama?: string }) {
  const { error } = await supabase
    .from('pengeluaran')
    .update(fields)
    .eq('id', id)
  return !error
}

export async function fetchBudgets() {
  const { data, error } = await supabase.from('budgets').select('*')
  if (error) return null
  return data
}

export async function deleteBudget(jenis_nama: string) {
  const { error } = await supabase.from('budgets').delete().eq('jenis_nama', jenis_nama)
  return !error
}

// ── XP sync ──────────────────────────────────────────────────────────────
export async function fetchAllXp(): Promise<{ user_name: string; xp: number }[] | null> {
  const { data, error } = await supabase.from('user_xp').select('user_name, xp')
  if (error) return null
  return data
}

export async function upsertXp(user_name: string, xp: number) {
  const { error } = await supabase
    .from('user_xp')
    .upsert({ user_name, xp, updated_at: new Date().toISOString() }, { onConflict: 'user_name' })
  return !error
}

export async function upsertBudget(jenis_nama: string, monthly_limit: number) {
  const { error } = await supabase
    .from('budgets')
    .upsert({ jenis_nama, monthly_limit, updated_at: new Date().toISOString() }, { onConflict: 'jenis_nama' })
  return !error
}
