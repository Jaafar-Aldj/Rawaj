// src/components/LoadingSpinner.jsx
export const LoadingSpinner = ({ size = 'md', color = 'accent' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className="flex justify-center items-center">
      <div className={`${sizes[size]} border-4 border-${color}/20 border-t-${color} rounded-full animate-spin`}></div>
    </div>
  );
};

// src/components/SkeletonLoader.jsx
export const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  const skeletons = {
    card: () => (
      <div className="bg-panel p-6 rounded-2xl border border-border-color animate-pulse">
        <div className="flex items-center gap-4">
          <div className="bg-gray-700 p-3 rounded-xl w-12 h-12"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
            <div className="h-6 bg-gray-700 rounded w-16"></div>
          </div>
        </div>
      </div>
    ),
    image: () => (
      <div className="bg-panel p-4 rounded-xl border border-border-color animate-pulse">
        <div className="h-48 bg-gray-700 rounded-lg mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto"></div>
      </div>
    ),
    text: () => (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-700 rounded w-4/6"></div>
      </div>
    ),
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{skeletons[type]()}</div>
      ))}
    </>
  );
};