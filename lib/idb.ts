import { Pengeluaran, PengeluaranInsert } from './supabase'

const DB_NAME = 'catat-pengeluaran'
const DB_VERSION = 1
const STORE_PENGELUARAN = 'pengeluaran'
const STORE_JENIS = 'jenis_pengeluaran'
const STORE_QUEUE = 'sync_queue'

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

export async function getPengeluaranBulanIni(): Promise<Pengeluaran[]> {
  const db = await openDB()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENGELUARAN, 'readonly')
    const index = tx.objectStore(STORE_PENGELUARAN).index('created_at')
    const range = IDBKeyRange.bound(startOfMonth, endOfMonth)
    const req = index.getAll(range)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
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
