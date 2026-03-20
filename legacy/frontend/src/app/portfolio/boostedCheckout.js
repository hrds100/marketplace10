"use client";
import Modal from "@/utils/modal";
import ModalHeader from "@/utils/modalHeader";
import Image from "next/image";
import img from "../images/room.png";
import usdt from "../images/usdc.svg";
import bnb from "../images/bnb.webp";
import { useState } from "react";
import Congratulations from "./congrats";
import { useNfstayContext } from "@/context/NfstayContext";
import {
  getErrorMessage,
  getEthFrom,
  getWeiFrom,
  NotifyError,
} from "@/context/helper";
import { CONTRACT_CONFIG } from "@/config";

const BoostedCheckout = ({
  checkIfBoosted = () => {},
  boostAmount,
  setBoostAmount,
  open,
  property,
  // handleSetIndex,
  setOpen,
}) => {
  const {
    getBoosterContract,
    connectedAddress,
    getValueFromRouter,
    getBoostAmount,
    checkForApproval,
    handleNetwork,
    balanceChecker,
  } = useNfstayContext();
  const [currentMethod, setCurrentMethod] = useState("USDC");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);

  

  const handleBoost = async (currentMethod) => {
    try {
      setIsLoading(true);
      await handleNetwork();
      let _currency;
      let _value = "0";
      const contract = getBoosterContract(true);
      // const boostFee = await contract.getBoostFeeBips();

      const boostAmount = await getBoostAmount(connectedAddress, property.id);
      // const boostAmountWithFee =
      //   Number(boostAmount) + Number(boostAmount * (boostFee._hex / 100));

      if (currentMethod === "USDC") {
        setIsApprovalLoading(true);

        await checkForApproval(
          currentMethod,
          boostAmount,
          CONTRACT_CONFIG.booster
        );
        _currency = CONTRACT_CONFIG.USDC;
        await balanceChecker(connectedAddress, Number(boostAmount), _currency);
        setIsApprovalLoading(false);
      } else {
        _value = await getValueFromRouter(CONTRACT_CONFIG.WBNB, boostAmount);
        _currency = CONTRACT_CONFIG.zeroAddress;
        await balanceChecker(
          connectedAddress,
          getEthFrom(_value.toString()),
          _currency
        );
      }
      await contract.callStatic.boost(
        connectedAddress,
        property.id,
        _currency,
        { value: _value }
      );
      const tx = await contract.boost(
        connectedAddress,
        property.id,
        _currency,
        { value: _value }
      );

      await tx.wait();
      setBoostAmount(0);
      checkIfBoosted(connectedAddress, property.id);
      // handleSetIndex();
      setOpen(false);
      setTimeout(() => {
        setIsSuccess(true);
      }, 800);
    } catch (err) {
      console.log(err);
      const _msg = getErrorMessage(err);
      NotifyError(_msg);
    } finally {
      setIsLoading(false);
      setIsApprovalLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} handleClose={() => setOpen(false)}>
        <div className="flex flex-col w-full p-4 gap-5 ">
          <ModalHeader
            title={"Complete Checkout"}
            handleClose={() => setOpen(false)}
          />

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[85vh] isolate relative">
            <h2 className="uppercase opacity-60">Item</h2>
            <div className="flex flex-col gap-3 ">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0C0839] bg-opacity-5">
                <div className="sm:size-[3.5rem] sm:shrink-0">
                  <Image
                    src={property?.metadata?.image}
                    width={200}
                    height={200}
                    className="rounded-lg  h-full max-w-full "
                    alt={"Image"}
                  />
                </div>
                <div className="flex items-center justify-between gap-5 flex-wrap w-full">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-lg truncate">
                      {property?.metadata.name}
                    </h3>
                    <p className="flex items-center gap-1  text-[#954AFC]">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M16.6668 8.33341C16.6668 12.4942 12.051 16.8276 10.501 18.1659C10.3566 18.2745 10.1808 18.3332 10.0002 18.3332C9.8195 18.3332 9.64373 18.2745 9.49933 18.1659C7.94933 16.8276 3.3335 12.4942 3.3335 8.33341C3.3335 6.5653 4.03588 4.86961 5.28612 3.61937C6.53636 2.36913 8.23205 1.66675 10.0002 1.66675C11.7683 1.66675 13.464 2.36913 14.7142 3.61937C15.9645 4.86961 16.6668 6.5653 16.6668 8.33341Z"
                          stroke="#954AFC"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10 10.8333C11.3807 10.8333 12.5 9.71396 12.5 8.33325C12.5 6.95254 11.3807 5.83325 10 5.83325C8.61929 5.83325 7.5 6.95254 7.5 8.33325C7.5 9.71396 8.61929 10.8333 10 10.8333Z"
                          stroke="#954AFC"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {property?.propertyLocation?.location}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-lg truncate">
                      ${boostAmount} USD
                    </h3>
                    <p className="flex items-center gap-1  opacity-60">
                      {/* ({property.bnb} BNB) */}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="uppercase opacity-60">Choose Cryptocurrency</h2>
            {/* <button onClick={() => setCurrentMethod("card")} type="button" className={`flex items-center transition-all justify-between w-full border-2 ${currentMethod == "card" ? "border-[#954AFC] bg-[#954AFC0D]" : "border-[#0000001A] bg-[#fff]"} rounded-lg px-4 py-2`}>
            <div className="flex items-center gap-4">
                <div className={`size-10 ${currentMethod == "card" ? "bg-white" : "bg-[#0C08390F]"} rounded-lg shadow border shrink-0 flex items-center justify-center`}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.3337 6.29159C18.3337 6.84159 17.8837 7.29158 17.3337 7.29158H2.66699C2.11699 7.29158 1.66699 6.84159 1.66699 6.29159V6.28325C1.66699 4.37492 3.20866 2.83325 5.11699 2.83325H14.8753C16.7837 2.83325 18.3337 4.38325 18.3337 6.29159Z" fill="#0C0839" />
                        <path d="M1.66699 9.54175V13.7167C1.66699 15.6251 3.20866 17.1667 5.11699 17.1667H14.8753C16.7837 17.1667 18.3337 15.6167 18.3337 13.7084V9.54175C18.3337 8.99175 17.8837 8.54175 17.3337 8.54175H2.66699C2.11699 8.54175 1.66699 8.99175 1.66699 9.54175ZM6.66699 14.3751H5.00033C4.65866 14.3751 4.37533 14.0917 4.37533 13.7501C4.37533 13.4084 4.65866 13.1251 5.00033 13.1251H6.66699C7.00866 13.1251 7.29199 13.4084 7.29199 13.7501C7.29199 14.0917 7.00866 14.3751 6.66699 14.3751ZM12.0837 14.3751H8.75033C8.40866 14.3751 8.12533 14.0917 8.12533 13.7501C8.12533 13.4084 8.40866 13.1251 8.75033 13.1251H12.0837C12.4253 13.1251 12.7087 13.4084 12.7087 13.7501C12.7087 14.0917 12.4253 14.3751 12.0837 14.3751Z" fill="#0C0839" />
                    </svg>

                </div>
                <span className="font-semibold">Card</span>
            </div>
            <div className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${currentMethod == "card" ? "border-[#954AFC]" : ""}`}>
                <div className={`flex size-2 rounded-full shrink-0 ${currentMethod == "card" ? "bg-[#954AFC]" : "bg-white"}`}>

                </div>
            </div>
        </button> */}
            <button
              onClick={() => setCurrentMethod("USDC")}
              type="button"
              className={`flex items-center transition-all justify-between w-full border-2 ${
                currentMethod == "USDC"
                  ? "border-[#954AFC] bg-[#954AFC0D]"
                  : "border-[#0000001A] bg-[#fff]"
              } rounded-lg px-4 py-2`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`size-10 ${
                    currentMethod == "USDC" ? "bg-white" : "bg-[#0C08390F]"
                  } rounded-lg shadow border shrink-0 flex items-center justify-center`}
                >
                  <Image
                    src={usdt}
                    width={200}
                    height={200}
                    className="rounded-lg   max-w-full size-5"
                    alt={"Image"}
                  />
                </div>
                <span className="font-semibold">USDC</span>
              </div>
              <div
                className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${
                  currentMethod == "USDC" ? "border-[#954AFC]" : ""
                }`}
              >
                <div
                  className={`flex size-2 rounded-full shrink-0 ${
                    currentMethod == "USDC" ? "bg-[#954AFC]" : "bg-white"
                  }`}
                ></div>
              </div>
            </button>
            <button
              onClick={() => setCurrentMethod("BNB")}
              type="button"
              className={`flex items-center transition-all justify-between w-full border-2 ${
                currentMethod == "BNB"
                  ? "border-[#954AFC] bg-[#954AFC0D]"
                  : "border-[#0000001A] bg-[#fff]"
              } rounded-lg px-4 py-2`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`size-10 ${
                    currentMethod == "BNB" ? "bg-white" : "bg-[#0C08390F]"
                  } rounded-lg shadow border shrink-0 flex items-center justify-center`}
                >
                  <Image
                    src={bnb}
                    width={200}
                    height={200}
                    className="rounded-lg   max-w-full size-5"
                    alt={"Image"}
                  />
                </div>
                <span className="font-semibold">BNB</span>
              </div>
              <div
                className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${
                  currentMethod == "BNB" ? "border-[#954AFC]" : ""
                }`}
              >
                <div
                  className={`flex size-2 rounded-full shrink-0 ${
                    currentMethod == "BNB" ? "bg-[#954AFC]" : "bg-white"
                  }`}
                ></div>
              </div>
            </button>
          </div>

          <div className="flex  items-center flex-col sm:flex-row justify-between gap-5">
            <button
              onClick={() => setOpen(false)}
              type="button"
              className="text-[#0C0839] w-full whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-semibold border"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleBoost(currentMethod);
              }}
              type="button"
              className="btn_primary_gradient disabled:cursor-not-allowed disabled:opacity-60 text-white w-full whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex justify-center items-center">
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                      <span>
                        {isApprovalLoading
                          ? "Approval Pending (1/2)"
                          : `Buying Boost ${currentMethod ==="USDC" ? "(2/2)":""}`}
                      </span>
                    </div>
                  </>
                </div>
              ) : (
                " Buy Now"
              )}
            </button>
          </div>
        </div>
      </Modal>
      <Congratulations
        open={isSuccess}
        handleClose={() => setIsSuccess(false)}
      />
    </>
  );
};

export default BoostedCheckout;
