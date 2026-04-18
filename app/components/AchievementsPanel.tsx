'use client'

import { ACHIEVEMENTS, LEVELS, getLevelFromXp, Pengeluaran } from '@/lib/supabase'

type Props = {
  xp: number
  data: Pengeluaran[]
}

export default function AchievementsPanel({ xp, data }: Props) {
  const level = getLevelFromXp(xp)
  const nextLevel = LEVELS.find(l => l.level === level.level + 1)
  const progress = nextLevel
    ? ((xp - level.minXp) / (level.maxXp - level.minXp)) * 100
    : 100

  const unlocked = ACHIEVEMENTS.filter(a => a.check(xp, data))
  const locked = ACHIEVEMENTS.filter(a => !a.check(xp, data))

  return (
    <div className="space-y-4">
      {/* Level card */}
      <div className="rounded-2xl bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border border-yellow-700/40 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{level.icon}</span>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-widest">Level {level.level}</div>
            <div className="text-xl font-black text-white">{level.title}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-slate-400">XP</div>
            <div className="text-2xl font-black text-yellow-400">{xp}</div>
          </div>
        </div>
        <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        {nextLevel && (
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-500">{xp} XP</span>
            <span className="text-xs text-slate-500">{level.maxXp} XP → {nextLevel.icon} {nextLevel.title}</span>
          </div>
        )}
      </div>

      {/* Unlocked achievements */}
      {unlocked.length > 0 && (
        <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">🏆 Diraih</div>
          <div className="space-y-2">
            {unlocked.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-900/20 border border-emerald-700/30">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{a.title}</div>
                  <div className="text-xs text-slate-400">{a.desc}</div>
                </div>
                <span className="ml-auto text-emerald-400 text-lg">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="rounded-2xl bg-slate-800 border border-slate-700 p-4">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-3">🔒 Belum Diraih</div>
          <div className="space-y-2">
            {locked.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-700/30 border border-slate-700/50 opacity-60">
                <span className="text-2xl grayscale">{a.icon}</span>
                <div>
                  <div className="text-sm font-bold text-slate-300">{a.title}</div>
                  <div className="text-xs text-slate-500">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
