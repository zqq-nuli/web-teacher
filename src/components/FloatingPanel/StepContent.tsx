import React from 'react';
import { t } from '@/utils/i18n';
import type { LessonStep } from '@/types';

interface StepContentProps {
  step: LessonStep | null;
  currentIndex: number;
  totalSteps: number;
}

/**
 * 步骤内容显示组件
 */
export function StepContent({ step, currentIndex, totalSteps }: StepContentProps) {
  if (!step) {
    return (
      <div className="wt-step-content wt-step-empty">
        <p>{t('panel_empty_content')}</p>
      </div>
    );
  }

  return (
    <div className="wt-step-content">
      <div className="wt-step-header">
        <span className="wt-step-badge">
          {currentIndex + 1} / {totalSteps}
        </span>
        <h3 className="wt-step-title">{step.title}</h3>
      </div>
      <div className="wt-step-body">
        <p className="wt-step-text">{step.content}</p>
      </div>
    </div>
  );
}

export default StepContent;
