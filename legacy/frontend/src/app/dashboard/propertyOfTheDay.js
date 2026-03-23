"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPrimarySalesEvents } from "@/context/subgraphHelper";
import { usenfstayContext } from "@/context/nfstayContext";
import axios from "axios";
import { getEthFrom } from "@/context/helper";
import PropertySkelton from "@/utils/propertySkelton";
import { returnAmount } from "@/utils/showAmount";

import PropertyOfTheDaySkeleton from "@/utils/PropertyOfTheDaySkeleton";

const PropertyOfTheDay = () => {
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { getPropertyDetails, getPrimaryPropertyRemainingShares } =
    usenfstayContext();

  const fetchPropertyDetails = async (propertyId) => {
    try {
      const details = await getPropertyDetails(propertyId);
      const { remainingShares, totalSharesInMarket } =
        await getPrimaryPropertyRemainingShares(propertyId);

      setPropertyDetails({
        ...details,
        remainingShares,
        totalSharesInMarket,
      });
    } catch (error) {
      console.error("Error fetching property details:", error);
    }
  };

  useEffect(() => {
    const fetchPropertyOfTheDay = async () => {
      setIsLoading(true);
      try {
        const property = (await fetchPrimarySalesEvents(2))
          .sort((a, b) => b._propertyId - a._propertyId)
          .slice(0, 1)[0];

        if (property?._propertyId) {
          await fetchPropertyDetails(property._propertyId);
        } else {
          setPropertyDetails(null);
        }
      } catch (error) {
        console.error("Error fetching property of the day:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyOfTheDay();
  }, []);

  const isRentToRent = propertyDetails?.metadata?.category === "Rent 2 Rent";

  return (
    <div className="w-full">
      <div className="pb-2.5 pt-6 xl:pb-1">
        <div className="mb-6 flex justify-between">
          <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
            Property of the Day
          </h4>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <PropertyOfTheDaySkeleton />
          </div>
        ) : propertyDetails ? (
          <div className="flex flex-col gap-5 w-full">
            <div className="w-full relative min-h-[20rem] h-auto md:h-[30rem]">
              <Image
                src={propertyDetails.metadata.image}
                className="w-full h-full object-cover max-w-full rounded-xl"
                layout="fill"
                alt="Property of the day"
                onError={(e) =>
                  (e.target.src =
                    "https://photos.pinksale.finance/file/pinksale-logo-upload/1734453431720-03dcb198e4d12e88ccc503011e0cd48f.jpg")
                }
              />
              <div className="w-[65%] sm:w-[322px] h-[50px] flex items-center gap-2 absolute top-5 bg-purple-500 rounded-tr-[50px] rounded-br-[50px]">
                <div className="sm:left-[15px] sm:top-[6px] sm:absolute text-white text-2xl font-bold leading-[39px]">
                  {propertyDetails?.transactionBreakdown?.[1]?.amount || 0}
                </div>
                <div className="sm:left-[150px] sm:top-[13px] sm:absolute text-white text-base font-semibold leading-[23px]">
                 Rent Cost
                </div>
              </div>
            </div>
            <div className="flex flex-col  lg:flex-row justify-between w-full items-center gap-[46px]">
              <div className="relative shrink-0">
                <div className="flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="19"
                    viewBox="0 0 15 19"
                    fill="none"
                  >
                    <path
                      d="M6.99997 19C5.73692 17.9228 4.56617 16.7419 3.49999 15.4697C1.89999 13.5591 8.79148e-07 10.7136 8.79148e-07 8.00214C-0.000693118 6.61737 0.409507 5.26353 1.17869 4.11193C1.94787 2.96034 3.04146 2.06276 4.32105 1.5328C5.60064 1.00285 7.00872 0.864328 8.36709 1.13477C9.72544 1.40523 10.9731 2.07249 11.952 3.05211C12.6037 3.70084 13.1203 4.47237 13.4719 5.32204C13.8234 6.17171 14.0029 7.08265 14 8.00214C14 10.7136 12.1 13.5591 10.5 15.4697C9.43376 16.7419 8.26303 17.9228 6.99997 19ZM6.99997 5.00273C6.20433 5.00273 5.44127 5.31873 4.87866 5.88123C4.31605 6.44373 3.99999 7.20665 3.99999 8.00214C3.99999 8.79763 4.31605 9.56055 4.87866 10.123C5.44127 10.6855 6.20433 11.0016 6.99997 11.0016C7.79562 11.0016 8.55868 10.6855 9.12129 10.123C9.68389 9.56055 9.99998 8.79763 9.99998 8.00214C9.99998 7.20665 9.68389 6.44373 9.12129 5.88123C8.55868 5.31873 7.79562 5.00273 6.99997 5.00273Z"
                      fill="#A260FD"
                    />
                  </svg>
                  <div className="opacity-50 text-slate-900 text-lg font-medium leading-[27px]">
                    {propertyDetails.propertyLocation.location}
                  </div>
                </div>
                <div className="max-w-[25rem] text-slate-900 text-2xl font-bold leading-[37px]">
                  {propertyDetails.metadata.name}
                </div>
              </div>
              <div className="flex flex-col md:flex-row justify-between w-full items-center gap-6">
                <div className="text-center md:text-left md:border-r md:border-gray-300 md:pr-6">
                  <div className="text-slate-900 text-xl font-semibold leading-[30px]">
                    {`${(
                      parseFloat(propertyDetails.apr) * (isRentToRent ? 5 : 6)
                    )?.toFixed(2)}%`}
                  </div>
                  <div className="opacity-50 text-slate-900 text-lg">
                    {isRentToRent ? "Expected ROI" : "Expected Return"}
                  </div>
                </div>
                <div className="text-center md:text-left md:border-r md:border-gray-300 md:pr-6 md:pl-6">
                  <div className="text-slate-900 text-xl font-semibold leading-[30px]">
                    {propertyDetails.apr}%
                  </div>
                  <div className="opacity-50 text-slate-900 text-lg">
                    {isRentToRent ? "Yearly Yield" : "Dividend Yield"}
                  </div>
                </div>
                <div className="text-center md:text-left md:border-r md:border-gray-300 md:pr-6 md:pl-6">
                  <div className="text-slate-900 text-xl font-semibold leading-[30px]">
                    Monthly
                  </div>
                  <div className="opacity-50 text-slate-900 text-lg">
                    {isRentToRent
                      ? "Payout Distribution"
                      : "Dividend Frequency"}
                  </div>
                </div>
                <div className="text-center md:text-left md:pl-6">
                  <div className="text-slate-900 text-xl font-bold leading-[30px]">
                    {propertyDetails.metadata.amount}
                  </div>
                  <div className="opacity-50 text-slate-900 text-lg">
                    Price of Real Estate*
                  </div>
                </div>
                <div className="text-center md:text-right ">
                  <Link
                    href={`/marketplace?id=${propertyDetails.id}`}
                    className="px-4 py-2 bg-[#954AFC] hover:bg-[#7A36C7] transition-all ease-in-out duration-300 hover:duration-300 whitespace-nowrap rounded-full text-white text-sm font-semibold"
                  >
                    Buy Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-32">
            <p className="text-gray-500 text-lg font-semibold text-center bg-gray-100 p-4 rounded shadow-md">
              🚫 No Property of the Day Available
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyOfTheDay;
