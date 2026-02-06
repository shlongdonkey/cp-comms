import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('cp-comms-session');

        const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
            headers: {
                Cookie: sessionCookie ? `cp-comms-session=${sessionCookie.value}` : '',
            },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json(
            { error: 'Session service unavailable' },
            { status: 503 }
        );
    }
}
