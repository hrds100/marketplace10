import { useEffect, useRef, useState } from "react";
import PlaceMyOrder from "./pageA/placeMyOrder";
import { useSearchParams } from "next/navigation";

const Connect = ({ isCheckout = false }) => {
  const ref = useRef();
  const searchParams = useSearchParams();
  const [amount, setAmount] = useState(1000);
  const handleSubmit = (e) => {
    e.preventDefault();
    ref.current.handleOpen();
  };

  const element = () => {
    return (
      <div className="space-y-2.5 !font-medium">
        <p className="!text-xl md:!text-2xl">
          {">"} GET INSTANT ACCESS - ONLY $7{" "}
          <span className="line-through">$97</span>
        </p>
        <p className="font-medium !text-base" style={{ letterSpacing: 1 }}>
          Yes! I want to close more agents and landlords
        </p>
      </div>
    );
  };

  useEffect(() => {
    if (Number(searchParams.get("amount")))
      setAmount(Number(searchParams.get("amount")));
  }, [searchParams]);

  return (
    <div className="flex items-center flex-col gap-5 justify-center w-full p-4">
      <form onSubmit={handleSubmit} className="w-fit mx-auto">
        <PlaceMyOrder
          ref={ref}
          height={
            isCheckout ? "h-auto !px-8 md:!px-20 !py-7" : "h-[50px] !text-base"
          }
          title={
            isCheckout
              ? element()
              : `Yes! I want $${amount.toLocaleString()} in Property shares`
          }
        />
      </form>
      {/* <p className="text-[#4A4A4A] text-center text-base">
        {`Get $${
          amount * 0.1
        } cashback* when you invest your first $${amount.toLocaleString()}`}
      </p> */}
    </div>
  );
};

export default Connect;
