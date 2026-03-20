import ActiveProposalCard from "../components/activeProposalCard";

const ActiveProposal = ({ loading, proposals }) => {
  return (
    <div className="pb-2.5 flex flex-col gap-6 xl:pb-1">
      <div className="flex items-center justify-between gap-5">
        <div className="flex gap-2 flex-col justify-between">
          {/* <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
            Active Proposals
          </h4> */}
          <h4 className="text-title-lg font-bold text-black ">
            {" "}
            Active Proposals
          </h4>
        </div>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center text-gray-500">
          No active proposals found
        </div>
      ) : (
        proposals.map((proposal, index) => (
          <ActiveProposalCard key={index} proposal={proposal} />
        ))
      )}
    </div>
  );
};

export default ActiveProposal;
