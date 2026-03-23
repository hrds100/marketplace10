"use client";
import ShowPagination from "@/utils/showPagination";
import { useEffect, useState } from "react";
import ProposalRow from "../components/proposalRow";
import { usenfstayContext } from "@/context/nfstayContext";

const PastProposal = ({ proposals }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedData, setPaginatedData] = useState([]);

  const {connectedAddress} = usenfstayContext()

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(proposals.length / ITEMS_PER_PAGE);

  // Get the current page's data
  const getPaginatedData = (_currentPage,_proposals) => {
    const startIndex = (_currentPage - 1) * ITEMS_PER_PAGE;
    setPaginatedData(_proposals.slice(startIndex, startIndex + ITEMS_PER_PAGE));
  };

  useEffect(() => {
    getPaginatedData(currentPage,proposals);
  }, [currentPage,connectedAddress,proposals]);

  // Handle page change
  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex gap-5 flex-col justify-between">
      {/* <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
        Past Proposals
      </h4> */}
      <h4 className="text-title-lg font-bold text-black "> Past Proposals</h4>

      <div className="overflow-x-auto">
        <table className="w-full shrink-0 whitespace-nowrap 2xl:text-lg">
          <thead>
            <tr className="text-sm text-[#0C0839] opacity-40">
              <th className="text-left p-4">S.no </th>
              <th className="text-left p-4">Property Name</th>
              <th className="text-left p-4">Property ID</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">YES/NO</th>
              <th className="text-left p-4">Proposal</th>
            </tr>
          </thead>
          <tbody>
            {proposals.length == 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-4 text-gray-500">
                  No past proposals found
                </td>
              </tr>
            ) : (
              paginatedData.map((proposal, index) => (
                <ProposalRow key={index} proposal={proposal} />
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
    </div>
  );
};

export default PastProposal;
