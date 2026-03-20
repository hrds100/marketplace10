"use client";

import { useEffect, useState } from "react";

import ShowPagination from "@/utils/showPagination";
import { Skeleton } from "../payouts/payoutRow";
import { EditFilled } from "@ant-design/icons";
import EditWalletModal from "./editWalletModal";
import {
  NotifyError,
  NotifySuccess,
  shortenWalletAddress,
} from "@/context/helper";
import { BACKEND_BASEURL } from "@/config";
import axios from "axios";
import { ethers } from "ethers";
import { useNfstayContext } from "@/context/NfstayContext";
import { TxHash } from "./subscriptionTable";
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

const OrdersTable = ({
  getOrderData,
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
      <h4 className="text-title-lg font-bold text-black ">Orders</h4>

      <>
        <div className="overflow-x-auto">
          <table className="w-full shrink-0 whitespace-nowrap 2xl:text-lg">
            <thead>
              <tr className="text-sm text-[#0C0839] opacity-40">
                <th className="text-left p-4">SNo.</th>
                <th className="text-left p-4">Order Id</th>
                <th className="text-left p-4">Property Id</th>
                <th className="text-left p-4">Wallet Address</th>
                <th className="text-left p-4">Agent Address</th>
                <th className="text-left p-4">Amount_Paid</th>
                <th className="text-left p-4">Shares_requested</th>

                <th className="text-left p-4">TxHash</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <PayoutRow loading={isLoading} />
              ) : data?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-4 text-gray-500">
                    No payouts found
                  </td>
                </tr>
              ) : (
                paginatedData.map((order, index) => (
                  <PayoutRow
                    getOrderData={getOrderData}
                    key={index}
                    order={order}
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

export default OrdersTable;

export const getStatusColor = (status) => {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return "text-yellow-500";
    case "COMPLETED":
    case "PAID":
      return "text-green-500";
    case "REFUNDED":
      return "text-red-500";
    case "DUE":
      return "text-orange-500";
    default:
      return "text-gray-500";
  }
};

const PayoutRow = ({ getOrderData, order, loading }) => {
  const { signMessage } = useNfstayContext();
  const [info, setInfo] = useState({
    id: 0,
    orderId: 0,
    propertyId: 0,
    walletAddress: "",
    agentAddress: "",
    amount_paid: 0,
    shares_requested: 0,
    TxHash: "",
    status: "",
  });

  const [isCompleteLoading, setCompleteLoading] = useState(false);

  // Function to complete the order
  const completeOrder = async (orderId) => {
    try {
      setCompleteLoading(true);
      // Get the signed message and signature
      const { message, signature } = await signMessage();

      // Make the POST request with the signed message and signature in the body
      const response = await axios.post(
        `${BACKEND_BASEURL}/admin/complete-order`,
        {
          orderId,
          message, // Include the message in the request body
          signature, // Include the signature in the request body
        }
      );

      NotifySuccess(response.data.message);
      await getOrderData();
    } catch (error) {
      NotifyError(error.response ? error.response.data.message : error.message);
    } finally {
      setCompleteLoading(false);
    }
  };

  useEffect(() => {
    // Fetch the order details on mount
    const fetchOrderDetails = async () => {
      try {
        setInfo({
          id: order?.id,
          orderId: order?.orderId,
          propertyId: order?.propertyId,
          walletAddress: order?.walletAddress,
          agentAddress: order?.agentAddress,
          amount_paid: order?.amount_paid,
          shares_requested: order?.shares_requested,
          TxHash: order?.txHash,
          status: order?.status,
        });
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    };

    fetchOrderDetails();
  }, [order]);

  return (
    <tr key={order?.id} className="text-[#0C0839] font-medium border-b-2">
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.id}
      </td>

      <td className="text-left p-4">
        {loading ? <Skeleton w="w-32" h="h-6" /> : info.orderId}
      </td>
       <td className="text-left p-4">
        {loading ? <Skeleton w="w-32" h="h-6" /> : info.propertyId}
      </td>
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
          shortenWalletAddress(info.agentAddress)
        )}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-32" h="h-6" />
        ) : (
          info.amount_paid.toLocaleString()
        )}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-24" h="h-6" />
        ) : (
          info.shares_requested.toLocaleString()
        )}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-24" h="h-6" />
        ) : !info.TxHash ? (
          "Not Found"
        ) : (
          <TxHash txHash={info.TxHash} />
        )}
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
              onClick={() => {
                completeOrder(info.orderId);
              }}
              disabled={info.status !== "pending" || isCompleteLoading}
              className="border-2 border-green-400 font-bold py-2 px-4 rounded disabled:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center min-w-24 h-9" // Using minimum width
            >
              {isCompleteLoading ? (
                <div className="flex justify-center items-center w-full">
                  <div className="w-5 h-5 border-4 border-t-4 border-t-[#3d4a6c] rounded-full animate-spin"></div>
                </div>
              ) : (
                "Confirm"
              )}
            </button>

            {info.status == "pending" && (
              <EditWalletModal
                refetchData={getOrderData}
                isCompleteLoading={isCompleteLoading}
                record={info}
              />
            )}
          </>
        )}
      </td>
    </tr>
  );
};
