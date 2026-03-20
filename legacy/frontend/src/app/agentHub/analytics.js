"use client";
import { formatNumber } from "@/context/helper";
import React, { useState, useEffect } from "react";

// Helper function to get the timestamp for yesterday's end time (midnight of yesterday)
const getYesterdayEndTimestamp = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1); // Subtract one day
  yesterday.setHours(23, 59, 59, 999); // Set time to 23:59:59 (end of yesterday)
  return Math.floor(yesterday.getTime() / 1000); // Convert to UNIX timestamp (seconds)
};

// Helper function to filter data by timestamp
const filterDataByDate = (data) => {
  const endTimestamp = getYesterdayEndTimestamp(); // End of yesterday
  return data.filter((item) => item.timestamp <= endTimestamp); // Filter until the end of yesterday
};

// Helper function to calculate percentage change
const getPercentageChange = (current, previous) => {
  if (previous === 0) return 0;
  return (((current - previous) / previous) * 100).toFixed(2);
};

const Card = ({ data }) => {
  const { p, h2, span } = data;
  return (
    <div className="p-6 shadow border rounded-xl flex flex-col gap-2">
      <p className="text-[#0C0839] opacity-80 font-medium text-lg 2xl:text-xl">
        {p}
      </p>
      <div className="flex items-center gap-3">
        <h2 className="text-3xl font-bold 2xl:text-4xl">{h2}</h2>
        <span
          className={`px-4 py-1.5 rounded-full font-medium 2xl:text-base ${
            span[0] === "-" // Check if the percentage starts with a minus sign
              ? "text-[#F06565] bg-[#FDF7F7]" // Red color for negative change
              : "text-[#27AE60] bg-[#27AE601A]" // Green color for positive change
          }`}
        >
          {span}
        </span>
      </div>
    </div>
  );
};

// Skeleton Card component
const SkeletonCard = () => (
  <div className="p-6 shadow border rounded-xl flex flex-col gap-2 animate-pulse">
    <div className="w-1/2 h-5 bg-gray-300 rounded-md mb-4"></div>
    <div className="flex items-center gap-3">
      <div className="w-24 h-8 bg-gray-300 rounded-md"></div>
      <div className="w-16 h-6 bg-gray-300 rounded-md"></div>
    </div>
  </div>
);

const Analytics = ({ data, totalAllTime, loading }) => {
  const [loadingInner, setLoadingInner] = useState(true);
  const [previousData, setPreviousData] = useState({
    totalRevenue: 0,
    totalSharesSold: 0,
    transactions: 0,
    properties: 0,
    profitGenerated: 0,
  });
  const [currentData, setCurrentData] = useState({
    totalRevenue: 0,
    totalSharesSold: 0,
    transactions: 0,
    properties: 0,
    profitGenerated: 0,
  });

  useEffect(() => {
    setLoadingInner(true);
    if (data.length > 0) {
      // Filter the data up to the end of yesterday (midnight of yesterday)
      const filteredData = filterDataByDate(data);

      // Calculate previous and current totals
      const totalRevenue = filteredData.reduce(
        (acc, curr) => acc + curr._investment,
        0
      );
      const transactions = filteredData.length;
      const properties = new Set(filteredData.map((item) => item._propertyId))
        .size;
      const profitGenerated = filteredData.reduce(
        (acc, curr) => acc + curr._commission,
        0
      );

      // Set data for previous period (all records up to yesterday)
      setPreviousData({
        totalRevenue,
        transactions,
        properties,
        profitGenerated,
      });

      setCurrentData(totalAllTime);
    }
    setLoadingInner(false); // Set loading to false once data is processed
  }, [data, totalAllTime]);

  // If loading is true, show skeleton loaders
  if (loading || loadingInner) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  // Ensure previousData and currentData are set before calculating
  // if (!previousData || !currentData) {
  //   return null; // You can add a loading state here if needed
  // }

  const totalRevenueChange = getPercentageChange(
    currentData.totalRevenue,
    previousData.totalRevenue
  );

  const transactionsChange = getPercentageChange(
    currentData.transactions,
    previousData.transactions
  );
  const propertiesChange = getPercentageChange(
    currentData.properties,
    previousData.properties
  );
  const profitGeneratedChange = getPercentageChange(
    currentData.profitGenerated,
    previousData.profitGenerated
  );

  const cardsData = [
    {
      p: "Total Revenue",
      h2: `$${formatNumber(currentData.totalRevenue)}`,
      span: `${totalRevenueChange}%`,
    },
    {
      p: "Transactions",
      h2: currentData.transactions.toLocaleString(),
      span: `${transactionsChange}%`,
    },
    {
      p: "Properties",
      h2: currentData.properties.toLocaleString(),
      span: `${propertiesChange}%`,
    },
    {
      p: "Profit Generated",
      h2: `$${formatNumber(currentData.profitGenerated)}`,
      span: `${profitGeneratedChange}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
      {cardsData.map((data, index) => (
        <Card key={index} data={data} />
      ))}
    </div>
  );
};

export default Analytics;
