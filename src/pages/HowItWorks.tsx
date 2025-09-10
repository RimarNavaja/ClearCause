import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, BarChart4, CreditCard, CheckCircle, Users, Eye, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const HowItWorks: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-clearcause-muted via-white to-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                How ClearCause Works
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We're revolutionizing charitable giving through radical transparency, 
                milestone-based funding, and real-time impact tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Process Steps */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                The ClearCause Process
              </h2>
              <p className="text-lg text-gray-600">
                Every donation follows our transparent, milestone-based approach
              </p>
            </div>

            <div className="space-y-16">
              {/* Step 1 */}
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <div className="lg:w-1/2">
                  <div className="flex items-center mb-4">
                    <div className="bg-clearcause-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mr-4">
                      1
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Charity Verification</h3>
                  </div>
                  <p className="text-gray-600 text-lg mb-6">
                    Every charity undergoes rigorous verification including legal status checks, 
                    financial audits, and impact assessments before joining our platform.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Legal registration verification</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Financial transparency audit</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Impact measurement capability</span>
                    </div>
                  </div>
                </div>
                <div className="lg:w-1/2">
                  <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                    <Shield className="h-16 w-16 text-clearcause-primary mx-auto mb-4" />
                    <h4 className="text-xl font-semibold mb-2">Verified Organizations</h4>
                    <p className="text-gray-600">Only 30% of applicants pass our verification process</p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
                <div className="lg:w-1/2">
                  <div className="flex items-center mb-4">
                    <div className="bg-clearcause-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mr-4">
                      2
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Campaign Creation</h3>
                  </div>
                  <p className="text-gray-600 text-lg mb-6">
                    Charities create detailed campaigns with specific milestones, timelines, 
                    and measurable outcomes. Each milestone must be verified before funds are released.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Clear milestone definitions</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Evidence requirements specified</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Timeline commitments</span>
                    </div>
                  </div>
                </div>
                <div className="lg:w-1/2">
                  <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                    <BarChart4 className="h-16 w-16 text-clearcause-primary mx-auto mb-4" />
                    <h4 className="text-xl font-semibold mb-2">Milestone Planning</h4>
                    <p className="text-gray-600">Average of 5-7 milestones per campaign</p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <div className="lg:w-1/2">
                  <div className="flex items-center mb-4">
                    <div className="bg-clearcause-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mr-4">
                      3
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Secure Donations</h3>
                  </div>
                  <p className="text-gray-600 text-lg mb-6">
                    Donors contribute to campaigns they care about. Funds are held in escrow 
                    and released only after milestone completion is verified.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Funds held in secure escrow</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Real-time donation tracking</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Instant donation receipts</span>
                    </div>
                  </div>
                </div>
                <div className="lg:w-1/2">
                  <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                    <CreditCard className="h-16 w-16 text-clearcause-primary mx-auto mb-4" />
                    <h4 className="text-xl font-semibold mb-2">Escrow Protection</h4>
                    <p className="text-gray-600">100% of donations protected until milestones verified</p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
                <div className="lg:w-1/2">
                  <div className="flex items-center mb-4">
                    <div className="bg-clearcause-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mr-4">
                      4
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Milestone Verification</h3>
                  </div>
                  <p className="text-gray-600 text-lg mb-6">
                    Our verification team reviews evidence submitted by charities for each milestone. 
                    Only verified milestones trigger fund release.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Independent verification team</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Photo and document evidence</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Third-party validation when needed</span>
                    </div>
                  </div>
                </div>
                <div className="lg:w-1/2">
                  <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                    <Eye className="h-16 w-16 text-clearcause-primary mx-auto mb-4" />
                    <h4 className="text-xl font-semibold mb-2">Rigorous Verification</h4>
                    <p className="text-gray-600">Average 2-3 days for milestone verification</p>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <div className="lg:w-1/2">
                  <div className="flex items-center mb-4">
                    <div className="bg-clearcause-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mr-4">
                      5
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Impact Tracking</h3>
                  </div>
                  <p className="text-gray-600 text-lg mb-6">
                    Donors receive real-time updates on their donation impact with photos, 
                    metrics, and stories from the field.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Real-time progress updates</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Photo evidence from the field</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-clearcause-success mr-3" />
                      <span>Detailed impact metrics</span>
                    </div>
                  </div>
                </div>
                <div className="lg:w-1/2">
                  <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                    <Clock className="h-16 w-16 text-clearcause-primary mx-auto mb-4" />
                    <h4 className="text-xl font-semibold mb-2">Live Updates</h4>
                    <p className="text-gray-600">Updates sent within 24 hours of milestone completion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why It Matters */}
        <section className="py-16 bg-clearcause-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Transparency Matters
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Traditional charity models often lack transparency, leading to donor skepticism and reduced giving.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">The Problem with Traditional Giving</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-red-100 rounded-full p-2 mr-4 mt-1">
                      <span className="text-red-600 font-bold">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Lack of Transparency</h4>
                      <p className="text-gray-600">Donors rarely know how their money is actually used</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-red-100 rounded-full p-2 mr-4 mt-1">
                      <span className="text-red-600 font-bold">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">High Administrative Costs</h4>
                      <p className="text-gray-600">Up to 30% of donations go to overhead expenses</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-red-100 rounded-full p-2 mr-4 mt-1">
                      <span className="text-red-600 font-bold">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">No Impact Tracking</h4>
                      <p className="text-gray-600">Difficult to measure real-world impact of donations</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">The ClearCause Solution</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-green-100 rounded-full p-2 mr-4 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">100% Transparency</h4>
                      <p className="text-gray-600">Track every dollar from donation to impact</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 rounded-full p-2 mr-4 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Low Platform Fee</h4>
                      <p className="text-gray-600">Only 1-3% platform fee, industry leading efficiency</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-green-100 rounded-full p-2 mr-4 mt-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Verified Impact</h4>
                      <p className="text-gray-600">Real-time tracking with photo and metric evidence</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-clearcause-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Experience Transparent Giving?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Join thousands of donors who are making verified impact through our transparent platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/campaigns">
                <Button className="bg-clearcause-accent hover:bg-clearcause-accent/90 text-white font-medium px-8 py-6 flex items-center">
                  Browse Campaigns
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="border-2 border-white text-white hover:bg-white hover:text-clearcause-primary px-8 py-6 bg-transparent transition-colors">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
