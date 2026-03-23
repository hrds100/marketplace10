"use client";
import { formatNumber, getEthFrom } from "@/context/helper";
import { usenfstayContext } from "@/context/nfstayContext";
import { Chart } from "chart.js/auto";
import { useRef, useEffect, useState } from "react";

const Holidays = ({
  isPropertyLoading,
  isLoading,
  lpValue,
  propertyValue,
  stayValue,
  totalPortfolioValue,
}) => {
  const chartRef = useRef(null);
  const { isBalanceLoading, globalLoading } = usenfstayContext();

  const [data, setData] = useState([]);

  useEffect(() => {
    setData([
      {
        label: "LP Token",
        data: lpValue,
        color: "#5F90D1",
      },

      {
        label: "Shares",
        data: propertyValue,
        color: "black",
      },
      {
        label: "STAY",
        data: stayValue,
        color: "#9945FF",
      },
    ]);
  }, [lpValue, propertyValue, stayValue]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartRef.current.chart) chartRef.current.chart.destroy();
    const ctx = document.getElementById("holidaysChart").getContext("2d");

    const holidaysChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        datasets: [
          {
            label: "Holidays Breakdown",
            data: data.map((item) => item.data),
            backgroundColor: data.map((item) => item.color),
            hoverOffset: 4,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: false, // Hide legend
          },
          tooltip: {
            callbacks: {
              label: function (tooltipItem) {
                const label = data[tooltipItem.dataIndex].label; // Get the label for this section
                const value = tooltipItem.raw; // Get the raw value
                return `${label}: ${value}%`; // Format label with percentage
              },
            },
          },
        },
      },
    });
    chartRef.current.chart = holidaysChart;
  }, [!isLoading, data]);

  return (
    <div className="flex flex-col gap-5 border rounded-lg shadow">
      <div className="w-full flex items-center justify-between border-b-2 p-4">
        <h4 className="text-lg font-bold text-black 2xl:text-2xl">
          Total Holdings
        </h4>
        {isLoading || isBalanceLoading || globalLoading || isPropertyLoading ? (
          <div className="h-6 bg-gray-300 rounded w-20"></div> // Skeleton loader
        ) : (
          <h4 className="text-lg font-bold text-[#0C0839] opacity-60 2xl:text-2xl">
            ${formatNumber(totalPortfolioValue)}
          </h4>
        )}
      </div>
      <div className="flex flex-col p-8 gap-5">
        {isLoading || isBalanceLoading || globalLoading || isPropertyLoading ? (
          // Skeleton for the chart
          <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-full max-w-52 self-center h-28 w-28">
            <div className="h-16 w-16 bg-gray-300 rounded-full"></div>
          </div>
        ) : (
          <div className="flex flex-col p-8 gap-5">
            {totalPortfolioValue > 0 ? (
              <div className="p-4 bg-[#ECEEFB] rounded-full max-w-52 self-center">
                <canvas id="holidaysChart" ref={chartRef}></canvas>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-full max-w-52 self-center h-28 w-28">
                <p className="text-gray-500 text-sm font-medium text-center">
                  No data available
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 px-12">
          {isLoading || isBalanceLoading || globalLoading || isPropertyLoading // Skeleton for the data list
            ? Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between animate-pulse"
                >
                  <div className="flex items-center gap-2 2xl:text-lg">
                    <div className="w-3.5 h-3.5 bg-gray-300 rounded-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                  </div>
                  <div className="h-4 bg-gray-300 rounded w-10"></div>
                </div>
              ))
            : data.map((item, key) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 2xl:text-lg">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ border: `3px solid ${item.color}` }}
                    ></div>
                    <p className="text-black opacity-60 font-medium">
                      {item.label}
                    </p>
                  </div>
                  <p
                    className={`font-bold 2xl:text-lg`}
                    style={{ color: item.color }}
                  >
                    {item.data}%
                  </p>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

export default Holidays;
