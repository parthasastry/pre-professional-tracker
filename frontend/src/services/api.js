// src/services/api.js
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = import.meta.env.VITE_BASE_API_URL;

export const api = {
    async request(endpoint, options = {}) {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (!token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Specific API methods
    async getUniversity(universityId) {
        return this.request(`/universities/${universityId}`);
    },

    async getUniversities() {
        return this.request('/universities');
    },

    // Goals API methods
    async getCurrentAcademicYear(userId) {
        return this.request(`/user-goals/${userId}/current-year`);
    },

    async getGoals(userId, academicYear = null) {
        const endpoint = academicYear
            ? `/user-goals/${userId}/${academicYear}`
            : `/user-goals/${userId}`;
        return this.request(endpoint);
    },

    async createOrUpdateGoals(goalsData) {
        return this.request('/user-goals', {
            method: 'POST',
            body: JSON.stringify(goalsData)
        });
    },

    async updateGoals(userId, academicYear, goalsData) {
        return this.request(`/user-goals/${userId}/${academicYear}`, {
            method: 'PUT',
            body: JSON.stringify(goalsData)
        });
    },

    // Goals Progress API methods
    async getGoalsProgress(userId, academicYear = null) {
        const endpoint = academicYear
            ? `/goals-progress/${userId}/${academicYear}`
            : `/goals-progress/${userId}`;
        return this.request(endpoint);
    },

    async calculateBulkProgress(userIds, academicYear = null) {
        return this.request('/goals-progress/calculate', {
            method: 'POST',
            body: JSON.stringify({
                user_ids: userIds,
                academic_year: academicYear
            })
        });
    }
};