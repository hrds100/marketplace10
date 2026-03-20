"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LeftOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";

// Sample team data with actual team members
const teamData = [
  {
    id: 1,
    name: "Chris Germano",
    position: "Co-Founder",
    image:
      "https://framerusercontent.com/images/9UOgRaAzI5sfGS9z5TNDEhKc15Q.png",
    socials: {
      twitter: "#",
      linkedin: "https://www.linkedin.com/in/chris-germano-5aab5711a/",
      instagram: "#",
    },
  },
  {
    id: 2,
    name: "Hugo Souza",
    position: "Co-Founder",
    image:
      "https://framerusercontent.com/images/4HBDvvGBhfuV9ZJe8B5zb9rfXlo.png",
    socials: {
      twitter: "#",
      linkedin: "https://www.linkedin.com/in/hugorsunico/",
      instagram: "#",
    },
  },

  {
    id: 3,
    name: "Valeria Germano",
    position: "General Manager",
    image:
      "https://framerusercontent.com/images/Q9BuLk6yOLa7MR4tHiANHwBr66o.png",
    socials: {
      twitter: "#",
      linkedin: "https://www.linkedin.com/in/val%C3%A9riaalvesgermano/",
      instagram: "#",
    },
  },
  {
    id: 4,
    name: "Emile Florence",
    position: "Senior Consultant",
    image:
      "https://framerusercontent.com/images/NlkoeWQNBxUEDKZMU0epnVPPji4.png",
    socials: {
      twitter: "#",
      linkedin: "https://www.linkedin.com/in/emilieclarke/",
      instagram: "#",
    },
  },
  {
    id: 5,
    name: "Pierre Bisen",
    position: "Account Executive",
    image:
      "https://framerusercontent.com/images/tDZCX7Et9LghlydtGhy9eCD1fC4.png",
    socials: {
      twitter: "#",
      linkedin: "https://www.linkedin.com/in/pierre-pravin-bisen-09b31a261/",
      instagram: "#",
    },
  },
  {
    id: 6,
    name: "Ismar Zembo",
    position: "advisor",
    image:
      "https://framerusercontent.com/images/l5D7ARWyIbEhrGPcLZmcGxOIP7A.png",
    socials: {
      twitter: "#",
      linkedin:
        "https://www.linkedin.com/in/ismarzemboassetmanagmentblockhaintradingforex/",
      instagram: "#",
    },
  },
  {
    id: 7,
    name: "Rabeeb Aqdus Jilani",
    position: "Smart Contract Engineer",
    image:
      "https://framerusercontent.com/images/BSnjpT6cdv6wKIxs9c95raN0M4.png",
    socials: {
      twitter: "https://www.twitter.com/aqdasrabeeb/",
      linkedin: "https://www.linkedin.com/in/rabeeb-aqdas-jilani/",
      instagram: "https://www.instagram.com/rabeebaqdas/",
    },
  },
  {
    id: 8,
    name: "Syed Asmar Hasan",
    position: "Web3 Engineer",
    image:
      "https://framerusercontent.com/images/i8BmjPRzZEsMJVhS4r4BoTjVwnY.png",
    socials: {
      twitter: "https://www.twitter.com/asmaar_H/",
      linkedin: "https://www.linkedin.com/in/syed-asmar-hasan/",
      instagram: "https://www.instagram.com/asmaarhasan/",
    },
  },
  {
    id: 9,
    name: "Abdullah Bahatti",
    position: "Web Developer",
    image:
      "https://framerusercontent.com/images/DRWIP9PZQyV4D5oum2nnttQPao.png",
    socials: {
      twitter: "#",
      linkedin: "https://www.linkedin.com/in/abhatti47/",
      instagram: "#",
    },
  },
  {
    id: 10,
    name: "Frederik Lund",
    position: "Legal Advisor",
    image:
      "https://framerusercontent.com/images/iortsDCWHIYiMEA2umtyK0yVIE.png",
    socials: {
      twitter: "#",
      linkedin: "https://www.linkedin.com/in/lundfrederik/",
      instagram: "#",
    },
  },
  {
    id: 11,
    name: "Anna Dani",
    position: "External Affairs",
    image: "https://framerusercontent.com/images/b6pkCVCiE5tGWVxyYr6r7yoEQ.png",
    socials: {
      twitter: "#",
      linkedin: "https://www.linkedin.com/in/annaversati/",
      instagram: "#",
    },
  },
];

const TeamSlider = () => {
  const [activeCard, setActiveCard] = useState(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const sliderRef = useRef(null);

  const handleScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth);
    }
  };

  const scroll = (direction) => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      const scrollAmount = direction === "left" ? -1000 : 1000;

      if (
        direction === "right" &&
        scrollLeft + clientWidth >= scrollWidth - 20
      ) {
        // If at the end, scroll back to the start
        sliderRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else if (direction === "left" && scrollLeft <= 10) {
        // If at the start, scroll to the end
        sliderRef.current.scrollTo({ left: scrollWidth, behavior: "smooth" });
      } else {
        // Otherwise, scroll normally
        sliderRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  return (
    <div className="flex flex-col items-center  justify-center w-full">
      <div className="flex flex-col items-center justify-center w-full gap-4 text-center px-5 md:max-w-2xl">
        <h1 className="text-3xl md:text-[44px] font-bold text-center text-[#0B0924 mb-2">
          Meet Our Team
        </h1>
        <p className="opacity-80 text-base md:text-lg">
          Our mission is to democratize ownership of rental homes and vacation
          properties by simplifying the process and lowering startup costs.
        </p>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{
          opacity: 1,
        }}
        className="relative w-full   px-4 py-12"
      >
        {/* Navigation Arrows */}
        <AnimatePresence>
          {showLeftArrow && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute lef-8 sm:left-24 top-1/2 -translate-y-1/2 z-10 bg-[rgba(0,0,0,0.1)] flex items-center justify-center shadow-lg rounded-full p-2"
              onClick={() => scroll("left")}
            >
              <LeftOutlined className="size-8 text-lg flex items-center justify-center text-white" />
            </motion.button>
          )}
          {showRightArrow && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-8 sm:right-24 top-1/2 -translate-y-1/2 z-10 flex items-center bg-[rgba(0,0,0,0.1)] justify-center  shadow-lg rounded-full p-2"
              onClick={() => scroll("right")}
            >
              <RightOutlined className="size-8 text-lg flex items-center justify-center text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Team Cards Container */}
        <div
          ref={sliderRef}
          onScroll={handleScroll}
          style={{
            transition: "all 1s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          className="flex gap-6 h-fit  overflow-x-auto hide-scrollbar snap-x snap-mandatory "
        >
          {teamData.map((member) => (
            <div key={member.id} className="flex-none h-fit snap-center">
              <motion.div className="relative bg-white/5 rounded-[30px] overflow-hidden backdrop-blur-sm  group">
                {/* Background Circle */}

                {/* Image Container */}
                <div className="relative overflow-hidden rounded-[30px] bg-white px-4 isolate">
                  <motion.div
                    className="absolute top-1/2 left-1/2  -translate-y-1/2  bg-[rgb(145,84,186)] rounded-[1368.42%] -z-10"
                    initial={{
                      opacity: activeCard === member.id ? 1 : 0,
                      width: 0,
                      height: "19px",
                      scale: 1,
                    }}
                    animate={{
                      scale: activeCard === member.id ? 1 : 0,
                      opacity: activeCard === member.id ? 1 : 0,
                      width: activeCard === member.id ? "175%" : "0%",
                      height: activeCard === member.id ? "649px" : "0%",
                      top: activeCard === member.id ? "30px" : "50%",
                      borderRadius: activeCard === member.id ? "63%" : "0%",
                      translateX: activeCard === member.id ? "-50%" : "0%",
                    }}
                    transition={{ duration: 0.5 }}
                    style={{
                      height: "19px",
                      transformOrigin: "50% 50% 0px",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                  <motion.img
                    src={member.image}
                    alt={member.name}
                    className={`w-[320px] h-[400px]  ${
                      activeCard === member.id
                        ? ""
                        : "group-hover:translate-y-5"
                    } `}
                    style={{
                      filter:
                        activeCard === member.id
                          ? "none"
                          : "grayscale(100%) contrast(1.06)",
                      transition: "all 0.3s",
                    }}
                  />

                  {/* Social Icons Container */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <motion.button
                      className="bg-white/80 backdrop-blur size-11 rounded-[13px] shadow-lg z-10"
                      onClick={() =>
                        setActiveCard(
                          activeCard === member.id ? null : member.id
                        )
                      }
                      style={{ transformOrigin: "50% 50% 0px" }}
                      animate={{
                        rotate: activeCard === member.id ? -45 : 0,
                        transform:
                          activeCard === member.id
                            ? "scale(1.1) translateX(-8%) rotate(-180deg)"
                            : "scale(1) translateX(100%) rotate(0deg)",
                      }}
                      transition={{ duration: 1 }}
                    >
                      <PlusOutlined
                        className="text-xl text-[rgb(38,48,22)]"
                        style={{
                          transform:
                            activeCard === member.id
                              ? "rotate(45deg) scale(1.1)"
                              : "rotate(0deg) scale(1)",
                        }}
                      />
                    </motion.button>
                    <AnimatePresence>
                      <>
                        <motion.a
                          href={member.socials.linkedin}
                          target="_blank"
                          rel="noreferrer noopener"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            transform:
                              activeCard === member.id
                                ? "rotate(0deg) translateX(-8%)   scale(1.1)  "
                                : "scale(1) translateX(-30%) rotate(180deg) ",
                          }}
                          exit={{ opacity: 0, scale: 0, rotate: 90 }}
                          transition={{ duration: 1, delay: 0.15 }}
                          className="bg-white/80 backdrop-blur hover:text-[rgb(145,84,186)]  p-2 rounded-[13px] shadow-lg hover:bg-black transition-all duration-700"
                        >
                          <svg className="size-7" viewBox="0 0 256 256">
                            <path
                              fill="currentColor"
                              d="M216,24H40A16,16,0,0,0,24,40V216a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V40A16,16,0,0,0,216,24ZM96,176a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0ZM88,96a12,12,0,1,1,12-12A12,12,0,0,1,88,96Zm96,80a8,8,0,0,1-16,0V140a20,20,0,0,0-40,0v36a8,8,0,0,1-16,0V112a8,8,0,0,1,15.79-1.78A36,36,0,0,1,184,140Z"
                            />
                          </svg>
                        </motion.a>
                        <motion.a
                          href={member.socials.instagram}
                          target="_blank"
                          rel="noreferrer noopener"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            transform:
                              activeCard === member.id
                                ? "scale(1.1) translateX(0%) rotate(360deg) "
                                : " scale(1) translateX(-160%) rotate(0)",
                          }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{ delay: 0.15, duration: 1 }}
                          className="bg-white/80 backdrop-blur hover:text-[rgb(145,84,186)] hover:bg-black transition-all duration-700 p-2 rounded-[13px] shadow-lg"
                        >
                          <svg className="size-7" viewBox="0 0 256 256">
                            <path
                              fill="currentColor"
                              d="M176,24H80A56.06,56.06,0,0,0,24,80v96a56.06,56.06,0,0,0,56,56h96a56.06,56.06,0,0,0,56-56V80A56.06,56.06,0,0,0,176,24ZM128,176a48,48,0,1,1,48-48A48.05,48.05,0,0,1,128,176Zm60-96a12,12,0,1,1,12-12A12,12,0,0,1,188,80Zm-28,48a32,32,0,1,1-32-32A32,32,0,0,1,160,128Z"
                            />
                          </svg>
                        </motion.a>
                      </>
                    </AnimatePresence>

                    {/* Plus/Cross Button */}
                  </div>
                </div>

                {/* Member Info */}
                <div className="text-center py-6">
                  <h3 className="font-semibold text-xl mb-1">{member.name}</h3>
                  <p className="text-gray-600">{member.position}</p>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default TeamSlider;
