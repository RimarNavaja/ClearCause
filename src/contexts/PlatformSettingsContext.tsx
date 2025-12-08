import React, { createContext, useContext, useState, useEffect } from 'react';
import * as adminService from '@/services/adminService';

interface PlatformSettingsContextType {
  platformFeePercentage: number;
  minimumDonationAmount: number;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextType | undefined>(undefined);

export const PlatformSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number>(5); // Default
  const [minimumDonationAmount, setMinimumDonationAmount] = useState<number>(100); // Default
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await adminService.getPlatformSettings();

      if (result.success && result.data) {
        const feeSetting = result.data.find(s => s.key === 'platform_fee_percentage');
        const minDonationSetting = result.data.find(s => s.key === 'minimum_donation_amount');

        if (feeSetting) {
          setPlatformFeePercentage(Number(feeSetting.value) || 5);
        }
        if (minDonationSetting) {
          const minValue = Number(minDonationSetting.value) || 100;
          console.log('🔧 Platform Settings Loaded - Minimum Donation:', minValue);
          setMinimumDonationAmount(minValue);
        }
      }
    } catch (error) {
      console.error('Failed to load platform settings:', error);
      // Keep defaults: 5%, ₱100
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const refreshSettings = async () => {
    await loadSettings();
  };

  return (
    <PlatformSettingsContext.Provider value={{ platformFeePercentage, minimumDonationAmount, loading, refreshSettings }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
};

export const usePlatformSettings = () => {
  const context = useContext(PlatformSettingsContext);
  if (!context) {
    throw new Error('usePlatformSettings must be used within PlatformSettingsProvider');
  }
  return context;
};
