"use client";

import { useEffect, useState } from "react";

import ShowPagination from "@/utils/showPagination";
import { Skeleton } from "../payouts/payoutRow";
import { EditFilled } from "@ant-design/icons";
import EditWalletModal from "./editWalletModal";
import { MdOutlineOpenInNew } from "react-icons/md";
import {
  getErrorMessage,
  NotifyError,
  NotifySuccess,
  shortenWalletAddress,
} from "@/context/helper";
import { BACKEND_BASEURL, BASEURL } from "@/config";
import axios from "axios";
import { useNfstayContext } from "@/context/NfstayContext";
import { getStatusColor } from "./ordersTable";

const BoostAnyone = ({}) => {
  const { signMessage, getBoosterContract } = useNfstayContext();

  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const boostUser = async (_address, _propertyId) => {
    try {
      setIsLoading(true);
      if (!_address || !_propertyId) {
        throw new Error("Address and Property ID Must be Filled");
      }

      const contract = getBoosterContract(true);
      await contract.callStatic.boostOnBehalfOf(_address, _propertyId);
      const tx = await contract.boostOnBehalfOf(_address, _propertyId);
      await tx.wait();

      NotifySuccess("Property Boosted for User!");
      setAddress("");
      setPropertyId("");
    } catch (error) {
      const _msg = getErrorMessage(error);
      NotifyError(_msg);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex gap-5 flex-col justify-between ">
      <h4 className="text-title-lg font-bold text-black ">
        Boost User Property
      </h4>
      <label>Address</label>
      <input
        disabled={isLoading}
        type="text"
        placeholder="0xabcd...."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="w-full max-w-md p-2 border rounded-lg"
      />
      <label>Property ID</label>

      <input
        disabled={isLoading}
        type="number"
        placeholder="0"
        value={propertyId}
        onChange={(e) => setPropertyId(e.target.value)}
        className="w-full max-w-md p-2 border rounded-lgF"
      />

      <button
        type="button"
        onClick={() => boostUser(address, propertyId)}
        disabled={isLoading}
        className="btn_primary_gradient  disabled:cursor-not-allowed disabled:opacity-55 w-full max-w-[15rem] text-white whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          "Boost Now"
        )}
      </button>
    </div>
  );
};

export default BoostAnyone;
