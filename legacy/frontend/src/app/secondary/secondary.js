"use client";

import PropertyCard from "../components/propertyCard";
import { useEffect, useState } from "react";
import PropertyNotFound from "../components/propertyNotFound";
import PropertiesLoadingSkelton from "@/utils/PropertiesLoadingSkelton";
import { fetchSecondarySalesEvents } from "@/context/subgraphHelper";

const Secondary = () => {
  // const [filters, setFilters] = useState({
  //   strategyType: "",
  //   searchByName: "",
  //   country: "",
  //   priceRange: "",
  //   priceLowToHigh: "",
  // });
  // const [filteredProperties, setFilteredProperties] = useState([]);
  // const [isLoading, setIsLoading] = useState(true);

  // useEffect(() => {
  //   // Simulate API loading for filtering
  //   const loadProperties = async () => {
  //     setIsLoading(true);
  //     await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
  //     let filtered = properties;

  //     if (filters.strategyType) {
  //       filtered = filtered.filter(
  //         (property) => property.category.toLowerCase() === filters.strategyType
  //       );
  //     }
  //     if (filters.searchByName) {
  //       filtered = filtered.filter((property) =>
  //         property.title
  //           .toLowerCase()
  //           .includes(filters.searchByName.toLowerCase())
  //       );
  //     }
  //     if (filters.country) {
  //       filtered = filtered.filter((property) =>
  //         property.location.toLowerCase().includes(filters.country)
  //       );
  //     }
  //     if (filters.priceRange) {
  //       const [min, max] = filters.priceRange.split("-").map(Number);
  //       filtered = filtered.filter(
  //         (property) => property.price >= min && property.price <= max
  //       );
  //     }
  //     if (filters.priceLowToHigh) {
  //       filtered = filtered.sort((a, b) =>
  //         filters.priceLowToHigh === "low"
  //           ? a.price - b.price
  //           : b.price - a.price
  //       );
  //     }

  //     setFilteredProperties(filtered);
  //     setIsLoading(false);
  //   };

  //   loadProperties();
  // }, [filters]);

  // const handleFilterChange = (event) => {
  //   const { name, value } = event.target;
  //   setFilters((prevFilters) => ({
  //     ...prevFilters,
  //     [name]: value,
  //   }));
  // };

  // const handleClearFilter = () => {
  //   setFilters({
  //     strategyType: "",
  //     searchByName: "",
  //     country: "",
  //     priceRange: "",
  //     priceLowToHigh: "",
  //   });
  // };

  const [secondaryListing, setSecondaryListing] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        const properties = await fetchSecondarySalesEvents();
        setSecondaryListing(properties || []);
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  return (
    <div className="w-full">
      <div className="pb-2.5 pt-6 flex flex-col gap-6 xl:pb-1">
        <div className="flex items-center justify-between gap-5">
          <div className="flex gap-2 flex-col justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
                Secondary Market
              </h4>
            </div>
            <p className="opacity-80 text-[#0C0839] 2xl:text-lg">
              Buy and Sell your Share Within Seconds
            </p>
          </div>
        </div>

        {/* Uncomment and use filters as needed */}
        {/* 
        <div className="flex items-center flex-wrap gap-5">
          <Select {...strategyType} value={filters.strategyType} handleValueChange={handleFilterChange} />
          <Select {...searchByName} value={filters.searchByName} handleValueChange={handleFilterChange} />
          <Select {...country} value={filters.country} handleValueChange={handleFilterChange} />
          <Select {...priceRange} value={filters.priceRange} handleValueChange={handleFilterChange} />
          <Select {...priceLowToHigh} value={filters.priceLowToHigh} handleValueChange={handleFilterChange} />
          <button
            onClick={handleClearFilter}
            className="border-none outline-none text-[#954AFC] font-medium 2xl:text-lg"
          >
            Clear all filters
          </button>
        </div>
        */}

        {/* Conditional Rendering */}
        {isLoading ? (
          <PropertiesLoadingSkelton source={"secondary"} />
        ) : secondaryListing.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-full gap-5 h-fit">
            {secondaryListing.map((property, index) => (
              <PropertyCard
                key={index}
                propertyId={property._propertyId}
                source={"secondary"}
                listingId={property._listingId}
              />
            ))}
          </div>
        ) : (
          <PropertyNotFound />
        )}
      </div>
    </div>
  );
};

export default Secondary;
