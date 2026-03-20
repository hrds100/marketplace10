"use client";
import { useEffect, useState } from "react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

export const Li = ({ faq }) => {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="flex flex-col w-full h-fit bg-white p-4 rounded-xl"
      style={{ boxShadow: "0px 1px 100px 0px #0000000D" }}
    >
      <button
        className="relative flex gap-2 border-none outline-none items-center w-full text-base font-semibold text-left lg:text-xl border-base-content/10"
        aria-expanded={open ? "true" : "false"}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex-1 text-inherit">{faq.question}</span>
        {/* <svg
          className="flex-shrink-0 w-4 h-4 ml-auto fill-current"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            fill="url(#paint0_linear_1_2377)"
            className={`transform origin-center transition duration-200 ease-out ${
              open ? "-rotate-45" : "rotate-0"
            }`}
          ></rect>
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            fill="url(#paint1_linear_1_2377)"
            className={`transform origin-center transition duration-200 ease-out ${
              open ? "rotate-45" : "rotate-90"
            }`}
          ></rect>
          <defs>
            <linearGradient
              id="paint0_linear_1_2377"
              x1="0"
              y1="0"
              x2="16"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#9945FF" />
              <stop offset="1" stopColor="#20E19F" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_1_2377"
              x1="0"
              y1="0"
              x2="16"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#9945FF" />
              <stop offset="1" stopColor="#20E19F" />
            </linearGradient>
          </defs>
        </svg> */}
      </button>
      <div
        className="transition-all duration-300 ease-in-out max-h-0 overflow-hidden"
        style={{
          maxHeight: open ? "500px" : "0",
          marginTop: open ? "10px" : "0",
        }}
      >
        <div className="pb-5 leading-relaxed">
          <div className="space-y-2 font-medium leading-relaxed text-sm 2xl:text-lg">
            {faq.answer}
          </div>
        </div>
      </div>
    </div>
  );
};

const Faq = () => {
  const faqData = [
    {
      question:
        "Can I use this script for commercial or multi-unit properties?",
      answer:
        "Yes, the script works for both single-unit and multi-unit properties — just tweak the approach slightly based on the property type.",
    },
    {
      question: "Will this work in my city or country?",
      answer:
        "The script is universal — we've seen it work in the UK, US, Europe, and beyond. It focuses on proven psychological triggers that landlords respond to.",
    },
    {
      question: "How long does it take to see results?",
      answer:
        "Some users lease their first property in under a week. It depends on your outreach consistency and how many landlords you contact.",
    },
    {
      question: "Why is it only $7?",
      answer:
        "We want to prove how powerful this script is. It’s a low-risk way for you to see real results and potentially join our larger community.",
    },
    {
      question: "Is this really beginner-friendly?",
      answer:
        "Yes, the script is designed so even complete beginners can confidently approach landlords without needing experience or fancy sales skills.",
    },
    {
      question: "How soon will I get access after purchase?",
      answer:
        "Instantly. Once you complete the $7 payment, your script will be delivered right away to your inbox.",
    },
  ];

  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;
  return (
    <div
      id="faq"
      className="flex flex-col gap-8 items-center py-12 md:py-20 my-8 w-full bg-[#F7F6FF]"
    >
      <div className="flex items-center flex-col gap-5 self-center justify-center w-full mx-auto max-w-[38rem] 2xl:max-w-[50rem]">
        <div className="flex flex-col items-center justify-center gap-2 text-center mb-4">
          <h1 className="text-3xl md:text-[44px] text-[#0B0924] text-center font-bold mb-4">
            Frequently asked questions
          </h1>
          <p className="text-lg font-medium text-[#0B0824] opacity-70 max-w-[560px]">
            Feeling inquisitive? Have a read through some of our FAQs or contact
            our supporters for help
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center w-full max-w-5xl px-4 md:px-6 2xl:px-10">
        <ResponsiveMasonry
          columnsCountBreakPoints={{ 350: 1, 750: 2 }}
          className="w-full h-full max-w-6xl 2xl:max-w-[90rem]"
        >
          <Masonry gutter="20px">
            {faqData.map((faq, index) => (
              <Li key={index} faq={faq} />
            ))}
          </Masonry>
        </ResponsiveMasonry>
      </div>
    </div>
  );
};

export default Faq;
