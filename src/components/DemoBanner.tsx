import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const DemoBanner: React.FC = () => {
  // Only show in development when Supabase is not configured
  if (!import.meta.env.DEV || import.meta.env.VITE_SUPABASE_URL) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-4">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>Demo Mode:</strong> Running without backend connection. 
            <span className="ml-1">
              Create a <code className="bg-orange-100 px-1 rounded">.env.local</code> file with your Supabase credentials to enable full functionality.
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-4 text-orange-700 border-orange-300 hover:bg-orange-100"
            onClick={() => window.open('https://supabase.com', '_blank')}
          >
            Get Supabase
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default DemoBanner;
