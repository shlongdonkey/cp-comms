'use client';

import { useState, ChangeEvent } from 'react';
import { formatInitials, validateInitials, calculateDeadline } from '@/lib/utils';
import type { Urgency, CreateTaskInput } from '@/lib/types';

interface TaskFormProps {
    onSubmit: (task: CreateTaskInput) => Promise<void>;
    loading?: boolean;
}

const URGENCY_OPTIONS: { value: Urgency; label: string; icon: string }[] = [
    { value: 'now', label: 'Now', icon: '⚡' },
    { value: '15min', label: '15 min', icon: '🕐' },
    { value: '1hour', label: '1 hour', icon: '🕐' },
    { value: 'today', label: 'Today', icon: '📅' },
];

export default function TaskForm({ onSubmit, loading }: TaskFormProps) {
    const [signature, setSignature] = useState('');
    const [description, setDescription] = useState('');
    const [urgency, setUrgency] = useState<Urgency>('now');
    const [error, setError] = useState('');

    // Auto-format initials on change
    const handleSignatureChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2);
        setSignature(value);
        setError('');
    };

    // Show formatted preview
    const formattedSignature = signature.length === 2 ? formatInitials(signature) : signature.toUpperCase();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate signature
        const validation = validateInitials(signature);
        if (!validation.valid) {
            setError(validation.error || 'Invalid initials');
            return;
        }

        // Validate description
        if (!description.trim()) {
            setError('Description required');
            return;
        }

        try {
            await onSubmit({
                signature: formatInitials(signature),
                description: description.trim(),
                urgency,
            });

            // Reset form on success
            setSignature('');
            setDescription('');
            setUrgency('now');
        } catch (err) {
            setError('Failed to create task. Please try again.');
        }
    };

    // Calculate preview deadline
    const previewDeadline = calculateDeadline(new Date(), urgency);

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Signature Input */}
            <div>
                <label className="label">Initials</label>
                <div className="flex items-center gap-md">
                    <input
                        type="text"
                        value={signature}
                        onChange={handleSignatureChange}
                        placeholder="JD"
                        className="input initials-input"
                        maxLength={2}
                        disabled={loading}
                        style={{
                            fontSize: '1.5rem',
                            height: '56px',
                            width: '80px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px'
                        }}
                    />
                    {signature.length === 2 && (
                        <div style={{
                            padding: 'var(--space-sm) var(--space-md)',
                            background: 'var(--grad-success)',
                            borderRadius: '12px',
                            color: 'var(--bg-main)',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(179, 226, 109, 0.2)',
                            animation: 'slideIn 0.3s ease'
                        }}>
                            <span style={{ fontSize: '1.1rem' }}>{formattedSignature}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="label">What do you need?</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Bring 8 pallets of core to machine 4..."
                    className="input"
                    rows={3}
                    disabled={loading}
                    style={{
                        resize: 'none',
                        minHeight: '100px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        padding: '12px'
                    }}
                />
            </div>

            {/* Urgency Selection */}
            <div>
                <label className="label" style={{ display: 'flex', justifyContent: 'between' }}>
                    <span>Urgency</span>
                    <span style={{ opacity: 0.6 }}>Deadline: {previewDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </label>
                <div className="grid grid-cols-2 gap-sm" style={{ marginTop: '8px' }}>
                    {URGENCY_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setUrgency(option.value)}
                            disabled={loading}
                            className={`btn ${urgency === option.value ? 'btn-primary' : 'btn-ghost'}`}
                            style={{
                                padding: '12px',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{option.icon}</span> {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: 'var(--space-sm)',
                    background: 'rgba(255, 77, 77, 0.1)',
                    border: '1px solid rgba(255, 77, 77, 0.2)',
                    borderRadius: '8px',
                    color: '#FF4D4D',
                    fontSize: '0.875rem',
                    textAlign: 'center'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || signature.length !== 2 || !description.trim()}
                style={{
                    marginTop: 'var(--space-sm)',
                    height: '56px',
                    fontSize: '1rem',
                    fontWeight: 600
                }}
            >
                {loading ? <span className="spinner" /> : 'Broadcast Request'}
            </button>
        </form>
    );
}
