"use client";
import { useState, useRef, useEffect } from "react";
import { Chart } from "chart.js/auto";
import { aggregateRevenue, formatNumber } from "@/context/helper";

const Revenue = ({ data, totalRevenue, loading }) => {
  const [currentFilter, setCurrentFilter] = useState("M");
  const chartRef = useRef(null);

  const filters = ["D", "W", "M", "Y", "ALL"];

  useEffect(() => {
    if (chartRef.current && !loading) {
      if (chartRef.current.chart) {
        chartRef.current.chart.destroy();
      }

      const { aggregatedData, labels } = aggregateRevenue(data, currentFilter);
      const ctx = chartRef.current.getContext("2d");

      const newChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Revenue $",
              data: aggregatedData,
              fill: true,
              backgroundColor: "#efeeff",
              borderColor: "#954AFC",
              borderRadius: 10,
              pointRadius: 0,
              barThickness: 50,
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          scales: {
            y: {
              display: false, // Hide Y-axis
              grid: {
                display: false, // Hide Y-axis gridlines
              },
            },
            x: {
              grid: {
                display: false, // Hide X-axis gridlines
              },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.raw;
                  return `$${value.toLocaleString()}`; // Format tooltip values as currency
                },
              },
            },
            legend: {
              display: false,
            },
          },
        },
      });

      chartRef.current.chart = newChart;
    }
  }, [currentFilter, data, loading]);

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg shadow border w-full">
      <div className="flex flex-col w-full gap-3">
        <div className="flex flex-col md:flex-row gap-7 items-center justify-between">
          <div className="flex flex-col w-full sm:w-fit gap-3">
            <h1 className="font-semibold text-sm text-[#0C0839] opacity-80 2xl:text-xl">
              Total Revenue
            </h1>
            <div className="flex gap-2">
              {loading ? (
                // Skeleton loader for the revenue value
                <div className="w-32 h-6 bg-gray-300 animate-pulse rounded-full"></div>
              ) : (
                // Actual content for revenue when data is available
                <h2 className="font-bold text-3xl 2xl:text-4xl">
                  ${formatNumber(totalRevenue)}
                </h2>
              )}
            </div>
          </div>

          {/* Skeleton for filter buttons */}
          <div className="flex items-center gap-8 flex-wrap">
            {loading ? (
              <div className="flex flex-wrap gap-2">
                <div className="w-20 h-8 bg-gray-300 animate-pulse rounded-md" />
                <div className="w-20 h-8 bg-gray-300 animate-pulse rounded-md" />
                <div className="w-20 h-8 bg-gray-300 animate-pulse rounded-md" />
                <div className="w-20 h-8 bg-gray-300 animate-pulse rounded-md" />
                <div className="w-20 h-8 bg-gray-300 animate-pulse rounded-md" />
              </div>
            ) : (
              filters.map((filter, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFilter(filter)}
                  className={`px-3 py-1 rounded text-sm font-medium 2xl:text-base ${
                    currentFilter === filter
                      ? "bg-[#954AFC] text-white"
                      : "text-black bg-white"
                  } transition-all`}
                >
                  {filter}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Skeleton for chart area */}
        {loading ? (
          <div className="w-full h-44 bg-gray-300 animate-pulse rounded-lg" />
        ) : (
          <div className="flex overflow-x-auto h-44 relative">
            <canvas ref={chartRef}></canvas>
          </div>
        )}
      </div>
    </div>
  );
};

export default Revenue;
