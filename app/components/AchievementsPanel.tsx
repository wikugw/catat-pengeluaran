'use client'

import { ACHIEVEMENTS, LEVELS, getLevelFromXp, Pengeluaran } from '@/lib/supabase'

export default function AchievementsPanel({ xp, data }: { xp: number; data: Pengeluaran[] }) {
  const level = getLevelFromXp(xp)
  const nextLevel = LEVELS.find(l => l.level === level.level + 1)
  const progress = nextLevel ? ((xp - level.minXp) / (level.maxXp - level.minXp)) * 100 : 100
  const unlocked = ACHIEVEMENTS.filter(a => a.check(xp, data))
  const locked   = ACHIEVEMENTS.filter(a => !a.check(xp, data))

  return (
    <div className="space-y-4">
      {/* Level card */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{level.icon}</span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Level {level.level}</div>
            <div className="text-xl font-black">{level.title}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs opacity-80">Total XP</div>
            <div className="text-2xl font-black">{xp}</div>
          </div>
        </div>
        <div className="h-2.5 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        {nextLevel && (
          <div className="flex justify-between mt-1 text-xs opacity-70">
            <span>{xp} XP</span>
            <span>{level.maxXp} XP → {nextLevel.icon} {nextLevel.title}</span>
          </div>
        )}
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>🏆 Diraih</div>
          <div className="space-y-2">
            {unlocked.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{a.title}</div>
                  <div className="text-xs" style={{ color: 'var(--text-2)' }}>{a.desc}</div>
                </div>
                <span className="ml-auto text-emerald-500 text-lg">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>🔒 Belum Diraih</div>
          <div className="space-y-2 opacity-50">
            {locked.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
                <span className="text-2xl grayscale">{a.icon}</span>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{a.title}</div>
                  <div className="text-xs" style={{ color: 'var(--text-2)' }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
