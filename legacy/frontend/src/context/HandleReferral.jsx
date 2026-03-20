"use client";
import { useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { useNfstayContext } from "./NfstayContext";

const HandleReferral = () => {
  const searchParams = useSearchParams();
  const { connectedAddress } = useNfstayContext();

  useEffect(() => {
    const referral = searchParams.get("referral")?.toLowerCase();
    const wallet = connectedAddress?.toLowerCase();
    const storedReferral = localStorage.getItem("referral")?.toLowerCase();
    console.log("🚀 ~ HandleReferral ~ storedReferral:", storedReferral)

    // Step 1: If referral exists and wallet is not connected, store referral
    if (referral && !wallet && !storedReferral) {
      localStorage.setItem("referral", referral);
      return;
    }

    // Step 2: If wallet becomes available
    console.log("🚀 ~ HandleReferral ~ wallet:", storedReferral === wallet)
    if (wallet) {
      // If stored referral matches wallet, remove it
      if (storedReferral && storedReferral === wallet)
        localStorage.removeItem("referral");


      // If referral in URL is different than wallet, update stored referral
      if (referral && referral !== wallet)
        localStorage.setItem("referral", referral);

    }
  }, [searchParams, connectedAddress]);

  return null;
};

export default HandleReferral;
