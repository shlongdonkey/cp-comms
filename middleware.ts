import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-change-in-production'
);

/**
 * Protected routes and their allowed roles
 */
const PROTECTED_ROUTES: Record<string, string[]> = {
    '/office': ['office'],
    '/factory-office': ['factory_office'],
    '/store-office': ['store_office'],
    '/chat/admin-ops': ['office', 'factory_office', 'store_office'],
};

/**
 * Direct access routes (no PIN required)
 */
const DIRECT_ACCESS_ROUTES: Record<string, string[]> = {
    '/factory': ['factory'],
    '/drivers/crown': ['driver_crown'],
    '/drivers/electric': ['driver_electric'],
};

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Check if this is a protected route
    const protectedEntry = Object.entries(PROTECTED_ROUTES).find(
        ([route]) => path.startsWith(route)
    );

    // Check if this is a direct access route
    const directEntry = Object.entries(DIRECT_ACCESS_ROUTES).find(
        ([route]) => path.startsWith(route)
    );

    // If not a protected or direct route, allow through
    if (!protectedEntry && !directEntry) {
        return NextResponse.next();
    }

    const token = request.cookies.get('cp-comms-session')?.value;

    // For protected routes, require auth
    if (protectedEntry) {
        if (!token) {
            const redirectUrl = new URL('/', request.url);
            redirectUrl.searchParams.set('redirect', path);
            return NextResponse.redirect(redirectUrl);
        }

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            const userRole = payload.role as string;
            const [, allowedRoles] = protectedEntry;

            if (!allowedRoles.includes(userRole)) {
                // User trying to access route they don't have permission for
                return NextResponse.redirect(new URL('/', request.url));
            }

            return NextResponse.next();
        } catch {
            // Invalid or expired token
            const redirectUrl = new URL('/', request.url);
            redirectUrl.searchParams.set('redirect', path);
            return NextResponse.redirect(redirectUrl);
        }
    }

    // For direct access routes, just allow through
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/office/:path*',
        '/factory-office/:path*',
        '/store-office/:path*',
        '/factory/:path*',
        '/drivers/:path*',
        '/chat/admin-ops/:path*',
    ],
};
