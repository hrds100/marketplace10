"use client";
import Analytics from "./analytics";
import Properties from "./properties";
import RecentTransaction from "./recentTransaction";
import Revenue from "./revenue";
import { useEffect, useState } from "react";
import { usenfstayContext } from "@/context/nfstayContext";
import {
  fetchCommissionEvents,
  fetchPerformanceFeeDistributionsByAddress,
  fetchReferralAddedEvents,
} from "@/context/subgraphHelper";
import AgentPerformanceFee from "./agentPerformanceFee";

const Agent = () => {
  const { getRwaContract, connectedAddress } = usenfstayContext();
  const [agentData, setAgentData] = useState([]);
  const [agentPerformanceHistory, setAgentPerformanceHistory] = useState([]);
  const [totalProperties, setTotalProperties] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);

  const [totalAllTime, setTotalAllTime] = useState({
    totalRevenue: 0,
    totalSharesSold: 0,
    transactions: 0,
    properties: 0,
    profitGenerated: 0,
  });
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const getTotalProperties = async () => {
    try {
      const contract = getRwaContract();
      const _totalProperties = await contract.totalProperties();
      setTotalProperties(Number(_totalProperties));
    } catch (err) {
      console.log(err);
    }
  };

  const getAgentData = async (address) => {
    try {
      const _agentData = await fetchCommissionEvents(address);
      const _totalClients = await fetchReferralAddedEvents(address);
      setAgentData(_agentData);

      setTotalAllTime({
        totalRevenue: _agentData.reduce(
          (acc, curr) => acc + curr._investment,
          0
        ),
        totalSharesSold: _agentData.reduce(
          (acc, curr) => acc + curr._sharesSold,
          0
        ),
        transactions: _agentData.length,
        properties: new Set(_agentData.map((item) => item._propertyId)).size,
        profitGenerated: _agentData.reduce(
          (acc, curr) => acc + curr._commission,
          0
        ),
      });
      setTotalClients(_totalClients);
    } catch (err) {
      console.log(err);
    }
  };

  const getAgentPerformanceHistory = async (address) => {
    try {
      const _agentData = await fetchPerformanceFeeDistributionsByAddress(
        address
      );
      setAgentPerformanceHistory(_agentData);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (connectedAddress) {
      (async () => {
        setLoading(true);
        await getTotalProperties();
        await getAgentData(connectedAddress);
        await getAgentPerformanceHistory(connectedAddress)

        setLoading(false);
      })();
    } else {
      setLoading(false);
    }
  }, [connectedAddress]);

  // Calculate the percentage of circle to be filled
  const fillPercentage = totalProperties
    ? (totalAllTime.properties / totalProperties) * 100
    : 0;

  // Set up the radius for the donut chart
  const radius = 16;
  const circumference = 2 * Math.PI * radius; // Circumference of the outer circle
  const offset = circumference - (fillPercentage / 100) * circumference;

  return (
    <div className="w-full">
      <div className="pb-2.5 flex flex-col gap-6 xl:pb-1">
        <div className="flex items-center justify-between gap-5">
          <div className="flex gap-2 flex-col justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
                Agent&apos;s Hub
              </h4>
            </div>

            <p className="opacity-80 text-[#0C0839] 2xl:text-lg">
              Keep track of all your commissions
            </p>
          </div>
        </div>
        <Analytics
          data={agentData}
          totalAllTime={totalAllTime}
          loading={loading}
        />

        <div className="grid grid-cols-1 md:grid-cols-[23.5%_74.5%] gap-5">
          <div className="flex flex-col gap-5 p-5 rounded-lg shadow border ">
            <div className="flex flex-col gap-2">
              <h3 className="font-bold text-xl 2xl:text-3xl">
                Your Properties
              </h3>
              <p className="opacity-80 text-lg">Total Properties available</p>
            </div>

            <div className="relative size-40 self-center">
              {/* Donut chart */}

              <svg
                className="size-full -rotate-90"
                viewBox="0 0 36 36"
                xmlns="http://www.w3.org/2000/svg"
                onMouseEnter={() => setTooltipVisible(true)}
                onMouseLeave={() => setTooltipVisible(false)}
              >
                {/* Background circle (unfilled part) */}
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="none"
                  className="stroke-current text-[#944afc33]"
                  strokeWidth="4"
                ></circle>

                {/* Foreground circle (filled part) */}
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="none"
                  className="stroke-current text-[#954AFC] transition-all"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                ></circle>
              </svg>

              {/* Tooltip (positioned outside the circle) */}
              {tooltipVisible && !loading && (
                <div className="absolute top-[-40px] left-1/2 transform -translate-x-1/2 z-[5] bg-black text-white text-sm rounded px-2 py-1 text-center">
                  Your Properties: {totalAllTime.properties}
                </div>
              )}

              {/* Text inside the donut chart */}

              <div className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 z-[1]">
                <div className="flex flex-col text-center items-center justify-center gap-3">
                  {loading ? (
                    <div className="w-20 h-8 bg-gray-300 animate-pulse rounded-full"></div> // Skeleton loader for the total properties value
                  ) : (
                    <h1 className="text-4xl font-bold">{totalProperties}</h1>
                  )}

                  <p className="opacity-80 2xl:text-base">
                    Properties available
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Revenue
            data={agentData}
            totalRevenue={totalAllTime.totalRevenue}
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[43%_55%] gap-5 w-full">
          <Properties
            totalClients={totalClients}
            data={totalAllTime}
            loading={loading}
          />
          <RecentTransaction data={agentData} loading={loading} />
        <AgentPerformanceFee data={agentPerformanceHistory} loading={loading} />  
        </div>
      </div>
    </div>
  );
};

export default Agent;
