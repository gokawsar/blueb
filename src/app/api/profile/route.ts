import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        lastLoginAt: true,
        password: true, // Get password to check if user has one
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

    // Return user data without password
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: {
        ...userWithoutPassword,
        hasPassword: !!password,
        googleId: null,
        googleEmail: null,
        twoFactorEnabled: false
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, ...data } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    if (action === 'updateProfile') {
      const { name, companyName, phone } = data;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          companyName,
          phone
        },
        select: {
          id: true,
          email: true,
          name: true,
          companyName: true,
          phone: true,
          role: true
        }
      });

      return NextResponse.json({
        success: true,
        data: user
      });
    }

    if (action === 'changePassword') {
      const { currentPassword, newPassword } = data;

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user has a password
      if (!user.password) {
        return NextResponse.json(
          { success: false, error: 'You cannot change password for accounts using OAuth' },
          { status: 400 }
        );
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully'
      });
    }

    if (action === 'setup2FA') {
      // 2FA setup - placeholder
      return NextResponse.json({
        success: false,
        error: '2FA setup requires additional configuration. Please contact support.'
      });
    }

    if (action === 'disable2FA') {
      return NextResponse.json({
        success: false,
        error: '2FA is not enabled'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
