import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET - Fetch all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID required' },
        { status: 400 }
      );
    }

    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: parseInt(adminId) }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all users with their subscriptions
    const users = await prisma.user.findMany({
      include: {
        subscriptions: {
          include: {
            plan: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new user (admin only) or update user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, action, userId, email, name, password, role, isActive } = body;

    // Verify admin
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID required' },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: parseInt(adminId) }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    if (action === 'create') {
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

      // Get free plan
      const freePlan = await prisma.subscriptionPlan.findUnique({
        where: { slug: 'free' }
      });

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role || 'USER',
          isActive: true,
          ...(freePlan && {
            subscriptions: {
              create: {
                planId: freePlan.id,
                status: 'ACTIVE',
                billingCycle: 'MONTHLY',
                startDate: new Date()
              }
            }
          })
        },
        include: {
          subscriptions: {
            include: { plan: true },
            take: 1
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    }

    if (action === 'update') {
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'User ID required' },
          { status: 400 }
        );
      }

      const updateData: any = {
        name,
        isActive
      };

      if (role) {
        updateData.role = role;
      }

      if (password) {
        updateData.password = await bcrypt.hash(password, 12);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          subscriptions: {
            include: { plan: true },
            take: 1
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    }

    if (action === 'toggleActive') {
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'User ID required' },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Prevent disabling yourself
      if (targetUser.id === admin.id) {
        return NextResponse.json(
          { success: false, error: 'Cannot disable your own account' },
          { status: 400 }
        );
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive: !targetUser.isActive },
        include: {
          subscriptions: {
            include: { plan: true },
            take: 1
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: user,
        message: user.isActive ? 'User enabled' : 'User disabled'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Admin users POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    const userId = searchParams.get('userId');

    if (!adminId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Admin ID and User ID required' },
        { status: 400 }
      );
    }

    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: parseInt(adminId) }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Prevent deleting yourself
    if (parseInt(userId) === admin.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: parseInt(userId) }
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Admin users DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
