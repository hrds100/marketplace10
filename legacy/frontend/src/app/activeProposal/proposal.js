"use client";
import { useState, useEffect } from "react";
import ActiveProposal from "./activeProposal";
import PastProposal from "./pastProposal";
import { fetchProposalStatusEvents } from "@/context/subgraphHelper";
import { useNfstayContext } from "@/context/NfstayContext";

export const SkeletonLoader = () => {
  return (
    <div className="w-full flex flex-col gap-5">
      {/* Active Proposal Section */}
      <div className="w-[30%] h-5 rounded-full bg-gray-300 animate-pulse" />

      {/* Past Proposals Section */}
    </div>
  );
};

const Proposal = () => {
  const {connectedAddress} = useNfstayContext()
  const [activeProposals, setActiveProposals] = useState([]);
  const [pastProposals, setPastProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  const getProposals = async () => {
    try {
      setLoading(true);
      const { activeProposals, pastProposals } =
        await fetchProposalStatusEvents();

      setActiveProposals(activeProposals);
      setPastProposals(pastProposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch proposals when the component mounts
  useEffect(() => {
    getProposals();
  }, [connectedAddress]);

  return (
    <div className="w-full flex flex-col gap-5">
      {/* {loading ? (
        <SkeletonLoader /> // You can replace this with a loader component
      ) : ( */}
      <>
        <ActiveProposal loading={loading} proposals={activeProposals} />
        <PastProposal proposals={pastProposals} />
      </>
      {/* )} */}
    </div>
  );
};

export default Proposal;
