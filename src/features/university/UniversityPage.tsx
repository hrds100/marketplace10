import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { modules } from '@/data/universityData';
import { useUniversityProgress } from '@/hooks/useUniversityProgress';
import { ChevronRight, BookOpen, Sparkles } from 'lucide-react';

export default function UniversityPage() {
  const { t } = useTranslation();
  useEffect(() => { document.title = 'nfstay - Academy'; }, []);
  const navigate = useNavigate();
  const { isModuleComplete, getModuleCompletedLessons } = useUniversityProgress();

  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const completedLessons = modules.reduce((a, m) => a + getModuleCompletedLessons(m.id, m.lessons), 0);

  return (
    <div data-feature="UNIVERSITY" className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-[28px] font-bold text-foreground">{t('university.title')}</h1>
        <p className="text-sm mt-1 text-muted-foreground">
          {t('university.subtitle')}
        </p>
        <p className="text-xs mt-2 px-3 py-1.5 rounded-lg inline-block font-medium bg-[#ECFDF5] text-[#065F46]">
          {t('university.description')}
        </p>
      </div>

      {/* Progress bar — simple and clear */}
      <div className="rounded-2xl border border-border bg-card p-5 mt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#1E9A80]" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{t('university.yourProgress')}</p>
              <p className="text-xs text-muted-foreground">{t('university.lessonsCompleted', { completed: completedLessons, total: totalLessons })}</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-[#1E9A80]">{Math.round((completedLessons / totalLessons) * 100)}%</span>
        </div>
        <div className="mt-3 w-full h-2.5 rounded-full overflow-hidden bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-[#1E9A80]"
            style={{ width: `${(completedLessons / totalLessons) * 100}%` }}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-2 mt-4">
        {[
          { key: 'modules', label: t('university.modules', { count: modules.length }) },
          { key: 'lessons', label: t('university.lessons', { count: totalLessons }) },
          { key: 'level', label: t('university.level') },
          { key: 'ai', label: t('university.aiAssisted'), icon: true },
        ].map(s => (
          <span key={s.key} className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full bg-secondary text-muted-foreground border border-border">
            {s.icon && <Sparkles className="w-3 h-3 mr-1" />}
            {s.label}
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
              data-feature="UNIVERSITY__MODULE_CARD"
              className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:border-[#1E9A80]"
              onClick={() => navigate(`/university/${mod.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[32px] leading-none">{mod.emoji}</span>
                <img src={mod.image} className="w-20 h-14 rounded-lg object-cover" alt="" loading="lazy" />
              </div>
              <h3 className="text-base font-bold text-foreground">{mod.title}</h3>
              <p className="text-sm mt-1 line-clamp-1 text-muted-foreground">{mod.summary}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span>{t('university.lessons', { count: mod.lessons.length })}</span>
                <span>{t('university.duration', { minutes: mod.lessons.reduce((a, l) => a + l.duration, 0) })}</span>
              </div>

              {/* Progress bar */}
              <div data-feature="UNIVERSITY__MODULE_PROGRESS" className="mt-3">
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-100">
                  <div className="h-full rounded-full transition-all duration-500 bg-[#1E9A80]" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {t('university.done', { completed: lessonsCompleted, total: mod.lessons.length })}
                  </span>
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    completed ? 'bg-[#ECFDF5] text-[#065F46]' : inProgress ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-muted-foreground'
                  }`}>
                    {completed ? t('university.completed') : inProgress ? t('university.inProgress') : t('university.notStarted')}
                  </span>
                </div>
              </div>

              <button
                className="w-full h-11 rounded-[10px] font-semibold text-sm mt-4 transition-opacity hover:opacity-90 inline-flex items-center justify-center gap-2 text-white"
                style={{ background: inProgress ? '#1E9A80' : '#111827' }}
                onClick={e => { e.stopPropagation(); navigate(`/university/${mod.id}`); }}
              >
                {inProgress ? <>{t('university.continue')} <ChevronRight className="w-4 h-4" /></> : completed ? t('university.review') : <>{t('university.openModule')} <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
