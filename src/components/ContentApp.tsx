import React, { useState, useCallback, useEffect } from 'react';
import { FloatingPanel } from './FloatingPanel';
import type { LessonPlan, LessonStep } from '@/types';
import { logger } from '@/utils/logger';

interface ContentAppProps {
  initialLessonPlan?: LessonPlan | null;
}

/**
 * Content Script 主应用
 */
export function ContentApp({ initialLessonPlan = null }: ContentAppProps) {
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(initialLessonPlan);
  const [currentStep, setCurrentStep] = useState<LessonStep | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // 监听来自 background 的消息
  useEffect(() => {
    const handleMessage = (message: any) => {
      logger.debug('ContentApp 收到消息', message);

      switch (message.type) {
        case 'SHOW_PANEL':
          setLessonPlan(message.payload?.lessonPlan || null);
          setIsVisible(true);
          setIsPlaying(true);
          break;

        case 'HIDE_PANEL':
          setIsVisible(false);
          setIsPlaying(false);
          break;

        case 'UPDATE_STEP':
          setCurrentStepIndex(message.payload?.index ?? 0);
          setCurrentStep(message.payload?.step ?? null);
          break;

        case 'GUIDE_COMPLETED':
          setIsPlaying(false);
          break;
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // 更新当前步骤
  useEffect(() => {
    if (lessonPlan && lessonPlan.steps[currentStepIndex]) {
      setCurrentStep(lessonPlan.steps[currentStepIndex]);
    }
  }, [lessonPlan, currentStepIndex]);

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      browser.runtime.sendMessage({ type: 'PREV_STEP' });
    }
  }, [currentStepIndex]);

  const handleNext = useCallback(() => {
    if (lessonPlan && currentStepIndex < lessonPlan.steps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      browser.runtime.sendMessage({ type: 'NEXT_STEP' });
    }
  }, [currentStepIndex, lessonPlan]);

  const handlePlayPause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      browser.runtime.sendMessage({ type: 'RESUME_GUIDE' });
    } else {
      setIsPaused(true);
      browser.runtime.sendMessage({ type: 'PAUSE_GUIDE' });
    }
  }, [isPaused]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setIsVisible(false);
    browser.runtime.sendMessage({ type: 'STOP_GUIDE' });
  }, []);

  const handleGoToStep = useCallback((index: number) => {
    setCurrentStepIndex(index);
    browser.runtime.sendMessage({ type: 'GO_TO_STEP', payload: { index } });
  }, []);

  const handleToggleTTS = useCallback(() => {
    setIsTTSEnabled(!isTTSEnabled);
    browser.runtime.sendMessage({
      type: 'TOGGLE_TTS',
      payload: { enabled: !isTTSEnabled },
    });
  }, [isTTSEnabled]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    browser.runtime.sendMessage({ type: 'STOP_GUIDE' });
  }, []);

  if (!isVisible || !lessonPlan) {
    return null;
  }

  return (
    <FloatingPanel
      lessonPlan={lessonPlan}
      currentStep={currentStep}
      currentStepIndex={currentStepIndex}
      isPlaying={isPlaying}
      isPaused={isPaused}
      isTTSEnabled={isTTSEnabled}
      isTTSSpeaking={isTTSSpeaking}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onPlayPause={handlePlayPause}
      onStop={handleStop}
      onGoToStep={handleGoToStep}
      onToggleTTS={handleToggleTTS}
      onClose={handleClose}
    />
  );
}

export default ContentApp;
