import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../hooks/useUniversity';

const Navigation = ({ user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { setUser, setIsAuthenticated } = useAuth();

    // Fetch university data if user has university_id
    const { university, loading: universityLoading } = useUniversity(user?.universityId);

    const handleSignOut = async () => {
        try {
            await signOut();
            // Update the auth context to clear user data
            setUser(null);
            setIsAuthenticated(false);
            // Close mobile menu if open
            setIsMobileMenuOpen(false);
            // Navigate to login
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const navigationItems = [
        { name: 'Home', path: '/', public: true },
        { name: 'Dashboard', path: '/dashboard', public: false },
        { name: 'Experiences', path: '/experiences', public: false },
        { name: 'Courses', path: '/courses', public: false },
        { name: 'GPA Calculator', path: '/gpa', public: false },
        { name: 'Portfolio', path: '/portfolio', public: false },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="bg-white shadow-lg border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo and Brand */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <button
                                onClick={() => navigate('/')}
                                className="flex flex-col items-center"
                            >
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <span className="font-bold text-xl">PPT</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900 leading-tight">
                                    Pre-Professional Tracker
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {navigationItems.map((item) => {
                                // Show public items or authenticated items
                                if (item.public || user) {
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => navigate(item.path)}
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive(item.path)
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                                }`}
                                        >
                                            {item.name}
                                        </button>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>

                    {/* User Menu / Auth Buttons */}
                    <div className="hidden md:block">
                        <div className="ml-4 flex items-center md:ml-6">
                            {user ? (
                                <div className="flex items-center space-x-4">
                                    {/* University Badge */}
                                    {user.universityId && (
                                        <div className="hidden lg:flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <span className="text-sm text-blue-700 font-medium">
                                                {universityLoading ? (
                                                    <span className="animate-pulse">Loading...</span>
                                                ) : university?.name || user.universityId}
                                            </span>
                                        </div>
                                    )}

                                    {/* User Info */}
                                    <div className="flex items-center space-x-3">
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900">
                                                {user.given_name} {user.family_name}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize">
                                                {user.userType || 'Student'}
                                            </p>

                                        </div>

                                        {/* Profile Avatar */}
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {user.given_name?.[0]}{user.family_name?.[0]}
                                            </span>
                                        </div>

                                        {/* Sign Out Button */}
                                        <button
                                            onClick={handleSignOut}
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/login')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                                >
                                    Sign In
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="bg-gray-100 inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMobileMenuOpen ? (
                                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
                        {navigationItems.map((item) => {
                            if (item.public || user) {
                                return (
                                    <button
                                        key={item.name}
                                        onClick={() => {
                                            navigate(item.path);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${isActive(item.path)
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                            }`}
                                    >
                                        {item.name}
                                    </button>
                                );
                            }
                            return null;
                        })}

                        {/* Mobile User Section */}
                        {user ? (
                            <div className="pt-4 pb-3 border-t border-gray-200">
                                <div className="flex items-center px-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm font-medium">
                                            {user.given_name?.[0]}{user.family_name?.[0]}
                                        </span>
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-base font-medium text-gray-800">
                                            {user.given_name} {user.family_name}
                                        </div>
                                        <div className="text-sm text-gray-500 capitalize">
                                            {user.userType || 'Student'}
                                        </div>
                                        {user.universityId && (
                                            <div className="text-xs text-blue-600 font-medium">
                                                {universityLoading ? (
                                                    <span className="animate-pulse">Loading...</span>
                                                ) : university?.name || user.universityId}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 px-2">
                                    <button
                                        onClick={handleSignOut}
                                        className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="pt-4 pb-3 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        navigate('/login');
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                    Sign In
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navigation;