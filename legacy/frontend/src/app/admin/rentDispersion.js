"use client";

import { useEffect, useState } from "react";

import ShowPagination from "@/utils/showPagination";
import { Skeleton } from "../payouts/payoutRow";
import { ConsoleSqlOutlined, EditFilled } from "@ant-design/icons";
import EditWalletModal from "./editWalletModal";
import { MdOutlineOpenInNew } from "react-icons/md";
import {
  getErrorMessage,
  getEthFrom,
  getWeiFrom,
  NotifyError,
  NotifySuccess,
  shortenWalletAddress,
} from "@/context/helper";
import { BACKEND_BASEURL, BASEURL, CONTRACT_CONFIG } from "@/config";
import axios from "axios";
import { useNfstayContext } from "@/context/NfstayContext";
import { getStatusColor } from "./ordersTable";

const RentDispersion = ({}) => {
  const { getRentContract, balanceChecker, connectedAddress } =
    useNfstayContext();

  const [isLoadingAdd, setIsLoadingAdd] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoadingRemove, setIsLoadingRemove] = useState(false);
  const [amount, setAmount] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const addPropertyRent = async (_propertyId, _amount) => {
    try {
      setIsLoadingAdd(true);
      if (!_amount || !_propertyId) {
        throw new Error("Amount and Property ID Must be Filled");
      }
      // await balanceChecker(connectedAddress, _amount, CONTRACT_CONFIG.USDC);
      _amount = getWeiFrom(_amount);
      const contract = getRentContract(true);
      await contract.callStatic.addRent(_propertyId, _amount);
      const tx = await contract.addRent(_propertyId, _amount);
      await tx.wait();

      NotifySuccess("Rent Added!");
      setAmount("");
      setPropertyId("");
    } catch (error) {
      console.log(error);
      const _msg = getErrorMessage(error);
      NotifyError(_msg);
    } finally {
      setIsLoadingAdd(false);
    }
  };

  const resetProperty = async (_propertyId) => {
    try {
      setIsLoadingRemove(true);
      if (!_propertyId) {
        throw new Error("Property ID Must be Filled");
      }
      const contract = getRentContract(true);
      await contract.callStatic.resetPropertyDetails(_propertyId);
      const tx = await contract.resetPropertyDetails(_propertyId);
      await tx.wait();

      NotifySuccess("Property Reset Done!");
      setAmount("");
      setPropertyId("");
    } catch (error) {
      const _msg = getErrorMessage(error);
      NotifyError(_msg);
    } finally {
      setIsLoadingRemove(false);
    }
  };

  const handlePropertyId = async (id) => {
    try {
      setIsAdded(false);
      setIsFetching(true);
      setPropertyId(id);
      const contract = getRentContract();
      if (id) {
        const isRentAdded = await contract.getRentDetails(`${id}`);

        if (Number(getEthFrom(isRentAdded._rentRemaining)) > 0)
          setIsAdded(true);
      }

    } catch (err) {
      console.log(err);
    } finally {
      setIsFetching(false);
    }
  };
  return (
    <div className="flex gap-5 flex-col justify-between ">
      <h4 className="text-title-lg font-bold text-black ">Disperse Rent</h4>
      <label>Property ID</label>
      <input
        disabled={isLoadingAdd || isFetching}
        type="text"
        placeholder="0"
        value={propertyId}
        onChange={(e) => handlePropertyId(e.target.value)}
        className="w-full max-w-md p-2 border rounded-lg"
      />
      <label>Amount</label>

      <input
        disabled={isLoadingAdd || isAdded || isFetching}
        type="number"
        placeholder="1000"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full max-w-md p-2 border rounded-lgF"
      />

      <button
        type="button"
        onClick={() => addPropertyRent(propertyId, amount)}
        disabled={
          isAdded ||
          isFetching ||
          isLoadingAdd ||
          isLoadingRemove ||
          propertyId == ""
        }
        className="btn_primary_gradient  disabled:cursor-not-allowed disabled:opacity-55 w-full max-w-[15rem] text-white whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center"
      >
        {isLoadingAdd ? (
          <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          "Add Rent"
        )}
      </button>
      <button
        type="button"
        onClick={() => resetProperty(propertyId)}
        disabled={!isAdded || isFetching || isLoadingAdd || isLoadingRemove}
        className="btn_primary_gradient  disabled:cursor-not-allowed disabled:opacity-55 w-full max-w-[15rem] text-white whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center"
      >
        {isLoadingRemove ? (
          <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          "Reset Property"
        )}
      </button>
    </div>
  );
};

export default RentDispersion;
