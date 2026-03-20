import React from "react";

const UserPropertiesSkeleton = () => {
  return (
    <div className="skeleton-container">
      <div className="skeleton-slider grid grid-cols-1 lg:grid-cols-[63%_35%] gap-5">
        {/* Left Section Skeleton */}
        <div className="flex flex-col gap-5 w-full border shadow-sm lg:overflow-hidden rounded-xl">
          <div className="w-full relative">
            <div className="w-full h-[25rem] bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="w-[200px] absolute top-10 h-[40px] bg-gray-300 animate-pulse rounded-tr-[50px] rounded-br-[50px]"></div>
          </div>
          <div className="justify-between w-full lg:items-center gap-4 p-4 flex flex-col lg:flex-row flex-wrap">
            {/* Property Information */}
            <div className="justify-start lg:justify-between items-start w-full lg:items-center gap-6 flex flex-1 flex-col lg:flex-row flex-wrap">
              <div className="relative flex-1 w-full">
                <div className="flex items-center gap-1 w-full flex-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="19"
                    viewBox="0 0 15 19"
                    fill="none"
                  >
                    <path
                      d="M6.99997 19C5.73692 17.9228 4.56617 16.7419 3.49999 15.4697C1.89999 13.5591 8.79148e-07 10.7136 8.79148e-07 8.00214C-0.000693118 6.61737 0.409507 5.26353 1.17869 4.11193C1.94787 2.96034 3.04146 2.06276 4.32105 1.5328C5.60064 1.00285 7.00872 0.864328 8.36709 1.13477C9.72544 1.40523 10.9731 2.07249 11.952 3.05211C12.6037 3.70084 13.1203 4.47237 13.4719 5.32204C13.8234 6.17171 14.0029 7.08265 14 8.00214C14 10.7136 12.1 13.5591 10.5 15.4697C9.43376 16.7419 8.26303 17.9228 6.99997 19ZM6.99997 5.00273C6.20433 5.00273 5.44127 5.31873 4.87866 5.88123C4.31605 6.44373 3.99999 7.20665 3.99999 8.00214C3.99999 8.79763 4.31605 9.56055 4.87866 10.123C5.44127 10.6855 6.20433 11.0016 6.99997 11.0016C7.79562 11.0016 8.55868 10.6855 9.12129 10.123C9.68389 9.56055 9.99998 8.79763 9.99998 8.00214C9.99998 7.20665 9.68389 6.44373 9.12129 5.88123C8.55868 5.31873 7.79562 5.00273 6.99997 5.00273Z"
                      fill="#f1f2f4"
                    />
                  </svg>
                  <div className="opacity-50 h-3 w-full bg-gray-200 animate-pulse text-slate-900"></div>
                </div>
                <div className="w-2/3 h-6  bg-gray-200 animate-pulse text-slate-900   "></div>
              </div>
              <div className="relative flex-1 w-full flex flex-col gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="hidden md:block absolute -left-3 -top-2"
                  width="2"
                  height="51"
                  viewBox="0 0 2 51"
                  fill="none"
                >
                  <path opacity="0.2" d="M1 0.5V50.5" stroke="#0C0839" />
                </svg>
                <div className="text-[#0C0839] w-full h-3 bg-gray-200 animate-pulse"></div>
                <div className="text-slate-900 text-xl h-6  w-full  bg-gray-200 animate-pulse "></div>
              </div>
            </div>
            {/* Buttons */}
            <div className="flex items-center justify-start gap-3">
              <div className="px-4 py-1.5 bg-gray-200 animate-pulse rounded-full backdrop-blur-[29.60px] justify-center items-center gap-1.5 flex">
                <div className="text-white h-6 text-sm font-medium w-[100px] 2xl:text-lg"></div>
              </div>
              <div className="px-4 py-1.5 bg-gray-200 animate-pulse rounded-full backdrop-blur-[29.60px] justify-center items-center gap-1.5 flex">
                <div className="text-white h-6 text-sm font-medium w-[126px] 2xl:text-lg"></div>
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center cursor-pointer text-primary"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="4"
                    height="16"
                    viewBox="0 0 4 16"
                    fill="none"
                  >
                    <circle
                      cx="2"
                      cy="2"
                      r="2"
                      fill="#d6d9df"
                      className="animate-pulse"
                    />
                    <circle
                      cx="2"
                      cy="8"
                      r="2"
                      fill="#d6d9df"
                      className="animate-pulse"
                    />
                    <circle
                      cx="2"
                      cy="14"
                      r="2"
                      fill="#d6d9df"
                      className="animate-pulse"
                    />
                  </svg>
                </button>
              </div>
              {/* {activeProperties.some(
                              (activeProperty) =>
                                Number(activeProperty._propertyId) ===
                                property.id
                            ) && (
                              <Tooltip text="Secondary sale is unavailable until primary sale of this property ends" />
                            )} */}
            </div>
          </div>
        </div>
        {/* <div className='flex flex-col relative gap-5 border shadow-sm rounded-lg p-4'>
          <div className='w-full h-[25rem] bg-gray-200 animate-pulse rounded-lg'></div>
          <div className='w-[200px] absolute top-10 h-[40px] bg-gray-300 animate-pulse rounded-tr-[50px] rounded-br-[50px]'></div>
          <div className='mt-4'>
            <div className='h-6 bg-gray-200 animate-pulse rounded w-3/4'></div>
            <div className='h-4 bg-gray-200 animate-pulse rounded w-1/2 mt-2'></div>
          </div>
          <div className='mt-4'>
            <div className='h-6 bg-gray-200 animate-pulse rounded w-1/3'></div>
            <div className='h-4 bg-gray-200 animate-pulse rounded w-1/4 mt-2'></div>
          </div>
        </div> */}

        {/* Right Section Skeleton */}
        <div className="flex flex-col gap-5">
          {/* Current APR Skeleton */}

          <div className="border w-full shadow-sm p-4 rounded-lg h-full">
            <div className="flex items-center w-full justify-between">
              <div className="flex w-full flex-col border-b gap-2">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-[50%] mb-2"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-1/4 mb-4"></div>
              </div>
            </div>
            <div className="flex items-center flex-wrap w-full justify-between gap-6 mt-3 pt-3">
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-full"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-full"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-full"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              </div>
            </div>
            <div className="flex flex-col gap-1 mt-3 pt-3">
              <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 animate-pulse rounded w-7/12"></div>
            </div>
          </div>

          <div className="border w-full shadow-sm p-4 rounded-lg h-full">
            <div className="flex items-center w-full justify-between">
              <div className="flex w-full flex-col border-b gap-2">
                <div className="w-full flex items-center justify-between ">
                  <div className="h-6 bg-gray-200 animate-pulse rounded w-[50%] mb-2"></div>
                  <div className="size-6 rounded-full bg-gray-200 animate-pulse shrink-0" />
                </div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-1/4 mb-4"></div>
              </div>
            </div>
            <div className="flex items-center flex-wrap w-full justify-between gap-6 mt-3 pt-3">
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-full"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-full"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-6 bg-gray-200 animate-pulse rounded w-full"></div>
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              </div>
            </div>
            <div className="flex items-center w-full justify-between gap-5 flex-wrap">
              <div className="flex flex-col gap-1 flex-1 mt-3 pt-3">
                <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 animate-pulse rounded w-7/12"></div>
              </div>
              <div className="flex flex-col gap-1 flex-1 mt-3 pt-3">
                <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 animate-pulse rounded w-7/12"></div>
              </div>
            </div>
            <div className="flex items-center w-full justify-between mt-4 gap-5 flex-wrap">
              <div className="flex-1 rounded-full h-8 bg-gray-200 animate-pulse" />
              <div className="flex-1 rounded-full h-8 bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPropertiesSkeleton;
