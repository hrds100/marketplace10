import Modal from "@/utils/modal";
import ModalHeader from "@/utils/modalHeader";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import rocks from "../images/rocks.jpg";
import Congratulations from "../details/congratulations";
import Tooltip from "@/utils/tooltip";
import usdt from "../images/usdc.svg";
import img from "../images/room.png";
import { acceptWholeNumbers } from "@/utils/acceptWholeNumbers";
import { usenfstayContext } from "@/context/nfstayContext";
import { CONTRACT_CONFIG } from "@/config";
import { getErrorMessage, getWeiFrom, NotifyError } from "@/context/helper";
import { useDebouncedCallback } from "use-debounce";
import { useKYCContext } from "@/context/KYCModalContext";

const RockMigration = ({
  fetchActivityData,
  fetchMarketplaceProperties = () => {},
  setCurrentMethod,
  open,
  property,
  handleClose,
  currentStep,
  setCurrentStep,
  setAmount,
  setOpen,
  marketFees,
}) => {
  const {
    connectedAddress,
    checkForApproval,
    getMarketplaceContract,
    getPrimaryQuote,
    handleNetwork,
    balanceChecker,
  } = usenfstayContext();
  const { checkUserRegistration } = useKYCContext();
  const [type, setType] = useState("fixed");
  const [quantity, setQuantity] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("");
  const text1 = `An equivalent amount of USDC is required to proceed with migration at this stage.`;
  const text2 = `Platform fees are currently waived for migration.`;

  const steps = ["Approve rocks", "Approve USDC", "Buy"];
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);

  const [quote, setQuote] = useState({
    sharesToBuy: 0, // Default initial value for sharesToBuy
    usdcQuotation: "0", // Default initial value for usdcQuotation
    marketFee: "0", // Default initial value for marketFee
  });

  const handleRocksBuy = async (step) => {
    try {
      setIsLoadingTx(true);
      await handleNetwork();

      let contract;

      contract = getMarketplaceContract(true);
      if (step === 0) {
        await checkForApproval("ROCK");
        nextStep();
      }
      if (step === 1) {
        await checkForApproval(
          "USDC",
          usdcAmount,
          CONTRACT_CONFIG.rwaMarketplace
        );
        nextStep();
      }

      if (step == 2) {
        await balanceChecker(
          connectedAddress,
          usdcAmount * 2,
          CONTRACT_CONFIG.USDC
        );
        const storedReferral =
          localStorage.getItem("referral") ?? CONTRACT_CONFIG.zeroAddress;
        await contract.callStatic.buyPrimaryShares(
          connectedAddress,
          CONTRACT_CONFIG.ROCK,
          property.id,
          getWeiFrom(usdcAmount.toString()),
          quantity,
          storedReferral,
          { value: 0 }
        );

        const tx = await contract.buyPrimaryShares(
          connectedAddress,
          CONTRACT_CONFIG.ROCK,
          property.id,
          getWeiFrom(usdcAmount.toString()),
          quantity,
          storedReferral,
          { value: 0 }
        );

        await tx.wait();
        nextStep();
        setAmount("");
        setCurrentMethod("USDC");
        setOpen(false);
        setTimeout(() => {
          setIsSuccess(true);
        }, 800);
        fetchActivityData();
        await checkUserRegistration(connectedAddress);
      }
    } catch (err) {
      console.log(err);
      const _msg = getErrorMessage(err);
      NotifyError(_msg);
    } finally {
      setIsLoadingTx(false);
    }
  };

  // Original getQuote function
  const getQuote = async () => {
    const res = await getPrimaryQuote(usdcAmount * 2, property.pricePerShare);

    return {
      sharesToBuy: res.sharesToBuy,
      usdcQuotation: res.usdcQuotation,
      marketFee: res.marketFee,
    };
  };

  // Debounced version of getQuote
  const debouncedGetQuote = useDebouncedCallback(async () => {
    setIsLoading(true); // Set loading state to true
    try {
      const data = await getQuote();
      setQuote(data); // Update state with the fetched data
      if (data.sharesToBuy == 0) return NotifyError("Not enough shares");
    } catch (error) {
      console.error("Failed to fetch quote:", error);
    } finally {
      setIsLoading(false); // Reset loading state
    }
  }, 3000); // 3-second debounce

  // Function to trigger the debounced function

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
    if (currentStep === 2) {
      handleClose();

      setIsSuccess(true);
    }
  };

  const handleQuantity = (e) => {
    setQuantity(acceptWholeNumbers(e));
    setUsdcAmount(acceptWholeNumbers(e) * 400);
    if (acceptWholeNumbers(e) > 0) {
      setIsLoading(true);
      debouncedGetQuote();
    }
  };

  return (
    <>
      <Modal open={open} handleClose={handleClose} max="max-w-4xl">
        <div className="flex flex-col w-full p-4 gap-5 ">
          <ModalHeader title={"ROCKS Migration"} handleClose={handleClose} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-[85vh]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Type</p>
                  <Tooltip text={text1} opacity={0.5} />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full relative">
                  <button
                    onClick={() => setType("fixed")}
                    type="button"
                    className={`flex flex-col flex-1 gap-2 items-center justify-center p-4 font-semibold rounded-lg border-2 ${
                      type == "fixed" ? "border-[#954AFC] bg-[#954AFC1A]" : ""
                    }`}
                  >
                    <Image src={rocks} width={30} height={30} alt="Rocks" />
                    <span>ROCKS</span>
                  </button>
                  <div className="size-10 absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-center align-middle self-center rounded-full border-4 border-white shrink-0 flex items-center justify-center bg-[#9945FF] text-white">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.75 9H14.25"
                        stroke="white"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M9 3.75V14.25"
                        stroke="white"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <button
                    onClick={() => setType("fixed")}
                    type="button"
                    className={`flex flex-col flex-1 gap-2 items-center justify-center p-4 font-semibold rounded-lg border-2 ${
                      type == "fixed" ? "border-[#954AFC] bg-[#954AFC1A]" : ""
                    }`}
                  >
                    <Image
                      src={usdt}
                      width={200}
                      height={200}
                      className="rounded-lg  max-w-full size-8"
                      alt={"Image"}
                    />
                    <span>USDC</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col gap-3 w-full">
                  <p className="font-medium">Quantity</p>
                  <input
                    disabled={isLoadingTx || isLoading}
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={handleQuantity}
                    className="shadow-2 p-2 px-4 disabled:opacity-60 font-medium border-2 outline-none rounded-lg "
                    placeholder="1"
                  />
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <p className="font-medium">USDC Amount</p>
                  <input
                    disabled={true}
                    type="number"
                    min={0}
                    value={usdcAmount}
                    readOnly
                    className="shadow-2 disabled:opacity-60  cursor-default p-2 px-4 font-medium border-2 outline-none rounded-lg "
                    placeholder="$400"
                  />
                </div>
              </div>
              <p className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E9F7EF] text-[#28AE60] font-semibold">
                <svg
                  width="20"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    fill="#28AE60"
                    stroke="#28AE60"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M12 16V12"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M12 8H12.0092"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Fixed ROCK migration price $400
              </p>

              <p className="font-medium text-base pb-4 border-b-2">
                A limited number of shares per property are available for
                migration, offered on a first-come, first-served basis.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Fee</p>
                  <Tooltip text={text2} opacity={0.5} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium opacity-60">Service Fee</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium opacity-60 line-through">
                      {marketFees}%
                    </span>{" "}
                    <span className="font-medium">0%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex w-full relative min-h-[15rem] rounded-xl overflow-hidden">
                <Image
                  src={property.metadata.image}
                  fill
                  alt="Property Image"
                  className="max-w-full object-cover h-full block"
                />
                <div className="flex items-center justify-between w-full p-4 absolute top-0">
                  <div className="flex items-center px-2 gap-2 py-1.5 rounded-full bg-white">
                    <svg
                      width="14"
                      height="16"
                      viewBox="0 0 14 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M3.75844 3.42568C4.61798 2.56614 5.78377 2.08325 6.99935 2.08325C8.21492 2.08325 9.38071 2.56614 10.2403 3.42568C11.0998 4.28522 11.5827 5.45101 11.5827 6.66659C11.5827 8.07803 10.7856 9.61118 9.73454 10.9921C8.74996 12.2857 7.62357 13.3413 6.99935 13.8872C6.37513 13.3413 5.24874 12.2857 4.26415 10.9921C3.21313 9.61118 2.41602 8.07803 2.41602 6.66659C2.41602 5.45101 2.8989 4.28522 3.75844 3.42568ZM6.99935 0.583252C5.38595 0.583252 3.83863 1.22417 2.69778 2.36502C1.55694 3.50587 0.916016 5.05318 0.916016 6.66659C0.916016 8.58381 1.96524 10.4483 3.07054 11.9006C4.19323 13.3756 5.46964 14.5486 6.10853 15.1003C6.1213 15.1113 6.13445 15.1219 6.14793 15.132C6.39341 15.3166 6.69222 15.4164 6.99935 15.4164C7.30648 15.4164 7.60529 15.3166 7.85077 15.132C7.86425 15.1219 7.87739 15.1113 7.89017 15.1003C8.52906 14.5486 9.80546 13.3756 10.9282 11.9006C12.0335 10.4483 13.0827 8.58381 13.0827 6.66659C13.0827 5.05319 12.4418 3.50587 11.3009 2.36502C10.1601 1.22417 8.61275 0.583252 6.99935 0.583252ZM5.75 6.66663C5.75 5.97627 6.30964 5.41663 7 5.41663C7.69036 5.41663 8.25 5.97627 8.25 6.66663C8.25 7.35698 7.69036 7.91663 7 7.91663C6.30964 7.91663 5.75 7.35698 5.75 6.66663ZM7 3.91663C5.48122 3.91663 4.25 5.14784 4.25 6.66663C4.25 8.18541 5.48122 9.41663 7 9.41663C8.51878 9.41663 9.75 8.18541 9.75 6.66663C9.75 5.14784 8.51878 3.91663 7 3.91663Z"
                        fill="url(#paint0_linear_0_7075)"
                      />
                      <defs>
                        <linearGradient
                          id="paint0_linear_0_7075"
                          x1="0.916016"
                          y1="-2.50703"
                          x2="13.2591"
                          y2="-2.3847"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stop-color="#9945FF" />
                          <stop offset="1" stop-color="#20E19F" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="uppercase gradient_text font-bold">
                      {property.propertyLocation.location}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium opacity-60">Value in ROCKS</span>
                  <p className="font-medium">${usdcAmount}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium opacity-60">Value in USDC</span>
                  {isLoading ? (
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="font-medium">
                      $
                      {quote.usdcQuotation > 0
                        ? quote.usdcQuotation - usdcAmount
                        : usdcAmount}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium opacity-60">
                    Price Per Share
                  </span>
                  {isLoading ? (
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="font-medium">${property.pricePerShare}</p>
                  )}
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium opacity-60">Total Cost</span>
                  {isLoading ? (
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="font-medium">${quote.usdcQuotation}</p>
                  )}
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-lg">Total Shares</span>
                  {isLoading ? (
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <span className="font-bold text-lg">
                      {quote.sharesToBuy}
                    </span>
                  )}
                </div>
              </div>

              <button
                disabled={isLoading || isLoadingTx || quote.sharesToBuy === 0}
                type="button"
                onClick={() => handleRocksBuy(currentStep)}
                className="py-2.5 px-4 bg-[#9945FF] rounded-full disabled:cursor-not-allowed disabled:opacity-60 w-full text-white font-medium h-fit flex items-center justify-center"
              >
                {isLoadingTx ? (
                  <div className="w-5 h-5 border-4 border-t-[4px] border-t-[#3d4a6c] rounded-full animate-spin"></div>
                ) : (
                  steps[currentStep > 2 ? 2 : currentStep]
                )}
              </button>

              <div className="flex items-center px-5 py-2 justify-center rounded-lg bg-[#8165EC] bg-opacity-10">
                <ol className="flex items-center w-full mt-3 text-gray-900 font-medium text-base justify-between">
                  <li
                    className={`flex w-full flex-1 items-center relative transition-all after:content-[''] after:w-full after:h-2 before:content-[''] before:h-2 after:bg-[#0C0839] after:bg-opacity-15 ${
                      currentStep > 0
                        ? "before:bg-[#28AE60] done"
                        : "before:w-0"
                    } before:inline-block before:absolute lg:before:top-4 before:top-2 before:left-4 after:inline-block after:absolute lg:after:top-4 after:top-2 after:left-4`}
                  >
                    <div className="block whitespace-nowrap z-10">
                      <span
                        className={`w-6 h-6 transition-all ${
                          currentStep == 0
                            ? "bg-[#8165EC]"
                            : currentStep > 0
                            ? "bg-[#28AE60]"
                            : "bg-[#d0ccdf]"
                        } border-2 border-transparent rounded-full flex justify-center items-center mx-auto mb-3 text-sm text-white lg:w-10 lg:h-10`}
                      >
                        {currentStep > 0 ? (
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
                        ) : (
                          1
                        )}
                      </span>
                    </div>
                  </li>

                  <li
                    className={`flex w-full flex-1 items-center relative transition-all after:content-[''] after:w-full after:h-2 before:content-[''] before:h-2 after:bg-[#0C0839] after:bg-opacity-15 ${
                      currentStep > 1
                        ? "before:bg-[#28AE60] done"
                        : "before:w-0"
                    } before:inline-block before:absolute lg:before:top-4 before:top-2 before:left-4 after:inline-block after:absolute lg:after:top-4 after:top-2 after:left-4`}
                  >
                    <div className="block whitespace-nowrap z-10">
                      <span
                        className={`w-6 h-6 transition-all delay-700 ${
                          currentStep == 1
                            ? "bg-[#8165EC]"
                            : currentStep > 1
                            ? "bg-[#28AE60]"
                            : "bg-[#d0ccdf]"
                        } rounded-full flex justify-center items-center mx-auto mb-3 text-sm text-white lg:w-10 lg:h-10`}
                      >
                        {currentStep > 1 ? (
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
                        ) : (
                          2
                        )}
                      </span>
                    </div>
                  </li>

                  <li className={`flex relative items-center transition-all`}>
                    <div className="block whitespace-nowrap z-10">
                      <span
                        className={`w-6 h-6 transition-all delay-700 ${
                          currentStep == 2
                            ? "bg-[#8165EC]"
                            : currentStep > 2
                            ? "bg-[#28AE60]"
                            : "bg-[#d0ccdf]"
                        } rounded-full flex justify-center items-center mx-auto mb-3 text-sm text-white lg:w-10 lg:h-10`}
                      >
                        {currentStep > 2 ? (
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
                        ) : (
                          3
                        )}
                      </span>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <Congratulations
        open={isSuccess}
        handleClose={() => {
          setIsSuccess(false);
          fetchMarketplaceProperties(property.id, false);
        }}
      />
    </>
  );
};

export default RockMigration;
