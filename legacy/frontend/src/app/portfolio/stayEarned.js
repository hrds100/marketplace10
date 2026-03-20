import { useEffect, useState } from "react";
import stay from "../images/stay.png";
import Image from "next/image";
import { useNfstayContext } from "@/context/NfstayContext";
import {
  formatNumber,
  getErrorMessage,
  NotifyError,
  NotifySuccess,
} from "@/context/helper";

const StayEarned = ({ setRewards, rewards, fetchBoost, property }) => {
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

  return (
    <div className="w-full space-y-5 max-w-sm mx-auto bg-white shadow-lg rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h5 className="font-bold text-xl lg:text-2xl">Stay Earned</h5>
        <Image
          src={stay}
          width={32}
          height={32}
          className=""
          alt="Stay Earned"
        />
      </div>
      <div className="bg-[#f1f4f9] px-4 py-3 rounded-md text-lg font-semibold text-gray-800">
        {fetchBoost ? (
          <div className="skeleton-loader w-20 h-4 bg-gray-300 rounded-md"></div> // Skeleton loader
        ) : (
          <>{formatNumber(Number(rewards))} STAY</>
        )}
      </div>

      {/* Claim Button */}
      <button
        disabled={isClaimLoading}
        onClick={() => claimRewards(property.id)}
        className="w-full bg-[#9945FF] hover:bg-[#8736ea] disabled:cursor-not-allowed disabled:opacity-60 text-white py-2 rounded-full font-medium text-lg transition duration-300 relative min-h-[48px]"
      >
        {isClaimLoading ? (
          <div className="flex justify-center items-center">
            <div className="w-5 h-5 border-4 border-t-4 border-t-[#3d4a6c] rounded-full animate-spin"></div>
          </div>
        ) : (
          "Claim"
        )}
      </button>

      {/* Description Text */}
      <p className="text-sm text-gray-600">
        All STAY tokens claimed and reinvested will automatically be converted
        into LP Tokens and sent to the FARM.
      </p>
    </div>
  );
};

export default StayEarned;
