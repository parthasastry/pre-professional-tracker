import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const features = [
        {
            icon: '📊',
            title: 'Track Your Progress',
            description: 'Monitor your shadowing hours, volunteer experiences, and academic achievements in one centralized platform.'
        },
        {
            icon: '🎓',
            title: 'GPA Management',
            description: 'Calculate and track your GPA with our intelligent calculator that handles different grading scales.'
        },
        {
            icon: '📋',
            title: 'Prerequisites Checklist',
            description: 'Stay on top of your pre-health prerequisites with our comprehensive tracking system.'
        },
        {
            icon: '📄',
            title: 'Portfolio Export',
            description: 'Generate professional PDF portfolios to showcase your achievements to admissions committees.'
        },
        {
            icon: '🏫',
            title: 'University Integration',
            description: 'Connect with your university community and access institution-specific resources and advisors.'
        },
        {
            icon: '📈',
            title: 'Analytics & Insights',
            description: 'Get detailed insights into your progress and identify areas for improvement.'
        }
    ];

    const stats = [
        { number: '10,000+', label: 'Students Tracked' },
        { number: '500+', label: 'Universities' },
        { number: '95%', label: 'Success Rate' },
        { number: '24/7', label: 'Support' }
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                            Your Pre-Professional
                            <span className="text-blue-600 block">Journey Starts Here</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                            Track your shadowing experiences, manage your GPA, and build a compelling portfolio
                            that stands out to admissions committees. Join thousands of pre-health students
                            who are already succeeding.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {isAuthenticated ? (
                                <button
                                    onClick={() => navigate('/experiences')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg"
                                >
                                    Go to Experiences
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg"
                                    >
                                        Get Started
                                    </button>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="bg-white hover:bg-gray-50 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg border-2 border-blue-600"
                                    >
                                        Learn More
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Everything You Need to Succeed
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Our comprehensive platform provides all the tools you need to track your
                            pre-professional journey and build a competitive application.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200">
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* University Integration Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                                University-Centric Design
                            </h2>
                            <p className="text-lg text-gray-600 mb-6">
                                Our platform is designed with universities in mind. Connect with your
                                institution's advisors, access university-specific resources, and
                                collaborate with fellow students in your program.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-center">
                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <span className="text-gray-700">Direct advisor communication</span>
                                </li>
                                <li className="flex items-center">
                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <span className="text-gray-700">University-specific requirements</span>
                                </li>
                                <li className="flex items-center">
                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <span className="text-gray-700">Peer collaboration tools</span>
                                </li>
                                <li className="flex items-center">
                                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <span className="text-gray-700">Institution analytics</span>
                                </li>
                            </ul>
                        </div>
                        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-8 rounded-2xl">
                            <div className="text-center">
                                <div className="text-6xl mb-4">🏫</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                    Join Your University Community
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Connect with students, advisors, and resources specific to your institution.
                                </p>

                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-blue-600">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Ready to Start Your Journey?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                        Join pre-health students who are already tracking their progress
                        and building competitive applications.
                    </p>
                    {!isAuthenticated && (
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-colors duration-200 shadow-lg"
                        >
                            Get Started Today
                        </button>
                    )}
                </div>
            </section>

            {/* Footer Info */}
            <section className="py-12 bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center text-gray-400">
                        <p className="text-lg mb-4">
                            Trusted by pre-health students at universities worldwide
                        </p>
                        <div className="flex justify-center space-x-8 text-sm">
                            <span>Privacy Policy</span>
                            <span>Terms of Service</span>
                            <span>Contact Support</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;