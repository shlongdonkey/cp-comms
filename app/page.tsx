'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PinInput from '@/components/auth/PinInput';

const ACCESS_POINTS = [
    { id: 'office', label: 'Office', requiresPin: true, path: '/office' },
    { id: 'factory-office', label: 'Factory Office', requiresPin: true, path: '/factory-office' },
    { id: 'store-office', label: 'Store Office', requiresPin: true, path: '/store-office' },
    { id: 'factory', label: 'Factory', requiresPin: false, path: '/factory' },
    { id: 'driver-crown', label: 'Drivers (Crown)', requiresPin: false, path: '/drivers/crown' },
    { id: 'driver-electric', label: 'Drivers (Electric)', requiresPin: false, path: '/drivers/electric' },
];

export default function HomePage() {
    const router = useRouter();
    const [selectedAccess, setSelectedAccess] = useState<string | null>(null);
    const [showPin, setShowPin] = useState(false);
    const [pinError, setPinError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAccessSelect = (accessPoint: typeof ACCESS_POINTS[0]) => {
        if (accessPoint.requiresPin) {
            setSelectedAccess(accessPoint.id);
            setShowPin(true);
            setPinError('');
        } else {
            router.push(accessPoint.path);
        }
    };

    const handlePinComplete = async (pin: string) => {
        setLoading(true);
        setPinError('');

        try {
            const res = await fetch('/api/auth/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: selectedAccess, pin }),
            });

            if (res.ok) {
                const accessPoint = ACCESS_POINTS.find(a => a.id === selectedAccess);
                router.push(accessPoint?.path || '/');
            } else {
                setPinError('Invalid PIN. Please try again.');
            }
        } catch {
            setPinError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setShowPin(false);
        setSelectedAccess(null);
        setPinError('');
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center" style={{ padding: 'var(--space-xl)' }}>
            {/* Logo */}
            <div className="text-center" style={{ marginBottom: 'var(--space-2xl)' }}>
                <h1 style={{
                    fontSize: '3.5rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--primary-blue) 0%, var(--accent-green) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>
                    CP
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
                    Comms
                </p>
            </div>

            {!showPin ? (
                /* Access Point Selection */
                <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                    <h2 style={{
                        textAlign: 'center',
                        marginBottom: 'var(--space-lg)',
                        fontSize: '1.25rem',
                    }}>
                        Select Access Point
                    </h2>

                    <div className="flex flex-col gap-sm">
                        {ACCESS_POINTS.map((access) => (
                            <button
                                key={access.id}
                                onClick={() => handleAccessSelect(access)}
                                className="btn btn-ghost w-full"
                                style={{
                                    justifyContent: 'space-between',
                                    padding: 'var(--space-md)',
                                }}
                            >
                                <span>{access.label}</span>
                                {access.requiresPin && (
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                        background: 'var(--bg-secondary)',
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                    }}>
                                        PIN
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                /* PIN Entry */
                <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                    <button
                        onClick={handleBack}
                        className="btn btn-ghost"
                        style={{ marginBottom: 'var(--space-md)' }}
                    >
                        ← Back
                    </button>

                    <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-sm)' }}>
                        Enter PIN
                    </h2>
                    <p style={{
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        marginBottom: 'var(--space-lg)',
                        textTransform: 'capitalize',
                    }}>
                        {selectedAccess?.replace('-', ' ')} Access
                    </p>

                    <PinInput
                        onComplete={handlePinComplete}
                        error={pinError}
                        loading={loading}
                    />
                </div>
            )}

            {/* Footer */}
            <p style={{
                marginTop: 'var(--space-2xl)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
            }}>
                CP Comms v1.0 • Internal Use Only
            </p>
        </main>
    );
}
