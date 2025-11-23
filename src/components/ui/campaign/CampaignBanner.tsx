
import React, { useState } from 'react';

interface CampaignBannerProps {
  bannerUrl: string;
  title: string;
}

const CampaignBanner: React.FC<CampaignBannerProps> = ({ bannerUrl, title }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasValidImage = Boolean(bannerUrl);

  // Use a nice default banner if none provided
  const finalBannerUrl = bannerUrl || "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1200&h=400&fit=crop";

  return (
    <div className="h-64 md:h-80 lg:h-96 w-full overflow-hidden relative bg-gradient-to-br from-gray-100 to-gray-200">
      {!imageLoaded && hasValidImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="animate-pulse text-gray-400">Loading banner...</div>
        </div>
      )}
      {!hasValidImage && !imageLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400">
          <svg className="w-20 h-20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">No banner image</span>
        </div>
      )}
      <img
        src={finalBannerUrl}
        alt={title}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
        onError={(e) => {
          e.currentTarget.src = 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1200&h=400&fit=crop';
          setImageLoaded(true);
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
    </div>
  );
};

export default CampaignBanner;
