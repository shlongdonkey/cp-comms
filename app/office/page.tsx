'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm from '@/components/tasks/TaskForm';
import RejectionModal from '@/components/tasks/RejectionModal';
import ToastContainer from '@/components/ui/ToastContainer';
import { useTaskStore, useUIStore, useAuthStore } from '@/lib/store';
import { connectSocket, subscribeToTasks, getSocket } from '@/lib/socket';
import type { Task, CreateTaskInput } from '@/lib/types';

export default function OfficePage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { tasks, setTasks, addTask, updateTask, removeTask, loading, setLoading } = useTaskStore();
    const { addToast, isRejectionModalOpen, selectedTaskForRejection, openRejectionModal, closeRejectionModal } = useUIStore();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Fetch initial tasks
    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/tasks');
                if (res.ok) {
                    const data = await res.json();
                    setTasks(data);
                }
            } catch (error) {
                addToast({ type: 'error', message: 'Failed to load tasks' });
            }
        };

        fetchTasks();
    }, [setTasks, setLoading, addToast]);

    // Setup WebSocket connection
    useEffect(() => {
        const socket = connectSocket();
        subscribeToTasks();

        socket.on('task:created', (task) => {
            addTask(task);
        });

        socket.on('task:updated', (task) => {
            updateTask(task);
        });

        socket.on('task:deleted', (taskId) => {
            removeTask(taskId);
        });

        return () => {
            socket.off('task:created');
            socket.off('task:updated');
            socket.off('task:deleted');
        };
    }, [addTask, updateTask, removeTask]);

    // Create task handler
    const handleCreateTask = async (input: CreateTaskInput) => {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });

        if (!res.ok) {
            throw new Error('Failed to create task');
        }

        addToast({ type: 'success', message: 'Task created successfully' });
    };

    // Task action handlers
    const handleTaskAction = async (
        taskId: string,
        action: 'start' | 'pause' | 'resume' | 'complete'
    ) => {
        setActionLoading(taskId);

        const stateMap = {
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

            if (!res.ok) {
                throw new Error('Action failed');
            }

            addToast({
                type: 'success',
                message: action === 'complete'
                    ? 'Task completed and archived'
                    : `Task ${action}ed`,
            });
        } catch (error) {
            addToast({ type: 'error', message: `Failed to ${action} task` });
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogoClick = () => {
        // Return to dashboard (session persists)
        router.push('/office');
    };

    return (
        <RouteGuard allowedRoles={['office']}>
            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
                {/* Header */}
                <header
                    style={{
                        background: 'var(--primary-blue)',
                        padding: 'var(--space-md) var(--space-lg)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                    }}
                >
                    <button
                        onClick={handleLogoClick}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                        }}
                    >
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                            CP
                        </span>
                        <span style={{ color: 'var(--accent-green)', fontWeight: 500 }}>
                            Comms
                        </span>
                    </button>

                    <div className="flex items-center gap-md">
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                            {user?.display_name || 'Office'}
                        </span>
                        <a
                            href="/chat/global"
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                padding: 'var(--space-sm) var(--space-md)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                fontSize: '0.875rem',
                            }}
                        >
                            💬 Chat
                        </a>
                    </div>
                </header>

                {/* Main Content */}
                <main
                    style={{
                        maxWidth: '800px',
                        margin: '0 auto',
                        padding: 'var(--space-lg)',
                    }}
                >
                    {/* Task Creation Form */}
                    <TaskForm onSubmit={handleCreateTask} loading={loading} />

                    {/* Task List */}
                    <div style={{ marginTop: 'var(--space-xl)' }}>
                        <h2 style={{ marginBottom: 'var(--space-md)' }}>
                            Active Requests
                            <span
                                style={{
                                    marginLeft: 'var(--space-sm)',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                ({tasks.length})
                            </span>
                        </h2>

                        {tasks.length === 0 ? (
                            <div
                                className="card text-center"
                                style={{ padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}
                            >
                                <p>No active requests</p>
                                <p className="text-sm" style={{ marginTop: 'var(--space-sm)' }}>
                                    Create a new request above
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-md">
                                {tasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onStart={(id) => handleTaskAction(id, 'start')}
                                        onPause={(id) => handleTaskAction(id, 'pause')}
                                        onResume={(id) => handleTaskAction(id, 'resume')}
                                        onComplete={(id) => handleTaskAction(id, 'complete')}
                                        onInfoClick={openRejectionModal}
                                        loading={actionLoading === task.id}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* Rejection Modal */}
                <RejectionModal
                    task={selectedTaskForRejection}
                    isOpen={isRejectionModalOpen}
                    onClose={closeRejectionModal}
                />

                {/* Toast Notifications */}
                <ToastContainer />
            </div>
        </RouteGuard>
    );
}
