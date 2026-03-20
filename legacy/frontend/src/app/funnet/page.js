import Image from 'next/image'
import React from 'react'
import Upgrade from './upgrade'
import Faq from './Faq'
import Footer from './footer'
import img1 from '../images/img1.jpg'
import img2 from '../images/img2.jpg'
import img3 from '../images/img3.jpg'
import Skip from './skip'

const page = () => {
  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-col py-8 px-4 md:px-8 lg:px-12 justify-center items-center'>
        <div className='flex flex-col gap-8 justify-center max-w-5xl'>
          <div className='flex items-center gap-2 p-4 rounded-lg font-bold bg-[#E9F6ED]'>
            <svg
              width='40'
              height='48'
              viewBox='0 0 48 48'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z'
                fill='#25AC5F'
              />
              <path
                d='M43.25 24C43.25 34.6315 34.6315 43.25 24 43.25C13.3685 43.25 4.75 34.6315 4.75 24C4.75 13.3685 13.3685 4.75 24 4.75C34.6315 4.75 43.25 13.3685 43.25 24Z'
                stroke='black'
                stroke-opacity='0.22'
                stroke-width='1.5'
                stroke-linecap='round'
                stroke-linejoin='round'
              />
              <path
                d='M24 32V24'
                stroke='white'
                stroke-width='4'
                stroke-linecap='round'
                stroke-linejoin='round'
              />
              <path
                d='M24 16H24.02'
                stroke='white'
                stroke-width='4'
                stroke-linecap='round'
                stroke-linejoin='round'
              />
            </svg>
            <p className='text-[#25AC5F] text-lg'>
              Important: Do not close this window or click the
              &lsquo;Back&rsquo; button. Clicking the &lsquo;Back&rsquo; button
              may result in your card being double-billed.
            </p>
          </div>
          <div className='flex flex-col gap-8 items-center justify-center'>
            <h1 className='text-5xl font-bold'>
              WAIT! YOUR ORDER IS NOT COMPLETE
            </h1>
            <p className='text-[#9945FF] text-4xl font-bold'>
              Please watch this very important message below
            </p>
            <div className='relative w-full overflow-hidden rounded-lg'>
              <video className='w-full fade-video' controls>
                <source src='your-video-source.mp4' type='video/mp4' />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
          <Skip />
          <Upgrade />
          <div className='flex flex-col gap-5'>
            <h1 className='text-2xl font-bold'>Overview</h1>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div className='overflow-hidden rounded-lg min-h-[15rem]'>
                  <Image
                    src={img1}
                    width={500}
                    height={500}
                    alt='Property Image'
                    className='max-w-full h-full'
                  />
                </div>
                <div className='overflow-hidden rounded-lg min-h-[15rem]'>
                  <Image
                    src={img2}
                    width={500}
                    height={500}
                    alt='Property Image'
                    className='max-w-full h-full'
                  />
                </div>
                <div className='overflow-hidden rounded-lg min-h-[15rem]'>
                  <Image
                    src={img3}
                    width={500}
                    height={500}
                    alt='Property Image'
                    className='max-w-full h-full'
                  />
                </div>
                <div className='flex items-center justify-center border shadow rounded-lg'>
                  <div className='relative size-44 self-center '>
                    <svg
                      className='size-full -rotate-90'
                      viewBox='0 0 36 36'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <circle
                        cx='18'
                        cy='18'
                        r='16'
                        fill='none'
                        className='stroke-current text-[#944afc33]'
                        stroke-width='4'
                      ></circle>
                      <circle
                        cx='18'
                        cy='18'
                        r='16'
                        fill='none'
                        className='stroke-current text-[#954AFC] transition-all'
                        stroke-width='4'
                        stroke-dasharray='100'
                        stroke-dashoffset='25'
                      ></circle>
                    </svg>
                    <div className='absolute top-1/2 start-1/2 transform -translate-y-1/2 -translate-x-1/2'>
                      <div className='flex flex-col text-center items-center justify-center gap-3'>
                        <h1 className='text-4xl font-bold'>75%</h1>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className='flex flex-col gap-3'>
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center w-fit gap-2 px-3 py-1.5 bg-white rounded-lg text-[#8165EC] border-2 border-[#8165EC]'>
                    <svg
                      width='20'
                      height='21'
                      viewBox='0 0 20 21'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M1.6665 17.1666V10.4999C1.6665 10.0579 1.8421 9.63397 2.15466 9.32141C2.46722 9.00885 2.89114 8.83325 3.33317 8.83325H16.6665C17.1085 8.83325 17.5325 9.00885 17.845 9.32141C18.1576 9.63397 18.3332 10.0579 18.3332 10.4999V17.1666'
                        stroke='#8165EC'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M3.3335 8.83325V5.49992C3.3335 5.05789 3.50909 4.63397 3.82165 4.32141C4.13421 4.00885 4.55814 3.83325 5.00016 3.83325H15.0002C15.4422 3.83325 15.8661 4.00885 16.1787 4.32141C16.4912 4.63397 16.6668 5.05789 16.6668 5.49992V8.83325'
                        stroke='#8165EC'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M10 3.83325V8.83325'
                        stroke='#8165EC'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                      <path
                        d='M1.6665 15.5H18.3332'
                        stroke='#8165EC'
                        stroke-width='1.5'
                        stroke-linecap='round'
                        stroke-linejoin='round'
                      />
                    </svg>
                    <span>3 Beds | 1,800 sqft</span>
                  </div>
                  <h1 className='text-3xl font-bold'>
                    Authentic 3-Bedroom Penthouse with a Private Terrace
                  </h1>
                  <div className='flex flex-wrap gap-5 justify-between'>
                    <div className='flex items-center gap-1'>
                      <svg
                        width='20'
                        height='21'
                        viewBox='0 0 20 21'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <g opacity='0.5'>
                          <path
                            d='M14.9998 17.9999C14.9998 16.2318 14.2975 14.5361 13.0472 13.2859C11.797 12.0356 10.1013 11.3333 8.33317 11.3333C6.56506 11.3333 4.86937 12.0356 3.61913 13.2859C2.36888 14.5361 1.6665 16.2318 1.6665 17.9999'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M8.33317 11.3333C10.6344 11.3333 12.4998 9.46785 12.4998 7.16667C12.4998 4.86548 10.6344 3 8.33317 3C6.03198 3 4.1665 4.86548 4.1665 7.16667C4.1665 9.46785 6.03198 11.3333 8.33317 11.3333Z'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M18.3333 17.1666C18.3333 14.3583 16.6667 11.7499 15 10.4999C15.5478 10.0889 15.9859 9.54916 16.2755 8.92848C16.565 8.30779 16.6971 7.62531 16.66 6.94142C16.6229 6.25753 16.4178 5.59332 16.0629 5.00759C15.7079 4.42185 15.2141 3.93264 14.625 3.58325'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                        </g>
                      </svg>
                      <h4 className='font-semibold'>650 Owners</h4>
                    </div>
                    <div className='flex items-center gap-1'>
                      <svg
                        width='21'
                        height='21'
                        viewBox='0 0 21 21'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <g opacity='0.5'>
                          <path
                            d='M17.8335 13.8334V7.16675C17.8332 6.87448 17.756 6.58742 17.6098 6.33438C17.4635 6.08134 17.2533 5.87122 17.0002 5.72508L11.1668 2.39175C10.9135 2.24547 10.6261 2.16846 10.3335 2.16846C10.0409 2.16846 9.75353 2.24547 9.50016 2.39175L3.66683 5.72508C3.41371 5.87122 3.20348 6.08134 3.05721 6.33438C2.91095 6.58742 2.8338 6.87448 2.8335 7.16675V13.8334C2.8338 14.1257 2.91095 14.4127 3.05721 14.6658C3.20348 14.9188 3.41371 15.1289 3.66683 15.2751L9.50016 18.6084C9.75353 18.7547 10.0409 18.8317 10.3335 18.8317C10.6261 18.8317 10.9135 18.7547 11.1668 18.6084L17.0002 15.2751C17.2533 15.1289 17.4635 14.9188 17.6098 14.6658C17.756 14.4127 17.8332 14.1257 17.8335 13.8334Z'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M6.5835 4.0083L10.3335 6.17497L14.0835 4.0083'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M6.5835 16.9917V12.6667L2.8335 10.5'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M17.8335 10.5L14.0835 12.6667V16.9917'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M3.05859 6.30005L10.3336 10.5084L17.6086 6.30005'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M10.3335 18.9V10.5'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                        </g>
                      </svg>
                      <h4 className='font-semibold'>1000 Total NFTs</h4>
                    </div>
                    <div className='flex items-center gap-1'>
                      <svg
                        width='21'
                        height='21'
                        viewBox='0 0 21 21'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <g opacity='0.5'>
                          <path
                            d='M2.38461 10.7901C2.31516 10.603 2.31516 10.3972 2.38461 10.2101C3.06102 8.56993 4.2092 7.16759 5.68358 6.1808C7.15796 5.19402 8.89214 4.66724 10.6663 4.66724C12.4404 4.66724 14.1746 5.19402 15.649 6.1808C17.1233 7.16759 18.2715 8.56993 18.9479 10.2101C19.0174 10.3972 19.0174 10.603 18.9479 10.7901C18.2715 12.4302 17.1233 13.8325 15.649 14.8193C14.1746 15.8061 12.4404 16.3329 10.6663 16.3329C8.89214 16.3329 7.15796 15.8061 5.68358 14.8193C4.2092 13.8325 3.06102 12.4302 2.38461 10.7901Z'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M10.6665 13C12.0472 13 13.1665 11.8807 13.1665 10.5C13.1665 9.11929 12.0472 8 10.6665 8C9.28579 8 8.1665 9.11929 8.1665 10.5C8.1665 11.8807 9.28579 13 10.6665 13Z'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                        </g>
                      </svg>
                      <h4 className='font-semibold'>0 Views</h4>
                    </div>
                    <div className='flex items-center gap-1'>
                      <svg
                        width='20'
                        height='21'
                        viewBox='0 0 20 21'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <g opacity='0.5'>
                          <path
                            d='M15.8332 12.1667C17.0748 10.95 18.3332 9.49167 18.3332 7.58333C18.3332 6.36776 17.8503 5.20197 16.9907 4.34243C16.1312 3.48289 14.9654 3 13.7498 3C12.2832 3 11.2498 3.41667 9.99984 4.66667C8.74984 3.41667 7.7165 3 6.24984 3C5.03426 3 3.86847 3.48289 3.00893 4.34243C2.14939 5.20197 1.6665 6.36776 1.6665 7.58333C1.6665 9.5 2.9165 10.9583 4.1665 12.1667L9.99984 18L15.8332 12.1667Z'
                            stroke='#0C0839'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                        </g>
                      </svg>
                      <h4 className='font-semibold'>1.2k Favorites</h4>
                    </div>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div className='p-4 flex flex-col gap-4 bg-[#F5F5F5] rounded-lg'>
                      <p>Property Listing Price</p>
                      <h2 className='text-xl font-bold'>860,000 USD</h2>
                    </div>
                    <div className='p-4 flex flex-col gap-4 bg-[#F5F5F5] rounded-lg'>
                      <p>Annual Yield</p>
                      <h2 className='text-xl font-bold'>14.86%</h2>
                    </div>
                    <div className='p-4 flex flex-col gap-4 bg-[#F5F5F5] rounded-lg'>
                      <p>6 YR Expected Asset Appreciation</p>
                      <h2 className='text-xl font-bold'>20%</h2>
                    </div>
                    <div className='p-4 flex flex-col gap-4 bg-[#F5F5F5] rounded-lg'>
                      <p className='flex items-center gap-2'>
                        6 YR Expected ROI{' '}
                        <svg
                          width='15'
                          height='20'
                          viewBox='0 0 21 20'
                          fill='none'
                          xmlns='http://www.w3.org/2000/svg'
                        >
                          <path
                            d='M10.4998 18.3334C15.1022 18.3334 18.8332 14.6025 18.8332 10.0001C18.8332 5.39771 15.1022 1.66675 10.4998 1.66675C5.89746 1.66675 2.1665 5.39771 2.1665 10.0001C2.1665 14.6025 5.89746 18.3334 10.4998 18.3334Z'
                            stroke='black'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M10.5 13.3333V10'
                            stroke='black'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                          <path
                            d='M10.5 6.66675H10.51'
                            stroke='black'
                            stroke-width='1.5'
                            stroke-linecap='round'
                            stroke-linejoin='round'
                          />
                        </svg>
                      </p>
                      <h2 className='text-xl font-bold'>109.12%</h2>
                    </div>
                  </div>
                </div>
                <h3 className='text-xl font-bold'>Location</h3>
                <div className='w-full min-h-[10rem]'>
                  <iframe
                    src='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.121367677097!2d3.372398314266928!3d6.531643195285401!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8e2f7e4e1e2d%3A0x8b3e1b4d1d3d6e4d!2sLekki%20Conservation%20Centre!5e0!3m2!1sen!2sng!4v1632922050736!5m2!1sen!2sng'
                    width='100%'
                    height='100%'
                    style={{ border: 0 }}
                    className='rounded-lg'
                    allowFullScreen=''
                    loading='lazy'
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
          <Skip />
          <Faq />
          <Skip />
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default page
