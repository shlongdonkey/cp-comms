'use client';

import { useEffect, useState } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm from '@/components/tasks/TaskForm';
import RejectionModal from '@/components/tasks/RejectionModal';
import ToastContainer from '@/components/ui/ToastContainer';
import { useTaskStore, useUIStore, useAuthStore } from '@/lib/store';
import { connectSocket, subscribeToTasks } from '@/lib/socket';
import type { Task, CreateTaskInput } from '@/lib/types';

export default function StoreOfficePage() {
    const { user } = useAuthStore();
    const { tasks, setTasks, addTask, updateTask, removeTask, loading, setLoading } = useTaskStore();
    const { addToast, isRejectionModalOpen, selectedTaskForRejection, openRejectionModal, closeRejectionModal } = useUIStore();

    // UI State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [driverRoles, setDriverRoles] = useState<Record<string, string>>({
        '61a7b659-a95f-4f2b-a6c0-ea4218f99b5b': 'driver_crown',
        'fba7e904-0ed3-4a92-b637-9d64c91354ab': 'driver_electric'
    });

    // Fetch initial tasks and driver mapping
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch tasks
                const taskRes = await fetch('/api/tasks');
                if (taskRes.ok) {
                    const data = await taskRes.json();
                    setTasks(data);
                }
            } catch (error) {
                addToast({ type: 'error', message: 'Failed to sync with server' });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [setTasks, setLoading, addToast]);

    // Setup WebSocket connection
    useEffect(() => {
        const socket = connectSocket();
        subscribeToTasks();

        socket.on('task:created', (task: Task) => addTask(task));
        socket.on('task:updated', (task: Task) => updateTask(task));
        socket.on('task:deleted', (taskId: string) => removeTask(taskId));

        return () => {
            socket.off('task:created');
            socket.off('task:updated');
            socket.off('task:deleted');
        };
    }, [addTask, updateTask, removeTask]);

    const handleCreateTask = async (input: CreateTaskInput) => {
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });
            if (!res.ok) throw new Error();
            setIsCreateModalOpen(false);
            addToast({ type: 'success', message: 'Request created' });
        } catch {
            addToast({ type: 'error', message: 'Failed to create request' });
        }
    };

    const handleTaskAction = async (taskId: string, action: string) => {
        setActionLoading(`${taskId}:${action}`);
        const stateMap: Record<string, string> = {
            start: 'in_progress',
            pause: 'paused',
            resume: 'in_progress',
            complete: 'completed',
        };

        try {
            const res = await fetch(`/api/tasks/${taskId}/state`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: stateMap[action] }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Failed to ${action} task`);
        } catch (error: any) {
            addToast({ type: 'error', message: error.message });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (taskId: string, reason: string) => {
        setActionLoading(`${taskId}:reject`);
        try {
            const res = await fetch(`/api/tasks/${taskId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to reject task');
            closeRejectionModal();
            addToast({ type: 'success', message: 'Task rejected' });
        } catch (error: any) {
            addToast({ type: 'error', message: error.message });
        } finally {
            setActionLoading(null);
        }
    };

    // Grouping Logic - Strengthened for reliability
    const unallocated = tasks.filter(t => {
        const isUnallocated = !t.assigned_to && t.state !== 'completed' && t.state !== 'rejected';
        return isUnallocated;
    });

    // Group based on driver role mapping - Stronger checks
    const crownAllocated = tasks.filter(t => {
        if (!t.assigned_to || t.state === 'completed' || t.state === 'rejected') return false;
        return t.assigned_to === '61a7b659-a95f-4f2b-a6c0-ea4218f99b5b' || driverRoles[t.assigned_to] === 'driver_crown';
    });

    const electricAllocated = tasks.filter(t => {
        if (!t.assigned_to || t.state === 'completed' || t.state === 'rejected') return false;
        return t.assigned_to === 'fba7e904-0ed3-4a92-b637-9d64c91354ab' || driverRoles[t.assigned_to] === 'driver_electric';
    });

    const handleAssign = async (taskId: string, userId: string) => {
        const action = userId === '61a7b659-a95f-4f2b-a6c0-ea4218f99b5b' ? 'crown' : 'electric';
        console.log(`[STORE-OFFICE] Assigning task ${taskId} to ${fleetName(userId)}...`);
        setActionLoading(`${taskId}:${action}`);

        try {
            const res = await fetch(`/api/tasks/${taskId}/assign`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to allocate task');
            }

            console.log('[STORE-OFFICE] Assign successful:', data);

            // Manual Forced Update to Store
            updateTask(data);

            addToast({ type: 'success', message: `Task allocated to ${fleetName(userId)} fleet` });
        } catch (error: any) {
            console.error('[STORE-OFFICE] Assign failed:', error);
            addToast({ type: 'error', message: error.message });
        } finally {
            setActionLoading(null);
        }
    };

    function fleetName(userId: string) {
        return userId === '61a7b659-a95f-4f2b-a6c0-ea4218f99b5b' ? 'Crown' : 'Electric';
    }

    const renderTaskSection = (title: string, taskList: Task[], icon: string, accentColor: string) => (
        <section style={{ marginBottom: 'var(--space-md)' }}>
            <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--space-md)', color: accentColor }}>
                <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {title} ({taskList.length})
                </h2>
            </div>
            {taskList.length === 0 ? (
                <div className="glass-panel text-center p-xl" style={{ borderStyle: 'dashed', opacity: 0.6, minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>No active tasks in this section</p>
                </div>
            ) : (
                <div className="flex flex-col gap-sm">
                    {taskList.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            loading={actionLoading?.startsWith(task.id)}
                            actionBusy={actionLoading?.startsWith(task.id) ? actionLoading.split(':')[1] : null}
                            onStart={() => handleTaskAction(task.id, 'start')}
                            onPause={() => handleTaskAction(task.id, 'pause')}
                            onResume={() => handleTaskAction(task.id, 'resume')}
                            onComplete={() => handleTaskAction(task.id, 'complete')}
                            onReject={(taskId) => {
                                console.log('Reject clicked for task:', taskId);
                                const t = tasks.find(item => item.id === taskId);
                                if (t) openRejectionModal(t);
                            }}
                            onAssignCrown={(taskId) => {
                                console.log('Assign Crown clicked for task:', taskId);
                                handleAssign(taskId, '61a7b659-a95f-4f2b-a6c0-ea4218f99b5b');
                            }}
                            onAssignElectric={(taskId) => {
                                console.log('Assign Electric clicked for task:', taskId);
                                handleAssign(taskId, 'fba7e904-0ed3-4a92-b637-9d64c91354ab');
                            }}
                            onInfoClick={(taskObj) => {
                                console.log('Info clicked for task object:', taskObj.id);
                                openRejectionModal(taskObj);
                            }}
                            viewMode="office"
                        />
                    ))}
                </div>
            )}
        </section>
    );

    return (
        <RouteGuard allowedRoles={['store_office']}>
            <main className="min-h-screen pb-2xl">
                {/* Header with Nav Action */}
                <header className="sticky top-0 z-50 px-md py-sm" style={{
                    background: 'rgba(11, 15, 26, 0.7)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <div className="container mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-md">
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'var(--grad-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem',
                                color: 'white',
                                boxShadow: '0 4px 12px rgba(45, 98, 169, 0.3)'
                            }}>
                                CP
                            </div>
                            <div>
                                <h1 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    margin: 0,
                                    color: 'white',
                                    letterSpacing: '-0.02em'
                                }}>
                                    Store <span style={{ color: 'var(--accent-green)' }}>Office</span>
                                </h1>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    Dashboard • {user?.display_name || 'Admin'}
                                </span>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={() => setIsCreateModalOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <span style={{ fontSize: '1.2rem', fontWeight: 300 }}>+</span> New Request
                        </button>
                    </div>
                </header>

                <div className="container mx-auto p-lg">
                    {loading && tasks.length === 0 ? (
                        <div className="flex justify-center p-2xl"><div className="spinner" /></div>
                    ) : (
                        <div className="flex flex-col gap-xl">
                            <div className="glass-panel p-md">
                                {renderTaskSection('Unallocated Requests', unallocated, '📋', 'var(--text-secondary)')}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
                                <div className="glass-panel p-md">
                                    {renderTaskSection('Crown Fleet', crownAllocated, '🚜', 'var(--accent-green)')}
                                </div>
                                <div className="glass-panel p-md">
                                    {renderTaskSection('Electric Fleet', electricAllocated, '⚡', 'var(--primary-blue-light)')}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <ToastContainer />
            </main>

            {/* Create Request Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-md" style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)' }} onClick={() => setIsCreateModalOpen(false)}>
                    <div
                        className="glass-panel w-full"
                        style={{ maxWidth: '500px', padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden', boxShadow: '0 0 100px rgba(0,0,0,0.5)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Decorative gradient blob */}
                        <div style={{
                            position: 'absolute',
                            top: '-20%',
                            right: '-20%',
                            width: '200px',
                            height: '200px',
                            background: 'radial-gradient(circle, rgba(45, 98, 169, 0.15) 0%, transparent 70%)',
                            zIndex: 0
                        }} />

                        <div className="flex justify-between items-center mb-lg" style={{ position: 'relative', zIndex: 1 }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>New <span style={{ color: 'var(--primary-blue-light)' }}>Request</span></h3>
                            <button className="btn btn-ghost" onClick={() => setIsCreateModalOpen(false)} style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}>✕</button>
                        </div>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <TaskForm onSubmit={handleCreateTask} loading={loading} />
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Input Modal */}
            {isRejectionModalOpen && selectedTaskForRejection && selectedTaskForRejection.state !== 'rejected' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-md" style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)' }}>
                    <div className="glass-panel w-full" style={{ maxWidth: '450px', padding: 'var(--space-lg)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
                        <h3 style={{ color: 'var(--state-rejected)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Reject Request</h3>
                        <p className="text-sm mb-lg" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Please provide a detailed reason for rejecting this request from <strong>{formatInitials(selectedTaskForRejection.signature)}</strong>. This will be visible to the floor staff.
                        </p>
                        <textarea
                            id="rejection-reason"
                            className="input w-full mb-lg"
                            rows={4}
                            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white' }}
                            placeholder="e.g., Load exceeds fork capacity, Floor area obstructed..."
                        />
                        <div className="flex gap-md">
                            <button className="btn btn-ghost flex-1" onClick={closeRejectionModal}>Cancel</button>
                            <button
                                className="btn btn-primary flex-1"
                                style={{ background: 'var(--state-rejected)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                disabled={!!actionLoading}
                                onClick={() => {
                                    const reason = (document.getElementById('rejection-reason') as HTMLTextAreaElement).value;
                                    if (reason.trim()) handleReject(selectedTaskForRejection.id, reason);
                                }}
                            >
                                {actionLoading === `${selectedTaskForRejection.id}:reject` ? <div className="spinner" style={{ width: '16px', height: '16px', borderColor: 'white' }} /> : 'Submit Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Rejection Details Modal */}
            {isRejectionModalOpen && selectedTaskForRejection && selectedTaskForRejection.state === 'rejected' && (
                <RejectionModal
                    task={selectedTaskForRejection}
                    isOpen={isRejectionModalOpen}
                    onClose={closeRejectionModal}
                />
            )}
        </RouteGuard>
    );
}

// Helper to format initials locally
function formatInitials(input: string) {
    const clean = input.replace(/[.\s]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    return `${clean[0]}.${clean[1]}`;
}
