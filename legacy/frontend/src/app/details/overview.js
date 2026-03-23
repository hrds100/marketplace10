"use client";
import BreadDown from "./breadDown";
import Documents from "./documents";
import Location from "./location";
import Payment from "./payment";
import Profit from "./profit";
import PropertyDetail from "./propertyDetail";
import RecentActivity from "./recentActivity";
import { Suspense, useEffect, useRef, useState } from "react";
import { usenfstayContext } from "@/context/nfstayContext";
import { usePathname } from "next/navigation";
import Skeleton from "./skeleton";
import PropertyNotFound from "../components/propertyNotFound";
import { BASEURL } from "@/config";
import { fetchPrimarySalesEvents } from "@/context/subgraphHelper";

const Overview = ({
  fetchMarketplaceProperties,
  propertyDetails,
  secondaryDetails = {
    seller: "",
    pricePerShare: 0,
    sharesRemaining: 0,
    endTime: 0,
  },
  isLoading,
  setIsLoading,
  source,
  listingId = 0,
  fetchSecondarySaleProperties,
}) => {
  const pathname = usePathname();
  const { connectedAddress, getMarketplaceFee } = usenfstayContext();
  const [isCopied, setIsCopied] = useState(false);
  const [isPropertyAvailable, setIsPropertyAvailable] = useState(false);
  const [amount, setAmount] = useState();
  const [marketFees, setMarketFees] = useState(0);
  const inputRef = useRef();
  const currentTimeInSeconds = Math.floor(new Date().getTime() / 1000);
  const isUpcoming = source === "upcoming";
  const isSaleExpired =
    (source === "secondary" &&
      secondaryDetails.endTime > 0 &&
      currentTimeInSeconds > secondaryDetails.endTime) ||
    (source === "marketplace" && propertyDetails.remainingShares == 0);
  const isSeller =
    connectedAddress &&
    secondaryDetails.seller.toLowerCase() === connectedAddress.toLowerCase();
  const handleBuyNowClick = () => {
    if (amount && amount > 0) {
      inputRef.current.scrollToInput();
      inputRef.current.showMessage(`You want to invest $${amount}`);
    } else {
      inputRef.current.scrollToInput();
      inputRef.current.showMessage("Please enter a valid amount to invest.");
    }
  };
  const textToCopy = `${BASEURL}/marketplace?id=${propertyDetails.id}&referral=${connectedAddress}&amount=1000`;
  const copyToClipboard = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Hide "Copied" after 2 seconds
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const platformFee = await getMarketplaceFee();
        if (source === "marketplace")
          setMarketFees(Number(platformFee?.[0]?._hex || 0) / 100);
        else setMarketFees(Number(platformFee?.[1]?._hex || 0) / 100);
      } catch (err) {
        console.log(err);
      }
    })();
  }, []);

  useEffect(() => {
    if (Number(propertyDetails.id) !== 0 && source !== "secondary") {
      (async () => {
        try {
          let properties;
          if (source == "upcoming") {
            properties = await fetchPrimarySalesEvents(1);
          } else {
            properties = await fetchPrimarySalesEvents(2);
          }

          // Check if a specific property ID exists in the fetched properties
          const targetPropertyId = propertyDetails.id; // Replace with the actual property ID to check
          const isAvailable = properties.some(
            (property) => property._propertyId === targetPropertyId
          );

          setIsPropertyAvailable(isAvailable);
        } catch (error) {
          console.log(error);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [pathname, propertyDetails]);

  if (isLoading) return <Skeleton source={source} />;
  if (
    (!isLoading && propertyDetails.totalShares == 0) ||
    (!isLoading && source !== "secondary" && !isPropertyAvailable) ||
    (!isLoading &&
      source == "secondary" &&
      secondaryDetails.sharesRemaining == 0)
  )
    return <PropertyNotFound />;

  return (
    <div className="h-full flex flex-col gap-8 w-full">
      <div className="pb-2.5  flex flex-col gap-6 xl:pb-1">
        <div className="flex items-center justify-between gap-5">
          <div className="flex gap-2 flex-col justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
                Overview
              </h4>
            </div>
          </div>
        </div>
        <PropertyDetail
          propertyDetails={propertyDetails}
          secondaryDetails={secondaryDetails}
          source={source}
        />

        <div className="grid grid-cols-1 sm:grid-cols-[45%_52.5%] gap-6">
          <Location location={propertyDetails.propertyLocation} />

          {isUpcoming || (isSaleExpired && !isSeller) ? (
            <button
              type="button"
              className="w-full 2xl:text-lg whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium text-white flex items-center gap-2 justify-center bg-gray-400 cursor-not-allowed"
              disabled
            >
              {isUpcoming ? "Coming Soon" : "Sale Expired"}
            </button>
          ) : (
            <Suspense>
              <Payment
                fetchMarketplaceProperties={fetchMarketplaceProperties}
                property={propertyDetails}
                secondaryDetails={secondaryDetails}
                ref={inputRef}
                amount={amount}
                setAmount={setAmount}
                listingId={listingId}
                source={source}
                marketFees={marketFees}
                fetchSecondarySaleProperties={fetchSecondarySaleProperties}
              />
            </Suspense>
          )}
        </div>
        {source == "secondary" && (
          <RecentActivity propertyId={propertyDetails.id} source={source} />
        )}
        {source === "marketplace" &&(
          <>
            { propertyDetails.remainingShares > 0 && <Profit
              onBuyNowClick={handleBuyNowClick}
              propertyDetails={propertyDetails}
            />}
            <RecentActivity propertyId={propertyDetails.id} source={source} />
            <BreadDown
              transactionBreakdown={propertyDetails.transactionBreakdown}
              rentalBreakdown={propertyDetails.rentalBreakdown}
            />
            <Documents />
            {connectedAddress && source == "marketplace" && (
              <div className="flex items-center p-4 md:p-8 shadow border rounded-lg justify-center">
                <div className="flex items-center flex-wrap gap-3">
                  <h3 className="font-bold text-base 2xl:text-2xl">
                    Agent URL
                  </h3>
                  <div
                    className="flex items-center whitespace-pre-line break-all px-4 py-1.5 rounded-lg border-2 border-dashed 2xl:text-lg border-[#9945FF] text-[#9945FF] font-medium"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(153, 69, 255, 0.08) 0%, rgba(133, 49, 235, 0.08) 100%)",
                    }}
                  >
                    {textToCopy}
                  </div>

                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 text-white font-medium bg-[#9945FF] px-3 py-1.5 rounded-lg 2xl:text-lg"
                  >
                    <svg
                      width="21"
                      height="21"
                      viewBox="0 0 21 21"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M14 11.2875V14.9625C14 18.025 12.775 19.25 9.7125 19.25H6.0375C2.975 19.25 1.75 18.025 1.75 14.9625V11.2875C1.75 8.225 2.975 7 6.0375 7H9.7125C12.775 7 14 8.225 14 11.2875Z"
                        fill="white"
                      />
                      <path
                        d="M14.9625 1.75H11.2875C8.63885 1.75 7.37108 2.67286 7.07642 4.89685C7.00327 5.44894 7.46378 5.90625 8.02069 5.90625H9.71254C13.3875 5.90625 15.0938 7.6125 15.0938 11.2875V12.9793C15.0938 13.5363 15.5511 13.9968 16.1032 13.9236C18.3272 13.629 19.25 12.3612 19.25 9.7125V6.0375C19.25 2.975 18.025 1.75 14.9625 1.75Z"
                        fill="white"
                      />
                    </svg>
                    {isCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Overview;
