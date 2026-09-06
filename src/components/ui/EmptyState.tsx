import React from 'react';
import { Layers } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Layers className="h-8 w-8 text-slate-500" />,
  title,
  description,
  actionLabel,
  onAction,
  action,
  children,
  className = '',
}) => {
  const actionNode = action || children;

  return (
    <div className={`rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="mb-3 rounded-full bg-slate-900 p-3 border border-slate-800 text-slate-400">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      <p className="mt-1 text-xs text-slate-400 max-w-sm leading-normal">
        {description}
      </p>
      {actionNode ? (
        <div className="mt-4">{actionNode}</div>
      ) : actionLabel && onAction ? (
        <Button onClick={onAction} variant="secondary" size="sm" className="mt-4">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ className?: string; height?: number | string }> = ({
  className = '',
  height = '1rem',
}) => {
  return (
    <div
      className={`animate-pulse rounded bg-slate-800/60 ${className}`}
      style={{ height }}
    />
  );
};