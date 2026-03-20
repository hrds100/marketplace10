"use client";
import { useEffect, useState } from "react";
import PaymentDetail from "../components/pageA/paymentDetail";
import PaymentFlow from "../components/pageA/paymentFlow";
import BreadDown from "../details/breadDown";
import PropertyDetail from "../details/propertyDetail";
import property from "../images/house.jpg";
import img1 from "../images/shares.png";
import { fetchPrimarySalesEvents } from "@/context/subgraphHelper";
import { useNfstayContext } from "@/context/NfstayContext";
import ShowVideo from "../components/showVideo";
import Connect from "../components/connect";
import PlaceMyOrder from "../components/pageA/placeMyOrder";
import ShowSponsors from "../components/pageA/showSponsors";
import TeamSlider from "../components/teams";
import Properties from "../components/properties";
import Safety from "../components/safety";
import Faq from "../components/faq";
import Footer from "../funnet/footer";
import { useSearchParams } from "next/navigation";

const Checkout = () => {
  const { getPropertyDetails, getPrimaryPropertyRemainingShares } =
    useNfstayContext();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [propertyDetails, setPropertyDetails] = useState({
    id: "",
    pricePerShare: 0,
    totalOwners: 0,
    apr: 0,
    totalShares: 0,
    metadata: {
      name: "",
      description: "",
      // image: listProperty,
      // images: [listProperty],
      image: "",
      images: [],
      amount: "0",
      category: "",
    },
    propertyLocation: {
      location: "",
      longitude: 0,
      latitude: 0,
    },
    beds: 0,
    sqft: 0,
    remainingShares: 0,
    totalSharesInMarket: 0,
    transactionBreakdown: [
      {
        description: "",
        amount: 0,
        calculation_basis: "",
      },
    ],
    rentalBreakdown: [
      {
        description: "",
        value: 0,
        calculation_basis: "",
      },
    ],
  });

  const getProperty = async () => {
    try {
      setLoading(true);
      let property = await fetchPrimarySalesEvents(2);
      property = property[0];
      let details = await getPropertyDetails(property._propertyId);

      const { remainingShares, totalSharesInMarket } =
        await getPrimaryPropertyRemainingShares(property._propertyId);
      details = {
        ...details,
        remainingShares,
        totalSharesInMarket,
      };

      setPropertyDetails(details);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProperty();
  }, []);

  useEffect(() => {
    if (Number(searchParams.get("amount")))
      setAmount(Number(searchParams.get("amount")));
  }, [searchParams]);

  const source = "checkout";
  const paymentData = {
    propertyImage: property,
    propertyTitle: "Authentic 3-Bedroom Penthouse With A Priv...",
    sharesCount: amount,
    pricePerShare: 1,
    processingFee: 10,
    transactionFeePercentage: 0.025, // 2.5%
    sharesImage: img1,
    propertyId: 1,
  };

  const smartLandlordsList = [
    "Unmatched Safety",
    "Transparency",
    "High Yield Returns",
    "Get Started with just $1000",
  ];

  if (!propertyDetails) return "No property found";
  return (
    <div className="w-full flex flex-col">
      <div className="pb-2.5 w-full flex flex-col gap-6 xl:pb-1">
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-T7P8W7NJ"
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        ></iframe>
        {/* <div className='flex items-center justify-center w-full py-4'>
          <div className='flex items-center justify-center lg:max-w-5xl w-full px-4'>
            <h1 className='text-4xl break-words md:text-[58px] px-4 leading-[66.69px] whitespace-pre-line text-center'>
              <span className='font-bold'>Watch</span> how we’re 
              <span className='font-bold'>democratizing</span> <br /> real
              estate investing
            </h1>
          </div>
        </div> */}
        {/* <ShowVideo /> */}
        {/* <Connect /> */}
        {loading ? (
          <PropertyDetailsSkeleton />
        ) : (
          <PropertyDetail propertyDetails={propertyDetails} source={source} />
        )}
        {loading ? (
          <PaymentDetailsSkeleton isShowPayments={false} />
        ) : (
          <PaymentDetail
            totalOwners={propertyDetails.totalOwners}
            totalShares={propertyDetails.totalShares}
            remainingShares={propertyDetails.remainingShares}
            totalSharesInMarket={propertyDetails.totalSharesInMarket}
          />
        )}
        <div className="flex flex-col w-full py-4 gap-8">
          <div className="w-full grid grid-cols-1 md:grid-cols-[43%_54%]  gap-8  pb-8">
            <div className="flex flex-col justify-start items-start pl-3 gap-5">
              <h1 className="text-[30px] leading-[55.2px] whitespace-pre-line text-center">
                Become a <span className="font-bold">SA Partner</span> 
              </h1>

              <div className="flex items-center gap-2 p-1 px-8 text-sm font-bold w-fit  rounded-full bg-[#FFF9E6] text-[#805F04]">
                <svg
                  width="27"
                  height="27"
                  viewBox="0 0 27 27"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21.8738 14.7028C21.8738 20.1602 18.0537 22.8889 13.5131 24.4716C13.2753 24.5521 13.0171 24.5483 12.7818 24.4607C8.23034 22.8889 4.41016 20.1602 4.41016 14.7028V7.06246C4.41016 6.77298 4.52515 6.49536 4.72984 6.29066C4.93454 6.08597 5.21216 5.97098 5.50164 5.97098C7.6846 5.97098 10.4133 4.6612 12.3125 3.00215C12.5437 2.80459 12.8379 2.69604 13.142 2.69604C13.4461 2.69604 13.7403 2.80459 13.9715 3.00215C15.8816 4.67211 18.5994 5.97098 20.7824 5.97098C21.0718 5.97098 21.3495 6.08597 21.5542 6.29066C21.7588 6.49536 21.8738 6.77298 21.8738 7.06246V14.7028Z"
                    stroke="#805F04"
                    stroke-width="1.96466"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M9.87109 13.6112L12.0541 15.7941L16.42 11.4282"
                    stroke="#805F04"
                    stroke-width="1.96466"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Security at NFsTay.com
              </div>
              <div className="flex flex-col gap-4 relative">
                {smartLandlordsList?.map((item, i) => {
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 font-semibold text-[20px]"
                    >
                      <span className="shrink-0">
                        <svg
                          width="27"
                          height="27"
                          viewBox="0 0 27 27"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M13.0984 24.7296C19.1265 24.7296 24.0132 19.8429 24.0132 13.8148C24.0132 7.78675 19.1265 2.90002 13.0984 2.90002C7.07032 2.90002 2.18359 7.78675 2.18359 13.8148C2.18359 19.8429 7.07032 24.7296 13.0984 24.7296Z"
                            fill="#9945FF"
                            stroke="#9945FF"
                            stroke-width="1.30978"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M9.82422 13.8148L12.0072 15.9978L16.3731 11.6318"
                            stroke="white"
                            stroke-width="1.96466"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </span>
                      {item}
                    </div>
                  );
                })}
                {/* <Image
                  src={arrow}
                  alt='arrow'
                  width={160}
                  height={60}
                  className='rotate-90 md:rotate-0 transition-all md:absolute mix-blend-multiply md:-bottom-[.8rem] md:right-0 md:translate-x-full'
                /> */}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {loading ? (
                <PaymentSummarySkeleton />
              ) : (
                <>
                  <div className="flex flex-col gap-5 p-5 rounded-xl shadow bg-white border-2  ">
                    <h2 className="text-2xl font-bold text-gray-800">
                      Payment Summary
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between text-gray-600">
                        <span>Price Per Share</span>
                        <span>${paymentData.pricePerShare.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Shares Purchased</span>
                        <span>{paymentData.sharesCount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>
                          $
                          {(
                            paymentData.pricePerShare * paymentData.sharesCount
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>
                          <del>
                            Transaction Fee (
                            {paymentData.transactionFeePercentage * 100}
                            %)
                          </del>
                        </span>
                        <span>
                          <del>
                            ~${paymentData.transactionFeePercentage * amount}
                          </del>
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Grand Total</span>
                        <span>${amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <PlaceMyOrder
                      height="h-[50px] !text-base"
                      title={`Yes! I want $${amount.toLocaleString()} in Property shares`}
                      type={"button"}
                    />
                    <ShowSponsors />
                  </div>
                  {/* <p className=" text-center">
                    {`Get $${
                      amount * 0.1
                    } cashback* when you invest your first $${amount.toLocaleString()}`}
                  </p> */}
                </>
              )}
            </div>
          </div>
        </div>
        <PaymentFlow />

        {loading ? (
          <BreadDownSkeleton />
        ) : (
          <BreadDown
            transactionBreakdown={propertyDetails.transactionBreakdown}
            rentalBreakdown={propertyDetails.rentalBreakdown}
          />
        )}

        <div className="flex items-center justify-center py-8 flex-col gap-5">
          <div className=" bg-[#954AFC1A] px-2 py-1 rounded-[50px] justify-center items-center inline-flex">
            <span className="text-center text-violet-500 text-xs font-bold  leading-normal 2xl:text-3xl">
              Team
            </span>
          </div>
          <TeamSlider />
        </div>
        <Properties disableClick={true} />
        <Connect />
        <Safety />
        <Connect />
        <Faq />
        <Footer />
      </div>
    </div>
  );
};

export default Checkout;

export const PropertyDetailsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 w-full min-h-[400px]  sm:grid-cols-2 gap-8">
      <div className="flex w-full h-full relative rounded-xl overflow-hidden">
        <div className="w-full h-[400px] bg-gray-200 animate-pulse" />
        <div className="flex items-center justify-between w-full p-4 absolute top-0">
          <div className="flex items-center w-24 h-5 gap-2  rounded-full bg-white"></div>
        </div>
      </div>
      <div className="flex flex-col w-full h-full gap-5">
        <div className="flex items-center w-32 h-10 bg-gray-200 animate-pulse rounded-lg" />

        <p className="2xl:text-base w-full rounded-full h-6 bg-gray-200 animate-pulse"></p>
        <div className="flex flex-wrap gap-5 w-full  2xl:text-lg">
          <div className="flex items-center  gap-1">
            <div className="size-6 rounded-full bg-gray-200 animate-pulse" />
            <p className="2xl:text-base  w-32  rounded-full h-4 bg-gray-200 animate-pulse"></p>
          </div>
          <div className="flex items-center  gap-1">
            <div className="size-6 rounded-full bg-gray-200 animate-pulse" />
            <p className="2xl:text-base  w-32 rounded-full h-4 bg-gray-200 animate-pulse"></p>
          </div>
        </div>

        <div className="grid grid-cols-1 w-full sm:grid-cols-2 gap-5">
          <div className="p-4 flex flex-col w-full h-24 gap-4 bg-[#F5F5F5] rounded-lg">
            <p className="2xl:text-base w-11/12 h-4 rounded-full bg-gray-200 animate-pulse"></p>
            <p className="2xl:text-base w-10 h-full rounded bg-gray-300 animate-pulse"></p>
          </div>
          <div className="p-4 flex flex-col gap-4 w-full h-24 bg-[#F5F5F5] rounded-lg">
            <p className="2xl:text-base w-11/12 h-4 rounded-full bg-gray-200 animate-pulse"></p>
            <p className="2xl:text-base w-10 h-full rounded bg-gray-300 animate-pulse"></p>
          </div>
          <div className="p-4 flex flex-col gap-4 w-full h-24 bg-[#F5F5F5] rounded-lg">
            <p className="2xl:text-base w-11/12 h-4 rounded-full bg-gray-200 animate-pulse"></p>
            <p className="2xl:text-base w-10 h-full rounded bg-gray-300 animate-pulse"></p>
          </div>
          <div className="p-4 flex flex-col gap-4 w-full h-24 bg-[#F5F5F5] rounded-lg">
            <p className="2xl:text-base w-11/12 h-4 rounded-full bg-gray-200 animate-pulse"></p>
            <p className="2xl:text-base w-10 h-full rounded bg-gray-300 animate-pulse"></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PaymentDetailsSkeleton = ({
  isShowPayments = true,
  showButton = false,
}) => {
  return (
    <div className="w-full flex flex-col gap-5 border-2 rounded-xl shadow p-5 ">
      <div className="flex flex-wrap gap-5 w-full  2xl:text-lg">
        <p className="2xl:text-base w-32 h-4 bg-gray-200 animate-pulse rounded-full"></p>
        <p className="2xl:text-base w-32 h-4 bg-gray-200 animate-pulse rounded-full"></p>
        <p className="2xl:text-base w-24 h-4 bg-gray-200 animate-pulse rounded-full"></p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="w-2/3 h-4 bg-gray-200 animate-pulse rounded-full" />
        <div className="w-full rounded-full h-3 bg-gray-200 animate-pulse" />
      </div>
      {showButton && <div className="w-full bg-gray-200 rounded-full h-8" />}
      <div className="flex flex-wrap gap-5 justify-center w-full  2xl:text-lg">
        <div className="flex items-center  gap-1">
          <p className="2xl:text-base w-16 h-4 bg-gray-200 animate-pulse rounded-full"></p>
        </div>
        <div className="flex items-center  gap-1">
          <p className="2xl:text-base w-40 h-4 bg-gray-200 animate-pulse rounded-full"></p>
        </div>
      </div>
      {isShowPayments && (
        <div className="flex flex-wrap gap-5 justify-center w-full  2xl:text-lg">
          <p className="2xl:text-base w-7/12 h-4 bg-gray-200 animate-pulse rounded-full"></p>
        </div>
      )}
    </div>
  );
};

export const PaymentSummarySkeleton = () => {
  return (
    <div className="flex flex-col gap-5 p-5 rounded-xl shadow-md bg-white border ">
      <h2 className="text-2xl font-bold text-gray-800">Payment Summary</h2>

      <div className="space-y-3">
        <div className="flex justify-between text-gray-600">
          <span className="w-32 h-5 bg-gray-200 animate-pulse" />
          <span className="w-16 h-5 bg-gray-200 animate-pulse" />
        </div>

        <div className="flex justify-between text-gray-600">
          <span className="w-32 h-5 bg-gray-200 animate-pulse" />
          <span className="w-16 h-5 bg-gray-200 animate-pulse" />
        </div>
        <div className="flex justify-between text-gray-600">
          <span className="w-32 h-6 bg-gray-200 animate-pulse" />
          <span className="w-16 h-5 bg-gray-200 animate-pulse" />
        </div>

        <div className="flex justify-between text-gray-600">
          <span className="w-32 h-6 bg-gray-200 animate-pulse" />
          <span className="w-8 h-5 bg-gray-200 animate-pulse" />
        </div>
        <div className="flex justify-between text-gray-600">
          <span className="w-32 h-6 bg-gray-200 animate-pulse" />
          <span className="w-16 h-5 bg-gray-200 animate-pulse" />
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-8" />
      <div className="flex flex-wrap gap-5 justify-center w-full  2xl:text-lg">
        <p className="2xl:text-base w-7/12 h-4 bg-gray-200 animate-pulse rounded-full"></p>
      </div>
    </div>
  );
};

export const BreadDownSkeleton = () => {
  return (
    <div className="flex flex-col w-full gap-5">
      <h4 className="text-title-lg font-bold text-black 2xl:text-3xl">
        Financial Breakdown
      </h4>
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 h-fit">
        <div className="p-4 flex flex-col gap-5 bg-[#F7F6FF] rounded-lg h-fit">
          <div className="flex pb-3 border-b-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white rounded-lg shadow-lg border flex items-center justify-center">
                <div className="size-8 rounded bg-gray-200 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="w-24 h-5 bg-gray-200 animate-pulse" />
                <div className="w-16 h-4 bg-gray-200 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="w-40 h-4 bg-gray-200 animate-pulse"></p>
              <div className="size-6 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex justify-between text-gray-600">
              <span className="w-32 h-6 bg-gray-200 animate-pulse" />
              <span className="w-16 h-5 bg-gray-200 animate-pulse" />
            </div>
            <div className="flex justify-between text-gray-600">
              <span className="w-32 h-6 bg-gray-200 animate-pulse" />
              <span className="w-16 h-5 bg-gray-200 animate-pulse" />
            </div>
            <div className="flex justify-between text-gray-600">
              <span className="w-32 h-6 bg-gray-200 animate-pulse" />
              <span className="w-16 h-5 bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-5 bg-[#F7F6FF] rounded-lg h-fit">
          <div className="flex pb-3 border-b-2 justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white rounded-lg shadow-lg border flex items-center justify-center">
                <div className="size-8 rounded bg-gray-200 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="w-24 h-5 bg-gray-200 animate-pulse" />
                <div className="w-16 h-4 bg-gray-200 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="w-40 h-4 bg-gray-200 animate-pulse"></p>
              <div className="size-6 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex justify-between text-gray-600">
              <span className="w-32 h-6 bg-gray-200 animate-pulse" />
              <span className="w-16 h-5 bg-gray-200 animate-pulse" />
            </div>
            <div className="flex justify-between text-gray-600">
              <span className="w-32 h-6 bg-gray-200 animate-pulse" />
              <span className="w-16 h-5 bg-gray-200 animate-pulse" />
            </div>
            <div className="flex justify-between text-gray-600">
              <span className="w-32 h-6 bg-gray-200 animate-pulse" />
              <span className="w-16 h-5 bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DocumentsSkeleton = () => {
  return (
    <div className="flex items-center justify-center rounded-lg bg-gray-100 w-full min-h-52">
      <div className="flex items-center flex-col justify-center gap-5 max-w-max ">
        <h1 className="text-3xl font-bold text-center  2xl:text-4xl">
          Download Confidential documents
        </h1>
        <div className="flex items-center gap-5 flex-wrap justify-center">
          <div className="flex items-center gap-2 h-6 w-48 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse" />
          <div className="flex items-center gap-2 h-6 w-32 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse" />
          <div className="flex items-center gap-2 h-6 w-52 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse" />
          <div className="flex items-center gap-2 h-6 w-32 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export const ContactInfoSkeleton = () => {
  return (
    <div className="flex flex-col gap-5 p-5 rounded-xl shadow-md bg-white border ">
      <div className="w-[50%] h-4 rounded-full bg-gray-200 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <div className="w-[40%] h-3 rounded-full bg-gray-200 animate-pulse" />
          <div className="w-full h-10 rounded-lg bg-gray-200 animate-pulse" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="w-[40%] h-3 rounded-full bg-gray-200 animate-pulse" />
          <div className="w-full h-10 rounded-lg bg-gray-200 animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="w-[30%] h-3 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-full h-10 rounded-lg bg-gray-200 animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="w-[30%] h-3 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-full h-10 rounded-lg bg-gray-200 animate-pulse" />
      </div>
      <div className="w-full h-9 rounded-full bg-gray-200 animate-pulse" />
      <div className="text-sm text-gray-600 flex items-center justify-center gap-2">
        <div className="w-[20%] h-5 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-[20%] h-5 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-[20%] h-5 rounded-full bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
};
