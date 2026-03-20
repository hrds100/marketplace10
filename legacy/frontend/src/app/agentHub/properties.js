"use client";
import { useState } from "react";
const SkeletonLoader = () => {
  const skeletonStyle = "bg-gray-300 animate-pulse rounded-lg";

  return (
    <div className="flex flex-col gap-5 p-5 rounded-lg shadow border">
      {/* Skeleton for the header (title and icon) */}
      <div className="flex justify-between items-center flex-row gap-8">
        <div className="flex items-center gap-3">
          <div className={`w-16 h-16 ${skeletonStyle}`} />
          <div className="flex flex-col gap-1 ">
            <div className={`w-32 h-8 ${skeletonStyle}`} />
            <div className={`w-24 h-4 ${skeletonStyle}`} />
          </div>
        </div>
      </div>

      {/* Skeleton for Amount Collected, Transactions, and Shares Sold */}
      <div className="flex items-center flex-wrap justify-center p-3 bg-gray-300 bg-opacity-10 rounded-lg ">
        <div className="flex flex-col items-center justify-center gap-1 px-8 border-r-2 border-r-[#0c083928]">
          <div className={`w-24 h-6 ${skeletonStyle}`} />
          <div className={`w-20 h-4 ${skeletonStyle}`} />
        </div>
        <div className="flex flex-col items-center justify-center px-8 border-r-2 border-r-[#0c083928] gap-1 ">
          <div className={`w-24 h-6 ${skeletonStyle}`} />
          <div className={`w-20 h-4 ${skeletonStyle}`} />
        </div>
        <div className="flex flex-col items-center justify-center px-8 gap-1 ">
          <div className={`w-24 h-6 ${skeletonStyle}`} />
          <div className={`w-20 h-4 ${skeletonStyle}`} />
        </div>
      </div>

      {/* Skeleton for Total Shares Sold progress bar */}
      <div className="flex flex-col gap-5">
        <div className={`w-full h-2 bg-gray-200 rounded-full mt-4`}>
          <div className="h-full bg-gray-300 rounded-full w-full animate-pulse"></div>
        </div>
      </div>

      {/* Skeleton for Amount Collected and Commission with labels */}
      <div className="flex flex-wrap gap-10">
        <div className="flex items-start gap-2">
          <div className={`w-4 h-4 mt-1 ${skeletonStyle}`} />
          <div className="flex flex-col gap-3">
            <div className={`w-32 h-6 ${skeletonStyle}`} />
            <div className={`w-24 h-4 ${skeletonStyle}`} />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className={`w-4 h-4 mt-1 ${skeletonStyle}`} />
          <div className="flex flex-col gap-3">
            <div className={`w-32 h-6 ${skeletonStyle}`} />
            <div className={`w-24 h-4 ${skeletonStyle}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
const Properties = ({ totalClients, data, loading }) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const totalRevenue = data.totalRevenue;
  const profitGenerated = data.profitGenerated;

  // Calculate the percentages
  const investmentPercentage =
    totalRevenue > 0
      ? ((totalRevenue - profitGenerated) / totalRevenue) * 100
      : 0;
  const commissionPercentage =
    totalRevenue > 0 ? (profitGenerated / totalRevenue) * 100 : 0;

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="flex flex-col gap-5 p-5 rounded-lg shadow border ">
      <div className="flex justify-between items-center flex-row gap-8">
        <div className="flex items-center gap-3">
          <svg
            width="60"
            height="72"
            className="shrink-0 2xl:w-[80px]"
            viewBox="0 0 72 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect opacity="0.1" width="72" height="72" rx="36" fill="#954AFC" />
            <rect
              opacity="0.1"
              x="8"
              y="8"
              width="56"
              height="56"
              rx="28"
              fill="#954AFC"
            />
            <path
              d="M24.3333 29.3333C21.5666 29.3333 19.3333 31.5666 19.3333 34.3333V47.6666C19.3333 50.4333 21.5666 52.6666 24.3333 52.6666H26.8333C28.6666 52.6666 30.1666 51.1666 30.1666 49.3333V32.6666C30.1666 30.8333 28.6666 29.3333 26.8333 29.3333H24.3333ZM25.9999 44.3333C25.9999 45.0166 25.4333 45.5833 24.7499 45.5833C24.0666 45.5833 23.4999 45.0166 23.4999 44.3333V37.6666C23.4999 36.9833 24.0666 36.4166 24.7499 36.4166C25.4333 36.4166 25.9999 36.9833 25.9999 37.6666V44.3333Z"
              fill="#0C0839"
            />
            <path
              d="M47.6667 19.3333H37.6667C34.9001 19.3333 32.6667 21.5666 32.6667 24.3333V47.6666C32.6667 50.4333 34.9001 52.6666 37.6667 52.6666H38.5001C38.9667 52.6666 39.3334 52.2999 39.3334 51.8333V45.9999C39.3334 45.0833 40.0834 44.3333 41.0001 44.3333H44.3334C45.2501 44.3333 46.0001 45.0833 46.0001 45.9999V51.8333C46.0001 52.2999 46.3667 52.6666 46.8334 52.6666H47.6667C50.4334 52.6666 52.6667 50.4333 52.6667 47.6666V24.3333C52.6667 21.5666 50.4334 19.3333 47.6667 19.3333ZM40.5834 37.6666C40.5834 38.3499 40.0167 38.9166 39.3334 38.9166C38.6501 38.9166 38.0834 38.3499 38.0834 37.6666V29.3333C38.0834 28.6499 38.6501 28.0833 39.3334 28.0833C40.0167 28.0833 40.5834 28.6499 40.5834 29.3333V37.6666ZM47.2501 37.6666C47.2501 38.3499 46.6834 38.9166 46.0001 38.9166C45.3167 38.9166 44.7501 38.3499 44.7501 37.6666V29.3333C44.7501 28.6499 45.3167 28.0833 46.0001 28.0833C46.6834 28.0833 47.2501 28.6499 47.2501 29.3333V37.6666Z"
              fill="#954AFC"
            />
          </svg>
          <div className="flex flex-col gap-1 ">
            <h3 className="font-bold text-4xl">{data.properties}</h3>
            <p className="opacity-80 font-medium 2xl:text-lg">Properties</p>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap justify-center p-3 bg-[#954AFC] bg-opacity-10 rounded-lg ">
        <div className="flex flex-col items-center justify-center gap-1 px-8 border-r-2 border-r-[#0c083928]">
          <h3 className="font-bold text-xl 2xl:text-2xl">{totalClients}</h3>
          <p className="opacity-80 font-medium 2xl:text-base">Clients</p>
        </div>
        <div className="flex flex-col items-center justify-center px-8 border-r-2 border-r-[#0c083928] gap-1 ">
          <h3 className="font-bold text-xl 2xl:text-2xl">
            {data.transactions?.toLocaleString()}
          </h3>
          <p className="opacity-80 font-medium 2xl:text-base">Transactions</p>
        </div>
        <div className="flex flex-col items-center justify-center px-8 gap-1 ">
          <h3 className="font-bold text-xl 2xl:text-2xl">
            {data.totalSharesSold?.toLocaleString()}
          </h3>
          <p className="opacity-80 font-medium 2xl:text-base">Shares Sold</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <h3 className="font-semibold text-lg 2xl:text-2l">Total Shares Sold</h3>

        <div className="w-full h-2 bg-gray-200 rounded-full mt-4 relative">
          {/* Combined Bar for Investment and Commission */}
          <div className="h-full flex rounded-full" style={{ width: "100%" }}>
            {/* Total Investment Section */}
            <div
              className={`h-full ${
                totalRevenue > 0 ? "bg-[#954AFC]" : "bg-gray-300"
              } rounded-l-full`}
              style={{
                width: `${investmentPercentage}%`,
              }}
              onMouseEnter={() => setTooltipVisible(true)}
              onMouseLeave={() => setTooltipVisible(false)}
            />

            {/* Commission Section */}
            <div
              className="h-full bg-[#0C0839] rounded-r-full relative"
              style={{
                width: `${commissionPercentage}%`,
              }}
              onMouseEnter={() => setTooltipVisible(true)}
              onMouseLeave={() => setTooltipVisible(false)}
            />
          </div>

          {/* Combined Tooltip (positioned above the progress bar) */}
          {tooltipVisible && (
            <div className="absolute top-[-30px] left-1/2 transform -translate-x-1/2 z-10 bg-gray-800 text-white text-sm rounded px-2 py-1 text-center">
              <div>{`Amount Collected: ${investmentPercentage.toFixed(
                2
              )}%`}</div>
              <div>{`Commission: ${commissionPercentage.toFixed(2)}%`}</div>
            </div>
          )}
        </div>
        {/* <div className="flex w-full  rounded h-4 bg-[#0C0839] bg-opacity-10 overflow-hidden relative">
          <div className="absolute left-0 top-0 bg-[#0C0839] w-1/4 h-full rounded" />
        </div> */}
        <div className="flex flex-wrap gap-10">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 mt-1 rounded bg-[#954AFC] shrink-0"></span>
            <div className="flex flex-col">
              <h3 className="font-bold text-lg 2xl:text-2xl">
                ${(data.totalRevenue - data.profitGenerated)?.toLocaleString()}
              </h3>
              <p className="opacity-80 font-medium 2xl:text-base">
                Amount Collected
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 mt-1 rounded bg-[#0C0839] shrink-0"></span>
            <div className="flex flex-col">
              <h3 className="font-bold text-lg 2xl:text-2xl">
                ${data.profitGenerated?.toLocaleString()}
              </h3>
              <p className="opacity-80 font-medium 2xl:text-base">Commission</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Properties;
