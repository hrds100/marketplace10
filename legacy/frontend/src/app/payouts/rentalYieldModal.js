"use client";
import { useEffect, useState } from "react";
import stay from "../images/stay.png";
import usdt from "../images/usdc.jpg";
import Image from "next/image";
import Modal from "@/utils/modal";
import ModalHeader from "@/utils/modalHeader";
import Claim from "@/utils/claim";
import Congratulation from "./congratulation";
import { useNfstayContext } from "@/context/NfstayContext";
import { getErrorMessage, NotifyError } from "@/context/helper";

const RentalYieldModal = ({
  propertyId,
  getPastPayouts,
  fetchPayouts,
  data,
}) => {
  const { connectedAddress, handleNetwork, withdrawRent } = useNfstayContext();

  const [open, setOpen] = useState(false);
  const [openClaim, setOpenClaim] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isWithdrawLoading, setIsWithdrawloading] = useState(false);
  const [isWithdrawLoadingCard, setIsWithdrawloadingCard] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isChecked, setIsChecked] = useState(false);

  const stepsForLp = [
    "Claim USDC",
    "Approve USDC",
    "Create LP",
    "Approve LP",
    "Deposit LP",
    "Success",
  ];
  const [step, setSteps] = useState(stepsForLp);
  const stepsForStay = [
    "Claim Rent",
    "Approve USDC",
    "Convert to Stay",
    "Success",
  ];

  const options = [
    {
      title: "Stay",
      svg: (
        <Image
          src={stay}
          width={40}
          height={40}
          className="mix-blend-multiply"
          alt="stay"
        />
      ),
      text: (
        <p className="whitespace-pre-line">
          By ticking this box, you agree to receive your rental yield in the
          form of STAY, the utility token of the protocol. Please read
          <a
            href="https://docs.nfstay.com/"
            target="_blank"
            className="underline ml-1"
          >
            our docs
          </a>
        </p>
      ),
    },

    {
      title: "USDC",
      svg: (
        <Image
          src={usdt}
          width={30}
          height={30}
          className="mix-blend-multiply"
          alt="stay"
        />
      ),
      text: (
        <p className="whitespace-pre-line">
          By ticking this box, you agree to receive your rental yield in the
          form of USDC, a stablecoin pegged to the value of the US Dollar
        </p>
      ),
    },
    {
      title: "LP Token",
      svg: (
        <div className="flex items-center -space-x-4">
          <Image
            src={usdt}
            width={60}
            height={60}
            className="shrink-0 size-7"
            alt="LP Token"
          />
          <Image
            src={stay}
            width={40}
            height={40}
            className="shrink-0"
            alt="LP Token"
          />
        </div>
      ),
      text: (
        <p className="whitespace-pre-line">
          By ticking this box, you agree to receive your rental yield in the
          form of LP Token and provide liquidity to Stay. Please read about{" "}
          <a href="#" className="underline ml-1">
            Providing Liquidity and its risks
          </a>
        </p>
      ),
    },
  ];

  const handleClose = () => {
    setIsChecked(false)
    setOpen(false);
  };

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        setShowCongrats(true);
        setOpenClaim(false);
      }, 800);
    }
  }, []);

  const handleClaim = (index, _propertyId) => {
    setCurrentIndex(index);
    if (index == 0) {
      handleClose();
      setSteps(stepsForStay);
      setOpenClaim(true);
    } else if (index == 1) {
      handleRentWithdraw(_propertyId);
    } else if (index == 2) {
      handleClose();
      setSteps(stepsForLp);
      setOpenClaim(true);
    }
  };
  const handleRentWithdraw = async (propertyId) => {
    try {
      setIsWithdrawloading(true);
      await handleNetwork();

      await withdrawRent(propertyId);
      handleClose();
      setTimeout(() => {
        setIsSuccess(true);
      }, 800);
      // setOpen(false);
    } catch (err) {
      console.log(err);
      const _msg = getErrorMessage(err);
      NotifyError(_msg);
    } finally {
      setIsWithdrawloading(false);
    }
  };
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="py-1.5 px-4 rounded-lg bg-[#954AFC] disabled:cursor-not-allowed disabled:opacity-55 whitespace-nowrap font-medium text-white"
      >
        Claim Rent
      </button>
      <Modal open={open} handleClose={handleClose} max="max-w-lg">
        <div className="flex flex-col w-full p-4 gap-5 ">
          <ModalHeader
            title={"Choose How to Receive Your Rental Yield"}
            handleClose={handleClose}
          />
          <div className="flex flex-col gap-8 overflow-y-auto max-h-[85vh]">
            {options[currentIndex] && (
              <div className="flex items-start gap-2 px-5">
                <input
                  type="checkbox"
                  id="ack"
                  className="w-4 h-4 text-[#954AFC] accent-[#954AFC] border-2 border-[#954AFC] rounded-md"
                  onChange={(e) => {
                    setIsChecked(e.target.checked);
                  }}
                />
                <label htmlFor="ack" className="text-xs font-medium">
                  {options[currentIndex]?.text}
                </label>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <h2 className="uppercase opacity-60">Claim Rent in:</h2>
              {options.map((option, index) => (
                <button
                  disabled={isWithdrawLoading}
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                  }}
                  type="button"
                  className={`flex items-center transition-all justify-between w-full border-2 disabled:cursor-not-allowed disabled:opacity-60  ${
                    currentIndex == index
                      ? "border-[#954AFC] bg-[#954AFC0D]"
                      : "border-[#0000001A] bg-[#fff]"
                  } rounded-lg px-4 py-2`}
                >
                  <div className="grid grid-cols-[10%_88%] items-center w-full gap-4">
                    <div
                      className={`  shrink-0 flex items-center justify-center`}
                    >
                      {option.svg}
                    </div>
                    <span className="font-semibold text-start">
                      {option.title}
                    </span>
                  </div>
                  <div
                    className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${
                      currentIndex == index ? "border-[#954AFC]" : ""
                    }`}
                  >
                    <div
                      className={`flex size-2 rounded-full shrink-0 ${
                        currentIndex == index ? "bg-[#954AFC]" : "bg-white"
                      }`}
                    ></div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-5">
              {/* cancel button with outline border */}
              <button
                className="border-2  px-5 py-2.5 rounded-full h-fit flex-1  font-medium "
                onClick={handleClose}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!isChecked || isWithdrawLoading}
                onClick={() => handleClaim(currentIndex, propertyId)}
                className="btn_primary_gradient disabled:cursor-not-allowed disabled:opacity-60 flex-1 text-white whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center gap-2"
              >
                {isWithdrawLoading ? (
                  <>
                    {" "}
                    <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>{" "}
                    Claiming Rent
                  </>
                ) : (
                  "Claim Rent"
                )}
              </button>

              <button
                type="button"
                disabled={
                  !isChecked || isWithdrawLoading || isWithdrawLoadingCard
                }
                onClick={() => handleClaim(currentIndex, propertyId)}
                className="btn_primary_gradient disabled:cursor-not-allowed disabled:opacity-60 flex-1 text-white whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center gap-2"
              >
                {isWithdrawLoadingCard ? (
                  <>
                    {" "}
                    <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>{" "}
                    Claiming Rent in Fiat
                  </>
                ) : (
                  "Claim Rent in Fiat"
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
      <Claim
        setIsSuccess={setIsSuccess}
        fetchPayouts={fetchPayouts}
        source="payout"
        propertyId={propertyId}
        steps={step}
        open={openClaim}
        setOpen={setOpenClaim}
      />
      <Congratulation
        open={isSuccess}
        handleClose={() => {
          setIsSuccess(false);
          fetchPayouts();
          getPastPayouts(connectedAddress);
        }}
      />
    </>
  );
};

export default RentalYieldModal;
