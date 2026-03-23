import { usenfstayContext } from "@/context/nfstayContext";
import {
  fetchPrimarySharesBoughtEvents,
  fetchSecondarySharesBoughtEvents,
} from "@/context/subgraphHelper";
import { useEffect, useState } from "react";

// Function to format the date

const RecentActivity = ({ propertyId, source }) => {
  const { fetchActivityData, activityData } = usenfstayContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propertyId > 0) {
      fetchActivityData(source, propertyId);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [source, propertyId]);

  return (
    <div className="flex flex-col gap-5">
      <h4 className="text-title-lg font-bold text-black 2xl:text-3xl">
        Recent Activity
      </h4>

      {loading ? (
        <div className="overflow-x-auto">
          <table className="w-full shrink-0 whitespace-nowrap">
            <thead>
              <tr className="text-sm text-[#0C0839] opacity-40 2xl:text-lg">
                <th className="text-left p-4">Event</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">From</th>
                <th className="text-left p-4">To</th>
                <th className="text-left p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="p-4 text-sm 2xl:text-lg text-[#0C0839] flex items-center gap-2">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                  </td>
                  <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  </td>
                  <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                  </td>
                  <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                  </td>
                  <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activityData.length === 0 ? (
        <div className="text-center text-lg text-gray-500">
          No Recent Activity Found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full shrink-0 whitespace-nowrap">
            <thead>
              <tr className="text-sm text-[#0C0839] opacity-40 2xl:text-lg">
                <th className="text-left p-4">Event</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">From</th>
                <th className="text-left p-4">To</th>
                <th className="text-left p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {activityData.slice(0, 5).map((item, index) => (
                <tr
                  key={index}
                  className={`text-[#0C0839] font-medium ${
                    index < activityData.length - 1 ? "border-b-2" : ""
                  }`}
                >
                  <td className="p-4 text-sm 2xl:text-lg text-[#0C0839] flex items-center gap-2">
                    {/* Add the SVG icon before the event name */}
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8.03894 13.2275L9.51477 13.8875C10.4589 14.3092 11.5406 14.3092 12.4939 13.8875L13.9698 13.2275C15.2898 12.6409 16.5089 14.2359 15.5923 15.3542L12.4206 19.2317C11.6414 20.185 10.3673 20.185 9.57894 19.2317L6.41644 15.3542C5.49061 14.2359 6.70977 12.6409 8.03894 13.2275Z"
                        fill="#954AFC"
                      />
                      <path
                        d="M7.85567 10.6975C7.58067 10.8992 7.61734 11.3208 7.92901 11.4767L10.0832 12.5492C10.5873 12.8058 11.4032 12.8058 11.8982 12.5492L14.0523 11.4767C14.3548 11.3208 14.3915 10.9083 14.1257 10.6975L11.2748 8.55251C11.1098 8.43334 10.8898 8.43334 10.7248 8.55251L7.85567 10.6975Z"
                        fill="#954AFC"
                      />
                      <path
                        d="M16.3898 7.55336L12.5673 2.78669C12.494 2.69503 12.4115 2.61253 12.329 2.53003C12.0906 2.30086 11.7515 2.51169 11.7515 2.84169V6.78336C11.7515 6.93003 11.8156 7.06753 11.9348 7.15003L15.739 10.01L15.904 10.1292C16.069 10.2484 16.2981 10.2484 16.4356 10.1017C17.0773 9.40503 17.0681 8.39669 16.3898 7.55336Z"
                        fill="#954AFC"
                      />
                      <path
                        d="M5.60086 7.63581L9.40503 2.79581C9.47837 2.70415 9.5517 2.62165 9.6342 2.53915C9.87253 2.30998 10.2117 2.51165 10.2117 2.85081V6.85665C10.2117 7.00331 10.1475 7.13165 10.0284 7.22331L6.24253 10.1291L6.0867 10.2483C5.9217 10.3675 5.69253 10.3675 5.54587 10.2116C4.92253 9.50582 4.9317 8.49748 5.60086 7.63581Z"
                        fill="#954AFC"
                      />
                    </svg>
                    {item.event}
                  </td>
                  <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                    {item.price}
                  </td>
                  <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                    {item.from !== "Market"
                      ? `${item.from.slice(0, 6)}...${item.from.slice(-6)}`
                      : item.from}
                  </td>
                  <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                    {item.to.slice(0, 6)}...{item.to.slice(-6)}
                  </td>
                  <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                    {item.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
