"use client";

import { useEffect, useState } from "react";

import ShowPagination from "@/utils/showPagination";
import { Skeleton } from "../payouts/payoutRow";
import { EditFilled } from "@ant-design/icons";
import EditWalletModal from "./editWalletModal";
import { MdOutlineOpenInNew } from "react-icons/md";
import {
  NotifyError,
  NotifySuccess,
  shortenWalletAddress,
} from "@/context/helper";
import { BACKEND_BASEURL, BASEURL } from "@/config";
import axios from "axios";
import { useNfstayContext } from "@/context/NfstayContext";
import { getStatusColor } from "./ordersTable";

const Notifications = ({}) => {
  const { signMessage } = useNfstayContext();

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const sendNotification = async (title, body) => {
    try {
      setIsLoading(true);
      if (!title || !body) {
        throw new Error("Title and Body Must be Filled");
      }
      // Get the signed message and signature
      const { message, signature } = await signMessage();

      const redirectUrl = `${BASEURL}/payouts`;

      // Make the POST request with the signed message and signature in the body
      const response = await axios.post(
        `${BACKEND_BASEURL}/firebase/send-notification`, // Replace with your actual backend URL
        {
          title,
          body,
          redirectUrl,
          message, // Include the message in the request body
          signature, // Include the signature in the request body
        }
      );

      NotifySuccess(response.data.message);
      setTitle("")
      setBody("")
    } catch (error) {
      NotifyError(error.response ? error.response.data.message : error.message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex gap-5 flex-col justify-between ">
      <h4 className="text-title-lg font-bold text-black ">Notifications</h4>
      <label>Title</label>
      <input
        disabled={isLoading}
        type="text"
        placeholder="Rent Added!"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full max-w-md p-2 border rounded-lg"
      />
      <label>Body</label>

      <input
        disabled={isLoading}
        type="text"
        placeholder="Rent has been dispersed, kindly collect your rent.."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full max-w-md p-2 border rounded-lgF"
      />

      <button
        type="button"
        onClick={() => sendNotification(title, body)}
        disabled={isLoading}
        className="btn_primary_gradient  disabled:cursor-not-allowed disabled:opacity-55 w-full max-w-[15rem] text-white whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          "Send Notification"
        )}
      </button>
    </div>
  );
};

export default Notifications;
