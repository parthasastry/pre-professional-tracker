import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        product: [
            { name: 'Features', href: '#' },
            { name: 'Pricing', href: '#' },
            { name: 'Documentation', href: '#' }
        ],
        company: [
            { name: 'About Us', href: '#' },
            { name: 'Careers', href: '#' },
            { name: 'Press', href: '#' },
            { name: 'Blog', href: '#' }
        ],
        support: [
            { name: 'Help Center', href: '#' },
            { name: 'Contact Us', href: '#' },
            { name: 'Status', href: '#' },
            { name: 'Community', href: '#' }
        ],
        legal: [
            { name: 'Privacy Policy', href: '#' },
            { name: 'Terms of Service', href: '#' },
            { name: 'Cookie Policy', href: '#' },
            { name: 'GDPR', href: '#' }
        ]
    };

    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {/* Bottom Section */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="text-gray-400 text-sm text-center md:text-left mb-4 md:mb-0">
                            © {currentYear} Pre-Professional Tracker. All rights reserved.
                        </div>
                        <div className="text-gray-400 text-sm text-center md:text-right">
                            Created by <span className="text-white font-medium">Vivek Amble</span> and <span className="text-white font-medium">Partha Sastry</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;