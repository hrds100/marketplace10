import { useNavigate } from 'react-router-dom';
import { modules, achievements } from '@/data/universityData';
import { useUniversityProgress } from '@/hooks/useUniversityProgress';
import { Trophy, Flame, Star, Zap, Lock, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

function AnimatedXP({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const pct = Math.min(elapsed / duration, 1);
      setDisplay(Math.floor(pct * target));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{display.toLocaleString()}</>;
}

export default function UniversityPage() {
  const navigate = useNavigate();
  const {
    progress, level, xpInLevel, xpForNextLevel,
    isModuleComplete, getModuleCompletedLessons, isLessonComplete,
  } = useUniversityProgress();

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[28px] font-bold" style={{ color: '#111827' }}>nfstay Academy</h1>
          <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#065F46' }}>
            UK-Focused Training
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Build a compliant UK rent-to-rent business from the ground up.
        </p>
        <p className="text-xs mt-2 px-3 py-1.5 rounded-lg inline-block font-medium" style={{ background: '#ECFDF5', color: '#065F46' }}>
          ✨ We've dumped everything we know into these lessons, those agents represent us with 15+ years of experience. Knowledge you won't find anywhere else. Enjoy.
        </p>
      </div>

      {/* Gamification bar */}
      <div className="rounded-2xl border p-5 mt-5" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: '#1DB954' }} />
            <span className="text-sm font-bold" style={{ color: '#111827' }}>
              <AnimatedXP target={progress.totalXP} /> XP earned
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#92400E' }}>
              {progress.streak}-day streak
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" style={{ color: '#1DB954' }} />
            <span className="text-sm font-semibold" style={{ color: '#111827' }}>Operator Level {level}</span>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#6B7280' }}>
            <span>{xpInLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP to Level {level + 1}</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(xpInLevel / xpForNextLevel) * 100}%`, background: '#1DB954' }}
            />
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex flex-wrap gap-2 mt-4">
        {['9 modules', '36 lessons', '36 checklists', 'Beginner to Intermediate'].map(s => (
          <span key={s} className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: '#F7F8FA', color: '#6B7280', border: '1px solid #E5E7EB' }}>
            {s}
          </span>
        ))}
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
        {modules.map(mod => {
          const completed = isModuleComplete(mod.id);
          const lessonsCompleted = getModuleCompletedLessons(mod.id, mod.lessons);
          const pct = (lessonsCompleted / mod.lessons.length) * 100;
          const inProgress = lessonsCompleted > 0 && !completed;

          return (
            <div
              key={mod.id}
              className="rounded-2xl border p-5 transition-all duration-200 cursor-pointer group"
              style={{
                background: '#FFFFFF',
                borderColor: '#E5E7EB',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = '#1DB954';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '';
                (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
              }}
              onClick={() => navigate(`/university/${mod.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[32px] leading-none">{mod.emoji}</span>
                <img src={mod.image} className="w-20 h-14 rounded-lg object-cover" alt="" loading="lazy" />
              </div>
              <h3 className="text-base font-bold" style={{ color: '#111827' }}>{mod.title}</h3>
              <p className="text-sm mt-1 line-clamp-1" style={{ color: '#6B7280' }}>{mod.summary}</p>
              <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: '#6B7280' }}>
                <span>{mod.lessons.length} lessons</span>
                <span>~{mod.lessons.reduce((a, l) => a + l.duration, 0)} min</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#065F46' }}>
                  <Zap className="w-3 h-3 mr-0.5" /> +{mod.xpReward} XP
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#1DB954' }} />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between mt-3">
                <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  completed ? '' : inProgress ? '' : ''
                }`} style={{
                  background: completed ? '#ECFDF5' : inProgress ? '#FFFBEB' : '#F3F4F6',
                  color: completed ? '#065F46' : inProgress ? '#92400E' : '#6B7280',
                }}>
                  {completed ? 'Completed ✓' : inProgress ? 'In progress' : 'Not started'}
                </span>
              </div>

              <button
                className="w-full h-12 rounded-[10px] font-semibold text-sm mt-4 transition-opacity hover:opacity-90 inline-flex items-center justify-center gap-2"
                style={{
                  background: inProgress ? '#1DB954' : '#111827',
                  color: '#FFFFFF',
                }}
                onClick={e => { e.stopPropagation(); navigate(`/university/${mod.id}`); }}
              >
                {inProgress ? <>Continue <ChevronRight className="w-4 h-4" /></> : completed ? 'Review' : <>Open Module <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Achievements panel */}
      <div className="mt-10 mb-4">
        <h2 className="text-lg font-bold" style={{ color: '#111827' }}>Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
          {achievements.map(a => {
            const unlocked = progress.achievementsUnlocked.includes(a.id);
            return (
              <div
                key={a.id}
                className="rounded-2xl border p-4 text-center transition-all duration-300 relative overflow-hidden"
                style={{
                  background: unlocked ? '#FFFFFF' : '#F9FAFB',
                  borderColor: unlocked ? '#1DB954' : '#E5E7EB',
                  boxShadow: unlocked ? '0 0 20px rgba(29,185,84,0.15)' : 'none',
                  opacity: unlocked ? 1 : 0.6,
                  transform: unlocked ? 'scale(1)' : 'scale(0.97)',
                }}
              >
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Lock className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                  </div>
                )}
                <div className={`text-2xl mb-2 ${!unlocked ? 'blur-sm' : ''}`}>{a.icon === '🔒' ? '🏆' : a.icon}</div>
                <h4 className={`text-xs font-bold ${!unlocked ? 'blur-sm' : ''}`} style={{ color: '#111827' }}>{a.title}</h4>
                <p className={`text-[10px] mt-0.5 ${!unlocked ? 'blur-sm' : ''}`} style={{ color: '#6B7280' }}>{a.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
