import type { Config, PopoverDOM } from 'driver.js';
import { t } from '@/utils/i18n';

/**
 * Driver.js 主题配置
 */
export const DRIVER_THEME = {
  // 遮罩层样式
  overlayColor: 'rgba(0, 0, 0, 0.75)',
  overlayOpacity: 0.75,

  // 高亮区域样式
  stagePadding: 10,
  stageRadius: 8,

  // Popover 样式
  popoverClass: 'web-teacher-popover',
} as const;

/**
 * 自定义 Popover 样式（注入到页面）
 */
export const DRIVER_CUSTOM_STYLES = `
  .driver-popover.web-teacher-popover {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }

  .driver-popover.web-teacher-popover .driver-popover-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: white;
  }

  .driver-popover.web-teacher-popover .driver-popover-description {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
  }

  .driver-popover.web-teacher-popover .driver-popover-progress-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 12px;
  }

  .driver-popover.web-teacher-popover .driver-popover-navigation-btns {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .driver-popover.web-teacher-popover .driver-popover-prev-btn,
  .driver-popover.web-teacher-popover .driver-popover-next-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .driver-popover.web-teacher-popover .driver-popover-prev-btn:hover,
  .driver-popover.web-teacher-popover .driver-popover-next-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .driver-popover.web-teacher-popover .driver-popover-close-btn {
    color: rgba(255, 255, 255, 0.7);
    font-size: 20px;
    transition: color 0.2s ease;
  }

  .driver-popover.web-teacher-popover .driver-popover-close-btn:hover {
    color: white;
  }

  .driver-popover.web-teacher-popover .driver-popover-arrow {
    border-color: transparent;
  }

  .driver-popover.web-teacher-popover .driver-popover-arrow-side-left {
    border-right-color: #667eea;
  }

  .driver-popover.web-teacher-popover .driver-popover-arrow-side-right {
    border-left-color: #764ba2;
  }

  .driver-popover.web-teacher-popover .driver-popover-arrow-side-top {
    border-bottom-color: #667eea;
  }

  .driver-popover.web-teacher-popover .driver-popover-arrow-side-bottom {
    border-top-color: #764ba2;
  }

  /* 高亮元素动画 */
  .driver-active-element {
    animation: web-teacher-pulse 2s infinite;
  }

  @keyframes web-teacher-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
    }
    50% {
      box-shadow: 0 0 0 10px rgba(102, 126, 234, 0);
    }
  }
`;

/**
 * 获取 Driver.js 基础配置
 */
export function getDriverConfig(options?: Partial<Config>): Config {
  return {
    // 显示控制
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],

    // 样式
    overlayColor: DRIVER_THEME.overlayColor,
    stagePadding: DRIVER_THEME.stagePadding,
    stageRadius: DRIVER_THEME.stageRadius,
    popoverClass: DRIVER_THEME.popoverClass,

    // 动画
    animate: true,
    smoothScroll: true,

    // 交互
    allowClose: true,
    disableActiveInteraction: false,

    // 按钮文本
    nextBtnText: t('guide_next'),
    prevBtnText: t('guide_prev'),
    doneBtnText: t('guide_done'),
    progressText: t('guide_progress', ['{{current}}', '{{total}}']),

    // 覆盖自定义选项
    ...options,
  };
}

/**
 * 注入自定义样式到页面
 */
export function injectDriverStyles(): void {
  const styleId = 'web-teacher-driver-styles';

  // 避免重复注入
  if (document.getElementById(styleId)) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = DRIVER_CUSTOM_STYLES;
  document.head.appendChild(styleElement);
}

/**
 * 移除注入的样式
 */
export function removeDriverStyles(): void {
  const styleElement = document.getElementById('web-teacher-driver-styles');
  if (styleElement) {
    styleElement.remove();
  }
}
