import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('cp-comms-session');
        const body = await request.json();

        const res = await fetch(`${BACKEND_URL}/api/tasks/${id}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: sessionCookie ? `cp-comms-session=${sessionCookie.value}` : '',
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        console.error(`[API PROXY] Task rejection failed:`, error.message);
        return NextResponse.json(
            { error: `Task service unavailable: ${error.message}` },
            { status: 503 }
        );
    }
}
