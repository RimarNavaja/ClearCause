import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Heart, Users, Target, Award, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const About: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-clearcause-muted via-white to-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                About ClearCause
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We're on a mission to restore trust in charitable giving through radical transparency, 
                accountability, and real-time impact tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
                <p className="text-lg text-gray-600 mb-6">
                  ClearCause was founded on the belief that every donor deserves to know exactly 
                  how their contribution makes a difference. We're building the future of charitable 
                  giving where transparency isn't optional—it's guaranteed.
                </p>
                <p className="text-lg text-gray-600 mb-8">
                  Through milestone-based funding, rigorous verification, and real-time impact tracking, 
                  we ensure that every dollar donated creates measurable, verifiable change in the world.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/campaigns">
                    <Button className="bg-clearcause-accent hover:bg-clearcause-accent/90">
                      See Our Impact
                    </Button>
                  </Link>
                  <Link to="/how-it-works">
                    <Button variant="outline" className="border-clearcause-primary text-clearcause-primary">
                      How It Works
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Team working together" 
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-lg shadow-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-clearcause-primary">98%</div>
                    <div className="text-sm text-gray-600">Donor Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 bg-clearcause-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Values</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                These principles guide everything we do at ClearCause
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="bg-clearcause-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Transparency First</h3>
                <p className="text-gray-600">
                  Every donation, every milestone, every impact metric is visible and verifiable. 
                  No hidden fees, no unclear outcomes.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="bg-clearcause-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Impact Driven</h3>
                <p className="text-gray-600">
                  We measure success by real-world impact, not just funds raised. 
                  Every campaign must demonstrate tangible outcomes.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="bg-clearcause-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Community Focused</h3>
                <p className="text-gray-600">
                  We connect donors directly with the communities they're helping, 
                  fostering genuine relationships and understanding.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="bg-clearcause-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Target className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Results Oriented</h3>
                <p className="text-gray-600">
                  We only release funds when milestones are verified and completed. 
                  Accountability is built into every step of the process.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="bg-clearcause-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Award className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quality Standards</h3>
                <p className="text-gray-600">
                  We maintain the highest standards for charity verification, 
                  ensuring only the most effective organizations join our platform.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="bg-clearcause-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Continuous Innovation</h3>
                <p className="text-gray-600">
                  We constantly improve our platform, verification processes, 
                  and impact tracking to serve donors and charities better.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        {/* 6 */}

        {/* Problem We Solve */}
        <section className="py-16 bg-clearcause-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">The Problem We're Solving</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Trust Crisis in Charitable Giving</h3>
                    <p className="text-gray-600">
                      Studies show that 42% of donors have concerns about how charities use their donations, 
                      leading to decreased giving and skepticism about impact.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Lack of Accountability</h3>
                    <p className="text-gray-600">
                      Traditional charity models often lack real-time tracking and verification, 
                      making it difficult for donors to see their actual impact.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">High Administrative Costs</h3>
                    <p className="text-gray-600">
                      Many charities spend 20-30% of donations on administrative costs, 
                      reducing the actual impact of donor contributions.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Helping hands" 
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute -top-6 -left-6 bg-white p-4 rounded-lg shadow-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">42%</div>
                    <div className="text-xs text-gray-600">Donors lack trust</div>
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
              Join the Transparency Revolution
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Be part of a movement that's restoring trust in charitable giving through 
              radical transparency and verified impact.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/campaigns">
                <Button className="bg-clearcause-accent hover:bg-clearcause-accent/90 text-white font-medium px-8 py-6">
                  Explore Campaigns
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="border-2 border-white text-white hover:bg-white hover:text-clearcause-primary px-8 py-6 bg-transparent transition-colors">
                  Get Started
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

export default About;
