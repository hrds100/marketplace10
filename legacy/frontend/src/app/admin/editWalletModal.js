"use client";
import Modal from "@/utils/modal";
import ModalHeader from "@/utils/modalHeader";
import { useEffect, useState } from "react";
import edit from "../images/edit.jpg";
import Image from "next/image";
import { BACKEND_BASEURL } from "@/config";
import axios from "axios";
import { useNfstayContext } from "@/context/NfstayContext";
import { NotifyError, NotifySuccess } from "@/context/helper";

const EditWalletModal = ({
  refetchData,
  isCompleteLoading,
  record,
  isSubLoading,
}) => {
  const { signMessage } = useNfstayContext();
  const [fields, setFields] = useState({
    orderId: 0,
    propertyId: 0,
    walletAddress: "",
    agentAddress: "",
  });
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);

  useEffect(() => {
    if (record) {
      setFields({
        orderId: record?.orderId,
        propertyId: record?.propertyId,
        walletAddress: record?.walletAddress,
        agentAddress: record?.agentAddress,
      });
    }
  }, [record?.walletAddress]);

  // Function to update the wallet address
  const updateWalletAddress = async (
    orderId,
    propertyId,
    walletAddress,
    agentAddress
  ) => {
    try {
      // Get the signed message and signature
      const { message, signature } = await signMessage();

      // Make the PATCH request with the signed message and signature in the body
      const response = await axios.patch(`${BACKEND_BASEURL}/admin/order`, {
        orderId,
        propertyId,
        walletAddress,
        agentAddress,
        message, // Include the message in the request body
        signature, // Include the signature in the request body
      });

      return response.data.message; // Return the response data
    } catch (error) {
      throw error; // Re-throw the error for handling in the component
    }
  };

  const handleConfirmEditWallet = async (
    orderId,
    propertyId,
    walletAddress,
    agentAddress
  ) => {
    setIsConfirming(true);
    setIsApprovalLoading(true);

    try {
      // Call the API to update the wallet address
      const response = await updateWalletAddress(
        orderId,
        propertyId,
        walletAddress,
        agentAddress
      );
      await refetchData();
      NotifySuccess(response);
      await refetchData();
    } catch (error) {
      NotifyError(error.response ? error.response.data.message : error.message);
    } finally {
      setIsConfirming(false);
      setIsApprovalLoading(false);
      setOpen(false);
      // setWallet(record?.walletAddress);
    }
  };
  const handleClose = () => {
    setOpen(false);
  };
  return (
    <>
      <button
        disabled={isCompleteLoading || isSubLoading}
        onClick={() => setOpen(true)}
        className="font-bold shrink-0 border-none outline-none p-1.5 hover:bg-gray-200 rounded-md transition-all disabled:opacity-60 disabled:cursor-not-allowed "
      >
        <Image
          src={edit}
          width={35}
          height={35}
          className="mix-blend-multiply"
          alt="edit"
        />
      </button>
      <Modal open={open} handleClose={handleClose} max="max-w-xl">
        <div className="flex flex-col w-full p-4 gap-5 ">
          <ModalHeader title={"Update details"} handleClose={handleClose} />
          <div className="flex flex-col gap-8 overflow-y-auto max-h-[85vh]">
            <div className="flex flex-col gap-3">
              <h2 className="uppercase opacity-60">Order ID</h2>
              <input
                className="p-4 rounded-lg text-[#0C0839] bg-[#0C08390A] font-medium whitespace-pre-line"
                value={fields?.orderId}
                disabled={true}
              />
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="uppercase opacity-60">Property ID</h2>
              <input
                className="p-4 rounded-lg text-[#0C0839] bg-[#0C08390A] font-medium whitespace-pre-line"
                value={fields?.propertyId}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, propertyId: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="uppercase opacity-60">Wallet Address</h2>
              <input
                className="p-4 rounded-lg text-[#0C0839] bg-[#0C08390A] font-medium whitespace-pre-line"
                value={fields?.walletAddress}
                onChange={(e) =>
                  setFields((prev) => ({
                    ...prev,
                    walletAddress: e.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="uppercase opacity-60">Agent Address</h2>
              <input
                className="p-4 rounded-lg text-[#0C0839] bg-[#0C08390A] font-medium whitespace-pre-line"
                value={fields.agentAddress}
                onChange={(e) =>
                  setFields((prev) => ({
                    ...prev,
                    agentAddress: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-5">
              {/* cancel button with outline border */}
              <button
                className="border-2  px-5 py-2.5 rounded-full h-fit flex-1  font-medium "
                onClick={handleClose}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  handleConfirmEditWallet(
                    fields?.orderId,
                    fields?.propertyId,
                    fields?.walletAddress,
                    fields?.agentAddress
                  )
                }
                className="btn_primary_gradient disabled:cursor-not-allowed disabled:opacity-60 flex-1 text-white whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center gap-2"
                disabled={isConfirming}
              >
                {/* Conditionally render loader or button text */}
                {isConfirming ? (
                  <>
                    {" "}
                    <div className="w-5 h-5 border-4 border-t-[4px]  border-t-white rounded-full animate-spin"></div>{" "}
                    {isApprovalLoading ? "Confirming..." : "Confirm"}
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EditWalletModal;
