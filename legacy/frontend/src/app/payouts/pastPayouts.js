"use client";
import ShowPagination from "@/utils/showPagination";
import { useEffect, useState } from "react";
import { usenfstayContext } from "@/context/nfstayContext";
import PayoutRow from "./payoutRow";
import { fetchRentWithdrawnEvents } from "@/context/subgraphHelper";

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

const PastPayouts = ({
  pastPayouts,
  isPastPayoutLoading,
  ITEMS_PER_PAGE,
  totalPages,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedData, setPaginatedData] = useState([]);

  // Get the current page's data
  const getPaginatedData = (_currentPage) => {
    const startIndex = (_currentPage - 1) * ITEMS_PER_PAGE;
    setPaginatedData(
      pastPayouts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
    );
  };

  // Handle page change
  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    if (totalPages > 0) getPaginatedData(currentPage);
  }, [totalPages, currentPage]);

  return (
    <div className="flex gap-5 flex-col justify-between">
      <h4 className="text-title-lg font-bold text-black "> Past Payouts</h4>
      {isPastPayoutLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full shrink-0 whitespace-nowrap 2xl:text-lg">
              <thead>
                <tr className="text-sm text-[#0C0839] opacity-40">
                  <th className="text-left p-4">S.no </th>
                  <th className="text-left p-4">Property ID</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Payout</th>
                </tr>
              </thead>
              <tbody>
                {pastPayouts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-4 text-gray-500">
                      No past payouts found
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((payout, index) => (
                    <PayoutRow key={index} payout={payout} />
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
      )}
    </div>
  );
};

export default PastPayouts;
