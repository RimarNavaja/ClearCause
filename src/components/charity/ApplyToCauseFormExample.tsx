import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Upload, User, MapPin, FileText, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ApplyToCauseFormExample: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Apply to Cause - Complete Registration Guide
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Follow our comprehensive application process to join ClearCause as a verified charity organization.
        </p>
      </div>

      {/* Form Preview */}
      <div className="mb-12">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-900">
              Apply to Cause Form Preview
            </CardTitle>
            <p className="text-blue-700">
              Complete this application to register your organization. Our team will review your submission and contact you within 3-5 business days.
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/apply-to-cause">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                Start Application
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Form Sections Overview */}
      <div className="grid gap-8 mb-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Application Sections
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-blue-900">
                <User className="h-6 w-6" />
                1. Organization Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Organization Name (required)</li>
                <li>• Registration Number (SEC/BIR) (required)</li>
                <li>• Organization Type (required)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-green-900">
                <User className="h-6 w-6" />
                2. Contact Person
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Full Name (required)</li>
                <li>• Email Address (required)</li>
                <li>• Phone Number (required)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-purple-900">
                <MapPin className="h-6 w-6" />
                3. Organization Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Street Address (required)</li>
                <li>• City & Province/Region (required)</li>
                <li>• Postal Code (required)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-orange-900">
                <FileText className="h-6 w-6" />
                4. Organization Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Detailed mission statement (required)</li>
                <li>• Minimum 50 characters</li>
                <li>• Purpose and impact description</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-red-900">
                <Lock className="h-6 w-6" />
                5. Account Credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Account Email for login (required)</li>
                <li>• Password (min 8 characters) (required)</li>
                <li>• Confirm Password (required)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-indigo-900">
                <Upload className="h-6 w-6" />
                6. Verification Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• SEC Registration Certificate (required)</li>
                <li>• BIR Certificate of Registration (required)</li>
                <li>• Other Supporting Document (optional)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Required Documents */}
      <div className="mb-12">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-900 flex items-center gap-3">
              <Shield className="h-6 w-6" />
              Required Documents Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-yellow-900 mb-3">Required Documents:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>SEC Registration Certificate</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>BIR Certificate of Registration</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-900 mb-3">Optional Documents:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span>Board Resolution</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span>Financial Statements</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> All documents must be in PDF, JPG, PNG, DOC, or DOCX format. Maximum file size: 10MB per document.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process Timeline */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Application Process Timeline
        </h2>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold">Submit Application</h3>
              <p className="text-gray-600">Complete the online form with all required information and documents</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold">Email Confirmation</h3>
              <p className="text-gray-600">Receive immediate confirmation email with application details</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold">Review Process (3-5 days)</h3>
              <p className="text-gray-600">Our team reviews your application and verifies submitted documents</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold">Account Activation</h3>
              <p className="text-gray-600">Upon approval, your charity account is activated and you can start creating campaigns</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">Ready to Apply?</h2>
        <p className="text-blue-100 mb-6">
          Join hundreds of verified charities using ClearCause to build trust and maximize impact.
        </p>
        <Link to="/apply-to-cause">
          <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
            Start Your Application
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ApplyToCauseFormExample;