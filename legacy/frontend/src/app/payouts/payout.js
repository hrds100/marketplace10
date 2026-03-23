"use client";
import PaginatedTable from "@/utils/paginatedTable";
import {
  fetchRentStatusEvents,
  fetchRentWithdrawnEvents,
} from "@/context/subgraphHelper";
import { useEffect, useState } from "react";
import { usenfstayContext } from "@/context/nfstayContext";
import { getEthFrom } from "@/context/helper";
import PastPayouts from "./pastPayouts";
import OffRamp from "./offRamp";

const Payout = () => {
  const {
    connectedAddress,
    getRentContract,
    getPropertyDetails,
    getRwaContract,
  } = usenfstayContext();
  const [activeRents, setActiveRents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPastPayoutLoading, setPastPayoutLoading] = useState(true);
  const [pastPayouts, setPastPayouts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  const ITEMS_PER_PAGE = 5;

  const fetchPayouts = async () => {
    try {
      setIsLoading(true);
      const activeRentStatuses = await fetchRentStatusEvents();
      const eligibleStatuses = [];

      let contract = getRentContract();

      // Loop through the active rent statuses to check eligibility
      for (const rentStatus of activeRentStatuses) {
        const { _propertyId } = rentStatus;
        const isEligible = await contract.isEligibleForRent(
          _propertyId,
          connectedAddress
        );
        if (isEligible) {
          eligibleStatuses.push(rentStatus);
        }
      }
      contract = getRwaContract();
      // Now, get property details for each eligible property
      const propertyDetailsPromises = eligibleStatuses.map(
        async (rentStatus) => {
          const { _propertyId } = rentStatus;
          const propertyDetails = await getPropertyDetails(_propertyId);

          // Extract necessary details from the returned property object
          const { pricePerShare, totalOwners, totalShares, metadata } =
            propertyDetails;

          let userBalance = await contract.balanceOf(
            connectedAddress,
            _propertyId
          );

          userBalance = Number(userBalance._hex);
          let totalPrice = pricePerShare * totalShares;

          let payout = (
            (Number(getEthFrom(rentStatus._monthRent)) / totalShares) *
            userBalance
          ).toString();

          return {
            propertyId: _propertyId,
            name: metadata.name,
            image: metadata.image,
            totalPrice,
            payout: Number(payout).toFixed(2),
            totalOwners,
            totalShares,
            userBalance,
            time: rentStatus.blockTimestamp,
            status: rentStatus._status,
          };
        }
      );

      // Wait for all property details to be fetched
      const propertyDetailsArray = await Promise.all(propertyDetailsPromises);

      // Now set the state with the extracted details
      setActiveRents(propertyDetailsArray);
    } catch (err) {
      console.log(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getPastPayouts = async (address) => {
    try {
      setPastPayoutLoading(true);
      const data = await fetchRentWithdrawnEvents(address);
      setTotalPages(Math.ceil(data.length / ITEMS_PER_PAGE));
      setPastPayouts(data);
    } catch (err) {
      console.log(err);
    } finally {
      setPastPayoutLoading(false);
    }
  };

  useEffect(() => {
    if (connectedAddress) {
      fetchPayouts();
      getPastPayouts(connectedAddress);
    } else {
      setIsLoading(false);
      setPastPayoutLoading(false);
    }
  }, [connectedAddress]);

  const headers = [
    "Property Name",
    "Date",
    "Price",
    "Shares Owned",
    "Payout",
    "Status",
    "Choose how to Claim your Rent",
  ];

  return (
    <div className="w-full">
      <div className="pb-2.5 pt-6 flex flex-col gap-6 xl:pb-1">
        <div className="flex items-center justify-between gap-5">
          <div className="flex gap-2 flex-col justify-between w-full">
            <div className="flex items-center gap-2 justify-between">
              <h4 className="text-title-lg font-bold text-black ">Payouts</h4>
              <OffRamp />
            </div>
          </div>
        </div>
        <div className="shadow-2 rounded-lg pb-4">
          <PaginatedTable
            getPastPayouts={getPastPayouts}
            fetchPayouts={fetchPayouts}
            isLoading={isLoading}
            showNumbers={false}
            columns={headers}
            rows={activeRents}
          />
        </div>
      </div>
      <PastPayouts
        pastPayouts={pastPayouts}
        isPastPayoutLoading={isPastPayoutLoading}
        ITEMS_PER_PAGE={ITEMS_PER_PAGE}
        totalPages={totalPages}
      />
    </div>
  );
};

export default Payout;
