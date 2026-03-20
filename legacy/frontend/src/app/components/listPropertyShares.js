"use client";
import Modal from "@/utils/modal";
import ModalHeader from "@/utils/modalHeader";
import { useEffect, useState } from "react";
import Select from "../marketplace/select";
import Image from "next/image";
import Tooltip from "@/utils/tooltip";
import usdt from "../images/usdc.svg";
import listProperty from "../images/listProperty.webp";
import { acceptWholeNumbers } from "@/utils/acceptWholeNumbers";
import celebrate from "../images/house.jpg";
import round from "../images/round.webp";
import { useNfstayContext } from "@/context/NfstayContext";
import {
  getErrorMessage,
  getWeiFrom,
  NotifyError,
  NotifySuccess,
} from "@/context/helper";
import { CONTRACT_CONFIG } from "@/config";

const ListPropertyShares = ({
  loadSecondarySales = () => {},
  open,
  property,
  handleClose,
}) => {
  const {
    connectedAddress,
    getMarketplaceContract,
    checkForApproval,
    getMarketplaceFee,
    handleNetwork,
  } = useNfstayContext();
  const [type, setType] = useState("fixed");
  const [quantity, setQuantity] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [days, setDays] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [total, setTotal] = useState(0);
  const [marketPrice, setMarketPrice] = useState(0);
  const [platformFee, setPlatformFee] = useState(0);
  const [error, setError] = useState({});
  const [congrats, setCongrats] = useState(false);
  const [isStartSaleLoading, setIsStartSaleLoading] = useState(false);

  const title = "Congratulations";
  const paragraph = "Your shares have been successfully listed!";
  const buttonText = "Okay";
  const icon = celebrate;

  const nextStep = () => {
    if (currentStep < 1) {
      setCurrentStep(currentStep + 1);
    }
    if (currentStep == 1) {
      handleClose();
      setCongrats(true);
    }
  };

  useEffect(() => {
    setCurrentStep(0);
    (async () => {
      let platformFee = await getMarketplaceFee();
      platformFee = Number(platformFee[1]?._hex) / 100;
      setPlatformFee(platformFee);
    })();
  }, [open]);
  const handleInputChange = (field, value, isQuantity = true) => {
    if (isQuantity) {
      if (!Number.isInteger(+value) || +value < 0) {
        setError((prev) => ({ ...prev, [field]: "Invalid value" }));
        return;
      }
    }
    setError((prev) => ({ ...prev, [field]: "" }));

    if (field === "quantity") setQuantity(value);
    if (field === "sellingPrice") setSellingPrice(value);

    // Dynamic updates for total and market price
    setTotal(+sellingPrice * +quantity);
    setMarketPrice(+sellingPrice * +quantity * 1.1); // Example calculation
  };

  const handleAuctionInputChange = (field, value) => {
    if (!Number.isInteger(+value) || +value < 0) {
      setError((prev) => ({ ...prev, [field]: "Invalid value" }));
      return;
    }

    if (field === "hours" && (+value < 0 || +value > 24)) {
      setError((prev) => ({ ...prev, [field]: "Hours must be between 0-24" }));
      return;
    }

    if (field === "minutes" && (+value < 0 || +value > 60)) {
      setError((prev) => ({
        ...prev,
        [field]: "Minutes must be between 0-60",
      }));
      return;
    }

    if (field === "days") setDays(+value);
    if (field === "hours") setHours(+value);
    if (field === "minutes") setMinutes(+value);
  };

  const handleList = async (propertyId, quantity, sellingPrice, endTime) => {
    try {
      const contract = getMarketplaceContract(true); // Get contract instance with signer

      // Check for preconditions via callStatic
      await contract.callStatic.startSecondarySale(
        propertyId,
        quantity,
        getWeiFrom(sellingPrice),
        endTime
      );

      // Call the function on the contract
      const tx = await contract.startSecondarySale(
        propertyId,
        quantity,
        getWeiFrom(sellingPrice),
        endTime
      );

      await tx.wait(); // Wait for transaction confirmation
    } catch (err) {
      throw new Error(err);
    }
  };
  const handleListForSale = async (
    _propertyId,
    _noOfShares,
    _pricePerShare
  ) => {
    try {
      if (!connectedAddress) return NotifyError("Please connect your wallet"); 
      setIsStartSaleLoading(true); // Loading state
      await handleNetwork();

      if (currentStep == 0) {
        await checkForApproval("RWA", CONTRACT_CONFIG.rwaMarketplace);
      } else if (currentStep == 1) {
        const endTime =
          type == "fixed" ? 0 : days * 86400 + hours * 3600 + minutes * 60;
        await handleList(_propertyId, _noOfShares, _pricePerShare, endTime);
        NotifySuccess("Secondary Sale Started Successfully");
        loadSecondarySales(connectedAddress);
      }

      if (quantity <= 0 || sellingPrice <= 0) {
        setError((prev) => ({
          ...prev,
          form: "Please fill in all required fields",
        }));
        return;
      }
      nextStep();
    } catch (err) {
      console.error(err);
      const _msg = getErrorMessage(err);

      NotifyError(_msg);
    } finally {
      setIsStartSaleLoading(false); // Reset loading state
    }
  };
  const options = [
    { value: "usd", label: "USD" },
    { value: "ngn", label: "NGN" },
    { value: "eur", label: "EUR" },
    { value: "gbp", label: "GBP" },
    { value: "cny", label: "CNY" },
    { value: "inr", label: "INR" },
    { value: "aed", label: "AED" },
  ];
  let perpetual = `
    The shares will remain on sale indefinitely until they are purchased by another investor. This provides flexibility for sellers who are not in a hurry to exit their investments.
    `;
  let timed = `Sellers can choose to list their shares for a specific period of time. If the shares are not sold within this time frame, the sale will automatically close, allowing the seller to reassess their pricing or hold onto the shares.`;
  let fee = ` Sellers are charged a 1.25% fee for sales transactions.

100% of the fees collected will be used to buy back and burn our utility token, $STAY, helping to strengthen the ecosystem and create value for token holders.
`;

  if (!property) return;
  return (
    <>
      <Modal open={open} handleClose={handleClose} max="max-w-4xl">
        <div className="flex flex-col w-full p-4 gap-5 ">
          <ModalHeader
            title={"List your property Shares"}
            handleClose={handleClose}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-[85vh]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Type</p>
                  <Tooltip text={type == "fixed" ? perpetual : timed} />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={() => setType("fixed")}
                    type="button"
                    className={`flex flex-col flex-1 gap-2 items-center justify-center p-4  rounded-lg border-2 ${
                      type == "fixed" ? "border-[#954AFC] bg-[#954AFC1A]" : ""
                    }`}
                  >
                    <svg
                      width="25"
                      height="24"
                      viewBox="0 0 25 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.25 2V22"
                        stroke="#0C0839"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M17.25 5H9.75C8.82174 5 7.9315 5.36875 7.27513 6.02513C6.61875 6.6815 6.25 7.57174 6.25 8.5C6.25 9.42826 6.61875 10.3185 7.27513 10.9749C7.9315 11.6313 8.82174 12 9.75 12H14.75C15.6783 12 16.5685 12.3687 17.2249 13.0251C17.8813 13.6815 18.25 14.5717 18.25 15.5C18.25 16.4283 17.8813 17.3185 17.2249 17.9749C16.5685 18.6313 15.6783 19 14.75 19H6.25"
                        stroke="#0C0839"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <span>Fixed Pice</span>
                  </button>
                  <button
                    onClick={() => setType("timed")}
                    type="button"
                    className={`flex flex-col flex-1 gap-2 items-center justify-center p-4  rounded-lg border-2 ${
                      type == "timed" ? "border-[#954AFC] bg-[#954AFC1A]" : ""
                    }`}
                  >
                    <svg
                      width="25"
                      height="24"
                      viewBox="0 0 25 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3.75 12C3.75 13.78 4.27784 15.5201 5.26677 17.0001C6.25571 18.4802 7.66131 19.6337 9.30585 20.3149C10.9504 20.9961 12.76 21.1743 14.5058 20.8271C16.2516 20.4798 17.8553 19.6226 19.114 18.364C20.3726 17.1053 21.2298 15.5016 21.5771 13.7558C21.9243 12.01 21.7461 10.2004 21.0649 8.55585C20.3837 6.91131 19.2302 5.50571 17.7501 4.51677C16.2701 3.52784 14.53 3 12.75 3C10.234 3.00947 7.81897 3.99122 6.01 5.74L3.75 8"
                        stroke="#0C0839"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M3.75 3V8H8.75"
                        stroke="#0C0839"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M12.75 7V12L16.75 14"
                        stroke="#0C0839"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <span>Timed Auction</span>
                  </button>
                </div>
              </div>
              {type === "timed" && (
                <div className="flex gap-4 w-full">
                  <div className="flex flex-col gap-1 w-full">
                    <label className="font-medium">Days</label>
                    <input
                      disabled={isStartSaleLoading}
                      type="number"
                      min="0"
                      className="shadow-2 p-2 disabled:opacity-60 px-4 font-medium border-2 outline-none rounded-lg flex-[1_1_33%]"
                      value={days}
                      onChange={(e) =>
                        handleAuctionInputChange("days", acceptWholeNumbers(e))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <label className="font-medium">Hours</label>
                    <input
                      disabled={isStartSaleLoading}
                      type="number"
                      min="0"
                      max="24"
                      className="shadow-2 disabled:opacity-60 p-2 px-4 font-medium border-2 outline-none rounded-lg flex-[1_1_33%]"
                      value={hours}
                      onChange={(e) =>
                        handleAuctionInputChange("hours", acceptWholeNumbers(e))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <label className="font-medium">Minutes</label>
                    <input
                      disabled={isStartSaleLoading}
                      type="number"
                      min="0"
                      max="60"
                      className="shadow-2  disabled:opacity-60 p-2 px-4 font-medium border-2 outline-none rounded-lg flex-[1_1_33%]"
                      value={minutes}
                      onChange={(e) =>
                        handleAuctionInputChange(
                          "minutes",
                          acceptWholeNumbers(e)
                        )
                      }
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col gap-3 w-full">
                  <p className="font-medium">Currency</p>
                  {/* select option  */}
                  <div className="relative">
                    <div className="w-full shadow-2 p-2 font-medium border-2 outline-none rounded-lg flex items-center gap-2">
                      <Image src={usdt} width={20} height={20} alt="flag" />
                      <span>USD</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <p className="font-medium">Selling Price</p>
                  <input
                    disabled={isStartSaleLoading}
                    type="number"
                    min={0}
                    value={sellingPrice}
                    onChange={(e) =>
                      handleInputChange("sellingPrice", e.target.value, false)
                    }
                    className="shadow-2 disabled:opacity-60 p-2 px-4 font-medium border-2 outline-none rounded-lg "
                    placeholder="Enter price"
                  />
                </div>
              </div>
              {sellingPrice > 0 && (
                <p
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                    parseFloat(sellingPrice) < property.pricePerShare
                      ? "bg-[#FDE8E8] text-[#E02828]" // Red for below market price
                      : parseFloat(sellingPrice) > property.pricePerShare
                      ? "bg-[#E9F7EF] text-[#28AE60]" // Green for above market price
                      : "bg-[#F4F4F4] text-[#6C757D]" // Gray for same as market price
                  }`}
                >
                  <svg
                    width="20"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      fill={
                        parseFloat(sellingPrice) < property.pricePerShare
                          ? "#E02828" // Red for below market price
                          : parseFloat(sellingPrice) > property.pricePerShare
                          ? "#28AE60" // Green for above market price
                          : "#6C757D" // Gray for same as market price
                      }
                      stroke={
                        parseFloat(sellingPrice) < property.pricePerShare
                          ? "#E02828" // Red for below market price
                          : parseFloat(sellingPrice) > property.pricePerShare
                          ? "#28AE60" // Green for above market price
                          : "#6C757D" // Gray for same as market price
                      }
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16V12"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 8H12.0092"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-sm font-medium">
                    {parseFloat(sellingPrice) < property.pricePerShare ? (
                      <span>
                        {Math.abs(
                          ((property.pricePerShare - parseFloat(sellingPrice)) /
                            property.pricePerShare) *
                            100
                        ).toFixed(2)}
                        % below market price
                      </span>
                    ) : parseFloat(sellingPrice) > property.pricePerShare ? (
                      <span>
                        {Math.abs(
                          ((parseFloat(sellingPrice) - property.pricePerShare) /
                            property.pricePerShare) *
                            100
                        ).toFixed(2)}
                        % higher than market price
                      </span>
                    ) : (
                      <span>Same as market price</span>
                    )}
                  </div>
                </p>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Quantity</p>
                  <span className="font-medium opacity-60">
                    Balance: {property.userBalance}
                  </span>
                </div>
                <input
                  disabled={isStartSaleLoading}
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", acceptWholeNumbers(e))
                  }
                  className="shadow-2 disabled:opacity-60 p-2 px-4 font-medium border-2 outline-none rounded-lg "
                  placeholder="Enter quantity"
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Fee</p>
                  <Tooltip text={fee} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium opacity-60">Service Fee</span>
                  <span className="font-medium opacity-60">
                    {platformFee * 2}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex w-full relative rounded-xl overflow-hidden">
                <Image
                  src={property.metadata.image}
                  height={300}
                  width={300}
                  layout="responsive"
                  alt="Property Image"
                  className="max-w-full h-full block"
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
                      {property?.propertyLocation?.location}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium opacity-60">Market Price</span>
                  <p className="font-medium">${property.pricePerShare}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium opacity-60">Selling Price</span>
                  <p className="font-medium">${sellingPrice}</p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-lg">Quantity</span>
                  <p className="font-bold text-lg">{quantity}</p>
                </div>
                {/* <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg">${total}</span>
                </div> */}
              </div>
              <button
                type="button"
                disabled={
                  quantity <= 0 ||
                  sellingPrice <= 0 ||
                  quantity > property.userBalance ||
                  isStartSaleLoading ||
                  (type == "timed" &&
                    days <= 0 &&
                    minutes <= 0 &&
                    hours <= 0 &&
                    minutes <= 0)
                }
                onClick={() =>
                  handleListForSale(property.id, quantity, sellingPrice)
                }
                className="py-2.5 px-4 bg-[#9945FF]  disabled:cursor-not-allowed disabled:opacity-60 rounded-full w-full text-white font-medium h-fit flex items-center justify-center"
              >
                {isStartSaleLoading ? (
                  <div className="w-5 h-5 border-4 border-t-[4px] border-t-[#3d4a6c] rounded-full animate-spin"></div>
                ) : currentStep == 0 ? (
                  "Approve"
                ) : (
                  "List for Sale"
                )}
              </button>

              {/* 
                        <div className="flex items-center p-5 rounded-lg bg-[#8165EC] bg-opacity-10">
                            <div className="flex items-center relative w-full h-2 bg-[#28AE60]">
                                <div className="shrink-0 size-7 absolute  -left-2 rounded-full bg-[#28AE60] flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M15 4.5L6.75 12.75L3 9" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>

                                </div>
                                <div className="shrink-0 size-7 absolute  -right-2 rounded-full bg-[#954AFC] font-bold text-white flex items-center justify-center">
                                    2
                                </div>
                            </div>


                        </div> */}
              <div className="flex items-center px-5 py-2 justify-center rounded-lg bg-[#8165EC] bg-opacity-10">
                <ol className="flex items-center w-full  text-gray-900 font-medium text-base justify-between">
                  <li
                    className={`flex w-full flex-1 items-center  relative transition-all  after:content-[''] after:w-full after:h-2  before:content-[''] before:h-2 after:bg-[#0C0839]  after:bg-opacity-15 ${
                      currentStep > 0 && currentStep <= 2
                        ? "before:bg-[#28AE60] done"
                        : "before:w-0"
                    }  before:inline-block before:absolute lg:before:top-4 before:top-3 before:left-4  after:inline-block after:absolute lg:after:top-4 after:top-3 after:left-4`}
                  >
                    <div className="block whitespace-nowrap z-10">
                      <span
                        className={`w-6 h-6 transition-all ${
                          currentStep >= 1 ? "bg-[#28AE60]" : "bg-[#0C0839]"
                        } border-2 border-transparent rounded-full flex justify-center items-center mx-auto mb-3 text-sm text-white lg:w-10 lg:h-10`}
                      >
                        {currentStep >= 1 ? (
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

                  <li className={`flex relative items-center transition-all `}>
                    <div className="block whitespace-nowrap z-10">
                      <span
                        className={`w-6 h-6 transition-all delay-700 ${
                          currentStep == 2
                            ? "bg-[#28AE60] text-white"
                            : "bg-[#d0ccdf]"
                        }  rounded-full flex justify-center items-center mx-auto mb-3 text-sm lg:w-10 lg:h-10`}
                      >
                        {currentStep == 2 ? (
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
                </ol>
              </div>
              {error.form && <p className="text-red-500">{error.form}</p>}
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        open={congrats}
        isCongrats={true}
        handleClose={() => setCongrats(false)}
        max="max-w-sm !rounded-3xl"
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
                <Image
                  src={icon}
                  width={500}
                  height={500}
                  alt="Property Documents"
                  className="max-w-full size-12"
                />
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
              onClick={() => setCongrats(false)}
              className="btn_primary_gradient w-full max-w-[15rem] text-white  whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium cursor-pointer"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ListPropertyShares;
