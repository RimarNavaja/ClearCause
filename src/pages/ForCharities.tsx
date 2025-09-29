import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, BarChart4, Users, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const ForCharities: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-clearcause-primary to-clearcause-dark-blue py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Join ClearCause as a Charity Partner
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
                Reach more donors, build trust through transparency, and maximize your impact 
                with our milestone-based funding platform.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/apply-to-cause">
                  <Button className="bg-clearcause-accent hover:bg-clearcause-accent/90 text-white font-medium px-8 py-6">
                    Apply to Cause
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button className="border-2 border-white text-white hover:bg-white hover:text-clearcause-primary px-8 py-6 bg-transparent transition-colors">
                    Learn How It Works
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why Partner with ClearCause?
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Our platform helps verified charities reach more donors and build lasting trust through transparency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Users className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Reach More Donors</h3>
                <p className="text-gray-600">
                  Access our growing community of 15,000+ verified donors who prioritize transparent giving.
                </p>
              </div>

              <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Shield className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Build Trust</h3>
                <p className="text-gray-600">
                  Our verification badge and transparency features help donors trust your organization more.
                </p>
              </div>

              <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <BarChart4 className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Track Impact</h3>
                <p className="text-gray-600">
                  Show donors exactly how their contributions create change with real-time impact tracking.
                </p>
              </div>

              <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <TrendingUp className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Increase Donations</h3>
                <p className="text-gray-600">
                  Verified charities see an average 40% increase in donation volume within 6 months.
                </p>
              </div>

              <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Award className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Verification Badge</h3>
                <p className="text-gray-600">
                  Display our trusted verification badge to show donors you meet the highest standards.
                </p>
              </div>

              <div className="bg-clearcause-muted rounded-xl p-8 text-center">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <CheckCircle className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Low Platform Fee</h3>
                <p className="text-gray-600">
                  Keep more of your donations with our industry-leading 1-3% platform fee structure.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Requirements Section */}
        <section className="py-16 bg-clearcause-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Partner Requirements
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  We maintain high standards to ensure donor trust and maximize impact. 
                  Here's what we look for in charity partners:
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-clearcause-success mr-4 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Legal Registration</h3>
                      <p className="text-gray-600">Valid 501(c)(3) status or equivalent charitable registration in your country</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-clearcause-success mr-4 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Financial Transparency</h3>
                      <p className="text-gray-600">Audited financial statements and willingness to share budget breakdowns</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-clearcause-success mr-4 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Impact Measurement</h3>
                      <p className="text-gray-600">Ability to track and report measurable outcomes from your programs</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-clearcause-success mr-4 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Operational History</h3>
                      <p className="text-gray-600">Minimum 2 years of operational history with demonstrated impact</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-clearcause-success mr-4 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Milestone Planning</h3>
                      <p className="text-gray-600">Willingness to structure programs around verifiable milestones</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Charity team working" 
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-lg shadow-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-clearcause-primary">30%</div>
                    <div className="text-sm text-gray-600">Approval Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Application Process
              </h2>
              <p className="text-lg text-gray-600">
                Getting verified as a ClearCause partner is straightforward but thorough
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-center">
                <div className="bg-clearcause-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mr-6 flex-shrink-0">
                  1
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Submit Application</h3>
                  <p className="text-gray-600">Complete our online application with your organization details, mission, and documentation.</p>
                </div>
                <div className="text-sm text-gray-500 ml-4">1-2 days</div>
              </div>

              <div className="flex items-center">
                <div className="bg-clearcause-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mr-6 flex-shrink-0">
                  2
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Review</h3>
                  <p className="text-gray-600">Our team reviews your legal status, financial records, and impact documentation.</p>
                </div>
                <div className="text-sm text-gray-500 ml-4">3-5 days</div>
              </div>

              <div className="flex items-center">
                <div className="bg-clearcause-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mr-6 flex-shrink-0">
                  3
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Impact Assessment</h3>
                  <p className="text-gray-600">We evaluate your programs' measurability and alignment with transparency standards.</p>
                </div>
                <div className="text-sm text-gray-500 ml-4">2-3 days</div>
              </div>

              <div className="flex items-center">
                <div className="bg-clearcause-primary text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mr-6 flex-shrink-0">
                  4
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Onboarding</h3>
                  <p className="text-gray-600">Once approved, we'll help you set up your profile and create your first campaign.</p>
                </div>
                <div className="text-sm text-gray-500 ml-4">1-2 days</div>
              </div>
            </div>

            <div className="text-center mt-12">
              <p className="text-gray-600 mb-6">
                <strong>Total timeline:</strong> 7-12 business days from application to launch
              </p>
              <Link to="/apply-to-cause">
                <Button className="bg-clearcause-accent hover:bg-clearcause-accent/90 text-white font-medium px-8 py-6 flex items-center mx-auto">
                  Start Your Application
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-16 bg-clearcause-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Success Stories
              </h2>
              <p className="text-lg text-gray-600">
                See how other charities have grown with ClearCause
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-sm">
                <div className="flex items-center mb-4">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" 
                    alt="Charity representative" 
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">Water For All Foundation</h4>
                    <p className="text-sm text-gray-600">Clean Water • Verified Partner</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "ClearCause helped us raise 250% more than our previous campaigns. 
                  The transparency features gave donors confidence, and the milestone system 
                  kept us accountable to our promises."
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-clearcause-primary font-medium">$850K raised in 6 months</span>
                  <span className="text-gray-500">• 1,200 donors</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm">
                <div className="flex items-center mb-4">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108755-2616c2c3c5b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" 
                    alt="Charity representative" 
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">EducateNow</h4>
                    <p className="text-sm text-gray-600">Education • Verified Partner</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "The verification process was thorough but worth it. Our donor retention 
                  rate increased by 60% because people could see exactly how their money 
                  was rebuilding schools."
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-clearcause-primary font-medium">$320K raised in 4 months</span>
                  <span className="text-gray-500">• 800 donors</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-clearcause-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your Fundraising?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Join hundreds of verified charities using ClearCause to build trust, 
              reach more donors, and maximize their impact.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/apply-to-cause">
                <Button className="bg-clearcause-accent hover:bg-clearcause-accent/90 text-white font-medium px-8 py-6">
                  Apply Now
                </Button>
              </Link>
              <Link to="/contact">
                <Button className="border-2 border-white text-white hover:bg-white hover:text-clearcause-primary px-8 py-6 bg-transparent transition-colors">
                  Contact Us
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

export default ForCharities;
