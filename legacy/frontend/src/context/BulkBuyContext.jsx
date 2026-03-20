"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { NotifySuccess } from "./helper";

const BulkBuyContext = createContext(undefined);

export const BulkBuyProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileBulkMode, setIsMobileBulkMode] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    
    // Only run on client side
    if (typeof window !== 'undefined') {
      checkMobile();
      window.addEventListener('resize', checkMobile);
      
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  const openDrawer = () => {
    setIsSidebarOpen(true);
  };

  const closeDrawer = () => {
    setIsSidebarOpen(false);
  };

  const toggleDrawer = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const enterMobileBulkMode = () => {
    if (isMobile) {
      setIsMobileBulkMode(true);
    }
  };

  const exitMobileBulkMode = () => {
    if (isMobile) {
      setIsMobileBulkMode(false);
    }
  };

  const addToCart = (propertyData) => {
    const newItem = {
      id: `${propertyData.propertyId}-${propertyData.listingId || 0}`,
      propertyId: propertyData.propertyId,
      listingId: propertyData.listingId,
      quantity: 1,
      maxRemainingShares: propertyData.maxRemainingShares || 1,
      pricePerShare: propertyData.pricePerShare,
      metadata: propertyData.metadata,
      source: propertyData.source,
    };

    const existingItemIndex = cartItems.findIndex(
      (item) => item.id === newItem.id
    );

    if (existingItemIndex > -1) {
      const updatedItems = [...cartItems];
      const currentQuantity = updatedItems[existingItemIndex].quantity;
      const maxShares = updatedItems[existingItemIndex].maxRemainingShares;
      updatedItems[existingItemIndex].quantity = Math.min(
        currentQuantity + 1,
        maxShares
      );
      setCartItems(updatedItems);
    } else {
      setCartItems([...cartItems, newItem]);
    }

    // On mobile, show toast instead of opening drawer
    if (isMobile && isMobileBulkMode) {
      NotifySuccess("Item added to cart");
    } else {
      openDrawer();
    }
  };

  const updateQuantity = (itemId, newQuantity) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.id === itemId) {
          const validQuantity = Math.min(
            Math.max(1, newQuantity),
            item.maxRemainingShares
          );
          return { ...item, quantity: validQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (itemId) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + item.quantity * item.pricePerShare,
      0
    );
  };

  const getCartItemCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const contextValue = {
    // Drawer state
    isSidebarOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    
    // Cart state
    cartItems,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    getCartTotal,
    getCartItemCount,

    // Mobile state
    isMobile,
    isMobileBulkMode,
    enterMobileBulkMode,
    exitMobileBulkMode,
  };

  return (
    <BulkBuyContext.Provider value={contextValue}>
      {children}
    </BulkBuyContext.Provider>
  );
};

export const useBulkBuyContext = () => {
  const context = useContext(BulkBuyContext);
  if (context === undefined) {
    throw new Error("useBulkBuyContext must be used within a BulkBuyProvider");
  }
  return context;
}; 