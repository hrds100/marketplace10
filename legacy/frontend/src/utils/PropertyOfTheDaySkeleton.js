const PropertyOfTheDaySkeleton = () => {
  return (
    <div className="flex flex-col gap-5 w-full animate-pulse">
      {/* Image Skeleton */}
      <div className="w-full relative h-auto md:h-[30rem] bg-gray-200 rounded-xl"></div>
      <div className="w-full sm:w-[322px] h-[50px] flex items-center gap-2 absolute top-5 bg-gray-300 rounded-tr-[50px] rounded-br-[50px]">
        <div className="w-24 h-6 bg-gray-300 rounded"></div>
        <div className="w-20 h-4 bg-gray-300 rounded"></div>
      </div>

      {/* Location and Metadata Skeleton */}
      <div className="flex flex-col md:flex-row justify-between w-full items-center gap-[46px]">
        <div className="relative shrink-0">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
            <div className="w-36 h-4 bg-gray-300 rounded"></div>
          </div>
          <div className="w-52 h-6 bg-gray-300 rounded mt-2"></div>
        </div>

        {/* Details Skeleton */}
        <div className="flex flex-col md:flex-row justify-between w-full items-center gap-6">
          <div className="text-center md:text-left md:border-r md:border-gray-300 md:pr-6">
            <div className="w-10 h-6 bg-gray-300 rounded mx-auto md:mx-0"></div>
            <div className="w-24 h-4 bg-gray-300 rounded mt-2"></div>
          </div>
          <div className="text-center md:text-left md:border-r md:border-gray-300 md:pr-6 md:pl-6">
            <div className="w-10 h-6 bg-gray-300 rounded mx-auto md:mx-0"></div>
            <div className="w-24 h-4 bg-gray-300 rounded mt-2"></div>
          </div>
          <div className="text-center md:text-left md:border-r md:border-gray-300 md:pr-6 md:pl-6">
            <div className="w-10 h-6 bg-gray-300 rounded mx-auto md:mx-0"></div>
            <div className="w-24 h-4 bg-gray-300 rounded mt-2"></div>
          </div>
          <div className="text-center md:text-left md:pl-6">
            <div className="w-24 h-6 bg-gray-300 rounded mx-auto md:mx-0"></div>
            <div className="w-36 h-4 bg-gray-300 rounded mt-2"></div>
          </div>
          <div className="text-center md:text-right">
            <div className="w-20 h-8 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyOfTheDaySkeleton;
