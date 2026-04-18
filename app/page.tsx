'use client'

import { useState, useEffect, useCallback } from 'react'
import InputForm from './components/InputForm'
import Dashboard from './components/Dashboard'
import PengeluaranTable from './components/PengeluaranTable'
import AchievementsPanel from './components/AchievementsPanel'
import BudgetModal from './components/BudgetModal'
import ToastContainer, { useToast } from './components/Toast'
import { Pengeluaran, Budget, JenisPengeluaran, getLevelFromXp } from '@/lib/supabase'
import { fetchPengeluaran, syncQueue, fetchBudgets } from '@/lib/sync'
import { getPengeluaran, saveBudgetsOffline, getBudgetsOffline, getJenisOffline } from '@/lib/idb'
import { supabase } from '@/lib/supabase'
import { saveJenisOffline } from '@/lib/idb'

type Tab = 'input' | 'dashboard' | 'riwayat' | 'achievements'

export default function Home() {
  const [tab, setTab] = useState<Tab>('input')
  const [data, setData] = useState<Pengeluaran[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [jenisList, setJenisList] = useState<JenisPengeluaran[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [showBudget, setShowBudget] = useState(false)
  const [xp, setXp] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Month navigation
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const { toasts, show: showToast, dismiss } = useToast()

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  const loadData = useCallback(async (year = viewYear, month = viewMonth) => {
    setLoading(true)
    try {
      const remote = await fetchPengeluaran(year, month)
      if (remote) {
        setData(remote as Pengeluaran[])
      } else {
        throw new Error('offline')
      }
    } catch {
      const local = await getPengeluaran(year, month)
      setData(local)
    } finally {
      setLoading(false)
    }
  }, [viewYear, viewMonth])

  const loadBudgets = useCallback(async () => {
    try {
      const remote = await fetchBudgets()
      if (remote) {
        setBudgets(remote as Budget[])
        await saveBudgetsOffline(remote as Budget[])
      } else {
        throw new Error('offline')
      }
    } catch {
      const local = await getBudgetsOffline()
      setBudgets(local)
    }
  }, [])

  const loadJenis = useCallback(async () => {
    try {
      const { data: remote, error } = await supabase.from('jenis_pengeluaran').select('*').order('nama')
      if (remote && !error) {
        setJenisList(remote)
        await saveJenisOffline(remote)
      } else throw new Error('offline')
    } catch {
      const local = await getJenisOffline()
      setJenisList(local)
    }
  }, [])

  useEffect(() => {
    const savedXp = parseInt(localStorage.getItem('input-streak') || '0') * 10
    setXp(savedXp)

    loadData()
    loadBudgets()
    loadJenis()

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }

    const handleOnline = async () => {
      setIsOnline(true)
      showToast('Kembali online — sync data...', 'info', 2000)
      await syncQueue()
      loadData()
      showToast('✅ Data tersinkron!', 'success')
    }
    const handleOffline = () => {
      setIsOnline(false)
      showToast('Kamu offline — data tersimpan lokal', 'offline')
    }

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, []) // eslint-disable-line

  // Reload when month changes
  useEffect(() => {
    loadData(viewYear, viewMonth)
  }, [viewYear, viewMonth]) // eslint-disable-line

  function handleSuccess() {
    const newXp = xp + 10
    setXp(newXp)
    showToast(isOnline ? '✅ Tersimpan & tersinkron!' : '📵 Tersimpan offline', isOnline ? 'success' : 'offline')
    setTab('dashboard')
    loadData()
  }

  async function handlePullRefresh() {
    setRefreshing(true)
    await loadData(viewYear, viewMonth)
    await loadBudgets()
    setRefreshing(false)
    showToast('Data diperbarui', 'info', 1500)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const level = getLevelFromXp(xp)
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'input', label: 'Catat', icon: '✏️' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'riwayat', label: 'Riwayat', icon: '📋' },
    { id: 'achievements', label: 'Level', icon: level.icon },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {showBudget && (
        <BudgetModal
          jenisList={jenisList}
          onClose={() => { setShowBudget(false); loadBudgets() }}
        />
      )}

      {/* Header */}
      <header className="px-4 pt-safe pt-6 pb-3 mt-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-black text-white">💸 CatatDuit</h1>
          <p className="text-xs text-slate-400">Pengeluaran Rumah Tangga</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Level badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-900/30 border border-yellow-700/40 text-xs font-bold text-yellow-400">
            {level.icon} Lv.{level.level}
          </div>
          {/* Online badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isOnline
              ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400'
              : 'bg-amber-900/40 border-amber-700/50 text-amber-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Month navigator (shown on dashboard/riwayat) */}
      {(tab === 'dashboard' || tab === 'riwayat') && (
        <div className="flex items-center justify-between px-4 pb-3 shrink-0">
          <button onClick={prevMonth} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            ‹
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{monthLabel}</span>
            <button
              onClick={handlePullRefresh}
              disabled={refreshing}
              className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
            >
              {refreshing ? '⏳' : '↻'}
            </button>
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors"
          >
            ›
          </button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-4 pb-28 overflow-y-auto">
        {tab === 'input' && (
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-5">
            <InputForm onSuccess={handleSuccess} />
          </div>
        )}
        {tab === 'dashboard' && (
          <Dashboard
            data={data}
            budgets={budgets}
            loading={loading}
            year={viewYear}
            month={viewMonth}
            onOpenBudget={() => setShowBudget(true)}
          />
        )}
        {tab === 'riwayat' && (
          <PengeluaranTable
            data={data}
            jenisList={jenisList}
            loading={loading}
            onRefresh={() => loadData(viewYear, viewMonth)}
          />
        )}
        {tab === 'achievements' && (
          <AchievementsPanel xp={xp} data={data} />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 pb-safe">
        <div className="flex">
          {tabs.map(t => (
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
