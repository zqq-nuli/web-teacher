import React, { useState, useCallback, useEffect } from 'react';
import { useDraggable } from '@/hooks';
import { t } from '@/utils/i18n';
import { StepContent } from './StepContent';
import { ControlButtons } from './ControlButtons';
import { ProgressBar } from './ProgressBar';
import type { LessonStep, LessonPlan } from '@/types';
import './FloatingPanel.css';

interface FloatingPanelProps {
  lessonPlan: LessonPlan | null;
  currentStep: LessonStep | null;
  currentStepIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  isTTSEnabled: boolean;
  isTTSSpeaking: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  onGoToStep: (index: number) => void;
  onToggleTTS: () => void;
  onClose: () => void;
}

/**
 * 浮窗面板组件
 */
export function FloatingPanel({
  lessonPlan,
  currentStep,
  currentStepIndex,
  isPlaying,
  isPaused,
  isTTSEnabled,
  isTTSSpeaking,
  onPrevious,
  onNext,
  onPlayPause,
  onStop,
  onGoToStep,
  onToggleTTS,
  onClose,
}: FloatingPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const { position, isDragging, elementRef, handleMouseDown } = useDraggable({
    initialPosition: { x: window.innerWidth - 380, y: 20 },
  });

  const totalSteps = lessonPlan?.steps.length || 0;
  const canGoPrevious = currentStepIndex > 0;
  const canGoNext = currentStepIndex < totalSteps - 1;

  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
  }, [isMinimized]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在输入框中触发
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (canGoPrevious) onPrevious();
          break;
        case 'ArrowRight':
          if (canGoNext) onNext();
          break;
        case ' ':
          e.preventDefault();
          onPlayPause();
          break;
        case 'Escape':
          onStop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoPrevious, canGoNext, onPrevious, onNext, onPlayPause, onStop]);

  if (!lessonPlan) {
    return null;
  }

  return (
    <div
      ref={elementRef}
      className={`wt-floating-panel ${isMinimized ? 'wt-minimized' : ''} ${isDragging ? 'wt-dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* 标题栏 */}
      <div
        className="wt-panel-header"
        onMouseDown={handleMouseDown}
      >
        <div className="wt-panel-title">
          <span className="wt-panel-icon">📚</span>
          <span>{lessonPlan.title}</span>
        </div>
        <div className="wt-panel-actions">
          <button
            className="wt-btn wt-btn-icon wt-btn-small"
            onClick={handleMinimize}
            title={isMinimized ? t('panel_expand') : t('panel_minimize')}
          >
            {isMinimized ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M7 14l5-5 5 5H7z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M7 10l5 5 5-5H7z" />
              </svg>
            )}
          </button>
          <button
            className="wt-btn wt-btn-icon wt-btn-small"
            onClick={onClose}
            title={t('panel_close')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {!isMinimized && (
        <div className="wt-panel-body">
          {/* 步骤内容 */}
          <StepContent
            step={currentStep}
            currentIndex={currentStepIndex}
            totalSteps={totalSteps}
          />

          {/* 进度条 */}
          <ProgressBar
            current={currentStepIndex}
            total={totalSteps}
            onStepClick={onGoToStep}
          />

          {/* 控制按钮 */}
          <ControlButtons
            isPlaying={isPlaying}
            isPaused={isPaused}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            isTTSEnabled={isTTSEnabled}
            isTTSSpeaking={isTTSSpeaking}
            onPrevious={onPrevious}
            onNext={onNext}
            onPlayPause={onPlayPause}
            onStop={onStop}
            onToggleTTS={onToggleTTS}
          />
        </div>
      )}

      {/* 最小化状态提示 */}
      {isMinimized && (
        <div className="wt-panel-minimized-info">
          <span>{t('panel_step_info', [String(currentStepIndex + 1), String(totalSteps)])}</span>
        </div>
      )}
    </div>
  );
}

export default FloatingPanel;
