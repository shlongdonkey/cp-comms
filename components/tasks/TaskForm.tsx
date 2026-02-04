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
        <form onSubmit={handleSubmit} className="card">
            <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1.125rem' }}>
                New Request
            </h3>

            {/* Signature Input */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
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
                    />
                    {signature.length === 2 && (
                        <span style={{
                            color: 'var(--accent-green)',
                            fontWeight: 600,
                            fontSize: '1.25rem',
                        }}>
                            → {formattedSignature}
                        </span>
                    )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Enter 2 letters (auto-formats to A.B)
                </p>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
                <label className="label">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What needs to be done..."
                    className="input"
                    rows={3}
                    disabled={loading}
                    style={{ resize: 'vertical', minHeight: '80px' }}
                />
            </div>

            {/* Urgency Selection */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
                <label className="label">Urgency</label>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    {URGENCY_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setUrgency(option.value)}
                            disabled={loading}
                            className={`btn ${urgency === option.value ? 'btn-primary' : 'btn-ghost'}`}
                            style={{
                                flex: '1 1 auto',
                                minWidth: '80px',
                            }}
                        >
                            {option.icon} {option.label}
                        </button>
                    ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                    Deadline: {previewDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>

            {/* Error Display */}
            {error && (
                <p style={{
                    color: 'var(--state-rejected)',
                    marginBottom: 'var(--space-md)',
                    fontSize: '0.875rem',
                }}>
                    {error}
                </p>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || signature.length !== 2 || !description.trim()}
                style={{ padding: 'var(--space-md)' }}
            >
                {loading ? (
                    <>
                        <span className="spinner" />
                        Creating...
                    </>
                ) : (
                    'Create Request'
                )}
            </button>
        </form>
    );
}
