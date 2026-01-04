import { logger } from '@/utils/logger';
import { extractPageContent as extractContent } from '@/core/extractor';
import { GuideSystem, createGuideSystem, defaultGuideSettings } from '@/core/guide';
import { TTSController, createTTSController, defaultTTSSettings } from '@/core/tts';
import type { LessonPlan, GuideSettings, ExtractedContent, TTSSettings } from '@/types';
import ReactDOM from 'react-dom/client';
import { ContentApp } from '@/components/ContentApp';
import '@/components/FloatingPanel/FloatingPanel.css';

// 全局实例
let guideSystem: GuideSystem | null = null;
let ttsController: TTSController | null = null;
let uiRoot: ReactDOM.Root | null = null;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    logger.info('网页教师 Content Script 已加载', { url: window.location.href });

    // 创建 UI 容器
    const ui = await createShadowRootUi(ctx, {
      name: 'web-teacher-panel',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount: (container) => {
        // 创建 React 根节点
        const appContainer = document.createElement('div');
        appContainer.id = 'web-teacher-app';
        container.appendChild(appContainer);

        uiRoot = ReactDOM.createRoot(appContainer);
        uiRoot.render(<ContentApp />);

        return appContainer;
      },
      onRemove: (container) => {
        if (uiRoot) {
          uiRoot.unmount();
          uiRoot = null;
        }
      },
    });

    // 挂载 UI
    ui.mount();

    // 监听来自Popup/Background的消息
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 验证消息来源 - 只接受来自本扩展的消息
      if (sender.id !== browser.runtime.id) {
        logger.warn('拒绝来自未知来源的消息', { senderId: sender.id });
        sendResponse({ success: false, error: '未授权的消息来源' });
        return false;
      }

      // 验证消息类型白名单
      const allowedTypes = [
        'EXTRACT_CONTENT', 'START_GUIDE', 'STOP_GUIDE', 'PAUSE_GUIDE',
        'RESUME_GUIDE', 'NEXT_STEP', 'PREV_STEP', 'GO_TO_STEP',
        'GET_GUIDE_STATE', 'TOGGLE_TTS', 'SPEAK_TEXT', 'STOP_TTS',
        'GET_TTS_VOICES', 'SHOW_PANEL', 'HIDE_PANEL', 'UPDATE_STEP',
        'GUIDE_COMPLETED'
      ];

      if (!message?.type || !allowedTypes.includes(message.type)) {
        logger.warn('未知的消息类型', { type: message?.type });
        sendResponse({ success: false, error: '未知消息类型' });
        return false;
      }

      logger.debug('收到消息', message);

      // 处理异步消息
      handleMessage(message)
        .then(sendResponse)
        .catch((error) => {
          logger.error('消息处理失败', error);
          sendResponse({ success: false, error: error.message });
        });

      // 返回true表示异步响应
      return true;
    });

    // 清理函数
    ctx.onInvalidated(() => {
      logger.info('Content Script 已卸载');
      cleanup();
    });
  },
});

/**
 * 处理消息
 */
async function handleMessage(message: { type: string; payload?: any }): Promise<any> {
  switch (message.type) {
    case 'EXTRACT_CONTENT':
      return extractPageContent();

    case 'START_GUIDE':
      return startGuide(message.payload as { lessonPlan: LessonPlan; settings?: Partial<GuideSettings> });

    case 'STOP_GUIDE':
      return stopGuide();

    case 'PAUSE_GUIDE':
      return pauseGuide();

    case 'RESUME_GUIDE':
      return resumeGuide();

    case 'NEXT_STEP':
      return nextStep();

    case 'PREV_STEP':
      return prevStep();

    case 'GO_TO_STEP':
      return goToStep(message.payload as { index: number });

    case 'GET_GUIDE_STATE':
      return getGuideState();

    case 'TOGGLE_TTS':
      return toggleTTS(message.payload as { enabled: boolean });

    case 'SPEAK_TEXT':
      return speakText(message.payload as { text: string });

    case 'STOP_TTS':
      return stopTTS();

    case 'GET_TTS_VOICES':
      return getTTSVoices();

    default:
      logger.warn('未知消息类型', message.type);
      return { success: false, error: '未知消息类型' };
  }
}

/**
 * 提取页面内容
 */
async function extractPageContent(): Promise<{ success: boolean; data?: ExtractedContent; error?: string }> {
  try {
    logger.info('开始提取页面内容');
    const content = extractContent();
    if (!content) {
      return { success: false, error: '未能检测到主内容区域' };
    }
    logger.info(`提取完成: ${content.elements.length} 个元素`);
    return { success: true, data: content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('内容提取失败', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 启动引导
 */
async function startGuide(payload: {
  lessonPlan: LessonPlan;
  settings?: Partial<GuideSettings>;
}): Promise<{ success: boolean; validSteps?: number; invalidSteps?: any[]; error?: string }> {
  try {
    const { lessonPlan, settings } = payload;

    // 如果已有实例，先销毁
    if (guideSystem) {
      guideSystem.destroy();
    }

    // 合并设置
    const guideSettings: GuideSettings = {
      ...defaultGuideSettings,
      ...settings,
    };

    // 创建新实例
    guideSystem = createGuideSystem(guideSettings, {
      onStepChange: (index, step) => {
        // 通知背景脚本步骤变化
        browser.runtime.sendMessage({
          type: 'STEP_CHANGED',
          payload: { index, step },
        });
      },
      onComplete: () => {
        browser.runtime.sendMessage({
          type: 'GUIDE_COMPLETED',
        });
      },
      onError: (error) => {
        browser.runtime.sendMessage({
          type: 'GUIDE_ERROR',
          payload: { error: error.message },
        });
      },
    });

    // 加载教案
    const result = guideSystem.loadLessonPlan(lessonPlan);

    if (!result.success) {
      return {
        success: false,
        error: '没有有效的教案步骤',
        invalidSteps: result.invalidSteps,
      };
    }

    // 启动引导
    const started = guideSystem.start();

    // 通知 UI 显示面板
    browser.runtime.sendMessage({
      type: 'SHOW_PANEL',
      payload: { lessonPlan },
    });

    return {
      success: started,
      validSteps: result.validSteps,
      invalidSteps: result.invalidSteps,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('启动引导失败', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 停止引导
 */
function stopGuide(): { success: boolean } {
  if (guideSystem) {
    guideSystem.stop();
  }
  return { success: true };
}

/**
 * 暂停引导
 */
function pauseGuide(): { success: boolean; error?: string } {
  if (guideSystem) {
    guideSystem.pause();
    return { success: true };
  }
  return { success: false, error: '引导系统未运行' };
}

/**
 * 恢复引导
 */
function resumeGuide(): { success: boolean; error?: string } {
  if (guideSystem) {
    guideSystem.resume();
    return { success: true };
  }
  return { success: false, error: '引导系统未运行' };
}

/**
 * 下一步
 */
function nextStep(): { success: boolean } {
  if (guideSystem) {
    const result = guideSystem.next();
    return { success: result };
  }
  return { success: false };
}

/**
 * 上一步
 */
function prevStep(): { success: boolean } {
  if (guideSystem) {
    const result = guideSystem.previous();
    return { success: result };
  }
  return { success: false };
}

/**
 * 跳转到指定步骤
 */
function goToStep(payload: { index: number }): { success: boolean } {
  if (guideSystem) {
    const result = guideSystem.goToStep(payload.index);
    return { success: result };
  }
  return { success: false };
}

/**
 * 获取引导状态
 */
function getGuideState(): {
  success: boolean;
  data?: {
    isPlaying: boolean;
    currentStepIndex: number;
    totalSteps: number;
    currentStep: any;
  };
} {
  if (guideSystem) {
    const state = guideSystem.getState();
    return {
      success: true,
      data: {
        isPlaying: state.isPlaying,
        currentStepIndex: state.currentStepIndex,
        totalSteps: guideSystem.getTotalSteps(),
        currentStep: guideSystem.getCurrentStep(),
      },
    };
  }
  return {
    success: true,
    data: {
      isPlaying: false,
      currentStepIndex: 0,
      totalSteps: 0,
      currentStep: null,
    },
  };
}

/**
 * 清理资源
 */
function cleanup(): void {
  if (guideSystem) {
    guideSystem.destroy();
    guideSystem = null;
  }
  if (ttsController) {
    ttsController.destroy();
    ttsController = null;
  }
}

/**
 * 初始化 TTS 控制器
 */
function initTTS(settings?: Partial<TTSSettings>): void {
  if (ttsController) {
    ttsController.destroy();
  }

  const ttsSettings: TTSSettings = {
    ...defaultTTSSettings,
    ...settings,
  };

  ttsController = createTTSController(ttsSettings, {
    onStart: () => {
      browser.runtime.sendMessage({
        type: 'TTS_STARTED',
      });
    },
    onEnd: () => {
      browser.runtime.sendMessage({
        type: 'TTS_ENDED',
      });
    },
    onError: (error) => {
      browser.runtime.sendMessage({
        type: 'TTS_ERROR',
        payload: { error: error.message },
      });
    },
  });
}

/**
 * 切换 TTS 启用状态
 */
function toggleTTS(payload: { enabled: boolean }): { success: boolean } {
  if (!ttsController) {
    initTTS({ enabled: payload.enabled });
  } else {
    ttsController.setEnabled(payload.enabled);
  }
  return { success: true };
}

/**
 * 朗读文本
 */
async function speakText(payload: { text: string }): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ttsController) {
      initTTS({ enabled: true });
    }

    if (ttsController) {
      await ttsController.speak(payload.text);
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * 停止 TTS
 */
function stopTTS(): { success: boolean } {
  if (ttsController) {
    ttsController.stop();
  }
  return { success: true };
}

/**
 * 获取可用的 TTS 语音列表
 */
async function getTTSVoices(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    if (!ttsController) {
      initTTS();
    }

    const voices = await ttsController?.getVoices() ?? [];
    return { success: true, data: voices };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
