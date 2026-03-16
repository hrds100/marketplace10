import { useState, useCallback, useEffect, useRef } from 'react';
import { modules as allModules } from '@/data/universityData';
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
  totalXP: 1240,
  streak: 4,
  lastActiveDate: new Date().toISOString().split('T')[0],
  achievementsUnlocked: ['first-steps', 'deal-hunter'],
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

export function useUniversityProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<UniversityProgress>(loadProgress);
  const loadedFromDb = useRef(false);

  // Save to localStorage on every change
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  // Load from Supabase on login — DB is source of truth
  useEffect(() => {
    if (!user || loadedFromDb.current) return;

    const load = async () => {
      const { data } = await supabase
        .from('user_progress')
        .select('module_id, lesson_id, step_index')
        .eq('user_id', user.id);

      if (!data || data.length === 0) {
        // First login: migrate localStorage progress to Supabase
        const local = loadProgress();
        const rows: { user_id: string; module_id: string; lesson_id: string; step_index: number }[] = [];

        // Migrate completed steps
        for (const key of Object.keys(local.completedSteps)) {
          if (!local.completedSteps[key]) continue;
          const [moduleId, lessonId, stepIdx] = key.split(':');
          if (moduleId && lessonId && stepIdx !== undefined) {
            rows.push({ user_id: user.id, module_id: moduleId, lesson_id: lessonId, step_index: parseInt(stepIdx, 10) });
          }
        }
        // Migrate completed lessons (step_index = -1)
        for (const key of Object.keys(local.completedLessons)) {
          if (!local.completedLessons[key]) continue;
          const [moduleId, lessonId] = key.split(':');
          if (moduleId && lessonId) {
            rows.push({ user_id: user.id, module_id: moduleId, lesson_id: lessonId, step_index: -1 });
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

      for (const row of data) {
        if (row.step_index === -1) {
          completedLessons[`${row.module_id}:${row.lesson_id}`] = true;
        } else {
          completedSteps[`${row.module_id}:${row.lesson_id}:${row.step_index}`] = true;
        }
      }

      // Derive completed modules
      for (const mod of allModules) {
        const allDone = mod.lessons.every(l => completedLessons[`${mod.id}:${l.id}`]);
        if (allDone) completedModules[mod.id] = true;
      }

      // Calculate XP: 5 per step + 80 per lesson + 320 per module
      const stepCount = Object.keys(completedSteps).length;
      const lessonCount = Object.keys(completedLessons).length;
      const moduleCount = Object.keys(completedModules).length;
      const totalXP = 1240 + (stepCount * 5) + (lessonCount * 80) + (moduleCount * 320);

      // Derive achievements
      const achievementsUnlocked = ['first-steps', 'deal-hunter'];
      if (completedModules['getting-started']) achievementsUnlocked.push('first-steps');
      if (completedModules['landlord-pitching']) achievementsUnlocked.push('negotiator');
      if (completedModules['outreach-scripts']) achievementsUnlocked.push('script-master');
      if (allModules.every(m => completedModules[m.id])) achievementsUnlocked.push('full-operator');

      setProgress(prev => ({
        ...prev,
        completedSteps,
        completedLessons,
        completedModules,
        totalXP,
        achievementsUnlocked: [...new Set(achievementsUnlocked)],
      }));

      loadedFromDb.current = true;
    };

    load();
  }, [user?.id]);

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
  const syncToDb = useCallback((moduleId: string, lessonId: string, stepIndex: number) => {
    if (!user) return;
    supabase.from('user_progress').upsert(
      { user_id: user.id, module_id: moduleId, lesson_id: lessonId, step_index: stepIndex },
      { onConflict: 'user_id,module_id,lesson_id,step_index' }
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

  const toggleStep = useCallback((moduleId: string, lessonId: string, stepIndex: number) => {
    const key = `${moduleId}:${lessonId}:${stepIndex}`;
    setProgress(p => {
      const wasCompleted = p.completedSteps[key];
      const newSteps = { ...p.completedSteps, [key]: !wasCompleted };
      if (wasCompleted) {
        deleteFromDb(moduleId, lessonId, stepIndex);
      } else {
        syncToDb(moduleId, lessonId, stepIndex);
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
      return {
        ...p,
        completedQuickWins: {
          ...p.completedQuickWins,
          [key]: { ...existing, [taskIndex]: !wasCompleted },
        },
      };
    });
  }, []);

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
    syncToDb(moduleId, lessonId, -1);

    setProgress(p => {
      if (p.completedLessons[key]) return p;
      const newLessons = { ...p.completedLessons, [key]: true };

      // Check if module is complete
      const mod = allModules.find(m => m.id === moduleId);
      const newModules = { ...p.completedModules };
      let bonusXP = 80;
      const newAchievements = [...p.achievementsUnlocked];

      if (mod) {
        const allLessonsDone = mod.lessons.every(l => newLessons[`${moduleId}:${l.id}`]);
        if (allLessonsDone && !p.completedModules[moduleId]) {
          newModules[moduleId] = true;
          bonusXP += 320;
          if (moduleId === 'getting-started' && !newAchievements.includes('first-steps')) {
            newAchievements.push('first-steps');
          }
          if (moduleId === 'landlord-pitching' && !newAchievements.includes('negotiator')) {
            newAchievements.push('negotiator');
          }
          if (moduleId === 'outreach-scripts' && !newAchievements.includes('script-master')) {
            newAchievements.push('script-master');
          }
          const allComplete = allModules.every(m => newModules[m.id]);
          if (allComplete && !newAchievements.includes('full-operator')) {
            newAchievements.push('full-operator');
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
  }, [syncToDb]);

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
  };
}
