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
    onReject?: (taskId: string) => void;
    onAssignCrown?: (taskId: string) => void;
    onAssignElectric?: (taskId: string) => void;
    onInfoClick?: (task: Task) => void;
    loading?: boolean;
    actionBusy?: string | null;
    viewMode?: 'office' | 'factory' | 'driver';
}

const STATE_LABELS: Record<string, string> = {
    requested: 'Requested',
    in_progress: 'Active',
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
    onReject,
    onAssignCrown,
    onAssignElectric,
    onInfoClick,
    loading,
    actionBusy,
    viewMode = 'office',
}: TaskCardProps) {
    const [isStale, setIsStale] = useState(false);

    useEffect(() => {
        if (task.state !== 'in_progress') {
            setIsStale(false);
            return;
        }
        const checkStale = () => setIsStale(isTaskStale(task.state_changed_at));
        checkStale();
        const interval = setInterval(checkStale, 60000);
        return () => clearInterval(interval);
    }, [task.state, task.state_changed_at]);

    const deadlineDate = new Date(task.deadline);
    const isOverdue = deadlineDate < new Date() && task.state !== 'completed';

    const renderActions = () => {
        const actions: JSX.Element[] = [];

        // Special actions for Office Unallocated
        if (viewMode === 'office' && !task.assigned_to && task.state === 'requested') {
            actions.push(
                <button
                    key="crown"
                    type="button"
                    className="btn"
                    onClick={(e) => {
                        console.log('TaskCard: Crown clicked');
                        e.stopPropagation();
                        onAssignCrown?.(task.id);
                    }}
                    disabled={loading || !!actionBusy}
                    style={{ background: '#FBBF24', color: '#000', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', minWidth: '95px' }}
                >
                    {actionBusy === 'crown' ? <div className="spinner" style={{ width: '14px', height: '14px', borderColor: '#000' }} /> : '👑 Crown'}
                </button>
            );
            actions.push(
                <button
                    key="electric"
                    type="button"
                    className="btn"
                    onClick={(e) => {
                        console.log('TaskCard: Electric clicked');
                        e.stopPropagation();
                        onAssignElectric?.(task.id);
                    }}
                    disabled={loading || !!actionBusy}
                    style={{ background: '#10B981', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', minWidth: '95px' }}
                >
                    {actionBusy === 'electric' ? <div className="spinner" style={{ width: '14px', height: '14px', borderColor: '#fff' }} /> : '⚡ Electric'}
                </button>
            );
            actions.push(
                <button
                    key="reject"
                    type="button"
                    className="btn btn-ghost"
                    onClick={(e) => {
                        console.log('TaskCard: Reject clicked');
                        e.stopPropagation();
                        onReject?.(task.id);
                    }}
                    disabled={loading || !!actionBusy}
                    style={{ border: '1px solid var(--state-rejected)', color: 'var(--state-rejected)', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                    {actionBusy === 'reject' ? <div className="spinner" style={{ width: '14px', height: '14px', borderColor: 'var(--state-rejected)' }} /> : 'Reject'}
                </button>
            );
            return actions;
        }

        // Actions for Office - Already Assigned but still Requested
        if (viewMode === 'office' && task.assigned_to && task.state === 'requested') {
            const isCrown = task.assigned_to === '61a7b659-a95f-4f2b-a6c0-ea4218f99b5b';
            actions.push(
                <button
                    key="swap"
                    type="button"
                    className="btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isCrown) onAssignElectric?.(task.id);
                        else onAssignCrown?.(task.id);
                    }}
                    disabled={loading || !!actionBusy}
                    style={{
                        background: isCrown ? '#10B981' : '#FBBF24',
                        color: isCrown ? '#fff' : '#000',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        minWidth: '120px'
                    }}
                >
                    {actionBusy === 'crown' || actionBusy === 'electric' ? <div className="spinner" style={{ width: '14px', height: '14px', borderColor: isCrown ? '#fff' : '#000' }} /> : `🔄 Swap to ${isCrown ? 'Electric' : 'Crown'}`}
                </button>
            );
            actions.push(
                <button
                    key="reject"
                    type="button"
                    className="btn btn-ghost"
                    onClick={(e) => {
                        e.stopPropagation();
                        onReject?.(task.id);
                    }}
                    disabled={loading || !!actionBusy}
                    style={{ border: '1px solid var(--state-rejected)', color: 'var(--state-rejected)', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                    {actionBusy === 'reject' ? <div className="spinner" style={{ width: '14px', height: '14px', borderColor: 'var(--state-rejected)' }} /> : 'Reject'}
                </button>
            );
            return actions;
        }

        // Only show state change buttons (Start, Pause, Resume, Complete) if NOT in office mode
        if (viewMode === 'office') {
            // Office can ONLY see Info or Re-assign/Reject for unstarted tasks. 
            // Once started, they just watch.
            return actions;
        }

        if (task.state === 'requested') {
            actions.push(
                <button key="start" className="btn btn-success" onClick={() => onStart?.(task.id)} disabled={loading || !!actionBusy}>
                    {actionBusy === 'start' ? <span className="spinner" /> : 'Start'}
                </button>
            );
            if (viewMode === 'factory') {
                actions.push(
                    <button key="reject" className="btn btn-ghost" onClick={() => onReject?.(task.id)} disabled={loading} style={{ border: '1px solid var(--state-rejected)', color: 'var(--state-rejected)' }}>
                        Reject
                    </button>
                );
            }
        } else if (task.state === 'in_progress') {
            actions.push(
                <button key="pause" className="btn btn-warning" onClick={() => onPause?.(task.id)} disabled={loading} style={{ background: '#FBBF24', color: '#000' }}>
                    Pause
                </button>
            );
            actions.push(
                <button key="complete" className="btn btn-success" onClick={() => onComplete?.(task.id)} disabled={loading}>
                    Complete
                </button>
            );
        } else if (task.state === 'paused') {
            actions.push(
                <button key="resume" className="btn btn-primary" onClick={() => onResume?.(task.id)} disabled={loading}>
                    Resume
                </button>
            );
        }
        return actions;
    };

    const creationTime = new Date(task.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // ULTIMATE Layout for Store Office
    if (viewMode === 'office') {
        return (
            <div
                className={`glass-panel task-card--${task.state.replace('_', '-')} ${isStale ? 'task-card--stale' : ''}`}
                style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 200px 240px',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    minHeight: '80px',
                    borderLeft: `8px solid ${isOverdue ? 'var(--state-rejected)' : (task.state === 'requested' ? 'var(--primary-blue-light)' : `var(--state-${task.state.replace('_', '-')})`)}`,
                    background: 'rgba(255, 255, 255, 0.03)',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-sm)'
                }}
            >
                {/* Time Display */}
                <div style={{ color: 'var(--text-muted)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {creationTime}
                </div>

                {/* Description - The Main Content */}
                <div style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.3 }}>
                    {task.description}
                </div>

                {/* Metadata Block */}
                <div className="flex items-center gap-lg" style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: 'var(--space-lg)', height: '40px' }}>
                    <div className="flex flex-col">
                        <span style={{ fontWeight: 800, color: 'var(--primary-blue-light)', fontSize: '1.1rem', lineHeight: 1 }}>{formatInitials(task.signature)}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>{task.urgency.toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isOverdue ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255,255,255,0.05)',
                            color: isOverdue ? 'var(--state-rejected)' : 'var(--text-secondary)'
                        }}>
                            {STATE_LABELS[task.state]}
                        </span>
                        {isOverdue && (
                            <span style={{ fontSize: '0.6rem', color: 'var(--state-rejected)', fontWeight: 800, marginTop: '2px' }}>OVERDUE</span>
                        )}
                    </div>
                </div>

                {/* Actions Block */}
                <div className="flex justify-end gap-sm" style={{ position: 'relative', zIndex: 2 }}>
                    {renderActions()}
                    {task.state === 'rejected' && (
                        <button className="info-btn" onClick={() => onInfoClick?.(task)}>i</button>
                    )}
                </div>

                {/* Pulse for active tasks */}
                {task.state === 'in_progress' && (
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, rgba(179, 226, 109, 0.03) 0%, transparent 100%)',
                        zIndex: 0,
                        pointerEvents: 'none'
                    }} />
                )}
            </div>
        );
    }

    // Standard Layout for Drivers/Factory (Card approach)
    const cardContent = (
        <div
            className={`glass-panel task-card--${task.state.replace('_', '-')} ${isStale ? 'task-card--stale' : ''}`}
            style={{
                padding: 'var(--space-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
                minHeight: '160px',
                borderLeft: `6px solid var(--state-${task.state.replace('_', '-')})`,
                background: 'rgba(255, 255, 255, 0.03)',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '16px'
            }}
        >
            {/* Header */}
            <div className="flex justify-between items-start" style={{ zIndex: 1, position: 'relative' }}>
                <div className="flex flex-col">
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary-blue-light)' }}>
                        {formatInitials(task.signature)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {creationTime}
                    </span>
                </div>

                <div className="flex flex-col items-end">
                    <span className="badge" style={{ background: `var(--state-${task.state.replace('_', '-')})`, color: '#000' }}>
                        {STATE_LABELS[task.state]}
                    </span>
                    {isOverdue && <span className="text-xs font-bold" style={{ color: 'var(--state-rejected)', marginTop: '4px' }}>OVERDUE</span>}
                </div>
            </div>

            {/* Description */}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 'var(--space-xs) 0', zIndex: 1, position: 'relative' }}>
                {task.description}
            </p>

            {/* Footer */}
            <div className="flex justify-between items-center mt-auto" style={{ zIndex: 1, position: 'relative' }}>
                <span className="text-xs" style={{ opacity: 0.5 }}>{task.urgency === 'now' ? '⚡ Now' : '🕐 ' + task.urgency}</span>
                {task.state === 'rejected' && <button className="info-btn" onClick={() => onInfoClick?.(task)}>i</button>}
            </div>
        </div>
    );

    return (
        <SwipeAction actions={renderActions()}>
            {cardContent}
        </SwipeAction>
    );
}
