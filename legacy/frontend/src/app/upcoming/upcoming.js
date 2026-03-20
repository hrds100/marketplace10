"use client";
import PropertyCard from "../components/propertyCard";
import PropertySkelton from "@/utils/propertySkelton";
import { useEffect, useState } from "react";
import { fetchPrimarySalesEvents } from "@/context/subgraphHelper";
import PropertyNotFound from "../components/propertyNotFound";
import PropertiesLoadingSkelton from "@/utils/PropertiesLoadingSkelton";

const Upcoming = () => {
  const [upcomingProperties, setUpcomingProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        const properties = await fetchPrimarySalesEvents(1);
        setUpcomingProperties(properties || []);
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
      {/* Header Section (Always Visible) */}
      <div className="pb-2.5 pt-6 flex flex-col gap-6 xl:pb-1">
        <div className="flex flex-col gap-2">
          <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
            Upcoming Properties
          </h4>
          <p className="opacity-80 text-[#0C0839] text-base 2xl:text-lg">
          Purchase your share before they hit the secondary market
          </p>
        </div>
      </div>

      {/* Content Section */}
      {isLoading ? (
        <PropertiesLoadingSkelton source={"upcoming"} />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {upcomingProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-full gap-5 h-fit">
              {upcomingProperties.map((property, index) => (
                <PropertyCard
                  key={property._propertyId || index}
                  propertyId={property._propertyId}
                  source={"upcoming"}
                />
              ))}
            </div>
          ) : (
            <PropertyNotFound />
          )}
        </div>
      )}
    </div>
  );
};

export default Upcoming;
