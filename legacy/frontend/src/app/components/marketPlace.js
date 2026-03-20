// import Image from "next/image";
// import Strip from "./strip";
// import PropertyCard from "./propertyCard";
// import img from "../images/room.png";
// import PropertiesLoadingSkelton from "@/utils/PropertiesLoadingSkelton";
// import { properties } from "../marketplace/data";

// const MarketPlace = () => {
//   return (
//     <div id="marketplace" className="py-8 w-full">
//       {/* Header Section */}
//       <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto text-center px-4">
//         <h1 className="text-[32px] leading-[48px] font-bold 2xl:text-5xl">
//           Marketplace
//         </h1>
//         <p className="text-[18px] font-medium text-[rgba(11,8,36,0.53)] 2xl:text-2xl">
//           Locate your ideal property and buy your share today.
//         </p>
//       </div>

//       {/* Property List Section */}
//       <div className="flex justify-center w-full px-4 sm:px-0 max-w-6xl 2xl:max-w-[90rem] mx-auto">
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 w-full">
//           <PropertiesLoadingSkelton numbers={3}>
//             {properties?.slice(3).map((property, index) => (
//               <PropertyCard key={index} {...property} />
//             ))}
//           </PropertiesLoadingSkelton>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MarketPlace;
