"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { formatNumber } from "@/context/helper";
import { FaCartShopping, FaMinus, FaPlus } from "react-icons/fa6";

const BulkBuySidebar = ({
  marketFee,
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onBuy,
}) => {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const newTotal = cartItems.reduce(
      (sum, item) => sum + item.quantity * item.pricePerShare,
      0
    );
    setTotal(newTotal);
  }, [cartItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed z-[9998] right-0 top-0 p-4 h-full w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-400 pb-4">
        <button onClick={onClose}>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <p className="text-sm cursor-pointer" onClick={onClose}>
          Close
        </p>
      </div>

      <h2 className="text-2xl font-semibold mt-3 mb-6">Bulk Buy</h2>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto space-y-7 mb-7">
        {cartItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No items in cart</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveItem={onRemoveItem}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {cartItems.length > 0 && (
        <div className="space-y-7">
          <div className="flex justify-between items-start">
            <span className="text-lg font-semibold">Total</span>
            <p className="text-xl font-bold">
              <span>${formatNumber(total)} USD</span>
              <p className="opacity-70 text-xs font-normal">+{marketFee}% processing fees</p>
            </p>
          </div>
          <button
            onClick={onBuy}
            className="w-full btn_primary_gradient text-white font-semibold py-3 px-6 rounded-full hover:opacity-90 transition-opacity"
          >
            <span className="flex items-center justify-center gap-2 text-base">
              <FaCartShopping />
              Buy
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

const CartItem = ({ item, onUpdateQuantity, onRemoveItem }) => {
  return (
    <div className="">
      {/* Property Image and Details */}
      <div className="flex gap-3">
        <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={item.metadata?.image || "/placeholder.jpg"}
            alt={item.metadata?.name || "Property"}
            width={96}
            height={80}
            className="w-full h-full object-cover rounded-2xl"
            onError={(e) =>
              (e.target.src =
                "https://photos.pinksale.finance/file/pinksale-logo-upload/1734453431720-03dcb198e4d12e88ccc503011e0cd48f.jpg")
            }
          />
        </div>
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between w-full">
            <h3 className="font-semibold text-sm truncate">
              {item.metadata?.name || "Property Name"}
            </h3>
            <button
              onClick={() => onRemoveItem(item.id)}
              className="text-xs cursor-pointer"
            >
              <svg
                className="w-4 h-4 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                }
                className="disabled:opacity-50 size-6 text-white rounded-lg btn_primary_gradient flex items-center justify-center"
                disabled={item.quantity <= 1}
              >
                <FaMinus />
              </button>
              <input
                type="number"
                min="1"
                max={item.maxRemainingShares}
                value={item.quantity}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value) || 1;
                  const validValue = Math.min(
                    Math.max(1, newValue),
                    item.maxRemainingShares
                  );
                  onUpdateQuantity(item.id, validValue);
                }}
                className="w-20 text-center border border-purple-600 rounded-lg px-2 py-1 text-sm focus:outline-none"
              />
              <button
                onClick={() =>
                  onUpdateQuantity(
                    item.id,
                    Math.min(item.quantity + 1, item.maxRemainingShares)
                  )
                }
                className="disabled:opacity-50 size-6 text-white rounded-lg btn_primary_gradient flex items-center justify-center"
                disabled={item.quantity >= item.maxRemainingShares}
              >
                <FaPlus />
              </button>
            </div>
            <div className="font-bold text-sm text-right">
              {formatNumber(item.quantity * item.pricePerShare)} USD
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkBuySidebar;
