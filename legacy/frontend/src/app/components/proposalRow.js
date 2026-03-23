"use client";
import { formatNumber } from "@/context/helper";
import { usenfstayContext } from "@/context/nfstayContext";
import { useEffect, useState } from "react";

const Skeleton = ({ w = "w-24", h = "h-6", className = "" }) => {
  return (
    <div
      className={`${w} ${h} bg-gray-300 animate-pulse rounded-md ${className}`}
    ></div>
  );
};

const ProposalRow = ({ proposal }) => {
  const { getPropertyDetails, getVotingContract } = usenfstayContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState({
    id: 0,
    name: "",
    description: "",
    propertyType: "",
    propertyId: 0,
    votesInfavor: 0,
    votesInAgainst: 0,
    totalShares: 0, // Add total votes if needed
    startTime: 0,
  });

  const truncateText = (text, wordLimit) => {
    const words = text.split(" ");
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(" ") + "..."
      : text;
  };

  useEffect(() => {
    // Fetch the proposal details on mount
    const fetchProposalDetails = async () => {
      setLoading(true);
      try {
        const contract = await getVotingContract();
        const _proposal = await contract.getProposal(proposal._proposalId);

        const decodedDescription = await contract.decodeString(
          _proposal._description
        );
        const data = await getPropertyDetails(Number(_proposal._propertyId));

        setInfo({
          id: proposal.id,
          propertyId: Number(_proposal._propertyId),
          name: data.metadata.name || "",
          description: decodedDescription || "",
          propertyType: data.propertyType || "None",
          votesInfavor: Number(_proposal._votesInFavour),
          votesInAgainst: Number(_proposal._votesInAgainst),
          totalShares: data.totalShares,
          startTime: Number(proposal.blockTimestamp),
        });
      } catch (error) {
        console.error("Error fetching proposal details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProposalDetails();
  }, [proposal]); // Re-run if proposal id changes

  return (
    <tr
      key={proposal._proposalId}
      className="text-[#0C0839] font-medium border-b-2"
    >
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.id}
      </td>

      <td className="text-left p-4">
        {loading ? <Skeleton w="w-32" h="h-6" /> : info.name}
      </td>
      <td className="text-left p-4 text-[#8165EC]">
        {loading ? <Skeleton w="w-24" h="h-6" /> : `#${info.propertyId}`}
      </td>
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.propertyType}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-32" h="h-6" />
        ) : (
          new Date(info.startTime * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        )}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-24" h="h-6" />
        ) : (
          `${formatNumber(info.votesInfavor)}/${formatNumber(
            info.votesInAgainst
          )}`
        )}
      </td>
      <td className="text-left p-4 w-80 break-words whitespace-pre-wrap text-[#8165EC]">
        {loading ? (
          <Skeleton w="w-40" h="h-6" />
        ) : (
          <>
            {isExpanded ? info.description : truncateText(info.description, 10)}
            {info.description.split(" ").length > 10 && (
              <span
                className="text-white cursor-pointer text-[10px] whitespace-nowrap btn_primary_gradient ml-2 p-3 pt-1 pb-[6px] rounded-full text-center w-fit"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "See Less" : "See More"}
              </span>
            )}
          </>
        )}
      </td>
    </tr>
  );
};

export default ProposalRow;
