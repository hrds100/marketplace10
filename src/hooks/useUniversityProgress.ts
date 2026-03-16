import { useState, useCallback, useEffect, useRef } from 'react';
import {
  modules as staticModules,
  type Module,
  type Lesson,
} from '@/data/universityData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'nfstay-university-progress';

export interface UniversityProgress {
  completedSteps: Record<string, boolean>; // "moduleId:lessonId:stepIndex"
  completedLessons: Record<string, boolean>; // "moduleId:lessonId"
  completedModules: Record<string, boolean>; // "moduleId"
  completedQuickWins: Record<string, Record<number, boolean>>; // "moduleId:lessonId" -> {index: bool}
  totalXP: number;
  streak: number;
  lastActiveDate: string; // ISO date
  achievementsUnlocked: string[];
}

const defaultProgress: UniversityProgress = {
  completedSteps: {},
  completedLessons: {},
  completedModules: {},
  completedQuickWins: {},
  totalXP: 0,
  streak: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  achievementsUnlocked: [],
};

function loadProgress(): UniversityProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore localStorage parse errors */ }
  return { ...defaultProgress };
}

function saveProgress(p: UniversityProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// Transform a DB lesson row's content column (JSON string) back into Lesson fields
function parseLessonContent(row: {
  id: string;
  title: string;
  emoji: string | null;
  estimated_minutes: number | null;
  content: string | null;
  module_id: string | null;
  order: number;
}): Lesson {
  let parsed: Partial<Lesson> = {};
  if (row.content) {
    try {
      parsed = JSON.parse(row.content);
    } catch { /* ignore */ }
  }
  return {
    id: row.id,
    emoji: row.emoji ?? '',
    title: row.title,
    duration: row.estimated_minutes ?? parsed.duration ?? 10,
    whyItMatters: parsed.whyItMatters ?? '',
    content: parsed.content ?? [],
    steps: parsed.steps ?? [],
    commonMistakes: parsed.commonMistakes ?? [],
    ukSpecificNotes: parsed.ukSpecificNotes ?? [],
    quickAction: parsed.quickAction,
    script: parsed.script,
    suggestedPrompts: parsed.suggestedPrompts ?? [],
  };
}

export function useUniversityProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<UniversityProgress>(loadProgress);
  const loadedFromDb = useRef(false);
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);
  const [curriculumModules, setCurriculumModules] = useState<Module[]>(staticModules);
  const [userTier, setUserTier] = useState<string>('free');

  // Save to localStorage on every change
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  // Fetch DB-driven curriculum (modules + lessons)
  useEffect(() => {
    let cancelled = false;
    const fetchCurriculum = async () => {
      setIsLoadingCurriculum(true);
      try {
        const [{ data: dbModules, error: modErr }, { data: dbLessons, error: lesErr }] =
          await Promise.all([
            supabase.from('modules').select('*').order('order_index'),
            supabase.from('lessons').select('*').eq('is_published', true).order('order'),
          ]);

        if (cancelled) return;

        if (modErr || lesErr || !dbModules || dbModules.length === 0) {
          console.warn('[University] DB fetch failed or empty, falling back to static data');
          setCurriculumModules(staticModules);
          setIsLoadingCurriculum(false);
          return;
        }

        // Build lesson lists per module
        const lessonsByModule: Record<string, Lesson[]> = {};
        for (const row of dbLessons ?? []) {
          if (!row.module_id) continue;
          if (!lessonsByModule[row.module_id]) lessonsByModule[row.module_id] = [];
          lessonsByModule[row.module_id].push(parseLessonContent({
            id: row.id,
            title: row.title,
            emoji: row.emoji ?? null,
            estimated_minutes: row.estimated_minutes ?? null,
            content: row.content ?? null,
            module_id: row.module_id,
            order: row.order,
          }));
        }

        // Fallback: for any module with 0 DB lessons, use static data
        const transformedModules: Module[] = dbModules.map(dbMod => {
          const staticMod = staticModules.find(m => m.id === dbMod.id);
          const dbLessonList = lessonsByModule[dbMod.id] ?? [];
          return {
            id: dbMod.id,
            emoji: dbMod.emoji ?? staticMod?.emoji ?? '',
            title: dbMod.title,
            summary: dbMod.description ?? staticMod?.summary ?? '',
            status: 'not-started' as const,
            image: staticMod?.image ?? '',
            xpReward: dbMod.xp_reward,
            lessons: dbLessonList.length > 0 ? dbLessonList : (staticMod?.lessons ?? []),
            learningOutcomes: dbMod.learning_outcomes ?? staticMod?.learningOutcomes ?? [],
          };
        });

        setCurriculumModules(transformedModules);
      } catch {
        if (!cancelled) {
          console.warn('[University] DB fetch failed or empty, falling back to static data');
          setCurriculumModules(staticModules);
        }
      } finally {
        if (!cancelled) setIsLoadingCurriculum(false);
      }
    };

    fetchCurriculum();
    return () => { cancelled = true; };
  }, []);

  // Load user tier from profiles
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('tier').eq('id', user.id).single().then(({ data }) => {
      if (data?.tier) setUserTier(data.tier);
    });
  }, [user?.id]);

  // Load from Supabase on login — DB is source of truth
  useEffect(() => {
    if (!user || loadedFromDb.current) return;

    const load = async () => {
      const { data } = await supabase
        .from('user_progress')
        .select('module_id, lesson_id, step_index, completed')
        .eq('user_id', user.id);

      if (!data || data.length === 0) {
        // First login: migrate localStorage progress to Supabase
        const local = loadProgress();
        const rows: {
          user_id: string;
          module_id: string;
          lesson_id: string;
          step_index: number;
          completed: boolean;
        }[] = [];

        for (const key of Object.keys(local.completedSteps)) {
          if (!local.completedSteps[key]) continue;
          const [moduleId, lessonId, stepIdx] = key.split(':');
          if (moduleId && lessonId && stepIdx !== undefined) {
            rows.push({ user_id: user.id, module_id: moduleId, lesson_id: lessonId, step_index: parseInt(stepIdx, 10), completed: true });
          }
        }
        for (const key of Object.keys(local.completedLessons)) {
          if (!local.completedLessons[key]) continue;
          const [moduleId, lessonId] = key.split(':');
          if (moduleId && lessonId) {
            rows.push({ user_id: user.id, module_id: moduleId, lesson_id: lessonId, step_index: -1, completed: true });
          }
        }

        if (rows.length > 0) {
          await supabase.from('user_progress').upsert(rows, { onConflict: 'user_id,module_id,lesson_id,step_index' });
        }
        loadedFromDb.current = true;
        return;
      }

      // Build progress from DB rows
      const completedSteps: Record<string, boolean> = {};
      const completedLessons: Record<string, boolean> = {};
      const completedModules: Record<string, boolean> = {};
      const completedQuickWins: Record<string, Record<number, boolean>> = {};

      for (const row of data) {
        if (row.step_index === -1) {
          completedLessons[`${row.module_id}:${row.lesson_id}`] = true;
        } else if (row.step_index === -2) {
          // Quick win completion
          const key = `${row.module_id}:${row.lesson_id}`;
          if (!completedQuickWins[key]) completedQuickWins[key] = {};
          completedQuickWins[key][0] = true;
        } else if (row.step_index !== null && row.step_index >= 0) {
          completedSteps[`${row.module_id}:${row.lesson_id}:${row.step_index}`] = true;
        }
      }

      // Derive completed modules using curriculumModules (or static fallback)
      const modulesToCheck = curriculumModules.length > 0 ? curriculumModules : staticModules;
      for (const mod of modulesToCheck) {
        const allDone = mod.lessons.every(l => completedLessons[`${mod.id}:${l.id}`]);
        if (allDone && mod.lessons.length > 0) completedModules[mod.id] = true;
      }

      // Calculate XP from scratch (no hardcoded base)
      const stepCount = Object.keys(completedSteps).length;
      const lessonCount = Object.keys(completedLessons).length;
      const moduleCount = Object.keys(completedModules).length;
      const totalXP = (stepCount * 5) + (lessonCount * 80) + (moduleCount * 320);

      // Fetch achievements from DB — DB wins
      const { data: dbAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      const dbUnlocked = (dbAchievements ?? []).map(a => a.achievement_id);

      // Derive local achievements too
      const derivedAchievements: string[] = [];
      if (completedModules['getting-started']) derivedAchievements.push('first-steps');
      if (completedModules['landlord-pitching']) derivedAchievements.push('negotiator');
      if (completedModules['outreach-scripts']) derivedAchievements.push('script-master');
      const allMods = curriculumModules.length > 0 ? curriculumModules : staticModules;
      if (allMods.every(m => completedModules[m.id])) derivedAchievements.push('full-operator');

      const achievementsUnlocked = [...new Set([...dbUnlocked, ...derivedAchievements])];

      setProgress(prev => ({
        ...prev,
        completedSteps,
        completedLessons,
        completedModules,
        completedQuickWins,
        totalXP,
        achievementsUnlocked,
      }));

      loadedFromDb.current = true;
    };

    load();
  }, [user?.id, curriculumModules]);

  // Update streak
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (progress.lastActiveDate !== today) {
      const lastDate = new Date(progress.lastActiveDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      setProgress(p => ({
        ...p,
        lastActiveDate: today,
        streak: diffDays === 1 ? p.streak + 1 : diffDays === 0 ? p.streak : 1,
      }));
    }
  }, []);

  // Helper: upsert a progress row to Supabase (fire-and-forget)
  const syncToDb = useCallback((
    moduleId: string,
    lessonId: string,
    stepIndex: number,
    extra?: { completed?: boolean; completed_at?: string },
  ) => {
    if (!user) return;
    supabase.from('user_progress').upsert(
      {
        user_id: user.id,
        module_id: moduleId,
        lesson_id: lessonId,
        step_index: stepIndex,
        completed: extra?.completed ?? false,
        ...(extra?.completed_at ? { completed_at: extra.completed_at } : {}),
      },
      { onConflict: 'user_id,module_id,lesson_id,step_index' },
    ).then(() => {});
  }, [user]);

  // Helper: delete a progress row from Supabase (fire-and-forget)
  const deleteFromDb = useCallback((moduleId: string, lessonId: string, stepIndex: number) => {
    if (!user) return;
    supabase.from('user_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .eq('lesson_id', lessonId)
      .eq('step_index', stepIndex)
      .then(() => {});
  }, [user]);

  // Helper: persist achievement to DB
  const syncAchievementToDb = useCallback((achievementId: string) => {
    if (!user) return;
    supabase.from('user_achievements').upsert(
      { user_id: user.id, achievement_id: achievementId },
      { onConflict: 'user_id,achievement_id' },
    ).then(() => {});
  }, [user]);

  const toggleStep = useCallback((moduleId: string, lessonId: string, stepIndex: number) => {
    const key = `${moduleId}:${lessonId}:${stepIndex}`;
    setProgress(p => {
      const wasCompleted = p.completedSteps[key];
      const newSteps = { ...p.completedSteps, [key]: !wasCompleted };
      if (wasCompleted) {
        deleteFromDb(moduleId, lessonId, stepIndex);
      } else {
        syncToDb(moduleId, lessonId, stepIndex, { completed: true });
      }
      return {
        ...p,
        completedSteps: newSteps,
        totalXP: wasCompleted ? p.totalXP - 5 : p.totalXP + 5,
      };
    });
  }, [syncToDb, deleteFromDb]);

  const toggleQuickWinTask = useCallback((moduleId: string, lessonId: string, taskIndex: number) => {
    const key = `${moduleId}:${lessonId}`;
    setProgress(p => {
      const existing = p.completedQuickWins[key] || {};
      const wasCompleted = existing[taskIndex];
      const newTasks = { ...existing, [taskIndex]: !wasCompleted };
      // Check if all tasks in the quick win are now done
      const allDone = Object.values(newTasks).every(Boolean);
      if (!wasCompleted && allDone) {
        // Persist quick win completion with step_index = -2
        syncToDb(moduleId, lessonId, -2, { completed: true });
      }
      return {
        ...p,
        completedQuickWins: {
          ...p.completedQuickWins,
          [key]: newTasks,
        },
      };
    });
  }, [syncToDb]);

  const isQuickWinTaskDone = useCallback((moduleId: string, lessonId: string, taskIndex: number) => {
    const key = `${moduleId}:${lessonId}`;
    return !!progress.completedQuickWins[key]?.[taskIndex];
  }, [progress.completedQuickWins]);

  const allQuickWinTasksDone = useCallback((moduleId: string, lessonId: string, totalTasks: number) => {
    const key = `${moduleId}:${lessonId}`;
    const tasks = progress.completedQuickWins[key] || {};
    return Array.from({ length: totalTasks }).every((_, i) => tasks[i]);
  }, [progress.completedQuickWins]);

  const isStepDone = useCallback((moduleId: string, lessonId: string, stepIndex: number) => {
    return !!progress.completedSteps[`${moduleId}:${lessonId}:${stepIndex}`];
  }, [progress.completedSteps]);

  const countCompletedSteps = useCallback((moduleId: string, lessonId: string, total: number) => {
    let count = 0;
    for (let i = 0; i < total; i++) {
      if (progress.completedSteps[`${moduleId}:${lessonId}:${i}`]) count++;
    }
    return count;
  }, [progress.completedSteps]);

  const isLessonComplete = useCallback((moduleId: string, lessonId: string) => {
    return !!progress.completedLessons[`${moduleId}:${lessonId}`];
  }, [progress.completedLessons]);

  const completeLesson = useCallback((moduleId: string, lessonId: string) => {
    const key = `${moduleId}:${lessonId}`;
    // Sync lesson completion to DB (step_index = -1 means lesson-level)
    syncToDb(moduleId, lessonId, -1, {
      completed: true,
      completed_at: new Date().toISOString(),
    });

    setProgress(p => {
      if (p.completedLessons[key]) return p;
      const newLessons = { ...p.completedLessons, [key]: true };

      // Check if module is complete
      const allMods = curriculumModules.length > 0 ? curriculumModules : staticModules;
      const mod = allMods.find(m => m.id === moduleId);
      const newModules = { ...p.completedModules };
      let bonusXP = 80;
      const prevAchievements = p.achievementsUnlocked;
      const newAchievements = [...prevAchievements];

      if (mod) {
        const allLessonsDone = mod.lessons.every(l => newLessons[`${moduleId}:${l.id}`]);
        if (allLessonsDone && !p.completedModules[moduleId]) {
          newModules[moduleId] = true;
          bonusXP += 320;
          if (moduleId === 'getting-started' && !newAchievements.includes('first-steps')) {
            newAchievements.push('first-steps');
            syncAchievementToDb('first-steps');
          }
          if (moduleId === 'landlord-pitching' && !newAchievements.includes('negotiator')) {
            newAchievements.push('negotiator');
            syncAchievementToDb('negotiator');
          }
          if (moduleId === 'outreach-scripts' && !newAchievements.includes('script-master')) {
            newAchievements.push('script-master');
            syncAchievementToDb('script-master');
          }
          const allComplete = allMods.every(m => newModules[m.id]);
          if (allComplete && !newAchievements.includes('full-operator')) {
            newAchievements.push('full-operator');
            syncAchievementToDb('full-operator');
          }
        }
      }

      return {
        ...p,
        completedLessons: newLessons,
        completedModules: newModules,
        totalXP: p.totalXP + bonusXP,
        achievementsUnlocked: newAchievements,
      };
    });
  }, [syncToDb, syncAchievementToDb, curriculumModules]);

  const isModuleComplete = useCallback((moduleId: string) => {
    return !!progress.completedModules[moduleId];
  }, [progress.completedModules]);

  const getModuleCompletedLessons = useCallback((moduleId: string, totalLessons: { id: string }[]) => {
    return totalLessons.filter(l => progress.completedLessons[`${moduleId}:${l.id}`]).length;
  }, [progress.completedLessons]);

  const getLessonStatus = useCallback((moduleId: string, lessonId: string, lessonIndex: number, lessons: { id: string }[]) => {
    if (progress.completedLessons[`${moduleId}:${lessonId}`]) return 'completed';
    if (lessonIndex === 0) return 'available';
    const priorLesson = lessons[lessonIndex - 1];
    if (progress.completedLessons[`${moduleId}:${priorLesson.id}`]) return 'available';
    if (progress.completedModules[moduleId]) return 'available';
    const hasActivity = Object.keys(progress.completedSteps).some(k => k.startsWith(`${moduleId}:${lessonId}:`));
    if (hasActivity) return 'available';
    return 'locked';
  }, [progress.completedLessons, progress.completedModules, progress.completedSteps]);

  const level = Math.floor(progress.totalXP / 2000) + 1;
  const xpInLevel = progress.totalXP % 2000;
  const xpForNextLevel = 2000;

  return {
    progress,
    toggleStep,
    isStepDone,
    countCompletedSteps,
    completeLesson,
    isLessonComplete,
    isModuleComplete,
    getModuleCompletedLessons,
    getLessonStatus,
    toggleQuickWinTask,
    isQuickWinTaskDone,
    allQuickWinTasksDone,
    level,
    xpInLevel,
    xpForNextLevel,
    isLoadingCurriculum,
    curriculumModules,
    userTier,
  };
}
