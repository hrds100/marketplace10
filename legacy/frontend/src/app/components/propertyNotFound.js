 "use client";
import Image from 'next/image';
import React from 'react';
import img from "../images/error-404-not-found.svg"

const PropertyNotFound = () => {
    return (
        <div className="flex flex-col items-center justify-center gap-5 h-full w-full min-h-[calc(100dvh-200px)] text-center p-8 bg-gray-50 rounded-lg shadow-md">
            <div className='flex items-center justify-center w-full lg:w-1/2 h-[30rem]'>
                <Image
                    src={img} // Replace with the URL of your vector image
                    alt="Property Not Found"
                    className="max-w-full h-full object-cover"
                />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 ">Property Not Found</h2>
            <p className="text-gray-600  text-xl">
                Sorry, we couldn’t find the property you’re looking for. It might be unavailable or has been removed.
            </p>
            <button
                onClick={() => window.history.back()}
                className="btn_primary_gradient w-fit whitespace-nowrap 2xl:text-lg px-5 py-2.5 rounded-full h-fit font-medium text-white flex items-center gap-2 justify-center"
            >
                Go Back
            </button>
        </div>
    );
};

export default PropertyNotFound;
