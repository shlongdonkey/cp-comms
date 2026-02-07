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

        // Consolidated Office Actions for all Active States
        if (viewMode === 'office') {
            if (task.state === 'completed' || task.state === 'rejected') return actions;

            const driverId = task.assigned_to || (task as any).assignedTo || (task as any).userId || (task as any).driverId;
            const isAssigned = !!driverId && String(driverId).trim() !== '';

            if (!isAssigned) {
                // Triage actions for Unallocated (SVG Icons, Solid Backgrounds)
                actions.push(
                    <button
                        key="crown"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAssignCrown?.(task.id); }}
                        disabled={loading || !!actionBusy}
                        style={{
                            background: '#FBBF24', borderRadius: '6px', border: 'none',
                            padding: '0 12px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '6px', cursor: 'pointer', color: '#000', minWidth: '95px'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="black"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" /></svg>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Crown</span>
                    </button>
                );
                actions.push(
                    <button
                        key="electric"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAssignElectric?.(task.id); }}
                        disabled={loading || !!actionBusy}
                        style={{
                            background: '#10B981', borderRadius: '6px', border: 'none',
                            padding: '0 12px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '6px', cursor: 'pointer', color: '#FFF', minWidth: '95px'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M7 2V13H10V22L17 10H13L17 2H7Z" /></svg>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Electric</span>
                    </button>
                );
                actions.push(
                    <button
                        key="reject"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onReject?.(task.id); }}
                        disabled={loading || !!actionBusy}
                        style={{
                            background: 'transparent', borderRadius: '6px', border: '1px solid var(--state-rejected)',
                            padding: '0 12px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '8px', cursor: 'pointer', color: 'var(--state-rejected)', minWidth: '100%'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                        <span style={{ fontSize: '1rem', fontWeight: 700 }}>Reject</span>
                    </button>
                );
            } else {
                // Management actions for Allocated (Full-height Slab buttons for Swipe)
                const isCrown = driverId === '61a7b659-a95f-4f2b-a6c0-ea4218f99b5b';
                actions.push(
                    <button
                        key="swap"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (isCrown) onAssignElectric?.(task.id); else onAssignCrown?.(task.id); }}
                        disabled={loading || !!actionBusy}
                        style={{
                            flex: 1, height: '100%', minWidth: '120px',
                            background: isCrown ? '#10B981' : '#FBBF24', border: 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '4px', cursor: 'pointer', color: isCrown ? '#FFF' : '#000', margin: 0
                        }}
                    >
                        {isCrown ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M7 2V13H10V22L17 10H13L17 2H7Z" /></svg>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="black"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" /></svg>
                        )}
                        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>SWAP</span>
                    </button>
                );
                actions.push(
                    <button
                        key="reject"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onReject?.(task.id); }}
                        disabled={loading || !!actionBusy}
                        style={{
                            flex: 1, height: '100%', minWidth: '120px',
                            background: '#EF4444', border: 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '4px', cursor: 'pointer', color: 'white', margin: 0
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>REJECT</span>
                    </button>
                );
            }
            return actions;
        }

        // Only show state change buttons (Start, Pause, Resume, Complete) if NOT in office mode

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
        const driverId = task.assigned_to || (task as any).assignedTo || (task as any).userId || (task as any).driverId;
        const isUnallocated = !driverId || driverId === '';

        const mainCard = (
            <div style={{
                flex: 1,
                background: '#0f172a', // Solid dark navy color to mask swiped actions
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                minHeight: '84px',
                height: 'auto',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)'
            }}>
                {/* Left Part: Category & Description */}
                <div style={{ flex: 1, padding: '12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-blue-light)', marginBottom: '4px' }}>
                        {task.category?.toUpperCase() || 'TASK'}
                    </div>
                    <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 400, lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {task.description}
                    </div>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', background: 'var(--glass-border)', height: 'auto', alignSelf: 'stretch', margin: '10px 0' }} />

                {/* Right Part: Status & Meta */}
                <div style={{ width: '140px', padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'center' }}>
                        {STATE_LABELS[task.state]}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '1rem', alignItems: 'center', marginTop: 'auto' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary-blue-light)', opacity: 0.8 }}>{formatInitials(task.signature)}</span>
                        <span style={{ fontWeight: 900, color: 'var(--text-primary)' }}>{task.urgency === 'now' ? 'Now' : task.urgency}</span>
                    </div>
                </div>
            </div>
        );

        if (isUnallocated && task.state === 'requested') {
            const triageActions = renderActions();
            return (
                <div className="flex items-center gap-md w-full" style={{ marginBottom: 'var(--space-xs)' }}>
                    <div style={{ minWidth: '75px', color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500, textAlign: 'center' }}>
                        {creationTime}
                    </div>
                    {mainCard}
                    {/* Direct cluster for Unallocated Triage - Reverted back to high-fidelity horizontal */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '190px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {triageActions.find(a => a.key === 'crown')}
                            {triageActions.find(a => a.key === 'electric')}
                        </div>
                        {triageActions.find(a => a.key === 'reject')}
                    </div>
                </div>
            );
        }

        // Allocated: Cleaner view, only the Card swipes (not the time)
        return (
            <div className="flex items-center gap-md w-full" style={{ marginBottom: 'var(--space-xs)' }}>
                {/* Fixed Time Column */}
                <div style={{ minWidth: '75px', color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500, textAlign: 'center' }}>
                    {creationTime}
                </div>
                {/* Swipable Card */}
                <div style={{ flex: 1 }}>
                    <SwipeAction actions={renderActions()}>
                        {mainCard}
                    </SwipeAction>
                </div>
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
                        {creationTime} • <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{task.category?.toUpperCase() || 'TASK'}</span>
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
                <span className="text-xs" style={{ opacity: 0.5 }}>{task.urgency === 'now' ? 'Now' : task.urgency}</span>
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
