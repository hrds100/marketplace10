const HeadingSkeleton = () => {
  return (
    <div className="flex flex-col gap-3">
      {/* Skeleton for the heading - larger for h4 size */}
      <div className="bg-gray-300 h-10 w-60 rounded-md animate-pulse"></div>

      {/* Skeleton for the description - slightly larger for paragraph text */}
      <div className="bg-gray-200 h-6 w-80 rounded-md animate-pulse"></div>
      <br/>
    </div>
  );
};

export default HeadingSkeleton;
