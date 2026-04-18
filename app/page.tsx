'use client'

import { useState, useEffect, useCallback } from 'react'
import InputForm from './components/InputForm'
import Dashboard from './components/Dashboard'
import PengeluaranTable from './components/PengeluaranTable'
import { Pengeluaran } from '@/lib/supabase'
import { fetchPengeluaranBulanIni, syncQueue } from '@/lib/sync'
import { getPengeluaranBulanIni } from '@/lib/idb'

type Tab = 'input' | 'dashboard' | 'riwayat'

export default function Home() {
  const [tab, setTab] = useState<Tab>('input')
  const [data, setData] = useState<Pengeluaran[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Try remote first
      const remote = await fetchPengeluaranBulanIni()
      if (remote) {
        setData(remote as Pengeluaran[])
      } else {
        throw new Error('offline')
      }
    } catch {
      // Fall back to local
      const local = await getPengeluaranBulanIni()
      setData(local)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }

    // Online/offline listeners
    const handleOnline = async () => {
      setIsOnline(true)
      await syncQueue()
      loadData()
    }
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loadData])

  function handleSuccess() {
    setTab('dashboard')
    loadData()
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'input', label: 'Catat', icon: '✏️' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'riwayat', label: 'Riwayat', icon: '📋' },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="px-4 pt-safe pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">💸 CatatDuit</h1>
          <p className="text-xs text-slate-400">Pengeluaran Rumah Tangga</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          isOnline
            ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400'
            : 'bg-amber-900/40 border-amber-700/50 text-amber-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pb-28 overflow-y-auto">
        {tab === 'input' && (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-5">
            <InputForm onSuccess={handleSuccess} />
          </div>
        )}
        {tab === 'dashboard' && <Dashboard data={data} loading={loading} />}
        {tab === 'riwayat' && <PengeluaranTable data={data} loading={loading} />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-safe">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors ${
                tab === t.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
              {tab === t.id && <span className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
