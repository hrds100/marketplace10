import React from "react";

const AssetSkeleton = () => (
  <div className="flex items-start gap-5 border-b-2 pb-3 flex-wrap animate-pulse">
    <div className="shrink-0">
      <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
    </div>
    <div className="flex flex-col gap-1 w-full flex-1">
      <div className="flex items-center justify-between flex-wrap gap-3 w-full">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-24 h-4 bg-gray-300 rounded"></div>
        </div>
        <div className="w-24 h-6 bg-gray-300 rounded"></div>
      </div>
      <div className="flex items-center justify-between w-full flex-wrap gap-3">
        <div className="w-24 h-4 bg-gray-300 rounded"></div>
        <div className="w-16 h-4 bg-gray-300 rounded"></div>
      </div>
      <div className="flex items-center w-full my-2 gap-4 justify-between">
        <div className="flex w-full relative rounded-full bg-[#A0A3AA] transition-all bg-opacity-30 overflow-hidden h-2">
          {/* <div className="bg-[#0C0839] rounded-full h-full w-1/2"></div> */}
        </div>
        <div className="w-10 h-4 bg-gray-300 rounded"></div>
      </div>
    </div>
  </div>
);

export default AssetSkeleton;
