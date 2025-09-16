import React from 'react';

const GoalProgressCard = ({
    category,
    goal,
    progress,
    onEditClick,
    showEditButton = true
}) => {
    const getCategoryInfo = (category) => {
        switch (category) {
            case 'shadowing':
                return {
                    title: 'Shadowing Goal',
                    icon: (
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    ),
                    bgColor: 'bg-green-50',
                    iconBg: 'bg-green-100',
                    progressColor: 'bg-green-500',
                    textColor: 'text-green-600'
                };
            case 'volunteering':
                return {
                    title: 'Volunteering Goal',
                    icon: (
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    ),
                    bgColor: 'bg-purple-50',
                    iconBg: 'bg-purple-100',
                    progressColor: 'bg-purple-500',
                    textColor: 'text-purple-600'
                };
            default:
                return {
                    title: 'Goal',
                    icon: null,
                    bgColor: 'bg-gray-50',
                    iconBg: 'bg-gray-100',
                    progressColor: 'bg-gray-500',
                    textColor: 'text-gray-600'
                };
        }
    };

    const categoryInfo = getCategoryInfo(category);
    const percentage = Math.min(100, Math.round((progress.current_hours / goal.target_hours) * 100));
    const remaining = Math.max(0, goal.target_hours - progress.current_hours);
    const isComplete = progress.current_hours >= goal.target_hours;

    return (
        <div className={`${categoryInfo.bgColor} rounded-lg p-6`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className={`w-10 h-10 ${categoryInfo.iconBg} rounded-lg flex items-center justify-center mr-3`}>
                        {categoryInfo.icon}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">{categoryInfo.title}</h3>
                        <p className="text-sm text-gray-600">Academic Year {progress.academic_year || '2024-2025'}</p>
                    </div>
                </div>

                {showEditButton && onEditClick && (
                    <button
                        onClick={onEditClick}
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        title="Edit goals"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="text-2xl font-bold text-gray-900">
                        {progress.current_hours}/{goal.target_hours}
                    </div>
                    <div className="text-sm text-gray-500">hours</div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
                    <div className="text-sm text-gray-500">complete</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className={`${categoryInfo.progressColor} h-3 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>

            {/* Status and Info */}
            <div className="space-y-2">
                {isComplete ? (
                    <div className="flex items-center text-green-600 font-medium">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        🎉 Goal achieved!
                    </div>
                ) : (
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">{remaining} hours remaining</span>
                        {progress.daily_pace_needed > 0 && (
                            <span className="block mt-1">
                                Need {progress.daily_pace_needed.toFixed(1)} hours/day to reach goal
                            </span>
                        )}
                    </div>
                )}

                {/* On Track Indicator */}
                {!isComplete && (
                    <div className="flex items-center text-sm">
                        <div className={`w-2 h-2 rounded-full mr-2 ${progress.is_on_track ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className={progress.is_on_track ? 'text-green-600' : 'text-yellow-600'}>
                            {progress.is_on_track ? 'On track' : 'Behind pace'}
                        </span>
                    </div>
                )}

                {/* Time Progress */}
                {progress.time_progress !== undefined && (
                    <div className="text-xs text-gray-500">
                        {progress.time_progress.toFixed(1)}% through academic year
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoalProgressCard;
