import React, { useState, useEffect } from 'react';

const SessionForm = ({ experience, session, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        date: '',
        hours: '',
        notes: '',
        supervisor: '',
        location: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (session) {
            setFormData({
                date: session.date ? session.date.split('T')[0] : '',
                hours: session.hours || '',
                notes: session.notes || '',
                supervisor: session.supervisor || '',
                location: session.location || ''
            });
        } else {
            // Set default date to today for new sessions
            setFormData(prev => ({
                ...prev,
                date: new Date().toISOString().split('T')[0]
            }));
        }
    }, [session]);

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

        if (!formData.date) {
            newErrors.date = 'Date is required';
        }

        if (!formData.hours || formData.hours <= 0) {
            newErrors.hours = 'Hours must be greater than 0';
        }

        if (formData.date && new Date(formData.date) > new Date()) {
            newErrors.date = 'Date cannot be in the future';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const submitData = {
                ...formData,
                hours: parseFloat(formData.hours),
                experience_id: experience.experience_id,
                user_id: experience.user_id,
                university_id: experience.university_id,
                category: experience.category
            };

            await onSave(submitData);
        } catch (error) {
            console.error('Error saving session:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                {session ? 'Edit Session' : 'Add New Session'}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {experience.title} - {experience.organization}
                            </p>
                        </div>
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
                            {/* Date */}
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                                    Session Date *
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    max={new Date().toISOString().split('T')[0]}
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.date ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                />
                                {errors.date && (
                                    <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                                )}
                            </div>

                            {/* Hours */}
                            <div>
                                <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-2">
                                    Hours *
                                </label>
                                <input
                                    type="number"
                                    id="hours"
                                    name="hours"
                                    value={formData.hours}
                                    onChange={handleChange}
                                    min="0.5"
                                    step="0.5"
                                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.hours ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                    placeholder="2.5"
                                />
                                {errors.hours && (
                                    <p className="mt-1 text-sm text-red-600">{errors.hours}</p>
                                )}
                            </div>

                            {/* Supervisor */}
                            <div>
                                <label htmlFor="supervisor" className="block text-sm font-medium text-gray-700 mb-2">
                                    Supervisor/Contact
                                </label>
                                <input
                                    type="text"
                                    id="supervisor"
                                    name="supervisor"
                                    value={formData.supervisor}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Dr. Smith, Nurse Johnson"
                                />
                            </div>

                            {/* Location */}
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Cardiology Ward, Emergency Room"
                                />
                            </div>

                            {/* Notes */}
                            <div className="md:col-span-2">
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                                    Session Notes
                                </label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="What did you observe? What procedures did you see? What did you learn? Key takeaways from this session..."
                                />
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {isSubmitting ? 'Saving...' : (session ? 'Update Session' : 'Add Session')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SessionForm;

