import { NextRequest, NextResponse } from 'next/server';

// Mock database reference - same as register route
const users: Record<string, { id: string; email: string; password: string; fullName: string }> = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user exists (in production, use password hashing)
    const user = users[email];
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Generate mock JWT token
    const token = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
      })
    ).toString('base64');

    return NextResponse.json(
      {
        token,
        tokenType: 'Bearer',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Login error:', error);
    return NextResponse.json(
      { error: 'Đăng nhập thất bại' },
      { status: 500 }
    );
  }
}
