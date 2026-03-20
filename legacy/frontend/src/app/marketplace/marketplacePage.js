"use client";
import Layout from "@/app/components/layout";
import Overview from "@/app/details/overview";
import { properties } from "./data";
import { useSearchParams } from "next/navigation";
import { useNfstayContext } from "@/context/NfstayContext";
import { useEffect, useState } from "react";

const MarketplacePage = ({ setIsRestricted }) => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  // const propertyDetails = properties.find(property => property.id == id)
  const { getPropertyDetails, getPrimaryPropertyRemainingShares, connectedAddress, getUserProperties } =
    useNfstayContext();

  const [propertyDetails, setPropertyDetails] = useState({
    id: 0,
    pricePerShare: 0,
    totalOwners: 0,
    apr: 0,
    totalShares: 0,
    userBalance: 0, // Add userBalance field
    metadata: {
      description: "",
      image: "",
      images: [],
      name: "",
      attributes: [],
      amount: "",
      category: "",
    },
    transactionBreakdown: [], // Separate transaction breakdown array
    rentalBreakdown: [],
    propertyLocation: {
      latitude: null,
      longitude: null,
      location: "", // Default value, will be updated later
    },
    beds: null, // Initialize beds with a default value of null
    sqft: null,
    propertyType: "",
    remainingShares: "",
    totalSharesInMarket: "",
  });

  const [userProperties, setUserProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMarketplaceProperties = async (id, loading = true) => {
    if (loading) setIsLoading(true);
    try {
      const details = await getPropertyDetails(id);
      let updatedDetails = details;
      const { remainingShares, totalSharesInMarket } =
        await getPrimaryPropertyRemainingShares(id);
      
      // Get user balance from getUserProperties
      let userBalance = 0;
      if (connectedAddress) {
        try {
          const properties = await getUserProperties(connectedAddress);
          setUserProperties(properties);
          
          // Find the property with matching ID
          const userProperty = properties.find(prop => prop.id === parseInt(id));
          userBalance = userProperty?.userBalance || 0;
        } catch (error) {
          console.error("Error fetching user properties:", error);
        }
      }
      
      updatedDetails = {
        ...updatedDetails,
        remainingShares,
        totalSharesInMarket,
        userBalance, // Add userBalance to property details
      };
      setPropertyDetails(updatedDetails); // Set the state with fetched data
    } catch (error) {
      console.error(
        "Error fetching property details:",
        error.message || error.reason
      );
    }
  };

  useEffect(() => {
    if (id !== null) {
      fetchMarketplaceProperties(id);
    }
  }, [id, connectedAddress]);

  // // Monitor userBalance and set restriction when balance is 0
  // useEffect(() => {
  //   if (setIsRestricted && propertyDetails.id) {
  //     // Get userBalance from userProperties array (similar to portfolio approach)
  //     const propertyId = parseInt(id);
  //     const userProperty = userProperties.find(prop => prop.id === propertyId);
  //     const userBalance = userProperty?.userBalance || propertyDetails?.userBalance || 0;
      
  //     // Set restriction if user balance is 0, remove restriction if balance > 0
  //     setIsRestricted(userBalance === 0);
  //   }
  // }, [userProperties, propertyDetails.userBalance, propertyDetails.id, setIsRestricted, id]);

  return (
    <div className=" h-full flex flex-col gap-8 w-full">
      <Overview
        fetchMarketplaceProperties={fetchMarketplaceProperties}
        source={"marketplace"}
        propertyDetails={propertyDetails}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </div>
  );
};

export default MarketplacePage;
