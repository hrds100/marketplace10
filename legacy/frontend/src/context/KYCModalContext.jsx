"use client";
import axios from "axios";
import { createContext, useContext, useState, useEffect } from "react";
import { BACKEND_BASEURL } from "@/config";
import { useNfstayContext } from "@/context/NfstayContext";
const KYCModalContext = createContext(undefined);
import { MESSAGES } from "@veriff/incontext-sdk";

export const KYCModalProvider = ({ children }) => {
  const [showModal, setShowModal] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const [isRegistered, setIsRegistered] = useState(false);
  const [kycStatus, setKycStatus] = useState(null);
  const [kycAccessToken, setKycAccessToken] = useState("");
  const { connectedAddress, getRwaContract } = useNfstayContext();

  const openModal = (_showClose = false) => {
    setShowClose(_showClose);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  // const applicantStatus = async (id) => {
  //   try {
  //     const _data = await axios.get(
  //       `${BACKEND_BASEURL}/kyc/getapplicantstatus/`,
  //       {
  //         params: {
  //           applicantId: id,
  //         },
  //       }
  //     );
  //     return _data.data.reviewStatus;
  //   } catch (error) {
  //     return "";
  //   }
  // };

  // const getApplicantId = async (_account) => {
  //   try {
  //     const _data = await axios.get(`${BACKEND_BASEURL}/kyc/getApplicant/`, {
  //       params: {
  //         externalUserId: _account,
  //       },
  //     });

  //     return _data.data.applicantId;
  //   } catch (error) {
  //     return null;
  //   }
  // };

  // const kycVerification = async (_account) => {
  //   let obj = {
  //     externalUserId: _account,
  //   };
  //   try {
  //     const _data = await axios.post(
  //       `${BACKEND_BASEURL}/kyc/kycverification/`,
  //       obj
  //     );
  //     if (_data.status === 200) setKycAccessToken(_data?.response.token);
  //     else setKycAccessToken("");
  //   } catch (err) {
  //     setKycAccessToken("");
  //     console.log(err);
  //   }
  // };

  // const generateAccessToken = async (_account) => {
  //   let obj = {
  //     externalUserId: _account,
  //   };
  //   try {
  //     const _data = await axios.post(
  //       `${BACKEND_BASEURL}/kyc/generateAccessToken/`,
  //       obj
  //     );

  //     return _data.data.token;
  //   } catch (err) {
  //     console.log(err);
  //     return "";
  //   }
  // };

  // const handleKYC = async (account) => {
  //   try {
  //     setKycAccessToken(""); // Reset token
  //     const _account = account.toLowerCase();

  //     // Get the user applicant ID
  //     const userApplicantId = await getApplicantId(_account);

  //     // Check the user's status
  //     const userStatus = await applicantStatus(userApplicantId);
  //     setKycStatus(userStatus);

  //     // If the status is "notFound" and user is registered, initiate KYC verification
  //     if (userStatus === "notFound") {
  //       await kycVerification(_account);
  //     } else {
  //       // Generate access token if KYC is already initiated
  //       const accessToken = await generateAccessToken(_account);
  //       setKycAccessToken(accessToken);
  //     }
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

  // useEffect(() => {
  //   const fetchData = async () => {
  //     // Prevents unnecessary calls if already set
  //     const userApplicantId = await getApplicantId(
  //       connectedAddress.toLowerCase()
  //     );
  //     const userStatus = await applicantStatus(userApplicantId);
  //     setKycStatus(userStatus);
  //   };

  //   if (connectedAddress && !kycStatus) {
  //     // Ensures it runs only when needed
  //     fetchData();
  //   }
  // }, [connectedAddress, kycStatus]);

  const checkUserRegistration = async (_account) => {
    const contract = getRwaContract();
    const _isRegistered = await contract.isRegistered(_account);
    setIsRegistered(_isRegistered);
  };

  const checkWalletInDb = async (address) => {
    try {
      const response = await axios.get(
        `${BACKEND_BASEURL}/kyc/check-wallet/${address}`
      );
      if (response.data.sessionId) {
        checkKycStatus(response.data.sessionId);
      } else {
        setKycStatus("not_verified");
      }
    } catch (error) {
      // console.error("Wallet not registered");
      setKycStatus("not_registered");
    }
  };

  const checkKycStatus = async (sessionId) => {
    try {
      const response = await axios.get(
        `${BACKEND_BASEURL}/kyc/kyc-status/${sessionId}`
      );
      if (response?.data?.status === "approved") {
        setKycStatus("approved");
      } else {
        setKycStatus("not_verified");
      }
    } catch (error) {
      console.error("Error checking KYC status", error);
      setKycStatus("not_verified");
    }
  };

  const startVerification = async (address) => {
    try {
      const script1 = document.createElement("script");
      script1.src = "https://cdn.veriff.me/sdk/js/1.5/veriff.min.js";
      script1.async = true;
      document.body.appendChild(script1);

      const script2 = document.createElement("script");
      script2.src = "https://cdn.veriff.me/incontext/js/v1/veriff.js";
      script2.async = true;
      document.body.appendChild(script2);

      script2.onload = () => {
        if (window.Veriff) {
          const veriff = window.Veriff({
            host: "https://stationapi.veriff.com",
            apiKey: process.env.NEXT_PUBLIC_VERIFF_API_KEY,
            parentId: "veriff-root",
            onSession: async (err, response) => {
              if (!err) {
                try {
                  await axios.post(`${BACKEND_BASEURL}/kyc/save-session`, {
                    walletAddress: address,
                    sessionId: response.verification.id,
                  });
                  window.veriffSDK.createVeriffFrame({
                    url: response.verification.url,
                    onEvent: function (msg) {
                      switch (msg) {
                        case MESSAGES.FINISHED:
                          closeModal();
                          checkKycStatus(response.verification.id);
                          break;
                      }
                    },
                  });
                } catch (err) {
                  console.log(err);
                }
              }
            },
          });

          veriff.setParams({
            person: { givenName: " ", lastName: " " },
            vendorData: address,
          });

          veriff.mount();
        }
      };
    } catch (err) {
      console.log(err);
    }
  };

  const initiateKYC = async (address) => {
    try {
      await checkUserRegistration(address);
      await checkWalletInDb(address);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (!connectedAddress) return; 
    initiateKYC(connectedAddress.toLowerCase());
  }, [connectedAddress, kycStatus]);
  
  useEffect(() => {
    // Don’t run modal logic until kycStatus is resolved
    if (kycStatus === null || kycStatus === undefined) return;

    if (connectedAddress && isRegistered && kycStatus !== "approved") {
      openModal();
    } else {
      closeModal();
    }
  }, [connectedAddress, kycStatus, isRegistered]);

  return (
    <KYCModalContext.Provider
      value={{
        showModal,
        openModal,
        closeModal,
        // kycStatus,
        // kycAccessToken,
        initiateKYC,
        checkWalletInDb,
        startVerification,
        checkKycStatus,
        kycStatus,
        showClose,
        isRegistered,
        checkUserRegistration
      }}
    >
      {children}
    </KYCModalContext.Provider>
  );
};

export const useKYCContext = () => {
  const context = useContext(KYCModalContext);
  if (!context) {
    throw new Error("useKYCContext must be used within a KYCModalProvider");
  }
  return context;
};
