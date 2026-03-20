"use client";
import Image from "next/image";
import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="relative w-full h-fit overflow-hidden bg-gray-200 group">
      {/* Carousel Images */}
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="relative w-full h-[25rem] flex-shrink-0 flex items-center justify-center"
          >
            <Image
              priority={index === 0}
              fill={true}
              src={image}
              alt={`Slide ${index}`}
              onError={(e) =>
                (e.target.src =
                  "https://photos.pinksale.finance/file/pinksale-logo-upload/1734453431720-03dcb198e4d12e88ccc503011e0cd48f.jpg")
              }
            />
          </div>
        ))}
      </div>
      <button
        onClick={goToPrevious}
        className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <FiChevronLeft size={24} />
      </button>
      <button
        onClick={goToNext}
        className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <FiChevronRight size={24} />
      </button>
    </div>
  );
};

export default ImageCarousel;
