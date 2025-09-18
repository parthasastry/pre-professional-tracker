import React, { useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useAuth } from '../contexts/AuthContext';
import CourseForm from './CourseForm';

const GPA = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Filtering and sorting state
    const [filters, setFilters] = useState({
        search: '',
        classification: '',
        academicTerm: '',
        academicYear: '',
        grade: '',
        repeated: 'all'
    });
    const [sortBy, setSortBy] = useState('semester_year');
    const [sortOrder, setSortOrder] = useState('desc');

    // Fetch courses from API
    const fetchCourses = async () => {
        try {
            setLoading(true);
            setError(null);

            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                throw new Error('No authentication token available');
            }

            const apiUrl = import.meta.env.VITE_BASE_API_URL;
            const userId = user.userId || user.username || user.sub;
            const universityId = user.universityId;

            const response = await fetch(`${apiUrl}/courses?user_id=${userId}&university_id=${universityId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch courses');
            }

            const data = await response.json();
            setCourses(data.courses || []);
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort courses
    const filterAndSortCourses = (coursesList) => {
        let filtered = coursesList.filter(course => {
            // Search filter
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const searchableText = [
                    course.course_name,
                    course.course_code,
                    course.institution,
                    course.department,
                    course.classification
                ].join(' ').toLowerCase();

                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            // Classification filter
            if (filters.classification && course.classification !== filters.classification) {
                return false;
            }

            // Academic term filter
            if (filters.academicTerm && course.academic_term !== filters.academicTerm) {
                return false;
            }

            // Academic year filter
            if (filters.academicYear && course.academic_year !== filters.academicYear) {
                return false;
            }

            // Grade filter
            if (filters.grade && course.grade !== filters.grade) {
                return false;
            }

            // Repeated course filter
            if (filters.repeated === 'repeated' && !course.repeated_course) {
                return false;
            }
            if (filters.repeated === 'not_repeated' && course.repeated_course) {
                return false;
            }

            return true;
        });

        // Sort courses
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'course_name':
                    aValue = a.course_name.toLowerCase();
                    bValue = b.course_name.toLowerCase();
                    break;
                case 'grade':
                    const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
                    aValue = gradeOrder.indexOf(a.grade);
                    bValue = gradeOrder.indexOf(b.grade);
                    break;
                case 'credits':
                    aValue = parseFloat(a.credits) || 0;
                    bValue = parseFloat(b.credits) || 0;
                    break;
                case 'semester_year':
                    aValue = a.semester_year || a.academic_year || '';
                    bValue = b.semester_year || b.academic_year || '';
                    break;
                case 'classification':
                    aValue = a.classification || a.category || '';
                    bValue = b.classification || b.category || '';
                    break;
                default:
                    aValue = a[sortBy] || '';
                    bValue = b[sortBy] || '';
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    };

    // Update filtered courses when courses or filters change
    useEffect(() => {
        setFilteredCourses(filterAndSortCourses(courses));
    }, [courses, filters, sortBy, sortOrder]);


    // Handle course save
    const handleCourseSave = async (courseData) => {
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
                ...courseData
            };

            const url = editingCourse
                ? `${apiUrl}/courses/${editingCourse.course_id}`
                : `${apiUrl}/courses`;

            const response = await fetch(url, {
                method: editingCourse ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save course');
            }

            // Show success message
            setSuccessMessage(editingCourse ? 'Course updated successfully!' : 'Course added successfully!');

            // Refresh the courses list
            await fetchCourses();
            setShowForm(false);
            setEditingCourse(null);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (err) {
            console.error('Error saving course:', err);
            setError(err.message);
        }
    };

    // Handle course deletion confirmation
    const handleDeleteClick = (course) => {
        setCourseToDelete(course);
        setShowDeleteConfirm(true);
    };

    // Handle course deletion
    const handleCourseDelete = async () => {
        if (!courseToDelete) return;

        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                throw new Error('No authentication token available');
            }

            const apiUrl = import.meta.env.VITE_BASE_API_URL;

            const response = await fetch(`${apiUrl}/courses/${courseToDelete.course_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete course');
            }

            // Show success message
            setSuccessMessage(`"${courseToDelete.course_name}" has been deleted successfully.`);

            // Close delete confirmation
            setShowDeleteConfirm(false);
            setCourseToDelete(null);

            // Refresh the courses list
            await fetchCourses();

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (err) {
            console.error('Error deleting course:', err);
            setError(err.message);
            setShowDeleteConfirm(false);
            setCourseToDelete(null);
        }
    };

    // Cancel delete confirmation
    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
        setCourseToDelete(null);
    };

    useEffect(() => {
        if (user && user.universityId) {
            fetchCourses();
        }
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading courses...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">GPA Tracking</h1>
                    <p className="mt-2 text-gray-600">Track your courses and academic performance</p>
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

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-green-800">{successMessage}</p>
                            </div>
                        </div>
                    </div>
                )}


                {/* Courses Section */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">Your Courses</h2>
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Add Course</span>
                        </button>
                    </div>

                    {/* Filter and Sort Controls */}
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            {/* Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    placeholder="Course name, code, institution..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Classification Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
                                <select
                                    value={filters.classification}
                                    onChange={(e) => setFilters(prev => ({ ...prev, classification: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Classifications</option>
                                    <option value="biology">Biology</option>
                                    <option value="chemistry">Chemistry</option>
                                    <option value="physics">Physics</option>
                                    <option value="mathematics">Mathematics</option>
                                    <option value="english">English</option>
                                    <option value="psychology">Psychology</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* Academic Term Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                                <select
                                    value={filters.academicTerm}
                                    onChange={(e) => setFilters(prev => ({ ...prev, academicTerm: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Terms</option>
                                    <option value="fall">Fall</option>
                                    <option value="spring">Spring</option>
                                    <option value="summer">Summer</option>
                                    <option value="winter">Winter</option>
                                </select>
                            </div>

                            {/* Grade Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                                <select
                                    value={filters.grade}
                                    onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Grades</option>
                                    <option value="A+">A+</option>
                                    <option value="A">A</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B">B</option>
                                    <option value="B-">B-</option>
                                    <option value="C+">C+</option>
                                    <option value="C">C</option>
                                    <option value="C-">C-</option>
                                    <option value="D+">D+</option>
                                    <option value="D">D</option>
                                    <option value="F">F</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Academic Year Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                                <input
                                    type="text"
                                    value={filters.academicYear}
                                    onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                                    placeholder="e.g., 2024"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Repeated Course Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Repeated Courses</label>
                                <select
                                    value={filters.repeated}
                                    onChange={(e) => setFilters(prev => ({ ...prev, repeated: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Courses</option>
                                    <option value="repeated">Repeated Only</option>
                                    <option value="not_repeated">Not Repeated</option>
                                </select>
                            </div>

                            {/* Sort Controls */}
                            <div className="flex space-x-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="semester_year">Term/Year</option>
                                        <option value="course_name">Course Name</option>
                                        <option value="grade">Grade</option>
                                        <option value="credits">Credits</option>
                                        <option value="classification">Classification</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                                    >
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="mt-4 text-sm text-gray-600">
                            Showing {filteredCourses.length} of {courses.length} courses
                        </div>
                    </div>

                    {filteredCourses.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="bg-white rounded-lg shadow p-8">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">
                                    {courses.length === 0 ? 'No courses found' : 'No courses match your filters'}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {courses.length === 0
                                        ? 'Get started by adding your first course.'
                                        : 'Try adjusting your search criteria or clear the filters.'
                                    }
                                </p>
                                <div className="mt-6">
                                    {courses.length === 0 ? (
                                        <button
                                            onClick={() => setShowForm(true)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                        >
                                            Add Course
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setFilters({
                                                search: '',
                                                classification: '',
                                                academicTerm: '',
                                                academicYear: '',
                                                grade: '',
                                                repeated: 'all'
                                            })}
                                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Course Details
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Institution
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Credits
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Grade
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Term/Year
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Classification
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredCourses.map((course) => (
                                            <tr key={course.course_id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {course.course_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {course.course_code}
                                                        </div>
                                                        {course.department && (
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                {course.department}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm text-gray-900">
                                                        {course.institution || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm text-gray-900">
                                                        {course.credits}
                                                        {course.credit_type === 'quarter' && (
                                                            <div className="text-xs text-gray-500">
                                                                ({course.semester_credits || (course.credits * 0.667).toFixed(2)} sem)
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${course.grade === 'A' || course.grade === 'A+' ? 'bg-green-100 text-green-800' :
                                                        course.grade === 'B' || course.grade === 'B+' ? 'bg-blue-100 text-blue-800' :
                                                            course.grade === 'C' || course.grade === 'C+' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {course.grade}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm text-gray-900">
                                                        {course.academic_term ? `${course.academic_term.charAt(0).toUpperCase() + course.academic_term.slice(1)} ${course.academic_year}` : course.semester_year || 'N/A'}
                                                    </div>
                                                    {course.academic_standing && (
                                                        <div className="text-xs text-gray-500">
                                                            {course.academic_standing.charAt(0).toUpperCase() + course.academic_standing.slice(1)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col space-y-1">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${course.classification ?
                                                            (course.classification === 'biology' || course.classification === 'chemistry' || course.classification === 'physics' || course.classification === 'mathematics' || course.classification === 'biochemistry' || course.classification === 'anatomy' || course.classification === 'physiology' || course.classification === 'genetics' || course.classification === 'microbiology' || course.classification === 'neuroscience' || course.classification === 'statistics' ?
                                                                'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800') :
                                                            'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {course.classification ?
                                                                course.classification.charAt(0).toUpperCase() + course.classification.slice(1).replace('_', ' ') :
                                                                (course.category || 'Other')
                                                            }
                                                        </span>
                                                        {course.classification && (
                                                            <span className="text-xs text-gray-500">
                                                                {course.classification === 'biology' || course.classification === 'chemistry' || course.classification === 'physics' || course.classification === 'mathematics' || course.classification === 'biochemistry' || course.classification === 'anatomy' || course.classification === 'physiology' || course.classification === 'genetics' || course.classification === 'microbiology' || course.classification === 'neuroscience' || course.classification === 'statistics' ?
                                                                    'BCPM' : 'Non-Science'
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col space-y-1">
                                                        {course.repeated_course && (
                                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                                                Repeated
                                                            </span>
                                                        )}
                                                        {course.credit_type === 'quarter' && (
                                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                                Quarter
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCourse(course);
                                                                setShowForm(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                                            title="Edit course"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(course)}
                                                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                                            title="Delete course"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden space-y-4 p-4">
                                {filteredCourses.map((course) => (
                                    <div key={course.course_id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                                        <div className="p-4">
                                            {/* Course Header */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                        {course.course_name}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {course.course_code}
                                                    </p>
                                                    {course.department && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {course.department}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex space-x-2 ml-4">
                                                    <button
                                                        onClick={() => {
                                                            setEditingCourse(course);
                                                            setShowForm(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                                        title="Edit course"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(course)}
                                                        className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                                        title="Delete course"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Course Details Grid */}
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                {/* Institution */}
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Institution</p>
                                                    <p className="text-sm text-gray-900 mt-1">
                                                        {course.institution || 'N/A'}
                                                    </p>
                                                </div>

                                                {/* Credits */}
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Credits</p>
                                                    <p className="text-sm text-gray-900 mt-1">
                                                        {course.credits}
                                                        {course.credit_type === 'quarter' && (
                                                            <span className="text-xs text-gray-500 ml-1">
                                                                ({course.semester_credits || (course.credits * 0.667).toFixed(2)} sem)
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Grade */}
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Grade</p>
                                                    <div className="mt-1">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${course.grade === 'A' || course.grade === 'A+' ? 'bg-green-100 text-green-800' :
                                                            course.grade === 'B' || course.grade === 'B+' ? 'bg-blue-100 text-blue-800' :
                                                                course.grade === 'C' || course.grade === 'C+' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'
                                                            }`}>
                                                            {course.grade}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Term/Year */}
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Term/Year</p>
                                                    <p className="text-sm text-gray-900 mt-1">
                                                        {course.academic_term ? `${course.academic_term.charAt(0).toUpperCase() + course.academic_term.slice(1)} ${course.academic_year}` : course.semester_year || 'N/A'}
                                                    </p>
                                                    {course.academic_standing && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {course.academic_standing.charAt(0).toUpperCase() + course.academic_standing.slice(1)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Classification and Status */}
                                            <div className="flex flex-wrap gap-2">
                                                {/* Classification */}
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${course.classification ?
                                                    (course.classification === 'biology' || course.classification === 'chemistry' || course.classification === 'physics' || course.classification === 'mathematics' || course.classification === 'biochemistry' || course.classification === 'anatomy' || course.classification === 'physiology' || course.classification === 'genetics' || course.classification === 'microbiology' || course.classification === 'neuroscience' || course.classification === 'statistics' ?
                                                        'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800') :
                                                    'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {course.classification ?
                                                        course.classification.charAt(0).toUpperCase() + course.classification.slice(1).replace('_', ' ') :
                                                        (course.category || 'Other')
                                                    }
                                                </span>

                                                {/* BCPM/Non-Science indicator */}
                                                {course.classification && (
                                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                                                        {course.classification === 'biology' || course.classification === 'chemistry' || course.classification === 'physics' || course.classification === 'mathematics' || course.classification === 'biochemistry' || course.classification === 'anatomy' || course.classification === 'physiology' || course.classification === 'genetics' || course.classification === 'microbiology' || course.classification === 'neuroscience' || course.classification === 'statistics' ?
                                                            'BCPM' : 'Non-Science'
                                                        }
                                                    </span>
                                                )}

                                                {/* Status badges */}
                                                {course.repeated_course && (
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                                        Repeated
                                                    </span>
                                                )}
                                                {course.credit_type === 'quarter' && (
                                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        Quarter Hours
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Course Form Modal */}
                {showForm && (
                    <CourseForm
                        course={editingCourse}
                        onSave={handleCourseSave}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingCourse(null);
                        }}
                    />
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div className="mt-2 text-center">
                                    <h3 className="text-lg font-medium text-gray-900">Delete Course</h3>
                                    <div className="mt-2 px-7 py-3">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete "{courseToDelete?.course_name}"? This action cannot be undone.
                                        </p>
                                    </div>
                                    <div className="flex justify-center space-x-4 mt-4">
                                        <button
                                            onClick={handleDeleteCancel}
                                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCourseDelete}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GPA;