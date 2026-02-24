import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function serializeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    companyName: user.companyName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    subscription: user.subscriptions?.[0] || null
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name, companyName, phone } = body;

    if (action === 'register') {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'User already exists' },
          { status: 400 }
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Get the free plan
      const freePlan = await prisma.subscriptionPlan.findUnique({
        where: { slug: 'free' }
      });

      // Create user with free subscription
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          companyName,
          phone,
          role: 'USER',
          // Create subscription if free plan exists
          ...(freePlan && {
            subscriptions: {
              create: {
                planId: freePlan.id,
                status: 'TRIAL',
                billingCycle: 'MONTHLY',
                trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
                startDate: new Date()
              }
            }
          })
        },
        include: {
          subscriptions: {
            include: {
              plan: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      const userData = serializeUser(user);
      
      const response = NextResponse.json({
        success: true,
        data: userData
      });

      // Set cookie
      response.cookies.set('user', JSON.stringify(userData), {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return response;
    }

    if (action === 'login') {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          subscriptions: {
            include: {
              plan: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Check if user is active
      if (!user.isActive) {
        return NextResponse.json(
          { success: false, error: 'Account is disabled' },
          { status: 403 }
        );
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      const userData = serializeUser(user);
      
      const response = NextResponse.json({
        success: true,
        data: userData
      });

      // Set cookie
      response.cookies.set('user', JSON.stringify(userData), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        subscriptions: {
          include: {
            plan: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeUser(user)
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Logout handler
export async function PUT(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });

  // Clear cookie
  response.cookies.set('user', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0
  });

  return response;
}
