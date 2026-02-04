import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
    try {
        const sessionCookie = cookies().get('session');

        const res = await fetch(`${BACKEND_URL}/api/tasks`, {
            headers: {
                Cookie: sessionCookie ? `session=${sessionCookie.value}` : '',
            },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Tasks fetch error:', error);
        return NextResponse.json(
            { error: 'Task service unavailable' },
            { status: 503 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const sessionCookie = cookies().get('session');
        const body = await request.json();

        const res = await fetch(`${BACKEND_URL}/api/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: sessionCookie ? `session=${sessionCookie.value}` : '',
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Task create error:', error);
        return NextResponse.json(
            { error: 'Task service unavailable' },
            { status: 503 }
        );
    }
}
