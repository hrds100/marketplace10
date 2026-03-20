"use client";
import Image from "next/image";
import fire from "../images/fire.webp";
import { useEffect, useState } from "react";
import { getBurnHistory } from "@/context/subgraphHelper";
import { formatNumber, getEthFrom } from "@/context/helper";

const Incinerator = () => {
  const [burnHistory, setBurnHistory] = useState([]);
  const [totalBurned, setTotalBurned] = useState([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBurnData = async () => {
      try {
        const _burns = await getBurnHistory(); // Await the Promise

        // Calculate total value
        const totalValue = _burns?.reduce(
          (acc, obj) => acc + parseFloat(getEthFrom(obj.value)),
          0
        );

        // Update states
        setTotalBurned(totalValue);
        setBurnHistory(_burns);
      } catch (error) {
        console.error("Error fetching burn history:", error);
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchBurnData(); // Call the async function
  }, []);

  const handleClick = () => {
    window.open(
      "https://bscscan.com/advanced-filter?fadd=0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0&tadd=0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0&mtd=0x42966c68%7eBurn",
      "_blank"
    );
  };
  const table = {
    headers: ["#", "SOURCE", "DATE", "AMOUNT", "STATUS"],
    data: [
      {
        id: 1,
        source: "Boardroom",
        date: "2021-08-09",
        time: "9:23 PM",
        amount: "0.0001",
        status: "Pending",
      },
      {
        id: 2,
        source: "Boardroom",
        date: "2021-08-09",
        time: "9:23 PM",
        amount: "0.0001",
        status: "Pending",
      },
      {
        id: 3,
        source: "Boardroom",
        date: "2021-08-09",
        time: "9:23 PM",
        amount: "0.0001",
        status: "Pending",
      },
      {
        id: 4,
        source: "Boardroom",
        date: "2021-08-09",
        time: "9:23 PM",
        amount: "0.0001",
        status: "Pending",
      },
      {
        id: 5,
        source: "Farm",
        date: "2021-08-09",
        time: "9:23 PM",
        amount: "0.0001",
        status: "Pending",
      },
    ],
  };

  return (
    <div
      className="flex relative flex-col gap-5 isolate rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #01060F 0%, #1F242D 100%)",
      }}
    >
      <div
        className="w-full h-[196px] absolute -top-[159px] rounded-full blur-3xl -z-[1]"
        style={{
          background: "linear-gradient(90deg, #9945FF 0%, #20E19F 100%)",
        }}
      ></div>

      <div className="flex flex-col sm:flex-row gap-8 justify-between">
        <div className="flex flex-col gap-5 p-8 z-[1]">
          <h1 className="text-white text-4xl font-bold 2xl:text-5xl">
            Incinerator
          </h1>
          <p className="text-white 2xl:text-lg">
            Burns are performed randomly to avoid price manipulation and all
            transactions are displayed below for transparency.
          </p>

          <button onClick={handleClick} className="cta_button 2xl:text-lg">
            Check on BscScan
          </button>
        </div>

        <div className="md:w-1/2 flex items-center justify-center relative isolate">
          <div className="flex items-start gap-3 p-8 z-[1] rounded-xl border-2 border-[#8d8f93] bg-[rgba(255,255,255,0.14)] backdrop-blur-sm">
            <Image src={fire} alt="fire" width={50} height={50} />
            <div className="flex flex-col gap-3 items-start">
              {isLoading ? (
                <div className="bg-gray-600 animate-pulse h-10 w-10/12 rounded"></div>
              ) : (
                <h1 className="text-white text-4xl font-bold 2xl:text-5xl">
                  {formatNumber(Number(totalBurned))}
                </h1>
              )}

              <p className="opacity-60 text-white font-semibold text-lg 2xl:text-xl">
                Tokens Burned
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-4 md:p-8 z-[1]">
        <div className="overflow-x-auto">
          <table className="w-full 2xl:text-lg">
            <thead>
              <tr className="bg-[#F3F3F3] bg-opacity-20">
                {table.headers.map((header, index) => (
                  <th
                    key={index}
                    className={`text-white px-4 ${
                      index === 0
                        ? "rounded-[10px_0_0_10px]"
                        : index === table.headers.length - 1
                        ? "rounded-[0_10px_10px_0]"
                        : ""
                    } text-left p-2`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(5)
                    .fill(null)
                    .map((_, index) => (
                      <tr key={index} className="text-white animate-pulse">
                        <td className="p-4">
                          <div className="bg-gray-600 h-6 w-10 rounded"></div>
                        </td>
                        <td className="p-4">
                          <div className="bg-gray-600 h-6 w-28 rounded"></div>
                        </td>
                        <td className="p-4">
                          <div className="bg-gray-600 h-6 w-24 rounded"></div>
                        </td>
                        <td className="p-4">
                          <div className="bg-gray-600 h-6 w-20 rounded"></div>
                        </td>
                        <td className="p-4">
                          <div className="bg-gray-600 h-8 w-16 rounded"></div>
                        </td>
                      </tr>
                    ))
                : burnHistory?.map((row, index) => (
                    <tr
                      key={index}
                      className={`text-white ${
                        index < table.data.length
                          ? "border-b border-b-[#FFFFFF30]"
                          : ""
                      }`}
                    >
                      <td className="p-4">{index + 1}</td>
                      <td className="p-4">{`${row.source?.slice(
                        0,
                        8
                      )}....${row.source?.slice(-4)}`}</td>
                      <td className="p-4">{row.date}</td>
                      <td className="p-4">
                        {Number(getEthFrom(row.value)).toLocaleString()} STAY
                      </td>
                      <td className="p-4">
                        <button
                          className="flex cursor-default items-center p-4 py-[2px] text-sm font-medium rounded-full"
                          style={{
                            background:
                              "linear-gradient(180deg, #FF6445 0%, #FF9E43 100%)",
                          }}
                        >
                          <span className="text-[12px] text-white">Burned</span>
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Incinerator;
