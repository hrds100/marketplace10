"use client";

import { usenfstayContext } from "@/context/nfstayContext";
import React from "react";

const IOSNotificationModal = () => {
  const { isIOS, setIsIOS, addFCMToken, connectedAddress } = usenfstayContext();
  if (!isIOS) return null;

  const handleClick = async () => {
    await addFCMToken(connectedAddress);
    setIsIOS(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm ">
      <div
        className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm overflow-auto"
        aria-modal="true"
        role="dialog"
      >
        <p className="mb-6 text-lg text-center">
          Click here to enable notifications
        </p>
        <div className="flex justify-end">
          <button
            onClick={handleClick}
            className="mt-4 btn_primary_gradient text-white w-full disabled:cursor-not-allowed whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium"
          >
            Enable Notifications
          </button>
        </div>
      </div>
    </div>
  );
};

export default IOSNotificationModal;
