const PropertySkelton = ({ source }) => {
  return (
    <div className="flex flex-col rounded-lg shadow-md animate-pulse">
      {/* Image Skeleton */}
      <div className="relative bg-gray-200 rounded-t-lg h-[20rem]">
        {/* Listing Price Skeleton */}

        <div className="absolute -bottom-4 left-0 bg-gray-400 text-white rounded-lg h-9 w-32"></div>
      </div>

      {/* Content Skeleton */}
      <div className="flex flex-col p-3 pt-8 gap-4 divide-y">
        {/* Title and Location Skeleton */}
        <div className="flex flex-col gap-2">
          <div className="w-3/4 h-6 bg-gray-200 rounded"></div>
          <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
        </div>

        {/* Metrics Skeleton */}
        <div className="flex items-center py-2 justify-between gap-5">
          <div className="flex flex-col gap-1">
            <div className="w-10 h-5 bg-gray-200 rounded"></div>
            <div className="w-16 h-3 bg-gray-200 rounded"></div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-10 h-5 bg-gray-200 rounded"></div>
            <div className="w-16 h-3 bg-gray-200 rounded"></div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="w-10 h-5 bg-gray-200 rounded"></div>
            <div className="w-16 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Conditional Section Based on Source */}
        {source === "secondary" && (
          <div className="flex flex-col items-center justify-center gap-2 pt-4">
            {/* <div className="w-1/2 h-4 bg-gray-200 rounded"></div>  */}
            <div className="w-1/3 h-6 bg-gray-200 rounded"></div>{" "}
            {/* Bold Text */}
          </div>
        )}

        {source === "marketplace" && (
          <div className="flex flex-col gap-2 py-2">
            <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
            <div className="w-full h-2.5 rounded-full bg-gray-200 relative overflow-hidden"></div>
          </div>
        )}

        {/* Footer Skeleton */}
        <div className="flex justify-between items-end gap-2 w-full py-2">
          <div className="flex flex-col gap-1">
            <div className="w-24 h-3 bg-gray-200 rounded"></div>
            <div className="w-16 h-5 bg-gray-200 rounded"></div>
          </div>
          <div className="w-20 h-8 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default PropertySkelton;
