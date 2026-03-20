import Modal from "@/utils/modal";
import PopUp from "@/utils/popUp";
import Image from "next/image";
import congrats from "../images/congrats.gif";
import celebrate from "../images/celebrate.webp";
import round from "../images/round.webp";
import { useKYCContext } from "@/context/KYCModalContext";

const Congratulations = ({ open, handleClose }) => {
  const { initiateKYC } = useKYCContext();
  const title = "Congratulations";
  const paragraph =
    "We’re thrilled to welcome you as our Partner! 🎉";
  const buttonText = "Okay";
  const icon = celebrate;

  const handleClick = async () => {
    handleClose();
    await initiateKYC();
  };

  return (
    // <PopUp open={open} handleClose={handleClose} icon={icon} title={title} paragraph={paragraph} buttonText={buttonText} />
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
            onClick={handleClick}
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
