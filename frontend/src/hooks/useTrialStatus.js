import { useSubscription } from '../contexts/SubscriptionContext';

export const useTrialStatus = () => {
    const { trialStatus, subscriptionStatus, needsSubscription, getSubscriptionInfo } = useSubscription();

    const isTrialActive = trialStatus && trialStatus.isActive && !trialStatus.isExpired;
    const isTrialExpired = trialStatus && trialStatus.isExpired;
    const isSubscriptionActive = subscriptionStatus?.subscriptionStatus === 'active';
    const shouldRedirectToSubscription = needsSubscription();

    const getTrialMessage = () => {
        if (!trialStatus) return null;

        if (isTrialExpired) {
            return {
                type: 'expired',
                message: 'Your free trial has expired',
                color: 'red',
                action: 'Subscribe now to continue'
            };
        }

        if (isTrialActive) {
            return {
                type: 'active',
                message: `${trialStatus.daysRemaining} days left in your free trial`,
                color: 'blue',
                action: 'Upgrade anytime'
            };
        }

        return null;
    };

    const getStatusBadge = () => {
        if (isSubscriptionActive) {
            return {
                text: 'Active Subscription',
                color: 'green',
                bgColor: 'bg-green-100',
                textColor: 'text-green-800'
            };
        }

        if (isTrialExpired) {
            return {
                text: 'Trial Expired',
                color: 'red',
                bgColor: 'bg-red-100',
                textColor: 'text-red-800'
            };
        }

        if (isTrialActive) {
            return {
                text: `Trial: ${trialStatus.daysRemaining} days left`,
                color: 'blue',
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-800'
            };
        }

        return {
            text: 'Free Plan',
            color: 'gray',
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-800'
        };
    };

    return {
        trialStatus,
        isTrialActive,
        isTrialExpired,
        isSubscriptionActive,
        shouldRedirectToSubscription,
        getTrialMessage,
        getStatusBadge
    };
};

