'use client'

import Image from "next/image"
import img1 from "../images/playStore.webp"
import img2 from "../images/playStore.jpg"
import mobile from "../images/hero_mobile.png"
import hero from "../images/hero_bg.jpg"
import dividend from "../images/dividend.svg"
import portfolio from "../images/portfolio.svg"
import tick from "../images/list.svg"
const Hero = () => {
  return (
    <div className="px-4 lg:px-8 w-full flex items-center justify-center">
      <div className={`flex  bg-cover bg-no-repeat bg-center w-full pt-12 h-full rounded-xl max-w-6xl 2xl:max-w-[90rem] relative overflow-hidden isolate`}>
        <Image
          src={hero}
          layout="fill"
          className="absolute inset-0 -z-[1]"
          objectFit="cover"
          alt="Hero"
        />
        <div className=" flex items-center flex-col md:flex-row justify-between w-full ">
          <div className="flex flex-col gap-5 p-4 md:p-12 w-full">
            <h1 className="font-bold text-[44px] leading-[52.8px] xl:max-w-[38rem]">Become our partner & co-own properties around the world.</h1>
            <ul className=" flex flex-col items-start gap-3 text-base">
              <li className="flex items-center gap-3 font-semibold">
                <Image
                  src={tick}
                  width={15}
                  height={15}
                  alt="Tick"
                  className="2xl:size-8"

                />

                Investments from only $100</li>
              <li className="flex items-center gap-3 font-semibold">
                <Image
                  src={tick}
                  width={15}
                  height={15}
                  alt="Tick"
                  className="2xl:size-8"

                /> Average yearly return on investment of 15%</li>
              <li className="flex items-center gap-3 font-semibold">
                <Image
                  src={tick}
                  width={15}
                  height={15}
                  alt="Tick"
                  className="2xl:size-8"

                /> Rent paid monthly</li>
              <li className="flex items-center gap-3 font-semibold">
                <Image
                  src={tick}
                  width={15}
                  height={15}
                  alt="Tick"
                  className="2xl:size-8"

                /> Vote on all decisions that matter.</li>
            </ul>
            <div className="flex flex-wrap items-center gap-4">
              
              <button>
                <Image width={500} height={64} src={img2} className="max-w-full w-[11.1rem]" alt="App Store" />
              </button>
              <button>
                <Image width={500} height={64} src={img1} className="max-w-full w-44" alt="App Store" />
              </button>
              <span className="text-sm font-medium">Coming Soon</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="12" height="20" viewBox="0 0 19 20" className="2xl:w-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 10C18 14.6944 14.1944 18.5 9.5 18.5C4.80558 18.5 1 14.6944 1 10C1 5.30558 4.80558 1.5 9.5 1.5C14.1944 1.5 18 5.30558 18 10ZM9.52591 5.80489C8.85466 5.35739 7.99159 5.31567 7.28031 5.69634C6.56903 6.077 6.125 6.81826 6.125 7.625V12.375C6.125 13.1817 6.56903 13.923 7.28031 14.3037C7.99159 14.6843 8.85466 14.6426 9.52591 14.1951L13.0884 11.8201C13.697 11.4144 14.0625 10.7314 14.0625 10C14.0625 9.2686 13.697 8.5856 13.0884 8.17989L9.52591 5.80489Z" fill="#0B0924" stroke="#0B0924" stroke-width="2" />
              </svg>
              <span className="text-xs 2xl:text-base">Discover how it works</span>
            </div>
          </div>
          <div className="flex h-full w-full relative">
            <Image src={mobile} className="h-full max-w-full " alt="Mobile" />

            <Image
              src={dividend}
              width={371}
              height={51}
              className="absolute top-6 right-0 move_left_to_right 2xl:w-[400px]"
              alt="Dividend"
            />
            <Image
              src={portfolio}
              width={371}
              height={51}
              className="absolute bottom-0 left-0 move_right_to_left 2xl:w-[400px]"
              alt="Portfolio"
            />



          </div>

        </div>

      </div>
    </div>
  )
}

export default Hero