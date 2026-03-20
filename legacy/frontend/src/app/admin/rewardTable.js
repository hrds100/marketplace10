"use client";

import { useEffect, useState } from "react";

import ShowPagination from "@/utils/showPagination";
import { Skeleton } from "../payouts/payoutRow";
import {
  NotifyError,
  NotifySuccess,
  shortenWalletAddress,
} from "@/context/helper";
import { useNfstayContext } from "@/context/NfstayContext";
import axios from "axios";
import { BACKEND_BASEURL } from "@/config";
import { ethers } from "ethers";
import { getStatusColor } from "./ordersTable";
const SkeletonLoader = () => {
  return (
    <div className="animate-pulse">
      {/* Past Proposals Section */}
      <div className="mt-10">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead>
              <tr className="text-sm text-[#0C0839] opacity-40">
                <th className="text-left p-4">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </th>
                <th className="text-left p-4">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </th>
                <th className="text-left p-4">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </th>
                <th className="text-left p-4">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </th>
                <th className="text-left p-4">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </th>
                <th className="text-left p-4">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array(5)
                .fill()
                .map((_, index) => (
                  <tr key={index}>
                    <td className="p-4">
                      <div className="h-4 bg-gray-300 rounded w-full"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-300 rounded w-full"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-300 rounded w-full"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-300 rounded w-full"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-300 rounded w-full"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-300 rounded w-full"></div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Skeleton */}
        <div className="flex justify-center mt-4 gap-2">
          {Array(5)
            .fill()
            .map((_, index) => (
              <div
                key={index}
                className="h-8 w-8 bg-gray-300 rounded-full"
              ></div>
            ))}
        </div>
      </div>
    </div>
  );
};

const RewardTable = ({
  fetchBalances,
  getRewardData,
  isLoading,
  data,
  ITEMS_PER_PAGE,
  totalPages,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedData, setPaginatedData] = useState([]);

  // Get the current page's data
  const getPaginatedData = (_currentPage, _data) => {
    const startIndex = (_currentPage - 1) * ITEMS_PER_PAGE;
    setPaginatedData(_data?.slice(startIndex, startIndex + ITEMS_PER_PAGE));
  };

  // Handle page change
  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    if (totalPages > 0) getPaginatedData(currentPage, data);
  }, [totalPages, currentPage, data]);

  return (
    <div className="flex gap-5 flex-col justify-between">
      <h4 className="text-title-lg font-bold text-black ">Rewards</h4>

      <>
        <div className="overflow-x-auto">
          <table className="w-full shrink-0 whitespace-nowrap 2xl:text-lg">
            <thead>
              <tr className="text-sm text-[#0C0839] opacity-40">
                <th className="text-left p-4">SNo.</th>
                {/* <th className="text-left p-4">Reward Id</th> */}
                <th className="text-left p-4">Wallet Address</th>
                <th className="text-left p-4">reward_value</th>
                <th className="text-left p-4">due_date</th>
                <th className="text-left p-4">status</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableRow loading={isLoading} />
              ) : data?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-4 text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                paginatedData.map((data, index) => (
                  <TableRow
                    fetchBalances={fetchBalances}
                    key={index}
                    data={data}
                    getRewardData={getRewardData}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {ShowPagination({
          currentPage: currentPage,
          totalPages: totalPages,
          handlePageChange: changePage,
        })}
      </>
    </div>
  );
};

export default RewardTable;

const TableRow = ({ fetchBalances, data, loading, getRewardData }) => {
  const { signMessage } = useNfstayContext();
  const [isRewardLoading, setRewardLoading] = useState(false);
  const [info, setInfo] = useState({
    id: 0,
    rewardId: 0,
    walletAddress: 0,
    reward_value: 0,
    status: "",
    due_date: "",
  });

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000); // Convert timestamp to milliseconds

    // Extract year, month, and day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed, so add 1
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Function to update reward status
  const updateRewardStatus = async (walletAddress, rewardId) => {
    try {
      setRewardLoading(true);
      // Get the signed message and signature
      const { message, signature } = await signMessage();
      // Make the PATCH request with the signed message and signature in the body
      const response = await axios.patch(
        `${BACKEND_BASEURL}/admin/send-reward`,
        {
          walletAddress: walletAddress.toLowerCase(),
          rewardId,
          message, // Include the message in the request body
          signature, // Include the signature in the request body
        }
      );
      await getRewardData();
      NotifySuccess(response.data.message);
      fetchBalances();
    } catch (error) {
      console.log(error);
      NotifyError(error.response ? error.response.data.message : error.message);
    } finally {
      setRewardLoading(false);
    }
  };

  useEffect(() => {
    // Fetch the data details on mount
    const fetchRewardDetails = async () => {
      try {
        setInfo({
          id: data?.id,
          rewardId: data?.rewardId,
          walletAddress: data?.walletAddress,
          reward_value: data?.rewardValue,
          status: data?.status,
          due_date: data?.rewardTime,
        });
      } catch (error) {
        console.error("Error fetching data details:", error);
      }
    };

    fetchRewardDetails();
  }, [data]); // Re-run if data id changes

  return (
    <tr key={data?.id} className="text-[#0C0839] font-medium border-b-2">
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.id}
      </td>
      {/* <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.rewardId}
      </td> */}

      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-32" h="h-6" />
        ) : (
          shortenWalletAddress(info.walletAddress)
        )}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-32" h="h-6" />
        ) : (
          info.reward_value.toLocaleString()
        )}
      </td>

      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : formatDate(info.due_date)}
      </td>
      <td
        className={`text-left p-4 ${
          loading ? "" : getStatusColor(info?.status)
        }`}
      >
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.status}
      </td>

      <td className="text-left inline-flex gap-2 items-center p-4">
        {loading ? (
          <Skeleton w="w-24" h="h-6" />
        ) : (
          <>
            <button
              onClick={() =>
                updateRewardStatus(info.walletAddress, info.rewardId)
              }
              disabled={info.status !== "due" || isRewardLoading}
              className="border-2 border-green-400 font-bold py-2 px-4 rounded disabled:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center min-w-24 h-9" // Using minimum width
            >
              {isRewardLoading ? (
                <div className="flex justify-center items-center w-full">
                  <div className="w-5 h-5 border-4 border-t-4 border-t-[#3d4a6c] rounded-full animate-spin"></div>
                </div>
              ) : (
                "Confirm"
              )}
            </button>
          </>
        )}
      </td>
    </tr>
  );
};
