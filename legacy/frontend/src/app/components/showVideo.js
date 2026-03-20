"use client";
import { useState, useRef, Suspense, useEffect } from "react";
import { FaCirclePause, FaCirclePlay } from "react-icons/fa6";
import Vimeo from "@u-wave/react-vimeo";

const ShowVideo = () => {
  const [playing, setPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef(null);

  const handleTogglePlay = () => {
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  // useEffect(()=>{
  //   videoRef.current.play()
  //   setPlaying(true)
  // },[videoRef])

  return (
    <div className="w-full flex items-center justify-center">
      <div className="w-full flex items-center justify-center">
        <div className="w-full relative rounded-xl overflow-hidden">
          {isLoading && (
            <div className="w-full h-[90vh] bg-gray-300 animate-pulse flex items-center justify-center">
              {/* <div className='w-16 h-16 border-4 border-gray-400 border-t-transparent rounded-full animate-spin'></div> */}
            </div>
          )}
          <Vimeo
            video="1053764670" // Replace with your Vimeo video ID
            width="100%"
            height="100%"
            responsive
            loop
            onReady={() => setIsLoading(false)}
          />
        </div>
        {/* <Suspense fallback={<div className='h-32 bg-gray-300 rounded-xl animate-pulse w-full'>
            
          </div>}>
            <video  ref={videoRef}  controls={false} autoPlay className='w-full h-full rounded-xl'>
              <source src={"pitch.mp4"} type='video/mp4' />
              Your browser does not support the video tag.
            </video>
          </Suspense> */}

        {/* <div className='absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center'>
            <button onClick={handleTogglePlay} className='text-[#FFFFFFC2] '>
              {playing ? (
                <FaCirclePause size={50} />
              ) : (
                <FaCirclePlay size={50} />
              )}
            </button>
          </div> */}
      </div>
    </div>
  );
};

export default ShowVideo;
