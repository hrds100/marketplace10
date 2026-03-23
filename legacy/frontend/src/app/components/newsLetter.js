"use client";
import Image from "next/image";
// import newsLetter from "../images/newsLetter.svg";
import mobile from "../images/hero_mobile.png";
import dividend from "../images/dividend.svg";
import portfolio from "../images/portfolio.svg";
import { usenfstayContext } from "@/context/nfstayContext";
import { useState } from "react";
import Link from "next/link";
const NewsLetter = () => {
  const { connectedAddress,setLoginModelOpen } = usenfstayContext();
 
  return (
    <div className="flex flex-col p-4 gap-8 py-8 w-full">
      <div className="flex items-center flex-col md:flex-row gap-5 self-center justify-between w-full max-w-6xl 2xl:max-w-[90rem] bg-[#954AFC] rounded-3xl px-8 pt-8">
        <div className="flex flex-col w-full gap-8">
          <h1 className="text-4xl text-white font-bold ">
            Invest With nfstay Today And Start Building Your Real Estate Empire
          </h1>

          {!connectedAddress ? (
            <button
              onClick={() => setLoginModelOpen(true)}
              className="px-3 py-2 bg-white rounded-full w-fit font-medium text-sm 2xl:text-xl"
            >
              Get Started
            </button>
          ) : (
            <Link
              href="/dashboard"
              className={`px-3 py-2 bg-white rounded-full w-fit font-medium text-sm 2xl:text-xl`}
            >
              Get Started
            </Link>
          )}
         
        </div>

        <div className="flex h-full w-full relative">
          <Image src={mobile} className="h-full max-w-full " alt="Mobile" />

          <Image
            src={dividend}
            width={250}
            height={51}
            className="absolute bottom-0 left-0 move_right_to_left 2xl:w-[400px]"
            alt="Dividend"
          />
          <Image
            src={portfolio}
            width={250}
            height={51}
            className="absolute top-6 right-0 move_left_to_right 2xl:w-[400px]"
            alt="Portfolio"
          />
        </div>
      </div>
    </div>
  );
};

export default NewsLetter;
