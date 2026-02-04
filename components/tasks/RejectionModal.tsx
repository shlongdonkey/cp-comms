'use client';

import type { Task } from '@/lib/types';
import { useUIStore } from '@/lib/store';

interface RejectionModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function RejectionModal({ task, isOpen, onClose }: RejectionModalProps) {
    if (!isOpen || !task) return null;

    const remainingTime = task.rejection_expires
        ? Math.max(0, new Date(task.rejection_expires).getTime() - Date.now())
        : 0;
    const remainingMinutes = Math.ceil(remainingTime / 60000);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 'var(--space-md)',
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{
                    maxWidth: '400px',
                    width: '100%',
                    animation: 'slideIn 0.2s ease',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-md)' }}>
                    <h3 style={{ color: 'var(--state-rejected)' }}>
                        Rejection Details
                    </h3>
                    <button
                        className="btn btn-ghost"
                        onClick={onClose}
                        style={{ padding: '4px 8px' }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <p className="label">Task</p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {task.description}
                    </p>
                </div>

                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <p className="label">Rejection Reason</p>
                    <p style={{
                        color: 'var(--text-primary)',
                        background: 'var(--bg-secondary)',
                        padding: 'var(--space-sm) var(--space-md)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--state-rejected)',
                    }}>
                        {task.rejection_reason || 'No reason provided'}
                    </p>
                </div>

                <div
                    className="text-sm"
                    style={{
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                    }}
                >
                    <span>⏱</span>
                    <span>
                        {remainingMinutes > 0
                            ? `Expires in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
                            : 'Expired'
                        }
                    </span>
                </div>
            </div>
        </div>
    );
}
