"use client";
import Image from "next/image";
import incomeGen from "../images/incomeGen.svg";
import { useState } from "react";
import { useNfstayContext } from "@/context/NfstayContext";
import Link from "next/link";
const IncomeGen = () => {
  const { connectedAddress, setLoginModelOpen } = useNfstayContext();

  return (
    <>
    <div id="hiw" className="flex flex-col gap-8 py-8 w-full ">
      <div className="flex items-center flex-col gap-5 self-center justify-center w-full md:max-w-[28rem] 2xl:max-w-[40rem]">
        <div className=" bg-[#954AFC1A] px-2 py-1 rounded-[50px] justify-center items-center inline-flex">
          <span className="text-center text-violet-500 text-xs font-bold  leading-normal 2xl:text-lg">
            HOW DOES IT WORK
          </span>
        </div>
        <h1 className="text-[32px] leading-[48px] 2xl:text-5xl text-center font-bold">
          Invest in income-generating real estate, easily.
        </h1>
      </div>
      <div className="flex items-center justify-center w-full scale_in">
        <div className="flex items-center flex-col  md:flex-row justify-between w-full md:max-w-5xl 2xl:max-w-7xl gap-10 ">
          <Image
            src={incomeGen}
            width={500}
            height={500}
            className="rounded-xl 2xl:w-full 2xl:h-full"
            alt="Income Generating Real Estate "
          />
          <div className="flex flex-col gap-10  items-center md:items-start  w-full  justify-between p-8 sm:p-0">
            <ul className="numbers flex flex-col text-[28px] font-semibold w-full max-w-full sm:max-w-[25rem] 2xl:max-w-[30rem] 2xl:text-3xl items-start gap-5">
              <li>Create your profile in 3 minutes</li>
              <li>Choose property and invest</li>
              <li>Withdraw or reinvest your monthly earnings</li>
            </ul>

            {!connectedAddress ? (
              <button
                onClick={() => setLoginModelOpen(true)}
                className={`w-fit text-xl 2xl:text-base border-none btn_primary_gradient whitespace-nowrap rounded-full px-6 py-1.5 font-medium text-white`}
              >
                Get Started
              </button>
            ) : (
              <Link
                href="/dashboard"
                className={`w-fit text-xl 2xl:text-base border-none btn_primary_gradient whitespace-nowrap rounded-full px-6 py-1.5 font-medium text-white`}
              >
                Get Started
              </Link>
            )}
           
          </div>
        </div>
      </div>
    </div>
    
   </>
  );
};

export default IncomeGen;
