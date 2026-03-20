"use client";
import { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js/auto";
import "chartjs-adapter-luxon";

const StayValueGraph = () => {
  const chartRef = useRef(null);
  const [currentFilter, setCurrentFilter] = useState("7D");
  const [chartData, setChartData] = useState([]);
  const coinGeckoApi = "CG-Dm77JnkKntWqUcF9AoaZskEL";

  const getStayChart = async (duration = "24H") => {
    let days = 1;
    if (duration === "7D") {
      days = 7;
    } else if (duration === "1M") {
      days = 30;
    } else if (duration === "6M") {
      days = 180;
    } else if (duration === "1Y") {
      days = 365;
    }

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": coinGeckoApi,
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

      const timeUnit = currentFilter === "24H" ? "hour" : "day"; // Show hours for 24H, days otherwise
      const displayFormats =
        currentFilter === "7D"
          ? {
              day: "EEEE", // Display full day names (e.g., Monday)
            }
          : currentFilter === "24H"
          ? {
              hour: "HH:mm", // Display hours and minutes for 24H
            }
          : {
              day: "MMM D", // Default to short day format
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
              tension: 0.1,
            },
          ],
        },
        options: {
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  const value = tooltipItem.raw.y;
                  return `$${value.toFixed(4)}`; // Show the value in tooltip
                },
              },
              mode: "index",
              intersect: false,
            },
          },
          maintainAspectRatio: false,
          scales: {
            x: {
              type: "time", // Use 'time' scale for the x-axis
              time: {
                unit: timeUnit, // Set unit based on filter
                tooltipFormat:
                  timeUnit === "hour" ? "MMM D, HH:mm" : "EEEE, MMM D", // Format for tooltip
                displayFormats: displayFormats, // Display formats for x-axis labels
              },
              title: {
                display: true,
                text: currentFilter === "24H" ? "Hours" : "Days of the Week",
              },
            },
            y: {
              ticks: { stepSize: 0.0005 },
              beginAtZero: true,
              title: {
                display: true,
                text: "Amount in $",
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
    getStayChart(currentFilter); // Fetch chart data whenever the filter changes
  }, [currentFilter]);

  useEffect(() => {
    if (chartData.length) {
      updateChart(); // Update the chart whenever new data is fetched
    }
  }, [chartData]);

  const filters = ["24H", "7D", "1M", "6M", "1Y"];

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg shadow border">
      <div className="flex flex-col w-full gap-3">
        <div className="flex flex-col md:flex-row gap-7 items-center justify-between">
          <div className="flex flex-col w-full sm:w-fit sm:flex-row sm:items-center gap-4">
            <h1 className="font-semibold text-xl">STAY VALUE</h1>
            <div className="flex">
              <h2 className="font-bold text-xl">$0.0008</h2>
              <span className="px-4 py-1.5 rounded-full text-[#27AE60] bg-[#6FCF971A]">
                +10.6%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-8 flex-wrap">
            {filters.map((filter, index) => (
              <button
                key={index}
                onClick={() => setCurrentFilter(filter)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  currentFilter === filter
                    ? "bg-[#954AFC] text-white"
                    : "text-black bg-white"
                } transition-all`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center">
          <h1 className="font-extrabold text-3xl">$0.021</h1>
        </div>
        <div className="flex h-64 relative">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </div>
  );
};

export default StayValueGraph;
