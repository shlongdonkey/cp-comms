'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/store';

export default function ToastContainer() {
    const { toasts, removeToast } = useUIStore();

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 'var(--space-xl)',
                right: 'var(--space-xl)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-sm)',
                zIndex: 1000,
                pointerEvents: 'none',
            }}
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`toast toast--${toast.type}`}
                    style={{ pointerEvents: 'auto' }}
                    onClick={() => removeToast(toast.id)}
                >
                    <span style={{ marginRight: 'var(--space-sm)' }}>
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'error' && '✕'}
                        {toast.type === 'info' && 'ℹ'}
                    </span>
                    {toast.message}
                </div>
            ))}
        </div>
    );
}
