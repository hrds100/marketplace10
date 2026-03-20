"use client";
import React, { useEffect, useState } from "react";
import lp from "../images/lpToken.svg";
import stay from "../images/stay.png";
import usdt from "../images/usdc.svg";
import Image from "next/image";
import Analytics from "./analytics";
import BuyStayWithCard from "../overview/buyStayWithCard";
import BuyStayWithCrypto from "../overview/buyStayWithCrypto";
import Incinerator from "./incinerator";
import { useNfstayContext } from "@/context/NfstayContext";
import { CONTRACT_CONFIG } from "@/config";
import { formatNumber, getEthFrom } from "@/context/helper";

const Farm = () => {
  const {
    getUserDetails,
    globalLoader,
    connectedAddress,
    userDetails,
    assetPrices,
  } = useNfstayContext();

  const [userDetailsLoading, setUserDetailsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (connectedAddress) {
       
        setUserDetailsLoading(true);
        await getUserDetails();
        setUserDetailsLoading(false);
      } else {
        setUserDetailsLoading(false);
      }
    })();
  }, [connectedAddress]);

  return (
    <div className="w-full">
      <div className="pb-2.5  flex flex-col gap-6 xl:pb-1">
        <div className="flex items-center flex-wrap justify-between gap-5">
          <div className="flex gap-2 flex-col justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
                FARM
              </h4>
            </div>
            <p className="opacity-80 text-[#0C0839] 2xl:text-lg">
              Earn $STAY by providing liquidity
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            <div className="flex items-start flex-1 gap-2 p-4 rounded-lg shadow border bg-white">
              <svg
                width="22"
                className="shrink-0 mt-1 2xl:size-10"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.36709 2.675C2.36709 2.49598 2.29507 2.32429 2.16688 2.1977C2.03869 2.07112 1.86483 2 1.68354 2C1.50226 2 1.32839 2.07112 1.20021 2.1977C1.07202 2.32429 1 2.49598 1 2.675V19.325C1 19.6976 1.30623 20 1.68354 20H18.3165C18.4977 20 18.6716 19.9289 18.7998 19.8023C18.928 19.6757 19 19.504 19 19.325C19 19.146 18.928 18.9743 18.7998 18.8477C18.6716 18.7211 18.4977 18.65 18.3165 18.65H2.36709V2.675Z"
                  fill="url(#paint0_linear_0_6035)"
                />
                <path
                  d="M20.8099 7.19491C20.935 7.06022 21.0031 6.88207 20.9999 6.69799C20.9967 6.51392 20.9223 6.33829 20.7925 6.20811C20.6628 6.07793 20.4877 6.00336 20.3042 6.00011C20.1207 5.99686 19.9431 6.06519 19.8088 6.1907L14.4066 11.6096L10.8932 8.08543C10.7604 7.95238 10.5804 7.87764 10.3927 7.87764C10.205 7.87764 10.0249 7.95238 9.89211 8.08543L4.22545 13.7696C4.15585 13.8347 4.10003 13.9131 4.06132 14.0003C4.02261 14.0875 4.00179 14.1815 4.00011 14.2769C3.99843 14.3723 4.01593 14.4671 4.05155 14.5556C4.08718 14.6441 4.1402 14.7244 4.20747 14.7919C4.27473 14.8594 4.35485 14.9126 4.44305 14.9483C4.53125 14.984 4.62572 15.0016 4.72083 14.9999C4.81594 14.9982 4.90973 14.9773 4.99662 14.9385C5.08351 14.8997 5.16171 14.8437 5.22656 14.7739L10.3927 9.59175L13.906 13.116C14.0388 13.249 14.2188 13.3238 14.4066 13.3238C14.5943 13.3238 14.7743 13.249 14.9071 13.116L20.8099 7.19491Z"
                  fill="url(#paint1_linear_0_6035)"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_0_6035"
                    x1="1"
                    y1="-1.75005"
                    x2="19.2601"
                    y2="-1.52941"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stop-color="#9945FF" />
                    <stop offset="1" stop-color="#20E19F" />
                  </linearGradient>
                  <linearGradient
                    id="paint1_linear_0_6035"
                    x1="4"
                    y1="4.12498"
                    x2="21.2392"
                    y2="4.51845"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stop-color="#9945FF" />
                    <stop offset="1" stop-color="#20E19F" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-xl 2xl:text-3xl">
                  {userDetailsLoading ? (
                    <div className="animate-pulse bg-gray-300 h-6 w-24 rounded"></div>
                  ) : (
                    <>
                      {Number(userDetails.staked).toLocaleString()}
                      <span className="text-xs md:text-sm opacity-70">
                        ≈$
                        {formatNumber(
                          Number(userDetails.staked) * assetPrices.lpPrice
                        )}
                      </span>
                    </>
                  )}
                </h3>

                <p className="opacity-60 whitespace-nowrap 2xl:text-lg">
                  Your Liquidity
                </p>
              </div>
            </div>
            <div className="flex items-start  flex-1  gap-2 p-4 rounded-lg shadow border bg-white">
              <svg
                width="22"
                height="22"
                className="shrink-0 mt-1 2xl:size-10"
                viewBox="0 0 22 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16.5946 2H6.40541C5.62804 2 5 2.61875 5 3.38462V18.6154C5 19.3813 5.62804 20 6.40541 20H16.5946C17.372 20 18 19.3813 18 18.6154V3.38462C18 2.61875 17.372 2 16.5946 2ZM16.0676 13.7692V17.2308C16.0676 17.8063 15.5976 18.2692 15.0135 18.2692C14.4294 18.2692 13.9595 17.8063 13.9595 17.2308V13.7692C13.9595 13.1938 14.4294 12.7308 15.0135 12.7308C15.5976 12.7308 16.0676 13.1938 16.0676 13.7692ZM16.0676 10.3077C16.0676 10.8832 15.5976 11.3462 15.0135 11.3462C14.4294 11.3462 13.9595 10.8832 13.9595 10.3077C13.9595 9.73221 14.4294 9.26923 15.0135 9.26923C15.5976 9.26923 16.0676 9.73221 16.0676 10.3077ZM12.5541 17.2308C12.5541 17.8063 12.0841 18.2692 11.5 18.2692C10.9159 18.2692 10.4459 17.8063 10.4459 17.2308C10.4459 16.6553 10.9159 16.1923 11.5 16.1923C12.0841 16.1923 12.5541 16.6553 12.5541 17.2308ZM12.5541 13.7692C12.5541 14.3447 12.0841 14.8077 11.5 14.8077C10.9159 14.8077 10.4459 14.3447 10.4459 13.7692C10.4459 13.1938 10.9159 12.7308 11.5 12.7308C12.0841 12.7308 12.5541 13.1938 12.5541 13.7692ZM12.5541 10.3077C12.5541 10.8832 12.0841 11.3462 11.5 11.3462C10.9159 11.3462 10.4459 10.8832 10.4459 10.3077C10.4459 9.73221 10.9159 9.26923 11.5 9.26923C12.0841 9.26923 12.5541 9.73221 12.5541 10.3077ZM9.04054 17.2308C9.04054 17.8063 8.57061 18.2692 7.98649 18.2692C7.40236 18.2692 6.93243 17.8063 6.93243 17.2308C6.93243 16.6553 7.40236 16.1923 7.98649 16.1923C8.57061 16.1923 9.04054 16.6553 9.04054 17.2308ZM9.04054 13.7692C9.04054 14.3447 8.57061 14.8077 7.98649 14.8077C7.40236 14.8077 6.93243 14.3447 6.93243 13.7692C6.93243 13.1938 7.40236 12.7308 7.98649 12.7308C8.57061 12.7308 9.04054 13.1938 9.04054 13.7692ZM9.04054 10.3077C9.04054 10.8832 8.57061 11.3462 7.98649 11.3462C7.40236 11.3462 6.93243 10.8832 6.93243 10.3077C6.93243 9.73221 7.40236 9.26923 7.98649 9.26923C8.57061 9.26923 9.04054 9.73221 9.04054 10.3077ZM6.93243 6.84615V4.76923C6.93243 4.38846 7.24865 4.07692 7.63514 4.07692H15.3649C15.7514 4.07692 16.0676 4.38846 16.0676 4.76923V6.84615C16.0676 7.22692 15.7514 7.53846 15.3649 7.53846H7.63514C7.24865 7.53846 6.93243 7.22692 6.93243 6.84615Z"
                  fill="url(#paint0_linear_0_6046)"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_0_6046"
                    x1="5"
                    y1="-1.75005"
                    x2="18.1888"
                    y2="-1.63495"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stop-color="#9945FF" />
                    <stop offset="1" stop-color="#20E19F" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-xl 2xl:text-3xl">
                  {globalLoader ? (
                    <div className="animate-pulse bg-gray-300 h-6 w-24 rounded"></div>
                  ) : (
                    `${assetPrices?.farmApr?.toFixed(3)}%`
                  )}
                </h3>

                <p className="opacity-60 2xl:text-lg">APR</p>
              </div>
            </div>
            <div className="flex items-start flex-1  gap-2 p-4 rounded-lg shadow border bg-white">
              <svg
                width="22"
                height="22"
                className="shrink-0 mt-1 2xl:size-10"
                viewBox="0 0 22 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.5 1C5.25379 1 1 5.25379 1 10.5C1 15.7462 5.25379 20 10.5 20C15.7462 20 20 15.7462 20 10.5C20 5.25379 15.7462 1 10.5 1ZM10.5 18.3884C6.14442 18.3884 2.61161 14.8556 2.61161 10.5C2.61161 6.14442 6.14442 2.61161 10.5 2.61161C14.8556 2.61161 18.3884 6.14442 18.3884 10.5C18.3884 14.8556 14.8556 18.3884 10.5 18.3884ZM11.5115 10.008L10.9729 9.88292V7.03504C11.7787 7.14531 12.277 7.65 12.3618 8.2692C12.3724 8.35402 12.4445 8.41551 12.5294 8.41551H13.4815C13.5811 8.41551 13.6596 8.32857 13.6511 8.22891C13.5218 6.90781 12.4339 6.0596 10.9814 5.91328V5.21987C10.9814 5.12656 10.905 5.05022 10.8117 5.05022H10.2158C10.1225 5.05022 10.0462 5.12656 10.0462 5.21987V5.91964C8.54487 6.06596 7.37009 6.89509 7.37009 8.44308C7.37009 9.87656 8.42612 10.5679 9.53516 10.8329L10.0589 10.9665V13.9925C9.12165 13.8674 8.59576 13.367 8.48761 12.6926C8.47489 12.6121 8.40279 12.5527 8.32009 12.5527H7.3404C7.24074 12.5527 7.16228 12.6375 7.17076 12.7372C7.26618 13.9035 8.15045 14.9764 10.0377 15.1143V15.7801C10.0377 15.8734 10.1141 15.9498 10.2074 15.9498H10.8096C10.9029 15.9498 10.9792 15.8734 10.9792 15.778L10.975 15.1058C12.6354 14.9595 13.8229 14.071 13.8229 12.4763C13.8208 11.0047 12.8856 10.3473 11.5115 10.008ZM10.0568 9.66451C9.93806 9.63058 9.83839 9.59877 9.73873 9.55848C9.02199 9.29978 8.68906 8.88203 8.68906 8.34341C8.68906 7.57366 9.27221 7.13471 10.0568 7.03504V9.66451ZM10.9729 13.9989V11.1637C11.0386 11.1828 11.098 11.1977 11.1595 11.2104C12.1625 11.5157 12.4997 11.9398 12.4997 12.5908C12.4997 13.42 11.8762 13.9183 10.9729 13.9989Z"
                  fill="url(#paint0_linear_0_6054)"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_0_6054"
                    x1="1"
                    y1="-2.95838"
                    x2="20.2746"
                    y2="-2.72548"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stop-color="#9945FF" />
                    <stop offset="1" stop-color="#20E19F" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-xl 2xl:text-3xl">
                  {userDetailsLoading ? (
                    <div className="animate-pulse bg-gray-300 h-6 w-24 rounded"></div>
                  ) : (
                    `$ ${
                      (
                        userDetails?.pendingRewards *
                        Number(assetPrices?.stayPrice)
                      ).toFixed(2) || 0
                    }`
                  )}
                </h3>
                <p className="opacity-60 whitespace-nowrap 2xl:text-lg">
                  Unclaimed Rewards
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <div className="flex items-center -space-x-4">
              <Image
                src={usdt}
                width={50}
                height={50}
                className="shrink-0 size-[1.8rem]"
                alt="LP Token"
              />
              <Image
                src={stay}
                width={60}
                height={60}
                className="shrink-0 size-10 "
                alt="LP Token"
              />
            </div>
          </div>
          <h3 className="font-bold text-xl">USDC/STAY</h3>
        </div>
        <Analytics />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <BuyStayWithCard />
          <BuyStayWithCrypto />
        </div>
        <Incinerator />
      </div>
    </div>
  );
};

export default Farm;
