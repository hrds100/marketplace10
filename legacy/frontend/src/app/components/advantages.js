"use client";
import Image from "next/image";

import b2 from "../images/b-2.png";
import b11 from "../images/b-11.png";
import { useState } from "react";
import { usenfstayContext } from "@/context/nfstayContext";
import Link from "next/link";

const Advantages = () => {

  const { connectedAddress,  setLoginModelOpen } = usenfstayContext();

  const cardImage1 = b2;
  const cardImage2 = b11;

  return (
    <div
      id="advantages"
      className="flex flex-col gap-8 items-center py-12 my-8 w-full bg-[#F7F6FF]"
    >
      <div className="flex items-center flex-col gap-5 self-center justify-center w-full md:max-w-[25rem] 2xl:max-w-[35rem] ">
        <h1 className="text-[32px] leading-[48px] 2xl:text-5xl text-center font-bold">
          Explore our advantages and top features
        </h1>
      </div>
      <div className="flex items-center justify-center w-full p-4 sm:p-0 max-w-6xl 2xl:max-w-[90rem] ">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4  gap-3">
          <div className="md:col-span-2 flex flex-col-reverse md:flex-row md:items-center gap-8 w-full bg-white p-6  rounded-lg">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl 2xl:text-3xl font-semibold">
                High Yield Properties
              </h2>
              <p className="opacity-60 text-sm 2xl:text-lg ">
                You invest, and we take care of the rest, from sourcing the best
                deals to day-to-day management. nfstay ensures the best return
                on your investment possible.
              </p>
            </div>

            <Image
              src={cardImage1}
              width={180}
              height={400}
              className="md:h-[13rem] w-full md:w-[180px] rounded-xl"
              alt="High Yield Properties"
            />
          </div>
          <div className="flex flex-col justify-evenly    w-full gap-3 bg-white p-6 rounded-lg">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#954AFC]">
              <svg
                width="25"
                height="25"
                viewBox="0 0 29 29"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clip-path="url(#clip0_1_1971)">
                  <path
                    d="M28.0938 2.50684H13.4203C11.5189 2.50684 9.88373 3.41739 8.93404 5.00503C8.93404 5.00503 5.48338 10.7731 5.45432 10.8213C5.07364 11.4516 5.02861 11.6108 5.01632 12.3701L5.00584 12.9364H2.88188C2.3814 12.9364 1.97563 13.3421 1.97563 13.8426V24.6806H0.90625C0.405773 24.6806 0 25.0863 0 25.5868C0 26.0873 0.405773 26.4931 0.90625 26.4931H20.5421C21.0426 26.4931 21.4484 26.0873 21.4484 25.5868C21.4484 25.0863 21.0426 24.6806 20.5421 24.6806H19.4728V16.9264C19.6647 16.8768 19.8629 16.8314 20.0708 16.784C21.2183 16.5222 22.6327 16.1995 24.3748 14.7297H28.0938C28.5942 14.7297 29 14.3239 29 13.8234V3.41309C29 2.91261 28.5942 2.50684 28.0938 2.50684ZM17.6603 24.6806H3.78812V14.7489H12.4061C12.1082 15.0656 11.7677 15.4773 11.3794 16.0931C10.3354 17.7487 9.94366 19.1155 10.2151 20.1555C10.7045 22.0305 13.0441 22.3104 14.4403 21.3005C15.3449 20.6462 15.9755 19.7094 16.6603 18.8458C17.0156 18.3978 17.3436 18.0613 17.6603 17.8018V24.6806ZM12.0946 12.679C12.4835 12.2685 12.8506 11.8329 13.1595 11.3056C13.553 11.4206 13.9816 11.5016 14.3917 11.5474C14.3587 11.6588 14.318 11.7831 14.2682 11.9224C14.1194 12.3381 13.9839 12.667 13.8554 12.9364H12.1288C12.1189 12.8495 12.1076 12.7633 12.0946 12.679ZM19.6676 15.0169C18.2966 15.3297 16.879 15.6531 15.2402 17.7197C14.6989 18.4023 14.197 19.1592 13.5224 19.7213C13.1407 20.0394 12.1597 20.4056 11.9671 19.691C11.8803 19.369 11.9984 18.9803 12.0999 18.6782C12.4896 17.5175 13.2247 16.4647 14.0984 15.6177C14.7063 15.0285 15.2806 14.4719 15.9746 12.5333C16.2471 11.7724 16.3562 11.2085 16.3396 10.6476C16.3322 10.3994 16.2233 10.165 16.0384 9.99937C15.8534 9.83375 15.609 9.751 15.3611 9.77111C14.7629 9.81886 13.6364 9.64429 13.1749 9.37157C12.946 9.2362 12.6691 9.20838 12.4176 9.29521C12.1662 9.38216 11.9657 9.57513 11.8692 9.82305C11.564 10.6074 11.0577 11.1569 10.4761 11.7437C10.2628 11.9588 10.1712 12.2662 10.2318 12.563C10.2593 12.6976 10.282 12.8221 10.3 12.9362H6.81868L6.82865 12.3993C6.83103 12.2497 6.83358 12.0953 6.84105 12.0427C6.86156 11.9971 10.4896 5.93535 10.4896 5.93535C11.1129 4.89316 12.1538 4.31922 13.4204 4.31922H23.13V13.4079C21.7683 14.5372 20.7458 14.7709 19.6676 15.0169ZM27.1875 12.9172H24.9424V4.31934H27.1875V12.9172Z"
                    fill="white"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_1_1971">
                    <rect width="29" height="29" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </div>

            <h2 className="text-2xl 2xl:text-3xl font-semibold flex-1">
              Active Partnership
            </h2>
            <p className="opacity-60 text-sm 2xl:text-lg flex-1">
              Every partner is actively involved & has a voice in the
              decision-making of all major matters regarding our properties.
              This process is conducted through democratic voting.
            </p>
          </div>
          <div className="flex flex-col justify-evenly    w-full gap-3 bg-white p-6 rounded-lg">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#954AFC]">
              <svg
                width="25"
                height="25"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 12.5175C4 20.152 8.87734 27.1238 16.1362 29.8649L16.4943 30L18.0508 29.4238L17.3436 27.5591L16.5032 27.8662C10.2202 25.3272 6.02592 19.2075 6.02592 12.5175V8.08565L16.4998 4.13187L26.9741 8.08565C26.9741 8.08565 26.9642 13.0198 26.9548 13.2696L26.9177 14.2636L28.9421 14.3375L28.9797 13.3434C28.9901 13.0684 29 6.71752 29 6.71752L16.4998 2L4 6.71752V12.5175Z"
                  fill="white"
                />
                <path
                  d="M4 12.5175C4 20.152 8.87734 27.1238 16.1362 29.8649L16.4943 30L18.0508 29.4238L17.3436 27.5591L16.5032 27.8662C10.2202 25.3272 6.02592 19.2075 6.02592 12.5175V8.08565L16.4998 4.13187L26.9741 8.08565C26.9741 8.08565 26.9642 13.0198 26.9548 13.2696L26.9177 14.2636L28.9421 14.3375L28.9797 13.3434C28.9901 13.0684 29 6.71752 29 6.71752L16.4998 2L4 6.71752V12.5175Z"
                  stroke="white"
                />
                <path
                  d="M23.9529 14.0502C22.6304 12.7285 20.8725 12 19.0018 12C17.1316 12 15.3737 12.7285 14.0512 14.0502C12.7287 15.3719 12 17.1303 12 19C12 20.8697 12.7287 22.6272 14.0512 23.9498C15.3737 25.2715 17.1316 26 19.0018 26C20.8725 26 22.6304 25.2715 23.9529 23.9498C26.6824 21.2201 26.6824 16.779 23.9529 14.0502ZM15.4414 22.56C14.4904 21.6088 13.9662 20.3447 13.9662 19C13.9662 17.6553 14.4904 16.3912 15.4414 15.44C17.4057 13.4781 20.6003 13.4791 22.5627 15.44C24.5256 17.4029 24.5256 20.5962 22.5627 22.56C20.5998 24.5219 17.4052 24.5219 15.4414 22.56Z"
                  fill="white"
                />
                <path
                  d="M23.9529 14.0502C22.6304 12.7285 20.8725 12 19.0018 12C17.1316 12 15.3737 12.7285 14.0512 14.0502C12.7287 15.3719 12 17.1303 12 19C12 20.8697 12.7287 22.6272 14.0512 23.9498C15.3737 25.2715 17.1316 26 19.0018 26C20.8725 26 22.6304 25.2715 23.9529 23.9498C26.6824 21.2201 26.6824 16.779 23.9529 14.0502ZM15.4414 22.56C14.4904 21.6088 13.9662 20.3447 13.9662 19C13.9662 17.6553 14.4904 16.3912 15.4414 15.44C17.4057 13.4781 20.6003 13.4791 22.5627 15.44C24.5256 17.4029 24.5256 20.5962 22.5627 22.56C20.5998 24.5219 17.4052 24.5219 15.4414 22.56Z"
                  stroke="white"
                />
                <path
                  d="M24 26L25.4142 24.5858L28.2426 27.4142L26.8284 28.8284L24 26Z"
                  fill="white"
                />
                <path
                  d="M24 26L25.4142 24.5858L28.2426 27.4142L26.8284 28.8284L24 26Z"
                  stroke="white"
                />
              </svg>
            </div>

            <h2 className="text-2xl 2xl:text-3xl font-semibold flex-1">
              Transparency
            </h2>
            <p className="opacity-60 text-sm 2xl:text-lg flex-1">
              We operate with utmost transparency with our partners. No
              surprises. No hidden fees.
            </p>
          </div>

          <div className="flex flex-col justify-evenly    w-full gap-3 bg-white p-6 rounded-lg">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#954AFC]">
              <svg
                width="50"
                height="50"
                viewBox="0 0 50 50"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M26.1668 13.1719V13.6848C26.4779 13.7434 26.7793 13.8164 27.0516 13.8895C27.3505 13.97 27.6054 14.1664 27.7603 14.4356C27.9152 14.7047 27.9575 15.0246 27.878 15.325C27.7978 15.6253 27.6023 15.8814 27.3344 16.0371C27.0664 16.1928 26.7479 16.2354 26.4488 16.1555C25.9191 16.0137 25.4233 15.916 24.9807 15.9113C24.6256 15.9063 24.2659 15.9941 24.0376 16.1262C23.9357 16.1895 23.8871 16.2434 23.8673 16.2723C23.8422 16.3132 23.8304 16.361 23.8335 16.409V16.4383C23.8432 16.4484 23.877 16.4969 23.9941 16.5652C24.276 16.7363 24.6941 16.8684 25.326 17.0586L25.3696 17.073C25.9094 17.2344 26.6284 17.4539 27.2118 17.8203C27.878 18.2402 28.4807 18.9387 28.4951 20.0129C28.5099 21.1113 27.9413 21.9121 27.1974 22.3809C26.8765 22.5772 26.5271 22.7222 26.1618 22.8105V23.3281C26.1618 23.9777 25.6418 24.5 24.9951 24.5C24.3488 24.5 23.8284 23.9777 23.8284 23.3281V22.7715C23.3668 22.659 22.9437 22.5125 22.584 22.3906C22.4821 22.3566 22.3848 22.3223 22.2923 22.293C22.1467 22.2443 22.0121 22.1673 21.8962 22.0663C21.7802 21.9653 21.6852 21.8424 21.6166 21.7046C21.548 21.5667 21.5071 21.4166 21.4962 21.2629C21.4854 21.1092 21.5048 20.9548 21.5534 20.8086C21.6019 20.6624 21.6785 20.5272 21.779 20.4107C21.8796 20.2942 22.0019 20.1988 22.1392 20.1299C22.2764 20.061 22.4258 20.0199 22.5789 20.009C22.7319 19.9981 22.8856 20.0176 23.0312 20.0664C23.158 20.1105 23.2746 20.1492 23.3862 20.1887C24.0474 20.4133 24.5238 20.5742 25.0344 20.5938C25.4233 20.6086 25.7682 20.5156 25.9677 20.3934C26.0599 20.3348 26.1038 20.2859 26.1233 20.252C26.1427 20.2227 26.1668 20.1641 26.1622 20.0516V20.0418C26.1622 19.993 26.1622 19.9395 25.9677 19.8172C25.6904 19.6414 25.2724 19.5047 24.6501 19.3145L24.5576 19.2852C24.0326 19.1289 23.3423 18.9187 22.7881 18.582C22.1321 18.1863 21.5001 17.5078 21.4951 16.4285C21.4904 15.3105 22.1223 14.5437 22.8418 14.1141C23.1529 13.9289 23.4881 13.8016 23.8237 13.7141V13.1719C23.8237 12.5223 24.3437 12 24.9904 12C25.6372 12 26.1571 12.5223 26.1571 13.1719H26.1668ZM38.6211 28.4207C38.7726 28.6271 38.8821 28.8615 38.9433 29.1105C39.0046 29.3595 39.0163 29.6181 38.9779 29.8716C38.9395 30.1252 38.8517 30.3686 38.7196 30.588C38.5874 30.8075 38.4135 30.9986 38.2077 31.1504L32.0539 35.7059C30.9171 36.5465 29.5424 37 28.1307 37H12.5556C11.6953 37 11 36.302 11 35.4375V32.3125C11 31.448 11.6953 30.75 12.5556 30.75H14.3445L16.5269 28.9922C17.6306 28.1052 19.0024 27.6229 20.4159 27.625H28.1113C28.9719 27.625 29.6669 28.323 29.6669 29.1875C29.6669 30.052 28.9719 30.75 28.1113 30.75H24.2224C23.7946 30.75 23.4446 31.1016 23.4446 31.5312C23.4446 31.9609 23.7946 32.3125 24.2224 32.3125H30.0849L35.9035 28.0059C36.1091 27.8537 36.3424 27.7438 36.5903 27.6823C36.8381 27.6209 37.0956 27.6091 37.348 27.6476C37.6004 27.6862 37.8428 27.7744 38.0612 27.9071C38.2797 28.0398 38.4699 28.2141 38.6211 28.4207Z"
                  fill="white"
                />
              </svg>
            </div>

            <h2 className="text-2xl 2xl:text-3xl font-semibold flex-1">
              Profitability Distribution
            </h2>
            <p className="opacity-60 text-sm 2xl:text-lg flex-1">
              Every month, we distribute the returns generated by the
              property&apos;s rental income.
            </p>
          </div>
          <div className="flex flex-col justify-evenly    w-full gap-3 bg-white p-6 rounded-lg">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#954AFC]">
              <svg
                width="50"
                height="50"
                viewBox="0 0 50 50"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <mask
                  id="mask0_1_1996"
                  maskUnits="userSpaceOnUse"
                  x="13"
                  y="12"
                  width="25"
                  height="25"
                >
                  <path d="M13 12H38V37H13V12Z" fill="white" />
                </mask>
                <g mask="url(#mask0_1_1996)">
                  <path
                    d="M24.722 12.2051C25.2004 11.9316 25.791 11.9316 26.2746 12.2051L34.6623 16.9953L34.8721 17.0781V17.1219L37.2109 18.4598C37.51 18.6309 37.7443 18.8959 37.8775 19.2136C38.0108 19.5314 38.0355 19.8843 37.9479 20.2176C37.8598 20.5505 37.6641 20.845 37.3913 21.0552C37.1185 21.2655 36.7839 21.3797 36.4395 21.3801H14.5617C14.2174 21.3797 13.8828 21.2656 13.61 21.0554C13.3372 20.8452 13.1415 20.5508 13.0533 20.218C12.9657 19.8847 12.9904 19.5318 13.1237 19.214C13.2569 18.8963 13.4912 18.6313 13.7903 18.4602L16.124 17.1223V17.0781L16.3389 17L24.722 12.2051ZM16.124 22.9375H19.2487V32.3125H21.2016V22.9375H24.3263V32.3125H26.6698V22.9375H29.7945V32.3125H31.7474V22.9375H34.8721V32.5223C34.9014 32.5371 34.9307 32.5566 34.96 32.5762L37.3035 34.1387C37.5825 34.3247 37.7944 34.5954 37.9078 34.911C38.0212 35.2266 38.0302 35.5703 37.9335 35.8914C37.8354 36.2125 37.6367 36.4935 37.3669 36.6931C37.097 36.8927 36.7701 37.0003 36.4344 37H14.5617C14.2267 37.0002 13.9005 36.8924 13.6314 36.6928C13.3623 36.4931 13.1647 36.2121 13.0677 35.8914C12.9698 35.5704 12.9783 35.2263 13.0918 34.9104C13.2053 34.5946 13.4179 34.3239 13.6977 34.1387L16.0412 32.5762C16.0705 32.5566 16.0998 32.5422 16.1291 32.5223V22.9375H16.124Z"
                    fill="white"
                  />
                </g>
              </svg>
            </div>

            <h2 className="text-2xl 2xl:text-3xl font-semibold flex-1">
              Seamless buying
            </h2>

            <p className="opacity-60 text-sm 2xl:text-lg flex-1">
              Easy to create an account, even easier to invest. Become a
              property co-owner in minutes.
            </p>
          </div>
          <div className="md:col-span-2 flex flex-col md:flex-row md:items-center gap-8 w-full bg-white p-6 rounded-lg">
            <Image
              src={cardImage2}
              width={180}
              height={400}
              className="md:h-[13rem] w-full md:w-[180px] rounded-xl bg-[#954AFC]"
              alt="High Yield Properties"
            />

            <div className="flex flex-col    gap-3">
              <h2 className="text-2xl 2xl:text-3xl font-semibold">
                Asset Appreciation
              </h2>
              <p className="opacity-60 text-sm 2xl:text-lg md:max-w-[13rem] 2xl:max-w-full">
                Properties are bought in strategic cities where the most capital
                gains can be extracted in the following years.
              </p>

              {!connectedAddress ? (
                <button
                  onClick={() => setLoginModelOpen(true)}
                  className="px-4 py-1.5 rounded-full bg-[#954AFC] text-white w-fit text-xs 2xl:text-base"
                >
                  Get Started
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className={`px-4 py-1.5 rounded-full bg-[#954AFC] text-white w-fit text-xs 2xl:text-base`}
                >
                  Get Started
                </Link>
              )}
             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advantages;
