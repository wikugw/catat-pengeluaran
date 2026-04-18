'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'offline'

export type Toast = {
  id: string
  message: string
  type: ToastType
}

type Props = {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

const icons: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: '📶',
  offline: '📵',
}

const colors: Record<ToastType, string> = {
  success: 'bg-emerald-900/90 border-emerald-700 text-emerald-100',
  error: 'bg-red-900/90 border-red-700 text-red-100',
  info: 'bg-indigo-900/90 border-indigo-700 text-indigo-100',
  offline: 'bg-amber-900/90 border-amber-700 text-amber-100',
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-semibold shadow-xl backdrop-blur animate-fade-in pointer-events-auto ${colors[t.type]}`}
          onClick={() => onDismiss(t.id)}
        >
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
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(type === 'success' ? [30] : [50, 30, 50])
  }

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return { toasts, show, dismiss }
}
