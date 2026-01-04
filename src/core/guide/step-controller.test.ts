import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateSelector, lessonStepToDriverStep, StepController } from './step-controller';
import type { LessonStep, LessonPlan, GuideSettings } from '@/types';

// Mock document.querySelector
const mockQuerySelector = vi.fn();
Object.defineProperty(global, 'document', {
  value: {
    querySelector: mockQuerySelector,
  },
  writable: true,
});

describe('validateSelector', () => {
  beforeEach(() => {
    mockQuerySelector.mockReset();
  });

  it('should reject empty selectors', () => {
    expect(validateSelector('')).toBe(false);
    expect(validateSelector(null as unknown as string)).toBe(false);
    expect(validateSelector(undefined as unknown as string)).toBe(false);
  });

  it('should reject selectors that are too long', () => {
    const longSelector = 'div'.repeat(200);
    expect(validateSelector(longSelector)).toBe(false);
  });

  it('should reject selectors with too many parts', () => {
    const complexSelector = Array(25).fill('div').join(' > ');
    expect(validateSelector(complexSelector)).toBe(false);
  });

  it('should reject dangerous patterns', () => {
    expect(validateSelector('*:not(:not(div))')).toBe(false);
    expect(validateSelector('div:has(span:has(a))')).toBe(false);
    expect(validateSelector('div::-webkit-scrollbar')).toBe(false);
    expect(validateSelector('expression(alert(1))')).toBe(false);
  });

  it('should accept valid selectors when element exists', () => {
    mockQuerySelector.mockReturnValue({ tagName: 'DIV' }); // 返回一个模拟元素
    expect(validateSelector('.valid-class')).toBe(true);
    expect(validateSelector('#valid-id')).toBe(true);
  });

  it('should reject valid selectors when element not found', () => {
    mockQuerySelector.mockReturnValue(null);
    expect(validateSelector('.nonexistent')).toBe(false);
  });

  it('should handle querySelector throwing errors', () => {
    mockQuerySelector.mockImplementation(() => {
      throw new Error('Invalid selector');
    });
    expect(validateSelector('[invalid')).toBe(false);
  });
});

describe('lessonStepToDriverStep', () => {
  it('should convert LessonStep to DriveStep', () => {
    const step: LessonStep = {
      id: 'step-1',
      order: 1,
      title: 'Test Step',
      content: 'Test content',
      targetSelector: '.target',
      highlightType: 'element',
      popoverPosition: 'bottom',
    };

    const result = lessonStepToDriverStep(step, 0, 5);

    expect(result.element).toBe('.target');
    expect(result.popover?.title).toBe('Test Step');
    expect(result.popover?.description).toBe('Test content');
    expect(result.popover?.side).toBe('bottom');
  });

  it('should handle step without targetSelector', () => {
    const step: LessonStep = {
      id: 'step-1',
      order: 1,
      title: 'Modal Step',
      content: 'Modal content',
      highlightType: 'modal',
    };

    const result = lessonStepToDriverStep(step, 0, 1);

    expect(result.element).toBeUndefined();
    expect(result.popover?.title).toBe('Modal Step');
  });

  it('should use default popover position', () => {
    const step: LessonStep = {
      id: 'step-1',
      order: 1,
      title: 'Test',
      content: 'Content',
      highlightType: 'element',
    };

    const result = lessonStepToDriverStep(step, 0, 1);

    expect(result.popover?.side).toBe('bottom');
  });
});

describe('StepController', () => {
  const mockSettings: GuideSettings = {
    autoAdvance: false,
    autoAdvanceDelay: 5000,
    showProgress: true,
  };

  const mockLessonPlan: LessonPlan = {
    id: 'lesson-1',
    url: 'https://example.com',
    title: 'Test Lesson',
    createdAt: Date.now(),
    steps: [
      { id: 'step-1', order: 1, title: 'Step 1', content: 'Content 1', highlightType: 'element' },
      { id: 'step-2', order: 2, title: 'Step 2', content: 'Content 2', highlightType: 'element' },
      { id: 'step-3', order: 3, title: 'Step 3', content: 'Content 3', highlightType: 'element' },
    ],
    metadata: {
      estimatedTime: 10,
      difficulty: 'beginner',
      keywords: ['test'],
    },
  };

  it('should initialize with correct state', () => {
    const controller = new StepController(mockSettings);
    const state = controller.getState();

    expect(state.currentStepIndex).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.isCompleted).toBe(false);
  });

  it('should load lesson plan', () => {
    const controller = new StepController(mockSettings);
    controller.load(mockLessonPlan);

    expect(controller.getTotalSteps()).toBe(3);
    expect(controller.getCurrentStep()?.id).toBe('step-1');
  });

  it('should navigate to next step', () => {
    const controller = new StepController(mockSettings);
    controller.load(mockLessonPlan);
    controller.start();

    const result = controller.next();

    expect(result).toBe(true);
    expect(controller.getState().currentStepIndex).toBe(1);
  });

  it('should navigate to previous step', () => {
    const controller = new StepController(mockSettings);
    controller.load(mockLessonPlan);
    controller.start();
    controller.next();

    const result = controller.previous();

    expect(result).toBe(true);
    expect(controller.getState().currentStepIndex).toBe(0);
  });

  it('should not go before first step', () => {
    const controller = new StepController(mockSettings);
    controller.load(mockLessonPlan);
    controller.start();

    const result = controller.previous();

    expect(result).toBe(false);
    expect(controller.getState().currentStepIndex).toBe(0);
  });

  it('should jump to specific step', () => {
    const controller = new StepController(mockSettings);
    controller.load(mockLessonPlan);
    controller.start();

    const result = controller.goToStep(2);

    expect(result).toBe(true);
    expect(controller.getState().currentStepIndex).toBe(2);
  });

  it('should reject invalid step index', () => {
    const controller = new StepController(mockSettings);
    controller.load(mockLessonPlan);

    expect(controller.goToStep(-1)).toBe(false);
    expect(controller.goToStep(10)).toBe(false);
  });

  it('should call onStepChange callback', () => {
    const onStepChange = vi.fn();
    const controller = new StepController(mockSettings, { onStepChange });
    controller.load(mockLessonPlan);
    controller.start();

    expect(onStepChange).toHaveBeenCalledWith(0, mockLessonPlan.steps[0]);
  });

  it('should call onComplete when reaching end', () => {
    const onComplete = vi.fn();
    const controller = new StepController(mockSettings, { onComplete });
    controller.load(mockLessonPlan);
    controller.start();
    controller.next();
    controller.next();
    controller.next(); // 超出最后一步

    expect(onComplete).toHaveBeenCalled();
    expect(controller.getState().isCompleted).toBe(true);
  });

  it('should pause and resume', () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    const controller = new StepController(mockSettings, { onPause, onResume });
    controller.load(mockLessonPlan);
    controller.start();

    controller.pause();
    expect(controller.getState().isPaused).toBe(true);
    expect(onPause).toHaveBeenCalled();

    controller.resume();
    expect(controller.getState().isPaused).toBe(false);
    expect(onResume).toHaveBeenCalled();
  });

  it('should clean up on destroy', () => {
    const controller = new StepController(mockSettings);
    controller.load(mockLessonPlan);
    controller.start();
    controller.destroy();

    expect(controller.getTotalSteps()).toBe(0);
    expect(controller.getCurrentStep()).toBeNull();
  });
});
