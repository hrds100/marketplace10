"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import usd from "../images/usd.png";
import stay from "../images/stay.png";
import cards from "../images/cards.png";
import Tooltip from "@/utils/tooltip";
import { usenfstayContext } from "@/context/nfstayContext";
import {
  getEthFrom,
  getWeiFrom,
  NotifyError,
  NotifySuccess,
  truncateAmount,
} from "@/context/helper";
import WertWidget from "@wert-io/widget-initializer";
import {
  AUTHOR_IMAGE_URL,
  CONTRACT_CONFIG,
  IMAGE_URL,
  WERT_BASE_VALUE,
} from "@/config";
import { ethers } from "ethers";
import { signSmartContractData } from "@wert-io/widget-sc-signer";
import Congratulation from "./congratulation";

const BuyStayWithCard = () => {
  const {
    connectedAddress,
    getbuyLpContract,
    getValueFromRouter,
    getStayEstimation,
    handleNetwork,
  } = usenfstayContext();
  const options = [
    {
      label: "USD",
      icon: (
        <Image
          src={usd}
          className="mix-blend-multiply"
          alt="usd"
          width={20}
          height={20}
        />
      ),
      value: "usd",
      amountFactor: 2,
    },
    // { label: "EURO", icon: <Image src={eur} className='mix-blend-multiply' alt='eur' width={20} height={20} />, value: "euro", amountFactor: 3 },
  ];

  const [selectedOption] = useState(options[0]);
  const [amount, setAmount] = useState("");
  const [estimation, setEstimation] = useState(0);
  const [isLoading, setIsloading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const buyStayWithCard = async (_amountInUSDC) => {
    try {
      if (!connectedAddress) throw new Error("Please connect your wallet");

      setIsButtonLoading(true);
      await handleNetwork();

      let ABI = ["function buyStay(address, address, uint256)"];

      let iface = new ethers.utils.Interface(ABI);

      const sc_input_data = iface.encodeFunctionData("buyStay", [
        connectedAddress,
        CONTRACT_CONFIG.zeroAddress,
        getWeiFrom(_amountInUSDC),
      ]);

      const amountConversion = await getValueFromRouter(
        CONTRACT_CONFIG.WBNB,
        _amountInUSDC
      );

      const amountToBeSend = truncateAmount(getEthFrom(amountConversion));

      if (amountToBeSend === 0) {
        NotifyError("Invalid amount provided");
        return;
      }
  
      const signedData = signSmartContractData(
        {
          address: connectedAddress,
          commodity_amount: truncateAmount(
            String(amountToBeSend + WERT_BASE_VALUE)
          ),
          commodity: "BNB", //MAINNETBNB
          network: "bsc",
          // commodity: "ETH", TESTNETSEPOLIA
          // network: "sepolia",
          sc_address: CONTRACT_CONFIG.buyLp,
          sc_input_data,
        },
        process.env.NEXT_PUBLIC_WERT_PRIVATE_KEY
      );
      const icoOptions = {
        item_info: {
          author: "nfstay.com",
          author_image_url: AUTHOR_IMAGE_URL,
          image_url: IMAGE_URL,
          name: "STAY",
          category: "STAY Tokens",
        },
      };
      const otherWidgetOptions = {
        partner_id: process.env.NEXT_PUBLIC_WERT_PARTNER_ID,
        origin: process.env.NEXT_PUBLIC_WERT_BASE_URL,
        extra: icoOptions,
      };

      const wertWidget = new WertWidget({
        ...signedData,
        ...otherWidgetOptions,
        listeners: {
          "payment-status": async (data) => {
            if (data.status === "success") {
              setIsButtonLoading(false);
              setAmount("");
              wertWidget.close();
              NotifySuccess("STAY Bought Successfully");
            } else if (
              data.status === "failed" ||
              data.status === "failover" ||
              data.status === "canceled"
            ) {
              setIsButtonLoading(false);
              NotifyError("Something Went Wrong");
              setIsSuccess(true);
            }
          },
          close: () => {
            setIsButtonLoading(false);
          },
        },
      });
      wertWidget.open();
    } catch (e) {
      NotifyError(e.message || e.reason || "Something went wrong");
      console.log(e);
      setIsloading(false);
    }
  };

  useEffect(() => {
    setIsloading(true);
    if (amount > 0) {
      const delayDebounceFn = setTimeout(async () => {
        try {
          let _estimate = await getStayEstimation("USDC", amount);
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
  }, [amount]);

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg shadow border">
      <div className="flex items-center justify-between w-full">
        <h1 className="font-bold text-2xl 2xl:text-3xl">Buy STAY with CARD</h1>

        <Image src={cards} alt="cards" width={110} height={100} />
      </div>
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="w-full flex flex-col gap-5 p-3 min-w-[11rem] rounded-xl bg-[#20E19F33] bg-opacity-20">
          <div className="flex items-center justify-between font-semibold">
            <h1 className="text-base font-bold">You&apos;re Paying</h1>
            <Tooltip text="USD you will pay" />
          </div>
          <div className="flex items-center justify-between w-full overflow-hidden">
            <input
              disabled={isButtonLoading}
              type="number"
              min={0}
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

          {/* select currency */}
          <div className="w-full mx-auto relative">
            {/* Selected option */}
            <div
              className="flex justify-between items-center bg-[#1FE09D33] px-3 py-[5px] border border-[#1FE09D33] rounded-lg cursor-pointer"
              // onClick={toggleDropdown}
            >
              <span className="flex items-center space-x-2 font-semibold text-base">
                <span>{selectedOption.icon}</span>
                <span>{selectedOption.label}</span>
              </span>
            </div>
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
        disabled={isButtonLoading || isLoading || !amount || amount <= 0}
        onClick={() => {
          buyStayWithCard(amount);
        }}
        type="button"
        className="w-full disabled:bg-opacity-55 disabled:cursor-not-allowed rounded-lg bg-[#954AFC] py-2 px-4 text-center text-white my-2 text-base 2xl:text-lg font-medium flex items-center justify-center gap-2"
      >
        {isButtonLoading ? (
          <div className="w-6 h-6 border-4 border-t-[4px] border-t-[#3d4a6c] rounded-full animate-spin"></div>
        ) : (
          "Buy with Fiat"
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

export default BuyStayWithCard;
