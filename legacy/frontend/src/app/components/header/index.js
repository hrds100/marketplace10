"use client";
import Link from "next/link";
import LoginButton from "@/utils/loginButton";
import { useNfstayContext } from "@/context/NfstayContext";
import profile from "../../images/profile2.svg";
import Image from "next/image";
import { usePathname } from "next/navigation"; // Add this import
import { useEffect, useState } from "react";
import { useKYCContext } from "@/context/KYCModalContext";

const Header = ({ sidebarOpen, setSidebarOpen, isRestricted }) => {
  const { connectedAddress, userProfileDetails } = useNfstayContext();
  const pathname = usePathname(); // Get pathname using Next.js hook
  const [isClient, setIsClient] = useState(false);
  const { isRegistered } = useKYCContext();
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <header className="sticky top-0 items-center  gap-5 z-10 flex w-full bg-white border-b shadow-sm ">
      <div className="flex w-full items-start  justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          {/* <!-- Hamburger Toggle BTN --> */}
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(!sidebarOpen);
            }}
            className="z-10 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm   lg:hidden"
          >
            <span className="relative block h-[1.50rem] w-[1.50rem] cursor-pointer">
              <span className="block absolute right-0 h-full w-full">
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-[0] duration-200 ease-in-out  ${
                    !sidebarOpen && "!w-full delay-300"
                  }`}
                ></span>
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-150 duration-200 ease-in-out  ${
                    !sidebarOpen && "delay-400 !w-full"
                  }`}
                ></span>
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-200 duration-200 ease-in-out  ${
                    !sidebarOpen && "!w-full delay-500"
                  }`}
                ></span>
              </span>
              <span className="absolute right-0 h-full w-full rotate-45">
                <span
                  className={`absolute left-2.5 top-0 block h-full w-0.5 rounded-sm bg-black delay-300 duration-200 ease-in-out  ${
                    !sidebarOpen && "!h-0 !delay-[0]"
                  }`}
                ></span>
                <span
                  className={`delay-400 absolute left-0 top-2.5 block h-0.5 w-full rounded-sm bg-black duration-200 ease-in-out  ${
                    !sidebarOpen && "!h-0 !delay-200"
                  }`}
                ></span>
              </span>
            </span>
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-5 justify-center  sm:justify-between w-full">
          {isClient && pathname === "/checkout" && (
            <div className="flex p-2 max-w-56 justify-center items-center text-center gap-1 max-md:hidden">
              <svg
                width="28"
                height="28"
                className="shrink-0 size-5 sm:size-auto"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clip-path="url(#clip0_747_4227)">
                  <mask
                    id="mask0_747_4227"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="28"
                    height="28"
                  >
                    <path
                      d="M0 8.2016e-05H27.9999V28H0V8.2016e-05Z"
                      fill="white"
                    />
                  </mask>
                  <g mask="url(#mask0_747_4227)">
                    <path
                      d="M25.375 14C25.375 20.2562 20.2562 25.375 14 25.375C7.74384 25.375 2.625 20.2562 2.625 14C2.625 7.74384 7.74384 2.625 14 2.625C20.2562 2.625 25.375 7.74384 25.375 14Z"
                      stroke="#9945FF"
                      stroke-width="1.5"
                      stroke-miterlimit="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M15.7183 2.625L16.5438 4.97841C16.8751 5.90404 16.1513 6.86515 15.1228 6.86515H14.2173C13.3883 6.86515 12.7164 7.504 12.7164 8.29212V8.7731C12.7164 9.30983 12.4426 9.84442 11.9434 10.0878C10.7338 10.6776 10.1718 12.0157 10.7798 13.1717L11.2154 14L7.80695 11.8397C7.17726 11.4405 6.94111 10.6469 7.30544 10.0162C7.8064 9.14887 7.30599 8.07641 6.30741 7.83905L4.375 7.3917"
                      stroke="#9945FF"
                      stroke-width="1.5"
                      stroke-miterlimit="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M14.875 15.416C15.0853 15.8415 15.4087 16.1993 15.8088 16.4494C16.2089 16.6995 16.6699 16.832 17.1402 16.832H18.375V18.2479C18.375 19.0364 18.0564 19.7497 17.5422 20.2632C16.0844 21.719 14.8228 23.4093 14.175 25.375L13.6701 24.3537C13.0815 23.163 12.775 21.8029 12.775 20.4717C12.775 20.2156 12.7251 19.962 12.6282 19.7254C12.5313 19.4888 12.3893 19.2738 12.2102 19.0927L11.375 18.2479L11.7922 17.8259C12.3791 17.2323 12.5246 16.3255 12.1534 15.5747L11.375 14H12.6098C13.0801 14 13.5411 14.1325 13.9412 14.3826C14.3413 14.6327 14.6647 14.9905 14.875 15.416Z"
                      stroke="#9945FF"
                      stroke-width="1.5"
                      stroke-miterlimit="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M21.3943 5.25L20.9907 6.31666C20.9112 6.52681 20.7772 6.71776 20.5994 6.87441L19.7244 7.64526C19.574 7.77776 19.4547 7.93507 19.3733 8.10819C19.2919 8.28132 19.25 8.46687 19.25 8.65426V9.49018C19.25 10.2782 19.9752 10.9171 20.8698 10.9171C21.7644 10.9171 22.4896 11.556 22.4896 12.3441V13.4342C22.4896 13.6557 22.431 13.8742 22.3186 14.0724L22.0419 14.5598C21.5034 15.5086 22.2866 16.625 23.4907 16.625H25.375"
                      stroke="#9945FF"
                      stroke-width="1.5"
                      stroke-miterlimit="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                </g>
                <defs>
                  <clipPath id="clip0_747_4227">
                    <rect width="28" height="28" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <h4 className="font-medium text-sm sm:text-base text-[#9945FF] transition-all">
                Works in any country around the globe
              </h4>
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-5 justify-end flex-1">
            <span className="text-sm flex items-center gap-2 font-medium text-[#0C0839] pr-2 max-md:hidden">
              <img
                src="/images/airbnb.png"
                alt="airbnb"
                className="w-6 min-6"
              />
              <a href="https://go.nfstay.com" target="_blank">
                {" "}
                Our Managed Airbnbs
              </a>{" "}
            </span>
            {!isRegistered ? (
              <div
                className={`flex items-center justify-center w-[38px] h-[38px] rounded-full border-2 overflow-hidden opacity-50 cursor-not-allowed`}
                title="Access will be granted after owning shares"
              >
                <Image
                  alt="profile"
                  width={40}
                  height={40}
                  className="w-full h-full rounded-full object-cover grayscale"
                  src={
                    userProfileDetails.profilePhoto !== ""
                      ? userProfileDetails.profilePhoto
                      : profile
                  }
                  onError={(e) =>
                    (e.target.src =
                      "https://photos.pinksale.finance/file/pinksale-logo-upload/1738084118513-3f883127da3bdced958eb3c04358b816.png")
                  }
                />
              </div>
            ) : (
              <Link href="/settings">
                <div
                  className={`flex items-center hover:scale-105 transition-all ease-in-out justify-center w-[38px] h-[38px] rounded-full border-2 overflow-hidden`}
                >
                  <Image
                    alt="profile"
                    width={40}
                    height={40}
                    className="w-full h-full rounded-full object-cover"
                    src={
                      userProfileDetails.profilePhoto !== ""
                        ? userProfileDetails.profilePhoto
                        : profile
                    }
                    onError={(e) =>
                      (e.target.src =
                        "https://photos.pinksale.finance/file/pinksale-logo-upload/1738084118513-3f883127da3bdced958eb3c04358b816.png")
                    }
                  />
                </div>
              </Link>
            )}
            <LoginButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
