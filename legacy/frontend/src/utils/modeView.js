import { motion } from "framer-motion";
import Backdrop from './backdrop'
const popup = {
    hidden: {
        scale: 0,
        opacity: 0,
        transformOrigin: "center",
        transition: {
            delay: 0.3,
        },
    },
    visible: {
        scale: 1,
        opacity: 1,
        transformOrigin: "center",
        transition: {
            duration: 0.5,
        },
    },
    exit: {
        scale: 0,
        opacity: 0,
        transformOrigin: "center",
        transition: {
            duration: 0.5,
        },
    },
};

const ModalView = ({ children, isCongrats, handleClose, max }) => {
    return (
        <Backdrop isCongrats={isCongrats} onClick={handleClose}>
            <motion.div
                onClick={(e) => e.stopPropagation()}
                className=" orange-gradient w-full h-full flex items-center justify-center p-4"
                variants={popup}
                initial="hidden"
                animate="visible"
                exit="exit"
                // style={{
                //     zIndex: "99999 !important"
                // }}
            >
                <div className={`relative overflow-hidden self-center  w-full h-fit bg-white rounded-xl ${max} shadow-xl  backdrop-blur-lg`}
                // style={{
                //     zIndex:"99999 !important"
                // }}
                >
                    
                    {children}
                </div>

            </motion.div>
        </Backdrop>
    )
}

export default ModalView