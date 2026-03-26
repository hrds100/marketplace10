import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getModuleById } from '@/data/universityData';
import { useUniversityProgress } from '@/hooks/useUniversityProgress';
import PaymentSheet from '@/components/PaymentSheet';
import { ArrowLeft, Zap, CheckCircle, Circle, Lock, ChevronRight } from 'lucide-react';

function tierSatisfied(required: string, userTier: string): boolean {
  const tiers = ['free', 'monthly', 'yearly', 'lifetime', 'pro', 'premium'];
  const reqIdx = tiers.indexOf(required);
  const userIdx = tiers.indexOf(userTier);
  if (reqIdx <= 0) return true; // free is open to all
  return userIdx >= reqIdx;
}

export default function ModuleOverviewPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const {
    isLessonComplete, getModuleCompletedLessons, getLessonStatus, curriculumModules, userTier,
  } = useUniversityProgress();

  // Try DB-driven modules first, fallback to static
  const dbMod = curriculumModules.find(m => m.id === (moduleId || ''));
  const mod = dbMod ?? getModuleById(moduleId || '');
  if (!mod) return <div className="p-8 text-center" style={{ color: '#6B7280' }}>Module not found</div>;

  const completedCount = getModuleCompletedLessons(mod.id, mod.lessons);
  const pct = (completedCount / mod.lessons.length) * 100;

  // Tier gating - get tier_required from DB module if available
  const dbModuleTierRequired = (dbMod as unknown as { tier_required?: string } | undefined)?.tier_required ?? 'free';
  const isGated = !tierSatisfied(dbModuleTierRequired, userTier);
  const [paymentOpen, setPaymentOpen] = useState(false);

  return (
    <div data-feature="UNIVERSITY" className="max-w-[860px] mx-auto">
      <button onClick={() => navigate('/dashboard/university')} className="flex items-center gap-1.5 text-sm font-medium mb-6 hover:opacity-70 transition-opacity" style={{ color: '#6B7280' }}>
        <ArrowLeft className="w-4 h-4" /> Academy
      </button>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-[32px]">{mod.emoji}</span>
        <h1 data-feature="UNIVERSITY__MODULE_TITLE" className="text-[26px] font-bold" style={{ color: '#111827' }}>{mod.title}</h1>
      </div>
      <p className="text-sm" style={{ color: '#6B7280' }}>{mod.summary}</p>

      <div data-feature="UNIVERSITY__COMPLETION" className="mt-5 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium" style={{ color: '#111827' }}>{completedCount} of {mod.lessons.length} lessons completed</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden mt-2" style={{ background: '#E5E7EB' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#1DB954' }} />
      </div>

      {/* Learning outcomes */}
      <div className="mt-8">
        <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Learning outcomes</h3>
        <div className="space-y-2">
          {mod.learningOutcomes.map((outcome, i) => {
            const lessonDone = i < mod.lessons.length && isLessonComplete(mod.id, mod.lessons[i].id);
            return (
              <div key={i} className="flex items-start gap-2.5">
                {lessonDone ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#1DB954' }} />
                ) : (
                  <Circle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D1D5DB' }} />
                )}
                <span className="text-sm" style={{ color: '#374151' }}>{outcome}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lesson list */}
      <div className="mt-8 space-y-3 relative">
        <h3 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>Lessons</h3>

        {/* Tier gate overlay */}
        {isGated && (
          <div
            data-feature="UNIVERSITY__LESSON_LOCK"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: 'rgba(249,250,251,0.95)', border: '2px solid #E5E7EB' }}
          >
            <Lock className="w-8 h-8 mb-3" style={{ color: '#9CA3AF' }} />
            <p className="text-base font-bold mb-1" style={{ color: '#111827' }}>
              This module requires {dbModuleTierRequired} access
            </p>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Upgrade your plan to unlock all lessons.</p>
            <button
              onClick={() => setPaymentOpen(true)}
              className="h-11 px-6 rounded-[10px] text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90"
              style={{ background: '#111827', color: '#FFFFFF' }}
            >
              Upgrade Plan <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {mod.lessons.map((lesson, i) => {
          const status = getLessonStatus(mod.id, lesson.id, i, mod.lessons);
          const done = status === 'completed' || isLessonComplete(mod.id, lesson.id);
          const locked = status === 'locked';

          return (
            <div
              key={lesson.id}
              data-feature="UNIVERSITY__LESSON_CARD"
              className="rounded-2xl border p-4 flex items-center gap-4 transition-all duration-200"
              style={{
                background: done ? '#FAFAFA' : '#FFFFFF',
                borderColor: '#E5E7EB',
                opacity: locked ? 0.5 : 1,
                cursor: locked ? 'not-allowed' : 'pointer',
              }}
              onClick={() => !locked && navigate(`/university/${mod.id}/${lesson.id}`)}
              onMouseEnter={e => {
                if (!locked) {
                  (e.currentTarget as HTMLElement).style.borderColor = '#1DB954';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}
            >
              {/* Step number */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: done ? '#111827' : '#F3F4F6',
                  color: done ? '#FFFFFF' : '#6B7280',
                }}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : locked ? <Lock className="w-3.5 h-3.5" /> : i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: '#111827' }}>{lesson.emoji} {lesson.title}</span>
                </div>
                <span className="text-xs" style={{ color: '#6B7280' }}>{lesson.duration} min</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {done && (
                  <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#065F46' }}>
                    Completed ✓
                  </span>
                )}
                {!locked && !done && (
                  <button
                    data-feature="UNIVERSITY__START_LESSON"
                    className="h-9 px-4 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1 transition-opacity hover:opacity-90"
                    style={{ background: '#111827', color: '#FFFFFF' }}
                    onClick={e => { e.stopPropagation(); navigate(`/university/${mod.id}/${lesson.id}`); }}
                  >
                    Start <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {done && (
                  <button
                    className="h-9 px-4 rounded-[10px] text-xs font-semibold inline-flex items-center gap-1 border transition-opacity hover:opacity-90"
                    style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                    onClick={e => { e.stopPropagation(); navigate(`/university/${mod.id}/${lesson.id}`); }}
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <PaymentSheet open={paymentOpen} onOpenChange={setPaymentOpen} onUnlocked={() => window.location.reload()} />
    </div>
  );
}
