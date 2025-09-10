import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const Terms: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-clearcause-muted via-white to-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Terms of Service
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                These terms govern your use of ClearCause and the services we provide. 
                Please read them carefully.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Last updated: September 10, 2024
              </p>
            </div>
          </div>
        </section>

        {/* Terms Content */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceptance of Terms</h2>
                  <p className="text-gray-600 leading-relaxed">
                    By accessing and using ClearCause, you accept and agree to be bound by the terms 
                    and provision of this agreement. If you do not agree to abide by the above, 
                    please do not use this service.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Use License</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Permission is granted to temporarily use ClearCause for personal, 
                    non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>modify or copy the materials</li>
                    <li>use the materials for any commercial purpose or for any public display</li>
                    <li>attempt to reverse engineer any software contained on the website</li>
                    <li>remove any copyright or other proprietary notations from the materials</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Donations and Payments</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    When you make a donation through ClearCause:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>Donations are final and non-refundable except in cases of fraud or error</li>
                    <li>Funds are held in escrow until campaign milestones are verified</li>
                    <li>You will receive tax-deductible receipts for eligible donations</li>
                    <li>Payment processing fees may apply</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">User Accounts</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    When you create an account with us, you must provide accurate and complete information. 
                    You are responsible for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>Maintaining the confidentiality of your account credentials</li>
                    <li>All activities that occur under your account</li>
                    <li>Notifying us immediately of any unauthorized use</li>
                    <li>Ensuring your contact information remains current</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Charity Responsibilities</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Charities using ClearCause agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>Provide accurate information about their organization and campaigns</li>
                    <li>Use donated funds solely for stated campaign purposes</li>
                    <li>Submit required milestone evidence in a timely manner</li>
                    <li>Maintain valid charitable status and required licenses</li>
                    <li>Respond to donor inquiries and verification requests</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Prohibited Uses</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    You may not use ClearCause for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-600">
                    <li>Any unlawful purpose or to solicit others to perform unlawful acts</li>
                    <li>Violating any international, federal, provincial, or state regulations or laws</li>
                    <li>Transmitting or procuring the sending of any advertising or promotional material</li>
                    <li>Impersonating or attempting to impersonate another person or organization</li>
                    <li>Engaging in any other conduct that restricts or inhibits anyone's use of the website</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
                  <p className="text-gray-600 leading-relaxed">
                    In no event shall ClearCause or its suppliers be liable for any damages 
                    (including, without limitation, damages for loss of data or profit, or due to 
                    business interruption) arising out of the use or inability to use ClearCause, 
                    even if ClearCause or an authorized representative has been notified orally or 
                    in writing of the possibility of such damage.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law</h2>
                  <p className="text-gray-600 leading-relaxed">
                    These terms and conditions are governed by and construed in accordance with the 
                    laws of California, United States, and you irrevocably submit to the exclusive 
                    jurisdiction of the courts in that state or location.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
                  <p className="text-gray-600 leading-relaxed">
                    If you have any questions about these Terms of Service, please contact us at:
                  </p>
                  <div className="mt-4 p-4 bg-clearcause-muted rounded-lg">
                    <p className="text-gray-700">
                      <strong>Email:</strong> legal@clearcause.com<br />
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

export default Terms;
