"use client";
import Image from "next/image";
import mobile from "../images/carousel_mobile.svg";
import dividend from "../images/dividend.svg";
import portfolio from "../images/portfolio.svg";
import hero from "../images/hero_bg.jpg";
import b4 from "../images/b-4.png";
import Link from "next/link";
import { useState } from "react";
import { useNfstayContext } from "@/context/NfstayContext";

const Carousel = () => {
  const { connectedAddress, setLoginModelOpen } = useNfstayContext();

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex items-center  flex-col md:flex-row self-center gap-5 md:gap-16 justify-between w-full overflow-hidden  isolate relative rounded-3xl px-12 ">
        <Image
          src={hero}
          layout="fill"
          className="absolute inset-0 -z-[1]"
          objectFit="cover"
          alt="Hero"
        />
        <div className="flex flex-col md:w-2/3 gap-8 py-4 pt-8 md:pt-0">
          <h1 className="font-bold text-5xl max-w-[30rem] leading-tight">
            Buy Your First Rent2Rent Share in Seconds
          </h1>
          <p className="text-lg text-[#0B0924] max-w-[25rem]">
            {"The world's highest Real Estate income generator."}
          </p>
          {/* <button className="p-4 px-8 bg-[#954AFC] text-white rounded-full w-fit font-medium text-sm 2xl:text-lg">
            Get Started
          </button> */}

          {!connectedAddress ? (
            <button
              onClick={() => setLoginModelOpen(true)}
              className={`p-4 px-8 bg-[#954AFC] text-white rounded-full w-fit font-medium text-sm 2xl:text-lg`}
            >
              Get Started
            </button>
          ) : (
            <Link
              href="/marketplace"
              className={`p-4 px-8 bg-[#954AFC] text-white rounded-full w-fit font-medium text-sm 2xl:text-lg`}
            >
              Get Started
            </Link>
          )}
        </div>
        <div className="flex h-full md:w-1/2 relative">
          <Image
            src={mobile}
            width={200}
            height={100}
            className="h-full max-w-full mt-8 w-[300px] 2xl:w-[400px]"
            alt="Mobile"
          />

          <Image
            src={dividend}
            width={250}
            height={51}
            className="absolute bottom-0 -left-60 shake_right w-[300px] 2xl:w-[400px]"
            alt="Dividend"
          />
          <Image
            src={portfolio}
            width={250}
            height={51}
            className="absolute top-6 right-0 shake_left w-[300px] 2xl:w-[400px]"
            alt="Portfolio"
          />

          <div className="w-[270px] h-fit p-3 shake shadow-lg rounded-xl bg-white flex flex-col gap-5 absolute top-24 2xl:top-44 -left-44">
            <div className="flex items-center gap-2">
              <div className="2xl:w-[60px] 2xl:h-[60px] w-[40px] h-[40px] rounded-full overflow-hidden shrink-0">
                <Image src={b4} className="w-full h-full max-w-full" />
              </div>
              <div className="flex flex-col gap-2">
                <h1 className="font-bold text-xs">Apartment 06</h1>
                <p className="text-[#0B0924] text-xs">
                  Manchester, United Kingdom
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between w-full pb-2 border-b-2 border-b-[#0b09242d] ">
                <p className="text-[#0B0924] text-xs capitalize">
                  market Value
                </p>
                <h1 className="font-bold text-xs">$350,000</h1>
              </div>
              <div className="flex items-center justify-between w-full pb-2 border-b-2 border-b-[#0b09242d] ">
                <p className="text-[#0B0924] text-xs capitalize">
                  Current Value
                </p>
                <h1 className="font-bold text-xs">$370,000</h1>
              </div>
              <div className="flex items-center justify-between w-full pb-2 border-b-2 border-b-[#0b09242d] ">
                <p className="text-[#0B0924] text-xs capitalize">Surplus</p>
                <h1 className="font-bold text-xs">$20,000</h1>
              </div>
            </div>
          </div>
          <div className="w-[270px] h-fit p-4 shake shadow-lg rounded-xl bg-white flex flex-col gap-5 absolute bottom-0 right-0 2xl:right-20">
            <span className="text-base font-medium opacity-50">Buy Shares</span>
            <div className="flex items-center gap-2">
              {" "}
              <span className="text-3xl font-extralight opacity-50">
                $
              </span>{" "}
              <span className="text-3xl font-bold">100</span>
            </div>
            <button className="px-8 py-1.5 bg-[#954AFC] text-white rounded-full w-full font-medium text-sm 2xl:text-lg capitalize">
              Buy now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Carousel;
