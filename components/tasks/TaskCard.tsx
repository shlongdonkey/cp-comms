'use client';

import { useState, useEffect } from 'react';
import SwipeAction from '@/components/ui/SwipeAction';
import { formatInitials, isTaskStale } from '@/lib/utils';
import type { Task } from '@/lib/types';

interface TaskCardProps {
    task: Task;
    onStart?: (taskId: string) => void;
    onPause?: (taskId: string) => void;
    onResume?: (taskId: string) => void;
    onComplete?: (taskId: string) => void;
    onInfoClick?: (task: Task) => void;
    loading?: boolean;
}

const STATE_LABELS: Record<string, string> = {
    requested: 'Requested',
    in_progress: 'In Progress',
    paused: 'Paused',
    completed: 'Completed',
    rejected: 'Rejected',
};

export default function TaskCard({
    task,
    onStart,
    onPause,
    onResume,
    onComplete,
    onInfoClick,
    loading,
}: TaskCardProps) {
    const [isStale, setIsStale] = useState(false);

    // Check for stale status (>2 hours in progress)
    useEffect(() => {
        if (task.state !== 'in_progress') {
            setIsStale(false);
            return;
        }

        const checkStale = () => {
            setIsStale(isTaskStale(task.state_changed_at));
        };

        checkStale();
        const interval = setInterval(checkStale, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [task.state, task.state_changed_at]);

    const renderActions = () => {
        switch (task.state) {
            case 'requested':
                return (
                    <button
                        className="btn btn-success"
                        onClick={() => onStart?.(task.id)}
                        disabled={loading}
                    >
                        {loading ? <span className="spinner" /> : 'Start'}
                    </button>
                );
            case 'in_progress':
                return (
                    <>
                        <button
                            className="btn btn-warning"
                            onClick={() => onPause?.(task.id)}
                            disabled={loading}
                        >
                            {loading ? <span className="spinner" /> : 'Pause'}
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={() => onComplete?.(task.id)}
                            disabled={loading}
                        >
                            {loading ? <span className="spinner" /> : 'Complete'}
                        </button>
                    </>
                );
            case 'paused':
                return (
                    <button
                        className="btn btn-primary"
                        onClick={() => onResume?.(task.id)}
                        disabled={loading}
                    >
                        {loading ? <span className="spinner" /> : 'Resume'}
                    </button>
                );
            default:
                return null;
        }
    };

    const deadlineDate = new Date(task.deadline);
    const isOverdue = deadlineDate < new Date() && task.state !== 'completed';

    return (
        <SwipeAction actions={renderActions()}>
            <div
                className={`task-card task-card--${task.state.replace('_', '-')} ${isStale ? 'task-card--stale' : ''}`}
                style={{ padding: 'var(--space-md)' }}
            >
                {/* Header */}
                <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-sm)' }}>
                    <div className="flex items-center gap-sm">
                        <span style={{
                            fontWeight: 700,
                            fontSize: '1.125rem',
                            color: 'var(--primary-blue-light)',
                        }}>
                            {formatInitials(task.signature)}
                        </span>
                        <span
                            className="text-xs"
                            style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                background: task.state === 'in_progress'
                                    ? 'var(--state-in-progress)'
                                    : task.state === 'paused'
                                        ? 'var(--state-paused)'
                                        : 'var(--state-requested)',
                                color: 'var(--bg-primary)',
                                fontWeight: 500,
                            }}
                        >
                            {STATE_LABELS[task.state]}
                        </span>
                        {isStale && (
                            <span
                                className="text-xs"
                                style={{
                                    color: 'var(--state-rejected)',
                                    fontWeight: 600,
                                }}
                            >
                                STALE
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-sm">
                        <span
                            className="text-xs"
                            style={{
                                color: isOverdue ? 'var(--state-rejected)' : 'var(--text-muted)',
                            }}
                        >
                            {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {task.state === 'rejected' && (
                            <button
                                className="info-btn"
                                onClick={() => onInfoClick?.(task)}
                                title="View rejection reason"
                            >
                                i
                            </button>
                        )}
                    </div>
                </div>

                {/* Description */}
                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                }}>
                    {task.description}
                </p>

                {/* Urgency Badge */}
                <div style={{ marginTop: 'var(--space-sm)' }}>
                    <span
                        className="text-xs"
                        style={{
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {task.urgency === 'now' ? '⚡ Now' :
                            task.urgency === '15min' ? '🕐 15 min' :
                                task.urgency === '1hour' ? '🕐 1 hour' : '📅 Today'}
                    </span>
                </div>

                {/* Swipe hint */}
                <div
                    className="text-xs"
                    style={{
                        position: 'absolute',
                        right: 'var(--space-md)',
                        bottom: 'var(--space-sm)',
                        color: 'var(--text-muted)',
                        opacity: 0.5,
                    }}
                >
                    ← Swipe for actions
                </div>
            </div>
        </SwipeAction>
    );
}
