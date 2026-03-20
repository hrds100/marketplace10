"use client";
import Image from "next/image";
import benefits from "../images/benefits.svg";
import { useNfstayContext } from "@/context/NfstayContext";
import { useState } from "react";
import Link from "next/link";

const Benefits = () => {
  const { connectedAddress, setLoginModelOpen } = useNfstayContext();

  return (
    <div id="benefits" className="flex flex-col p-4 gap-10 py-8 w-full">
      <div className="flex items-center flex-col gap-5 self-center justify-center w-full md:max-w-[26rem] 2xl:max-w-[35rem]">
        <div className=" bg-[#954AFC1A] px-2 py-1 rounded-[50px] justify-center items-center inline-flex">
          <span className="text-center text-violet-500 text-xs font-bold  leading-normal 2xl:text-3xl">
            BENEFITS
          </span>
        </div>
        <h1 className="text-[32px] leading-[48px] text-center font-bold 2xl:text-5xl">
          More accessible and secure than going solo
        </h1>
      </div>
      <div className="flex items-center justify-center w-full">
        <div className="flex items-center flex-col  md:flex-row justify-between w-full md:max-w-6xl 2xl:max-w-[90rem] gap-10 ">
          <div className="flex flex-col gap-5 px-2 sm:px-0 items-center md:items-start h-full w-full  justify-start ">
            <ul className=" flex flex-col items-start gap-3">
              <li className="flex items-start gap-3 font-semibold">
                <svg
                  width="25"
                  height="25"
                  className="shrink-0 mt-[.3rem] size-[35px] 2xl:size-[50px]  "
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z"
                    fill="#954AFC"
                  />
                  <g clip-path="url(#clip0_1_2323)">
                    <path
                      d="M16.6999 23.8889C16.6999 25.3541 17.2982 26.6813 18.2666 27.6453C18.36 27.7382 18.4067 27.7847 18.4343 27.8294C18.4606 27.8721 18.4759 27.9088 18.4876 27.9574C18.4999 28.0083 18.4999 28.0662 18.4999 28.182V30.2889C18.4999 30.5378 18.4999 30.6622 18.549 30.7573C18.5921 30.841 18.661 30.909 18.7456 30.9516C18.8419 31 18.9679 31 19.2199 31H20.9299C21.182 31 21.308 31 21.4042 30.9516C21.4889 30.909 21.5577 30.841 21.6009 30.7573C21.6499 30.6622 21.6499 30.5378 21.6499 30.2889V29.9333C21.6499 29.6844 21.6499 29.56 21.699 29.4649C21.7421 29.3812 21.811 29.3132 21.8956 29.2707C21.9919 29.2222 22.1179 29.2222 22.3699 29.2222H23.6299C23.882 29.2222 24.008 29.2222 24.1042 29.2707C24.1889 29.3132 24.2577 29.3812 24.3009 29.4649C24.3499 29.56 24.3499 29.6844 24.3499 29.9333V30.2889C24.3499 30.5378 24.3499 30.6622 24.399 30.7573C24.4422 30.841 24.511 30.909 24.5956 30.9516C24.6919 31 24.8179 31 25.0699 31H26.78C27.032 31 27.158 31 27.2543 30.9516C27.339 30.909 27.4078 30.841 27.4509 30.7573C27.5 30.6622 27.5 30.5378 27.5 30.2889V29.4216C27.5 29.242 27.5 29.1522 27.5259 29.0801C27.5507 29.011 27.582 28.9627 27.635 28.9113C27.6903 28.8578 27.7839 28.8148 27.9713 28.7289C28.8553 28.3236 29.6096 27.689 30.156 26.9024C30.2521 26.7641 30.3001 26.6949 30.3515 26.654C30.4005 26.6149 30.4445 26.5921 30.5048 26.5742C30.568 26.5556 30.643 26.5556 30.7928 26.5556H31.28C31.532 26.5556 31.658 26.5556 31.7543 26.5071C31.839 26.4645 31.9078 26.3965 31.9509 26.3129C32 26.2178 32 26.0933 32 25.8444V22.8096C32 22.5726 32 22.4541 31.9554 22.3627C31.9112 22.272 31.8371 22.1988 31.7453 22.1551C31.6527 22.1111 31.5327 22.1111 31.2929 22.1111C31.1192 22.1111 31.0323 22.1111 30.9624 22.0878C30.887 22.0627 30.834 22.0293 30.7793 21.9722C30.7287 21.9193 30.6872 21.8308 30.6044 21.6538C30.3384 21.0855 29.9743 20.5714 29.5334 20.1325C29.4399 20.0395 29.3932 19.993 29.3657 19.9483C29.3393 19.9057 29.324 19.869 29.3123 19.8204C29.3 19.7695 29.3 19.7116 29.3 19.5957V18.6094C29.3 18.2894 29.3 18.1293 29.2325 18.0218C29.1734 17.9276 29.0808 17.8586 28.9728 17.8283C28.8495 17.7938 28.6938 17.8377 28.3822 17.9257L26.2469 18.5282C26.2106 18.5384 26.1925 18.5436 26.174 18.5471C26.1576 18.5503 26.1411 18.5526 26.1244 18.554C26.1057 18.5556 26.0868 18.5556 26.0491 18.5556H25.6631M16.6999 23.8889C16.6999 21.8408 17.8688 20.0624 19.5836 19.1688M16.6999 23.8889H15.8C14.8059 23.8889 14 23.093 14 22.1111C14 21.4531 14.362 20.8786 14.9 20.5712M25.7 18.1111C25.7 19.8293 24.2897 21.2222 22.55 21.2222C20.8103 21.2222 19.4 19.8293 19.4 18.1111C19.4 16.3929 20.8103 15 22.55 15C24.2897 15 25.7 16.3929 25.7 18.1111Z"
                      stroke="white"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_1_2323">
                      <rect
                        width="20"
                        height="18"
                        fill="white"
                        transform="translate(13 14)"
                      />
                    </clipPath>
                  </defs>
                </svg>

                <div className="flex flex-col">
                  <h2 className="text-xl 2xl:text-3xl">
                    Start without the need for large sums
                  </h2>
                  <span className="text-[14px] leading-[21px] 2xl:text-lg opacity-60 font-medium">
                    Begin with just $100, instead of purchasing an entire
                    property.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3 font-semibold">
                <svg
                  width="25"
                  height="25"
                  className="shrink-0 mt-[.3rem] size-[35px] 2xl:size-[50px] "
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z"
                    fill="#954AFC"
                  />
                  <g clip-path="url(#clip0_1_2331)">
                    <path
                      d="M19.9689 24.359L26.04 27.941M26.0311 18.059L19.9689 21.641M31 16.7C31 18.1912 29.8061 19.4 28.3333 19.4C26.8605 19.4 25.6667 18.1912 25.6667 16.7C25.6667 15.2088 26.8605 14 28.3333 14C29.8061 14 31 15.2088 31 16.7ZM20.3333 23C20.3333 24.4912 19.1394 25.7 17.6667 25.7C16.1939 25.7 15 24.4912 15 23C15 21.5088 16.1939 20.3 17.6667 20.3C19.1394 20.3 20.3333 21.5088 20.3333 23ZM31 29.3C31 30.7912 29.8061 32 28.3333 32C26.8605 32 25.6667 30.7912 25.6667 29.3C25.6667 27.8088 26.8605 26.6 28.3333 26.6C29.8061 26.6 31 27.8088 31 29.3Z"
                      stroke="white"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_1_2331">
                      <rect
                        width="18"
                        height="20"
                        fill="white"
                        transform="translate(14 13)"
                      />
                    </clipPath>
                  </defs>
                </svg>

                <div className="flex flex-col">
                  <h2 className="text-xl 2xl:text-3xl">
                    Forget about operational management
                  </h2>
                  <span className="text-[14px] leading-[21px] 2xl:text-lg opacity-60 font-medium">
                    No tenant management or unexpected site issues. We take care
                    of everything.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3 font-semibold">
                <svg
                  width="25"
                  height="25"
                  className="shrink-0 mt-[.3rem] size-[35px] 2xl:size-[50px] "
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z"
                    fill="#954AFC"
                  />
                  <g clip-path="url(#clip0_1_2339)">
                    <path
                      d="M14 24.7778C14 24.7778 14.1092 25.5326 17.2724 28.6569C20.4357 31.781 25.5643 31.781 28.7276 28.6569C29.8483 27.5499 30.572 26.1994 30.8986 24.7778M14 24.7778V30.1111M14 24.7778H19.4M32 21.2222C32 21.2222 31.8908 20.4673 28.7276 17.3431C25.5643 14.219 20.4357 14.219 17.2724 17.3431C16.1517 18.45 15.428 19.8006 15.1014 21.2222M32 21.2222V15.8889M32 21.2222H26.6"
                      stroke="white"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_1_2339">
                      <rect
                        width="20"
                        height="18"
                        fill="white"
                        transform="translate(13 14)"
                      />
                    </clipPath>
                  </defs>
                </svg>

                <div className="flex flex-col">
                  <h2 className="text-xl 2xl:text-3xl">
                    Get liquidity every month
                  </h2>
                  <span className="text-[14px] leading-[21px] 2xl:text-lg opacity-60 font-medium">
                    Claim or reinvest your monthly earnings with 1 click.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3 font-semibold">
                <svg
                  width="25"
                  height="25"
                  className="shrink-0 mt-[.3rem] size-[35px] 2xl:size-[50px] "
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z"
                    fill="#954AFC"
                  />
                  <path
                    d="M18.7518 25.2482L14 30M21.5387 17.7096L20.2275 19.0207C20.1206 19.1277 20.0671 19.1812 20.0062 19.2236C19.9521 19.2614 19.8937 19.2926 19.8324 19.3167C19.7632 19.3438 19.689 19.3586 19.5407 19.3883L16.4626 20.0039C15.6626 20.1639 15.2627 20.2439 15.0755 20.4548C14.9125 20.6385 14.8381 20.8844 14.8718 21.1277C14.9105 21.4069 15.1989 21.6953 15.7758 22.2722L21.7278 28.2242C22.3047 28.8011 22.5931 29.0895 22.8723 29.1282C23.1157 29.162 23.3616 29.0875 23.5453 28.9245C23.7561 28.7374 23.8361 28.3375 23.9961 27.5375L24.6117 24.4593C24.6414 24.311 24.6563 24.2368 24.6834 24.1677C24.7074 24.1063 24.7387 24.048 24.7764 23.9939C24.8189 23.933 24.8723 23.8794 24.9793 23.7725L26.2904 22.4613C26.3588 22.393 26.3931 22.3588 26.4306 22.329C26.4639 22.3024 26.4993 22.2785 26.5364 22.2573C26.578 22.2335 26.6225 22.2145 26.7113 22.1764L28.8066 21.2784C29.4179 21.0164 29.7236 20.8854 29.8624 20.6738C29.9838 20.4887 30.0272 20.2631 29.9832 20.0462C29.9329 19.7981 29.6978 19.563 29.2276 19.0927L24.9073 14.7724C24.437 14.3022 24.2019 14.067 23.9538 14.0167C23.7369 13.9728 23.5113 14.0162 23.3263 14.1376C23.1146 14.2764 22.9836 14.5821 22.7216 15.1934L21.8237 17.2886C21.7855 17.3775 21.7665 17.422 21.7427 17.4636C21.7215 17.5007 21.6976 17.536 21.6711 17.5694C21.6412 17.607 21.607 17.6412 21.5387 17.7096Z"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                <div className="flex flex-col">
                  <h2 className="text-xl 2xl:text-3xl">
                    Benefit from diversification
                  </h2>
                  <span className="text-[14px] leading-[21px] 2xl:text-lg opacity-60 font-medium">
                    Avoid concentrating your capital in a single property.
                  </span>
                </div>
              </li>
            </ul>

            {!connectedAddress ? (
              <button
                onClick={() => setLoginModelOpen(true)}
                className={`w-fit text-xl 2xl:text-xl border-none btn_primary_gradient whitespace-nowrap rounded-full px-6 py-1.5 font-medium text-white`}
              >
                Get Started
              </button>
            ) : (
              <Link
                href="/dashboard"
                className={`w-fit text-xl 2xl:text-xl border-none btn_primary_gradient whitespace-nowrap rounded-full px-6 py-1.5 font-medium text-white`}
              >
                Get Started
              </Link>
            )}
           
          </div>
          <Image
            src={benefits}
            width={400}
            height={400}
            className="rounded-xl 2xl:w-full"
            alt="Income Generating Real Estate"
          />
        </div>
      </div>
    </div>
  );
};

export default Benefits;
