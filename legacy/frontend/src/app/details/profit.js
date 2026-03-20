import React, { useState } from "react";
import YearPlan from "./yearPlan";
import { acceptWholeNumbers } from "@/utils/acceptWholeNumbers";

const Profit = ({ onBuyNowClick, propertyDetails }) => {
  const [initialAmount, setInitialAmount] = useState(100);
  const [appreciation] = useState(propertyDetails.apr); // percent
  const [holdingPeriod] = useState(5); // years
  const dividendYield = propertyDetails.apr / 12;
  const totalAverageAnnualizedReturn = (appreciation * holdingPeriod).toFixed(
    2
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[68%_30%] gap-5">
      <div className="flex flex-col gap-5 border rounded-lg shadow">
        <div className="w-full border-b-2 p-4">
          <h4 className="text-lg font-bold text-black 2xl:text-2xl">
            How much can you earn with this Property?
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 p-4 gap-5">
          <div className="flex flex-col gap-3">
            <p className="opacity-60 2xl:text-base">Initial Amount</p>
            <div className="flex items-center bg-[#F5F5F5]  rounded-lg w-full justify-between border px-4 py-2 font-bold text-lg">
              <input
                type="number"
                min={0}
                value={initialAmount}
                onChange={(e) => setInitialAmount(acceptWholeNumbers(e))}
                className="w-full bg-[#F5F5F5] border-none outline-none font-bold text-lg"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="opacity-60 2xl:text-base">
              Expected Annual Appreciaton %
            </p>
            <div className="flex items-center bg-[#F5F5F5]  rounded-lg w-full justify-between border px-4 py-2 font-bold text-lg">
              <input
                type="number"
                min={0}
                value={appreciation}
                disabled
                className="w-full bg-[#F5F5F5] opacity-20 border-none outline-none font-bold text-lg"
              />

              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.0001 17.3501C12.9003 17.3501 13.6301 16.6203 13.6301 15.7201C13.6301 14.8199 12.9003 14.0901 12.0001 14.0901C11.0999 14.0901 10.3701 14.8199 10.3701 15.7201C10.3701 16.6203 11.0999 17.3501 12.0001 17.3501Z"
                  fill="#292D32"
                />
                <path
                  d="M18.28 9.53V8.28C18.28 5.58 17.63 2 12 2C6.37 2 5.72 5.58 5.72 8.28V9.53C2.92 9.88 2 11.3 2 14.79V16.65C2 20.75 3.25 22 7.35 22H16.65C20.75 22 22 20.75 22 16.65V14.79C22 11.3 21.08 9.88 18.28 9.53ZM12 18.74C10.33 18.74 8.98 17.38 8.98 15.72C8.98 14.05 10.34 12.7 12 12.7C13.66 12.7 15.02 14.06 15.02 15.72C15.02 17.39 13.67 18.74 12 18.74ZM7.35 9.44C7.27 9.44 7.2 9.44 7.12 9.44V8.28C7.12 5.35 7.95 3.4 12 3.4C16.05 3.4 16.88 5.35 16.88 8.28V9.45C16.8 9.45 16.73 9.45 16.65 9.45H7.35V9.44Z"
                  fill="#292D32"
                />
              </svg>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="opacity-60 2xl:text-base">Net Dividend Yield %</p>
            <div className="flex items-center bg-[#F5F5F5]  rounded-lg w-full justify-between border px-4 py-2 font-bold text-lg">
              <input
                type="number"
                min={0}
                value={dividendYield.toFixed(2)}
                disabled
                className="w-full bg-[#F5F5F5] opacity-20 border-none outline-none font-bold text-lg"
              />

              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.0001 17.3501C12.9003 17.3501 13.6301 16.6203 13.6301 15.7201C13.6301 14.8199 12.9003 14.0901 12.0001 14.0901C11.0999 14.0901 10.3701 14.8199 10.3701 15.7201C10.3701 16.6203 11.0999 17.3501 12.0001 17.3501Z"
                  fill="#292D32"
                />
                <path
                  d="M18.28 9.53V8.28C18.28 5.58 17.63 2 12 2C6.37 2 5.72 5.58 5.72 8.28V9.53C2.92 9.88 2 11.3 2 14.79V16.65C2 20.75 3.25 22 7.35 22H16.65C20.75 22 22 20.75 22 16.65V14.79C22 11.3 21.08 9.88 18.28 9.53ZM12 18.74C10.33 18.74 8.98 17.38 8.98 15.72C8.98 14.05 10.34 12.7 12 12.7C13.66 12.7 15.02 14.06 15.02 15.72C15.02 17.39 13.67 18.74 12 18.74ZM7.35 9.44C7.27 9.44 7.2 9.44 7.12 9.44V8.28C7.12 5.35 7.95 3.4 12 3.4C16.05 3.4 16.88 5.35 16.88 8.28V9.45C16.8 9.45 16.73 9.45 16.65 9.45H7.35V9.44Z"
                  fill="#292D32"
                />
              </svg>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="opacity-60 2xl:text-base">Holding Period</p>
            <div className="flex items-center bg-[#F5F5F5]  rounded-lg w-full justify-between border px-4 py-2 font-bold text-lg">
              <input
                type="number"
                min={0}
                value={holdingPeriod}
                disabled
                className="w-full bg-[#F5F5F5] opacity-20 border-none outline-none font-bold text-lg"
              />

              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.0001 17.3501C12.9003 17.3501 13.6301 16.6203 13.6301 15.7201C13.6301 14.8199 12.9003 14.0901 12.0001 14.0901C11.0999 14.0901 10.3701 14.8199 10.3701 15.7201C10.3701 16.6203 11.0999 17.3501 12.0001 17.3501Z"
                  fill="#292D32"
                />
                <path
                  d="M18.28 9.53V8.28C18.28 5.58 17.63 2 12 2C6.37 2 5.72 5.58 5.72 8.28V9.53C2.92 9.88 2 11.3 2 14.79V16.65C2 20.75 3.25 22 7.35 22H16.65C20.75 22 22 20.75 22 16.65V14.79C22 11.3 21.08 9.88 18.28 9.53ZM12 18.74C10.33 18.74 8.98 17.38 8.98 15.72C8.98 14.05 10.34 12.7 12 12.7C13.66 12.7 15.02 14.06 15.02 15.72C15.02 17.39 13.67 18.74 12 18.74ZM7.35 9.44C7.27 9.44 7.2 9.44 7.12 9.44V8.28C7.12 5.35 7.95 3.4 12 3.4C16.05 3.4 16.88 5.35 16.88 8.28V9.45C16.8 9.45 16.73 9.45 16.65 9.45H7.35V9.44Z"
                  fill="#292D32"
                />
              </svg>
            </div>
          </div>
        </div>

        <YearPlan
          initialAmount={initialAmount}
          annualAppreciation={appreciation}
          holdingPeriod={holdingPeriod}
          netDividendYield={dividendYield}
        />

        <p className="text-center text-xs my-4 max-w-xl self-center opacity-80 2xl:text-base 2xl:max-w-2xl">
          This calculator is for illustrative purposes only. Buying a
          real-estate NFT carries risk and you may not receive the anticipated
          returns.
        </p>
      </div>
      <div className="flex flex-col gap-5 border rounded-lg shadow">
        <div className="w-full border-b-2 p-4">
          <h4 className="text-lg font-bold text-black 2xl:text-2xl">
            Overview
          </h4>
        </div>
        <div className="px-4 gap-5 flex flex-col divide-y-2">
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-lg 2xl:text-2xl">
              {totalAverageAnnualizedReturn}%
            </h3>
            <p className="opacity-60 2xl:text-base">
              Expected Return on Investment
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <h3 className="font-bold text-lg 2xl:text-2xl">
              {(initialAmount * (dividendYield / 100)).toLocaleString()} USD
            </h3>
            <p className="opacity-60 2xl:text-base">Monthly Rental Income</p>
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <h3 className="font-bold text-lg 2xl:text-2xl">
              {initialAmount * (appreciation / 100).toFixed(2)} USD
            </h3>
            <p className="opacity-60 2xl:text-base">Yearly Rental Income</p>
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <h3 className="font-bold text-2xl flex items-center gap-2 text-[#954AFC]">
              {(holdingPeriod * appreciation).toLocaleString()} USD
            </h3>
            <p className="opacity-60 2xl:text-base">Total Expected Value</p>
          </div>

          <div className="py-4">
            <button
              onClick={onBuyNowClick}
              type="button"
              className="btn_primary_gradient w-full whitespace-nowrap 2xl:text-lg px-5 py-2.5 rounded-full h-fit font-medium text-white flex items-center gap-2 justify-center"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profit;
