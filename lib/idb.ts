import { Pengeluaran, PengeluaranInsert } from './supabase'

const DB_NAME = 'catat-pengeluaran'
const DB_VERSION = 2
const STORE_PENGELUARAN = 'pengeluaran'
const STORE_JENIS = 'jenis_pengeluaran'
const STORE_QUEUE = 'sync_queue'
const STORE_BUDGETS = 'budgets'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_PENGELUARAN)) {
        const store = db.createObjectStore(STORE_PENGELUARAN, { keyPath: 'id' })
        store.createIndex('created_at', 'created_at', { unique: false })
        store.createIndex('created_by', 'created_by', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_JENIS)) {
        db.createObjectStore(STORE_JENIS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_BUDGETS)) {
        db.createObjectStore(STORE_BUDGETS, { keyPath: 'jenis_nama' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveJenisOffline(items: { id: number; nama: string; icon: string; color: string }[]) {
  const db = await openDB()
  const tx = db.transaction(STORE_JENIS, 'readwrite')
  const store = tx.objectStore(STORE_JENIS)
  for (const item of items) store.put(item)
  return new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
}

export async function getJenisOffline(): Promise<{ id: number; nama: string; icon: string; color: string }[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_JENIS, 'readonly')
    const req = tx.objectStore(STORE_JENIS).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function savePengeluaranOffline(item: Pengeluaran) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_PENGELUARAN, STORE_QUEUE], 'readwrite')
    tx.objectStore(STORE_PENGELUARAN).put(item)
    if (!item.synced_at) {
      tx.objectStore(STORE_QUEUE).put({ id: item.id, data: item })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deletePengeluaranOffline(id: string) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PENGELUARAN, 'readwrite')
    const store = tx.objectStore(STORE_PENGELUARAN)
    const req = store.get(id)
    req.onsuccess = () => {
      const item = req.result
      if (item) {
        item.deleted_at = new Date().toISOString()
        store.put(item)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function updatePengeluaranOffline(id: string, fields: Partial<Pengeluaran>) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PENGELUARAN, 'readwrite')
    const store = tx.objectStore(STORE_PENGELUARAN)
    const req = store.get(id)
    req.onsuccess = () => {
      const item = req.result
      if (item) store.put({ ...item, ...fields })
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPengeluaran(year: number, month: number): Promise<Pengeluaran[]> {
  const db = await openDB()
  const start = new Date(year, month, 1).toISOString()
  const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENGELUARAN, 'readonly')
    const index = tx.objectStore(STORE_PENGELUARAN).index('created_at')
    const range = IDBKeyRange.bound(start, end)
    const req = index.getAll(range)
    req.onsuccess = () => resolve((req.result as Pengeluaran[]).filter(p => !p.deleted_at))
    req.onerror = () => reject(req.error)
  })
}

export async function getPengeluaranBulanIni(): Promise<Pengeluaran[]> {
  const now = new Date()
  return getPengeluaran(now.getFullYear(), now.getMonth())
}

export async function getSyncQueue(): Promise<{ id: string; data: PengeluaranInsert }[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly')
    const req = tx.objectStore(STORE_QUEUE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function removeSyncQueueItem(id: string) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite')
    tx.objectStore(STORE_QUEUE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function markSynced(id: string) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PENGELUARAN, 'readwrite')
    const store = tx.objectStore(STORE_PENGELUARAN)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const item = getReq.result
      if (item) {
        item.synced_at = new Date().toISOString()
        store.put(item)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveBudgetsOffline(budgets: { jenis_nama: string; monthly_limit: number }[]) {
  const db = await openDB()
  const tx = db.transaction(STORE_BUDGETS, 'readwrite')
  for (const b of budgets) tx.objectStore(STORE_BUDGETS).put(b)
  return new Promise<void>((res, rej) => {
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })
}

export async function deleteBudgetOffline(jenis_nama: string) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_BUDGETS, 'readwrite')
    tx.objectStore(STORE_BUDGETS).delete(jenis_nama)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getBudgetsOffline(): Promise<{ jenis_nama: string; monthly_limit: number }[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BUDGETS, 'readonly')
    const req = tx.objectStore(STORE_BUDGETS).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
