import Image from "next/image";
import React from "react";
import icon from "./favicon.ico";
const Loading = () => {
  return (
    <div className="min-w-screen min-h-screen flex justify-center items-center ">
      {/* <div className="w-24 h-24 border-2 border-t-[4px] border-t-[#3d4a6c] rounded-full animate-spin"></div> */}
      <Image
        src={icon}
        alt="Logo"
        width={20}
        height={10}
        className="animate-pulse"
      />
    </div>
  );
};

export default Loading;
