"use client";
import Image from "next/image";
import Table from "../components/table";
import img from "../images/profile2.svg";
import { useEffect, useState } from "react";
import { formatNumber } from "@/context/helper";
import { BACKEND_BASEURL } from "@/config";
import axios from "axios";
import { fetchAgentLeaderboardData } from "@/context/subgraphHelper";

const TopStateAgent = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const columns = [
    "Agent",
    "Shares Sold",
    "Value Raised",
    "Commission Received",
  ];

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
      console.error("Error fetching Agents details:", error);
      // Return a default value in case of error
      return { username: "", profilePhoto: "" };
    }
  };
  const fetchAgentsData = async () => {
    try {
      setIsLoading(true);

      // Mock data
      //   const data = AGENTS_MOCK_DATA;
      const data = await fetchAgentLeaderboardData();

      // Fetch user details for each address in parallel
      const userDetails = await Promise.all(
        data.map(async (user) => {
          const { username, profilePhoto } = await getUserDetails(user.user);
          return {
            username: username || "", // Fallback to user address if username not found
            profilePhoto: profilePhoto || img, // Fallback to placeholder image
            address: user.user,
          };
        })
      );

      // Map over the data and add fetched user details
      const formattedData = data.map((user, index) => ({
        username: userDetails[index].username,
        address: userDetails[index].address,
        logo: userDetails[index].profilePhoto,
        share_sold: user.share_sold,
        value: user.value,
        commission: user.commission,
      }));

      // Return the formatted data array
      return formattedData;
    } catch (err) {
      console.error("Error fetching agents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const _data = await fetchAgentsData();
        setData(_data);
      } catch (error) {
        console.error("Error fetching payouts:", error);
      }
    };

    fetchData();
  }, []);

  //   const rows = [
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //     {
  //       logo: img,
  //       username: "John Doe",
  //       location: "Stockholm, Sweden",
  //       share_sold: `$850,230`,
  //       value: `8.28%`,
  //       commission: `+ 51.4%`,
  //     },
  //   ];

  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate the total number of pages
  const totalPages = Math.ceil(data?.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return; // Prevent invalid pages
    setCurrentPage(page);
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: columns.length }).map((_, index) => (
        <td key={index} className="p-4">
          <div className="h-5 bg-gray-300 rounded w-full"></div>
        </td>
      ))}
    </tr>
  );

  // Get rows for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = data.slice(startIndex, startIndex + itemsPerPage);
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

    //
    return data?.length > 0 ? (
      data.map((row, key) => (
        <tr
          key={key}
          className={`text-[#0C0839] font-bold 2xl:text-lg ${
            key < data?.length - 1 ? "border-b-2" : ""
          }`}
        >
          <td className="flex items-center w-fit gap-2 p-4">
            <span className="mr-5">{key + 1}</span>
            <div className="h-10 w-10 overflow-hidden rounded-full flex items-center justify-center bg-gray-200">
              <Image
                src={row.logo}
                width={48}
                height={48}
                alt="Row"
                className="object-cover"
              />
            </div>
            <p className="font-bold text-black flex flex-col w-fit">
              {row.username
                ? row.username
                : `${row.address.slice(0, 4)}....${row.address.slice(-4)}`}
            </p>
          </td>

          <td className="text-center p-4">{formatNumber(row.share_sold)}</td>

          <td className="text-center p-4">
            <p className="font-bold text-meta-3">${formatNumber(row.value)}</p>
          </td>

          <td className="text-center p-4">${formatNumber(row.commission)}</td>
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

  const renderPagination = () => {
    const pageNumbers = [];
    const totalPagesToShow = 4; // You can adjust how many pages you want to show before and after the current page

    if (totalPages <= totalPagesToShow) {
      // If total pages are less than or equal to total pages to show, show all
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const halfPageCount = Math.floor(totalPagesToShow / 2);

      // Show the first page, some pages around the current page, and the last page
      if (currentPage <= halfPageCount + 1) {
        // Current page is near the start
        for (let i = 1; i <= totalPagesToShow; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - halfPageCount) {
        // Current page is near the end
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = totalPages - totalPagesToShow + 1; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        // Current page is in the middle
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (
          let i = currentPage - halfPageCount;
          i <= currentPage + halfPageCount;
          i++
        ) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }

    // return (
    //     <div className="flex justify-center mt-4 w-full">
    //         {pageNumbers.map((page, index) => (
    //             <button
    //                 key={index}
    //                 className={`px-4 py-2 mx-1 transition-all rounded-full font-bold 2xl:text-lg ${currentPage === page ? "text-[#954AFC] bg-[#F7F6FF]" : "text-black"
    //                     }`}
    //                 onClick={() => handlePageChange(page)}
    //                 disabled={page === "..."} // Disable ellipsis
    //             >
    //                 {page}
    //             </button>
    //         ))}
    //     </div>
    // );
  };

  return (
    <Table
      title="Top Estate Agents"
      columns={columns}
      rows={renderRows}
      pagination={renderPagination}
    />
  );
};

export default TopStateAgent;
