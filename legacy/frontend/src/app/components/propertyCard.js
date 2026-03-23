"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { usenfstayContext } from "@/context/nfstayContext";
import PropertySkelton from "@/utils/propertySkelton";
import AuctionTimer from "./auctionTimer";
import Strip from "./strip";
import GradientBtn from "./gradientBtn";
import SharesSold from "./sharesSold";
import { formatNumber } from "@/context/helper";
import { useBulkBuyContext } from "@/context/BulkBuyContext";

const PropertyCard = ({
  propertyId,
  isDisabled,
  listingId = 0,
  source,
  disableClick,
  cartItems = [],
  onAddToCart,
  isDrawerOpen = false,
}) => {
  const router = useRouter();
  const {
    getPropertyDetails,
    getPrimaryPropertyRemainingShares,
    getSecondaryListingDetails,
  } = usenfstayContext();

  const { isMobile, isMobileBulkMode } = useBulkBuyContext();

  const [secondaryDetails, setSecondaryDetails] = useState({
    seller: "",
    pricePerShare: 0,
    sharesRemaining: 0,
    endTime: 0,
  });

  const [propertyDetails, setPropertyDetails] = useState({
    id: 0,
    pricePerShare: 0,
    totalOwners: 0,
    apr: 0,
    totalShares: 0,
    totalSharesInMarket: 0,
    remainingShares: 0,
    metadata: {
      description: "",
      image: "",
      images: [],
      name: "",
      attributes: [],
      amount: "",
      category: "",
    },
    beds: null,
    sqft: null,
  });

  const [isLoading, setIsLoading] = useState(true);

  const isAuctionExpired = (endTime) =>
    endTime <= Math.floor(Date.now() / 1000);

  // Cart management function
  const addToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      const propertyData = {
        propertyId,
        listingId,
        pricePerShare:
          source === "secondary"
            ? secondaryDetails.pricePerShare
            : propertyDetails.pricePerShare,
        maxRemainingShares:
          source === "secondary"
            ? secondaryDetails.sharesRemaining
            : propertyDetails.remainingShares,
        metadata: propertyDetails.metadata,
        source,
      };
      onAddToCart(propertyData);
    }
  };

  // Handle button click based on drawer state
  const handleButtonClick = (e) => {
    if (source === "upcoming") {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/${source}?id=${propertyId}`);
    } else if (isDrawerOpen) {
      addToCart(e);
    } else {
      e.preventDefault();
      e.stopPropagation();
      router.push(
        `/${source}${
          source !== "secondary" ? `?id=${propertyId}` : `?id=${listingId}`
        }`
      );
    }
  };

  // Get button text based on drawer state and cart status
  const getButtonText = () => {
    if (source === "upcoming") return "View";
    if (isDrawerOpen) return "Add to Cart";

    // Mobile-specific logic: show "Buy Now" instead of "Buy" when not in bulk mode
    if (isMobile && !isMobileBulkMode) return "Buy Now";

    return "Buy";
  };

  const isSoldOut =
    (source === "marketplace" &&
      propertyDetails.totalShares > 0 &&
      propertyDetails.remainingShares === 0) ||
    (source === "secondary" &&
      (secondaryDetails.sharesRemaining === 0 ||
        (secondaryDetails.endTime > 0 &&
          isAuctionExpired(secondaryDetails.endTime))));

  const isRentToRent =
    source === "marketplace" ||
    (source === "checkout" &&
      propertyDetails?.metadata?.category === "Rent 2 Rent") ||
    source === "secondary" ||
    (source === "checkout" &&
      secondaryDetails?.metadata?.category === "Rent 2 Rent");

  const fetchPropertyDetails = async () => {
    setIsLoading(true);
    try {
      const details = await getPropertyDetails(propertyId);
      let updatedDetails = { ...propertyDetails, ...details };

      if (source === "marketplace") {
        const { remainingShares, totalSharesInMarket } =
          await getPrimaryPropertyRemainingShares(propertyId);
        updatedDetails = {
          ...updatedDetails,
          remainingShares,
          totalSharesInMarket,
        };
      }

      if (source === "secondary") {
        const secondaryDetailsData = await getSecondaryListingDetails(
          listingId
        );
        setSecondaryDetails(secondaryDetailsData);
      }

      setPropertyDetails(updatedDetails);
    } catch (error) {
      console.error("Error fetching property details:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) fetchPropertyDetails();
  }, [propertyId]);

  if (isLoading) return <PropertySkelton source={source} />;

  const { metadata, pricePerShare, totalSharesInMarket, remainingShares, apr } =
    propertyDetails;
  const city = metadata.attributes.find(
    (attr) => attr.trait_type === "City"
  )?.value;
  const country = metadata.attributes.find(
    (attr) => attr.trait_type === "Country"
  )?.value;

  const renderPriceComparison = () => {
    const comparison =
      secondaryDetails.pricePerShare - propertyDetails.pricePerShare;
    const percentage = (
      (Math.abs(comparison) / propertyDetails.pricePerShare) *
      100
    ).toFixed(2);

    if (comparison > 0)
      return (
        <span className="text-green-600">
          {percentage}% higher than market price
        </span>
      );
    if (comparison < 0)
      return (
        <span className="text-red-600">
          {percentage}% lower than market price
        </span>
      );
    return <span className="text-gray-600">Same as market price</span>;
  };

  return (
    <div
      className={`flex flex-col rounded-lg shadow-md ${
        isSoldOut ? "grayscale" : ""
      }`}
    >
      {/* <Link
        href={`/${source}/${propertyId}${
          source === "secondary" ? `?listingId=${listingId}` : ""
        }`}
        className={`flex flex-col h-full ${
          isSoldOut ? "pointer-events-none" : ""
        }`}
      > */}

      {disableClick ? (
        <>
          {" "}
          {/* Image Section */}
          <div className="relative">
            <div className="h-[20rem]">
              <Image
                src={metadata.image}
                layout="fill"
                className="w-full h-full object-cover max-w-full rounded-t-lg"
                alt={metadata.name || "Real Estate"}
                onError={(e) =>
                  (e.target.src =
                    "https://photos.pinksale.finance/file/pinksale-logo-upload/1734453431720-03dcb198e4d12e88ccc503011e0cd48f.jpg")
                }
              />
            </div>
            <div className="absolute -bottom-6 -left-2 z-[1]">
              {source === "secondary" && secondaryDetails.endTime > 0 ? (
                <AuctionTimer saleEndTime={secondaryDetails.endTime} />
              ) : (
                <Strip
                  price={
                    source === "secondary"
                      ? secondaryDetails.pricePerShare
                      : propertyDetails?.transactionBreakdown?.[1]?.amount || 0
                  }
                />
              )}
            </div>
            <div className="absolute top-2 left-2 bg-white rounded-lg px-3 py-1 min-w-[60px] flex items-center justify-center">
              <span className="text-[0.6rem] 2xl:text-sm uppercase gradient_text font-boldpx-1 rounded">
                {isSoldOut
                  ? source === "secondary" &&
                    secondaryDetails.endTime > 0 &&
                    isAuctionExpired(secondaryDetails.endTime)
                    ? "Expired"
                    : "Sold Out"
                  : source === "marketplace"
                  ? propertyDetails.metadata.category
                  : source === "secondary"
                  ? secondaryDetails.metadata.category
                  : ""}
              </span>
            </div>
          </div>
          {/* Content Section */}
          <div className="flex flex-col p-3 pt-8 gap-4 divide-y">
            {/* Title and Location */}
            <div className="flex flex-col gap-2">
              <h1 className="font-bold text-xl max-w-[18rem] 2xl:text-3xl 2xl:max-w-[35rem]">
                {metadata.name}
              </h1>
              <span className="text-xs opacity-60 2xl:text-base">
                {city}, {country}
              </span>
            </div>

            {/* Metrics Section */}
            <div className="flex items-center py-2 flex-wrap gap-y-5 justify-between gap-2">
              <Metric
                title={isRentToRent ? "Expected ROI" : "Expected Return"}
                value={`${(parseFloat(apr) * (isRentToRent ? 5 : 6))?.toFixed(
                  2
                )}%`}
              />
              <Metric
                title={isRentToRent ? "Yearly Yield" : "Dividend Yield"}
                value={`${parseFloat(apr)?.toFixed(2)}%`}
              />
              <Metric
                title={isRentToRent ? "Payout Frequency" : "Dividend Frequency"}
                value="Monthly"
              />
              {source === "secondary" && (
                <Metric
                  title="Shares for Sale"
                  value={formatNumber(secondaryDetails.sharesRemaining)}
                />
              )}
            </div>

            {/* Shares Sold or Sale End Time Info */}
            {source === "secondary" && (
              <div className="flex flex-col items-center justify-center gap-1 pt-4">
                <span className="font-semibold text-sm 2xl:text-lg">
                  {renderPriceComparison()}
                </span>
              </div>
            )}
            {source === "marketplace" && (
              <SharesSold
                sold={propertyDetails.totalShares - remainingShares}
                total={propertyDetails.totalShares}
              />
            )}

            {/* Footer Section */}
            <div className="flex justify-between items-end gap-2 w-full py-2">
              <div className="flex flex-col gap-1">
                <span className="text-[0.6rem] opacity-60 2xl:text-lg">
                  Minimum Investment
                </span>
                <h1 className="font-bold text-sm 2xl:text-xl">
                  {/* {source === "secondary"
                    ? secondaryDetails.pricePerShare
                    : propertyDetails.pricePerShare || 0}{" "} */}
                  10 USD
                </h1>
              </div>
              {!isSoldOut && (
                <GradientBtn
                  disabled={isDisabled}
                  handleClick={handleButtonClick}
                  text={getButtonText()}
                  size="text-sm"
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {isDrawerOpen ? (
            <div className="flex flex-col h-full">
              <CardBody
                {...{
                  metadata,
                  source,
                  secondaryDetails,
                  propertyDetails,
                  isSoldOut,
                  city,
                  country,
                  isRentToRent,
                  apr,
                  renderPriceComparison,
                  totalSharesInMarket,
                  remainingShares,
                  isDisabled,
                  handleButtonClick,
                  getButtonText,
                }}
              />
            </div>
          ) : (
            <Link
              href={`/${source}?${
                source !== "secondary" ? `id=${propertyId}` : `id=${listingId}`
              }`}
              className="flex flex-col h-full"
            >
              <CardBody
                {...{
                  metadata,
                  source,
                  secondaryDetails,
                  propertyDetails,
                  isSoldOut,
                  city,
                  country,
                  isRentToRent,
                  apr,
                  renderPriceComparison,
                  totalSharesInMarket,
                  remainingShares,
                  isDisabled,
                  handleButtonClick,
                  getButtonText,
                }}
              />
            </Link>
          )}
        </>
      )}
    </div>
  );
};

const CardBody = ({
  metadata,
  source,
  secondaryDetails,
  propertyDetails,
  isSoldOut,
  city,
  country,
  isRentToRent,
  apr,
  renderPriceComparison,
  totalSharesInMarket,
  remainingShares,
  isDisabled,
  handleButtonClick,
  getButtonText,
  pricePerShare,
}) => {
  return (
    <>
      {/* Image Section */}
      <div className="relative">
        <div className="h-[20rem]">
          <Image
            src={metadata.image}
            layout="fill"
            className="w-full h-full object-cover max-w-full rounded-t-lg"
            alt={metadata.name || "Real Estate"}
            onError={(e) =>
              (e.target.src =
                "https://photos.pinksale.finance/file/pinksale-logo-upload/1734453431720-03dcb198e4d12e88ccc503011e0cd48f.jpg")
            }
          />
        </div>
        <div className="absolute -bottom-6 -left-2 z-[1]">
          {source === "secondary" && secondaryDetails.endTime > 0 ? (
            <AuctionTimer saleEndTime={secondaryDetails.endTime} />
          ) : (
            <Strip
              price={
                source === "secondary"
                  ? secondaryDetails.pricePerShare
                  : propertyDetails?.transactionBreakdown?.[1]?.amount || 0
              }
            />
          )}
        </div>
        <div className="absolute top-2 left-2 bg-white rounded-lg px-3 py-1 min-w-[60px] flex items-center justify-center">
          <span className="text-[0.6rem] 2xl:text-sm uppercase gradient_text font-boldpx-1 rounded">
            {isSoldOut
              ? source === "secondary" &&
                secondaryDetails.endTime > 0 &&
                isAuctionExpired(secondaryDetails.endTime)
                ? "Expired"
                : "Sold Out"
              : source === "marketplace"
              ? propertyDetails?.metadata?.category
              : source === "secondary"
              ? secondaryDetails?.metadata?.category
              : ""}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col p-3 pt-8 gap-4 divide-y">
        {/* Title and Location */}
        <div className="flex flex-col gap-2">
          <h1 className="font-bold text-xl max-w-[18rem] 2xl:text-3xl 2xl:max-w-[35rem]">
            {metadata.name}
          </h1>
          <span className="text-xs opacity-60 2xl:text-base">
            {city}, {country}
          </span>
        </div>

        {/* Metrics Section */}
        <div className="flex items-center py-2 flex-wrap gap-y-5 justify-between gap-2">
          <Metric
            title={isRentToRent ? "Expected ROI" : "Expected Return"}
            value={`${(parseFloat(apr) * (isRentToRent ? 5 : 6))?.toFixed(2)}%`}
          />
          <Metric
            title={isRentToRent ? "Yearly Yield" : "Dividend Yield"}
            value={`${parseFloat(apr)?.toFixed(2)}%`}
          />
          <Metric
            title={isRentToRent ? "Payout Distribution" : "Dividend Frequency"}
            value="Monthly"
          />
          {source === "secondary" && (
            <Metric
              title="Shares for Sale"
              value={formatNumber(secondaryDetails.sharesRemaining)}
            />
          )}
        </div>

        {/* Shares Sold or Sale End Time Info */}
        {source === "secondary" && (
          <div className="flex flex-col items-center justify-center gap-1 pt-4">
            <span className="font-semibold text-sm 2xl:text-lg">
              {renderPriceComparison()}
            </span>
          </div>
        )}
        {source === "marketplace" && (
          <SharesSold
            sold={propertyDetails.totalShares - remainingShares}
            total={propertyDetails.totalShares}
          />
        )}

        {/* Footer Section */}
        <div className="flex justify-between items-end gap-2 w-full py-2">
          <div className="flex flex-col gap-1">
            <span className="text-[0.6rem] opacity-60 2xl:text-lg">
              Minimum Investment
            </span>
            <h1 className="font-bold text-sm 2xl:text-xl">
              {/* {source === "secondary"
                ? secondaryDetails.pricePerShare
                : propertyDetails.pricePerShare || 0}{" "} */}
              10 USD
            </h1>
          </div>
          {!isSoldOut && (
            <GradientBtn
              disabled={isDisabled}
              handleClick={handleButtonClick}
              text={getButtonText()}
              size="text-sm"
            />
          )}
        </div>
      </div>
    </>
  );
};

const Metric = ({ title, value }) => (
  <div className="flex flex-col gap-1">
    <h1 className="font-bold text-sm 2xl:text-2xl">{value}</h1>
    <span className="text-[0.6rem] opacity-60 2xl:text-sm">{title}</span>
  </div>
);

export default PropertyCard;
