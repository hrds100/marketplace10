"use client";
import { useEffect, useState } from "react";
import BoostedCheckout from "./boostedCheckout";
import { useNfstayContext } from "@/context/NfstayContext";
import {
  formatNumber,
  getErrorMessage,
  getEthFrom,
  NotifyError,
  NotifySuccess,
} from "@/context/helper";
import StayEarned from "./stayEarned";

const BoostedCardSkeleton = () => {
  return (
    <div className="border w-full shadow-sm p-4 rounded-lg h-full">
      <div className="flex items-center w-full justify-between">
        <div className="flex w-full flex-col border-b gap-2">
          <div className="w-full flex items-center justify-between ">
            <div className="h-6 bg-gray-200 animate-pulse rounded w-[50%] mb-2"></div>
            <div className="size-6 rounded-full bg-gray-200 animate-pulse shrink-0" />
          </div>
          <div className="h-4 bg-gray-200 animate-pulse rounded w-1/4 mb-4"></div>
        </div>
      </div>
      <div className="flex items-center flex-wrap w-full justify-between gap-6 mt-3 pt-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex flex-1 flex-col gap-1">
            <div className="h-6 bg-gray-200 animate-pulse rounded w-full"></div>
            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
          </div>
        ))}
      </div>
      <div className="flex items-center w-full justify-between gap-5 flex-wrap">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="flex flex-col gap-1 flex-1 mt-3 pt-3">
            <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 animate-pulse rounded w-7/12"></div>
          </div>
        ))}
      </div>
      <div className="flex items-center w-full justify-between mt-4 gap-5 flex-wrap">
        {[...Array(2)].map((_, index) => (
          <div
            key={index}
            className="flex-1 rounded-full h-8 bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
};

const BoostedApr = ({
  isBoostingAmountLoading,
  boostAmount,
  isBoosted,
  property,
  handleOpen,
  rewards,
  setRewards,
  fetchBoost,
}) => {
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const { getBoosterContract, assetPrices, handleNetwork } = useNfstayContext();

  const claimRewards = async (propertyId) => {
    try {
      setIsClaimLoading(true);
      await handleNetwork();

      const contract = getBoosterContract(true);
      await contract.callStatic.claimRewards(propertyId);
      const _claim = await contract.claimRewards(propertyId);

      await _claim.wait();
      setRewards(0);
      NotifySuccess("Rewards Claimed Successfully");
    } catch (err) {
      console.log(err);
      const _msg = getErrorMessage(err);
      NotifyError(_msg);
    } finally {
      setIsClaimLoading(false);
    }
  };
  if (isBoostingAmountLoading) return <BoostedCardSkeleton />;

  if (isBoosted)
    return (
      <StayEarned
        setRewards={setRewards}
        rewards={rewards}
        fetchBoost={fetchBoost}
        property={property}
      />
    );

  return (
    <>
      <div
        className={`flex flex-col p-4 shadow transition-all ${
          !isBoosted ? " border_gradient" : "border"
        } rounded-lg divide-y w-full`}
      >
        <div className="flex items-center w-full justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-bold text-xl 2xl:text-2xl">
              Boosted APR:{" "}
              {(Number(property.apr) + assetPrices?.boostApr).toFixed(2)}%
            </h2>
            <p className="opacity-60 font-medium 2xl:text-lg">
              {isBoosted ? "Boosted" : "Not Boosted"}
            </p>
          </div>
          {!isBoosted && <div className="h-full text-xl 2xl:text-2xl">🚀</div>}
        </div>
        <div className="flex items-center flex-wrap w-full justify-between gap-6 mt-3 pt-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold  2xl:text-2xl">
              $
              {(property.userBalance * property.pricePerShare).toLocaleString()}
            </h3>
            <span className="opacity-60 text-xs font-medium 2xl:text-base">
              Your Shares
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold  2xl:text-2xl">
              {(
                (Number(property.apr) + assetPrices?.boostApr) * 6 +
                30
              ).toFixed(2)}
              %
            </h3>
            <span className="opacity-60 text-xs font-medium 2xl:text-base">
              6YR Expected ROI
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold  2xl:text-2xl">Monthly</h3>
            <span className="opacity-60 text-xs font-medium 2xl:text-base">
              Payout Frequency
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center gap-12 mt-3 pt-3">
          {/* Left side: Cost of Booster */}
          {Number(boostAmount) > 0 && (
            <div className="flex flex-col w-full">
              <span className="opacity-60 text-xs font-medium 2xl:text-base">
                Cost of Booster
              </span>
              <h3 className="text-lg font-bold 2xl:text-2xl">
                {fetchBoost ? (
                  <div className="skeleton-loader w-20 h-4 bg-gray-300 rounded-md"></div> // Skeleton loader
                ) : (
                  `${Number(boostAmount).toLocaleString()} USDC`
                )}
              </h3>
            </div>
          )}

          {/* Right side: Cost of Booster */}
          <div className="flex flex-col gap-1 w-full">
            <span className="opacity-60 text-xs font-medium 2xl:text-base">
              Stay Earned
            </span>
            <h3 className="text-lg font-bold 2xl:text-2xl">
              {fetchBoost ? (
                <div className="skeleton-loader w-20 h-4 bg-gray-300 rounded-md"></div> // Skeleton loader
              ) : (
                <>{formatNumber(Number(rewards))} STAY</>
              )}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-3 border-none justify-between">
          {/* Claim Button */}

          {/* Boost APR Button */}
          <button
            onClick={handleOpen}
            type="button"
            className="btn_primary_gradient disabled:cursor-not-allowed disabled:opacity-60 text-base text-white w-full whitespace-nowrap px-10 py-2.5 rounded-full h-fit font-medium"
            disabled={fetchBoost || isClaimLoading }
          >
            Boost APR 🚀
          </button>

          <button
            onClick={() => claimRewards(property.id)}
            className="disabled:bg-opacity-55  disabled:cursor-not-allowed bg-[#954AFC] text-white border px-4 py-2 rounded-full font-semibold text-sm 2xl:text-lg w-full"
            disabled={isClaimLoading || Number(rewards) === 0 || fetchBoost}
          >
            {isClaimLoading ? (
              <div className="flex justify-center items-center">
                <div className="w-5 h-5 border-4 border-t-4 border-white rounded-full animate-spin"></div>
              </div>
            ) : (
              "Claim"
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default BoostedApr;
