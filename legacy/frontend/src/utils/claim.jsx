import { useEffect, useState } from "react";
import Modal from "./modal";
import ModalHeader from "./modalHeader";
import Image from "next/image";
import round from "../app/images/round.webp";
import usdc from "../app/images/usdc.svg";
import stay from "../app/images/stay.png";
import lp from "../app/images/lpToken.svg";
import { useNfstayContext } from "@/context/NfstayContext";
import { CONTRACT_CONFIG } from "@/config";
import {
  getErrorMessage,
  getEthFrom,
  getWeiFrom,
  NotifyError,
  NotifySuccess,
} from "@/context/helper";
import Congratulation from "@/app/payouts/congratulation";

const Claim = ({ propertyId, source, steps, open, setOpen, setIsSuccess }) => {
  const {
    showTextForStay,
    withdrawRent,
    connectedAddress,
    getUSDCFromRouter,
    handleAddToFarm,
    handleBuyLp,
    checkForApproval,
    getbuyLpContract,
    handleClaimRewards,
    handleNetwork,
  } = useNfstayContext();
  const [isAck, setIsAck] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [claimedReward, setClaimed] = useState("");
  const [lpBought, setLpBought] = useState("");

  const title = "Congratulations";
  const paragraph = "You are now officially Yield Farming $STAY";
  const buttonText = "Okay";

  const ackText = `By clicking this box, you confirm that you have thoroughly reviewed and understand the risks associated with providing liquidity , including but not limited to impermanent loss and market volatility. You acknowledge that you are proceeding with this investment at your own discretion and responsibility.`;
  useEffect(() => {
    source === "payout" ? setCurrentStep(0) : setCurrentStep(-1);
  }, [open]);

  const handleAck = (e) => {
    if (e.target.checked) {
      setIsAck(true);
      setCurrentStep(0);
    } else {
      setIsAck(false);
      setCurrentStep(-1);
    }
  };

  useEffect(() => {
    if (currentStep == steps.length - 1) {
      setTimeout(() => {
        setShowCongrats(true);
        setOpen(false);
      }, 800);
    }
  }, [currentStep]);

  const handleStepClick = async (address, stepIndex) => {
    try {
      if (stepIndex === currentStep && !loading) {
        setLoading(true);
        await handleNetwork();

        if (source === "payout") {
          if (stepIndex == 0) {
            const _claimedUsdc = await withdrawRent(propertyId);
            setClaimed(_claimedUsdc);
          } else if (stepIndex == 1) {
            await checkForApproval(
              "USDC",
              claimedReward,
              CONTRACT_CONFIG.buyLp
            );
          } else if (stepIndex == 2) {
            if (steps.length !== 4) {
              const _lpBought = await handleBuyLp(
                connectedAddress,
                claimedReward
              );
              setLpBought(_lpBought);
            } else {
              const contract = getbuyLpContract(true);

              await contract.callStatic.buyStay(
                connectedAddress,
                CONTRACT_CONFIG.USDC,
                getWeiFrom(claimedReward),
                {
                  value: 0,
                }
              );

              let _swap = await contract.buyStay(
                connectedAddress,
                CONTRACT_CONFIG.USDC,
                getWeiFrom(claimedReward),
                {
                  value: 0,
                }
              );
              await _swap.wait();
              setOpen(false);
              setIsSuccess(true);
            }
          } else if (stepIndex == 3) {
            await checkForApproval("PAIR", lpBought, CONTRACT_CONFIG.farm);
          } else if (stepIndex == 4) {
            await handleAddToFarm(address, lpBought);
            setOpen(false);
            setIsSuccess(true);
          }
        } else {
          if (stepIndex == 0) {
            const _claimedStay = await handleClaimRewards(address);
            setClaimed(_claimedStay);
          } else if (stepIndex == 1) {
            await checkForApproval(
              "STAY",
              claimedReward,
              CONTRACT_CONFIG.buyLp
            );
          } else if (stepIndex == 2) {
            let _amountInUsdc = await getUSDCFromRouter(claimedReward);
           
            const _lpBought = await handleBuyLp(
              connectedAddress,
              getEthFrom(_amountInUsdc),
              "STAY"
            );
            setLpBought(_lpBought);
          } else if (stepIndex == 3) {
            await checkForApproval("PAIR", lpBought, CONTRACT_CONFIG.farm);
          } else if (stepIndex == 4) {
            await handleAddToFarm(address, lpBought);
          }
        }

        setTimeout(() => {
          setLoading(false);
          setCurrentStep((prev) => prev + 1);
        }, 1500);
      }
    } catch (err) {
      console.log(err);
      const _msg = getErrorMessage(err);
      NotifyError(_msg);
      setLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} handleClose={() => setOpen(false)}>
        <div className="flex flex-col w-full p-4 gap-5">
          <ModalHeader
            title={
              steps.length !== 4 && source === "payout"
                ? "Claim & Reinvest"
                : "Claim Stay"
            }
            handleClose={() => setOpen(false)}
          />
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[85vh] isolate relative">
            {/* show the check box to ack */}
            {source != "payout" && (
              <div className="flex items-start gap-2 pr-5">
                <input
                  type="checkbox"
                  id="ack"
                  className="w-4 h-4 text-[#954AFC] accent-[#954AFC] border-2 border-[#954AFC] rounded-md"
                  onChange={handleAck}
                />
                <label htmlFor="ack" className="text-xs font-medium">
                  {ackText}
                </label>
              </div>
            )}

            <div className="flex gap-2 w-full">
              <div className="flex flex-col items-center justify-between ">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className={`relative flex flex-col ${
                      index < steps.length - 1 ? "h-full" : "h-fit"
                    } items-center  justify-between`}
                  >
                    {index <= currentStep ? (
                      <div className="w-5 h-5 bg-[#954AFC] shrink-0 p-1 rounded-full flex items-center justify-center">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M15 4.5L6.75 12.75L3 9"
                            stroke="white"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 border border-dashed border-[#9999] rounded-full shrink-0 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-[#954AFC]"></div>
                      </div>
                    )}
                    {index < steps.length - 1 && (
                      <div
                        className={`w-1 h-full ${
                          index < currentStep ? "bg-[#954AFC]" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 w-full">
                {steps.map((step, index) => (
                  <div key={index} className="flex flex-col gap-3 w-full">
                    <div className="flex items-center justify-between w-full">
                      <p className="font-bold text-xl">{step}</p>
                      {index < steps.length - 1 && (
                        <span className="opacity-60 font-medium text-lg">
                          Step {index + 1}
                        </span>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <button
                        className={`px-4 py-2 text-xl  disabled:cursor-not-allowed rounded-lg whitespace-nowrap justify-center font-semibold flex items-center gap-2 ${
                          index == currentStep
                            ? "bg-[#954AFC] text-white"
                            : "border-2 border-[#954AFC] bg-gradient-to-tr from-[#e9defe] to-[#dff1f1] text-gray-500"
                        } ${
                          index === currentStep
                            ? "cursor-pointer"
                            : "cursor-not-allowed"
                        }`}
                        onClick={() => handleStepClick(connectedAddress, index)}
                        disabled={index !== currentStep || loading}
                      >
                        {loading && index === currentStep ? (
                          <div className="w-7 h-7 border-4 border-t-[4px] border-t-[#3d4a6c] rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Image
                              src={
                                index < 2
                                  ? source == "farm"
                                    ? stay
                                    : usdc
                                  : source == "payout" && steps.length == 4
                                  ? stay
                                  : lp
                              }
                              width={30}
                              height={30}
                              alt="icon"
                            />
                            {currentStep > 0 && index == 0
                              ? "Claimed"
                              : currentStep > 1 && index == 1
                              ? "Approved"
                              : currentStep > 2 &&
                                index == 2 &&
                                steps.length !== 4
                              ? "LP Created"
                              : currentStep > 2 &&
                                index == 2 &&
                                steps.length == 4 &&
                                source === "payout"
                              ? "Converted to Stay"
                              : currentStep > 3 && index == 3
                              ? "Approved"
                              : step}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        open={showCongrats}
        isCongrats={true}
        max="max-w-sm"
        handleClose={() => setShowCongrats(false)}
      >
        <div className="flex flex-col  overflow-hidden  w-full">
          <div className="relative mb-20">
            <div className="relative bg-[#954AFC] isolate min-h-32 overflow-hidden">
              <div className="size-[390px] absolute opacity-50 -top-[130px] -left-[180px]  -z-[1] mix-blend-screen">
                <Image
                  src={round}
                  width={500}
                  height={500}
                  alt="Property Documents"
                  className="max-w-full h-full"
                />
              </div>
            </div>
            <div className="size-28 rounded-full absolute -bottom-1/2 left-1/2 -translate-x-1/2 backdrop-blur-lg bg-[#0C083938] flex items-center justify-center shrink-0">
              <div className="size-24 rounded-full bg-white flex items-center justify-center">
                {/* <Image
                                    src={icon}
                                    width={500}
                                    height={500}
                                    alt="Property Documents"
                                    className="max-w-full size-12"
                                /> */}
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M20.4346 18.6727C20.7052 18.2828 21.2407 18.1862 21.6306 18.4568C22.0204 18.7274 22.1171 19.2628 21.8464 19.6527C20.2701 21.9235 16.454 22.1712 14.3802 20.424C12.5773 21.9428 9.44402 21.9608 7.61979 20.424C5.5454 22.1716 1.73122 21.9256 0.153498 19.6527C-0.117161 19.2628 -0.0204817 18.7274 0.369414 18.4568C0.759225 18.1862 1.29474 18.2828 1.5654 18.6727C2.65504 20.2424 5.82478 20.2416 6.91382 18.6727C6.99293 18.5588 7.09847 18.4656 7.2214 18.4013C7.34434 18.337 7.48103 18.3034 7.61978 18.3034C7.75853 18.3034 7.89522 18.337 8.01816 18.4013C8.1411 18.4656 8.24664 18.5587 8.32576 18.6727C9.4154 20.2424 12.5852 20.2415 13.6742 18.6727C13.7533 18.5587 13.8589 18.4656 13.9818 18.4012C14.1048 18.3369 14.2415 18.3033 14.3802 18.3033C14.519 18.3033 14.6557 18.3369 14.7786 18.4012C14.9015 18.4656 15.0071 18.5587 15.0862 18.6727C16.1758 20.2424 19.3455 20.2415 20.4346 18.6727ZM5.07034 12.7179C5.07034 13.1924 4.6856 13.5772 4.21097 13.5772C3.73634 13.5772 3.3516 13.1924 3.3516 12.7179V3.35137C3.3516 1.74036 4.66235 0.429688 6.27346 0.429688C7.88456 0.429688 9.19527 1.74036 9.19532 3.35137C9.19532 3.82596 8.81058 4.2107 8.33595 4.2107C7.86132 4.2107 7.47658 3.82596 7.47658 3.35137C7.47658 2.68803 6.93689 2.14834 6.27346 2.14834C5.61002 2.14834 5.07034 2.68803 5.07034 3.35137V5.84337H12.8047V3.35137C12.8047 1.74036 14.1155 0.429688 15.7265 0.429688C17.3376 0.429688 18.6483 1.74036 18.6483 3.35137C18.6483 3.82596 18.2636 4.2107 17.789 4.2107C17.3143 4.2107 16.9296 3.82596 16.9296 3.35137C16.9296 2.68803 16.3899 2.14834 15.7265 2.14834C15.0631 2.14834 14.5234 2.68803 14.5234 3.35137V12.7179C14.5234 13.1924 14.1386 13.5772 13.664 13.5772C13.1894 13.5772 12.8046 13.1924 12.8046 12.7179V11.4289H5.07034V12.7179ZM12.8046 7.56199H5.07034V9.71028H12.8046V7.56199ZM11.0001 17.7018C9.68503 17.7018 8.48509 17.2859 7.61992 16.557C5.5454 18.3046 1.73122 18.0586 0.153498 15.7857C-0.117161 15.3958 -0.0204817 14.8604 0.369415 14.5898C0.759225 14.3192 1.29474 14.4158 1.5654 14.8057C2.65504 16.3754 5.82478 16.3746 6.91382 14.8057C6.99293 14.6917 7.09847 14.5986 7.22141 14.5343C7.34434 14.4699 7.48103 14.4363 7.61978 14.4363C7.75853 14.4363 7.89522 14.4699 8.01816 14.5342C8.1411 14.5986 8.24664 14.6917 8.32576 14.8057C9.4154 16.3754 12.5852 16.3745 13.6742 14.8057C13.7533 14.6917 13.8589 14.5985 13.9818 14.5342C14.1048 14.4699 14.2415 14.4363 14.3802 14.4363C14.519 14.4363 14.6557 14.4699 14.7786 14.5342C14.9015 14.5986 15.0071 14.6917 15.0862 14.8057C16.1758 16.3754 19.3456 16.3745 20.4346 14.8057C20.7052 14.4158 21.2407 14.3192 21.6306 14.5898C22.0205 14.8604 22.1171 15.3958 21.8465 15.7857C20.2702 18.0565 16.4541 18.3042 14.3802 16.557C13.515 17.2859 12.3151 17.7018 11.0001 17.7018Z"
                    fill="url(#paint0_linear_536_2879)"
                  />
                  <defs>
                    <linearGradient
                      id="paint0_linear_536_2879"
                      x1="9.61992e-07"
                      y1="-3.97464"
                      x2="22.3177"
                      y2="-3.69401"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stop-color="#9945FF" />
                      <stop offset="1" stop-color="#20E19F" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className="w-full flex p-8 bg-white flex-col items-center justify-center text-center gap-5">
            <h1 className="text-2xl font-bold text-[#0C0839] text-center">
              {title}
            </h1>
            <p className="text-center text-[#0C0839] opacity-80 max-w-[20rem]">
              {paragraph}
            </p>

            <button
              type="button"
              onClick={() => setShowCongrats(false)}
              className="btn_primary_gradient w-full max-w-[15rem] text-white  whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium cursor-pointer"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </Modal>
      {/* <Congratulation
        open={isSuccess}
        handleClose={() => {
          setIsSuccess(false);
          getPastPayouts();
        }}
      /> */}
    </>
  );
};

export default Claim;
