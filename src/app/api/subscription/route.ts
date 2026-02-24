import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch subscription plans or user subscription
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const planId = searchParams.get('planId');

    // Get all subscription plans
    if (!userId) {
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
      });

      return NextResponse.json({
        success: true,
        data: plans
      });
    }

    // Get user's current subscription
    const subscription = await prisma.subscription.findFirst({
      where: { userId: parseInt(userId) },
      include: {
        plan: true
      }
    });

    return NextResponse.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, planId, billingCycle } = body;

    if (!userId || !planId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Plan ID required' },
        { status: 400 }
      );
    }

    // Get the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Calculate dates
    const now = new Date();
    const endDate = new Date(now);
    if (billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Check if user already has a subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: { userId }
    });

    let subscription;

    if (existingSubscription) {
      // Update existing subscription
      subscription = await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: {
          planId,
          status: 'ACTIVE',
          billingCycle: billingCycle || 'MONTHLY',
          endDate,
          startDate: now
        },
        include: {
          plan: true
        }
      });
    } else {
      // Create new subscription
      subscription = await prisma.subscription.create({
        data: {
          userId,
          planId,
          status: 'ACTIVE',
          billingCycle: billingCycle || 'MONTHLY',
          startDate: now,
          endDate
        },
        include: {
          plan: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: subscription,
      message: 'Subscription updated successfully'
    });

  } catch (error) {
    console.error('Subscription POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Cancel subscription
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId }
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Cancel subscription
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      },
      include: {
        plan: true
      }
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Subscription cancelled'
    });

  } catch (error) {
    console.error('Subscription PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
