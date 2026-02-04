'use client';

import { useState, useRef, useEffect } from 'react';

interface PinInputProps {
    onComplete: (pin: string) => void;
    error?: string;
    loading?: boolean;
}

export default function PinInput({ onComplete, error, loading }: PinInputProps) {
    const [digits, setDigits] = useState(['', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // Clear on error
    useEffect(() => {
        if (error) {
            setDigits(['', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    }, [error]);

    const handleChange = (index: number, value: string) => {
        // Only allow digits
        if (!/^\d*$/.test(value)) return;

        const newDigits = [...digits];
        newDigits[index] = value.slice(-1); // Single digit only
        setDigits(newDigits);

        // Auto-advance to next input
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when complete
        if (newDigits.every(d => d) && value) {
            onComplete(newDigits.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        // Handle backspace to go to previous input
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);

        if (pastedData.length === 4) {
            const newDigits = pastedData.split('');
            setDigits(newDigits);
            onComplete(pastedData);
        }
    };

    return (
        <div>
            <div className="pin-container">
                {digits.map((digit, i) => (
                    <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={handlePaste}
                        disabled={loading}
                        className="pin-digit"
                        aria-label={`PIN digit ${i + 1}`}
                    />
                ))}
            </div>
            {loading && (
                <div className="flex justify-center" style={{ marginTop: 'var(--space-md)' }}>
                    <div className="spinner" style={{ color: 'var(--primary-blue)' }} />
                </div>
            )}
            {error && <p className="pin-error">{error}</p>}
        </div>
    );
}
