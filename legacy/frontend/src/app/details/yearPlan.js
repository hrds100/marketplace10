"use client";
import { useState, useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { truncateAmount } from "@/context/helper";

const YearPlan = ({
  initialAmount,
  annualAppreciation,
  holdingPeriod,
  netDividendYield,
}) => {
  const chartRef = useRef(null);
  const [yearPlan, setYearPlan] = useState([]);

  // Function to calculate earnings for each year
  const calculateYearPlan = () => {
    let plan = [];
    let totalAmount = truncateAmount(
      String(
        initialAmount * (netDividendYield / 100) +
          initialAmount * (annualAppreciation / 100)
      )
    );
    for (let i = 1; i <= holdingPeriod; i++) {
      plan.push({
        year: i, // Start from Year 1
        totalAmount: totalAmount * i,
      });
    }

    return plan;
  };

  // Function to update the chart
  const updateChart = () => {
    if (chartRef.current) {
      if (chartRef.current.chart) {
        chartRef.current.chart.destroy();
      }

      const ctx = chartRef.current.getContext("2d");

      // Extract labels (years) and data (total amounts) for the chart
      const labels = yearPlan.map((data) =>
        data.year == 0 ? "Today" : `Year ${data.year}`
      );
      const data = yearPlan.map((data) => data.totalAmount);

      // Create a new chart
      const newChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Total Amount",
              data: data,
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
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: (tooltipItem) => {
                  const value = tooltipItem.raw;
                  return `$${value}`;
                },
              },
              mode: "index",
              intersect: false,
            },
          },
          maintainAspectRatio: false,
          scales: {
            y: {
              display: true,
              ticks: {
                callback: function (value) {
                  return `$${value.toLocaleString()}`;
                },
                stepSize: 20, // Adjust step size as needed
                maxTicksLimit: 6, // Restrict to 6 ticks
                font: {
                  size: 10,
                },
                padding: 10,
              },
              grid: {
                color: "#E5E5E5",
              },
            },
            x: {
              border: {
                dash: [6, 6],
              },
              ticks: {
                font: {
                  size: 10,
                },
                padding: 15,
              },
              title: {
                display: false,
                text: "Year",
              },
            },
          },
        },
      });

      chartRef.current.chart = newChart;
    }
  };

  // Calculate the year plan and update the chart when component mounts
  useEffect(() => {
    const plan = calculateYearPlan();
    setYearPlan(plan);
  }, [initialAmount]);

  // Update the chart whenever yearPlan changes
  useEffect(() => {
    if (yearPlan.length > 0) {
      updateChart();
    }
  }, [yearPlan]);

  return (
    <div className="flex w-full h-52 relative ">
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default YearPlan;
