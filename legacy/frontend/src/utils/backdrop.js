import { motion } from "framer-motion";
import Image from "next/image";
import congrats from "../app/images/congrats.gif";
const Backdrop = ({ children, isCongrats, onClick }) => {

  return (
    <motion.div
      onClick={onClick}
      className='fixed flex items-center justify-center inset-0 min-w-screen min-h-screen  transition-all z-[9998] backdrop-blur-sm'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, background: "rgba(0,0,0,0.5)" }}
      exit={{ opacity: 0 }}
    >
      {
        isCongrats &&

        <div className="fixed w-full h-full  z-50  flex items-center justify-center">
          <Image
            src={congrats}
            layout="fill"
            alt="Property Documents"
            className="max-w-full h-full w-full"
          />

        </div>
      }
      {children}
    </motion.div>
  );
};

export default Backdrop