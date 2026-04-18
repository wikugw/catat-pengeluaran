'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'offline'
export type Toast = { id: string; message: string; type: ToastType }

const icons: Record<ToastType, string>  = { success: '✅', error: '❌', info: '📶', offline: '📵' }
const colors: Record<ToastType, { light: string; dark: string }> = {
  success: { light: 'bg-emerald-50 border-emerald-200 text-emerald-700',   dark: 'dark:bg-emerald-900/90 dark:border-emerald-700 dark:text-emerald-100' },
  error:   { light: 'bg-red-50 border-red-200 text-red-700',               dark: 'dark:bg-red-900/90 dark:border-red-700 dark:text-red-100' },
  info:    { light: 'bg-indigo-50 border-indigo-200 text-indigo-700',      dark: 'dark:bg-indigo-900/90 dark:border-indigo-700 dark:text-indigo-100' },
  offline: { light: 'bg-amber-50 border-amber-200 text-amber-700',         dark: 'dark:bg-amber-900/90 dark:border-amber-700 dark:text-amber-100' },
}

export default function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map(t => (
        <div key={t.id} onClick={() => onDismiss(t.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-semibold shadow-lg backdrop-blur animate-fade-in pointer-events-auto cursor-pointer
            ${colors[t.type].light} ${colors[t.type].dark}`}>
          <span>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  function show(message: string, type: ToastType = 'success', duration = 3000) {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), duration)
    if ('vibrate' in navigator) navigator.vibrate(type === 'success' ? [30] : [50, 30, 50])
  }
  function dismiss(id: string) { setToasts(prev => prev.filter(t => t.id !== id)) }
  return { toasts, show, dismiss }
}
