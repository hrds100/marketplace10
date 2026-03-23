"use client";
import { useEffect, useState } from "react";
import ShowPagination from "@/utils/showPagination";
import { Skeleton } from "../payouts/payoutRow";
import {
  getEthFrom,
  NotifyError,
  NotifySuccess,
  shortenWalletAddress,
} from "@/context/helper";
import { ADMIN_WALLET } from "@/config";
import { usenfstayContext } from "@/context/nfstayContext";

const CommissionsTable = ({
  data,
  isLoading,
  ITEMS_PER_PAGE,
  totalPages,
  fetchCommissionData,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedData, setPaginatedData] = useState([]);
  const [filterPropertyId, setFilterPropertyId] = useState();
  const [filterMonth, setFilterMonth] = useState();
  const [filterYear, setFilterYear] = useState();
  const [distributionAmount, setDistributionAmount] = useState();
  const { distributeFeesToAgents } = usenfstayContext();
  const [isDistributeLoading, setIsDistributeLoading] = useState(false);
  const currentMonth = new Date().getMonth(); // 0-based: Jan = 0, Dec = 11
  const currentYear = new Date().getFullYear();
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

  const handleDistribute = async (
    data,
    distributionAmount,
    filterPropertyId,
    filterYear,
    filterMonth,
    ADMIN_WALLET
  ) => {
    try {
      setIsDistributeLoading(true);
      await distributeFeesToAgents({
        summarizedAgents: data,
        totalAmountReadable: distributionAmount,
        propertyId: filterPropertyId,
        year: filterYear,
        month: filterMonth - 1,
        senderAddress: ADMIN_WALLET,
      });

      NotifySuccess("Commission distributed");
    } catch (error) {
      NotifyError(error.response ? error.response.data.message : error.message);

      console.error("Distribute Error:", error);
    } finally {
      setIsDistributeLoading(false);
    }
  };

  useEffect(() => {
    if (totalPages > 0) {
      getPaginatedData(currentPage, data);
    }
  }, [totalPages, currentPage, data]);

  useEffect(() => {
    if (
      filterPropertyId != undefined &&
      filterYear != undefined &&
      filterMonth != undefined
    ) {
      fetchCommissionData(filterPropertyId, filterYear, filterMonth);
    }
  }, [filterPropertyId, filterMonth, filterYear]);

  useEffect(() => {
    if (currentYear == filterYear && filterMonth > currentMonth) {
      setFilterMonth(currentMonth);
    }
  }, [filterYear]);

  return (
    <div className="flex gap-5 flex-col justify-between">
      <h4 className="text-title-lg font-bold text-black ">
        Distribute Performance Fee{" "}
      </h4>
      <div className="flex flex-col gap-4">
        {/* Row 1: Property ID, Month, Year */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label>Property ID</label>
            <input
              disabled={isDistributeLoading}
              type="number"
              placeholder="1"
              value={filterPropertyId}
              onChange={(e) => setFilterPropertyId(e.target.value)}
              className="w-40 p-2 border rounded-lg"
            />
          </div>

          <div className="flex flex-col">
            <label>Month</label>
            <select
              disabled={isDistributeLoading}
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-40 p-2 border rounded-lg"
            >
              <option value="">Select Month</option>
              {[
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
              ].map((month, index) => {
                return (
                  <option
                    key={index}
                    value={index + 1}
                    disabled={
                      currentYear == filterYear && index >= currentMonth
                    } // Disable future months
                  >
                    {month}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-col">
            <label>Year</label>
            <select
              disabled={isDistributeLoading}
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-32 p-2 border rounded-lg"
            >
              <option value="">Select Year</option>
              {Array.from(
                { length: 10 },
                (_, i) => new Date().getFullYear() - i
              ).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Distribution Amount + Button */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col">
            <label>Distribution Amount $</label>
            <input
              disabled={isDistributeLoading}
              type="number"
              placeholder="120"
              value={distributionAmount}
              onChange={(e) => setDistributionAmount(e.target.value)}
              className="w-40 p-2 border rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() =>
                handleDistribute(
                  data,
                  distributionAmount,
                  filterPropertyId,
                  filterYear,
                  filterMonth,
                  ADMIN_WALLET
                )
              }
              disabled={
                data.length === 0 ||
                isDistributeLoading ||
                !(distributionAmount > 0)
              }
              className="border-2 border-green-400 font-bold py-2 px-4 rounded disabled:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed min-w-12 h-10 flex justify-center items-center"
            >
              {isDistributeLoading ? (
                <div className="w-5 h-5 border-4 border-t-4 border-t-[#3d4a6c] border-gray-300 rounded-full animate-spin"></div>
              ) : (
                "Distribute"
              )}
            </button>
          </div>
        </div>
      </div>

      <>
        <div className="overflow-x-auto">
          <table className="w-full shrink-0 whitespace-nowrap 2xl:text-lg">
            <thead>
              <tr className="text-sm text-[#0C0839] opacity-40">
                <th className="text-left p-4">SNo.</th>
                <th className="text-left p-4">Property ID</th>
                <th className="text-left p-4">Agent Address</th>
                <th className="text-left p-4">Shares Sold</th>
                <th className="text-left p-4">Total Investment</th>
                <th className="text-left p-4">Total Commission</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <CommissionRow loading={isLoading} />
              ) : data?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-4 text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                paginatedData.map((commission, index) => (
                  <CommissionRow
                    fetchCommissionData={fetchCommissionData}
                    key={index}
                    commission={commission}
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

export default CommissionsTable;

// export const TxHash = ({ txHash }) => {
//   return (
//     <a
//       href={`https://bscscan.com/tx/${txHash}`}
//       target="_blank"
//       className="text-blue-400 hover:underline underline-offset-1 flex items-center gap-1"
//     >
//       {shortenWalletAddress(txHash)}
//       <MdOutlineOpenInNew />
//     </a>
//   );
// };

const CommissionRow = ({ commission, loading }) => {
  const [info, setInfo] = useState({
    id: 0,
    agentAddress: 0,
    propertyId: 0,
    totalSharesSold: 0,
    totalInvestment: 0,
    totalCommission: 0,
  });

  // const completeSubscriptionOrder = async (subscriptionId) => {
  //   try {
  //     setSubLoading(true);
  //     const { message, signature } = await signMessage();
  //     const response = await axios.post(
  //       `${BACKEND_BASEURL}/admin/complete-subscription-order`,
  //       {
  //         subscriptionId,
  //         message, // Include the message in the request body
  //         signature,
  //       }
  //     );
  //     NotifySuccess(response.data.message); // Display success message
  //   } catch (error) {
  //     console.log(error);
  //     NotifyError(error.response ? error.response.data.message : error.message);
  //   } finally {
  //     setSubLoading(false);
  //   }
  // };

  // const formatDate = (timestamp) => {
  //   const date = new Date(timestamp * 1000); // Convert timestamp to milliseconds

  //   // Extract year, month, and day
  //   const year = date.getFullYear();
  //   const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed, so add 1
  //   const day = String(date.getDate()).padStart(2, "0");

  //   return `${year}-${month}-${day}`;
  // };

  useEffect(() => {
    // Fetch the subscription details on mount
    const fetchCommissionDetails = async () => {
      try {
        setInfo({
          id: commission?.id,
          agentAddress: commission?.agent,
          propertyId: commission?.propertyId,
          totalSharesSold: commission?.totalSharesSold,
          totalInvestment: commission?.totalInvestment,
          totalCommission: commission?.totalCommission,
        });
      } catch (error) {
        console.error("Error fetching commission details:", error);
      }
    };

    fetchCommissionDetails();
  }, [commission]);

  return (
    <tr key={commission?.id} className="text-[#0C0839] font-medium border-b-2">
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.id}
      </td>
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-32" h="h-6" /> : info?.propertyId}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-32" h="h-6" />
        ) : (
          shortenWalletAddress(info.agentAddress)
        )}
      </td>

      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.totalSharesSold}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-24" h="h-6" />
        ) : (
          `$ ${Number(
            getEthFrom(BigInt(info.totalInvestment).toString())
          ).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        )}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-24" h="h-6" />
        ) : (
          `$ ${Number(
            getEthFrom(BigInt(info.totalCommission).toString())
          ).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        )}
      </td>

      {/* <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-24" h="h-6" />
        ) : !info.TxHash ? (
          "Not Found"
        ) : (
          <TxHash txHash={info.TxHash} />
        )}
      </td> */}
      {/* <td
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
              refetchData={getCommissions}
              isSubLoading={isSubLoading}
              record={info}
            />
          </>
        )}
      </td> */}
    </tr>
  );
};
