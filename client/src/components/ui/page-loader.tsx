import React from "react";

interface PageLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

/**
 * Standardized Rotating Morphing Square Loading Transition Component
 * Displays the custom odd-rotating square animation with saffron/orange/navy colors.
 */
export const PageLoader: React.FC<PageLoaderProps> = ({
  label = "Loading...",
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      {/* Morphing Rotating Odd Square Loader */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-lg shadow-md"
          style={{
            background: "linear-gradient(135deg, #061941 0%, #ea580c 50%, #fed813 100%)",
            animation: "oddSquareRotate 1.8s infinite ease-in-out, oddPulseGlow 2.5s infinite ease-in-out",
          }}
        />
      </div>
      {label && <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase animate-pulse">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
