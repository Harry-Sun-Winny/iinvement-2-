import { NextRequest, NextResponse } from 'next/server';

// Mock database - in production, this should connect to PostgreSQL
const users: Record<string, { id: string; email: string; password: string; fullName: string }> = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    // Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and fullName are required' },
        { status: 400 }
      );
    }

    if (password.length < 12) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có tối thiểu 12 ký tự' },
        { status: 400 }
      );
    }

    // Check if user exists
    if (users[email]) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký' },
        { status: 409 }
      );
    }

    // Create user (in production, hash password with bcrypt)
    const userId = `user_${Date.now()}`;
    users[email] = {
      id: userId,
      email,
      password, // Never store plain text in production!
      fullName,
    };

    // Generate mock JWT token
    const token = Buffer.from(
      JSON.stringify({
        sub: userId,
        email,
        fullName,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
      })
    ).toString('base64');

    return NextResponse.json(
      {
        token,
        tokenType: 'Bearer',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Registration error:', error);
    return NextResponse.json(
      { error: 'Đăng ký thất bại' },
      { status: 500 }
    );
  }
}
