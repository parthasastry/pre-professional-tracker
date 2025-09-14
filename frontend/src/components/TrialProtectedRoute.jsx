import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTrialStatus } from '../hooks/useTrialStatus';

const TrialProtectedRoute = ({ children, redirectTo = '/subscription' }) => {
    const { shouldRedirectToSubscription, isTrialExpired, isSubscriptionActive } = useTrialStatus();

    // If user needs subscription (trial expired), redirect to subscription page
    if (shouldRedirectToSubscription) {
        return <Navigate to={redirectTo} replace />;
    }

    // If user has active subscription or is in trial, allow access
    if (isSubscriptionActive || !isTrialExpired) {
        return children;
    }

    // Default fallback - redirect to subscription
    return <Navigate to={redirectTo} replace />;
};

export default TrialProtectedRoute;
