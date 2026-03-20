'use client'
import Image from "next/image"
import round from "../images/round.webp"

import React, { useRef, useState } from 'react';

export const ShowHover = ({ text }) => {
  const buttonRef = useRef(null);
  const [tooltipStyle, setTooltipStyle] = useState({});

  const handleMouseEnter = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const tooltipWidth = 320; // Approximate width of the tooltip
      const tooltipHeight = 50; // Approximate height of the tooltip

      let left = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2;
      let top = buttonRect.bottom;

      // Prevent overflow on the left and right
      if (left < 0) {
        left = 0;
      } else if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth;
      }

      // Prevent overflow at the bottom
      if (top + tooltipHeight > window.innerHeight) {
        top = buttonRect.top - tooltipHeight + 2;
      }

      setTooltipStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
      });
    }
  };

  return (
    <button
      ref={buttonRef}
      className='flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold bg-white 2xl:text-lg relative group'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltipStyle({})}
    >
      {text}
      <svg
        width="18"
        height="19"
        className="2xl:w-[20px] 2xl:h-[20px]"
        viewBox="0 0 18 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 10.25V16.25L6 13.25"
          stroke="#954AFC"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 16.25L12 13.25"
          stroke="#954AFC"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.29477 11.9517C2.68222 11.4159 2.20264 10.7449 1.8939 9.99192C1.58516 9.2389 1.45571 8.42441 1.51579 7.61277C1.57586 6.80114 1.82381 6.01458 2.24006 5.31522C2.6563 4.61586 3.22943 4.02285 3.9142 3.58302C4.59897 3.14318 5.37662 2.86857 6.18574 2.78088C6.99486 2.69318 7.81329 2.79479 8.57639 3.07769C9.3395 3.36059 10.0264 3.81703 10.5828 4.41097C11.1392 5.0049 11.5499 5.72007 11.7825 6.49998H13.125C13.8541 6.49989 14.5635 6.73588 15.1473 7.17262C15.731 7.60937 16.1577 8.22341 16.3634 8.92284C16.569 9.62228 16.5427 10.3695 16.2883 11.0527C16.0339 11.7359 15.5651 12.3184 14.952 12.713"
          stroke="#954AFC"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="absolute z-[9999] bg-[#555555bd] transition-all p-2 px-3 text-xs sm:text-sm text-white rounded-lg whitespace-normal w-[16rem] sm:w-[20rem] max-w-[90vw]"
        style={{
          ...tooltipStyle,
          display: Object.keys(tooltipStyle).length === 0 ? 'none' : 'block',
        }}
      >
        Access to documentation is granted for Partners only
      </span>
    </button>
  );
};

const Documents = () => {
    return (
        <div className="flex items-center justify-center rounded-lg py-12 my-12 relative overflow-hidden bg-[#954AFC] isolate" >
            <div className="size-[532px] absolute opacity-50 -top-[213px] -left-[248px] -z-[1] mix-blend-screen">
                <Image
                    src={round}
                    width={500}
                    height={500}
                    alt="Property Documents"
                    className="max-w-full h-full"
                />

            </div>

            <div className="flex items-center flex-col justify-center gap-5 max-w-max ">
                <h1 className="text-3xl font-bold text-center text-white 2xl:text-4xl">Download Confidential documents</h1>
                <div className="flex items-center gap-5 flex-wrap justify-center">
                    <ShowHover text="Independent Property Report"/>
                    <ShowHover text="Independent Area Report"/>
                    <ShowHover text="Memorandum & Disclaimer"/>
                    <ShowHover text="Projections Report"/>
                </div>
            </div>

        </div>
    )
}

export default Documents