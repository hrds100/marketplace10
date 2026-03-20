import Image from "next/image";
import lp from "../images/lpToken.svg";
import Share from "/public/Shares.png";
import usdt from "../images/usdc.jpg";
import stay from "../images/stay.png";
import { useNfstayContext } from "@/context/NfstayContext";
import { formatNumber, getEthFrom } from "@/context/helper";
import { useEffect, useState } from "react";
import AssetSkeleton from "@/utils/assetSkeleton";

const Assets = ({
  isPropertyLoading,
  isLoading,
  stayData,
  propertyData,
  lpData,
}) => {
  const { assetPrices, globalLoader, isBalanceLoading } = useNfstayContext();

  const data = [
    {
      id: 1,
      title: "Shares",
      amount: propertyData.amount || "0",
      totalValue: propertyData.totalValue || "$0",
      percentage: propertyData.percentage || 0,
      imageType: "svg",
      gradientId: "paint0_linear_0_4256",
      svgWidth: 42,
      svgHeight: 42,
      gradientColors: ["#9945FF", "#20E19F"],
    },
    {
      id: 2,
      title: "LP Token",
      staked: lpData.staked || "0 staked",
      price: Number(assetPrices?.lpPrice).toFixed(4) || "$0.0000",
      amount: lpData.amount || "0",
      totalValue: lpData.totalValue || "$0",
      percentage: lpData.percentage || 0,
      imageType: "image",
      imageSrc: lp,
      imageAlt: "LP Token",
      imageWidth: 60,
      imageHeight: 60,
    },
    {
      id: 3,
      title: "Stay",
      staked: stayData.staked || "0 staked",
      price: Number(assetPrices?.stayPrice).toFixed(5) || "$0.000",
      amount: stayData.amount || "0",
      totalValue: stayData.totalValue || "$0",
      percentage: stayData.percentage || 0,
      imageType: "image",
      imageSrc: stay,
      imageAlt: "Stay Token",
      imageWidth: 40,
      imageHeight: 40,
    },
  ];

  return (
    <div className="flex flex-col gap-5 border rounded-lg shadow">
      <div className="w-full border-b-2 p-4">
        <h4 className="text-lg font-bold text-black 2xl:text-2xl">
          Assets Overview
        </h4>
      </div>

      <div className="flex flex-col p-4 gap-5">
        {isLoading || globalLoader || isBalanceLoading || isPropertyLoading ? (
          <>
            <AssetSkeleton />
            <AssetSkeleton />
            <AssetSkeleton />
          </>
        ) : (
          data.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-5  border-b-2 pb-3 flex-wrap"
            >
              <div className="shrink-0 flex-1 max-w-16 justify-center flex items-start ">
                {item.imageType === "svg" ? (
                  // <svg
                  //   width={item.svgWidth}
                  //   height={item.svgHeight}
                  //   viewBox={`0 0 ${item.svgWidth} ${item.svgHeight}`}
                  //   fill="none"
                  //   xmlns="http://www.w3.org/2000/svg"
                  // >
                  //   <circle
                  //     cx="21"
                  //     cy="21"
                  //     r="21"
                  //     fill={`url(#${item.gradientId})`}
                  //   />
                  //   <path
                  //     d="M24 30V22C24 21.7348 23.8946 21.4804 23.7071 21.2929C23.5196 21.1054 23.2652 21 23 21H19C18.7348 21 18.4804 21.1054 18.2929 21.2929C18.1054 21.4804 18 21.7348 18 22V30"
                  //     stroke="white"
                  //     strokeWidth="1.5"
                  //     strokeLinecap="round"
                  //     strokeLinejoin="round"
                  //   />
                  //   <path
                  //     d="M12 19C11.9999 18.709 12.0633 18.4216 12.1858 18.1577C12.3082 17.8938 12.4868 17.6598 12.709 17.472L19.709 11.473C20.07 11.1679 20.5274 11.0005 21 11.0005C21.4726 11.0005 21.93 11.1679 22.291 11.473L29.291 17.472C29.5132 17.6598 29.6918 17.8938 29.8142 18.1577C29.9367 18.4216 30.0001 18.709 30 19V28C30 28.5304 29.7893 29.0391 29.4142 29.4142C29.0391 29.7893 28.5304 30 28 30H14C13.4696 30 12.9609 29.7893 12.5858 29.4142C12.2107 29.0391 12 28.5304 12 28V19Z"
                  //     stroke="white"
                  //     strokeWidth="1.5"
                  //     strokeLinecap="round"
                  //     strokeLinejoin="round"
                  //   />
                  //   <defs>
                  //     <linearGradient
                  //       id={item.gradientId}
                  //       x1="0"
                  //       y1="-8.75"
                  //       x2="42.607"
                  //       y2="-8.235"
                  //       gradientUnits="userSpaceOnUse"
                  //     >
                  //       <stop stopColor={item.gradientColors[0]} />
                  //       <stop offset="1" stopColor={item.gradientColors[1]} />
                  //     </linearGradient>
                  //   </defs>
                  // </svg>
                  <Image
                    src={Share}
                    width={60}
                    height={50}
                    className="shrink-0 -mt-[0.5rem] "
                    alt="Shares"
                  />
                ) : item.title.includes("LP") ? (
                  <div className="flex items-center -space-x-4">
                    <Image
                      src={usdt}
                      width={60}
                      height={60}
                      className="shrink-0 size-7"
                      alt="LP Token"
                    />
                    <Image
                      src={stay}
                      width={40}
                      height={40}
                      className="shrink-0"
                      alt="LP Token"
                    />
                  </div>
                ) : (
                  <Image
                    src={item.imageSrc}
                    width={item.imageWidth}
                    height={item.imageHeight}
                    alt={item.imageAlt}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1 w-full flex-1">
                <div className="flex items-center justify-between flex-wrap gap-3 w-full">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-bold 2xl:text-lg">
                      {item.title}
                    </h3>
                    {item.id == 2 && (
                      <span className="px-4 py-1 font-semibold rounded-full bg-[#0C083917]">
                        {item.staked} Staked
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold">{item.totalValue}</h2>
                </div>
                <div className="flex items-center justify-between w-full flex-wrap gap-3">
                  <h3 className="text-sm font-medium text-[#9945FF]">
                    {item.id !== 1 && (
                      <span>
                        {globalLoader ? (
                          <div className="animate-pulse bg-gray-300 h-4 w-18 rounded"></div>
                        ) : (
                          `Current Price: $${item.price}`
                        )}
                      </span>
                    )}
                  </h3>

                  <h2 className="text-sm font-medium opacity-60">
                    {item.title === "Properties" ? "Shares" : "Amount"}:{" "}
                    {item.amount}
                  </h2>
                </div>
                <div className="flex items-center w-full my-2 gap-4 justify-between">
                  <div className="flex w-full relative rounded-full bg-[#A0A3AA] transition-all bg-opacity-30 overflow-hidden h-2">
                    <div
                      className={`bg-[#0C0839] rounded-full h-full`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="w-fit shrink-0 font-medium">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default Assets;
