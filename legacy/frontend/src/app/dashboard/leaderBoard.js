"use client";
import Image from "next/image";
import Table from "../components/table";
import img from "../images/profile2.svg";
import { formatNumber } from "@/context/helper";
import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_BASEURL } from "@/config";
import { useNfstayContext } from "@/context/NfstayContext";
import { fetchEarnersLeaderboard } from "@/context/subgraphHelper";

const LeaderBoard = () => {
  const columns = ["User", "Shares Owned", "Properties", "Total Earnings"];
  const { assetPrices, getLeaderBoardInfo } = useNfstayContext();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

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

  const fetchEarnersLeaderBoardData = async (stayPrice) => {
    try {
      setIsLoading(true);

      // Fetch leaderboard data
      const data = await fetchEarnersLeaderboard(stayPrice);

      // Fetch user details and leaderboard info for each user in parallel
      const userDetails = await Promise.all(
        data.map(async (user) => {
          // Fetch username and profile photo
          const { username, profilePhoto } = await getUserDetails(user.user);

          // Fetch leaderboard info (property count and shares owned)
          const { propertyCount, sharesOwned } = await getLeaderBoardInfo(
            user.user
          );

          return {
            username: username || "", // Fallback to user address if username not found
            profilePhoto: profilePhoto || img, // Fallback to placeholder image
            address: user.user,
            propertyCount,
            sharesOwned,
          };
        })
      );

      // Map over the data and add fetched user details and leaderboard info
      const formattedData = data.map((user, index) => ({
        username: userDetails[index].username,
        address: userDetails[index].address,
        logo: userDetails[index].profilePhoto,
        sharesOwned: userDetails[index].sharesOwned, // Add sharesOwned
        investedProperties: userDetails[index].propertyCount, // Add propertyCount
        totalEarnings: user.earnings,
      }));

      // Return the formatted data array
      return formattedData;
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const _data = await fetchEarnersLeaderBoardData(assetPrices.stayPrice);
        setData(_data);
      } catch (error) {
        console.error("Error fetching payouts:", error);
      }
    };
    if (assetPrices.stayPrice > 0) {
      fetchData();
    }
  }, [assetPrices]);

  //   const rows = [
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       sharesOwned: 100,
  //       investedProperties: `1000M`,
  //       totalEarnings: `+ 10`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       sharesOwned: 100,
  //       investedProperties: `1000K`,
  //       totalEarnings: `+ 10`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       sharesOwned: 100,
  //       investedProperties: `1000K`,
  //       totalEarnings: `+ 10`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       sharesOwned: 100,
  //       investedProperties: `1000K`,
  //       totalEarnings: `+ 10`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       sharesOwned: 100,
  //       investedProperties: `1000K`,
  //       totalEarnings: `+ 10`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       sharesOwned: 100,
  //       investedProperties: `1000K`,
  //       totalEarnings: `+ 10`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       sharesOwned: 100,
  //       investedProperties: `1000K`,
  //       totalEarnings: `+ 10`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       sharesOwned: 100,
  //       investedProperties: `1000K`,
  //       totalEarnings: `+ 10`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       sharesOwned: 100,
  //       investedProperties: `1000K`,
  //       totalEarnings: `+ 10`,
  //     },
  //   ];
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: columns.length }).map((_, index) => (
        <td key={index} className="p-4">
          <div className="h-5 bg-gray-300 rounded w-full"></div>
        </td>
      ))}
    </tr>
  );

  const renderRows = () => {
    if (isLoading) {
      return (
        <>
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </>
      );
    }

    return data?.length > 0 ? (
      data.map((row, key) => (
        <tr
          key={key}
          className={`text-[#0C0839] font-bold 2xl:text-lg ${
            key < data.length - 1 ? "border-b-2" : ""
          }`}
        >
          <td className="flex items-center w-fit gap-2 p-4">
            <span className="mr-5">{key + 1}</span>
            <div className="h-10 w-10 overflow-hidden rounded-full flex items-center justify-center bg-gray-200">
              <Image
                src={row.logo}
                width={48}
                height={48}
                alt="image"
                className="object-cover"
              />
            </div>
            <p className="font-bold text-black flex flex-col w-fit">
              {row.username
                ? row.username
                : `${row.address.slice(0, 4)}....${row.address.slice(-4)}`}
            </p>
          </td>

          <td className="text-center p-4">{formatNumber(row.sharesOwned)}</td>

          <td className="text-center p-4">
            <p className="font-bold text-meta-3">
              {formatNumber(row.investedProperties)}
            </p>
          </td>

          <td className="text-center p-4">
            ${formatNumber(row.totalEarnings)}
          </td>
        </tr>
      ))
    ) : (
      <tr>
        <td
          colSpan={columns.length}
          className="text-[#0C0839] text-center font-bold 2xl:text-lg py-4"
        >
          No data available
        </td>
      </tr>
    );
  };

  return (
    <Table
      title="Top Earners Leaderboard"
      columns={columns}
      rows={renderRows}
    />
  );
};

export default LeaderBoard;
