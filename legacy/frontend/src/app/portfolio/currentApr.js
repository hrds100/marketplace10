import { formatNumber } from "@/context/helper";
import { usenfstayContext } from "@/context/nfstayContext";
import { ConsoleSqlOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";

const CurrentApr = ({
  currentPropertyIndex,
  isBoostingAmountLoading,
  isBoosted,
  getBoostAmount,
  property,
  totalProperties,
  handleOpen,
  fetchBoost,
  boostAmount,
}) => {
  const { assetPrices, getBoostdetails, connectedAddress } = usenfstayContext();

  const [isBoostEligible, setIsBoostEligible] = useState(false);
  const [totalBoosted, setTotalBoosted] = useState(0);
  const [totalNotBoosted, setTotalNotBoosted] = useState(0);
  const [isLoading, setLoading] = useState(true);
  const getDetails = async (propertyId) => {
    try {
      const { sharesBoosted, reboostTimeLimit } = await getBoostdetails(
        connectedAddress,
        propertyId
      );

      const boostedShares = Number(sharesBoosted);
      const currentTime = Math.floor(Date.now() / 1000);

      setTotalBoosted(isBoosted ? boostedShares : 0);
   
      if (isBoosted) {
        setTotalNotBoosted(Number(totalProperties) - boostedShares);
      }

      const isEligible =
        totalProperties > boostedShares &&
        Number(reboostTimeLimit) < currentTime;
    
      if (isEligible) {
        getBoostAmount(currentPropertyIndex);
      }

      setIsBoostEligible(isEligible);
    } catch (err) {
      console.error("Failed to get boost details:", err);
    } finally {
     
      setLoading(false);
    }
  };

  useEffect(() => {
   
    if (property?.id && totalProperties) {
      // setLoading(true); // ensure loading is true before fetch starts
      getDetails(property.id);
    }
  }, [totalProperties, isBoosted, property?.id, isBoostEligible]);

  return (
    <div
      className={`flex flex-col p-4 shadow transition-all ${
        isBoosted ? " border_gradient" : "border"
      } rounded-lg divide-y w-full`}
    >
      <div className="flex items-center w-full justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="font-bold text-xl 2xl:text-2xl flex items-center gap-2">
            Current APR:{" "}
            {isBoostingAmountLoading ? (
              // Skeleton Loader for APR Value and %
              <span className="w-16 h-6 bg-gray-300 rounded-md animate-pulse inline-block align-middle"></span>
            ) : (
              <>
                {isBoosted
                  ? (Number(property.apr) + assetPrices?.boostApr).toFixed(2)
                  : Number(property.apr).toFixed(2)}
                %
              </>
            )}
          </h2>

          <p className="opacity-60 font-medium 2xl:text-lg flex items-center gap-2">
            {isBoostingAmountLoading ? (
              // Skeleton Loader for Boosted/Not Boosted Text
              <span className="w-24 h-5 bg-gray-300 rounded-md animate-pulse inline-block align-middle"></span>
            ) : isBoosted ? (
              "Boosted"
            ) : (
              "Not Boosted"
            )}
          </p>
        </div>
        {isBoosted && <div className="h-full text-xl 2xl:text-2xl">🚀</div>}
      </div>
      <div className="flex items-center flex-wrap w-full justify-between gap-6 mt-3 pt-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold 2xl:text-2xl">
            {isBoostingAmountLoading ? (
              <div className="h-6 w-12 bg-gray-300 animate-pulse rounded-md"></div>
            ) : (
              totalBoosted
            )}
          </h3>

          <span className="opacity-60 text-xs font-medium 2xl:text-base">
            Shares Boosted
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold 2xl:text-2xl">
            {isBoostingAmountLoading ? (
              <span className="w-24 h-5 bg-gray-300 rounded-md animate-pulse inline-block align-middle"></span>
            ) : isBoosted ? (
              ((Number(property.apr) + assetPrices?.boostApr) * 6 + 30).toFixed(
                2
              )
            ) : (
              `${Number(property.apr * 6 + 30).toFixed(2)}%`
            )}
          </h3>
          <span className="opacity-60 text-xs font-medium 2xl:text-base">
            6YR Expected ROI
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold 2xl:text-2xl">Monthly</h3>
          <span className="opacity-60 text-xs font-medium 2xl:text-base">
            Payout Frequency
          </span>
        </div>
      </div>
      {isBoosted ? (
        <div className="flex items-center gap-6 mt-3 border-none justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold 2xl:text-2xl">
              {isLoading ? (
                <div className="h-6 w-12 bg-gray-300 animate-pulse rounded-md"></div>
              ) : (
                totalNotBoosted
              )}
            </h3>
            <span className="opacity-60 text-xs font-medium 2xl:text-base">
              Shares Not Boosted
            </span>
          </div>

          {/* Boost APR Button */}
          <div className="flex flex-col gap-1">
             {isLoading || isBoostingAmountLoading ? (
            <div className="h-6 w-12 bg-gray-300 animate-pulse rounded-md"></div>
          ) :
            (<span className="opacity-60 text-xs font-medium 2xl:text-base">
              {`Cost of Booster: ${Number(boostAmount).toLocaleString()} USDC`}
            </span>)}
            <button
              onClick={handleOpen}
              type="button"
              className="btn_primary_gradient disabled:cursor-not-allowed disabled:opacity-60 text-base text-white w-half whitespace-nowrap px-10 py-2.5 rounded-full h-fit font-medium"
              disabled={fetchBoost || !isBoostEligible}
            >
              Boost APR 🚀
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 mt-3 pt-3">
          <span className="opacity-60 text-xs font-medium 2xl:text-base">
            Price of Real Estate
          </span>
          {isLoading || isBoostingAmountLoading ? (
            <div className="h-6 w-12 bg-gray-300 animate-pulse rounded-md"></div>
          ) : (
            <h3 className="text-lg font-bold 2xl:text-2xl">
              {formatNumber(property.pricePerShare * property.totalShares)} USD
            </h3>
          )}
        </div>
      )}
    </div>
  );
};

export default CurrentApr;
