import React, { useEffect } from "react";

const SharesSold = ({ sold, total }) => {
  const percentage = (parseFloat(sold) / parseFloat(total)) * 100;

  return (
    <div className="flex flex-col gap-2 py-2">
      {/* <h3 className='font-bold text-base'>
      {sold.toLocaleString()} of {total.toLocaleString()} Shares sold
    </h3> */}
      <div className="w-full h-3 rounded-full bg-[#F7F6FF] relative overflow-hidden">
        {/* <div
        className='absolute top-0 left-0 h-full '
        style={{
          borderRadius: '53px',
          width: `${(sold / total) * 100}%`,
          background: 'linear-gradient(90deg, #954AFC 0%, #E0CAFF 100%)'
        }}
      /> */}

        <div
          className="relative h-full  overflow-hidden"
          style={{
            width: `${percentage}%`,

            // Set width based on calculated progress
          }}
        >
          <div
            className="absolute top-0 left-0 h-full transition-slide"
            style={{
              borderRadius: "53px",
              background: "linear-gradient(90deg, #954AFC 0%, #E0CAFF 100%)",
            }}
          />
        </div>
        {/* <div
        className="absolute top-0 left-0 h-full bg-[#6C0CF0]"
        style={{ width: `${(sold / total) * 100}%` }}
      /> */}
      </div>
    </div>
  );
};

export default SharesSold;
