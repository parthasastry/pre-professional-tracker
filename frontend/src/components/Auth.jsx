
import React, { useEffect, useState } from 'react'
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth'
import { Authenticator } from '@aws-amplify/ui-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useUniversities from '../hooks/useUniversities'

// University Selector Component
const UniversitySelector = () => {
    const { universities, loading, error } = useUniversities();

    if (loading) {
        return (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    University *
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100">
                    Loading universities...
                </div>
            </div>
        );
    }

    return (
        <div className="mb-4">
            <label htmlFor="custom:university_id" className="block text-sm font-medium text-gray-700 mb-2">
                University *
            </label>
            <select
                id="custom:university_id"
                name="custom:university_id"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="">Select your university</option>
                {universities.map((university) => (
                    <option key={university.university_id} value={university.university_id}>
                        {university.name}
                    </option>
                ))}
            </select>
            {error && (
                <p className="mt-1 text-sm text-red-600">Error loading universities: {error}</p>
            )}
        </div>
    );
};

// Custom components for signup
const components = {
    SignUp: {
        Header() {
            return (
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Join your university's pre-professional community
                    </p>
                </div>
            )
        },
        Footer() {
            return (
                <div className="text-center mt-4 text-sm text-gray-600">
                    {/* First Name field */}
                    <div className="mb-4">
                        <label htmlFor="given_name" className="block text-sm font-medium text-gray-700 mb-2">
                            First Name *
                        </label>
                        <input
                            type="text"
                            id="given_name"
                            name="given_name"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your first name"
                        />
                    </div>

                    {/* Last Name field */}
                    <div className="mb-4">
                        <label htmlFor="family_name" className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name *
                        </label>
                        <input
                            type="text"
                            id="family_name"
                            name="family_name"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your last name"
                        />
                    </div>

                    {/* University selection */}
                    <UniversitySelector />

                    {/* User type selection */}
                    <div className="mb-4">
                        <label htmlFor="custom:user_type" className="block text-sm font-medium text-gray-700 mb-2">
                            User Type *
                        </label>
                        <select
                            id="custom:user_type"
                            name="custom:user_type"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select your role</option>
                            <option value="student">Student</option>
                            <option value="advisor">Advisor</option>
                        </select>
                    </div>

                    <div className="mt-4 text-sm text-gray-600">
                        By signing up, you agree to our Terms of Service and Privacy Policy
                    </div>
                </div>
            )
        }
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
                navigate('/experiences');
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
                <p className="mt-4 text-gray-600">Redirecting to experiences...</p>
            </div>
        </div>
    );
};

// Login component with Authenticator
const Login = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuth();

    // If already authenticated, redirect to experiences
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/experiences');
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
            <style>{`
                       /* Move the Create Account button to the bottom */
                       [data-amplify-authenticator] [data-amplify-router] form {
                           display: flex;
                           flex-direction: column;
                       }
                       
                       /* Hide the default button position */
                       [data-amplify-authenticator] [data-amplify-router] form > button[type="submit"] {
                           order: 999;
                           margin-top: 1rem;
                       }
                       
                       /* Ensure proper spacing */
                       [data-amplify-authenticator] [data-amplify-router] form > div:last-of-type {
                           margin-bottom: 1rem;
                       }
                   `}</style>
            <Authenticator
                components={components}
            >
                {({ user }) => <AuthenticatedRedirect user={user} />}
            </Authenticator>
        </div>
    );
};

export default Login;