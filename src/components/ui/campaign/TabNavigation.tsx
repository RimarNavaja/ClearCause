
import React from 'react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'updates', label: 'Impact Dashboard' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'audit', label: 'Audit Trail' },
    { id: 'reviews', label: 'Reviews' },
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="flex -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-clearcause-primary text-clearcause-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;
