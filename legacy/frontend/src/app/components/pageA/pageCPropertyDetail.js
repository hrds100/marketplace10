import ImageCarousel from "@/app/details/imageCarousel";
import PageCPaymentSummary from "./pageCPaymentSummary";


const PageCPropertyDetail = ({

    propertyDetails,
    summaryData,
  }) => {
    const {
     
      metadata,
      propertyLocation,
      beds,
      sqft,
    } = propertyDetails;
  
    let toolText = `
      Our 6-year return projection includes the current annual APR, derived from the property's ongoing rental agreement, plus an estimated 20% property value appreciation.
  
      `;
  
    let images = [metadata.image, ...(metadata.images || [])];
   
  
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="flex flex-col gap-5">
         <div className="flex flex-col gap-5">
          <div className="flex items-center w-fit gap-2 px-3 py-1.5 bg-white rounded-lg text-[#8165EC] border-2 border-[#8165EC]">
            <svg
              width="20"
              height="21"
              viewBox="0 0 20 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.6665 17.1666V10.4999C1.6665 10.0579 1.8421 9.63397 2.15466 9.32141C2.46722 9.00885 2.89114 8.83325 3.33317 8.83325H16.6665C17.1085 8.83325 17.5325 9.00885 17.845 9.32141C18.1576 9.63397 18.3332 10.0579 18.3332 10.4999V17.1666"
                stroke="#8165EC"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M3.3335 8.83325V5.49992C3.3335 5.05789 3.50909 4.63397 3.82165 4.32141C4.13421 4.00885 4.55814 3.83325 5.00016 3.83325H15.0002C15.4422 3.83325 15.8661 4.00885 16.1787 4.32141C16.4912 4.63397 16.6668 5.05789 16.6668 5.49992V8.83325"
                stroke="#8165EC"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M10 3.83325V8.83325"
                stroke="#8165EC"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M1.6665 15.5H18.3332"
                stroke="#8165EC"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span className="2xl:text-base">
              {beds} Beds | {sqft} sqft
            </span>
          </div>
  
          <h1 className="text-3xl font-bold 2xl:text-4xl">{metadata.name}</h1>
         
          
        </div>
        <div className="flex w-full relative rounded-xl overflow-hidden">
         
          <ImageCarousel images={images} interval={3000} />
          <div className="flex items-center justify-between w-full p-4 absolute top-0">
            <div className="flex items-center px-2 gap-2 py-1.5 rounded-full bg-white">
              <svg
                width="14"
                height="16"
                viewBox="0 0 14 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M3.75844 3.42568C4.61798 2.56614 5.78377 2.08325 6.99935 2.08325C8.21492 2.08325 9.38071 2.56614 10.2403 3.42568C11.0998 4.28522 11.5827 5.45101 11.5827 6.66659C11.5827 8.07803 10.7856 9.61118 9.73454 10.9921C8.74996 12.2857 7.62357 13.3413 6.99935 13.8872C6.37513 13.3413 5.24874 12.2857 4.26415 10.9921C3.21313 9.61118 2.41602 8.07803 2.41602 6.66659C2.41602 5.45101 2.8989 4.28522 3.75844 3.42568ZM6.99935 0.583252C5.38595 0.583252 3.83863 1.22417 2.69778 2.36502C1.55694 3.50587 0.916016 5.05318 0.916016 6.66659C0.916016 8.58381 1.96524 10.4483 3.07054 11.9006C4.19323 13.3756 5.46964 14.5486 6.10853 15.1003C6.1213 15.1113 6.13445 15.1219 6.14793 15.132C6.39341 15.3166 6.69222 15.4164 6.99935 15.4164C7.30648 15.4164 7.60529 15.3166 7.85077 15.132C7.86425 15.1219 7.87739 15.1113 7.89017 15.1003C8.52906 14.5486 9.80546 13.3756 10.9282 11.9006C12.0335 10.4483 13.0827 8.58381 13.0827 6.66659C13.0827 5.05319 12.4418 3.50587 11.3009 2.36502C10.1601 1.22417 8.61275 0.583252 6.99935 0.583252ZM5.75 6.66663C5.75 5.97627 6.30964 5.41663 7 5.41663C7.69036 5.41663 8.25 5.97627 8.25 6.66663C8.25 7.35698 7.69036 7.91663 7 7.91663C6.30964 7.91663 5.75 7.35698 5.75 6.66663ZM7 3.91663C5.48122 3.91663 4.25 5.14784 4.25 6.66663C4.25 8.18541 5.48122 9.41663 7 9.41663C8.51878 9.41663 9.75 8.18541 9.75 6.66663C9.75 5.14784 8.51878 3.91663 7 3.91663Z"
                  fill="url(#paint0_linear_0_7075)"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_0_7075"
                    x1="0.916016"
                    y1="-2.50703"
                    x2="13.2591"
                    y2="-2.3847"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stop-color="#9945FF" />
                    <stop offset="1" stop-color="#20E19F" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="uppercase gradient_text font-bold">
                {propertyLocation.location}
              </span>
            </div>
          </div>
        </div>
       </div>
       <PageCPaymentSummary {...summaryData} />
      </div>
    );
}

export default PageCPropertyDetail