import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { api } from '../services/api';
import ExperienceForm from './ExperienceForm';
import ExperienceCard from './ExperienceCard';
import GoalProgressCard from './GoalProgressCard';
import GoalsManagement from './GoalsManagement';

const Experiences = () => {
    const { user } = useAuth();
    const { isSubscriptionActive } = useTrialStatus();
    const [experiences, setExperiences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingExperience, setEditingExperience] = useState(null);
    const [filter, setFilter] = useState('all'); // all, shadowing, volunteering
    const [sortBy, setSortBy] = useState('date'); // date, hours, title
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [experienceToDelete, setExperienceToDelete] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Goals state
    const [goals, setGoals] = useState(null);
    const [goalsProgress, setGoalsProgress] = useState(null);
    const [showGoalsManagement, setShowGoalsManagement] = useState(false);
    const [goalsLoading, setGoalsLoading] = useState(false);

    // Fetch experiences from API
    const fetchExperiences = async () => {
        try {
            setLoading(true);
            setError(null);

            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                throw new Error('No authentication token available');
            }

            const apiUrl = import.meta.env.VITE_BASE_API_URL;
            const universityId = user.universityId;

            const url = new URL(`${apiUrl}/experiences`);
            if (filter !== 'all') {
                url.searchParams.append('category', filter);
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setExperiences(data.items || []);
        } catch (err) {
            console.error('Error fetching experiences:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle experience creation/update
    const handleExperienceSave = async (experienceData) => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                throw new Error('No authentication token available');
            }

            const apiUrl = import.meta.env.VITE_BASE_API_URL;
            const userId = user.userId || user.username || user.sub;
            const universityId = user.universityId;

            const payload = {
                ...experienceData,
                user_id: userId,
                university_id: universityId
            };

            const url = editingExperience
                ? `${apiUrl}/experiences/${editingExperience.experience_id}`
                : `${apiUrl}/experiences`;

            const response = await fetch(url, {
                method: editingExperience ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save experience');
            }

            // Refresh the experiences list and goals
            await fetchExperiences();
            await fetchGoals();
            setShowForm(false);
            setEditingExperience(null);
        } catch (err) {
            console.error('Error saving experience:', err);
            setError(err.message);
        }
    };

    // Handle experience update from child components (like when sessions change)
    const handleExperienceUpdate = async () => {
        await fetchExperiences();
        await fetchGoals();
    };

    // Handle experience deletion confirmation
    const handleDeleteClick = (experience) => {
        setExperienceToDelete(experience);
        setShowDeleteConfirm(true);
    };

    // Handle experience deletion
    const handleExperienceDelete = async () => {
        if (!experienceToDelete) return;

        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                throw new Error('No authentication token available');
            }

            const apiUrl = import.meta.env.VITE_BASE_API_URL;

            const response = await fetch(`${apiUrl}/experiences/${experienceToDelete.experience_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete experience');
            }

            // Show success message
            setSuccessMessage(`"${experienceToDelete.title}" has been deleted successfully.`);

            // Close delete confirmation
            setShowDeleteConfirm(false);
            setExperienceToDelete(null);

            // Refresh the experiences list and goals
            await fetchExperiences();
            await fetchGoals();

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (err) {
            console.error('Error deleting experience:', err);
            setError(err.message);
            setShowDeleteConfirm(false);
            setExperienceToDelete(null);
        }
    };

    // Cancel delete confirmation
    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
        setExperienceToDelete(null);
    };

    // Sort experiences
    const sortedExperiences = [...experiences].sort((a, b) => {
        switch (sortBy) {
            case 'date':
                return new Date(b.start_date || b.created_at) - new Date(a.start_date || a.created_at);
            case 'hours':
                return (b.total_hours || 0) - (a.total_hours || 0);
            case 'title':
                return a.title.localeCompare(b.title);
            default:
                return 0;
        }
    });

    // Fetch goals and progress
    const fetchGoals = async () => {
        try {
            setGoalsLoading(true);
            const userId = user.userId || user.username || user.sub;

            // Fetch goals and progress in parallel
            const [goalsData, progressData] = await Promise.all([
                api.getGoals(userId),
                api.getGoalsProgress(userId)
            ]);

            setGoals(goalsData.goals);
            setGoalsProgress(progressData.progress);
        } catch (err) {
            console.error('Error fetching goals:', err);
            // Don't show error for goals, just use default values
        } finally {
            setGoalsLoading(false);
        }
    };

    // Handle goals updated
    const handleGoalsUpdated = () => {
        fetchGoals();
    };

    // Calculate total hours by category from sessions
    const totalHours = experiences.reduce((total, exp) => total + (exp.total_hours || 0), 0);
    const shadowingHours = experiences
        .filter(exp => exp.category === 'shadowing')
        .reduce((total, exp) => total + (exp.total_hours || 0), 0);
    const volunteeringHours = experiences
        .filter(exp => exp.category === 'volunteering')
        .reduce((total, exp) => total + (exp.total_hours || 0), 0);

    useEffect(() => {
        if (user && user.universityId) {
            fetchExperiences();
            fetchGoals();
        }
    }, [user, filter]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading experiences...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Experiences</h1>
                            <p className="mt-2 text-gray-600">
                                Track your shadowing, volunteering, and other pre-professional activities
                            </p>
                        </div>
                        <div className="mt-4 sm:mt-0">
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add Experience</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Goals Progress Cards */}
                {goalsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-2 bg-gray-200 rounded w-full"></div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-2 bg-gray-200 rounded w-full"></div>
                        </div>
                    </div>
                ) : goals && goalsProgress ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Shadowing Goal */}
                        {goals.shadowing && goals.shadowing.target_hours > 0 ? (
                            <GoalProgressCard
                                category="shadowing"
                                goal={goals.shadowing}
                                progress={goalsProgress.shadowing}
                                onEditClick={() => setShowGoalsManagement(true)}
                            />
                        ) : (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                                <div className="flex items-center mb-4">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Shadowing Goal</h3>
                                        <p className="text-sm text-gray-600">Set your target hours</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <div className="flex items-center text-orange-600 mb-2">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span className="font-medium">Goal not set</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Set your shadowing hours goal to track your progress effectively.
                                    </p>
                                    <button
                                        onClick={() => setShowGoalsManagement(true)}
                                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span>Set Shadowing Goal</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Volunteering Goal */}
                        {goals.volunteering && goals.volunteering.target_hours > 0 ? (
                            <GoalProgressCard
                                category="volunteering"
                                goal={goals.volunteering}
                                progress={goalsProgress.volunteering}
                                onEditClick={() => setShowGoalsManagement(true)}
                            />
                        ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <div className="flex items-center mb-4">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Volunteering Goal</h3>
                                        <p className="text-sm text-gray-600">Set your target hours</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <div className="flex items-center text-blue-600 mb-2">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span className="font-medium">Goal not set</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Set your volunteering hours goal to track your progress effectively.
                                    </p>
                                    <button
                                        onClick={() => setShowGoalsManagement(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span>Set Volunteering Goal</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Set Your Goals</h3>
                            <p className="text-gray-600 mb-4">
                                Track your progress towards shadowing and volunteering goals for this academic year.
                            </p>
                            <button
                                onClick={() => setShowGoalsManagement(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                            >
                                Set Goals
                            </button>
                        </div>
                    </div>
                )}

                {/* Filters and Sort */}
                <div className="bg-white rounded-lg shadow mb-6 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex flex-wrap items-center space-x-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Experiences</option>
                                    <option value="shadowing">Shadowing</option>
                                    <option value="volunteering">Volunteering</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="date">Date</option>
                                    <option value="hours">Hours</option>
                                    <option value="title">Title</option>
                                </select>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500">
                            {experiences.length} experience{experiences.length !== 1 ? 's' : ''} found
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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

                {/* Experiences List */}
                {sortedExperiences.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-white rounded-lg shadow p-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No experiences found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {filter === 'all'
                                    ? 'Get started by adding your first experience.'
                                    : `No ${filter} experiences found. Try changing the filter or add a new experience.`
                                }
                            </p>
                            <div className="mt-6">
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                >
                                    Add Experience
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedExperiences.map((experience) => (
                            <ExperienceCard
                                key={experience.experience_id}
                                experience={experience}
                                onEdit={(exp) => {
                                    setEditingExperience(exp);
                                    setShowForm(true);
                                }}
                                onDelete={handleDeleteClick}
                                onExperienceUpdate={handleExperienceUpdate}
                            />
                        ))}
                    </div>
                )}

                {/* Experience Form Modal */}
                {showForm && (
                    <ExperienceForm
                        experience={editingExperience}
                        onSave={handleExperienceSave}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingExperience(null);
                        }}
                    />
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3 text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Experience</h3>
                                <div className="mt-2 px-7 py-3">
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to delete <strong>"{experienceToDelete?.title}"</strong>?
                                        This action cannot be undone.
                                    </p>
                                </div>
                                <div className="items-center px-4 py-3">
                                    <button
                                        onClick={handleExperienceDelete}
                                        className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={handleDeleteCancel}
                                        className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-24 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Goals Management Modal */}
                {showGoalsManagement && (
                    <GoalsManagement
                        onGoalsUpdated={handleGoalsUpdated}
                        onClose={() => setShowGoalsManagement(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default Experiences;
