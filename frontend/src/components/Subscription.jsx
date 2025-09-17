import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const Subscription = () => {
    const { user } = useAuth();
    const { subscriptionStatus, trialStatus, getSubscriptionInfo, refreshSubscription } = useSubscription();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentSubscription, setCurrentSubscription] = useState(null);

    // Fetch current subscription status
    const fetchCurrentSubscription = async () => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                throw new Error('No authentication token available');
            }

            const apiUrl = import.meta.env.VITE_BASE_API_URL;
            const userId = user.userId || user.username || user.sub;
            const response = await fetch(`${apiUrl}/stripe/subscription/${userId}/${user.universityId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentSubscription(data);
            }
        } catch (err) {
            console.error('Error fetching current subscription:', err);
        }
    };

    // Fetch available subscription plans
    const fetchPlans = async () => {
        try {
            setLoading(true);
            setError(null);

            const apiUrl = import.meta.env.VITE_BASE_API_URL;
            const response = await fetch(`${apiUrl}/stripe/plans`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setPlans(data.plans || []);
        } catch (err) {
            console.error('Error fetching plans:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Create Stripe checkout session
    const createCheckoutSession = async (priceId) => {
        try {
            setIsProcessing(true);
            setError(null);

            // Get the JWT token
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                throw new Error('No authentication token available');
            }

            const apiUrl = import.meta.env.VITE_BASE_API_URL;
            const userId = user.userId || user.username || user.sub;

            console.log('Creating checkout session with:', {
                userId,
                universityId: user.universityId,
                priceId,
                apiUrl: `${apiUrl}/stripe/subscription/${userId}/${user.universityId}`
            });

            const response = await fetch(`${apiUrl}/stripe/subscription/${userId}/${user.universityId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'create_checkout_session',
                    price_id: priceId,
                    success_url: `${window.location.origin}/experiences?subscription=success`,
                    cancel_url: `${window.location.origin}/subscription?subscription=cancelled`
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Redirect to Stripe Checkout
            window.location.href = data.checkout_url;
        } catch (err) {
            console.error('Error creating checkout session:', err);
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([
                fetchPlans(),
                fetchCurrentSubscription()
            ]);
        };
        fetchData();
    }, []);

    const subscriptionInfo = getSubscriptionInfo();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading subscription plans...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Choose Your Plan
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Unlock the full potential of your pre-professional journey with our comprehensive tracking and portfolio tools.
                    </p>
                </div>

                {/* Current Status */}
                {subscriptionInfo && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${subscriptionInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                                subscriptionInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                                    subscriptionInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                }`}>
                                <span className="mr-2">●</span>
                                {subscriptionInfo.message}
                            </div>
                            <button
                                onClick={refreshSubscription}
                                className="ml-4 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                )}

                {/* Current Active Subscription */}
                {currentSubscription && currentSubscription.subscription_status === 'active' && (
                    <div className="mb-8">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-8 w-8 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-semibold text-green-800">
                                            Active Subscription
                                        </h3>
                                        <div className="mt-1 text-sm text-green-700">
                                            <p className="font-medium">
                                                {currentSubscription.subscription_plan === 'monthly' ? 'Monthly Plan' :
                                                    currentSubscription.subscription_plan === 'yearly' ? 'Yearly Plan' :
                                                        currentSubscription.subscription_plan || 'Premium Plan'}
                                            </p>
                                            {currentSubscription.subscription_ends_at && (
                                                <p className="text-green-600">
                                                    Next billing: {new Date(currentSubscription.subscription_ends_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-800">
                                        {currentSubscription.subscription_plan === 'monthly' ? '$9.99' :
                                            currentSubscription.subscription_plan === 'yearly' ? '$99.99' :
                                                'Active'}
                                    </div>
                                    <div className="text-sm text-green-600">
                                        {currentSubscription.subscription_plan === 'monthly' ? 'per month' :
                                            currentSubscription.subscription_plan === 'yearly' ? 'per year' :
                                                'subscription'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Trial Status */}
                {trialStatus && !trialStatus.isExpired && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Free Trial Active
                                </h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <p>You have {trialStatus.daysRemaining} days remaining in your free trial.</p>
                                    <p>Trial ends on {trialStatus.trialEndDate.toLocaleDateString()}.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{error}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Subscription Plans */}
                {plans.length > 0 ? (
                    <div>
                        {currentSubscription && currentSubscription.subscription_status === 'active' ? (
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Upgrade Your Plan</h2>
                                <p className="text-gray-600 mb-6">You can upgrade or change your subscription plan at any time.</p>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
                                <p className="text-gray-600 mb-6">Select the plan that best fits your needs.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {plans.map((plan) => {
                                const isCurrentPlan = currentSubscription &&
                                    currentSubscription.subscription_status === 'active' &&
                                    currentSubscription.subscription_plan === plan.id;

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative bg-white rounded-2xl shadow-lg ${isCurrentPlan ? 'ring-2 ring-green-500 bg-green-50' :
                                            plan.popular ? 'ring-2 ring-blue-500' : ''
                                            }`}
                                    >
                                        {isCurrentPlan ? (
                                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                                <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                                                    Current Plan
                                                </span>
                                            </div>
                                        ) : plan.popular ? (
                                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                                                    Most Popular
                                                </span>
                                            </div>
                                        ) : null}

                                        <div className="p-8">
                                            <div className="text-center">
                                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                                    {plan.name}
                                                </h3>
                                                <p className="text-gray-600 mb-6">
                                                    {plan.description}
                                                </p>

                                                <div className="mb-6">
                                                    <span className="text-4xl font-bold text-gray-900">
                                                        ${plan.price}
                                                    </span>
                                                    <span className="text-gray-600 ml-1">
                                                        /{plan.interval}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => createCheckoutSession(plan.priceId)}
                                                    disabled={isProcessing || isCurrentPlan}
                                                    className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${isCurrentPlan
                                                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                                        : plan.popular
                                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                            : 'bg-gray-900 text-white hover:bg-gray-800'
                                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    {isProcessing ? 'Processing...' :
                                                        isCurrentPlan ? 'Current Plan' :
                                                            `Choose ${plan.name}`}
                                                </button>
                                            </div>


                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
                            <div className="flex items-center justify-center mb-4">
                                <svg className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Subscription Plans Not Available</h3>
                            <p className="text-yellow-700">
                                We're currently setting up our subscription plans. Please check back later or contact support for assistance.
                            </p>
                        </div>
                    </div>
                )}

                {/* Free Plan Info */}
                <div className="mt-12 text-center">
                    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Free Plan
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Limited features for getting started with your pre-professional journey.
                        </p>
                        <div className="text-sm text-gray-500">
                            <p>• Basic experience tracking (up to 5 entries)</p>
                            <p>• Simple GPA calculator</p>
                            <p>• Basic portfolio export</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscription;
