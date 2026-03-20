"use client";
import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js/auto";
import "chartjs-adapter-luxon";
import { CONTRACT_CONFIG } from "@/config";

const Graph = () => {
  const chartRef = useRef(null);
  const [currentFilter, setCurrentFilter] = useState("24H");
  const [chartData, setChartData] = useState([]);

  const getStayChart = async (duration = "24H") => {
    let days;
    if (duration === "7D") {
      days = 7;
    } else if (duration === "30D") {
      days = 30;
    } else if (duration === "1Y") {
      days = 365;
    } else if (duration === "ALL") {
      days = "max";
    } else {
      days = 1; // Default to 1 day for 24H
    }

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": CONTRACT_CONFIG.coinGeckoApiKey,
      },
    };

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/nfstay/market_chart?vs_currency=usd&days=${days}&precision=4`,
        options
      );
      const data = await response.json();
      const formattedData = data.prices.map(([timestamp, value]) => ({
        x: new Date(timestamp),
        y: value,
      }));
      setChartData(formattedData); // Set the fetched data
    } catch (error) {
      console.error(error);
    }
  };

  const updateChart = () => {
    if (chartRef.current) {
      if (chartRef.current.chart) {
        chartRef.current.chart.destroy();
      }

      const ctx = chartRef.current.getContext("2d");

      const timeUnit = currentFilter === "24H" ? "hour" : "day";
      const displayFormats =
        currentFilter === "7D"
          ? {
              day: "EEEE",
            }
          : currentFilter === "24H"
          ? {
              hour: "HH:mm",
            }
          : {
              day: "MMM D",
              month: "MMM YYYY",
            };

      const newChart = new Chart(ctx, {
        type: "line",
        data: {
          datasets: [
            {
              label: "Stay Value",
              data: chartData,
              fill: true,
              backgroundColor: "#efeeff",
              borderColor: "#954AFC",
              pointRadius: 0,
              tension: 0.4,
            },
          ],
        },
        options: {
          plugins: {
            legend: { display: false }, // Keep legend hidden
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  const value = tooltipItem.raw.y;
                  return `$${value.toFixed(4)}`; // Format tooltip price as currency
                },
              },
              mode: "index",
              intersect: false,
            },
          },
          maintainAspectRatio: false,
          scales: {
            x: {
              type: "time",
              time: {
                unit: timeUnit, // "hour" for 24H, "day" for other filters
                tooltipFormat: timeUnit === "hour" ? "MMM D, HH:mm" : "MMM D",
                displayFormats: displayFormats,
              },
              ticks: {
                autoSkip: true, // Allow automatic skipping
                maxTicksLimit: 6, // Ensure only 6 labels are shown
              },
              grid: { display: false },
            },

            y: {
              beginAtZero: false, // Dynamically adjust the Y-axis
              ticks: {
                callback: (value) => `$${value.toFixed(4)}`, // Format Y-axis labels as currency
              },
              grid: { display: false },
            },
          },
        },
      });

      chartRef.current.chart = newChart;
    }
  };

  useEffect(() => {
    getStayChart(currentFilter);
  }, [currentFilter]);

  useEffect(() => {
    if (chartData.length) {
      updateChart();
    }
  }, [chartData]);

  return (
    <div className="flex flex-col h-full relative rounded-lg overflow-hidden">
      {/* Filter Buttons */}
      <div className="flex justify-center mb-4">
        {["24H", "7D", "30D", "1Y", "ALL"].map((filter) => (
          <button
            key={filter}
            onClick={() => setCurrentFilter(filter)}
            className={`px-4 py-2 mx-2 ${
              currentFilter === filter
                ? "bg-purple-500 text-white"
                : "bg-gray-200 text-gray-800"
            } rounded-lg`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex h-full relative">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default Graph;
