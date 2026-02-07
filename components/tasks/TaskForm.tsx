'use client';

import { useState, ChangeEvent } from 'react';
import { formatInitials, validateInitials, calculateDeadline } from '@/lib/utils';
import type { Urgency, CreateTaskInput, TaskCategory } from '@/lib/types';

interface TaskFormProps {
    onSubmit: (task: CreateTaskInput) => Promise<void>;
    loading?: boolean;
}

const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
    { value: 'now', label: 'Now' },
    { value: '15min', label: '15 min' },
    { value: '1hour', label: '1 hour' },
    { value: 'today', label: 'Today' },
];

const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
    { value: 'product', label: 'Product' },
    { value: 'pallets', label: 'Pallets' },
    { value: 'carton', label: 'Carton' },
    { value: 'material', label: 'Material' },
    { value: 'label', label: 'Label' },
    { value: 'task', label: 'Task' },
];

const DRIVER_OPTIONS = [
    { value: '61a7b659-a95f-4f2b-a6c0-ea4218f99b5b', label: 'Crown Fleet' },
    { value: 'fba7e904-0ed3-4a92-b637-9d64c91354ab', label: 'Electric Fleet' },
];

export default function TaskForm({ onSubmit, loading }: TaskFormProps) {
    const [signature, setSignature] = useState('');
    const [description, setDescription] = useState('');
    const [urgency, setUrgency] = useState<Urgency>('now');
    const [category, setCategory] = useState<TaskCategory>('task');
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [error, setError] = useState('');

    // Auto-format initials on change: e.g. "JD" -> "J.D"
    const handleSignatureChange = (e: ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value.replace(/[^a-zA-Z.]/g, '').toUpperCase();
        const letters = input.replace(/\./g, '').slice(0, 2);

        if (letters.length === 2) {
            setSignature(`${letters[0]}.${letters[1]}`);
        } else {
            setSignature(letters);
        }
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate signature
        // For validation, we need the two letters without the dot
        const signatureLetters = signature.replace(/\./g, '');
        const validation = validateInitials(signatureLetters);
        if (!validation.valid) {
            setError(validation.error || 'Invalid initials');
            return;
        }

        // Validate description
        if (!description.trim()) {
            setError('Description required');
            return;
        }

        // Validate Driver (Required)
        if (!assignedTo) {
            setError('Driver selection required');
            return;
        }

        try {
            await onSubmit({
                signature: formatInitials(signatureLetters), // Pass the two letters for formatting
                description: description.trim(),
                urgency,
                category,
                assigned_to: assignedTo,
                userId: assignedTo, // Pass redundantly for API compatibility
            } as any);

            // Reset form on success
            setSignature('');
            setDescription('');
            setUrgency('now');
            setCategory('task');
            setAssignedTo('');
        } catch (err) {
            setError('Failed to create task. Please try again.');
        }
    };

    // Calculate preview deadline
    const previewDeadline = calculateDeadline(new Date(), urgency);
    const deadlineStr = urgency === 'today'
        ? previewDeadline.toLocaleDateString([], { day: 'numeric', month: 'short' })
        : previewDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

            {/* Top Row: Category and Driver */}
            <div className="grid grid-cols-2 gap-md">
                <div>
                    <label className="label">Category</label>
                    <select
                        className="input w-full"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as TaskCategory)}
                        style={{ height: '48px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                    >
                        {CATEGORY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label">Assign To</label>
                    <select
                        className="input w-full"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        style={{ height: '48px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                    >
                        <option value="">Select driver</option>
                        {DRIVER_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Description */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="label" style={{ margin: 0 }}>What do you need?</label>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6, color: description.length >= 120 ? 'var(--state-rejected)' : 'inherit' }}>
                        {description.length}/120
                    </span>
                </div>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Bring 8 pallets of core to machine 4..."
                    className="input"
                    rows={3}
                    maxLength={120}
                    disabled={loading}
                    style={{
                        resize: 'none',
                        minHeight: '80px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        padding: '12px'
                    }}
                />
            </div>

            {/* Urgency Selection */}
            <div>
                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Urgency</span>
                    <span style={{ opacity: 0.6 }}>Deadline: {deadlineStr}</span>
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: '8px' }}>
                    {URGENCY_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setUrgency(option.value)}
                            disabled={loading}
                            className={`btn ${urgency === option.value ? 'btn-primary' : 'btn-ghost'}`}
                            style={{
                                flex: 1,
                                padding: '8px',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Row: Initials + Create Button */}
            <div className="flex gap-md" style={{ marginTop: 'var(--space-sm)', alignItems: 'flex-end' }}>
                <div style={{ flex: '0 0 100px' }}>
                    <label className="label">Initials</label>
                    <input
                        type="text"
                        value={signature}
                        onChange={handleSignatureChange}
                        placeholder="J.D"
                        className="input"
                        maxLength={3}
                        disabled={loading}
                        style={{
                            fontSize: '1.25rem',
                            height: '52px',
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            letterSpacing: '0.1em',
                            padding: 0
                        }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <button
                        type="submit"
                        disabled={loading || signature.length < 3 || !description.trim() || !assignedTo}
                        className={`btn w-full ${(!loading && signature.length === 3 && description.trim() && assignedTo) ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                            height: '52px',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            boxShadow: (!loading && signature.length === 3 && description.trim() && assignedTo) ? '0 8px 30px rgba(45, 98, 169, 0.3)' : 'none',
                            opacity: (!loading && signature.length === 3 && description.trim() && assignedTo) ? 1 : 0.5,
                            cursor: (!loading && signature.length === 3 && description.trim() && assignedTo) ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Create'}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="text-sm" style={{
                    padding: 'var(--space-sm)',
                    background: 'rgba(255, 77, 77, 0.1)',
                    border: '1px solid rgba(255, 77, 77, 0.2)',
                    borderRadius: '8px',
                    color: '#FF4D4D',
                    textAlign: 'center',
                    marginTop: 'var(--space-xs)'
                }}>
                    ⚠️ {error}
                </div>
            )}
        </form>
    );
}
