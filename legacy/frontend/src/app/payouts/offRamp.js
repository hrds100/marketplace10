"use client";
import React, { useState, useRef, useEffect } from "react";
import { Transak } from "@transak/transak-sdk";
import { NotifyError, NotifySuccess } from "@/context/helper";

const OffRamp = () => {
  const [showModal, setShowModal] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null); // "created" | "success" | null
  const transakRef = useRef(null);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (transakRef.current) {
        transakRef.current.close();
      }
    };
  }, []);

  const openTransakStream = () => {
    // Close any existing instance
    if (transakRef.current) {
      transakRef.current.close();
    }

    setLoading(true);
    setWalletAddress(null);
    setOrderStatus(null);

    const transak = new Transak({
      apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY,
      environment: Transak.ENVIRONMENTS.PRODUCTION,
      isTransakStreamOffRamp: true,
      cryptoCurrencyCode: "USDC",
      network: "BSC",
      referrerDomain: typeof window !== 'undefined' ? window.location.hostname : '',
    });

    // Store reference for cleanup
    transakRef.current = transak;

    // Event handlers
    const handleOrderCreated = (orderData) => {
      setOrderStatus("created");
      NotifySuccess("Order has been created.");
      console.log("ORDER_CREATED:", orderData);
    };

    const handleOrderSuccessful = (orderData) => {
      setOrderStatus("success");
      NotifySuccess("Order completed successfully!");
      console.log("ORDER_SUCCESSFUL:", orderData);
    };

    const handleWidgetClose = (eventData) => {
      console.log("Widget closed - Full eventData:", JSON.stringify(eventData, null, 2));
      transak.close();
      transakRef.current = null;
      setLoading(false);
      setShowModal(true);

      // Check multiple possible locations for the wallet address
      const walletAddr = eventData?.offRampStreamWalletAddress
        || eventData?.data?.offRampStreamWalletAddress
        || eventData?.streamWalletAddress
        || eventData?.data?.streamWalletAddress;

      if (walletAddr) {
        setWalletAddress(walletAddr);
      } else {
        console.error("No wallet address found in eventData:", eventData);
        NotifyError("No deposit wallet address returned.");
      }
    };

    // Use static Transak.on() method (SDK uses static event emitter)
    Transak.on(Transak.EVENTS.ORDER_CREATED, handleOrderCreated);
    Transak.on(Transak.EVENTS.ORDER_SUCCESSFUL, handleOrderSuccessful);
    Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, handleWidgetClose);

    transak.init();
  };

  return (
    <>
      <button
        onClick={openTransakStream}
        disabled={loading}
        className="px-4 py-2 bg-[#954AFC] hover:bg-[#7A36C7] rounded-full text-white text-sm font-semibold transition-all"
      >
        {loading ? "Opening..." : "Off-Ramp"}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              onClick={() => setShowModal(false)}
              aria-label="Close modal"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Transak Off-Ramp Stream
            </h2>

            {!walletAddress && (
              <p className="text-gray-600 mb-4">
                The Transak widget was closed. If you want to proceed with your
                off-ramp, you need to send your USDC to the Transak deposit address
                that will appear here.
              </p>
            )}

            {walletAddress && (
              <>
                <p className="text-sm text-gray-700 mb-2">
                  Send your <strong>USDC (BSC)</strong> to the{" "}
                  <strong>Transak deposit address below</strong> to begin your
                  off-ramp:
                </p>
                <div className="bg-gray-100 rounded-md p-3 break-all text-gray-800 text-sm mb-4">
                  {walletAddress}
                </div>
              </>
            )}

            {orderStatus === "created" && (
              <p className="text-blue-600 font-medium mb-2">
                Order created. You can proceed with your transfer.
              </p>
            )}
            {orderStatus === "success" && (
              <p className="text-green-600 font-semibold mb-2">
                🎉 Order completed successfully! Check your bank account soon.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default OffRamp;
