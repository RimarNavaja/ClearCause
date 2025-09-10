import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const Privacy: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-clearcause-muted via-white to-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Privacy Policy
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Your privacy is important to us. This policy explains how we collect, 
                use, and protect your personal information.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Last updated: September 10, 2024
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Policy Content */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    We collect information you provide directly to us, such as when you create an account, 
                    make a donation, or contact us for support.
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>Personal information (name, email address, phone number)</li>
                    <li>Payment information (processed securely by our payment partners)</li>
                    <li>Donation history and preferences</li>
                    <li>Communication preferences</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    We use the information we collect to provide, maintain, and improve our services:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>Process donations and provide donation receipts</li>
                    <li>Send impact updates and campaign notifications</li>
                    <li>Provide customer support</li>
                    <li>Improve our platform and services</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Sharing</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    We do not sell, trade, or otherwise transfer your personal information to third parties, 
                    except in the following circumstances:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>With your explicit consent</li>
                    <li>To process payments (with secure payment processors)</li>
                    <li>To comply with legal requirements</li>
                    <li>To protect our rights and safety</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
                  <p className="text-gray-600 leading-relaxed">
                    We implement appropriate technical and organizational measures to protect your personal 
                    information against unauthorized access, alteration, disclosure, or destruction. This includes 
                    encryption, secure servers, and regular security audits.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    You have the right to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>Access your personal information</li>
                    <li>Correct inaccurate information</li>
                    <li>Delete your personal information</li>
                    <li>Object to processing of your information</li>
                    <li>Data portability</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking</h2>
                  <p className="text-gray-600 leading-relaxed">
                    We use cookies and similar technologies to improve your experience on our platform, 
                    analyze usage patterns, and provide personalized content. You can control cookie 
                    settings through your browser preferences.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
                  <p className="text-gray-600 leading-relaxed">
                    If you have any questions about this Privacy Policy or our data practices, 
                    please contact us at:
                  </p>
                  <div className="mt-4 p-4 bg-clearcause-muted rounded-lg">
                    <p className="text-gray-700">
                      <strong>Email:</strong> privacy@clearcause.com<br />
                      <strong>Address:</strong> 123 Transparency Street, San Francisco, CA 94102
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
