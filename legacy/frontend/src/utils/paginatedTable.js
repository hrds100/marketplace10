"use client";
import TableForm from "@/app/components/table/table";
import Image from "next/image";
import { useEffect, useState } from "react";
import ShowPagination from "./showPagination";
import Claim from "./claim";
import { formatNumber, getErrorMessage, NotifyError } from "@/context/helper";
import { usenfstayContext } from "@/context/nfstayContext";
import Modal from "./modal";
import Congratulation from "@/app/payouts/congratulation";
import RentalYieldModal from "@/app/payouts/rentalYieldModal";
const PaginatedTable = ({
  getPastPayouts,
  fetchPayouts,
  isLoading,
  columns,
  rows,
  showNumbers = true,
  itemsPerPage = 5,
}) => {
  const { withdrawRent, handleNetwork, connectedAddress } = usenfstayContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [open, setOpen] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);

  const [isWithdrawLoading, setIsWithdrawloading] = useState(false);
  const steps = [
    "Claim USDC",
    "Approve USDC",
    "Create LP",
    "Approve LP",
    "Deposit LP",
    "Success",
  ];
  const [step, setSteps] = useState(steps);
  const stepsForStay = [
    "Claim Rent",
    "Approve USDC",
    "Convert to Stay",
    "Success",
  ];
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        setShowCongrats(true);
        setOpen(false);
      }, 800);
    }
  }, []);
  // Calculate the total number of pages
  const totalPages = Math.ceil(rows.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return; // Prevent invalid pages
    setCurrentPage(page);
  };

  function convertTimestampToDate(timestamp) {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    const formattedDate = `${
      date.getMonth() + 1
    }/${date.getDate()}/${date.getFullYear()}`;
    return formattedDate;
  }
  // Get rows for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = rows.slice(startIndex, startIndex + itemsPerPage);

  const renderRows = () => {
    if (currentRows.length === 0) {
      return (
        <tr>
          <td
            colSpan={columns.length}
            className="text-center font-semibold text-base py-4 text-gray-500"
          >
            No payouts found
          </td>
        </tr>
      );
    }

    return currentRows?.map((row, key) => (
      <tr
        key={key}
        className={`text-[#0C0839]  font-medium 2xl:text-lg  !align-middle ${
          key < currentRows.length - 1 ? "border-b-2" : ""
        }`}
      >
        {/* Property Name */}
        <td className="inline-flex items-center pb-2 w-fit h-full align-middle gap-2 ">
          {showNumbers && <span className="mr-5">{startIndex + key + 1}</span>}
          <div className="h-9 w-full shrink-0 max-w-9 flex-min-w-max">
            <Image
              src={row.image}
              width={60}
              height={60}
              className="max-w-full h-9 rounded-full object-cover "
              alt="Row"
            />
          </div>
          <p className="font-medium  text-black flex flex-col w-fit">
            {row.name} {/* Matches "Property Name" */}
          </p>
        </td>

        {/* Date */}
        <td className="text-center pb-2">
          {convertTimestampToDate(row?.time)}
        </td>

        {/* Price */}
        <td className="text-center pb-2">${formatNumber(row?.totalPrice)}</td>

        {/* Shares Owned */}
        <td className="text-center pb-2">{formatNumber(row?.userBalance)}</td>

        {/* Payout */}
        <td className="text-center pb-2">${row?.payout.toLocaleString()}</td>

        {/* Status */}
        <td
          className={`text-center pb-2 ${
            row.status == 0 ? "text-[#43CD61]" : "text-red-400"
          }`}
        >
          {row.status == 0 ? "Pending" : "Ended"}
        </td>

        {/* Choose how to Claim your Rent */}
        <td className="flex items-center gap-3 justify-center pb-2">
          {/* <button
            type="button"
            onClick={() => {
              setSteps(steps);
              setPropertyId(row.propertyId);
              setOpen(true);
            }}
            className="py-1.5 px-4 rounded-lg bg-[#954AFC] disabled:cursor-not-allowed disabled:opacity-55 whitespace-nowrap font-medium text-white"
            disabled={isWithdrawLoading}
          >
            Claim & Reinvest
          </button> */}

          <RentalYieldModal
            propertyId={row.propertyId}
            getPastPayouts={getPastPayouts}
            fetchPayouts={fetchPayouts}
            data={row}
          />
          {/* <button
            className={`relative flex items-center justify-center gap-1 w-32 ${
              isWithdrawLoading ? "opacity-60 cursor-not-allowed" : ""
            }`}
            onClick={() => {
              handleRentWithdraw(row.propertyId);
            }}
            disabled={isWithdrawLoading}
          >
            {isWithdrawLoading ? (
              <div className="absolute w-7 h-7 border-4 border-t-[4px] border-t-[#3d4a6c] rounded-full animate-spin" />
            ) : (
              "Claim USDC"
            )}
          </button> */}
        </td>
      </tr>
    ));
  };

  return (
    <>
      <TableForm
        isLoading={isLoading}
        columns={columns}
        rows={renderRows}
        pagination={() =>
          ShowPagination({
            currentPage: currentPage,
            totalPages: totalPages,
            handlePageChange: handlePageChange,
          })
        }
      />
      <Claim
        setIsSuccess={setIsSuccess}
        fetchPayouts={fetchPayouts}
        source="payout"
        propertyId={propertyId}
        steps={step}
        open={open}
        setOpen={setOpen}
      />
      <Congratulation
        open={isSuccess}
        handleClose={() => {
          setIsSuccess(false);
          fetchPayouts();
          getPastPayouts(connectedAddress);
        }}
      />
    </>
  );
};

export default PaginatedTable;
