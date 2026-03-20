"use client";

import { useState, useMemo, useEffect } from "react";
import { useModal } from "@particle-network/connectkit";
import { useNfstayContext } from "@/context/NfstayContext";


const LoginButton = ({ css, isHome = false }) => {
  const { setOpen } = useModal();


  const { connectedAddress,  setLoginModelOpen, isWrongNetwork, handleNetwork, isWalletLoading } =
    useNfstayContext();
  // Memoized address display for performance
  const displayAddress = useMemo(() => {
    if (!connectedAddress) return null;
    return `${connectedAddress.slice(0, 5)}...${connectedAddress.slice(-4)}`;
  }, [connectedAddress]);

  // Common class names
  const buttonBaseClass =
    "inline-flex w-fit h-[40px] px-6 sm:text-sm rounded-full transition-all backdrop-blur-[29.60px] justify-center items-center gap-3";
  const wrongNetworkClass =
    "bg-red-500 text-white sm:!text-sm font-semibold block 2xl:text-lg";
  const connectedClass =
    "btn_primary_gradient text-white sm:!text-sm font-semibold block 2xl:text-lg";
  const loginClass =
    "border border-[#9945FF] text-[#9945FF] rounded-full px-6 py-1.5 font-medium 2xl:!text-xl";

  const handleOpenModal = () => {
    setOpen(true);
  };

  const handleSwitch = async () => {
    try {
      await handleNetwork();
      setOpen(false);
    } catch (error) {
      console.log("🚀 ~ handleSwitch ~ error:", error);
    }
  };



  return (
    <>
      {connectedAddress ? (
        <div className={css}>
          {isWrongNetwork ? (
            <button
              className={`${buttonBaseClass} ${wrongNetworkClass}`}
              onClick={handleSwitch}
            >
              Wrong Network
            </button>
          ) : (
            <button
              className={`${buttonBaseClass} !text-xs  ${connectedClass} ${
                isHome && "!hidden"
              }`}
              onClick={handleOpenModal}
            >
              {displayAddress}
            </button>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={() => setLoginModelOpen(true)}
            className={`${loginClass} ${css}`}
          >
            Login
          </button>
         
        </>
      )}
    </>
  );
};

export default LoginButton;
