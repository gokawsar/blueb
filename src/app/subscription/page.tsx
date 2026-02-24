'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatCurrency } from '@/lib/utils';

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  yearlyPrice: number;
  maxUsers: number;
  maxCustomers: number;
  maxJobs: number;
  maxInventory: number;
  hasAdvancedReports: boolean;
  hasApiAccess: boolean;
  hasCustomBranding: boolean;
  hasPrioritySupport: boolean;
  isFeatured: boolean;
}

interface Subscription {
  id: number;
  status: string;
  billingCycle: string;
  startDate: string;
  endDate: string;
  plan: Plan;
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch(`/api/subscription?userId=${currentUser.id}`),
        fetch('/api/subscription')
      ]);

      const subResult = await subRes.json();
      const plansResult = await plansRes.json();

      if (subResult.success) {
        setSubscription(subResult.data);
      }

      if (plansResult.success) {
        setPlans(plansResult.data);
      }
    } catch (err) {
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: number) => {
    setUpgrading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          planId,
          billingCycle
        })
      });

      const result = await response.json();

      if (result.success) {
        setSubscription(result.data);
        setSuccess('Subscription updated successfully!');
        // Update localStorage
        const updatedUser = { ...currentUser, subscription: result.data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        setError(result.error || 'Failed to update subscription');
      }
    } catch (err) {
      setError('Failed to update subscription');
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id
        })
      });

      const result = await response.json();

      if (result.success) {
        setSubscription(result.data);
        setSuccess('Subscription cancelled successfully');
      } else {
        setError(result.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      setError('Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Subscription">
        <div className="p-8 text-center text-gray-500">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Subscription">
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription & Plans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your subscription and billing</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
          </div>
        )}

        {/* Current Subscription */}
        {subscription && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Plan</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {subscription.plan.name}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    subscription.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : subscription.status === 'TRIAL'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                  }`}>
                    {subscription.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {subscription.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} billing
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {subscription.endDate && subscription.status !== 'CANCELLED' && (
                    <>Renews on {new Date(subscription.endDate).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {subscription.plan.price === 0 ? 'Free' : formatCurrency(subscription.plan.price)}
                  {subscription.plan.price > 0 && <span className="text-sm font-normal">/mo</span>}
                </p>
              </div>
            </div>

            {/* Usage */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Plan Limits</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Users</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {subscription.plan.maxUsers === -1 ? 'Unlimited' : subscription.plan.maxUsers}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customers</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {subscription.plan.maxCustomers === -1 ? 'Unlimited' : subscription.plan.maxCustomers}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Jobs</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {subscription.plan.maxJobs === -1 ? 'Unlimited' : subscription.plan.maxJobs}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Inventory Items</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {subscription.plan.maxInventory === -1 ? 'Unlimited' : subscription.plan.maxInventory}
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Plan Features</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className={`flex items-center gap-2 ${subscription.plan.hasAdvancedReports ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <span>{subscription.plan.hasAdvancedReports ? '✓' : '✗'}</span>
                  <span className="text-sm">Advanced Reports</span>
                </div>
                <div className={`flex items-center gap-2 ${subscription.plan.hasApiAccess ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <span>{subscription.plan.hasApiAccess ? '✓' : '✗'}</span>
                  <span className="text-sm">API Access</span>
                </div>
                <div className={`flex items-center gap-2 ${subscription.plan.hasCustomBranding ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <span>{subscription.plan.hasCustomBranding ? '✓' : '✗'}</span>
                  <span className="text-sm">Custom Branding</span>
                </div>
                <div className={`flex items-center gap-2 ${subscription.plan.hasPrioritySupport ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <span>{subscription.plan.hasPrioritySupport ? '✓' : '✗'}</span>
                  <span className="text-sm">Priority Support</span>
                </div>
              </div>
            </div>

            {subscription.status !== 'CANCELLED' && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCancel}
                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Plans</h2>
          
          {/* Billing Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'MONTHLY'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'YEARLY'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan?.id === plan.id;
              const price = billingCycle === 'YEARLY' && plan.yearlyPrice 
                ? Math.round(plan.yearlyPrice / 12) 
                : plan.price;

              return (
                <div
                  key={plan.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-6 border-2 ${
                    isCurrentPlan
                      ? 'border-blue-500 dark:border-blue-400'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {plan.isFeatured && (
                    <div className="text-center mb-2">
                      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-xs font-medium px-2 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
                  
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {plan.price === 0 ? 'Free' : formatCurrency(price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                    )}
                    {billingCycle === 'YEARLY' && plan.yearlyPrice && plan.price > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Save {formatCurrency(plan.price * 12 - plan.yearlyPrice)}/year
                      </p>
                    )}
                  </div>

                  <ul className="mt-4 space-y-2">
                    <li className="text-sm text-gray-600 dark:text-gray-300">
                      {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} users
                    </li>
                    <li className="text-sm text-gray-600 dark:text-gray-300">
                      {plan.maxCustomers === -1 ? 'Unlimited' : plan.maxCustomers} customers
                    </li>
                    <li className="text-sm text-gray-600 dark:text-gray-300">
                      {plan.maxJobs === -1 ? 'Unlimited' : plan.maxJobs} jobs
                    </li>
                    <li className="text-sm text-gray-600 dark:text-gray-300">
                      {plan.maxInventory === -1 ? 'Unlimited' : plan.maxInventory} inventory items
                    </li>
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrentPlan || upgrading}
                    className={`mt-6 w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : upgrading ? 'Updating...' : 'Upgrade'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
