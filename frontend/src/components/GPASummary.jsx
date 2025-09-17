import React from 'react';

const GPASummary = ({ gpaData }) => {
    if (!gpaData) return null;

    const formatGPA = (gpa) => {
        return gpa ? gpa.toFixed(3) : '0.000';
    };

    const getGPAColor = (gpa) => {
        if (gpa >= 3.7) return 'text-green-600';
        if (gpa >= 3.0) return 'text-blue-600';
        if (gpa >= 2.0) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'complete': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-yellow-100 text-yellow-800';
            case 'not_started': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'complete': return '✓';
            case 'in_progress': return '⏳';
            case 'not_started': return '○';
            default: return '○';
        }
    };

    return (
        <div className="mb-8">
            {/* Main GPA Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Cumulative GPA */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Cumulative GPA</p>
                            <p className={`text-2xl font-semibold ${getGPAColor(gpaData.cumulative)}`}>
                                {formatGPA(gpaData.cumulative)}
                            </p>
                            <p className="text-sm text-gray-500">
                                {gpaData.total_credits} credit hours
                            </p>
                        </div>
                    </div>
                </div>

                {/* Science GPA */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Science GPA</p>
                            <p className={`text-2xl font-semibold ${getGPAColor(gpaData.science)}`}>
                                {formatGPA(gpaData.science)}
                            </p>
                            <p className="text-sm text-gray-500">
                                {gpaData.science_credits} science credits
                            </p>
                        </div>
                    </div>
                </div>

                {/* Total Courses */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Total Courses</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {Object.values(gpaData.breakdown?.by_semester || {}).reduce((total, semester) => total + (semester.courses?.length || 0), 0)}
                            </p>
                            <p className="text-sm text-gray-500">
                                across all semesters
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Prerequisite Status */}
            {gpaData.prerequisite_status && Object.keys(gpaData.prerequisite_status).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Prerequisite Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(gpaData.prerequisite_status).map(([subject, status]) => (
                            <div key={subject} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-gray-900 capitalize">
                                        {subject.replace('_', ' ')}
                                    </h4>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                                        <span className="mr-1">{getStatusIcon(status.status)}</span>
                                        {status.status.replace('_', ' ')}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-600">
                                    <div className="mb-1">
                                        <span className="font-medium">{status.completed.length}</span> of <span className="font-medium">{status.required.length}</span> completed
                                    </div>

                                    {status.completed.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-500 mb-1">Completed:</p>
                                            <ul className="text-xs space-y-1">
                                                {status.completed.map((course, index) => (
                                                    <li key={index} className="text-green-600">
                                                        {course.course} ({course.grade}) - {course.credits}cr
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {status.missing.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-500 mb-1">Still needed:</p>
                                            <ul className="text-xs space-y-1">
                                                {status.missing.map((course, index) => (
                                                    <li key={index} className="text-gray-500">
                                                        {course}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Semester Breakdown */}
            {gpaData.breakdown?.by_semester && Object.keys(gpaData.breakdown.by_semester).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Semester Breakdown</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Semester
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        GPA
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Credits
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Courses
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Object.entries(gpaData.breakdown.by_semester)
                                    .sort(([a], [b]) => b.localeCompare(a))
                                    .map(([semester, data]) => (
                                        <tr key={semester}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {semester}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-semibold ${getGPAColor(data.gpa)}`}>
                                                    {formatGPA(data.gpa)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {data.credits}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {data.courses?.length || 0}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Category Breakdown */}
            {gpaData.breakdown?.by_category && Object.keys(gpaData.breakdown.by_category).length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Category Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(gpaData.breakdown.by_category).map(([category, data]) => (
                            <div key={category} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-gray-900 capitalize">
                                        {category.replace('_', ' ')}
                                    </h4>
                                    <span className={`text-sm font-semibold ${getGPAColor(data.gpa)}`}>
                                        {formatGPA(data.gpa)}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <div>{data.credits} credit hours</div>
                                    <div>{data.courses?.length || 0} courses</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GPASummary;


