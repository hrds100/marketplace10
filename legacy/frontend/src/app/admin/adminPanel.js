import Image from "next/image";
import bnb from "../images/bnb.webp";
import { getEthFrom } from "@/context/helper";
import { useEffect, useState } from "react";
import { ADMIN_WALLET, CONTRACT_CONFIG } from "@/config";
import { ethers } from "ethers";
import stay from "../images/stay.png";
import usdc from "../images/usdc.svg";
import { useNfstayContext } from "@/context/NfstayContext";

const AdminPanel = ({ fetchBalances, isLoading, stayBalance, bnbBalance ,usdcBalance}) => {

  useEffect(() => {
    fetchBalances();
  }, []);

  return (
    <div className="flex gap-5 flex-col justify-between">
      <h4 className="text-title-lg font-bold text-black">Admin Panel</h4>

      <div className="border border-gray-300 rounded-xl shadow-sm drop-shadow-sm p-4 w-full sm:max-w-sm flex flex-col gap-4">
        <h2 className="text-lg font-bold text-black">Manager Balance</h2>

        {/* Wrap balances in a flex row */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Image
              src={bnb}
              width={30}
              height={30}
              alt="bnb"
              className="w-6 h-6"
            />
            {isLoading ? (
              <div className="w-20 h-6 bg-gray-200 animate-pulse rounded" />
            ) : (
              <p className="text-black font-bold text-lg">{bnbBalance}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Image
              src={stay}
              width={30}
              height={30}
              alt="stay"
              className="w-6 h-6"
            />
            {isLoading ? (
              <div className="w-20 h-6 bg-gray-200 animate-pulse rounded" />
            ) : (
              <p className="text-black font-bold text-lg">{stayBalance}</p>
            )}
          </div>
        </div>
      </div>
      <div className="border border-gray-300 rounded-xl shadow-sm drop-shadow-sm p-4 w-full sm:max-w-sm flex flex-col gap-4">
        <h2 className="text-lg font-bold text-black">Treasury Balance</h2>

        {/* Wrap balances in a flex row */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Image
              src={usdc}
              width={30}
              height={30}
              alt="usdc"
              className="w-6 h-6"
            />
            {isLoading ? (
              <div className="w-20 h-6 bg-gray-200 animate-pulse rounded" />
            ) : (
              <p className="text-black font-bold text-lg">{usdcBalance}</p>
            )}
          </div>

          {/* <div className="flex items-center gap-2">
            <Image
              src={stay}
              width={30}
              height={30}
              alt="stay"
              className="w-6 h-6"
            />
            {isLoading ? (
              <div className="w-20 h-6 bg-gray-200 animate-pulse rounded" />
            ) : (
              <p className="text-black font-bold text-lg">{stayBalance}</p>
            )}
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
