"use client"
import { AnimatePresence } from "framer-motion";
import ModalView from "./modeView";

import { useEffect } from "react";

const Modal = ({ children, open,isCongrats, handleClose, max="max-w-xl" }) => {

    //stop scroll when model is open
    useEffect(() => {
       
        if (typeof window !== 'undefined') {
            if (open) {
                document.body.style.overflow = "hidden";
                


            } else {
                document.body.style.overflow = "unset";

            }
        }
    }, [open])



    return (
        <AnimatePresence
            initial={false}
            mode={'wait'}
            onExitComplete={handleClose}
        >
            {open && <ModalView isCongrats={isCongrats} handleClose={handleClose} max={max} >
                {children}
            </ModalView>
            }
        </AnimatePresence>

    )
}

export default Modal