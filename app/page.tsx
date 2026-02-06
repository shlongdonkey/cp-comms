'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PinInput from '@/components/auth/PinInput';
import { useAuthStore } from '@/lib/store';

const ACCESS_POINTS = [
    { id: 'office', label: 'Office', path: '/office' },
    { id: 'factory_office', label: 'Factory Office', path: '/factory-office' },
    { id: 'store_office', label: 'Store Office', path: '/store-office' },
    { id: 'factory', label: 'Factory', path: '/factory' },
    { id: 'driver_crown', label: 'Drivers (Crown)', path: '/drivers/crown' },
    { id: 'driver_electric', label: 'Drivers (Electric)', path: '/drivers/electric' },
];

export default function HomePage() {
    const router = useRouter();
    const { setUser } = useAuthStore();
    const [selectedAccess, setSelectedAccess] = useState<string | null>(null);
    const [showPin, setShowPin] = useState(false);
    const [pinError, setPinError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAccessSelect = async (accessPoint: typeof ACCESS_POINTS[0]) => {
        setLoading(true);
        setPinError('');

        try {
            // Check if the role requires PIN
            const checkRes = await fetch(`/api/auth/check-role/${accessPoint.id}`);
            const { requiresPin } = await checkRes.json();

            if (!requiresPin) {
                // Auto-login for roles with PIN = 'NONE'
                const loginRes = await fetch('/api/auth/verify-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: accessPoint.id }),
                });

                if (loginRes.ok) {
                    const data = await loginRes.json();
                    setUser(data.user, data.expiresAt);
                    router.push(accessPoint.path);
                    return;
                }
            }

            // Show PIN screen for roles that require it
            setSelectedAccess(accessPoint.id);
            setShowPin(true);
        } catch (error) {
            setPinError('Connection error. Please try again.');
        } finally {
            setLoading(false);
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
                const data = await res.json();
                setUser(data.user, data.expiresAt);
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
                                    justifyContent: 'center',
                                    padding: 'var(--space-md)',
                                }}
                            >
                                <span>{access.label}</span>
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
