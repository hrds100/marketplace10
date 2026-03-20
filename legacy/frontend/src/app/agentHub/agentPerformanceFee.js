import { shortenWalletAddress } from "@/context/helper";
import React from "react";

const AgentPerformanceFee = ({ data, loading }) => {
  // Format timestamp into a readable date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000); // Convert timestamp to milliseconds

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return monthNames[date.getMonth()];
  };

  // Only show the first 5 transactions
  const displayedTransactions = data.slice(0, 5);

  return (
    <div className="flex flex-col gap-5 rounded-lg shadow border">
      <div className="flex p-5">
        <h1 className="text-lg font-bold 2xl:text-2xl">Performance Fee History</h1>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full shrink-0 whitespace-nowrap 2xl:text-lg">
          <thead className="border-t-2 border-b-2">
            <tr className="text-[#0C0839] opacity-40 font-medium">
              <th className="text-left p-4">Month</th>
              {/* <th className="text-left p-4">Referee</th> */}
              <th className="text-left p-4">Property ID</th>
              <th className="text-left p-4">Amount</th>
              {/* <th className="text-left p-4">Commission</th> */}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton loader for table rows
              <tr className="text-[#0C0839] font-medium">
                <td colSpan="5" className="text-center p-4">
                  <div className="flex flex-col gap-4">
                    <div className="w-full h-6 bg-gray-300 animate-pulse rounded-full"></div>
                    <div className="w-full h-6 bg-gray-300 animate-pulse rounded-full"></div>
                    <div className="w-full h-6 bg-gray-300 animate-pulse rounded-full"></div>
                  </div>
                </td>
              </tr>
            ) : displayedTransactions.length === 0 ? (
              <tr className="text-[#0C0839] font-semibold">
                <td className="text-center p-4" colSpan="5">
                  No transactions yet
                </td>
              </tr>
            ) : (
              displayedTransactions.map((transaction, index) => {
                return (
                  <tr key={index} className="text-[#0C0839] font-medium">
                    <td className="text-left p-4">
                      {formatDate(transaction.monthTimestamp)}
                    </td>
                    {/* <td className="text-center p-4 flex items-center gap-3">
                      {shortenWalletAddress(transaction._referral)}
                    </td> */}
                    <td className="text-center p-4">
                      {transaction.propertyId}
                    </td>
                    <td className="text-center p-4">{`$${transaction.amount}`}</td>
                    {/* <td className="text-center p-4">{`$${transaction._commission.toLocaleString()}`}</td> */}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentPerformanceFee;
