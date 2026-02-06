import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('cp-comms-session');
        const body = await request.json();

        const res = await fetch(`${BACKEND_URL}/api/tasks/${params.id}/state`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Cookie: sessionCookie ? `cp-comms-session=${sessionCookie.value}` : '',
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Task state update error:', error);
        return NextResponse.json(
            { error: 'Task service unavailable' },
            { status: 503 }
        );
    }
}
