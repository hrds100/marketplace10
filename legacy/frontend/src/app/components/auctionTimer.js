"use client";
import React, { useState, useEffect } from "react";

const AuctionTimer = ({ saleEndTime }) => {
  const [isSaleOver] = useState(new Date().getTime() > saleEndTime * 1000);
  const calculateTimeLeft = () => {
    const endTime = saleEndTime * 1000; // Convert seconds to milliseconds
    const currentTime = new Date().getTime();
    const difference = endTime - currentTime;

    let timeLeft = {};
    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer); // Cleanup on component unmount
  }, [saleEndTime]);

  return (
    <div className="relative">
      
      <svg
        width="175"
        height="50"
        viewBox="0 0 206 53"
        className="2xl:w-[200px] 2xl:h-[55px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 53L0 45H8V53Z" fill="#6C0CF0" />
        <path
          d="M0 8C0 3.58172 3.58172 0 8 0H198C202.418 0 206 3.58172 206 8V37C206 41.4183 202.418 45 198 45H0V8Z"
          fill="#954AFC"
        />
      </svg>
      <div className="flex items-start flex-col w-full text-white absolute top-1/2 left-3 -translate-y-[55%]">
        <small className="text-[0.5rem] 2xl:text-xs">
          {isSaleOver ? "Sale Ended" : "Sale Ends In"}
        </small>

        <span className="font-bold text-sm 2xl:text-base">
          {timeLeft.days}:{timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
        </span>
      </div>
    </div>
  );
};

export default AuctionTimer;
