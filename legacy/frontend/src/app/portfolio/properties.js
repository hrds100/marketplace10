"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import CurrentApr from "./currentApr";
import BoostedApr from "./boostedApr";
import StayEarned from "../portfolio/stayEarned";
import Assets from "./assets";
import Holidays from "./holidays";
import ListPropertyShares from "../components/listPropertyShares";
import Link from "next/link";
import ProposalModel from "./proposalModel";
import BoostedCheckout from "./boostedCheckout";
import { usenfstayContext } from "@/context/nfstayContext";
import UserPropertiesSkeleton from "@/utils/UserPropertiesSkeleton";
import ProposalCongrats from "./ProposalCongrats";
import { formatNumber, getEthFrom } from "@/context/helper";
import {
  fetchPrimarySalesEvents,
  fetchSecondarySalesEvents,
} from "@/context/subgraphHelper";
import Tooltip from "@/utils/tooltip";
import { IoIosRefresh } from "react-icons/io";
const Properties = () => {
  const {
    getUserProperties,
    connectedAddress,
    getBoosterContract,
    getEstimatedRewards,
    assetPrices,
    assetBalance,
    getFarmContract,
    isBalanceLoading,
    globalLoader,
    isWalletLoading,
  } = usenfstayContext();
  const [open, setOpen] = useState(false);
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false); // portfolio Modal fro create
  const [openBoost, setOpenBoost] = useState(false);
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);
  const [isPropertyLoading, setIsPropertyLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [filteredSales, setFilteredSales] = useState({});
  const [activeProperties, setActiveProperties] = useState([]);
  const [boostAmount, setBoostAmount] = useState(0);

  // const [boostedIndex, setBoostedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const [isProposalSubmit, setIsProposalSubmit] = useState(false);
  const [rewards, setRewards] = useState(0);
  const [isBoosted, setIsBoosted] = useState(false);
  const [fetchBoost, setFetchBoost] = useState(false);
  const [boostingLoading, setBoostingLoading] = useState(true);
  const [isBoostingAmountLoading, setIsBoostingAmountLoading] = useState(false);

  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [propertyData, setPropertyData] = useState({
    amount: 0,
    totalValue: 0,
    percentage: 0,
  });

  const [lpData, setLpData] = useState({
    staked: 0,
    price: 0,
    amount: 0,
    totalValue: 0,
    percentage: 0,
  });

  const [stayData, setStayData] = useState({
    price: 0,
    amount: 0,
    totalValue: 0,
    percentage: 0,
  });

  const [propertyDetails, setPropertyDetails] = useState([]);
  const getPrimaryProperties = async () => {
    const _upcomingProperties = await fetchPrimarySalesEvents(1);
    const _primaryProperties = await fetchPrimarySalesEvents(2);

    // Merge both arrays
    const mergedProperties = [..._upcomingProperties, ..._primaryProperties];
    setActiveProperties(mergedProperties);
  };

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleOpenProposal = (e, index) => {
    e.stopPropagation();
    setSelectedId(index);
    setProposalOpen(true);
    setDropdownOpen(false);
  };

  const handleOpenBoost = (index) => {
    setOpenBoost(true);
    setSelectedId(index);
  };

  const checkIfBoosted = async (address, id) => {
    // Check if already boosted
    const contract = getBoosterContract();
    const _isBoosted = await contract.isBoosted(address, id);
    setIsBoosted(_isBoosted);
    return _isBoosted;
  };

  const getBoostAmount = async (index) => {
    try {
      // Ensure property details are valid
      setFetchBoost(true);
      const propertyId = propertyDetails?.[index]?.id;
      if (!propertyId) {
        return;
      }

      // Get the contract
      const contract = getBoosterContract();

      await checkIfBoosted(connectedAddress, propertyId);
      // let amount = 0;
      // let _rewards = 0;

      const _rewards = await getEstimatedRewards(connectedAddress, propertyId);
      
      setRewards(_rewards);
      const amount = await contract.getBoostAmount(
        connectedAddress,
        propertyId
      );
      setBoostAmount(getEthFrom(amount));
    } catch (err) {
      console.error("Error fetching boost data:", err);
    } finally {
      setFetchBoost(false);
    }
  };

  const nextProperty = () => {
    setCurrentPropertyIndex(
      (prevIndex) => (prevIndex + 1) % propertyDetails.length
    );
  };

  const prevProperty = () => {
    setCurrentPropertyIndex(
      (prevIndex) =>
        (prevIndex - 1 + propertyDetails.length) % propertyDetails.length
    );
  };

  //   const property = properties[currentPropertyIndex];

  const handleSubmit = (proposal) => {
    setIsProposalSubmit(true);
  };

  const _getUserProperties = async (address) => {
    const properties = await getUserProperties(address);
    await loadSecondarySales(address);
    // await initiateCalculation(address, properties);
    setPropertyDetails(properties);
  };

  const loadSecondarySales = async (address) => {
    try {
      // Fetch all events
      const events = await fetchSecondarySalesEvents();

      // Filter events by connectedAddress
      const filtered = events.filter(
        (event) => event._seller === address.toLowerCase()
      );

      // Create a mapping object with propertyId as the key
      const salesMapping = filtered.reduce((acc, event) => {
        acc[event._propertyId] = {
          listingId: event._listingId,
          propertyId: event._propertyId,
          seller: event._seller,
          status: event._status,
        };
        return acc;
      }, {});
      // Update state with the mapping
      setFilteredSales(salesMapping);
    } catch (error) {
      console.error("Error loading secondary sales:", error);
    }
  };

  // Fetch data on component mount or when connectedAddress changes

  const initiateCalculation = async (address, _propertyDetails) => {
    try {
      setIsAssetsLoading(true);

      // Stay Data
      const stayPrice = Number(assetPrices?.stayPrice) || 0;
      const stayBalance = Number(assetBalance?.stayBalance) || 0;
      const totalStayUsd = stayPrice * stayBalance;

      // LP Data
      const lpPrice = Number(assetPrices?.lpPrice) || 0;
      const lpBalance = Number(assetBalance?.lpBalance) || 0;
      const contract = getFarmContract();
      const _userInfo = await contract.userInfo(address);
      const _lpAmount = Number(getEthFrom(_userInfo.amount)); // Ensure conversion to Number

      const totalLp = _lpAmount + lpBalance;
      const totalLpUsd = lpPrice * totalLp;

      // Property Data

      const totalHoldingValue = (_propertyDetails || []).reduce(
        (acc, property) => {
          const pricePerShare = Number(property.pricePerShare) || 0;
          const userBalance = Number(property.userBalance) || 0;
          return acc + pricePerShare * userBalance;
        },
        0
      );

      const totalPortfolioValue = totalStayUsd + totalLpUsd + totalHoldingValue;

      // Update state once rather than multiple times to prevent unnecessary re-renders
      setTotalPortfolioValue(totalPortfolioValue);
      setStayData({
        price: `$${stayPrice.toFixed(3)}`,
        amount: formatNumber(stayBalance),
        totalValue: `$${formatNumber(totalStayUsd)}`,
        percentage:
          totalPortfolioValue > 0
            ? ((totalStayUsd / totalPortfolioValue) * 100).toFixed(2)
            : 0,
      });
      setLpData({
        staked: _lpAmount.toFixed(2),
        price: `$${lpPrice.toFixed(2)}`,
        amount: formatNumber(totalLp),
        totalValue: `$${formatNumber(totalLpUsd)}`,
        percentage:
          totalPortfolioValue > 0
            ? ((totalLpUsd / totalPortfolioValue) * 100).toFixed(2)
            : 0,
      });
      setPropertyData({
        amount: formatNumber(
          (_propertyDetails || []).reduce(
            (acc, property) => acc + (property.userBalance || 0),
            0
          )
        ),
        totalValue: `$${formatNumber(totalHoldingValue)}`,
        percentage:
          totalPortfolioValue > 0
            ? ((totalHoldingValue / totalPortfolioValue) * 100).toFixed(2)
            : 0,
      });
    } catch (err) {
      console.log(err);
    } finally {
      setIsAssetsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsPropertyLoading(true);
      setPropertyDetails([]);

      if (!connectedAddress) {
        setIsPropertyLoading(false);

        return;
      }
      await getPrimaryProperties();
      await _getUserProperties(connectedAddress);
      setIsPropertyLoading(false);
    };
    loadData();
  }, [connectedAddress]);

  useEffect(() => {
    if (!isWalletLoading && !connectedAddress) setIsAssetsLoading(false);
  }, [connectedAddress, isWalletLoading]);

  useEffect(() => {
    const loadData = async () => {
      if (
        connectedAddress &&
        !isBalanceLoading &&
        !globalLoader

        // propertyDetails.length > 0
      ) {
        await initiateCalculation(connectedAddress, propertyDetails);
      }

      // else {
      //   setIsAssetsLoading(false);
      // }
      // Start by assuming loading is necessary until proven otherwise

      // Check if all necessary conditions are met to proceed with calculation
      // if (
      //   !connectedAddress ||
      //   !propertyDetails ||
      //   propertyDetails.length === 0 ||
      //   !assetBalance
      // ) {
      //   // If any condition is not met, keep the loading state true
      //   // Only set to false if no address is present at all to avoid misleading the user
      //   setIsAssetsLoading(false);
      // }

      // If all conditions are met, proceed with the calculation

      // After calculation, end loading
    };

    loadData();
  }, [
    connectedAddress,
    propertyDetails,
    globalLoader,
    isBalanceLoading,
    assetBalance,
  ]);

  useEffect(() => {
    setIsBoostingAmountLoading(true);
    (async () => {
      await getBoostAmount(currentPropertyIndex);
      setIsBoostingAmountLoading(false);
    })();
  }, [currentPropertyIndex]);

  useEffect(() => {
    (async () => {
      setBoostingLoading(true);
      if (
        propertyDetails?.length > 0 &&
        // currentPropertyIndex >= 0 &&
        connectedAddress
      ) {
        // checkIfBoosted(connectedAddress, currentPropertyIndex);
        await getBoostAmount(currentPropertyIndex);
        setBoostingLoading(false);
      }
    })();
  }, [connectedAddress, propertyDetails]); // Dependencies remain as necessary

  useEffect(() => {
    if (propertyDetails?.length == 0 && isPropertyLoading == false) {
      setBoostingLoading(false);
    }
  }, [isPropertyLoading, propertyDetails]);

  const refreshPortfolio = async () => {
    setIsPropertyLoading(true);
    await getPrimaryProperties();
    await _getUserProperties(connectedAddress);
    setIsPropertyLoading(false);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <h4 className="text-title-lg font-bold text-black 2xl:text-4xl">
              Your Properties
            </h4>
            <div className="relative group">
              <button
                onClick={refreshPortfolio}
                className={`${
                  !connectedAddress || isPropertyLoading
                    ? "cursor-not-allowed"
                    : "cursor-pointer"
                } text-white mt-2 btn_primary_gradient p-1 rounded-full ${
                  !connectedAddress || isPropertyLoading
                    ? " opacity-50"
                    : "hover:opacity-90"
                }`}
                disabled={!connectedAddress || isPropertyLoading}
              >
                <IoIosRefresh size={25} />
              </button>
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-sm bg-gray-800 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Refresh
              </span>
            </div>
          </div>
          {propertyDetails.length > 0 && (
            <div className="flex items-center gap-4 self-end">
              {/* <span className="font-medium 2xl:text-lg">View All</span> */}
              {propertyDetails.length > 1 && (
                <>
                  <button
                    onClick={prevProperty}
                    type="button"
                    disabled={isPropertyLoading}
                    className="shrink-0 w-8 h-8 group flex items-center justify-center shadow-lg border bg-white rounded-full"
                  >
                    <svg
                      width="7"
                      height="12"
                      className="opacity-30 scale-[-1] group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100"
                      viewBox="0 0 7 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 1L6 6L1 11"
                        stroke="#0C0839"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={nextProperty}
                    disabled={isPropertyLoading}
                    type="button"
                    className="shrink-0 w-8 h-8 flex group items-center justify-center shadow-lg border bg-white rounded-full"
                  >
                    <svg
                      width="7"
                      height="12"
                      viewBox="0 0 7 12"
                      className="opacity-30 group-hover:opacity-100 group-active:opacity-100 group-focus-within:opacity-100"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 1L6 6L1 11"
                        stroke="#0C0839"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {isPropertyLoading || boostingLoading ? (
          <UserPropertiesSkeleton />
        ) : propertyDetails.length > 0 ? (
          <div className="property-slider overflow-x-hidden relative">
            <div
              style={{
                transform: `translateX(-${100 * currentPropertyIndex}%)`,
                transition: "all cubic-bezier(.36,.07,.19,.97) 1s",
              }}
              className="flex w-full h-full relative"
            >
              {propertyDetails.map((property, index) => {
                const matchingSale = filteredSales[property.id];
                return (
                  <div key={index} className="flex w-full shrink-0">
                    <div className="grid grid-cols-1 w-full lg:grid-cols-[63%_35%] h-full gap-5">
                      <div className="flex flex-col gap-5 w-full border shadow-sm lg:overflow-hidden rounded-xl">
                        <div className="w-full relative">
                          <div className="h-[12rem] lg:h-[25rem] w-full">
                            <Image
                              src={property.metadata.image} // Assuming property has an 'img' field
                              className="h-full object-cover max-w-full"
                              layout="fill"
                              alt="Property of the day"
                            />
                          </div>
                          <div className="w-[200px] h-[40px] absolute top-5 bg-[#954AFC] rounded-tr-[50px] rounded-br-[50px]">
                            <div className="left-[10px] top-[8px] absolute text-white text-base font-bold">
                              {property.pricePerShare} USD*
                            </div>
                            <div className="left-[115px] top-[15px] absolute text-white text-[0.7rem] font-medium">
                              starting price
                            </div>
                          </div>
                        </div>
                        <div className="justify-between w-full lg:items-center gap-4 p-4 flex flex-col lg:flex-row flex-wrap">
                          {/* Property Information */}
                          <div className="justify-start lg:justify-between items-start w-full lg:items-center gap-6 flex flex-1 flex-col lg:flex-row flex-wrap">
                            <div className="relative flex-1 w-full">
                              <div className="flex items-center gap-1 w-full flex-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="15"
                                  height="19"
                                  viewBox="0 0 15 19"
                                  fill="none"
                                >
                                  <path
                                    d="M6.99997 19C5.73692 17.9228 4.56617 16.7419 3.49999 15.4697C1.89999 13.5591 8.79148e-07 10.7136 8.79148e-07 8.00214C-0.000693118 6.61737 0.409507 5.26353 1.17869 4.11193C1.94787 2.96034 3.04146 2.06276 4.32105 1.5328C5.60064 1.00285 7.00872 0.864328 8.36709 1.13477C9.72544 1.40523 10.9731 2.07249 11.952 3.05211C12.6037 3.70084 13.1203 4.47237 13.4719 5.32204C13.8234 6.17171 14.0029 7.08265 14 8.00214C14 10.7136 12.1 13.5591 10.5 15.4697C9.43376 16.7419 8.26303 17.9228 6.99997 19ZM6.99997 5.00273C6.20433 5.00273 5.44127 5.31873 4.87866 5.88123C4.31605 6.44373 3.99999 7.20665 3.99999 8.00214C3.99999 8.79763 4.31605 9.56055 4.87866 10.123C5.44127 10.6855 6.20433 11.0016 6.99997 11.0016C7.79562 11.0016 8.55868 10.6855 9.12129 10.123C9.68389 9.56055 9.99998 8.79763 9.99998 8.00214C9.99998 7.20665 9.68389 6.44373 9.12129 5.88123C8.55868 5.31873 7.79562 5.00273 6.99997 5.00273Z"
                                    fill="#A260FD"
                                  />
                                </svg>
                                <div className="opacity-50 text-slate-900 text-sm font-medium 2xl:text-lg">
                                  {property.propertyLocation.location}
                                </div>
                              </div>
                              <div className="max-w-[14rem] text-slate-900 text-lg font-bold 2xl:max-w-full 2xl:text-2xl">
                                {property.metadata.name}
                              </div>
                            </div>
                            <div className="relative">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="hidden md:block absolute -left-3 -top-2"
                                width="2"
                                height="51"
                                viewBox="0 0 2 51"
                                fill="none"
                              >
                                <path
                                  opacity="0.2"
                                  d="M1 0.5V50.5"
                                  stroke="#0C0839"
                                />
                              </svg>
                              <div className="text-[#0C0839] text-xs font-medium 2xl:text-lg">
                                Property Price
                              </div>
                              <div className="text-slate-900 text-xl font-bold 2xl:text-2xl">
                                {(
                                  property.pricePerShare * property.totalShares
                                ).toLocaleString()}{" "}
                                USD
                              </div>
                            </div>
                          </div>
                          {/* Buttons */}
                          <div className="flex items-center justify-start gap-3">
                            {/* {matchingSale ? (
                              <Link
                                href={{
                                  pathname: `/secondary/${matchingSale.listingId}`,
                                }}
                                className="px-6 py-1.5 border bg-white text-[#0C0839] border-[#0C0839] rounded-full justify-center items-center gap-1.5 flex"
                              >
                                <div className="text-sm font-medium 2xl:text-lg">
                                  View
                                </div>
                              </Link>
                            ) : (
                              <button
                                onClick={() => {
                                  setOpen(true);
                                  setSelectedId(index);
                                }}
                                className={`px-6 py-1.5 border bg-white text-[#0C0839] border-[#0C0839] rounded-full justify-center items-center gap-1.5 flex ${
                                  activeProperties.some(
                                    (activeProperty) =>
                                      Number(activeProperty._propertyId) ===
                                      property.id
                                  )
                                    ? "cursor-not-allowed opacity-50"
                                    : ""
                                }`}
                                disabled={activeProperties.some(
                                  (activeProperty) =>
                                    Number(activeProperty._propertyId) ===
                                    property.id
                                )}
                              >
                                <div className="text-sm font-medium 2xl:text-lg">
                                  Sell
                                </div>
                              </button>
                            )} */}
                            <Link
                              href="/activeProposal"
                              className="px-4 py-1.5 bg-[#0C0839] rounded-full backdrop-blur-[29.60px] justify-center items-center gap-1.5 flex"
                            >
                              <div className="text-white text-sm font-medium 2xl:text-lg">
                                Vote Now
                              </div>
                            </Link>
                            <div className="relative" ref={dropdownRef}>
                              <button
                                type="button"
                                className="flex items-center cursor-pointer text-primary"
                                onClick={handleDropdownToggle}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="4"
                                  height="16"
                                  viewBox="0 0 4 16"
                                  fill="none"
                                >
                                  <circle cx="2" cy="2" r="2" fill="#A260FD" />
                                  <circle cx="2" cy="8" r="2" fill="#A260FD" />
                                  <circle cx="2" cy="14" r="2" fill="#A260FD" />
                                </svg>
                              </button>
                              {dropdownOpen && (
                                <div className="absolute right-0 -bottom-14 mt-5 border  z-10 bg-white hover:bg-gray-100 text-[#0C0839] border-[#0C0839] rounded-full justify-center items-center">
                                  <button
                                    onClick={(e) =>
                                      handleOpenProposal(e, index)
                                    }
                                    className="block text-left px-3 py-2 whitespace-nowrap text-black"
                                  >
                                    Create Proposal
                                  </button>
                                </div>
                              )}
                            </div>
                            {/* {activeProperties.some(
                              (activeProperty) =>
                                Number(activeProperty._propertyId) ===
                                property.id
                            ) && (
                              <Tooltip text="Secondary sale is unavailable until primary sale of this property ends" />
                            )} */}
                          </div>
                        </div>
                      </div>
                      <div className="flex relative flex-col gap-5 w-full">
                        <CurrentApr
                          getBoostAmount={getBoostAmount}
                          currentPropertyIndex={currentPropertyIndex}
                          isBoostingAmountLoading={isBoostingAmountLoading}
                          property={property}
                          isBoosted={isBoosted}
                          totalProperties={
                            propertyDetails[currentPropertyIndex]?.userBalance
                          }
                          handleOpen={() => {
                            handleOpenBoost(index);
                          }}
                          fetchBoost={fetchBoost}
                          boostAmount={boostAmount}
                        />
                        {/* {isBoosted ? (
                          <StayEarned
                            setRewards={setRewards}
                            rewards={rewards}
                            fetchBoost={fetchBoost}
                            property={property}
                          />
                        ) : ( */}
                        <BoostedApr
                          isBoostingAmountLoading={isBoostingAmountLoading}
                          boostingLoading={boostingLoading}
                          isPropertyLoading={isPropertyLoading}
                          fetchBoost={fetchBoost}
                          setRewards={setRewards}
                          rewards={rewards}
                          selectedId={propertyDetails[currentPropertyIndex]?.id}
                          boostAmount={boostAmount}
                          isBoosted={isBoosted}
                          property={property}
                          handleOpen={() => {
                            handleOpenBoost(index);
                          }}
                        />
                        {/* )} */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-32">
            <p className="text-gray-500 text-lg font-semibold text-center bg-gray-100 p-4 rounded shadow-md">
              🚫 No Property Found
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[63%_35%] gap-5">
          <Assets
            isPropertyLoading={isPropertyLoading}
            isLoading={isAssetsLoading}
            stayData={stayData}
            lpData={lpData}
            propertyData={propertyData}
          />
          <Holidays
            isPropertyLoading={isPropertyLoading}
            isLoading={isAssetsLoading}
            stayValue={stayData.percentage}
            lpValue={lpData.percentage}
            propertyValue={propertyData.percentage}
            totalPortfolioValue={totalPortfolioValue}
          />
        </div>
        <ListPropertyShares
          loadSecondarySales={loadSecondarySales}
          open={open}
          property={propertyDetails[selectedId]}
          handleClose={() => setOpen(false)}
        />
        <BoostedCheckout
          checkIfBoosted={checkIfBoosted}
          boostAmount={boostAmount}
          setBoostAmount={setBoostAmount}
          open={openBoost}
          property={propertyDetails[selectedId]}
          // handleSetIndex={() => setBoostedIndex(currentPropertyIndex)}
          setOpen={setOpenBoost}
        />
      </div>
      <ProposalModel
        open={proposalOpen}
        handleClose={() => setProposalOpen(false)}
        property={propertyDetails[selectedId]}
        handleSubmit={handleSubmit}
      />
      <ProposalCongrats
        open={isProposalSubmit}
        handleClose={() => setIsProposalSubmit(false)}
      />
    </>
  );
};

export default Properties;
