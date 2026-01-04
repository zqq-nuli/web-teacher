import type { LessonStep, LessonPlan, GuideSettings } from '@/types';
import type { DriveStep } from 'driver.js';
import { logger } from '@/utils/logger';

/**
 * 步骤控制器事件
 */
export interface StepControllerEvents {
  onStepChange?: (stepIndex: number, step: LessonStep) => void;
  onComplete?: () => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 步骤控制器状态
 */
export interface StepControllerState {
  currentStepIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  isCompleted: boolean;
}

/**
 * 将 LessonStep 转换为 Driver.js 步骤
 */
export function lessonStepToDriverStep(step: LessonStep, index: number, total: number): DriveStep {
  const driveStep: DriveStep = {
    popover: {
      title: step.title,
      description: step.content,
      side: step.popoverPosition || 'bottom',
      align: 'center',
    },
  };

  // 如果有目标选择器，添加元素
  if (step.targetSelector) {
    driveStep.element = step.targetSelector;
  }

  return driveStep;
}

/**
 * 将整个教案转换为 Driver.js 步骤数组
 */
export function lessonPlanToDriverSteps(lessonPlan: LessonPlan): DriveStep[] {
  return lessonPlan.steps.map((step, index) =>
    lessonStepToDriverStep(step, index, lessonPlan.steps.length)
  );
}

/**
 * 验证选择器是否在页面中存在
 */
export function validateSelector(selector: string): boolean {
  try {
    const element = document.querySelector(selector);
    return element !== null;
  } catch {
    return false;
  }
}

/**
 * 验证教案中所有选择器的有效性
 */
export function validateLessonSteps(steps: LessonStep[]): {
  valid: LessonStep[];
  invalid: { step: LessonStep; reason: string }[];
} {
  const valid: LessonStep[] = [];
  const invalid: { step: LessonStep; reason: string }[] = [];

  for (const step of steps) {
    if (step.targetSelector) {
      if (validateSelector(step.targetSelector)) {
        valid.push(step);
      } else {
        invalid.push({
          step,
          reason: `选择器 "${step.targetSelector}" 在页面中未找到`,
        });
      }
    } else {
      // 没有选择器的步骤（modal类型）也是有效的
      valid.push(step);
    }
  }

  return { valid, invalid };
}

/**
 * 滚动到指定元素
 */
export function scrollToElement(
  selector: string,
  options: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
  } = {}
): boolean {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      logger.warn(`滚动目标未找到: ${selector}`);
      return false;
    }

    element.scrollIntoView({
      behavior: options.behavior || 'smooth',
      block: options.block || 'center',
      inline: options.inline || 'nearest',
    });

    return true;
  } catch (error) {
    logger.error('滚动到元素失败', error);
    return false;
  }
}

/**
 * 步骤控制器类
 * 管理教案步骤的导航和状态
 */
export class StepController {
  private lessonPlan: LessonPlan | null = null;
  private state: StepControllerState = {
    currentStepIndex: 0,
    isPlaying: false,
    isPaused: false,
    isCompleted: false,
  };
  private events: StepControllerEvents = {};
  private settings: GuideSettings;
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(settings: GuideSettings, events?: StepControllerEvents) {
    this.settings = settings;
    if (events) {
      this.events = events;
    }
  }

  /**
   * 加载教案
   */
  load(lessonPlan: LessonPlan): void {
    this.lessonPlan = lessonPlan;
    this.reset();
    logger.info(`已加载教案: ${lessonPlan.title}，共 ${lessonPlan.steps.length} 个步骤`);
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.stopAutoAdvance();
    this.state = {
      currentStepIndex: 0,
      isPlaying: false,
      isPaused: false,
      isCompleted: false,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): StepControllerState {
    return { ...this.state };
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep(): LessonStep | null {
    if (!this.lessonPlan || this.lessonPlan.steps.length === 0) {
      return null;
    }
    return this.lessonPlan.steps[this.state.currentStepIndex] || null;
  }

  /**
   * 获取总步骤数
   */
  getTotalSteps(): number {
    return this.lessonPlan?.steps.length || 0;
  }

  /**
   * 开始播放
   */
  start(): void {
    if (!this.lessonPlan) {
      logger.error('无法开始：未加载教案');
      this.events.onError?.(new Error('未加载教案'));
      return;
    }

    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.state.isCompleted = false;
    this.state.currentStepIndex = 0;

    logger.info('开始引导');
    this.events.onStart?.();
    this.emitStepChange();
    this.startAutoAdvanceIfEnabled();
  }

  /**
   * 暂停
   */
  pause(): void {
    if (!this.state.isPlaying || this.state.isPaused) {
      return;
    }

    this.state.isPaused = true;
    this.stopAutoAdvance();
    logger.info('已暂停');
    this.events.onPause?.();
  }

  /**
   * 恢复
   */
  resume(): void {
    if (!this.state.isPlaying || !this.state.isPaused) {
      return;
    }

    this.state.isPaused = false;
    logger.info('已恢复');
    this.events.onResume?.();
    this.startAutoAdvanceIfEnabled();
  }

  /**
   * 停止
   */
  stop(): void {
    this.stopAutoAdvance();
    this.state.isPlaying = false;
    this.state.isPaused = false;
    logger.info('已停止');
  }

  /**
   * 下一步
   */
  next(): boolean {
    if (!this.lessonPlan || this.state.isCompleted) {
      return false;
    }

    const nextIndex = this.state.currentStepIndex + 1;

    if (nextIndex >= this.lessonPlan.steps.length) {
      this.complete();
      return false;
    }

    this.state.currentStepIndex = nextIndex;
    this.emitStepChange();
    this.restartAutoAdvanceIfEnabled();
    return true;
  }

  /**
   * 上一步
   */
  previous(): boolean {
    if (!this.lessonPlan || this.state.currentStepIndex === 0) {
      return false;
    }

    this.state.currentStepIndex -= 1;
    this.state.isCompleted = false;
    this.emitStepChange();
    this.restartAutoAdvanceIfEnabled();
    return true;
  }

  /**
   * 跳转到指定步骤
   */
  goToStep(index: number): boolean {
    if (!this.lessonPlan) {
      return false;
    }

    if (index < 0 || index >= this.lessonPlan.steps.length) {
      logger.warn(`无效的步骤索引: ${index}`);
      return false;
    }

    this.state.currentStepIndex = index;
    this.state.isCompleted = false;
    this.emitStepChange();
    this.restartAutoAdvanceIfEnabled();
    return true;
  }

  /**
   * 完成
   */
  private complete(): void {
    this.state.isCompleted = true;
    this.state.isPlaying = false;
    this.stopAutoAdvance();
    logger.info('教案已完成');
    this.events.onComplete?.();
  }

  /**
   * 触发步骤变更事件
   */
  private emitStepChange(): void {
    const step = this.getCurrentStep();
    if (step) {
      logger.info(`当前步骤: ${this.state.currentStepIndex + 1}/${this.getTotalSteps()} - ${step.title}`);
      this.events.onStepChange?.(this.state.currentStepIndex, step);
    }
  }

  /**
   * 如果启用了自动前进，开始计时器
   */
  private startAutoAdvanceIfEnabled(): void {
    if (this.settings.autoAdvance && !this.state.isPaused) {
      this.autoAdvanceTimer = setTimeout(() => {
        if (!this.state.isPaused && this.state.isPlaying) {
          this.next();
        }
      }, this.settings.autoAdvanceDelay);
    }
  }

  /**
   * 重新启动自动前进计时器
   */
  private restartAutoAdvanceIfEnabled(): void {
    this.stopAutoAdvance();
    this.startAutoAdvanceIfEnabled();
  }

  /**
   * 停止自动前进计时器
   */
  private stopAutoAdvance(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<GuideSettings>): void {
    this.settings = { ...this.settings, ...settings };

    // 如果自动前进设置改变，重新处理计时器
    if ('autoAdvance' in settings || 'autoAdvanceDelay' in settings) {
      this.restartAutoAdvanceIfEnabled();
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopAutoAdvance();
    this.lessonPlan = null;
    this.events = {};
  }
}
