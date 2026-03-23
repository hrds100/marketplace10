"use client";
import { useEffect, useState } from "react";
import OrdersTable from "./ordersTable";
import RewardTable from "./rewardTable";
import axios from "axios";
import {
  MANAGER_WALLET,
  ADMIN_WALLET,
  BACKEND_BASEURL,
  CONTRACT_CONFIG,
  TREASURY_WALLET,
} from "@/config";
import SubscriptionsTable from "./subscriptionTable";
import AdminPanel from "./adminPanel";
import Notifications from "./notifications";
import BoostAnyone from "./boostAnyone";
import RentDispersion from "./rentDispersion";
import { ethers } from "ethers";
import { usenfstayContext } from "@/context/nfstayContext";
import { getEthFrom } from "@/context/helper";
import CommissionsTable from "./commissionsTable";
import { ConsoleSqlOutlined } from "@ant-design/icons";
import {
  fetchCommissionEventsForPerformanceFees,
  fetchPerformanceFeeDistributions,
} from "@/context/subgraphHelper";
import CommissionsHistoryTable from "./commissionsHistoryTable";

const Admin = () => {
  const ITEMS_PER_PAGE = 5;
  const { getERC20Contract } = usenfstayContext();
  const [orderData, setOrderData] = useState([]);
  const [totalPagesRewards, setTotalPagesRewards] = useState(0);
  const [totalPagesSubs, setTotalPagesSubs] = useState(0);
  const [totalPagesComms, setTotalPagesComms] = useState(0);
  const [totalPagesOrders, setTotalPagesOrders] = useState(0);
  const [rewardsData, setRewardsData] = useState([]);
  const [subscriptionData, setSubscriptionData] = useState([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [isRewardLoading, setIsRewardLoading] = useState(true);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [bnbBalance, setBnbBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [stayBalance, setStayBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [commissionData, setCommissionData] = useState([]);
  const [commissionHistory, setCommissionHistory] = useState([]);

  const [commissionEventsLoading, setIsCommissionEventsLoading] =
    useState(false);

  const [isCommissionHistoryLoading, setIsCommissionHistoryLoading] =
    useState(false);

  const getOrderData = async () => {
    setIsOrdersLoading(true);
    try {
      const response = await axios.get(`${BACKEND_BASEURL}/admin/get-orders`);

      const sortedOrders = response.data.data
        .slice() // clone the array to avoid mutating original
        .reverse() // now newer orders come first
        .sort((a, b) => {
          if (a.status === "pending" && b.status !== "pending") {
            return -1;
          } else if (a.status !== "pending" && b.status === "pending") {
            return 1;
          }
          return 0; // keep the new-first order within same status
        });

      const ordersWithId = sortedOrders.map((order, index) => ({
        ...order,
        id: index + 1,
      }));
      setOrderData(ordersWithId);
      setTotalPagesOrders(Math.ceil(ordersWithId.length / ITEMS_PER_PAGE));
    } catch (error) {
      console.error("Error fetching orders:", error.message);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  // const getRewardData = async () => {
  //   setIsRewardLoading(true);
  //   try {
  //     const response = await axios.get(`${BACKEND_BASEURL}/admin/get-rewards`);

  //     const sortedRewards = response.data.sort((a, b) => {
  //       if (
  //         a.status.toLowerCase() === "due" &&
  //         b.status.toLowerCase() !== "due"
  //       ) {
  //         return -1; // 'a' (due) comes before 'b' (not due)
  //       } else if (
  //         a.status.toLowerCase() !== "due" &&
  //         b.status.toLowerCase() === "due"
  //       ) {
  //         return 1; // 'b' (due) comes before 'a' (not due)
  //       }
  //       return 0; // No change if both have the same status
  //     });

  //     const rewardsWithId = sortedRewards.map((reward, index) => ({
  //       ...reward, // Spread the existing reward object
  //       id: index + 1, // Add an `id` field (starting from 1)
  //     }));

  //     setRewardsData(rewardsWithId); // Set the updated data in state
  //     setTotalPagesRewards(Math.ceil(rewardsWithId?.length / ITEMS_PER_PAGE));
  //   } catch (error) {
  //     console.error("Error fetching rewards:", error.message);
  //   } finally {
  //     setIsRewardLoading(false);
  //   }
  // };

  // const getSubscriptions = async () => {
  //   setIsSubscriptionLoading(true);
  //   try {
  //     const response = await axios.get(
  //       `${BACKEND_BASEURL}/admin/get-subscriptions`
  //     );

  //     const sortedSubscriptions = response.data.data.sort((a, b) => {
  //       if (a.sharesStatus === "pending" && b.sharesStatus !== "pending") {
  //         return -1; // 'a' (pending) comes before 'b' (non-pending)
  //       } else if (
  //         a.sharesStatus !== "pending" &&
  //         b.sharesStatus === "pending"
  //       ) {
  //         return 1; // 'b' (pending) comes before 'a' (non-pending)
  //       }
  //       return 0; // No change if both have the same status or both are non-active
  //     });

  //     const subscriptionsWithId = sortedSubscriptions.map((sub, index) => ({
  //       ...sub,
  //       id: index + 1, // Assigning an `id` field starting from 1
  //     }));

  //     setSubscriptionData(subscriptionsWithId);

  //     setTotalPagesSubs(Math.ceil(subscriptionsWithId.length / ITEMS_PER_PAGE));
  //   } catch (error) {
  //     console.error(
  //       "Error fetching subscriptions:",
  //       error.response ? error.response.data.message : error.message
  //     );
  //     return null; // or handle the error as needed
  //   } finally {
  //     setIsSubscriptionLoading(false);
  //   }
  // };

  const fetchBalances = async () => {
    try {
      setIsLoadingBalance(true); // Start loading

      const provider = new ethers.providers.JsonRpcProvider(
        CONTRACT_CONFIG.rpc
      );
      const contract = getERC20Contract(CONTRACT_CONFIG.STAY);
      const contractUsdc = getERC20Contract(CONTRACT_CONFIG.USDC);

      const [bnbBalanceRaw, stayBalanceRaw, usdcBalanceRaw] = await Promise.all(
        [
          provider.getBalance(MANAGER_WALLET),
          contract.balanceOf(MANAGER_WALLET),
          contractUsdc.balanceOf(TREASURY_WALLET),
        ]
      );

      // Convert balances
      const bnbBalance = Number(getEthFrom(bnbBalanceRaw)).toFixed(4);
      const stayBalance = Number(
        getEthFrom(stayBalanceRaw).toLocaleString()
      ).toFixed(4);
      const formattedStayBalance = Number(stayBalance).toLocaleString();

      const usdcBalance = Number(
        getEthFrom(usdcBalanceRaw).toLocaleString()
      ).toFixed(4);
      const formattedUsdcBalance = Number(usdcBalance).toLocaleString();

      setUsdcBalance(formattedUsdcBalance);
      setBnbBalance(bnbBalance);
      setStayBalance(formattedStayBalance);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoadingBalance(false); // Stop loading after both requests
    }
  };

  const fetchCommissionData = async (propertyId, year, month) => {
    try {
      setIsCommissionEventsLoading(true);
      const commissionEvents = await fetchCommissionEventsForPerformanceFees(
        propertyId,
        year,
        month
      );
      const commissionsWithId = commissionEvents.map((commission, index) => ({
        ...commission, // Spread the existing reward object
        id: index + 1, // Add an `id` field (starting from 1)
      }));
      setCommissionData(commissionsWithId);
      setTotalPagesComms(Math.ceil(commissionsWithId.length / ITEMS_PER_PAGE));
    } catch (error) {
      console.error("Error fetching commission events:", error);
    } finally {
      setIsCommissionEventsLoading(false); // Stop loading after both requests
    }
  };

  const fetchCommissionHistory = async (year, month) => {
    try {
      setIsCommissionHistoryLoading(true);
      const commissionEvents = await fetchPerformanceFeeDistributions(
        year,
        month
      );

      const commissionsWithId = commissionEvents.map((commission, index) => ({
        ...commission, // Spread the existing reward object
        id: index + 1, // Add an `id` field (starting from 1)
      }));
      setCommissionHistory(commissionsWithId);
      setTotalPagesComms(Math.ceil(commissionsWithId.length / ITEMS_PER_PAGE));
    } catch (error) {
      console.error("Error fetching commission events:", error);
    } finally {
      setIsCommissionHistoryLoading(false); // Stop loading after both requests
    }
  };

  useEffect(() => {
    getOrderData();
    // getRewardData();
    // getSubscriptions();
  }, []);

  return (
    <div className="w-full">
      <div className="pb-2.5 pt-6 flex flex-col gap-6 xl:pb-1">
        <AdminPanel
          fetchBalances={fetchBalances}
          isLoading={isLoadingBalance}
          stayBalance={stayBalance}
          bnbBalance={bnbBalance}
          usdcBalance={usdcBalance}
        />
        <OrdersTable
          data={orderData}
          isLoading={isOrdersLoading}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          totalPages={totalPagesOrders}
          getOrderData={getOrderData}
        />
        {/* <RewardTable
          fetchBalances={fetchBalances}
          data={rewardsData}
          isLoading={isRewardLoading}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          totalPages={totalPagesRewards}
          getRewardData={getRewardData}
        />
        <SubscriptionsTable
          data={subscriptionData}
          isLoading={isSubscriptionLoading}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          totalPages={totalPagesSubs}
          getSubscriptions={getSubscriptions}
        /> */}
        <CommissionsTable
          data={commissionData}
          isLoading={commissionEventsLoading}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          totalPages={totalPagesComms}
          fetchCommissionData={fetchCommissionData}
        />
        <CommissionsHistoryTable
          data={commissionHistory}
          isLoading={isCommissionHistoryLoading}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          totalPages={totalPagesComms}
          fetchCommissionHistory={fetchCommissionHistory}
        />
        <Notifications />
        <BoostAnyone />
        <RentDispersion />
      </div>
    </div>
  );
};

export default Admin;
