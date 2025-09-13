import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useUniversity = (universityId) => {
    const [university, setUniversity] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!universityId) {
            setUniversity(null);
            return;
        }

        const fetchUniversity = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await api.getUniversity(universityId);
                setUniversity(data);
            } catch (err) {
                console.error('Error fetching university:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUniversity();
    }, [universityId]);

    return { university, loading, error };
};
