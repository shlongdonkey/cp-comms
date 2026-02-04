import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const res = await fetch(`${BACKEND_URL}/api/auth/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        // Forward the session cookie
        const response = NextResponse.json(data);
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) {
            response.headers.set('set-cookie', setCookie);
        }

        return response;
    } catch (error) {
        console.error('Auth proxy error:', error);
        return NextResponse.json(
            { error: 'Authentication service unavailable' },
            { status: 503 }
        );
    }
}
