"use client";
import Modal from "@/utils/modal";
import Image from "next/image";
import celebrate from "../images/celebrate.webp";
import round from "../images/round.webp";
import { useNfstayContext } from "@/context/NfstayContext";

const Congratulations = ({ open, handleClose }) => {
  const { assetPrices } = useNfstayContext();
  const title = "Congratulations";
  const paragraph = `Your returns are now boosted by ${assetPrices.boostApr}% for the next 12 months. Enjoy the ride! 🚀 `;
  const buttonText = "Okay";
  const icon = celebrate;

  return (
    <Modal
      open={open}
      isCongrats={true}
      handleClose={handleClose}
      max="max-w-sm !rounded-3xl"
    >
      <div className="flex flex-col  overflow-hidden  w-full">
        <div className="relative mb-20">
          <div className="relative bg-[#954AFC] isolate min-h-32 overflow-hidden">
            <div className="size-[390px] absolute opacity-50 -top-[130px] -left-[180px]  -z-[1] mix-blend-screen">
              <Image
                src={round}
                width={500}
                height={500}
                alt="Property Documents"
                className="max-w-full h-full"
              />
            </div>
          </div>
          <div className="size-28 rounded-full absolute -bottom-1/2 left-1/2 -translate-x-1/2 backdrop-blur-lg bg-[#0C083938] flex items-center justify-center shrink-0">
            <div className="size-24 rounded-full bg-white flex items-center justify-center">
              <Image
                src={icon}
                width={500}
                height={500}
                alt="Property Documents"
                className="max-w-full size-12"
              />
            </div>
          </div>
        </div>
        <div className="w-full flex p-8 bg-white flex-col items-center justify-center text-center gap-5">
          <h1 className="text-2xl font-bold text-[#0C0839] text-center">
            {title}
          </h1>
          <p className="text-center text-[#0C0839] opacity-80 max-w-[20rem]">
            {paragraph}
          </p>

          <button
            type="button"
            onClick={handleClose}
            className="btn_primary_gradient w-full max-w-[15rem] text-white  whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium cursor-pointer"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default Congratulations;
