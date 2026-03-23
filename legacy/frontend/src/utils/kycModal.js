"use client";

import { useKYCContext } from "@/context/KYCModalContext";
import { usenfstayContext } from "@/context/nfstayContext";
import SumsubWebSdk from "@sumsub/websdk-react";
const KycModal = ({ children }) => {
  const { showModal, showClose, closeModal, startVerification } =
    useKYCContext();
  const { connectedAddress } = usenfstayContext();

  if (showModal) {
    startVerification(connectedAddress?.toLowerCase());
  } else {
    return children;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-50">
      <div
        className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center justify-center text-center w-full max-w-5xl relative"
        style={{
          width: "80%",
          height: "80%",
          overflowY: "auto", // To make the content scrollable
        }}
      >
        {/* Close Button */}
        {showClose && (
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            onClick={closeModal} // Replace this with your close function
          >
            ✖
          </button>
        )}

        <h2 className="text-xl font-semibold mb-4">KYC Verification</h2>
        <p className="mb-6">Complete the KYC in order to keep using nfstay.</p>
        <div id="veriff-root"></div>
      </div>
    </div>
  );
};

export default KycModal;
