"use client";

import { usenfstayContext } from "@/context/nfstayContext";
import { Drawer } from "antd";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const PlaceMyOrder = forwardRef((props, ref) => {
  const {
    title = " Place My Order Now!!",
    buttonColor = "#0B6BDA",
    type = "submit",
    height,
  } = props;
  const searchParams = useSearchParams();
  const { connectedAddress } = usenfstayContext();
  const [open, setOpen] = useState(false);
  const [checkoutParams, setCheckoutParams] = useState({
    first_name: "",
    email: "",
    phone_number: "",
    amount: 1000,
  });

  const handleOpen = () => {
    if (!connectedAddress) {
      toast.error("Please login first");
      return;
    }
    setOpen(true);
  };

  useEffect(() => {
    setCheckoutParams({
      first_name: searchParams.get("first_name") || "",
      email: searchParams.get("email") || "",
      phone_number: searchParams.get("phone_number") || "",
      amount: Number(searchParams.get("amount")) || 1000,
    });
  }, [searchParams]);

  // Expose the handleOpen function to the parent component
  useImperativeHandle(ref, () => ({
    handleOpen,
  }));

  return (
    <>
      <button
        onClick={type === "button" ? handleOpen : null}
        style={{
          backgroundColor: buttonColor || "#0B6BDA",
        }}
        type={type}
        className={
          "w-full bg-[#0B6BDA] text-white font-semibold rounded-2xl py-2 " +
          height
        }
      >
        {title}
      </button>
      <Drawer
        open={open}
        maskClosable={false}
        rootClassName="orderNow"
        styles={{
          body: {
            padding: "0 !important",
          },
        }}
        onClose={() => setOpen(false)}
      >
        <iframe
          src={`https://stay.samcart.com/products/rent-2-rent-${checkoutParams.amount}shares/?first_name=${checkoutParams.first_name}&last_name=${connectedAddress}&email=${checkoutParams.email}&phone_number=${checkoutParams.phone_number}`}
          width="100%"
          height="100%"
          style={{ border: "none" }}
          allowFullScreen
        ></iframe>
      </Drawer>
    </>
  );
});

PlaceMyOrder.displayName = "PlaceMyOrder";
export default PlaceMyOrder;