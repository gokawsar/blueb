import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch expenses for a job
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID required' },
        { status: 400 }
      );
    }

    const expenses = await prisma.jobExpense.findMany({
      where: { 
        jobId: parseInt(jobId),
        isActive: true 
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return NextResponse.json({
      success: true,
      data: expenses,
      totalExpenses
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, description, category, amount, date, notes } = body;

    if (!jobId || !description || !category || !amount) {
      return NextResponse.json(
        { success: false, error: 'Job ID, description, category and amount are required' },
        { status: 400 }
      );
    }

    const expense = await prisma.jobExpense.create({
      data: {
        jobId: parseInt(jobId),
        description,
        category,
        amount: parseFloat(amount),
        date: date ? new Date(date) : null,
        notes
      }
    });

    // Update job's totalExpenses and expectedProfit
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (job) {
      // Get all active expenses
      const allExpenses = await prisma.jobExpense.findMany({
        where: { jobId, isActive: true }
      });
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Calculate expected profit - use the existing job.totalAmount (don't recalculate from items)
      const expectedProfit = job.totalAmount - totalExpenses;

      await prisma.job.update({
        where: { id: jobId },
        data: {
          totalExpenses,
          expectedProfit
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: expense,
      message: 'Expense added successfully'
    });

  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update an expense
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, description, category, amount, date, notes, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expense ID required' },
        { status: 400 }
      );
    }

    const expense = await prisma.jobExpense.update({
      where: { id },
      data: {
        description,
        category,
        amount: amount ? parseFloat(amount) : undefined,
        date: date ? new Date(date) : undefined,
        notes,
        isActive
      }
    });

    // Update job's totals
    const jobId = expense.jobId;
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (job) {
      const allExpenses = await prisma.jobExpense.findMany({
        where: { jobId, isActive: true }
      });
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const expectedProfit = job.totalAmount - totalExpenses;

      await prisma.job.update({
        where: { id: jobId },
        data: {
          totalExpenses,
          expectedProfit
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: expense,
      message: 'Expense updated successfully'
    });

  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an expense (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expense ID required' },
        { status: 400 }
      );
    }

    // Soft delete
    const expense = await prisma.jobExpense.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    // Update job's totals
    const jobId = expense.jobId;
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (job) {
      const allExpenses = await prisma.jobExpense.findMany({
        where: { jobId, isActive: true }
      });
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const expectedProfit = job.totalAmount - totalExpenses;

      await prisma.job.update({
        where: { id: jobId },
        data: {
          totalExpenses,
          expectedProfit
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
