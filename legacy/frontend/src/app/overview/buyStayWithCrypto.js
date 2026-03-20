"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import usd from "../images/usdc.svg";
import bnb from "../images/bnb.webp";
import stay from "../images/stay.png";
import Tooltip from "@/utils/tooltip";
import { useNfstayContext } from "@/context/NfstayContext";
import {
  getErrorMessage,
  getEthFrom,
  getWeiFrom,
  NotifyError,
  NotifySuccess,
} from "@/context/helper";
import { CONTRACT_CONFIG } from "@/config";
import Congratulation from "./congratulation";

const BuyStayWithCrypto = () => {
  const {
    getStayEstimation,
    connectedAddress,
    getbuyLpContract,
    checkForApproval,
    handleNetwork,
    balanceChecker,
  } = useNfstayContext();
  const [amount, setAmount] = useState("");
  const [estimation, setEstimation] = useState("");
  const [isLoading, setIsloading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const options = [
    {
      label: "USDC",
      icon: (
        <Image
          src={usd}
          className="mix-blend-multiply"
          alt="usd"
          width={20}
          height={20}
        />
      ),
      value: "USDC",
      //   amountFactor: 3,
    },
    {
      label: "BNB",
      icon: (
        <Image
          src={bnb}
          className="mix-blend-multiply"
          alt="bnb"
          width={20}
          height={20}
        />
      ),
      value: "BNB",
      //   amountFactor: 2,
    },
  ];
  const [selectedOption, setSelectedOption] = useState(options[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [approvalState, setApprovalState] = useState(false);
  let step = 0;

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setIsOpen(false); // Close dropdown on selection
  };
  const handleSwap = async (address, amount) => {
    try {
      if (!connectedAddress) return NotifyError("Please connect your wallet");
      setIsButtonLoading(true);
      await handleNetwork();

      const contract = getbuyLpContract(true);
      let isUSDC = selectedOption.value === "USDC";
      let currency = CONTRACT_CONFIG.zeroAddress;
      let _value = "0"; // Default value is zero for USDC
      let _amount = "0";

      if (isUSDC) {
        currency = CONTRACT_CONFIG.USDC;
        let res = await checkForApproval("USDC", amount, CONTRACT_CONFIG.buyLp);
        await balanceChecker(address, amount, currency);
        setApprovalState(res);
        _amount = getWeiFrom(amount);
      } else {
        await balanceChecker(address, amount, currency);
        _value = getWeiFrom(amount);
      }

      await contract.callStatic.buyStay(connectedAddress, currency, _amount, {
        value: _value,
      });

      let _swap = await contract.buyStay(connectedAddress, currency, _amount, {
        value: _value,
      });

      await _swap.wait();
      setAmount("");
      setIsSuccess(true);
    } catch (err) {
      console.log(err);
      const _msg = getErrorMessage(err);
      NotifyError(_msg);
    } finally {
      setApprovalState(false);

      setIsButtonLoading(false);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    setIsloading(true);
    if (amount > 0) {
      const delayDebounceFn = setTimeout(async () => {
        try {
          let _estimate = await getStayEstimation(selectedOption.value, amount);
          setEstimation(_estimate);
        } catch (err) {
          console.log("error in fetching stay estimation", err);
        } finally {
          setIsloading(false);
        }
      }, 500); // 500 ms debounce delay
      // Cleanup function to clear the timeout if `amount` or `selectedOption` changes
      return () => clearTimeout(delayDebounceFn);
    } else {
      setEstimation(0);
      setIsloading(false);
    }
  }, [selectedOption, amount]);

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg shadow border">
      <h1 className="font-bold text-2xl 2xl:text-3xl">Buy STAY with Crypto</h1>
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full flex flex-col gap-5 p-3 min-w-[11rem] rounded-lg bg-[#20E19F33] bg-opacity-20">
          <div className="flex items-center justify-between font-semibold">
            <h1 className="text-base font-bold">You&apos;re Paying</h1>
            <Tooltip text={`${selectedOption.value} you will pay`} />
          </div>
          <div className="flex items-center disabled:bg-opacity-55 disabled:cursor-not-allowed  justify-between w-full overflow-hidden">
            <input
              type="number"
              min={0}
              disabled={isButtonLoading}
              className={`font-bold text-3xl text-black ${
                amount == 0 ? "opacity-20" : "opacity-100"
              } transition-all bg-transparent 2xl:text-3xl border-none outline-none`}
              placeholder="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
              }}
            />
          </div>
          <div className="w-full mx-auto relative">
            {/* Selected option */}
            <div
              className="flex justify-between items-center bg-[#1FE09D33] px-3 py-[5px] border border-[#1FE09D33] rounded-lg cursor-pointer"
              onClick={isLoading ? undefined : toggleDropdown}
            >
              <span className="flex items-center space-x-2 font-semibold text-base">
                <span>{selectedOption.icon}</span>
                <span>{selectedOption.label}</span>
              </span>
              <span className="ml-2">
                {isOpen ? (
                  <span className="text-lg font-bold">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="rotate-180"
                      version="1.1"
                      id="Capa_1"
                      x="0px"
                      y="0px"
                      width="24px"
                      height="24px"
                      viewBox="0 0 960 560"
                      enable-background="new 0 0 960 560"
                    >
                      <g id="Rounded_Rectangle_33_copy_4_1_">
                        <path d="M480,344.181L268.869,131.889c-15.756-15.859-41.3-15.859-57.054,0c-15.754,15.857-15.754,41.57,0,57.431l237.632,238.937   c8.395,8.451,19.562,12.254,30.553,11.698c10.993,0.556,22.159-3.247,30.555-11.698l237.631-238.937   c15.756-15.86,15.756-41.571,0-57.431s-41.299-15.859-57.051,0L480,344.181z" />
                      </g>
                    </svg>{" "}
                  </span>
                ) : isLoading ? (
                  ""
                ) : (
                  <span className=" text-lg font-bold">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      version="1.1"
                      id="Capa_1"
                      x="0px"
                      y="0px"
                      width="24px"
                      height="24px"
                      viewBox="0 0 960 560"
                      enable-background="new 0 0 960 560"
                    >
                      <g id="Rounded_Rectangle_33_copy_4_1_">
                        <path d="M480,344.181L268.869,131.889c-15.756-15.859-41.3-15.859-57.054,0c-15.754,15.857-15.754,41.57,0,57.431l237.632,238.937   c8.395,8.451,19.562,12.254,30.553,11.698c10.993,0.556,22.159-3.247,30.555-11.698l237.631-238.937   c15.756-15.86,15.756-41.571,0-57.431s-41.299-15.859-57.051,0L480,344.181z" />
                      </g>
                    </svg>{" "}
                  </span>
                )}
              </span>
            </div>

            {/* Dropdown options */}
            {isOpen && (
              <div
                className={`absolute z-10 mt-2 w-full bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto ${
                  isLoading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
              >
                {options.map((option, i) => (
                  <div
                    key={i}
                    className={`flex items-center space-x-2 p-3 hover:bg-gray-100 font-semibold text-base `}
                    onClick={() => !isLoading && handleOptionClick(option)} // Prevent click during loading
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <svg
          width="24"
          height="24"
          className="shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 11L20 7M20 7L16 3M20 7L4 7M8 13L4 17M4 17L8 21M4 17L20 17"
            stroke="url(#paint0_linear_0_4533)"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <defs>
            <linearGradient
              id="paint0_linear_0_4533"
              x1="23.3334"
              y1="3"
              x2="23.0852"
              y2="21.2594"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#9945FF" />
              <stop offset="1" stop-color="#20E19F" />
            </linearGradient>
          </defs>
        </svg>

        <div className="w-full flex flex-col gap-5 p-3 min-w-[11rem] rounded-lg bg-[#9A47FF1A] bg-opacity-20">
          <div className="flex items-center justify-between font-semibold">
            <h1 className="text-base font-bold">You&apos;re Buying</h1>
            <Tooltip text="STAY you will receive" />
          </div>
          <div className="flex items-center justify-between">
            {isLoading ? (
              // Skeleton Loader
              <div className="bg-gray-200 rounded h-8 w-32 animate-pulse"></div>
            ) : (
              <input
                type="number"
                className={`font-bold text-3xl text-black ${
                  amount == 0 ? "opacity-20" : "opacity-100"
                } transition-all bg-transparent 2xl:text-3xl border-none outline-none`}
                placeholder="0"
                value={amount > 0 ? estimation : ""}
                readOnly
              />
            )}
          </div>

          {/* select currency */}
          <div className="flex items-center gap-1 shadow-1 border p-[8px] px-2 rounded-lg bg-[#9A47FF33] font-bold 2xl:text-lg">
            <Image width={25} height={25} src={stay} alt="Flag" />
            <span className="uppercase">Stay</span>
          </div>
        </div>
      </div>
      <button
        disabled={isButtonLoading || isLoading || amount <= 0}
        onClick={() => handleSwap(connectedAddress, amount)}
        type="button"
        className="w-full rounded-lg bg-[#954AFC] py-2 px-4 disabled:bg-opacity-55 disabled:cursor-not-allowed text-center text-white my-2 text-base 2xl:text-lg font-medium flex items-center justify-center gap-2"
      >
        {isButtonLoading ? (
          <>
            {" "}
            <div className="w-6 h-6 border-4 border-t-[4px] border-t-[#fff] border-solid rounded-full animate-spin"></div>
            {!approvalState && selectedOption.value === "USDC"
              ? "Approval Pending (1/2)"
              : `Swapping tokens ${
                  selectedOption.value === "USDC" ? "(2/2)" : ""
                }`}
          </>
        ) : (
          "Swap Now"
        )}
      </button>
      <Congratulation
        open={isSuccess}
        handleClose={() => {
          setIsSuccess(false);
        }}
      />
    </div>
  );
};

export default BuyStayWithCrypto;
