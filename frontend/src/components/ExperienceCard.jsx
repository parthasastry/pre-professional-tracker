import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import SessionForm from './SessionForm';

const ExperienceCard = ({ experience, onEdit, onDelete, onExperienceUpdate }) => {
    const [sessions, setSessions] = useState([]);
    const [showSessions, setShowSessions] = useState(false);
    const [showSessionForm, setShowSessionForm] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsError, setSessionsError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Fetch sessions for this experience
    const fetchSessions = async () => {
        try {
            setSessionsLoading(true);
            setSessionsError(null);
            const response = await api.getSessions(experience.experience_id);
            setSessions(response.items || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            setSessionsError(error.message);
        } finally {
            setSessionsLoading(false);
        }
    };

    // Load sessions when component mounts or when showing sessions
    useEffect(() => {
        if (showSessions && sessions.length === 0) {
            fetchSessions();
        }
    }, [showSessions]);

    // Handle session save (create or update)
    const handleSessionSave = async (sessionData) => {
        try {
            let response;
            if (editingSession) {
                response = await api.updateSession(editingSession.session_id, sessionData);
            } else {
                response = await api.createSession(sessionData);
            }

            // Show success message
            const action = editingSession ? 'updated' : 'added';
            const sessionDate = new Date(sessionData.date).toLocaleDateString();
            setSuccessMessage(`Session from ${sessionDate} has been ${action} successfully.`);

            // Refresh sessions immediately
            await fetchSessions();

            // Refresh experience data with a small delay
            setTimeout(async () => {
                if (onExperienceUpdate) {
                    await onExperienceUpdate();
                }
            }, 1000); // Increased delay to ensure backend has processed

            setShowSessionForm(false);
            setEditingSession(null);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (error) {
            console.error('Error saving session:', error);
            setSessionsError(error.message);
        }
    };

    // Handle session delete click
    const handleSessionDeleteClick = (session) => {
        setSessionToDelete(session);
        setShowDeleteConfirm(true);
    };

    // Handle session delete confirmation
    const handleSessionDeleteConfirm = async () => {
        if (!sessionToDelete) return;

        try {
            const response = await api.deleteSession(sessionToDelete.session_id);

            // Show success message
            setSuccessMessage(`Session from ${new Date(sessionToDelete.date).toLocaleDateString()} has been deleted successfully.`);

            // Close confirmation modal
            setShowDeleteConfirm(false);
            setSessionToDelete(null);

            // Refresh sessions immediately
            await fetchSessions();

            // Refresh experience data with a small delay
            setTimeout(async () => {
                if (onExperienceUpdate) {
                    await onExperienceUpdate();
                }
            }, 1000); // Increased delay to ensure backend has processed

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (error) {
            console.error('Error deleting session:', error);
            setSessionsError(error.message);
            setShowDeleteConfirm(false);
            setSessionToDelete(null);
        }
    };

    // Cancel session deletion
    const handleSessionDeleteCancel = () => {
        setShowDeleteConfirm(false);
        setSessionToDelete(null);
    };

    // Toggle sessions visibility
    const toggleSessions = () => {
        setShowSessions(!showSessions);
        if (!showSessions) {
            fetchSessions();
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'shadowing':
                return (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                );
            case 'volunteering':
                return (
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'shadowing':
                return 'bg-green-100 text-green-800';
            case 'volunteering':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getCategoryLabel = (category) => {
        switch (category) {
            case 'shadowing':
                return 'Shadowing';
            case 'volunteering':
                return 'Volunteering';
            default:
                return category;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(experience.category)}`}>
                            {getCategoryIcon(experience.category)}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                                {experience.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {experience.organization}
                            </p>
                        </div>
                    </div>
                    <div className="flex space-x-1">
                        <button
                            onClick={() => onEdit(experience)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                            title="Edit experience"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => onDelete(experience)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                            title="Delete experience"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-2-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Category Badge */}
                <div className="mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(experience.category)}`}>
                        {getCategoryLabel(experience.category)}
                    </span>
                </div>

                {/* Description */}
                {experience.description && (
                    <div className="mb-4">
                        <p className="text-sm text-gray-600 line-clamp-3">
                            {experience.description}
                        </p>
                    </div>
                )}

                {/* Details */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{experience.total_hours || experience.hours || 0}</span>
                        <span className="ml-1">hours</span>
                        {experience.session_count > 0 && (
                            <span className="ml-2 text-xs text-gray-500">
                                ({experience.session_count} session{experience.session_count !== 1 ? 's' : ''})
                            </span>
                        )}
                    </div>

                    {experience.start_date && (
                        <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Started {formatDate(experience.start_date)}</span>
                        </div>
                    )}

                    {experience.end_date && (
                        <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Ended {formatDate(experience.end_date)}</span>
                        </div>
                    )}

                    {experience.location && (
                        <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{experience.location}</span>
                        </div>
                    )}
                </div>

                {/* Sessions Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={toggleSessions}
                            className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            <svg className={`w-4 h-4 mr-1 transition-transform duration-200 ${showSessions ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            Sessions ({experience.session_count || 0})
                        </button>
                        <button
                            onClick={() => setShowSessionForm(true)}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors duration-200"
                        >
                            + Add Session
                        </button>
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="mb-3">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-2">
                                        <p className="text-xs font-medium text-green-800">{successMessage}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showSessions && (
                        <div className="space-y-2">
                            {sessionsLoading ? (
                                <div className="text-center py-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="text-xs text-gray-500 mt-1">Loading sessions...</p>
                                </div>
                            ) : sessionsError ? (
                                <div className="text-center py-2">
                                    <p className="text-xs text-red-600">Error loading sessions: {sessionsError}</p>
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="text-center py-2">
                                    <p className="text-xs text-gray-500">No sessions yet. Add your first session!</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {sessions.map((session) => (
                                        <div key={session.session_id} className="bg-gray-50 rounded p-2 text-xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-medium">{formatDate(session.date)}</span>
                                                        <span className="text-gray-500">•</span>
                                                        <span className="text-blue-600 font-medium">{session.hours}h</span>
                                                        {session.supervisor && (
                                                            <>
                                                                <span className="text-gray-500">•</span>
                                                                <span className="text-gray-600">{session.supervisor}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {session.notes && (
                                                        <p className="text-gray-600 mt-1 line-clamp-2">{session.notes}</p>
                                                    )}
                                                </div>
                                                <div className="flex space-x-1 ml-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingSession(session);
                                                            setShowSessionForm(true);
                                                        }}
                                                        className="text-gray-400 hover:text-blue-600 transition-colors duration-200"
                                                        title="Edit session"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleSessionDeleteClick(session)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors duration-200"
                                                        title="Delete session"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-2-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${experience.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                            }`}></div>
                        <span className="text-xs text-gray-500 capitalize">
                            {experience.status || 'active'}
                        </span>
                    </div>
                    <div className="text-xs text-gray-400">
                        {formatDate(experience.created_at)}
                    </div>
                </div>
            </div>

            {/* Session Form Modal */}
            {showSessionForm && (
                <SessionForm
                    experience={experience}
                    session={editingSession}
                    onSave={handleSessionSave}
                    onCancel={() => {
                        setShowSessionForm(false);
                        setEditingSession(null);
                    }}
                />
            )}

            {/* Session Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Session</h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500">
                                    Are you sure you want to delete the session from{' '}
                                    <strong>{sessionToDelete ? new Date(sessionToDelete.date).toLocaleDateString() : ''}</strong>?
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="items-center px-4 py-3">
                                <button
                                    onClick={handleSessionDeleteConfirm}
                                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={handleSessionDeleteCancel}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-24 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExperienceCard;
