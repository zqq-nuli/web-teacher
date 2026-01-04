import React from 'react';
import { t } from '@/utils/i18n';

interface ProgressBarProps {
  current: number;
  total: number;
  onStepClick?: (index: number) => void;
}

/**
 * 进度条组件
 */
export function ProgressBar({ current, total, onStepClick }: ProgressBarProps) {
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0;

  return (
    <div className="wt-progress">
      <div className="wt-progress-bar">
        <div
          className="wt-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      {total <= 10 && (
        <div className="wt-progress-dots">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              className={`wt-progress-dot ${i === current ? 'wt-progress-dot-active' : ''} ${i < current ? 'wt-progress-dot-completed' : ''}`}
              onClick={() => onStepClick?.(i)}
              title={t('progress_step', String(i + 1))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
