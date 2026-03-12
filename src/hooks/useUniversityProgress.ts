import { useState, useCallback, useEffect } from 'react';
import { modules as allModules } from '@/data/universityData';

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
  } catch {}
  return { ...defaultProgress };
}

function saveProgress(p: UniversityProgress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function useUniversityProgress() {
  const [progress, setProgress] = useState<UniversityProgress>(loadProgress);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

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

  const toggleStep = useCallback((moduleId: string, lessonId: string, stepIndex: number) => {
    const key = `${moduleId}:${lessonId}:${stepIndex}`;
    setProgress(p => {
      const wasCompleted = p.completedSteps[key];
      const newSteps = { ...p.completedSteps, [key]: !wasCompleted };
      return {
        ...p,
        completedSteps: newSteps,
        totalXP: wasCompleted ? p.totalXP - 5 : p.totalXP + 5,
      };
    });
  }, []);

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
    setProgress(p => {
      if (p.completedLessons[key]) return p;
      const newLessons = { ...p.completedLessons, [key]: true };

      // Check if module is complete
      const mod = allModules.find(m => m.id === moduleId);
      let newModules = { ...p.completedModules };
      let bonusXP = 80;
      let newAchievements = [...p.achievementsUnlocked];

      if (mod) {
        const allLessonsDone = mod.lessons.every(l => newLessons[`${moduleId}:${l.id}`]);
        if (allLessonsDone && !p.completedModules[moduleId]) {
          newModules[moduleId] = true;
          bonusXP += 320;
          // Check achievements
          if (moduleId === 'getting-started' && !newAchievements.includes('first-steps')) {
            newAchievements.push('first-steps');
          }
          if (moduleId === 'landlord-pitching' && !newAchievements.includes('negotiator')) {
            newAchievements.push('negotiator');
          }
          if (moduleId === 'outreach-scripts' && !newAchievements.includes('script-master')) {
            newAchievements.push('script-master');
          }
          // Check full operator
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
  }, []);

  const isModuleComplete = useCallback((moduleId: string) => {
    return !!progress.completedModules[moduleId];
  }, [progress.completedModules]);

  const getModuleCompletedLessons = useCallback((moduleId: string, totalLessons: { id: string }[]) => {
    return totalLessons.filter(l => progress.completedLessons[`${moduleId}:${l.id}`]).length;
  }, [progress.completedLessons]);

  const getLessonStatus = useCallback((moduleId: string, lessonId: string, lessonIndex: number, lessons: { id: string }[]) => {
    if (progress.completedLessons[`${moduleId}:${lessonId}`]) return 'completed';
    // Check if prior lesson is done or it's the first
    if (lessonIndex === 0) return 'available';
    const priorLesson = lessons[lessonIndex - 1];
    if (progress.completedLessons[`${moduleId}:${priorLesson.id}`]) return 'available';
    // For completed modules or the first incomplete module, unlock first available
    if (progress.completedModules[moduleId]) return 'available';
    // Check if any step has been done in this lesson
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
