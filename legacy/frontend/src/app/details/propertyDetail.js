"use client";

import Tooltip from "@/utils/tooltip";
import ImageCarousel from "./imageCarousel";
import SharesSold from "../components/sharesSold";

const PropertyDetail = ({ propertyDetails, secondaryDetails, source }) => {
  const {
    pricePerShare,
    totalOwners,
    apr,
    totalShares,
    metadata,
    propertyLocation,
    beds,
    sqft,
    remainingShares,
    totalSharesInMarket,
  } = propertyDetails;
  let images = [metadata.image, ...(metadata.images || [])];
  //todo: update owners real time, and  shares
  const isRentToRent =
    source === "marketplace" ||
    (source === "checkout" &&
      propertyDetails?.metadata?.category === "Rent 2 Rent") ||
    source === "secondary" ||
    (source === "checkout" &&
      secondaryDetails?.metadata?.category === "Rent 2 Rent");

 
  let toolText = isRentToRent
    ? "Yearly Yield x Number of years on the official document"
    : `
    Our 6-year return projection includes the current annual APR, derived from the property's ongoing rental agreement, plus an estimated 20% property value appreciation.
    `;

  let toolTextMonthlyRental = "Monthly yield average x 12";

  let toolTextAnnualRental = "Average of past months net yield";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[45%_52.5%] gap-6">
      <div className="flex w-full relative h-fit rounded-xl overflow-hidden">
        {/* <div className="w-full bg-red-300 flex h-full overflow-hidden">
          {
            metadata?.images?.length > 0 ? (
              metadata.images.map((image, index) => (
                <Image
                  key={index}
                  src={image}
                  alt={metadata.name}
                  width={500}
                  height={500}
                />
              ))
            ) : (
              <div className="w-full h-full bg-gray-200"></div>
            )
          }
        </div> */}
        <ImageCarousel images={images} interval={3000} />
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
              {propertyLocation.location}
            </span>
          </div>

          {/* <div className="flex items-center justify-center size-8 rounded-full bg-white shrink-0">
                        <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.87869 1.85787C1.60011 2.12985 1.37913 2.45273 1.22836 2.80809C1.0776 3.16344 1 3.54431 1 3.92894C1 4.31358 1.0776 4.69444 1.22836 5.0498C1.37913 5.40515 1.60011 5.72804 1.87869 6.00001L7 11L12.1213 6.00001C12.6839 5.45073 13 4.70574 13 3.92894C13 3.15214 12.6839 2.40715 12.1213 1.85787C11.5587 1.30859 10.7956 1.00001 9.99999 1.00001C9.20434 1.00001 8.44128 1.30859 7.87867 1.85787L7 2.71572L6.12134 1.85787C5.84277 1.58589 5.51205 1.37015 5.14807 1.22295C4.78409 1.07576 4.39398 1 4.00002 1C3.60605 1 3.21594 1.07576 2.85196 1.22295C2.48798 1.37015 2.15726 1.58589 1.87869 1.85787V1.85787Z" stroke="url(#paint0_linear_0_7082)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            <defs>
                                <linearGradient id="paint0_linear_0_7082" x1="1" y1="-1.08336" x2="13.1726" y2="-0.906857" gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#9945FF" />
                                    <stop offset="1" stop-color="#20E19F" />
                                </linearGradient>
                            </defs>
                        </svg>


                    </div> */}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex items-center w-fit gap-2 px-3 py-1.5 bg-white rounded-lg text-[#8165EC] border-2 border-[#8165EC]">
          <svg
            width="20"
            height="21"
            viewBox="0 0 20 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.6665 17.1666V10.4999C1.6665 10.0579 1.8421 9.63397 2.15466 9.32141C2.46722 9.00885 2.89114 8.83325 3.33317 8.83325H16.6665C17.1085 8.83325 17.5325 9.00885 17.845 9.32141C18.1576 9.63397 18.3332 10.0579 18.3332 10.4999V17.1666"
              stroke="#8165EC"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M3.3335 8.83325V5.49992C3.3335 5.05789 3.50909 4.63397 3.82165 4.32141C4.13421 4.00885 4.55814 3.83325 5.00016 3.83325H15.0002C15.4422 3.83325 15.8661 4.00885 16.1787 4.32141C16.4912 4.63397 16.6668 5.05789 16.6668 5.49992V8.83325"
              stroke="#8165EC"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M10 3.83325V8.83325"
              stroke="#8165EC"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M1.6665 15.5H18.3332"
              stroke="#8165EC"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span className="2xl:text-base">
            {beds} Beds | {sqft} sqft
          </span>
        </div>

        <h1 className="text-3xl font-bold 2xl:text-4xl">{metadata.name}</h1>
        <div className="flex flex-wrap gap-5  2xl:text-lg">
          <div className="flex items-center gap-1 ">
            <svg
              width="20"
              height="21"
              viewBox="0 0 20 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g opacity="0.5">
                <path
                  d="M14.9998 17.9999C14.9998 16.2318 14.2975 14.5361 13.0472 13.2859C11.797 12.0356 10.1013 11.3333 8.33317 11.3333C6.56506 11.3333 4.86937 12.0356 3.61913 13.2859C2.36888 14.5361 1.6665 16.2318 1.6665 17.9999"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M8.33317 11.3333C10.6344 11.3333 12.4998 9.46785 12.4998 7.16667C12.4998 4.86548 10.6344 3 8.33317 3C6.03198 3 4.1665 4.86548 4.1665 7.16667C4.1665 9.46785 6.03198 11.3333 8.33317 11.3333Z"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M18.3333 17.1666C18.3333 14.3583 16.6667 11.7499 15 10.4999C15.5478 10.0889 15.9859 9.54916 16.2755 8.92848C16.565 8.30779 16.6971 7.62531 16.66 6.94142C16.6229 6.25753 16.4178 5.59332 16.0629 5.00759C15.7079 4.42185 15.2141 3.93264 14.625 3.58325"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
            <h4 className="font-semibold">{totalOwners} Owners</h4>
          </div>
          <div className="flex items-center gap-1">
            <svg
              width="21"
              height="21"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g opacity="0.5">
                <path
                  d="M17.8335 13.8334V7.16675C17.8332 6.87448 17.756 6.58742 17.6098 6.33438C17.4635 6.08134 17.2533 5.87122 17.0002 5.72508L11.1668 2.39175C10.9135 2.24547 10.6261 2.16846 10.3335 2.16846C10.0409 2.16846 9.75353 2.24547 9.50016 2.39175L3.66683 5.72508C3.41371 5.87122 3.20348 6.08134 3.05721 6.33438C2.91095 6.58742 2.8338 6.87448 2.8335 7.16675V13.8334C2.8338 14.1257 2.91095 14.4127 3.05721 14.6658C3.20348 14.9188 3.41371 15.1289 3.66683 15.2751L9.50016 18.6084C9.75353 18.7547 10.0409 18.8317 10.3335 18.8317C10.6261 18.8317 10.9135 18.7547 11.1668 18.6084L17.0002 15.2751C17.2533 15.1289 17.4635 14.9188 17.6098 14.6658C17.756 14.4127 17.8332 14.1257 17.8335 13.8334Z"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M6.5835 4.0083L10.3335 6.17497L14.0835 4.0083"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M6.5835 16.9917V12.6667L2.8335 10.5"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M17.8335 10.5L14.0835 12.6667V16.9917"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M3.05859 6.30005L10.3336 10.5084L17.6086 6.30005"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10.3335 18.9V10.5"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
            {source == "secondary" ? (
              <h4 className="font-semibold">
                {secondaryDetails.sharesRemaining.toLocaleString()} Shares
                remaining
              </h4>
            ) : (
              <>
                <h4 className="font-semibold">
                  {totalShares.toLocaleString()} Total Shares
                </h4>
                <div className="ml-5 flex items-center gap-1">
                  {source == "marketplace" && (
                    <>
                      {" "}
                      <svg
                        width="21"
                        height="21"
                        viewBox="0 0 21 21"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g opacity="0.5">
                          <path
                            d="M17.8335 13.8334V7.16675C17.8332 6.87448 17.756 6.58742 17.6098 6.33438C17.4635 6.08134 17.2533 5.87122 17.0002 5.72508L11.1668 2.39175C10.9135 2.24547 10.6261 2.16846 10.3335 2.16846C10.0409 2.16846 9.75353 2.24547 9.50016 2.39175L3.66683 5.72508C3.41371 5.87122 3.20348 6.08134 3.05721 6.33438C2.91095 6.58742 2.8338 6.87448 2.8335 7.16675V13.8334C2.8338 14.1257 2.91095 14.4127 3.05721 14.6658C3.20348 14.9188 3.41371 15.1289 3.66683 15.2751L9.50016 18.6084C9.75353 18.7547 10.0409 18.8317 10.3335 18.8317C10.6261 18.8317 10.9135 18.7547 11.1668 18.6084L17.0002 15.2751C17.2533 15.1289 17.4635 14.9188 17.6098 14.6658C17.756 14.4127 17.8332 14.1257 17.8335 13.8334Z"
                            stroke="#0C0839"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M6.5835 4.0083L10.3335 6.17497L14.0835 4.0083"
                            stroke="#0C0839"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M6.5835 16.9917V12.6667L2.8335 10.5"
                            stroke="#0C0839"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M17.8335 10.5L14.0835 12.6667V16.9917"
                            stroke="#0C0839"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M3.05859 6.30005L10.3336 10.5084L17.6086 6.30005"
                            stroke="#0C0839"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M10.3335 18.9V10.5"
                            stroke="#0C0839"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </g>
                      </svg>
                      <h4 className="font-semibold">
                        {remainingShares.toLocaleString()} Shares Remaining
                      </h4>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* <div className="flex items-center gap-1">
            <svg
              width="21"
              height="21"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g opacity="0.5">
                <path
                  d="M2.38461 10.7901C2.31516 10.603 2.31516 10.3972 2.38461 10.2101C3.06102 8.56993 4.2092 7.16759 5.68358 6.1808C7.15796 5.19402 8.89214 4.66724 10.6663 4.66724C12.4404 4.66724 14.1746 5.19402 15.649 6.1808C17.1233 7.16759 18.2715 8.56993 18.9479 10.2101C19.0174 10.3972 19.0174 10.603 18.9479 10.7901C18.2715 12.4302 17.1233 13.8325 15.649 14.8193C14.1746 15.8061 12.4404 16.3329 10.6663 16.3329C8.89214 16.3329 7.15796 15.8061 5.68358 14.8193C4.2092 13.8325 3.06102 12.4302 2.38461 10.7901Z"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10.6665 13C12.0472 13 13.1665 11.8807 13.1665 10.5C13.1665 9.11929 12.0472 8 10.6665 8C9.28579 8 8.1665 9.11929 8.1665 10.5C8.1665 11.8807 9.28579 13 10.6665 13Z"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>

            <h4 className="font-semibold">{views} Views</h4>
          </div>
          <div className="flex items-center gap-1">
            <svg
              width="20"
              height="21"
              viewBox="0 0 20 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g opacity="0.5">
                <path
                  d="M15.8332 12.1667C17.0748 10.95 18.3332 9.49167 18.3332 7.58333C18.3332 6.36776 17.8503 5.20197 16.9907 4.34243C16.1312 3.48289 14.9654 3 13.7498 3C12.2832 3 11.2498 3.41667 9.99984 4.66667C8.74984 3.41667 7.7165 3 6.24984 3C5.03426 3 3.86847 3.48289 3.00893 4.34243C2.14939 5.20197 1.6665 6.36776 1.6665 7.58333C1.6665 9.5 2.9165 10.9583 4.1665 12.1667L9.99984 18L15.8332 12.1667Z"
                  stroke="#0C0839"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>

            <h4 className="font-semibold">{favs} Favorites</h4>
          </div> */}
        </div>
        {source === "marketplace" && (
          <SharesSold
            sold={totalShares - remainingShares}
            total={totalShares}
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 h-full">
          <div className="p-4 flex flex-col gap-4 bg-[#F5F5F5] rounded-lg">
            <p className="2xl:text-base">
              {isRentToRent ? "Rent Cost" : "Property Listing Price"}
            </p>
            <h2 className="text-xl font-bold 2xl:text-2xl">
               {propertyDetails?.transactionBreakdown?.[1]?.amount || 0}
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-4 bg-[#F5F5F5] rounded-lg">
            <p className="flex items-center gap-2 2xl:text-base">
              {isRentToRent ? "Monthly Yield" : "Annual Yield"}
              {isRentToRent && (
                <button className="relative group">
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 21 21"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g opacity={0.6}>
                      <path
                        d="M10.5 19.25C15.3325 19.25 19.25 15.3325 19.25 10.5C19.25 5.66751 15.3325 1.75 10.5 1.75C5.66751 1.75 1.75 5.66751 1.75 10.5C1.75 15.3325 5.66751 19.25 10.5 19.25Z"
                        stroke="#0C0839"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10.5 14V10.5"
                        stroke="#0C0839"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10.5 7H10.5088"
                        stroke="#0C0839"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  </svg>
                  <span
                    className="absolute z-[9999] group-hover:visible invisible bg-[#555555bd] 
          transition-all -translate-x-1/2 sm:-translate-x-[80%] p-2 px-3 text-xs 
          sm:text-sm text-white rounded-lg whitespace-normal w-[16rem] sm:w-[20rem] max-w-[90vw]"
                    style={{ top: "100%", left: "50%" }}
                  >
                    {toolTextAnnualRental}
                  </span>
                </button>
              )}
            </p>

            <h2 className="text-xl font-bold 2xl:text-2xl">
               {isRentToRent ? (parseFloat(apr) / 12).toFixed(2) : 30}%
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-4 bg-[#F5F5F5] rounded-lg">
            <p className="flex items-center gap-2 2xl:text-base">
              {isRentToRent
                ? "Expected Yearly Yield"
                : "Expected Yearly Yield"}
              <button className="relative group">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 21 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g opacity={0.6}>
                    <path
                      d="M10.5 19.25C15.3325 19.25 19.25 15.3325 19.25 10.5C19.25 5.66751 15.3325 1.75 10.5 1.75C5.66751 1.75 1.75 5.66751 1.75 10.5C1.75 15.3325 5.66751 19.25 10.5 19.25Z"
                      stroke="#0C0839"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.5 14V10.5"
                      stroke="#0C0839"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.5 7H10.5088"
                      stroke="#0C0839"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
                <span
                  className="absolute z-[9999] group-hover:visible invisible bg-[#555555bd] 
        transition-all -translate-x-1/2 sm:-translate-x-[80%] p-2 px-3 text-xs 
        sm:text-sm text-white rounded-lg whitespace-normal w-[16rem] sm:w-[20rem] max-w-[90vw]"
                  style={{ top: "100%", left: "50%" }}
                >
                  {toolTextMonthlyRental}
                </span>
              </button>
            </p>

            <h2 className="text-xl font-bold 2xl:text-2xl">
             
               {parseFloat(apr)?.toFixed(2)}%
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-4 bg-[#F5F5F5] rounded-lg">
            <p className="flex items-center gap-2 2xl:text-base">
              {isRentToRent ? "Expected ROI" : "Expected ROI"}
              <button className="relative group">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 21 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g opacity={0.6}>
                    <path
                      d="M10.5 19.25C15.3325 19.25 19.25 15.3325 19.25 10.5C19.25 5.66751 15.3325 1.75 10.5 1.75C5.66751 1.75 1.75 5.66751 1.75 10.5C1.75 15.3325 5.66751 19.25 10.5 19.25Z"
                      stroke="#0C0839"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M10.5 14V10.5"
                      stroke="#0C0839"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M10.5 7H10.5088"
                      stroke="#0C0839"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                </svg>
                <span
                  className="absolute z-[9999] group-hover:visible invisible bg-[#555555bd] transition-all -translate-x-1/2 sm:-translate-x-[80%] p-2 px-3 text-xs sm:text-sm text-white rounded-lg whitespace-normal w-[16rem] sm:w-[20rem] max-w-[90vw]"
                  style={{
                    top: "100%",
                    left: "50%",
                  }}
                >
                  {toolText}
                </span>
              </button>
            </p>
            <h2 className="text-xl font-bold 2xl:text-2xl">
              {isRentToRent
                ? (parseFloat(apr) * 5)?.toFixed(2)
                : (parseFloat(apr) * 6 + 30)?.toFixed(2)}
              %
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
