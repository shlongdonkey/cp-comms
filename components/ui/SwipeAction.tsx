'use client';

import { useState, useRef, useEffect } from 'react';

interface SwipeActionProps {
    children: React.ReactNode;
    actions: React.ReactNode;
    onSwipeOpen?: () => void;
    onSwipeClose?: () => void;
}

export default function SwipeAction({
    children,
    actions,
    onSwipeOpen,
    onSwipeClose,
}: SwipeActionProps) {
    const [isSwiped, setIsSwiped] = useState(false);
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const SWIPE_THRESHOLD = 60;
    const MAX_SWIPE = 140;

    const handleTouchStart = (e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX);
        setIsDragging(true);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setStartX(e.clientX);
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const diff = startX - e.touches[0].clientX;
        setCurrentX(Math.min(Math.max(diff, 0), MAX_SWIPE));
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const diff = startX - e.clientX;
        setCurrentX(Math.min(Math.max(diff, 0), MAX_SWIPE));
    };

    const handleEnd = () => {
        setIsDragging(false);
        if (currentX > SWIPE_THRESHOLD) {
            setIsSwiped(true);
            setCurrentX(MAX_SWIPE);
            onSwipeOpen?.();
        } else {
            setIsSwiped(false);
            setCurrentX(0);
            if (isSwiped) onSwipeClose?.();
        }
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsSwiped(false);
                setCurrentX(0);
                onSwipeClose?.();
            }
        };

        if (isSwiped) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isSwiped, onSwipeClose]);

    const translateX = isDragging ? -currentX : (isSwiped ? -MAX_SWIPE : 0);

    return (
        <div
            ref={containerRef}
            className="swipe-container"
            style={{ position: 'relative', overflow: 'hidden' }}
        >
            {/* Action buttons (revealed on swipe) */}
            <div
                className="swipe-actions"
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    padding: '0 var(--space-md)',
                    background: 'var(--bg-secondary)',
                }}
            >
                {actions}
            </div>

            {/* Main content */}
            <div
                ref={contentRef}
                className="swipe-content"
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease',
                    position: 'relative',
                    background: 'var(--bg-card)',
                    zIndex: 1,
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleEnd}
                onMouseLeave={() => isDragging && handleEnd()}
            >
                {children}
            </div>
        </div>
    );
}
