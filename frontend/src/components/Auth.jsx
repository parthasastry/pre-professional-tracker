
import React, { useEffect, useState } from 'react'
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth'
import { Authenticator } from '@aws-amplify/ui-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Custom authentication services configuration
const services = {
    async handleSignUp() {
        // Returning an error will prevent the sign-up process
        return {
            hasError: true,
            error: new Error('Sign up is disabled. Please contact your administrator for an account.')
        }
    }
}

// Custom components to hide the sign-up option
const components = {
    Footer() {
        return (
            <div className="text-center mt-4 text-sm text-gray-600">
                Contact your administrator for an account
            </div>
        )
    }
}

// AuthenticatedRedirect component to handle post-authentication navigation
const AuthenticatedRedirect = ({ user }) => {
    const navigate = useNavigate();
    const { setUser, setIsAuthenticated } = useAuth();

    useEffect(() => {
        // Update the auth context with the new user data
        const updateAuthContext = async () => {
            try {
                const userData = await getCurrentUser();
                const userAttributes = await fetchUserAttributes();

                const universityId = userAttributes['custom:university_id'];
                const userType = userAttributes['custom:user_type'];

                setUser({
                    ...userData,
                    universityId,
                    userType,
                    ...userAttributes
                });
                setIsAuthenticated(true);
                navigate('/dashboard');
            } catch (error) {
                console.error('Error updating auth context:', error);
            }
        };

        updateAuthContext();
    }, [navigate, setUser, setIsAuthenticated]);

    return (
        <div className="flex justify-center items-center h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
            </div>
        </div>
    );
};

// Login component with Authenticator
const Login = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();

    // If already authenticated, redirect to dashboard
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    // Show loading while checking auth status
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // If authenticated, don't render login form
    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="flex flex-col justify-center items-center min-h-screen w-full p-5">
            <Authenticator
                services={services}
                components={components}
                hideSignUp={true}
            >
                {({ user }) => <AuthenticatedRedirect user={user} />}
            </Authenticator>
        </div>
    );
};

export default Login;