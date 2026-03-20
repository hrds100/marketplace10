"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Strip from "./strip";
import GradientBtn from "./gradientBtn";
import ListPropertyShares from "./listPropertyShares";
import Link from "next/link";
import AuctionTimer from "./auctionTimer";
import { returnAmount } from "@/utils/showAmount";

const PropertyCard = ({
  img,
  link,
  id,
  category,
  auctionEndTime,
  startingPrice,
  title,
  location,
  exp_return,
  dvd_yield,
  dvd_freq,
  NFT_mins,
  bid_percent,
  price,
  status,
}) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Link
      href={`${link}/${id}`}
      className={`flex flex-col  rounded-lg shadow-md ${
        status?.toLowerCase() !== "buy now" && "grayscale"
      } `}
    >
      <>
        <div className="flex relative">
          <div className="h-[14rem]">
            <Image
              src={img}
              layout="fill"
              className="w-full h-full object-cover max-w-full rounded-[0.5rem_0.5rem_0_0]"
              alt="Real Estate"
            />
          </div>

          <div className="absolute -bottom-6 -left-2 z-[1]">
            {auctionEndTime ? (
              // <div className="relative">
              //     <svg width="175" height="50" viewBox="0 0 206 53" className="2xl:w-[200px] 2xl:h-[55px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              //         <path d="M8 53L0 45H8V53Z" fill="#6C0CF0" />
              //         <path d="M0 8C0 3.58172 3.58172 0 8 0H198C202.418 0 206 3.58172 206 8V37C206 41.4183 202.418 45 198 45H0V8Z" fill="#954AFC" />
              //     </svg>
              //     <div className="flex items-start flex-col w-full text-white absolute top-1/2 left-3 -translate-y-[55%]">
              //         <small className="text-[0.5rem] 2xl:text-xs">Auction Ends in</small>
              //         <span className="font-bold text-sm 2xl:text-base">{auctionEndTime}</span>
              //     </div>
              // </div>
              <AuctionTimer auctionEndTime={auctionEndTime} />
            ) : (
              <Strip price={startingPrice} />
            )}
          </div>
          <div className="flex items-center w-full justify-between px-2 absolute top-2">
            <div className="px-3 py-1 bg-white rounded-full flex items-center text-center">
              <span className="text-[0.6rem] 2xl:text-sm uppercase gradient_text font-bold">
                {category}
              </span>
            </div>
            {/* <svg width="30" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g filter="url(#filter0_dd_1_2149)">
                                <circle cx="21" cy="21" r="15" fill="white" />
                            </g>
                            <path d="M15.8787 16.8579C15.6001 17.1298 15.3791 17.4527 15.2284 17.8081C15.0776 18.1634 15 18.5443 15 18.9289C15 19.3136 15.0776 19.6944 15.2284 20.0498C15.3791 20.4052 15.6001 20.728 15.8787 21L21 26L26.1213 21C26.6839 20.4507 27 19.7057 27 18.9289C27 18.1521 26.6839 17.4072 26.1213 16.8579C25.5587 16.3086 24.7956 16 24 16C23.2043 16 22.4413 16.3086 21.8787 16.8579L21 17.7157L20.1213 16.8579C19.8428 16.5859 19.512 16.3701 19.1481 16.223C18.7841 16.0758 18.394 16 18 16C17.606 16 17.2159 16.0758 16.852 16.223C16.488 16.3701 16.1573 16.5859 15.8787 16.8579V16.8579Z" stroke="url(#paint0_linear_1_2149)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            <defs>
                                <filter id="filter0_dd_1_2149" x="0" y="0" width="42" height="42" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                    <feOffset dy="2" />
                                    <feGaussianBlur stdDeviation="2" />
                                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0" />
                                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_2149" />
                                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                    <feOffset />
                                    <feGaussianBlur stdDeviation="3" />
                                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0" />
                                    <feBlend mode="normal" in2="effect1_dropShadow_1_2149" result="effect2_dropShadow_1_2149" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_1_2149" result="shape" />
                                </filter>
                                <linearGradient id="paint0_linear_1_2149" x1="15" y1="13.9166" x2="27.1726" y2="14.0931" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#9945FF" />
                                    <stop offset="1" stop-color="#20E19F" />
                                </linearGradient>
                            </defs>
                        </svg> */}
          </div>
        </div>
        <div className="flex flex-col p-3 pt-8 gap-4 divide-y">
          <div className="flex flex-col gap-2">
            <h1 className="font-bold text-xl max-w-[18rem] 2xl:text-3xl 2xl:max-w-[35rem]">
              {title}
            </h1>
            <span className="text-xs opacity-60 2xl:text-base">
              {location?.location}
            </span>
          </div>
          <div className="flex items-center py-2 justify-between gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="font-bold text-sm 2xl:text-2xl">{exp_return}%</h1>
              <span className="text-[0.6rem] opacity-60 2xl:text-sm">
                Expected Return
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="font-bold text-sm 2xl:text-2xl">{dvd_yield}%</h1>
              <span className="text-[0.6rem] opacity-60 2xl:text-sm">
                Dividend Yield
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="font-bold text-sm 2xl:text-2xl">{dvd_freq}</h1>
              <span className="text-[0.6rem] opacity-60 2xl:text-sm">
                Dividend Frequency
              </span>
            </div>
          </div>

          {bid_percent ? (
            <div className="flex flex-col items-center justify-center gap-1 pt-4">
              <span className="text-[0.65rem] opacity-80 2xl:text-base">
                The highest current bid is
              </span>
              <span className="font-semibold text-sm 2xl:text-lg">
                {bid_percent}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-2">
              <h3 className="font-semibold text-xs 2xl:text-xl">
                {NFT_mins} of 100 NFTs minted
              </h3>
              <div className="w-full h-2.5 rounded-full bg-[#F7F6FF] card_progress relative overflow-hidden" />
            </div>
          )}
          <div className="flex justify-between items-end gap-2 w-full py-2">
            <div className="flex flex-col gap-1">
              <span className="text-[0.6rem] opacity-60 2xl:text-lg">
                Minimum Investment
              </span>
              <h1 className="font-bold text-sm 2xl:text-xl">{returnAmount(price)} USD</h1>
            </div>
            <GradientBtn
              handleClick={() => router.push(`${link}/${id}`)}
              text={status}
              size="text-sm"
            />
          </div>
        </div>
      </>
    </Link>
  );
};

export default PropertyCard;
