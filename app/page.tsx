'use client'

import { useState, useEffect, useCallback } from 'react'
import InputForm from './components/InputForm'
import Dashboard from './components/Dashboard'
import PengeluaranTable from './components/PengeluaranTable'
import AchievementsPanel from './components/AchievementsPanel'
import BudgetModal from './components/BudgetModal'
import ToastContainer, { useToast } from './components/Toast'
import { useTheme } from './components/ThemeProvider'
import { Pengeluaran, Budget, JenisPengeluaran, getLevelFromXp } from '@/lib/supabase'
import { fetchPengeluaran, syncQueue, fetchBudgets } from '@/lib/sync'
import { getPengeluaran, saveBudgetsOffline, getBudgetsOffline, getJenisOffline, saveJenisOffline } from '@/lib/idb'
import { supabase } from '@/lib/supabase'

type Tab = 'input' | 'dashboard' | 'riwayat' | 'achievements'

export default function Home() {
  const { theme, toggle: toggleTheme } = useTheme()
  const [tab, setTab] = useState<Tab>('input')
  const [data, setData] = useState<Pengeluaran[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [jenisList, setJenisList] = useState<JenisPengeluaran[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [showBudget, setShowBudget] = useState(false)
  const [xp, setXp] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  const { toasts, show: showToast, dismiss } = useToast()

  const loadData = useCallback(async (year = viewYear, month = viewMonth) => {
    setLoading(true)
    try {
      const remote = await fetchPengeluaran(year, month)
      if (remote) { setData(remote as Pengeluaran[]) }
      else throw new Error('offline')
    } catch {
      setData(await getPengeluaran(year, month))
    } finally { setLoading(false) }
  }, [viewYear, viewMonth])

  const loadBudgets = useCallback(async () => {
    try {
      const remote = await fetchBudgets()
      if (remote) { setBudgets(remote as Budget[]); await saveBudgetsOffline(remote as Budget[]) }
      else throw new Error('offline')
    } catch { setBudgets(await getBudgetsOffline()) }
  }, [])

  const loadJenis = useCallback(async () => {
    try {
      const { data: remote, error } = await supabase.from('jenis_pengeluaran').select('*').order('nama')
      if (remote && !error) { setJenisList(remote); await saveJenisOffline(remote) }
      else throw new Error('offline')
    } catch { setJenisList(await getJenisOffline()) }
  }, [])

  useEffect(() => {
    setXp(parseInt(localStorage.getItem('input-streak') || '0') * 10)
    loadData(); loadBudgets(); loadJenis()
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error)

    const handleOnline = async () => {
      setIsOnline(true)
      showToast('Kembali online — sync data...', 'info', 2000)
      await syncQueue(); loadData()
      showToast('✅ Data tersinkron!', 'success')
    }
    const handleOffline = () => { setIsOnline(false); showToast('Kamu offline — data tersimpan lokal', 'offline') }

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline) }
  }, []) // eslint-disable-line

  useEffect(() => { loadData(viewYear, viewMonth) }, [viewYear, viewMonth]) // eslint-disable-line

  function handleSuccess() {
    const newXp = xp + 10; setXp(newXp)
    showToast(isOnline ? '✅ Tersimpan & tersinkron!' : '📵 Tersimpan offline', isOnline ? 'success' : 'offline')
    setTab('dashboard'); loadData()
  }

  async function handleRefresh() {
    setRefreshing(true); await loadData(viewYear, viewMonth); await loadBudgets()
    setRefreshing(false); showToast('Data diperbarui', 'info', 1500)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1)
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {showBudget && (
        <BudgetModal jenisList={jenisList} onClose={() => { setShowBudget(false); loadBudgets() }} />
      )}

      {/* Header */}
      <header className="px-4 pt-safe pt-6 pb-3 mt-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-black">💸 CatatDuit</h1>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>Pengeluaran Rumah Tangga</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border text-sm transition-colors"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {/* Level */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/40">
            {level.icon} Lv.{level.level}
          </div>
          {/* Online */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700/50 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700/50 text-amber-600 dark:text-amber-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Month nav */}
      {(tab === 'dashboard' || tab === 'riwayat') && (
        <div className="flex items-center justify-between px-4 pb-3 shrink-0">
          <button onClick={prevMonth}
            className="p-2 rounded-xl border text-sm font-bold transition-colors"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            ‹
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{monthLabel}</span>
            <button onClick={handleRefresh} disabled={refreshing}
              className="text-xs transition-colors text-indigo-500 dark:text-indigo-400">
              {refreshing ? '⏳' : '↻'}
            </button>
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="p-2 rounded-xl border text-sm font-bold transition-colors disabled:opacity-30"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            ›
          </button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-4 pb-28 overflow-y-auto">
        {tab === 'input' && (
          <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <InputForm onSuccess={handleSuccess} />
          </div>
        )}
        {tab === 'dashboard' && (
          <Dashboard data={data} budgets={budgets} loading={loading} year={viewYear} month={viewMonth} onOpenBudget={() => setShowBudget(true)} />
        )}
        {tab === 'riwayat' && (
          <PengeluaranTable data={data} jenisList={jenisList} loading={loading} onRefresh={() => loadData(viewYear, viewMonth)} />
        )}
        {tab === 'achievements' && <AchievementsPanel xp={xp} data={data} />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 backdrop-blur border-t pb-safe"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}>
        <div className="flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors ${
                tab === t.id ? 'text-indigo-600 dark:text-indigo-400' : ''
              }`}
              style={tab !== t.id ? { color: 'var(--text-3)' } : {}}>
              <span className="text-xl">{t.icon}</span>
              {t.label}
              {tab === t.id && <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
