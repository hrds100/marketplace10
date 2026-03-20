"use client";
import PropertyCard from "../components/propertyCard";
import { useEffect, useMemo, useState } from "react";
import { fetchPrimarySalesEvents } from "@/context/subgraphHelper";
import PropertyNotFound from "../components/propertyNotFound";
import PropertiesLoadingSkelton from "@/utils/PropertiesLoadingSkelton";
import { useBulkBuyContext } from "@/context/BulkBuyContext";
import BulkBuySidebar from "../components/bulkBuySidebar";
import { useRouter } from "next/navigation";
import { FaCartShopping } from "react-icons/fa6";
import { FaTimes } from "react-icons/fa";
import BulkCheckout from "./bulk-checkout";
import Congratulations from "../details/congratulations";
import { useNfstayContext } from "@/context/NfstayContext";

const Marketplace = () => {
  const router = useRouter();
  const { getMarketplaceFee } = useNfstayContext();
  const [primaryProperties, setPrimaryProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkCheckoutOpen, setIsBulkCheckoutOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [marketFee, setMarketFee] = useState(0);
  const [isClient, setIsClient] = useState(false);
  // Use BulkBuy context for cart and drawer state
  const {
    cartItems,
    clearCart,
    isSidebarOpen,
    openDrawer,
    closeDrawer,
    addToCart,
    updateQuantity,
    removeItem,
    isMobile,
    isMobileBulkMode,
    enterMobileBulkMode,
    exitMobileBulkMode,
    getCartItemCount,
  } = useBulkBuyContext();

  const total = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + item.quantity * item.pricePerShare,
      0
    );
  }, [cartItems]);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const getPlatformFee = async () => {
      let platformFee = await getMarketplaceFee();
      platformFee = Number(platformFee[0]._hex) / 100;
      setMarketFee(platformFee);
    };
    getPlatformFee();
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        const properties = await fetchPrimarySalesEvents(2);
        setPrimaryProperties(properties);
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const handleBuy = () => {
    setIsBulkCheckoutOpen(true);
  };

  const handleBulkBuyClick = () => {
    if (isMobile) {
      // On mobile, don't open sidebar, just enter bulk mode
      enterMobileBulkMode();
    } else {
      // On desktop, open drawer as before
      openDrawer();
    }
  };

  const handleCartClick = () => {
    if (isMobile) {
      openDrawer();
    }
  };

  const handleCrossClick = () => {
    if (isMobile) {
      exitMobileBulkMode();
    }
  };

  return (
        <div className="w-full py-6">
      {/* Header (Always Visible) */}
      <div className={`mb-2 flex flex-col gap-4 items-start sm:px-4 pb-1 ${isMobile ? 'sticky top-0 bg-white z-50 py-4 shadow-sm' : ''}`}>
        <div className="flex items-center justify-between w-full gap-2">
          <h4 className="max-sm:!text-lg text-title-lg font-bold text-black 2xl:text-5xl">
            Marketplace
          </h4>
          <div className="flex items-center gap-2">
            {/* Cart Button - Only show on mobile when in bulk mode */}
            {isMobile && isMobileBulkMode && (
              <button
                onClick={handleCartClick}
                className="w-fit btn_primary_gradient text-white font-semibold py-2 px-4 rounded-full hover:opacity-90 transition-opacity relative"
              >
                <span className="flex items-center justify-center gap-1 text-sm">
                  <FaCartShopping />
                  ({getCartItemCount()})
                </span>
              </button>
            )}
            
            {/* Bulk Buy Button */}
            <button
              onClick={isMobile && isMobileBulkMode ? handleCrossClick : handleBulkBuyClick}
              className="w-fit btn_primary_gradient text-white font-semibold py-2 px-4 rounded-full hover:opacity-90 transition-opacity relative"
            >
              <span className="flex items-center justify-center gap-1 text-sm">
                {isMobile && isMobileBulkMode ? (
                  <FaTimes />
                ) : (
                  <FaCartShopping />
                )}
                Bulk Buy
              </span>
            </button>
          </div>
        </div>
        {!isMobile && (
          <p className="opacity-80 text-[#0C0839] text-base 2xl:text-lg">
            Buy and Sell your Share Within Seconds
          </p>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <PropertiesLoadingSkelton source={"marketplace"} />
      ) : (
        <div className="sm:px-4">
          {primaryProperties.length > 0 ? (
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${
                isSidebarOpen ? "md:grid-cols-2" : "md:grid-cols-3"
              }`}
              style={
                isClient && isSidebarOpen && typeof window !== 'undefined' && window.innerWidth > 768
                  ? { maxWidth: "calc(100% - 360px)" }
                  : {}
              }
            >
              {primaryProperties.map((property, index) => (
                <PropertyCard
                  key={property._propertyId || index}
                  propertyId={property._propertyId}
                  source={"marketplace"}
                  cartItems={cartItems}
                  onAddToCart={addToCart}
                  isDrawerOpen={isSidebarOpen || (isMobile && isMobileBulkMode)}
                />
              ))}
            </div>
          ) : (
            <PropertyNotFound />
          )}
        </div>
      )}

      {/* Bulk Buy Sidebar */}
      <BulkBuySidebar
         marketFee={marketFee}
        isOpen={isSidebarOpen}
        onClose={closeDrawer}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onBuy={handleBuy}
      />

      <BulkCheckout
        marketFee={marketFee}
        open={isBulkCheckoutOpen}
        setOpen={setIsBulkCheckoutOpen}
        setIsSuccess={() => setIsSuccess(true)}
        total={total}
        cartItems={cartItems}
        amount={total}
      />
      <Congratulations
        open={isSuccess}
        handleClose={() => {
          closeDrawer();
          clearCart();
          exitMobileBulkMode();
          setIsSuccess(false);
        }}
      />
    </div>
  );
};

export default Marketplace;
