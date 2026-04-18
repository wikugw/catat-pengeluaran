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

export async function fetchPengeluaranBulanIni() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('pengeluaran')
    .select('*')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })

  if (error) return null
  return data
}
