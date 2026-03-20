"use client";
import { useEffect, useState } from "react";
import PropertySkelton from "@/utils/propertySkelton";
import PropertyCard from "../components/propertyCard";
import { fetchPrimarySalesEvents } from "@/context/subgraphHelper";

const FeaturedProperties = () => {
  const [primaryProperties, setPrimaryProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      try {
        const _properties = (await fetchPrimarySalesEvents(2))
          .sort((a, b) => b._propertyId - a._propertyId) // Sort in descending order
          .slice(0, 3);

        setPrimaryProperties(_properties);
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
      <div className="pb-2.5 pt-6 xl:pb-1">
        <div className="mb-6 flex justify-between">
          <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
            Featured Properties
          </h4>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 h-fit">
            {[...Array(3)].map((_, index) => (
              <PropertySkelton source={"marketplace"} key={index} />
            ))}
          </div>
        ) : primaryProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 h-fit">
            {primaryProperties.map((property, index) => (
              <PropertyCard
                key={index}
                propertyId={property._propertyId}
                source={"marketplace"}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-32">
            <p className="text-gray-500 text-lg font-semibold text-center bg-gray-100 p-4 rounded shadow-md">
              🚫 No Featured Property Available
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedProperties;
