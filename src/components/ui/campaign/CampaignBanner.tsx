import React, { useState } from "react";
import { X, ZoomIn } from "lucide-react";

interface CampaignBannerProps {
  bannerUrl: string;
  title: string;
}

const CampaignBanner: React.FC<CampaignBannerProps> = ({
  bannerUrl,
  title,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const openPreview = () => {
    setIsPreviewOpen(true);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    // Restore body scroll
    document.body.style.overflow = "unset";
  };

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPreviewOpen) {
        closePreview();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isPreviewOpen]);

  return (
    <>
      <div
        className="h-64 md:h-80 lg:h-96 w-full overflow-hidden relative cursor-pointer group"
        onClick={openPreview}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPreview();
          }
        }}
        aria-label="Click to preview banner in full size"
      >
        <img
          src={bannerUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

        {/* Zoom indicator */}
        <div className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ZoomIn className="w-5 h-5" />
        </div>
      </div>

      {/* Full-size preview modal */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-labelledby="banner-preview-title"
        >
          {/* Close button */}
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors duration-200 z-10"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Full-size image */}
          <div
            className="relative max-w-7xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={bannerUrl}
              alt={title}
              id="banner-preview-title"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Helper text */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/70 text-sm">
            Press ESC or click outside to close
          </div>
        </div>
      )}
    </>
  );
};

export default CampaignBanner;