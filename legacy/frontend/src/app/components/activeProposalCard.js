import React, { useEffect, useState } from "react";
import Image from "next/image";
import Avatar from "../images/profile2.svg";

import { useNfstayContext } from "@/context/NfstayContext";
import Vote from "../activeProposal/vote";
import RemainingTime from "../activeProposal/remainingTime";
import { formatNumber } from "@/context/helper";
import { BACKEND_BASEURL } from "@/config";
import axios from "axios";
import { SkeletonLoader } from "../activeProposal/proposal";

const ActiveProposalCard = ({ proposal }) => {
  const { getPropertyDetails, getVotingContract, connectedAddress } =
    useNfstayContext();
  const [info, setInfo] = useState({
    name: "",
    image: "",
    profilePhoto: "",
    proposerName: "",
    description: "",
    location: "",
    minimumRequirements: [],
    propertyId: 0,
    proposalId: 0,
    votesInfavor: 0,
    votesInAgainst: 0,
    totalShares: 0, // Add total votes if needed
    endTime: 0,
    isVoted: false,
  });

  const [loading, setLoading] = useState(true);

  const getUserDetails = async (walletAddress) => {
    try {
      // Make the request to the backend API
      const response = await axios.get(`${BACKEND_BASEURL}/user/userDetails`, {
        params: { walletAddress },
      });

      // Destructure username and image from the response
      const { username, profilePhoto } = response.data;

      // Return the username and image
      return { username, profilePhoto };
    } catch (error) {
      // Log any errors
      console.error("Error fetching user details:", error);
      // Return a default value in case of error
      return { username: "", profilePhoto: "" };
    }
  };

  const fetchProposalDetails = async (loading = true) => {
    try {
      if (loading) setLoading(true);  
      const { username, profilePhoto } = await getUserDetails(proposal._by);

      const contract = await getVotingContract();
      const _proposal = await contract.getProposal(proposal._proposalId);
      let isVoted = false;
      if (connectedAddress) {
        isVoted = await contract.hasVoted(
          connectedAddress,
          proposal._proposalId
        );
      }

      const decodedDescription = await contract.decodeString(
        _proposal._description
      );
      const data = await getPropertyDetails(Number(_proposal._propertyId)); // Assuming proposal.id is used to get the details
      setInfo({
        propertyId: Number(_proposal._propertyId),
        proposalId: proposal._proposalId,
        name: data.metadata.name || "",
        image: data.metadata.image || "",
        profilePhoto: profilePhoto,
        proposerName: username,
        description: decodedDescription || "",
        location: data.propertyLocation.location || "",
        minimumRequirements: [
          "You must hold shares of this property in order to vote",
        ],

        votesInfavor: Number(_proposal._votesInFavour),
        votesInAgainst: Number(_proposal._votesInAgainst),
        totalShares: data.totalShares,
        endTime: Number(_proposal._endTime),
        isVoted: isVoted,
      });
    } catch (error) {
      console.error("Error fetching proposal details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposalDetails();
  }, [proposal]); // Re-run if proposal id changes

  if (loading)
    return (
      <div className="grid grid-cols-1 md:grid-cols-[70%_28%] gap-5">
        {/* Skeleton for Main Content */}
        <div className="flex flex-col gap-5 w-full p-4 shadow border rounded-lg">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Image Skeleton */}
            <div className=" w-full h-[112px] sm:w-[112px] bg-gray-300 rounded-lg animate-pulse"></div>

            {/* Text Skeleton */}
            <div className="flex flex-col gap-3 w-full">
              {/* Title and Location Skeleton */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="bg-gray-300 w-48 rounded-full h-6 animate-pulse"></div>
                <div className="bg-gray-300 w-32 h-4 rounded-full animate-pulse"></div>
              </div>
              {/* Description Skeleton */}
              <div className="flex flex-col gap-1">
                <div className="bg-gray-300 w-full h-4 rounded-full animate-pulse"></div>
                <div className="bg-gray-300 w-[70%] h-4 rounded-full animate-pulse"></div>
                <div className="bg-gray-300 w-[20%] h-4 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Voting Section Skeleton */}
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Creator and Voting Info */}
            <div className="flex flex-col gap-3">
              <div className="w-20 h-3 rounded-full bg-gray-300 animate-pulse" />
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 shrink-0 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="bg-gray-300 w-full h-3 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-gray-300 w-28 h-4 rounded-full animate-pulse"></div>
            </div>
            {/* Button Skeleton */}
            <div className="flex items-end w-full gap-5">
              <div className="flex w-full flex-col gap-3">
                <div className="w-[20%] h-4 rounded-full bg-gray-300 animate-pulse" />
                <div className="w-full h-8 rounded-lg p-3 flex items-center justify-between bg-gray-100 animate-pulse">
                  <div className="flex items-center gap-1">
                    <div className="size-6 shrink-0 rounded-full animate-pulse bg-gray-400" />
                    <div className="w-20 h-4 shrink-0 rounded-full animate-pulse bg-gray-400" />
                  </div>
                  <div className="w-24 h-4 shrink-0 rounded-full animate-pulse bg-gray-400" />
                </div>
                <div className="w-full h-8 rounded-lg p-3 flex items-center justify-between bg-gray-100 animate-pulse">
                  <div className="flex items-center gap-1">
                    <div className="size-6 shrink-0 rounded-full animate-pulse bg-gray-400" />
                    <div className="w-20 h-4 shrink-0 rounded-full animate-pulse bg-gray-400" />
                  </div>
                  <div className="w-24 h-4 shrink-0 rounded-full animate-pulse bg-gray-400" />
                </div>
              </div>
              <div className="w-28 h-8 rounded-full bg-gray-300 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Skeleton for Sidebar */}
        <div className="bg-[#F5F5F5] p-4 rounded-lg flex flex-col gap-5">
          {/* Timer Skeleton */}
          <div className="bg-gray-300 w-[70%] h-6 rounded-full animate-pulse"></div>

          {/* Requirements Skeleton */}
          <div className="flex flex-col gap-4 w-full">
            <div className="bg-gray-300 w-[50%] h-4 rounded-full animate-pulse"></div>
            <div className="w-full h-[1px] rounded-full bg-gray-200" />
            <div className="bg-gray-300 w-[70%] h-6 rounded-full animate-pulse"></div>

            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="bg-gray-300 w-full h-4 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="bg-gray-300 w-full h-4 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
              <div className="bg-gray-300 w-full h-4 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[70%_28%] gap-5">
      <div className="flex gap-5 flex-col w-full p-4 shadow border rounded-lg">
        <div className="flex flex-col sm:flex-row gap-5 w-full">
          <div className="sm:size-[7rem] sm:shrink-0">
            <Image
              src={info.image}
              width={200}
              height={200}
              className="rounded-lg h-full max-w-full"
              alt={info.name}
            />
          </div>

          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full justify-between">
              <h1 className="text-2xl font-bold 2xl:text-3xl">{`${info.propertyId} - ${info.name}`}</h1>

              <p className="flex items-center gap-1 opacity-60 2xl:text-base">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.6668 8.33341C16.6668 12.4942 12.051 16.8276 10.501 18.1659C10.3566 18.2745 10.1808 18.3332 10.0002 18.3332C9.8195 18.3332 9.64373 18.2745 9.49933 18.1659C7.94933 16.8276 3.3335 12.4942 3.3335 8.33341C3.3335 6.5653 4.03588 4.86961 5.28612 3.61937C6.53636 2.36913 8.23205 1.66675 10.0002 1.66675C11.7683 1.66675 13.464 2.36913 14.7142 3.61937C15.9645 4.86961 16.6668 6.5653 16.6668 8.33341Z"
                    stroke="#0C0839"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 10.8333C11.3807 10.8333 12.5 9.71396 12.5 8.33325C12.5 6.95254 11.3807 5.83325 10 5.83325C8.61929 5.83325 7.5 6.95254 7.5 8.33325C7.5 9.71396 8.61929 10.8333 10 10.8333Z"
                    stroke="#0C0839"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {info.location}
              </p>
            </div>
            <p className="text-[#0C0839] w-auto whitespace-pre-line lg:max-w-md 2xl:text-base 2xl:max-w-xl">
              {info.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full gap-5">
          <div className="flex flex-col gap-5 justify-between max-w-28 w-full">
            <div className="flex flex-col gap-3">
              <p className="opacity-80 2xl:text-base">CREATED BY</p>
              <div className="flex items-center gap-3">
                <span className="shrink-0 size-6 rounded-full bg-[#D9D9D9]">
                  <span className="shrink-0 size-6 rounded-full bg-[#D9D9D9]">
                    {info.profilePhoto ? (
                      <Image
                        src={info.profilePhoto}
                        alt="User Profile"
                        width={20}
                        height={20}
                        className="rounded-full w-full h-full object-cover"
                        onError={(e) =>
                          (e.target.src =
                            "https://photos.pinksale.finance/file/pinksale-logo-upload/1738084118513-3f883127da3bdced958eb3c04358b816.png")
                        }
                      />
                    ) : (
                      <Image
                        src={Avatar} // Assuming Avatar is the path to the image
                        alt="Default Avatar"
                        className="rounded-full w-full h-full object-cover"
                      />
                    )}
                  </span>
                </span>
                <p className="font-medium underline text-sm">
                  {info.proposerName
                    ? info.proposerName
                    : `${proposal._by.slice(0, 4)}....${proposal._by.slice(
                        -4
                      )}`}
                </p>
              </div>
            </div>

            <p className="font-medium opacity-60 2xl:text-sm">
              {(info?.votesInfavor + info?.votesInAgainst).toLocaleString()} of{" "}
              {(info?.totalShares).toLocaleString()} voted
            </p>
          </div>
          <Vote info={info} fetchProposalDetails={fetchProposalDetails} />
        </div>
      </div>

      <div className="bg-[#F5F5F5] p-4 rounded-lg flex flex-col gap-5">
        <RemainingTime voteEndTime={info.endTime} />

        <div className="flex flex-col gap-4">
          <h1 className="font-bold text-lg 2xl:text-xl">
            Minimum requirements
          </h1>
          <div className="flex flex-col gap-3 2xl:text-base">
            {info?.minimumRequirements?.map((req, i) => (
              <div key={i} className="flex items-center gap-2">
                <svg
                  width="18"
                  height="22"
                  className="shrink-0 2xl:w-[25px]"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.0002 20.1666C16.0628 20.1666 20.1668 16.0625 20.1668 10.9999C20.1668 5.93731 16.0628 1.83325 11.0002 1.83325C5.93755 1.83325 1.8335 5.93731 1.8335 10.9999C1.8335 16.0625 5.93755 20.1666 11.0002 20.1666Z"
                    fill="#0C0839"
                    stroke="#0C0839"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.25 11.0001L10.0833 12.8334L13.75 9.16675"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p>{req}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveProposalCard;
