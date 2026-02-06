'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import TaskCard from '@/components/tasks/TaskCard';
import ToastContainer from '@/components/ui/ToastContainer';
import { useTaskStore, useUIStore, useAuthStore } from '@/lib/store';
import { connectSocket, subscribeToTasks } from '@/lib/socket';
import type { Task } from '@/lib/types';

export default function ElectricDriverPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { tasks, setTasks, addTask, updateTask, removeTask, loading, setLoading } = useTaskStore();
    const { addToast } = useUIStore();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filter tasks relevant to Electric drivers
    const filteredTasks = tasks.filter(task =>
        task.state === 'requested' ||
        task.state === 'in_progress' ||
        task.state === 'paused'
    );

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
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [setTasks, setLoading, addToast]);

    // Setup WebSocket connection on port 3001
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
                    ? 'Delivery completed! ⚡'
                    : `Task ${action}ed`,
            });
        } catch (error) {
            addToast({ type: 'error', message: `Failed to ${action} task` });
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogoClick = () => {
        router.push('/drivers/electric');
    };

    return (
        <RouteGuard allowedRoles={['driver_electric']}>
            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
                {/* Header - Electric branding with vibrant gradient */}
                <header
                    style={{
                        background: 'linear-gradient(135deg, #00C853, #00E676)',
                        padding: 'var(--space-md) var(--space-lg)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        boxShadow: 'var(--shadow-lg)',
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
                            ⚡
                        </span>
                        <span style={{ color: 'white', fontWeight: 600 }}>
                            Electric Driver
                        </span>
                    </button>

                    <div className="flex items-center gap-md">
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem' }}>
                            {user?.display_name || 'Driver'}
                        </span>
                        <a
                            href="/chat/global"
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                padding: 'var(--space-sm) var(--space-md)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                fontSize: '0.875rem',
                                backdropFilter: 'blur(10px)',
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
                    {/* Status Banner */}
                    <div
                        className="card"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0, 200, 83, 0.1), rgba(0, 230, 118, 0.05))',
                            border: '1px solid rgba(0, 200, 83, 0.2)',
                            marginBottom: 'var(--space-lg)',
                            textAlign: 'center',
                        }}
                    >
                        <h2 style={{ color: '#00C853', marginBottom: 'var(--space-sm)' }}>
                            ⚡ Electric Fleet
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Eco-friendly deliveries • Zero emissions
                        </p>
                    </div>

                    {/* Task List */}
                    <div>
                        <h2 style={{ marginBottom: 'var(--space-md)' }}>
                            Active Deliveries
                            <span
                                style={{
                                    marginLeft: 'var(--space-sm)',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                ({filteredTasks.length})
                            </span>
                        </h2>

                        {loading ? (
                            <div className="card text-center" style={{ padding: 'var(--space-2xl)' }}>
                                <div className="spinner" style={{ margin: '0 auto' }} />
                                <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-md)' }}>
                                    Loading deliveries...
                                </p>
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div
                                className="card text-center"
                                style={{ padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}
                            >
                                <p style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>🔋</p>
                                <p>No active deliveries</p>
                                <p className="text-sm" style={{ marginTop: 'var(--space-sm)' }}>
                                    You're fully charged and ready!
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-md">
                                {filteredTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onStart={(id) => handleTaskAction(id, 'start')}
                                        onPause={(id) => handleTaskAction(id, 'pause')}
                                        onResume={(id) => handleTaskAction(id, 'resume')}
                                        onComplete={(id) => handleTaskAction(id, 'complete')}
                                        loading={actionLoading === task.id}
                                        viewMode="driver"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* Toast Notifications */}
                <ToastContainer />
            </div>
        </RouteGuard>
    );
}
