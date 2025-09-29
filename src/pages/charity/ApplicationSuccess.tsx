import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Mail, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ApplicationSuccess: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            Application Submitted!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Thank you for applying to become a verified charity on ClearCause
          </p>
        </div>

        <Card className="bg-white shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email Confirmation</p>
                <p className="text-sm text-gray-600">
                  You'll receive an email confirmation within a few minutes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Review Process</p>
                <p className="text-sm text-gray-600">
                  Our team will review your application within 3-5 business days.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Account Activation</p>
                <p className="text-sm text-gray-600">
                  Once approved, your charity account will be activated and you can start creating campaigns.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                Check your email
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                We've sent a confirmation email with your application details and next steps.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-3">
          <Button asChild className="w-full">
            <Link to="/login">
              Continue to Login
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              Return to Homepage
            </Link>
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Questions about your application?{' '}
            <a href="mailto:support@clearcause.com" className="text-blue-600 hover:text-blue-500">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApplicationSuccess;