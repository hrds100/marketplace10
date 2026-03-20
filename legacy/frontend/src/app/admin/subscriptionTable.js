"use client";

import { useEffect, useState } from "react";

import ShowPagination from "@/utils/showPagination";
import { Skeleton } from "../payouts/payoutRow";
import { EditFilled } from "@ant-design/icons";
import EditWalletModal from "./editWalletModal";
import { MdOutlineOpenInNew } from "react-icons/md";
import {
  NotifyError,
  NotifySuccess,
  shortenWalletAddress,
} from "@/context/helper";
import { BACKEND_BASEURL } from "@/config";
import axios from "axios";
import { useNfstayContext } from "@/context/NfstayContext";
import { getStatusColor } from "./ordersTable";

const SubscriptionsTable = ({
  getSubscriptions,
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
      <h4 className="text-title-lg font-bold text-black ">Subscriptions</h4>

      <>
        <div className="overflow-x-auto">
          <table className="w-full shrink-0 whitespace-nowrap 2xl:text-lg">
            <thead>
              <tr className="text-sm text-[#0C0839] opacity-40">
                <th className="text-left p-4">SNo.</th>
                <th className="text-left p-4">Subscription Id</th>
                <th className="text-left p-4">Wallet Address</th>
                <th className="text-left p-4">Subscription Name</th>
                <th className="text-left p-4">Subscription expiry</th>
                <th className="text-left p-4">Renewal Price</th>
                <th className="text-left p-4">TxHash</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SubscriptionRow loading={isLoading} />
              ) : data?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-4 text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                paginatedData.map((subscription, index) => (
                  <SubscriptionRow
                    getSubscriptions={getSubscriptions}
                    key={index}
                    subscription={subscription}
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

export default SubscriptionsTable;

export const TxHash = ({ txHash }) => {
  return (
    <a
      href={`https://bscscan.com/tx/${txHash}`}
      target="_blank"
      className="text-blue-400 hover:underline underline-offset-1 flex items-center gap-1"
    >
      {shortenWalletAddress(txHash)}
      <MdOutlineOpenInNew />
    </a>
  );
};

const SubscriptionRow = ({ getSubscriptions, subscription, loading }) => {
  const { signMessage } = useNfstayContext();
  const [isSubLoading, setSubLoading] = useState(false);
  const [info, setInfo] = useState({
    id: 0,
    subscriptionId: 0,
    walletAddress: 0,
    end_date: "",
    renewalPrice: 0,
    TxHash: "",
    status: "",
    name: "",
  });

  const completeSubscriptionOrder = async (subscriptionId) => {
    try {
      setSubLoading(true);
      const { message, signature } = await signMessage();
      const response = await axios.post(
        `${BACKEND_BASEURL}/admin/complete-subscription-order`,
        {
          subscriptionId,
          message, // Include the message in the request body
          signature,
        }
      );
      NotifySuccess(response.data.message); // Display success message
    } catch (error) {
      console.log(error);
      NotifyError(error.response ? error.response.data.message : error.message);
    } finally {
      setSubLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000); // Convert timestamp to milliseconds

    // Extract year, month, and day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed, so add 1
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    // Fetch the subscription details on mount
    const fetchSubscriptionDetails = async () => {
      try {
        setInfo({
          id: subscription?.id,
          walletAddress: subscription?.walletAddress,
          end_date: subscription?.subscriptionEndTime,
          renewalPrice: subscription?.renewalPrice,
          TxHash: subscription?.txHash,
          status: subscription?.sharesStatus,
          name: subscription?.subscriptionName,
          subscriptionId: subscription?.subscriptionId,
        });
      } catch (error) {
        console.error("Error fetching subscription details:", error);
      }
    };

    fetchSubscriptionDetails();
  }, [subscription]);

  return (
    <tr
      key={subscription?.id}
      className="text-[#0C0839] font-medium border-b-2"
    >
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.id}
      </td>
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.subscriptionId}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-32" h="h-6" />
        ) : (
          shortenWalletAddress(info.walletAddress)
        )}
      </td>
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-32" h="h-6" /> : info?.name.toLocaleString()}
      </td>
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : formatDate(info.end_date)}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-24" h="h-6" />
        ) : (
          info.renewalPrice.toLocaleString()
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
              onClick={() => completeSubscriptionOrder(info?.subscriptionId)}
              disabled={info.status !== "pending" || isSubLoading}
              className="border-2 border-green-400 font-bold py-2 px-4 rounded disabled:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center min-w-24 h-9" // Using minimum width
            >
              {isSubLoading ? (
                <div className="flex justify-center items-center w-full">
                  <div className="w-5 h-5 border-4 border-t-4 border-t-[#3d4a6c] rounded-full animate-spin"></div>
                </div>
              ) : (
                "Confirm"
              )}
            </button>
            <EditWalletModal
              refetchData={getSubscriptions}
              isSubLoading={isSubLoading}
              record={info}
            />
          </>
        )}
      </td>
    </tr>
  );
};
