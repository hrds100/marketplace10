"use client";

import Modal from "./modal";
import { useEffect, useRef, useState } from "react";
import logo from "../app/images/logo.png";
import particle from "../app/images/particle.png";
import Image from "next/image";
import google from "../app/images/google.png";
import discord from "../app/images/discord.png";
import apple from "../app/images/apple.png";
import x from "../app/images/x.png";
import f from "../app/images/f.png";
import { useConnect as useParticleConnect } from "@particle-network/authkit";
import { useModal } from "@particle-network/connectkit";
import { useNfstayContext } from "@/context/NfstayContext";
// import { usePathname } from "next/navigation";
const LoginPopup = () => {
  // const pathname = usePathname(); // Get the current path
  const { setOpen } = useModal();
  const { connect, connected } = useParticleConnect();
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isJiggle, setIsJiggle] = useState(false);
  const scrollRef = useRef();
  const {
    loginModelOpen,
    connectedAddress,
    setLoginModelOpen,
    isWalletLoading,
  } = useNfstayContext();

  useEffect(() => {
    if (!isWalletLoading && !connectedAddress) {
      setLoginModelOpen(true);
    }
  }, [connectedAddress, isWalletLoading]);
  const handleClose = () => {
    setLoginModelOpen(false);
  };

  useEffect(() => {
    if (loginModelOpen && scrollRef.current) {
      // Scroll to bottom when modal opens
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [loginModelOpen]);

  const handleSocialLogin = async (id) => {
    // const url = new URL(window.location.href);
    if (!isChecked) {
      setIsJiggle(true);
      setTimeout(() => {
        setIsJiggle(false);
      }, 500);
      return;
    }

    try {
      if (!connected) {
        setLoading(true);
        if (id === "email") {
          await connect({
            email: "",
          });
        } else if (id === "phone") {
          await connect({
            phone: "",
          });
        } else {
          await connect({
            socialType: id,
          });
        }
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleWeb3Wallet = () => {
    handleClose();
    setTimeout(() => {
      setOpen(true);
    }, 300);
  };

  return (
    <Modal open={loginModelOpen} max="max-w-md">
      <div className="flex flex-col gap-2 p-8 ">
        <div className="flex items-center justify-end"></div>
        <div
          ref={scrollRef}
          className="flex flex-col items-center  gap-8 max-h-[80vh] overflow-y-auto h-full"
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <Image src={logo} width={200} height={200} alt="Logo" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              className={`${
                (!isChecked || loading) && "cursor-not-allowed opacity-60"
              } border-black transition-all flex items-center gap-1 px-4 py-1.5 w-full justify-center text-center rounded-full border font-semibold text-lg`}
              disabled={loading}
            >
              <Image src={google} width={30} height={30} alt="google" />
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("apple")}
              className={`${
                (!isChecked || loading) && "cursor-not-allowed opacity-60"
              } border-black transition-all flex items-center gap-2 px-4 py-1.5 w-full justify-center text-center rounded-full border font-semibold text-lg`}
              disabled={loading}
            >
              <Image src={apple} width={30} height={30} alt="discord" />
              Apple
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("twitter")}
              className={`${
                (!isChecked || loading) && "cursor-not-allowed opacity-60"
              } border-black transition-all flex items-center gap-2 px-4 py-1.5 w-full justify-center text-center rounded-full border font-semibold text-lg`}
              disabled={loading}
            >
              <Image
                src={x}
                width={30}
                height={30}
                alt="twitter"
                className="rounded"
              />
              Twitter
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("facebook")}
              className={`${
                (!isChecked || loading) && "cursor-not-allowed opacity-60"
              } border-black transition-all flex items-center gap-2 px-4 py-1.5 w-full justify-center text-center rounded-full border font-semibold text-lg`}
              disabled={loading}
            >
              <Image src={f} width={30} height={30} alt="facebook" />
              Facebook
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin("email")}
              className={`${
                (!isChecked || loading) && "cursor-not-allowed opacity-60"
              } border-black transition-all flex items-center gap-2 px-4 py-1.5 w-full justify-center text-center rounded-full border font-semibold text-lg`}
              disabled={loading}
            >
              <svg
                width="20"
                height="21"
                viewBox="0 0 20 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16.666 3.83325H3.33268C2.41221 3.83325 1.66602 4.57944 1.66602 5.49992V15.4999C1.66602 16.4204 2.41221 17.1666 3.33268 17.1666H16.666C17.5865 17.1666 18.3327 16.4204 18.3327 15.4999V5.49992C18.3327 4.57944 17.5865 3.83325 16.666 3.83325Z"
                  stroke="black"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18.3327 6.33325L10.8577 11.0833C10.6004 11.2444 10.3029 11.3299 9.99935 11.3299C9.69575 11.3299 9.39829 11.2444 9.14102 11.0833L1.66602 6.33325"
                  stroke="black"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Email
            </button>
          </div>

          <p className="opacity-50 text-base font-medium uppercase">
            Or Continue With
          </p>

          <button
            type="button"
            disabled={!isChecked || loading}
            onClick={handleWeb3Wallet}
            className={`${
              (!isChecked || loading) && "cursor-not-allowed opacity-60"
            } border-black transition-all btn_primary_gradient w-full max-w-[15rem] text-white  whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-semibold`}
          >
            Connect With Wallet
          </button>

          <div
            className={`flex items-start  gap-4 p-3  ${
              isJiggle && "jiggle"
            } text-slate-600`}
          >
            <input
              type="checkbox"
              name="policy"
              checked={isChecked}
              onChange={() => setIsChecked(!isChecked)}
              id="policy"
              className="w-5 h-5 border  accent-[#954AFC] rounded-md  "
            />
            <label for="policy" className={` transition-all`}>
              By signing up for NFsTay, you confirm that you have read,
              understood, and agree to the NFsTay Protocol Docs,{" "}
              {/* <a
                href="https://docs.nfstay.com/legal/disclaimer"
                className="underline underline-offset-1"
                target="_blank"
              >
                Disclaimer
              </a>
              , */}
              <a
                href="https://docs.nfstay.com/legal/terms-and-conditions"
                className="underline underline-offset-1"
                target="_blank"
              >
                Terms & Conditions
              </a>
              , and{" "}
              <a
                href="https://docs.nfstay.com/legal/disclaimer"
                className="underline underline-offset-1"
                target="_blank"
              >
                Disclaimer
              </a>
              .
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LoginPopup;
