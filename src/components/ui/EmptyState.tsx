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
    <div className={`rounded-xl border border-dashed border-slate-300 bg-white/70 p-8 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="mb-3 rounded-full bg-slate-100 p-3 border border-slate-200 text-slate-500">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 text-xs text-slate-500 max-w-sm leading-normal">
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
      className={`animate-pulse rounded bg-slate-200/80 ${className}`}
      style={{ height }}
    />
  );
};