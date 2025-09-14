import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';

const SubscriptionContext = createContext();

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};

export const SubscriptionProvider = ({ children }) => {
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [trialStatus, setTrialStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Calculate trial status
    const calculateTrialStatus = (createdAt, trialEndsAt) => {
        const now = new Date();
        const trialEnd = new Date(trialEndsAt);
        const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

        return {
            isActive: now < trialEnd,
            daysRemaining: Math.max(0, daysRemaining),
            isExpired: now >= trialEnd,
            trialEndDate: trialEnd
        };
    };

    // Fetch subscription data from user attributes or API
    const fetchSubscriptionData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Get user attributes from Cognito
            const userAttributes = await fetchUserAttributes();

            // Extract subscription-related attributes
            const subscriptionData = {
                plan: userAttributes['custom:plan'] || 'free',
                subscriptionStatus: userAttributes['custom:subscription_status'] || 'trial',
                trialEndsAt: userAttributes['custom:trial_ends_at'],
                stripeCustomerId: userAttributes['custom:stripe_customer_id'],
                stripeSubscriptionId: userAttributes['custom:stripe_subscription_id'],
                subscriptionPlan: userAttributes['custom:subscription_plan'],
                subscriptionEndsAt: userAttributes['custom:subscription_ends_at']
            };

            // Calculate trial status
            let trialStatus = null;
            if (subscriptionData.subscriptionStatus === 'trial' && subscriptionData.trialEndsAt) {
                trialStatus = calculateTrialStatus(new Date().toISOString(), subscriptionData.trialEndsAt);
            }

            setSubscriptionStatus(subscriptionData);
            setTrialStatus(trialStatus);
        } catch (err) {
            console.error('Error fetching subscription data:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Check if user needs to subscribe
    const needsSubscription = () => {
        if (!subscriptionStatus || !trialStatus) return false;

        // If user has active subscription, no need to subscribe
        if (subscriptionStatus.subscriptionStatus === 'active') return false;

        // If trial is expired, user needs to subscribe
        if (subscriptionStatus.subscriptionStatus === 'trial' && trialStatus.isExpired) return true;

        return false;
    };

    // Get subscription display info
    const getSubscriptionInfo = () => {
        if (!subscriptionStatus) return null;

        if (subscriptionStatus.subscriptionStatus === 'active') {
            return {
                type: 'active',
                plan: subscriptionStatus.subscriptionPlan || subscriptionStatus.plan,
                message: 'Active Subscription',
                color: 'green'
            };
        }

        if (subscriptionStatus.subscriptionStatus === 'trial' && trialStatus) {
            if (trialStatus.isExpired) {
                return {
                    type: 'expired',
                    plan: 'Free Trial',
                    message: 'Trial Expired',
                    color: 'red'
                };
            } else {
                return {
                    type: 'trial',
                    plan: 'Free Trial',
                    message: `${trialStatus.daysRemaining} days remaining`,
                    color: 'blue'
                };
            }
        }

        return {
            type: 'free',
            plan: 'Free',
            message: 'Free Plan',
            color: 'gray'
        };
    };

    // Refresh subscription data
    const refreshSubscription = () => {
        fetchSubscriptionData();
    };

    useEffect(() => {
        fetchSubscriptionData();
    }, []);

    const value = {
        subscriptionStatus,
        trialStatus,
        isLoading,
        error,
        needsSubscription,
        getSubscriptionInfo,
        refreshSubscription
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export default SubscriptionContext;
