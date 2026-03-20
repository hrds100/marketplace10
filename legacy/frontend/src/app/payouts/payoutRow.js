"use client";
import { useEffect, useState } from "react";

export const Skeleton = ({ w = "w-24", h = "h-6", className = "" }) => {
  return (
    <div
      className={`${w} ${h} bg-gray-300 animate-pulse rounded-md ${className}`}
    ></div>
  );
};

const PayoutRow = ({ payout }) => {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState({
    id: 0,
    propertyId: 0,
    date: 0,
    payout: 0,
  });

  useEffect(() => {
    // Fetch the payout details on mount
    const fetchProposalDetails = async () => {
      setLoading(true);
      try {
        setInfo({
          id: payout.id,
          propertyId: payout.propertyId,
          date: payout.date,
          payout: payout.payout,
        });
      } catch (error) {
        console.error("Error fetching payout details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProposalDetails();
  }, [payout]); // Re-run if payout id changes

  return (
    <tr
      key={payout._proposalId}
      className="text-[#0C0839] font-medium border-b-2"
    >
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : info.id}
      </td>

      <td className="text-left p-4">
        {loading ? <Skeleton w="w-32" h="h-6" /> : info.propertyId}
      </td>
      <td className="text-left p-4">
        {loading ? (
          <Skeleton w="w-32" h="h-6" />
        ) : (
          new Date(info.date * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        )}
      </td>
      <td className="text-left p-4">
        {loading ? <Skeleton w="w-24" h="h-6" /> : `$${info.payout.toLocaleString()}`}
      </td>
    </tr>
  );
};

export default PayoutRow;
