"use client";
import Layout from "@/app/components/layout";
import Overview from "@/app/details/overview";
import { properties } from "./data";
import { useSearchParams } from "next/navigation";
import { usenfstayContext } from "@/context/nfstayContext";
import { useEffect, useState } from "react";

const Page = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  // const propertyDetails = properties.find((property) => property.id === id);

  const { getPropertyDetails } = usenfstayContext();

  const [propertyDetails, setPropertyDetails] = useState({
    id: 0,
    pricePerShare: 0,
    totalOwners: 0,
    apr: 0,
    totalShares: 0,
    metadata: {
      description: "",
      image: "",
      images: [],
      name: "",
      attributes: [],
      amount: "",
      category: "",
    },
    propertyLocation: {
      latitude: null,
      longitude: null,
      location: "", // Default value, will be updated later
    },
    beds: null, // Initialize beds with a default value of null
    sqft: null,
    propertyType: "",
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchUpcomingProperties = async (id) => {
    setIsLoading(true);
    try {
      const details = await getPropertyDetails(id);
      setPropertyDetails(details); // Set the state with fetched data
    } catch (error) {
      console.error(
        "Error fetching property details:",
        error.message || error.reason
      );
    }

    // finally {
    //   setIsLoading(false);
    // }
  };

  useEffect(() => {
    if (id !== null) {
      fetchUpcomingProperties(id);
    }
  }, [id]);

  return (
    <div className=" h-full flex flex-col gap-8 w-full">
      <Overview
        source={"upcoming"}
        propertyDetails={propertyDetails}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </div>
  );
};

export default Page;
