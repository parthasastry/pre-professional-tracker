import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { useAuth } from '../contexts/AuthContext';
import { useUniversity } from '../hooks/useUniversity';
import { useTrialStatus } from '../hooks/useTrialStatus';

const Navigation = ({ user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { setUser, setIsAuthenticated } = useAuth();

    // Fetch university data if user has university_id
    const { university, loading: universityLoading } = useUniversity(user?.universityId);

    // Get subscription/trial status
    const { getStatusBadge, isTrialExpired } = useTrialStatus();

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

    // Main navigation items (always visible)
    const mainNavItems = [
        { name: 'Home', path: '/', public: true },
        { name: 'Dashboard', path: '/dashboard', public: false },
    ];

    // Secondary navigation items (grouped under a dropdown or secondary menu)
    const secondaryNavItems = [
        { name: 'Experiences', path: '/experiences', public: false, icon: '📝' },
        { name: 'Courses', path: '/courses', public: false, icon: '📚' },
        { name: 'GPA Calculator', path: '/gpa', public: false, icon: '🧮' },
        { name: 'Portfolio', path: '/portfolio', public: false, icon: '📄' },
    ];

    // User-specific items
    const userNavItems = [
        { name: 'Subscription', path: '/subscription', public: false, icon: '💳' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo and Brand */}
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center space-x-3 group"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center group-hover:from-blue-700 group-hover:to-blue-800 transition-all duration-200">
                                <span className="font-bold text-white text-lg">PPT</span>
                            </div>
                            <div className="hidden sm:block">
                                <div className="text-lg font-bold text-gray-900">Pre-Professional Tracker</div>
                                <div className="text-xs text-gray-500 -mt-1">Track your journey</div>
                            </div>
                        </button>
                    </div>

                    {/* Desktop Navigation - Main Items */}
                    <div className="hidden lg:block">
                        <div className="flex items-center space-x-1">
                            {mainNavItems.map((item) => {
                                if (item.public || user) {
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => navigate(item.path)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(item.path)
                                                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }`}
                                        >
                                            {item.name}
                                        </button>
                                    );
                                }
                                return null;
                            })}

                            {/* Secondary Navigation Dropdown */}
                            {user && (
                                <div className="relative group">
                                    <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 flex items-center space-x-1">
                                        <span>Tools</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                        <div className="py-2">
                                            {secondaryNavItems.map((item) => (
                                                <button
                                                    key={item.name}
                                                    onClick={() => navigate(item.path)}
                                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-3 ${isActive(item.path) ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                                                        }`}
                                                >
                                                    <span className="text-lg">{item.icon}</span>
                                                    <span>{item.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Menu / Auth Buttons */}
                    <div className="flex items-center space-x-3">
                        {user ? (
                            <>
                                {/* Status Badge - Compact */}
                                {(() => {
                                    const statusBadge = getStatusBadge();
                                    return (
                                        <div className={`hidden xl:flex items-center space-x-2 ${statusBadge.bgColor} px-3 py-1.5 rounded-full`}>
                                            <div className={`w-2 h-2 ${statusBadge.color === 'green' ? 'bg-green-500' : statusBadge.color === 'red' ? 'bg-red-500' : statusBadge.color === 'blue' ? 'bg-blue-500' : 'bg-gray-500'} rounded-full`}></div>
                                            <span className={`text-xs ${statusBadge.textColor} font-medium`}>
                                                {statusBadge.text}
                                            </span>
                                        </div>
                                    );
                                })()}

                                {/* User Profile Dropdown */}
                                <div className="relative group">
                                    <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {user.given_name?.[0]}{user.family_name?.[0]}
                                            </span>
                                        </div>
                                        <div className="hidden sm:block text-left">
                                            <div className="text-sm font-medium text-gray-900">
                                                {user.given_name} {user.family_name}
                                            </div>
                                            <div className="text-xs text-gray-500 capitalize">
                                                {user.userType || 'Student'}
                                            </div>
                                        </div>
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* User Dropdown Menu */}
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                        <div className="py-2">
                                            {/* University Info */}
                                            {user.universityId && (
                                                <div className="px-4 py-3 border-b border-gray-100">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <span className="text-sm text-blue-700 font-medium">
                                                            {universityLoading ? (
                                                                <span className="animate-pulse">Loading...</span>
                                                            ) : university?.name || user.universityId}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* User Items */}
                                            {userNavItems.map((item) => (
                                                <button
                                                    key={item.name}
                                                    onClick={() => navigate(item.path)}
                                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-3 ${isActive(item.path) ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                                                        }`}
                                                >
                                                    <span className="text-lg">{item.icon}</span>
                                                    <span>{item.name}</span>
                                                </button>
                                            ))}

                                            {/* Sign Out */}
                                            <div className="border-t border-gray-100 mt-2 pt-2">
                                                <button
                                                    onClick={handleSignOut}
                                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-3"
                                                >
                                                    <span className="text-lg">🚪</span>
                                                    <span>Sign Out</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm"
                            >
                                Sign In
                            </button>
                        )}

                        {/* Mobile menu button */}
                        <div className="lg:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMobileMenuOpen ? (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden">
                    <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
                        {/* Main Navigation */}
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main</div>
                            {mainNavItems.map((item) => {
                                if (item.public || user) {
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => {
                                                navigate(item.path);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${isActive(item.path)
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            <span>{item.name}</span>
                                        </button>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        {/* Tools Section */}
                        {user && (
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tools</div>
                                {secondaryNavItems.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => {
                                            navigate(item.path);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${isActive(item.path)
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <span>{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* User Section */}
                        {user ? (
                            <div className="space-y-2 border-t border-gray-200 pt-4">
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Account</div>

                                {/* User Info */}
                                <div className="px-4 py-3 bg-white rounded-lg border border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {user.given_name?.[0]}{user.family_name?.[0]}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-base font-medium text-gray-900">
                                                {user.given_name} {user.family_name}
                                            </div>
                                            <div className="text-sm text-gray-500 capitalize">
                                                {user.userType || 'Student'}
                                            </div>
                                            {user.universityId && (
                                                <div className="text-xs text-blue-600 font-medium mt-1">
                                                    {universityLoading ? (
                                                        <span className="animate-pulse">Loading...</span>
                                                    ) : university?.name || user.universityId}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    {(() => {
                                        const statusBadge = getStatusBadge();
                                        return (
                                            <div className={`inline-flex items-center space-x-2 ${statusBadge.bgColor} px-3 py-1.5 rounded-full mt-3`}>
                                                <div className={`w-2 h-2 ${statusBadge.color === 'green' ? 'bg-green-500' : statusBadge.color === 'red' ? 'bg-red-500' : statusBadge.color === 'blue' ? 'bg-blue-500' : 'bg-gray-500'} rounded-full`}></div>
                                                <span className={`text-xs ${statusBadge.textColor} font-medium`}>
                                                    {statusBadge.text}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* User Actions */}
                                {userNavItems.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => {
                                            navigate(item.path);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${isActive(item.path)
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <span>{item.name}</span>
                                    </button>
                                ))}

                                <button
                                    onClick={handleSignOut}
                                    className="w-full text-left px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-3"
                                >
                                    <span className="text-lg">🚪</span>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        ) : (
                            <div className="border-t border-gray-200 pt-4">
                                <button
                                    onClick={() => {
                                        navigate('/login');
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200"
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