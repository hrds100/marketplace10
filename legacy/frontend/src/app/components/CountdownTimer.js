"use client";
import React, { useState, useEffect } from "react";

const CountdownTimer = () => {
  // Set a default expiration date 3 days from now
  const calculateExpiryTime = () => {
    const now = new Date();
    return now.setDate(now.getDate() + 3);
  };

  const [expiryTime] = useState(calculateExpiryTime());

  const calculateTimeLeft = () => {
    const currentTime = new Date().getTime();
    const difference = expiryTime - currentTime;

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

    return () => clearInterval(timer);
  }, [expiryTime]);

  const formatNumber = (num) => {
    return num.toString().padStart(2, "0");
  };

  return (
    <div className="w-fit mx-auto border border-[#9945FF] rounded-xl p-6 md:px-10 md:py-8 shadow-md">
      <h2 className="text-center text-[#0C0839] text-2xl md:text-3xl font-bold md:font-extrabold mb-6">
        This Offer Expires Soon!
      </h2>

      <div className="flex justify-center gap-3 md:gap-4">
        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-4xl font-bold md:font-extrabold text-[#9945FF]">
            {formatNumber(timeLeft.days)}
          </div>
          <div className="text-xs md:text-sm text-gray-500 uppercase mt-2">
            DAYS
          </div>
        </div>

        <span className="text-2xl md:text-4xl font-bold md:font-extrabold text-[#9945FF] pb-6">
          :
        </span>

        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-4xl font-bold md:font-extrabold text-[#9945FF]">
            {formatNumber(timeLeft.hours)}
          </div>
          <div className="text-xs md:text-sm text-gray-500 uppercase mt-2">
            HOURS
          </div>
        </div>

        <span className="text-2xl md:text-4xl font-bold md:font-extrabold text-[#9945FF] pb-6">
          :
        </span>

        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-4xl font-bold md:font-extrabold text-[#9945FF]">
            {formatNumber(timeLeft.minutes)}
          </div>
          <div className="text-xs md:text-sm text-gray-500 uppercase mt-2">
            MINUTES
          </div>
        </div>

        <span className="text-2xl md:text-4xl font-bold md:font-extrabold text-[#9945FF] pb-6">
          :
        </span>

        <div className="flex flex-col items-center">
          <div className="text-2xl md:text-4xl font-bold md:font-extrabold text-[#9945FF]">
            {formatNumber(timeLeft.seconds)}
          </div>
          <div className="text-xs md:text-sm text-gray-500 uppercase mt-2">
            SECONDS
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
