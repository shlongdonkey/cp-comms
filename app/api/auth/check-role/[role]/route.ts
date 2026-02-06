import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ role: string }> }
) {
    try {
        const { role } = await params;

        const res = await fetch(`${BACKEND_URL}/api/auth/check-role/${role}`);
        const data = await res.json();

        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Check role error:', error);
        return NextResponse.json(
            { error: 'Auth service unavailable' },
            { status: 503 }
        );
    }
}
