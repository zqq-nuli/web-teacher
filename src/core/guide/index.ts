import { driver, type Driver, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { LessonPlan, LessonStep, GuideSettings } from '@/types';
import {
  getDriverConfig,
  injectDriverStyles,
  removeDriverStyles
} from './driver-config';
import {
  StepController,
  lessonPlanToDriverSteps,
  validateLessonSteps,
  scrollToElement,
  type StepControllerEvents,
  type StepControllerState,
} from './step-controller';
import { logger } from '@/utils/logger';

export { StepController } from './step-controller';
export type { StepControllerEvents, StepControllerState } from './step-controller';

/**
 * 引导系统事件
 */
export interface GuideSystemEvents extends StepControllerEvents {
  onDriverInit?: () => void;
  onDriverDestroy?: () => void;
}

/**
 * 引导系统类
 * 整合 Driver.js 和步骤控制器
 */
export class GuideSystem {
  private driverInstance: Driver | null = null;
  private stepController: StepController;
  private lessonPlan: LessonPlan | null = null;
  private settings: GuideSettings;
  private events: GuideSystemEvents;
  private isInitialized = false;

  constructor(settings: GuideSettings, events: GuideSystemEvents = {}) {
    this.settings = settings;
    this.events = events;

    // 初始化步骤控制器，绑定事件
    this.stepController = new StepController(settings, {
      onStepChange: this.handleStepChange.bind(this),
      onComplete: this.handleComplete.bind(this),
      onStart: events.onStart,
      onPause: events.onPause,
      onResume: events.onResume,
      onError: events.onError,
    });
  }

  /**
   * 初始化引导系统
   */
  init(): void {
    if (this.isInitialized) {
      return;
    }

    // 注入自定义样式
    injectDriverStyles();

    this.isInitialized = true;
    logger.info('引导系统已初始化');
    this.events.onDriverInit?.();
  }

  /**
   * 加载教案
   */
  loadLessonPlan(lessonPlan: LessonPlan): {
    success: boolean;
    validSteps: number;
    invalidSteps: { step: LessonStep; reason: string }[];
  } {
    this.init();

    // 验证步骤
    const { valid, invalid } = validateLessonSteps(lessonPlan.steps);

    if (invalid.length > 0) {
      logger.warn(`教案中有 ${invalid.length} 个步骤的选择器无效`, invalid);
    }

    // 创建一个只包含有效步骤的教案副本
    const validLessonPlan: LessonPlan = {
      ...lessonPlan,
      steps: valid,
    };

    this.lessonPlan = validLessonPlan;
    this.stepController.load(validLessonPlan);

    return {
      success: valid.length > 0,
      validSteps: valid.length,
      invalidSteps: invalid,
    };
  }

  /**
   * 开始引导
   */
  start(): boolean {
    if (!this.lessonPlan || this.lessonPlan.steps.length === 0) {
      logger.error('无法开始：没有有效的教案步骤');
      this.events.onError?.(new Error('没有有效的教案步骤'));
      return false;
    }

    // 创建 Driver.js 实例
    const driverSteps = lessonPlanToDriverSteps(this.lessonPlan);
    const config = this.createDriverConfig();

    this.driverInstance = driver(config);
    this.driverInstance.setSteps(driverSteps);

    // 开始 Driver.js 引导
    this.driverInstance.drive();

    // 启动步骤控制器
    this.stepController.start();

    return true;
  }

  /**
   * 暂停引导
   */
  pause(): void {
    this.stepController.pause();
  }

  /**
   * 恢复引导
   */
  resume(): void {
    this.stepController.resume();
  }

  /**
   * 停止引导
   */
  stop(): void {
    this.stepController.stop();

    if (this.driverInstance) {
      this.driverInstance.destroy();
      this.driverInstance = null;
    }
  }

  /**
   * 下一步
   */
  next(): boolean {
    if (this.driverInstance && this.driverInstance.hasNextStep()) {
      this.driverInstance.moveNext();
      return this.stepController.next();
    }
    return false;
  }

  /**
   * 上一步
   */
  previous(): boolean {
    if (this.driverInstance && this.driverInstance.hasPreviousStep()) {
      this.driverInstance.movePrevious();
      return this.stepController.previous();
    }
    return false;
  }

  /**
   * 跳转到指定步骤
   */
  goToStep(index: number): boolean {
    if (!this.driverInstance || !this.lessonPlan) {
      return false;
    }

    if (index < 0 || index >= this.lessonPlan.steps.length) {
      return false;
    }

    this.driverInstance.drive(index);
    return this.stepController.goToStep(index);
  }

  /**
   * 获取当前状态
   */
  getState(): StepControllerState {
    return this.stepController.getState();
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep(): LessonStep | null {
    return this.stepController.getCurrentStep();
  }

  /**
   * 获取总步骤数
   */
  getTotalSteps(): number {
    return this.stepController.getTotalSteps();
  }

  /**
   * 检查是否正在播放
   */
  isPlaying(): boolean {
    return this.getState().isPlaying;
  }

  /**
   * 更新设置
   */
  updateSettings(settings: Partial<GuideSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.stepController.updateSettings(settings);
  }

  /**
   * 销毁引导系统
   */
  destroy(): void {
    this.stop();
    this.stepController.destroy();
    removeDriverStyles();
    this.lessonPlan = null;
    this.isInitialized = false;
    logger.info('引导系统已销毁');
    this.events.onDriverDestroy?.();
  }

  /**
   * 创建 Driver.js 配置
   */
  private createDriverConfig(): Config {
    return getDriverConfig({
      showProgress: this.settings.showProgress,

      // 事件回调
      onHighlightStarted: (element, step, options) => {
        logger.debug('高亮开始', { step });
      },

      onHighlighted: (element, step, options) => {
        logger.debug('高亮完成', { step });
      },

      onDeselected: (element, step, options) => {
        logger.debug('取消高亮', { step });
      },

      onCloseClick: () => {
        logger.info('用户点击关闭');
        this.stop();
        this.events.onComplete?.();
      },

      onNextClick: () => {
        this.next();
      },

      onPrevClick: () => {
        this.previous();
      },

      onDestroyed: () => {
        logger.debug('Driver.js 实例已销毁');
      },
    });
  }

  /**
   * 处理步骤变更
   */
  private handleStepChange(stepIndex: number, step: LessonStep): void {
    // 如果步骤有目标选择器，滚动到对应元素
    if (step.targetSelector) {
      scrollToElement(step.targetSelector);
    }

    this.events.onStepChange?.(stepIndex, step);
  }

  /**
   * 处理完成
   */
  private handleComplete(): void {
    if (this.driverInstance) {
      this.driverInstance.destroy();
      this.driverInstance = null;
    }

    this.events.onComplete?.();
  }
}

/**
 * 创建引导系统实例
 */
export function createGuideSystem(
  settings: GuideSettings,
  events?: GuideSystemEvents
): GuideSystem {
  return new GuideSystem(settings, events);
}

/**
 * 默认引导设置
 */
export const defaultGuideSettings: GuideSettings = {
  autoAdvance: false,
  autoAdvanceDelay: 5000,
  showProgress: true,
};
