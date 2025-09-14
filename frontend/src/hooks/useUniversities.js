import { useState, useEffect } from 'react';

const useUniversities = () => {
    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUniversities = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get API URL from environment
                const apiUrl = import.meta.env.VITE_BASE_API_URL;
                const response = await fetch(`${apiUrl}/universities`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setUniversities(data.items || []);
            } catch (err) {
                console.error('Error fetching universities:', err);
                setError(err.message);

                // Fallback to static list if API fails
                setUniversities([
                    { university_id: 'default-university', name: 'Default University' },
                    { university_id: 'harvard-university', name: 'Harvard University' },
                    { university_id: 'stanford-university', name: 'Stanford University' },
                    { university_id: 'mit', name: 'Massachusetts Institute of Technology' },
                    { university_id: 'uc-berkeley', name: 'UC Berkeley' },
                    { university_id: 'yale-university', name: 'Yale University' },
                    { university_id: 'princeton-university', name: 'Princeton University' },
                    { university_id: 'columbia-university', name: 'Columbia University' },
                    { university_id: 'university-of-chicago', name: 'University of Chicago' },
                    { university_id: 'caltech', name: 'California Institute of Technology' },
                    { university_id: 'johns-hopkins', name: 'Johns Hopkins University' },
                    { university_id: 'duke-university', name: 'Duke University' },
                    { university_id: 'northwestern-university', name: 'Northwestern University' },
                    { university_id: 'brown-university', name: 'Brown University' },
                    { university_id: 'vanderbilt-university', name: 'Vanderbilt University' },
                    { university_id: 'rice-university', name: 'Rice University' },
                    { university_id: 'washington-university', name: 'Washington University in St. Louis' },
                    { university_id: 'cornell-university', name: 'Cornell University' },
                    { university_id: 'university-of-pennsylvania', name: 'University of Pennsylvania' },
                    { university_id: 'dartmouth-college', name: 'Dartmouth College' },
                    { university_id: 'emory-university', name: 'Emory University' },
                    { university_id: 'georgetown-university', name: 'Georgetown University' },
                    { university_id: 'carnegie-mellon', name: 'Carnegie Mellon University' },
                    { university_id: 'university-of-virginia', name: 'University of Virginia' },
                    { university_id: 'university-of-california-los-angeles', name: 'UCLA' },
                    { university_id: 'university-of-michigan', name: 'University of Michigan' },
                    { university_id: 'university-of-north-carolina', name: 'UNC Chapel Hill' },
                    { university_id: 'georgia-institute-of-technology', name: 'Georgia Tech' },
                    { university_id: 'university-of-texas-austin', name: 'UT Austin' },
                    { university_id: 'university-of-wisconsin-madison', name: 'UW Madison' },
                    { university_id: 'university-of-illinois-urbana', name: 'UIUC' },
                    { university_id: 'purdue-university', name: 'Purdue University' },
                    { university_id: 'university-of-florida', name: 'University of Florida' },
                    { university_id: 'university-of-washington', name: 'University of Washington' },
                    { university_id: 'university-of-southern-california', name: 'USC' },
                    { university_id: 'new-york-university', name: 'NYU' },
                    { university_id: 'boston-university', name: 'Boston University' },
                    { university_id: 'northeastern-university', name: 'Northeastern University' },
                    { university_id: 'university-of-rochester', name: 'University of Rochester' },
                    { university_id: 'case-western-reserve', name: 'Case Western Reserve University' },
                    { university_id: 'tulane-university', name: 'Tulane University' },
                    { university_id: 'university-of-miami', name: 'University of Miami' },
                    { university_id: 'baylor-college-of-medicine', name: 'Baylor College of Medicine' },
                    { university_id: 'other-university', name: 'Other (Please specify in support ticket)' }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchUniversities();
    }, []);

    return { universities, loading, error };
};

export default useUniversities;
