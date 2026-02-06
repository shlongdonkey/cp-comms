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
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="glass-panel"
                style={{
                    maxWidth: '450px',
                    width: '100%',
                    padding: 'var(--space-lg)',
                    animation: 'slideIn 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative gradient blob */}
                <div style={{
                    position: 'absolute',
                    top: '-20%',
                    left: '-20%',
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(255, 77, 77, 0.1) 0%, transparent 70%)',
                    zIndex: 0
                }} />

                <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)', position: 'relative', zIndex: 1 }}>
                    <h3 style={{ color: 'var(--state-rejected)', margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                        Rejection Details
                    </h3>
                    <button
                        className="btn btn-ghost"
                        onClick={onClose}
                        style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ marginBottom: 'var(--space-lg)', position: 'relative', zIndex: 1 }}>
                    <p className="label">Original Request</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
                        {task.description}
                    </p>
                </div>

                <div style={{ marginBottom: 'var(--space-lg)', position: 'relative', zIndex: 1 }}>
                    <p className="label">Rejection Reason</p>
                    <div style={{
                        color: 'white',
                        background: 'rgba(255, 77, 77, 0.05)',
                        padding: 'var(--space-md)',
                        borderRadius: '12px',
                        borderLeft: '4px solid var(--state-rejected)',
                        fontSize: '1rem',
                        lineHeight: 1.5,
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        {task.rejection_reason || 'No reason provided'}
                    </div>
                </div>

                <div
                    className="flex justify-between items-center"
                    style={{
                        paddingTop: 'var(--space-md)',
                        borderTop: '1px solid var(--glass-border)',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    <div className="flex items-center gap-sm">
                        <span style={{ fontSize: '1.1rem' }}>⏱</span>
                        <span>
                            {remainingMinutes > 0
                                ? `Expires in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
                                : 'Expired'
                            }
                        </span>
                    </div>

                    <button className="btn btn-primary" onClick={onClose} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
