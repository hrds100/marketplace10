"use client";
import React, { useState, useEffect } from "react";

const RemainingTime = ({ voteEndTime }) => {
  const calculateTimeLeft = () => {
    // const endTime = new Date(voteEndTime).getTime();
    const currentTime = new Date().getTime();
    const difference = voteEndTime * 1000 - currentTime;

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
  }, [voteEndTime]);

  return (
    <div className="flex flex-col pb-3 border-b-2 gap-3">
      <h1 className="font-bold text-xl 2xl:text-3xl">
        {timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m :{" "}
        <span className="text-[#954AFC]">{timeLeft.seconds}s</span>
      </h1>
      <p className="text-base font-medium 2xl:text-lg">Time Remaining</p>
    </div>
  );
};

export default RemainingTime;
