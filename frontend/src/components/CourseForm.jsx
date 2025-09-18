import React, { useState, useEffect } from 'react';

const CourseForm = ({ course, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        course_name: '',
        course_code: '',
        credits: '',
        grade: '',
        semester_year: '',
        category: 'other',
        description: ''
    });
    const [errors, setErrors] = useState({});

    // Grade options with GPA points
    const gradeOptions = [
        { value: 'A+', label: 'A+', points: 4.0 },
        { value: 'A', label: 'A', points: 4.0 },
        { value: 'A-', label: 'A-', points: 3.7 },
        { value: 'B+', label: 'B+', points: 3.3 },
        { value: 'B', label: 'B', points: 3.0 },
        { value: 'B-', label: 'B-', points: 2.7 },
        { value: 'C+', label: 'C+', points: 2.3 },
        { value: 'C', label: 'C', points: 2.0 },
        { value: 'C-', label: 'C-', points: 1.7 },
        { value: 'D+', label: 'D+', points: 1.3 },
        { value: 'D', label: 'D', points: 1.0 },
        { value: 'F', label: 'F', points: 0.0 }
    ];

    const categoryOptions = [
        { value: 'biology', label: 'Biology' },
        { value: 'chemistry', label: 'Chemistry' },
        { value: 'physics', label: 'Physics' },
        { value: 'mathematics', label: 'Mathematics' },
        { value: 'english', label: 'English' },
        { value: 'social_sciences', label: 'Social Sciences' },
        { value: 'humanities', label: 'Humanities' },
        { value: 'other', label: 'Other' }
    ];

    // Initialize form data
    useEffect(() => {
        if (course) {
            setFormData({
                course_name: course.course_name || '',
                course_code: course.course_code || '',
                credits: course.credits || '',
                grade: course.grade || '',
                semester_year: course.semester_year || '',
                category: course.category || 'other',
                description: course.description || ''
            });
        }
    }, [course]);

    // Calculate GPA points when grade changes
    useEffect(() => {
        const selectedGrade = gradeOptions.find(option => option.value === formData.grade);
        if (selectedGrade) {
            setFormData(prev => ({
                ...prev,
                gpa_points: selectedGrade.points
            }));
        }
    }, [formData.grade]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.course_name.trim()) {
            newErrors.course_name = 'Course name is required';
        }

        if (!formData.course_code.trim()) {
            newErrors.course_code = 'Course code is required';
        }

        if (!formData.credits || isNaN(formData.credits) || parseFloat(formData.credits) <= 0) {
            newErrors.credits = 'Valid credit hours are required';
        }

        if (!formData.grade) {
            newErrors.grade = 'Grade is required';
        }

        if (!formData.semester_year.trim()) {
            newErrors.semester_year = 'Semester/Year is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            onSave(formData);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-gray-900">
                            {course ? 'Edit Course' : 'Add New Course'}
                        </h3>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Course Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Course Name *
                                </label>
                                <input
                                    type="text"
                                    name="course_name"
                                    value={formData.course_name}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.course_name ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="e.g., General Biology I"
                                />
                                {errors.course_name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.course_name}</p>
                                )}
                            </div>

                            {/* Course Code */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Course Code *
                                </label>
                                <input
                                    type="text"
                                    name="course_code"
                                    value={formData.course_code}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.course_code ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="e.g., BIOL 101"
                                />
                                {errors.course_code && (
                                    <p className="mt-1 text-sm text-red-600">{errors.course_code}</p>
                                )}
                            </div>

                            {/* Credits */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Credit Hours *
                                </label>
                                <input
                                    type="number"
                                    name="credits"
                                    value={formData.credits}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.5"
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.credits ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="e.g., 4"
                                />
                                {errors.credits && (
                                    <p className="mt-1 text-sm text-red-600">{errors.credits}</p>
                                )}
                            </div>

                            {/* Grade */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Grade *
                                </label>
                                <select
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.grade ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="">Select Grade</option>
                                    {gradeOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label} ({option.points} GPA points)
                                        </option>
                                    ))}
                                </select>
                                {errors.grade && (
                                    <p className="mt-1 text-sm text-red-600">{errors.grade}</p>
                                )}
                            </div>

                            {/* Semester/Year */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Semester/Year *
                                </label>
                                <input
                                    type="text"
                                    name="semester_year"
                                    value={formData.semester_year}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.semester_year ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="e.g., Fall 2024, Spring 2025"
                                />
                                {errors.semester_year && (
                                    <p className="mt-1 text-sm text-red-600">{errors.semester_year}</p>
                                )}
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {categoryOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description (Optional)
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Additional notes about this course..."
                            />
                        </div>

                        {/* GPA Points Display */}
                        {formData.gpa_points !== undefined && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm text-blue-800">
                                        This grade will contribute <strong>{formData.gpa_points}</strong> GPA points per credit hour.
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                            >
                                {course ? 'Update Course' : 'Add Course'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CourseForm;




