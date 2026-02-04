'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

interface RouteGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

export default function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, checkSession } = useAuthStore();

    useEffect(() => {
        const validateAccess = async () => {
            const isValid = await checkSession();

            if (!isValid) {
                router.replace(`/?redirect=${encodeURIComponent(pathname)}`);
                return;
            }

            if (user && !allowedRoles.includes(user.role)) {
                // Prevent URL manipulation - redirect to home
                router.replace('/');
            }
        };

        validateAccess();
    }, [pathname, router, allowedRoles, user, checkSession]);

    // Show loading while checking auth
    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    borderWidth: '3px',
                    color: 'var(--primary-blue)'
                }} />
            </div>
        );
    }

    // Check role access
    if (!allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
}
