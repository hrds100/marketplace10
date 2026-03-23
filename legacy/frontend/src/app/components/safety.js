"use client";
import Image from "next/image";
import UAE from "../images/UAE.png";
import Saudi from "../images/Saudi.png";
import { useState } from "react";

const Safety = () => {
  const data = [
    {
      title: "Transparency",
      description:
        "Every decision, every partner, and every process is laid out for you. At nfstay, transparency isn’t just a policy - it’s the foundation of our community-driven approach.",
      button: "Become an Investor",
      options: [
        {
          title: "Vetted Partners",
          description: `Our management companies, accountants, and service providers are carefully chosen by our partners. This means you’re always in the loop with professionals you trust.`,
        },
        {
          title: "No Hidden Agendas, Just Clear Communication",
          description: `From property decisions to profit distribution, every detail is shared openly. You’ll never be left in the  dark - only empowered by complete, honest information`,
        },
      ],
    },
    {
      title: "Active Partnership",
      description: `Your voice matters. As a partner, you’ll have a say in key decisions, from property management to rental strategies. This isn’t passive investing—it’s active collaboration for shared success.`,

      button: "Become an Investor",
      options: [
        {
          title: "High Rental Yields",
          description: `Our rent-to-rent model is designed to deliver consistent, high rental yields. By leveraging our expertise and streamlined processes, we maximize returns while minimizing risks, ensuring your investment works harder for you.`,
        },
        {
          title: "Low Entry Barrier",
          description: `With fractional ownership, you don’t need a large upfront investment to get started. Our low entry barrier opens the door to real estate opportunities for everyone, making it easier than ever to start your short-term rental journey.`,
        },
      ],
    },
  ];

  const [currentTab, setCurrentTab] = useState(0);

  return (
    <div className="flex w-full flex-col gap-6 items-center py-8 justify-center">
      <div className=" bg-[#954AFC1A] px-2 py-1 rounded-[50px] justify-center items-center inline-flex">
        <span className="text-center text-violet-500 text-xs font-bold  leading-normal 2xl:text-3xl">
          Safety never sleeps
        </span>
      </div>
      <h4 className="text-4xl sm:text-[40px] sm:leading-[44px] font-bold max-w-xl text-center text-black ">
        We value your trust as much as your investments
      </h4>
      <div className="flex  gap-5 items-center justify-center text-lg font-medium">
        <button
          type="button"
          className={`${
            currentTab === 0
              ? "bg-[#8542E3] text-white"
              : "bg-transparent text-[#4F4F4F]"
          } py-3 px-6 rounded-xl`}
          onClick={() => setCurrentTab(0)}
        >
          Transparency
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab(1)}
          className={`${
            currentTab === 1
              ? "bg-[#8542E3] text-white"
              : "bg-transparent text-[#4F4F4F]"
          } py-3 px-6 rounded-xl`}
        >
          Active Partnership
        </button>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 min-h-[450px] h-full gap-10 rounded-xl p-6  max-w-3xl"
        style={{
          background: "linear-gradient(73.38deg, #EDECFE 35%, #D3DEFE 93%)",
        }}
      >
        <div className="flex flex-col gap-5">
          <svg
            width="40"
            height="41"
            className="shrink-0"
            viewBox="0 0 40 41"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              opacity="0.2"
              d="M33.75 9.01611V18.1989C33.75 31.3521 22.6078 35.7099 20.3844 36.4489C20.1353 36.5349 19.8647 36.5349 19.6156 36.4489C17.3922 35.713 6.25 31.3599 6.25 18.2021V9.01611C6.25 8.68459 6.3817 8.36665 6.61612 8.13223C6.85054 7.89781 7.16848 7.76611 7.5 7.76611H32.5C32.8315 7.76611 33.1495 7.89781 33.3839 8.13223C33.6183 8.36665 33.75 8.68459 33.75 9.01611Z"
              fill="#41CE8E"
            />
            <path
              d="M32.5 6.51611H7.5C6.83696 6.51611 6.20107 6.77951 5.73223 7.24835C5.26339 7.71719 5 8.35307 5 9.01611V18.2005C5 32.2021 16.8469 36.8474 19.2188 37.6364C19.7253 37.8087 20.2747 37.8087 20.7812 37.6364C23.1562 36.8474 35 32.2021 35 18.2005V9.01611C35 8.35307 34.7366 7.71719 34.2678 7.24835C33.7989 6.77951 33.163 6.51611 32.5 6.51611ZM32.5 18.2021C32.5 30.4552 22.1328 34.5489 20 35.2614C17.8859 34.5567 7.5 30.4661 7.5 18.2021V9.01611H32.5V18.2021ZM12.8656 22.4005C12.6311 22.1659 12.4993 21.8478 12.4993 21.5161C12.4993 21.1844 12.6311 20.8663 12.8656 20.6317C13.1002 20.3972 13.4183 20.2654 13.75 20.2654C14.0817 20.2654 14.3998 20.3972 14.6344 20.6317L17.5 23.4974L25.3656 15.6317C25.4818 15.5156 25.6196 15.4235 25.7714 15.3606C25.9231 15.2978 26.0858 15.2654 26.25 15.2654C26.4142 15.2654 26.5769 15.2978 26.7286 15.3606C26.8804 15.4235 27.0182 15.5156 27.1344 15.6317C27.2505 15.7479 27.3426 15.8858 27.4055 16.0375C27.4683 16.1892 27.5007 16.3519 27.5007 16.5161C27.5007 16.6804 27.4683 16.843 27.4055 16.9947C27.3426 17.1465 27.2505 17.2844 27.1344 17.4005L18.3844 26.1505C18.2683 26.2667 18.1304 26.3589 17.9787 26.4218C17.8269 26.4847 17.6643 26.5171 17.5 26.5171C17.3357 26.5171 17.1731 26.4847 17.0213 26.4218C16.8696 26.3589 16.7317 26.2667 16.6156 26.1505L12.8656 22.4005Z"
              fill="#41CE8E"
            />
          </svg>
          <h2 className="text-4xl font-bold">{data[currentTab].title}</h2>
          <p className="text-sm text-[#4F4F4F] font-semibold">
            {data[currentTab].description}
          </p>
          {/* <button
            type='button'
            className='p-2 w-fit px-8 text-[#7857E3] font-medium rounded-full bg-white border border-[#7857E3]'
          >
            {data[currentTab].button}
          </button> */}
        </div>
        <div className="flex flex-col h-full gap-5">
          <div className="flex flex-col h-full justify-evenly gap-10">
            {data[currentTab].options.map((option, index) => (
              <div key={index} className="flex flex-col gap-2 font-medium">
                {/* <div className='w-[45px] h-[45px] rounded-full overflow-hidden'>
                  <Image
                    src={option.img}
                    alt={option.title}
                    width={100}
                    height={100}
                    className='w-full h-full object-cover'
                  />
                </div> */}
                <h3 className="text-[18px] font-semibold">{option.title}</h3>
                <p>{option.description}</p>
              </div>
            ))}
            {/* <div className='flex flex-col gap-3'>
              <div className='w-[45px] h-[45px] rounded-full overflow-hidden'>
                <Image
                  src={UAE}
                  alt='UAE'
                  width={100}
                  height={100}
                  className='w-full h-full object-cover'
                />
              </div>
              <h3 className='text-[18px] font-medium'>
                Regulated in UAE by the DFSA
              </h3>
              <p>
                We’re regulated by the Dubai Financial Services Authority (DFSA)
                in Dubai, with a robust business cessation plan.
              </p>
            </div>
            <div className='flex flex-col gap-3'>
              <div className='w-[45px] h-[45px] rounded-full overflow-hidden'>
                <Image
                  src={Saudi}
                  alt='Saudi'
                  width={100}
                  height={100}
                  className='w-full h-full object-cover'
                />
              </div>
              <h3 className='text-[18px] font-medium'>
                Regulated in Saudi Arabia by the CMA
              </h3>
              <p>
                We’re regulated by the Capital Markets Authority (CMA) in Saudi
                Arabia.
              </p>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Safety;
