"use client";
import Layout from "@/app/components/layout";
import Overview from "@/app/details/overview";
import { useParams, useSearchParams } from "next/navigation"; // Import useSearchParams
import { useNfstayContext } from "@/context/NfstayContext";
import { useEffect, useState } from "react";
import NotFound from "@/app/not-found";

const Page = () => {
  //TODO enable when secondary enabled
  // const { id } = useParams(); // Get `id` from the route
  // const searchParams = useSearchParams(); // Get query parameters
  // const listingId = searchParams.get("listingId"); // Extract `listingId` from the query

  // const { getPropertyDetails, getSecondaryListingDetails } = useNfstayContext();

  // const [propertyDetails, setPropertyDetails] = useState({
  //   id: 0,
  //   pricePerShare: 0,
  //   totalOwners: 0,
  //   apr: 0,
  //   totalShares: 0,
  //   metadata: {
  //     description: "",
  //     image: "",
  //     images: [],
  //     name: "",
  //     attributes: [],
  //     category: "",

  //   },
  //   transactionBreakdown: [],
  //   rentalBreakdown: [],
  //   propertyLocation: {
  //     latitude: null,
  //     longitude: null,
  //     location: "",
  //   },
  //   beds: null,
  //   sqft: null,
  //   propertyType:""
  // });

  // const [secondaryDetails, setSecondaryDetails] = useState({
  //   propertyId: 0,
  //   seller: "",
  //   pricePerShare: 0,
  //   sharesRemaining: 0,
  //   endTime: 0,
  // });

  // const [isLoading, setIsLoading] = useState(true);

  // const fetchSecondarySaleProperties = async (listingId, loading = true) => {
  //   if (loading) setIsLoading(true);
  //   try {
  //     // if (listingId) {
  //     const secondaryDetailsData = await getSecondaryListingDetails(listingId);
  //     setSecondaryDetails(secondaryDetailsData);
  //     const details = await getPropertyDetails(secondaryDetailsData.propertyId);
  //     setPropertyDetails(details); // Set the state with fetched data
  //     // }
  //   } catch (error) {
  //     console.error(
  //       "Error fetching property details:",
  //       error.message || error.reason
  //     );
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   if (id) fetchSecondarySaleProperties(id);
  // }, [id]);

  return (
    //   <div className="h-full flex flex-col gap-8 w-full">
    //     <Overview
    //       source={"secondary"}
    //       propertyDetails={propertyDetails}
    //       isLoading={isLoading}
    //       secondaryDetails={secondaryDetails}
    //       setIsLoading={setIsLoading}
    //       listingId={id}
    //       fetchSecondarySaleProperties={fetchSecondarySaleProperties}
    //     />
    //   </div>

    <NotFound />
  );
};

export default Page;
