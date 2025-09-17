import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const GoalsManagement = ({ onGoalsUpdated, onClose }) => {
    const { user } = useAuth();
    const [goals, setGoals] = useState({
        shadowing: {
            target_hours: 0,
            current_hours: 0,
            is_custom: false
        },
        volunteering: {
            target_hours: 0,
            current_hours: 0,
            is_custom: false
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [academicYear, setAcademicYear] = useState('');

    // Load existing goals and get current academic year from backend
    useEffect(() => {
        const loadGoals = async () => {
            try {
                setLoading(true);
                setError(null);

                const userId = user.userId || user.username || user.sub;

                // Get current academic year from backend
                const academicYearResponse = await api.getCurrentAcademicYear(userId);
                const currentYear = academicYearResponse.academic_year;
                setAcademicYear(currentYear);

                // Load goals for the current academic year
                const goalsData = await api.getGoals(userId, currentYear);

                if (goalsData.goals) {
                    setGoals(goalsData.goals);
                }
            } catch (err) {
                console.error('Error loading goals:', err);
                setError('Failed to load goals. Using default values.');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadGoals();
        }
    }, [user]);

    const handleGoalChange = (category, field, value) => {
        setGoals(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: field === 'target_hours' ? parseInt(value) || 0 : value,
                is_custom: true // Mark as custom when user modifies
            }
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const userId = user.userId || user.username || user.sub;
            const universityId = user.universityId;

            const goalsData = {
                user_id: userId,
                university_id: universityId,
                academic_year: academicYear,
                goals: goals
            };

            await api.createOrUpdateGoals(goalsData);

            if (onGoalsUpdated) {
                onGoalsUpdated();
            }

            if (onClose) {
                onClose();
            }
        } catch (err) {
            console.error('Error saving goals:', err);
            setError('Failed to save goals. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const resetToDefaults = () => {
        setGoals({
            shadowing: {
                target_hours: 0,
                current_hours: 0,
                is_custom: false
            },
            volunteering: {
                target_hours: 0,
                current_hours: 0,
                is_custom: false
            }
        });
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-600">Loading goals...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Set Your Goals
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Academic Year: {academicYear}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Goals Form */}
                    <div className="space-y-6">
                        {/* Shadowing Goals */}
                        <div className="bg-green-50 rounded-lg p-6">
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900">Shadowing Goals</h4>
                                    <p className="text-sm text-gray-600">Track your shadowing experiences</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Target Hours
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            value={goals.shadowing.target_hours || ''}
                                            onChange={(e) => handleGoalChange('shadowing', 'target_hours', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-500">hours</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Progress
                                    </label>
                                    <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600">
                                        {goals.shadowing.current_hours} hours completed
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Volunteering Goals */}
                        <div className="bg-purple-50 rounded-lg p-6">
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900">Volunteering Goals</h4>
                                    <p className="text-sm text-gray-600">Track your volunteer experiences</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Target Hours
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            value={goals.volunteering.target_hours || ''}
                                            onChange={(e) => handleGoalChange('volunteering', 'target_hours', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-500">hours</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Progress
                                    </label>
                                    <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600">
                                        {goals.volunteering.current_hours} hours completed
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
                        <button
                            onClick={resetToDefaults}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                        >
                            Reset to Defaults
                        </button>

                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {saving ? 'Saving...' : 'Save Goals'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalsManagement;
