import React from 'react';

const ExperienceCard = ({ experience, onEdit, onDelete }) => {
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
                        <span className="font-medium">{experience.hours}</span>
                        <span className="ml-1">hours</span>
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

                {/* Status */}
                <div className="flex items-center justify-between">
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
        </div>
    );
};

export default ExperienceCard;
