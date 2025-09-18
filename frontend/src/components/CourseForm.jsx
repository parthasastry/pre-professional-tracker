import React, { useState, useEffect } from 'react';

const CourseForm = ({ course, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        // Course Identification Fields
        institution: '',
        course_name: '',
        course_code: '',
        department: '',

        // Academic Status Fields
        academic_term: '',
        academic_year: '',
        academic_standing: '',

        // Grading and Credit Fields
        credits: '',
        credit_type: 'semester', // semester or quarter
        grade: '',
        repeated_course: false,
        original_course_id: '', // For linking repeated courses

        // Course Classification
        category: 'other',
        classification: '',

        // Additional fields
        description: '',
        semester_year: '' // Keep for backward compatibility
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

    // Comprehensive course classification options for medical school applications
    const classificationOptions = [
        // BCPM (Biology, Chemistry, Physics, Mathematics) - Science GPA
        { value: 'biology', label: 'Biology', category: 'bcpm' },
        { value: 'chemistry', label: 'Chemistry', category: 'bcpm' },
        { value: 'physics', label: 'Physics', category: 'bcpm' },
        { value: 'mathematics', label: 'Mathematics', category: 'bcpm' },
        { value: 'biochemistry', label: 'Biochemistry', category: 'bcpm' },
        { value: 'anatomy', label: 'Anatomy', category: 'bcpm' },
        { value: 'physiology', label: 'Physiology', category: 'bcpm' },
        { value: 'genetics', label: 'Genetics', category: 'bcpm' },
        { value: 'microbiology', label: 'Microbiology', category: 'bcpm' },
        { value: 'neuroscience', label: 'Neuroscience', category: 'bcpm' },
        { value: 'statistics', label: 'Statistics', category: 'bcpm' },

        // Non-Science GPA
        { value: 'english', label: 'English', category: 'non-science' },
        { value: 'psychology', label: 'Psychology', category: 'non-science' },
        { value: 'sociology', label: 'Sociology', category: 'non-science' },
        { value: 'history', label: 'History', category: 'non-science' },
        { value: 'philosophy', label: 'Philosophy', category: 'non-science' },
        { value: 'political_science', label: 'Political Science', category: 'non-science' },
        { value: 'economics', label: 'Economics', category: 'non-science' },
        { value: 'anthropology', label: 'Anthropology', category: 'non-science' },
        { value: 'art', label: 'Art', category: 'non-science' },
        { value: 'music', label: 'Music', category: 'non-science' },
        { value: 'theater', label: 'Theater', category: 'non-science' },
        { value: 'foreign_language', label: 'Foreign Language', category: 'non-science' },
        { value: 'religion', label: 'Religion', category: 'non-science' },
        { value: 'other', label: 'Other', category: 'other' }
    ];

    // Academic standing options
    const academicStandingOptions = [
        { value: 'freshman', label: 'Freshman' },
        { value: 'sophomore', label: 'Sophomore' },
        { value: 'junior', label: 'Junior' },
        { value: 'senior', label: 'Senior' },
        { value: 'post_baccalaureate', label: 'Post-baccalaureate' },
        { value: 'graduate', label: 'Graduate' },
        { value: 'other', label: 'Other' }
    ];

    // Academic term options
    const academicTermOptions = [
        { value: 'fall', label: 'Fall' },
        { value: 'spring', label: 'Spring' },
        { value: 'summer', label: 'Summer' },
        { value: 'winter', label: 'Winter' },
        { value: 'other', label: 'Other' }
    ];

    // Credit type options
    const creditTypeOptions = [
        { value: 'semester', label: 'Semester Hours' },
        { value: 'quarter', label: 'Quarter Hours' }
    ];

    // Legacy category options for backward compatibility
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
            const initialFormData = {
                // Course Identification Fields
                institution: course.institution || '',
                course_name: course.course_name || '',
                course_code: course.course_code || '',
                department: course.department || '',

                // Academic Status Fields
                academic_term: course.academic_term || '',
                academic_year: course.academic_year || '',
                academic_standing: course.academic_standing || '',

                // Grading and Credit Fields
                credits: course.credits || '',
                credit_type: course.credit_type || 'semester',
                grade: course.grade || '',
                repeated_course: course.repeated_course || false,
                original_course_id: course.original_course_id || '',

                // Course Classification
                category: course.category || 'other',
                classification: course.classification || '',

                // Additional fields
                description: course.description || '',
                semester_year: course.semester_year || '' // Keep for backward compatibility
            };
            setFormData(initialFormData);
        } else {
            // Set default values for new courses
            const currentYear = new Date().getFullYear();
            setFormData(prev => ({
                ...prev,
                academic_year: currentYear.toString(),
                academic_term: 'fall',
                academic_standing: 'freshman'
            }));
        }
    }, [course]);

    // Convert quarter hours to semester hours (1 quarter hour = 0.667 semester hours)
    const convertCredits = (credits, creditType) => {
        if (!credits || isNaN(credits)) return 0;
        const numCredits = parseFloat(credits);
        return creditType === 'quarter' ? (numCredits * 0.667).toFixed(2) : numCredits;
    };

    // Calculate semester equivalent credits
    const semesterCredits = convertCredits(formData.credits, formData.credit_type);

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

        // Always required fields (core course information)
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

        // For new courses, require all comprehensive fields
        // For existing courses, make new fields optional to allow gradual migration
        if (!course) {
            // New course - require all comprehensive fields
            if (!formData.institution.trim()) {
                newErrors.institution = 'Institution is required';
            }

            if (!formData.department.trim()) {
                newErrors.department = 'Department/Subject is required';
            }

            if (!formData.academic_term) {
                newErrors.academic_term = 'Academic term is required';
            }

            if (!formData.academic_year.trim()) {
                newErrors.academic_year = 'Academic year is required';
            }

            if (!formData.academic_standing) {
                newErrors.academic_standing = 'Academic standing is required';
            }

            if (!formData.classification) {
                newErrors.classification = 'Course classification is required';
            }
        } else {
            // Existing course - make new fields optional but validate format if provided
            if (formData.institution && !formData.institution.trim()) {
                newErrors.institution = 'Institution cannot be empty';
            }

            if (formData.department && !formData.department.trim()) {
                newErrors.department = 'Department/Subject cannot be empty';
            }

            if (formData.academic_year && !formData.academic_year.trim()) {
                newErrors.academic_year = 'Academic year cannot be empty';
            }
        }

        // Validate academic year format if provided
        if (formData.academic_year && !/^\d{4}$/.test(formData.academic_year)) {
            newErrors.academic_year = 'Academic year must be a 4-digit year (e.g., 2024)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            // Create semester_year for backward compatibility
            const semesterYear = `${formData.academic_term}_${formData.academic_year}`;

            // Prepare submission data with all fields
            const submissionData = {
                ...formData,
                semester_year: semesterYear,
                semester_credits: semesterCredits,
                // Auto-populate category based on classification
                category: formData.classification ?
                    classificationOptions.find(opt => opt.value === formData.classification)?.category || 'other'
                    : formData.category
            };

            onSave(submissionData);
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
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Course Identification Section */}
                        <div className="border-b border-gray-200 pb-6">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Course Identification</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Institution */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Institution {!course && '*'}
                                        {course && <span className="text-xs text-gray-500 ml-1">(Optional - helps with organization)</span>}
                                    </label>
                                    <input
                                        type="text"
                                        name="institution"
                                        value={formData.institution}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.institution ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="e.g., University of Texas at Austin"
                                    />
                                    {errors.institution && (
                                        <p className="mt-1 text-sm text-red-600">{errors.institution}</p>
                                    )}
                                </div>

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
                                        Course Number *
                                    </label>
                                    <input
                                        type="text"
                                        name="course_code"
                                        value={formData.course_code}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.course_code ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="e.g., BIOL 1301"
                                    />
                                    {errors.course_code && (
                                        <p className="mt-1 text-sm text-red-600">{errors.course_code}</p>
                                    )}
                                </div>

                                {/* Department/Subject */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Department/Subject {!course && '*'}
                                        {course && <span className="text-xs text-gray-500 ml-1">(Optional - helps with classification)</span>}
                                    </label>
                                    <input
                                        type="text"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.department ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="e.g., Biology, Chemistry, Mathematics"
                                    />
                                    {errors.department && (
                                        <p className="mt-1 text-sm text-red-600">{errors.department}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Academic Status Section */}
                        <div className="border-b border-gray-200 pb-6">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Academic Status</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Academic Term */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Academic Term {!course && '*'}
                                        {course && <span className="text-xs text-gray-500 ml-1">(Optional)</span>}
                                    </label>
                                    <select
                                        name="academic_term"
                                        value={formData.academic_term}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.academic_term ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                    >
                                        <option value="">Select Term</option>
                                        {academicTermOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.academic_term && (
                                        <p className="mt-1 text-sm text-red-600">{errors.academic_term}</p>
                                    )}
                                </div>

                                {/* Academic Year */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Academic Year {!course && '*'}
                                        {course && <span className="text-xs text-gray-500 ml-1">(Optional)</span>}
                                    </label>
                                    <input
                                        type="text"
                                        name="academic_year"
                                        value={formData.academic_year}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.academic_year ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                        placeholder="e.g., 2024"
                                        maxLength="4"
                                    />
                                    {errors.academic_year && (
                                        <p className="mt-1 text-sm text-red-600">{errors.academic_year}</p>
                                    )}
                                </div>

                                {/* Academic Standing */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Academic Standing {!course && '*'}
                                        {course && <span className="text-xs text-gray-500 ml-1">(Optional)</span>}
                                    </label>
                                    <select
                                        name="academic_standing"
                                        value={formData.academic_standing}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.academic_standing ? 'border-red-300' : 'border-gray-300'
                                            }`}
                                    >
                                        <option value="">Select Standing</option>
                                        {academicStandingOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.academic_standing && (
                                        <p className="mt-1 text-sm text-red-600">{errors.academic_standing}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Grading and Credit Section */}
                        <div className="border-b border-gray-200 pb-6">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Grading and Credits</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Credit Hours */}
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

                                {/* Credit Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Credit Type
                                    </label>
                                    <select
                                        name="credit_type"
                                        value={formData.credit_type}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {creditTypeOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Grade */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Official Letter Grade *
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
                            </div>

                            {/* Quarter to Semester Conversion Display */}
                            {formData.credit_type === 'quarter' && formData.credits && (
                                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm text-yellow-800">
                                            <strong>{formData.credits}</strong> quarter hours = <strong>{semesterCredits}</strong> semester hours (for AACOMAS)
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Repeated Course */}
                            <div className="mt-6">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="repeated_course"
                                        checked={formData.repeated_course}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            repeated_course: e.target.checked
                                        }))}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-2 block text-sm text-gray-900">
                                        This is a repeated course
                                    </label>
                                </div>
                                {formData.repeated_course && (
                                    <div className="mt-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Original Course ID (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            name="original_course_id"
                                            value={formData.original_course_id}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter the course_id of the original attempt"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Course Classification Section */}
                        <div className="border-b border-gray-200 pb-6">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Course Classification</h4>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Course Classification {!course && '*'}
                                    {course && <span className="text-xs text-gray-500 ml-1">(Optional - helps with GPA calculations)</span>}
                                </label>
                                <select
                                    name="classification"
                                    value={formData.classification}
                                    onChange={handleChange}
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.classification ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="">Select Classification</option>
                                    {classificationOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label} ({option.category === 'bcpm' ? 'BCPM' : option.category === 'non-science' ? 'Non-Science' : 'Other'})
                                        </option>
                                    ))}
                                </select>
                                {errors.classification && (
                                    <p className="mt-1 text-sm text-red-600">{errors.classification}</p>
                                )}
                                <p className="mt-1 text-sm text-gray-500">
                                    This classification determines whether the course counts toward your BCPM (Science) GPA or Non-Science GPA for medical school applications.
                                </p>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h4>
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
                                        {formData.credit_type === 'quarter' && (
                                            <span> (Semester equivalent: {semesterCredits} credits)</span>
                                        )}
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




