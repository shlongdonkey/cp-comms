'use client';

import { useEffect, useState } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm from '@/components/tasks/TaskForm';
import ToastContainer from '@/components/ui/ToastContainer';
import { useTaskStore, useUIStore, useAuthStore } from '@/lib/store';
import { connectSocket, subscribeToTasks } from '@/lib/socket';
import type { Task, CreateTaskInput } from '@/lib/types';

export default function FactoryOfficePage() {
    const { user } = useAuthStore();
    const { tasks, setTasks, addTask, updateTask, removeTask, loading, setLoading } = useTaskStore();
    const { addToast } = useUIStore();
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
                } else {
                    addToast({ type: 'error', message: 'Failed to load tasks' });
                }
            } catch (error) {
                addToast({ type: 'error', message: 'Failed to load tasks' });
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
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
            addToast({ type: 'success', message: 'Request created' });
        } catch {
            addToast({ type: 'error', message: 'Failed to create request' });
        }
    };

    const handleTaskAction = async (taskId: string, action: string) => {
        setActionLoading(taskId);
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
            if (!res.ok) throw new Error();
        } catch {
            addToast({ type: 'error', message: `Failed to ${action} task` });
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <RouteGuard allowedRoles={['factory_office']}>
            <main className="min-h-screen pb-2xl">
                <header className="header sticky top-0 bg-glass z-10 p-md border-b">
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, var(--primary-blue) 0%, var(--accent-green) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        CP Comms • Factory Office {user?.display_name && <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-secondary)' }}>• {user.display_name}</span>}
                    </h1>
                </header>

                <div className="container mx-auto p-md mt-md grid grid-cols-1 lg:grid-cols-12 gap-xl">
                    <aside className="lg:col-span-4">
                        <TaskForm onSubmit={handleCreateTask} loading={loading} />
                    </aside>

                    <section className="lg:col-span-8">
                        <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-md)' }}>Active Requests</h2>
                        {loading ? (
                            <div className="flex justify-center p-2xl"><div className="spinner" /></div>
                        ) : tasks.length === 0 ? (
                            <div className="card text-center p-2xl" style={{ borderStyle: 'dashed' }}>
                                <p style={{ color: 'var(--text-muted)' }}>No active requests</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-md">
                                {tasks.filter(t => t.state !== 'completed' && t.state !== 'rejected').map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        loading={actionLoading === task.id}
                                        onStart={() => handleTaskAction(task.id, 'start')}
                                        onPause={() => handleTaskAction(task.id, 'pause')}
                                        onResume={() => handleTaskAction(task.id, 'resume')}
                                        onComplete={() => handleTaskAction(task.id, 'complete')}
                                        viewMode="office"
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
                <ToastContainer />
            </main>
        </RouteGuard>
    );
}
