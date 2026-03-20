"use client";

import { useEffect, useState } from "react";
import { fetchPrimarySalesEvents } from "@/context/subgraphHelper";
import { useNfstayContext } from "@/context/NfstayContext";
import ShowVideo from "../components/showVideo";
import Connect from "../components/connect";
import TeamSlider from "../components/teams";
import Faq from "../components/faq";
import Image from "next/image";
import CountdownTimer from "../components/CountdownTimer";

const partners = [
  {
    name: "Zillow",
    image: "/images/checkout/partners/zillow.png",
  },
  {
    name: "Rightmove",
    image: "/images/checkout/partners/rightmove.png",
  },
  {
    name: "Bayut",
    image: "/images/checkout/partners/bayut.png",
  },
  {
    name: "Openrent",
    image: "/images/checkout/partners/openrent.png",
  },
  {
    name: "Zoopla",
    image: "/images/checkout/partners/zoopla.png",
  },
  {
    name: "Prime Location",
    image: "/images/checkout/partners/primelocation.png",
  },
];

const Checkout = () => {
  const { getPropertyDetails, getPrimaryPropertyRemainingShares } =
    useNfstayContext();
  const [loading, setLoading] = useState(true);
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

        <div className="w-full pb-4 px-8 md:px-10 2xl:px-14">
          <div className="text-center text-3xl md:text-5xl font-bold md:font-extrabold md:!leading-[56px]">
            Word-for-Word Script to Convince Landlords & Agents to Practically{" "}
            <span className="text-[#9945FF]">
              Beg You to Take Their Properties!
            </span>
          </div>

          <br />
          <br />

          {/* <ShowVideo />
          <br />

          <p className="lg:w-[93%] mx-auto text-base md:text-lg text-center font-medium">
            <b className="text-[#0C0839] font-bold md:font-extrabold">
              MASSIVE BONUS:
            </b>{" "}
            Shortcut access to your first Airbnb deal - Get your first payout
            within 30 days, 100% guaranteed! (Mind Blowing Loophole)
          </p> */}
        </div>
{/* 
        <div className="px-4 md:px-6 2xl:px-10 flex flex-wrap gap-4 justify-between items-center !my-8 md:!mt-9 md:!mb-14">
          {partners.map((partner, i) => (
            <div key={i} className="flex items-center gap-2">
              <Image
                src={partner.image}
                alt={partner.name}
                width={140}
                height={48}
                quality={100}
              />
            </div>
          ))}
        </div>

        <div className="px-4 md:pl-12 xl:pl-16 flex flex-col w-full py-4 gap-8">
          <h1 className="text-4xl md:text-5xl font-bold md:font-extrabold text-[#9945FF] ">
            Here&apos;s What You&apos;ll Get:
          </h1>
          <div className="w-full grid grid-cols-1 items-center md:grid-cols-[40%_58%] xl:grid-cols-[40%_70%] gap-4">
            <ul className="list-disc xl:relative text-xl md:text-2xl pl-6 space-y-4 md:space-y-6 capitalize text-[#0C0839] font-medium">
              <li>
                <span className="font-bold md:font-extrabold text-[#9945FF]">
                  Word-for-Word Script:
                </span>{" "}
                The &quot;ONE CALL CLOSE&quot; pitch that gets landlords and
                agents saying yes fast.
              </li>
              <li>
                <span className="font-bold md:font-extrabold text-[#9945FF]">
                  Shortcut to Your First Deal:
                </span>{" "}
                Use our loophole to land your first Airbnb in 30 days – payout
                guaranteed.
              </li>
              <li>
                <span className="font-bold md:font-extrabold text-[#9945FF]">
                  No-Fluff, No-Bs PDF:
                </span>{" "}
                A straight-talking 1-page pdf explaining how to launch your own
                Airbnb™ without owning a single property.
              </li>
              <li>
                <span className="font-bold md:font-extrabold text-[#9945FF]">
                  100% Guarantee:
                </span>{" "}
                We&apos;re one of the UK&apos;s top Airbnb pros. What works for
                us will work for you - or you get a full refund. No fluff. No
                risk. 💸
              </li>
            </ul>
            <div className="w-full h-full xl:-ml-36">
              <img
                src="/images/checkout/upscale.png"
                alt="upscale"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <br />
        <br />
        <div className="px-4 md:px-6 2xl:px-10 space-y-4">
          <Connect isCheckout={true} />
          <CountdownTimer />
        </div>

        <br />
        <br />

        <div className="px-4 md:px-12 xl:px-16 w-full grid grid-cols-1 items-center md:grid-cols-[60%_38%] gap-4">
          <p className="text-2xl md:text-3xl font-medium !leading-9 xl:!leading-10">
            <b className="text-[#0C0839] font-bold md:font-extrabold">
              Close landlords & agents fast
            </b>{" "}
            – plus our proven Airbnb loophole to start earning in 30 days,{" "}
            <b className="text-[#0C0839] font-bold md:font-extrabold">
              100% guaranteed
            </b>
            . <br />
            <br />
            The same call script we used to go from{" "}
            <b className="text-[#0C0839] font-bold md:font-extrabold">
              0 to 100+ Airbnb
            </b>{" "}
            properties{" "}
            <b className="text-[#0C0839] font-bold md:font-extrabold">
              EXTREMELY FAST!
            </b>{" "}
            <br />
            <br /> We&apos;re one of the UK&apos;s biggest Airbnb players –{" "}
            <b className="text-[#0C0839] font-bold md:font-extrabold">
              if it works for us, it&apos;ll work for you.
            </b>{" "}
            <br />
            <br />
            <b className="text-[#0C0839] font-bold md:font-extrabold">
              Or your money back
            </b>{" "}
            💸.
            <br />
            <br />
            <span className="max-md:hidden text-base md:text-lg rounded-xl border border-[#0000001F] flex items-center gap-4 h-[56px] px-6 w-fit text-[#0C0839]">
              <img src="/images/airbnb.png" alt="airbnb" />
              Our Managed Airbnbs
            </span>
          </p>
          <div className="w-full h-full">
            <img
              src="/images/checkout/moneyback.png"
              alt="money back"
              className="w-full max-md:w-[80%] lg:w-[95%]"
            />
            <span className="md:hidden text-base md:text-lg rounded-xl border border-[#0000001F] flex items-center gap-4 h-[56px] px-6 w-fit text-[#0C0839]">
              <img src="/images/airbnb.png" alt="airbnb" />
              Our Managed Airbnbs
            </span>
          </div>
        </div>

        <br />
        <br />

        <div className="px-4 md:px-6 2xl:px-10">
          <div className="md:px-6 w-full grid grid-cols-1 items-center md:grid-cols-2 gap-4 md:gap-10 border border-[#0000001F] rounded-xl">
            <img
              src="/images/checkout/landlord.png"
              alt="landlord"
              className="max-md:pl-4 md:mx-4 xl:pt-6 w-full xl:w-[94%]"
            />
            <p className="relative text-2xl md:text-[32px] p-4 lg:pr-10 font-medium !leading-9 xl:!leading-[44px]">
              <b className="text-[#0C0839] font-bold md:font-extrabold">
                Landlords are begging
              </b>{" "}
              to hand over their properties - and they don&apos;t even realize
              it! <br />
              <br />{" "}
              <b className="text-[#0C0839] font-bold md:font-extrabold">
                This &apos;barely legal&apos; Airbnb hack forces agents and
                owners to give you 5 to 10 properties
              </b>
              . <br />
              <br /> The exact{" "}
              <b className="text-[#0C0839] font-bold md:font-extrabold">
                word-for-word script
              </b>
              that turns you into a property magnet is HERE{" "}
              <b className="text-[#0C0839] font-bold md:font-extrabold">
                - get it NOW before it&apos;s too late{" "}
              </b>
              <img
                src="/images/checkout/signature.png"
                alt="signature"
                className="absolute right-4 bottom-0 md:-bottom-3"
              />
            </p>
          </div>
        </div>

        <br />
        <br />
        <br />

        <div className="px-4 md:pl-12 xl:pl-24 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          <p className="text-[#0C0839] md:max-w-[485px] !leading-9 xl:!leading-[44px] text-2xl md:text-[32px] font-bold md:font-extrabold md:pt-6">
            Get your hands on this{" "}
            <span className="text-[#9945FF]">one-call script</span> that closes
            landlords and agents & handle ALL OBJECTION without fail.
            <br />
            <br />
            Plus{" "}
            <span className="text-[#9945FF]">
              shortcut access to receive your first Airbnb payout
            </span>{" "}
            in the next{" "}
            <span className="text-[#9945FF]">30 days - 100% guaranteed!</span>
          </p>
          <div className="w-full h-full lg:ml-14">
            <img src="/images/checkout/callscript.png" alt="call script" />
          </div>
        </div>

        <br />
        <div className="px-4 md:px-6 2xl:px-10 space-y-4">
          <Connect isCheckout={true} />
          <CountdownTimer />
        </div>
        <br />

        <div className="px-4 md:px-6 2xl:px-10">
          <div
            className="p-6 md:p-10 rounded-2xl md:rounded-3xl"
            style={{
              background: `url("/images/checkout/frame.png") no-repeat center center`,
              backgroundSize: "cover",
            }}
          >
            <div className="flex items-center max-md:flex-wrap gap-10 md:gap-16 lg:max-w-[77%] mx-auto">
              <div className="text-white">
                <p className="text-xl md:text-2xl font-bold mb-2">
                  &quot;If You Don&apos;t Have Income-Producing Assets, Your 9-5
                  Has Too Much Control Over Your Life.&quot;
                </p>
                <p className="capitalize font-medium text-lg mb-4">
                  grant cardone
                </p>
                <span className="text-sm font-medium opacity-70">
                  DISCLAIMER: This is not an endorsement from Grant Cardone
                </span>
              </div>
              <img
                src="/images/checkout/grant.png"
                alt="grant"
                className="max-md:block mx-auto w-fit"
              />
            </div>
          </div>
        </div>

        <br />

        <div className="px-4 md:px-6 2xl:px-10 flex items-center justify-center !mt-20 flex-col gap-10">
          <div className=" bg-[#954AFC1A] px-4 py-1.5 rounded-[50px] justify-center items-center inline-flex">
            <span className="text-center text-violet-500 text-xs md:text-sm font-bold leading-normal">
              Team
            </span>
          </div>
          <TeamSlider />
        </div>

        <div className="px-4 md:px-6 2xl:px-10 space-y-4">
          <Connect isCheckout={true} />
          <CountdownTimer />
        </div>

        <Faq />

        <div className="px-4 md:px-6 2xl:px-10 max-w-5xl w-full mx-auto 2xl:max-w-[90rem] space-y-4 text-center">
          <p className="text-lg md:text-2xl font-semibold text-[#0B0824]">
            Terms & Conditions & Refund Policy
          </p>
          <p className="text-sm opacity-70 font-medium">
            This site is not a part of the Facebook website or Facebook Inc.
            Additionally, This site is NOT endorsed by Facebook in any way.
            FACEBOOK is a trademark of FACEBOOK, Inc.The information provided on
            this page is for general informational purposes only. The contents
            are designed to provide insights, strategies, and tools to help
            hosts in the short-term rental industry maximize their earnings and
            improve their property management skills. However, individual
            results may vary, and success is dependent on various factors
            including market conditions, property location, and individual
            effort.
            <br />
            <br />
            While our course aims to provide accurate and up-to-date
            information, we cannot guarantee the completeness, reliability, or
            accuracy of the content. Hosts are encouraged to conduct their own
            research and seek professional advice before making any investment
            or legal decisions. Please note this program is not affiliated with
            Airbnb and does not represent the company or its official products
            or services. The resource created by industry professionals to
            provide guidance and support to hosts. By using the content and
            implementing the strategies and techniques provided, hosts accept
            full responsibility for their actions and outcomes. The content
            creators and authors shall not be held liable for any damages,
            losses, or expenses incurred as a result of the use of the
            information provided.
          </p>
        </div> */}
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
