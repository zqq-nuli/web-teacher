import { create } from 'zustand';
import type { LessonPlan, LessonStep, LessonStatus, LearningProgress } from '@/types';

interface LessonState {
  // 当前课程
  currentLesson: LessonPlan | null;
  currentStepIndex: number;
  status: LessonStatus;

  // 学习进度
  progress: LearningProgress | null;

  // Actions
  setLesson: (lesson: LessonPlan) => void;
  clearLesson: () => void;
  setStatus: (status: LessonStatus) => void;

  // 步骤控制
  goToStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // 获取当前步骤
  getCurrentStep: () => LessonStep | null;
  getTotalSteps: () => number;
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  currentLesson: null,
  currentStepIndex: 0,
  status: 'idle',
  progress: null,

  setLesson: (lesson) =>
    set({
      currentLesson: lesson,
      currentStepIndex: 0,
      status: 'ready',
      progress: {
        lessonId: lesson.id,
        currentStep: 0,
        completedSteps: [],
        startedAt: Date.now(),
        lastAccessedAt: Date.now(),
      },
    }),

  clearLesson: () =>
    set({
      currentLesson: null,
      currentStepIndex: 0,
      status: 'idle',
      progress: null,
    }),

  setStatus: (status) => set({ status }),

  goToStep: (index) => {
    const { currentLesson, progress } = get();
    if (!currentLesson || index < 0 || index >= currentLesson.steps.length) {
      return;
    }

    set((state) => ({
      currentStepIndex: index,
      progress: state.progress
        ? { ...state.progress, currentStep: index, lastAccessedAt: Date.now() }
        : null,
    }));
  },

  nextStep: () => {
    const { currentLesson, currentStepIndex, progress } = get();
    if (!currentLesson) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= currentLesson.steps.length) {
      set({ status: 'completed' });
      return;
    }

    const currentStepId = currentLesson.steps[currentStepIndex].id;
    const completedSteps = progress?.completedSteps || [];

    set({
      currentStepIndex: nextIndex,
      progress: progress
        ? {
            ...progress,
            currentStep: nextIndex,
            completedSteps: completedSteps.includes(currentStepId)
              ? completedSteps
              : [...completedSteps, currentStepId],
            lastAccessedAt: Date.now(),
          }
        : null,
    });
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex <= 0) return;

    set((state) => ({
      currentStepIndex: currentStepIndex - 1,
      progress: state.progress
        ? { ...state.progress, currentStep: currentStepIndex - 1, lastAccessedAt: Date.now() }
        : null,
    }));
  },

  getCurrentStep: () => {
    const { currentLesson, currentStepIndex } = get();
    return currentLesson?.steps[currentStepIndex] || null;
  },

  getTotalSteps: () => {
    const { currentLesson } = get();
    return currentLesson?.steps.length || 0;
  },

  isFirstStep: () => get().currentStepIndex === 0,

  isLastStep: () => {
    const { currentLesson, currentStepIndex } = get();
    return currentLesson ? currentStepIndex >= currentLesson.steps.length - 1 : true;
  },
}));
