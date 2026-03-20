'use client'
import { useEffect, useState } from 'react'
import ContactInfo from '../components/pageA/contactInfo'
import PaymentDetail from '../components/pageA/paymentDetail'
import PaymentFlow from '../components/pageA/paymentFlow'
import PaymentForm from '../components/pageA/paymentForm'
import PaymentSummary from '../components/pageA/paymentSummary'
import BreadDown from '../details/breadDown'
import Documents from '../details/documents'
import PropertyDetail from '../details/propertyDetail'
import property from '../images/house.jpg'
import img1 from '../images/shares.png'
import PageCPropertyDetail from '../components/pageA/pageCPropertyDetail'
import listProperty from "../images/listProperty.webp"

const PageC = () => {
 const propertyDetails = {
    pricePerShare: 0,
    totalOwners: 0,
    apr: 0,
    totalShares: 0,
    metadata: {
      name: 'Authentic 3-Bedroom Penthouse With A Priv...',
      description: '',
      image: listProperty,
      images: [
        listProperty,
      ]
    },
    propertyLocation: {
      location: 'Manchester, United Kingdom',
      longitude: 0,
      latitude: 0
    },
    beds: 0,
    sqft: 0,
    remainingShares: 0,
    totalSharesInMarket: 0,
    transactionBreakdown: [
      {
        description: '',
        amount: 0,
        calculation_basis: ''
      }
    ],
    rentalBreakdown: [
      {
        description: '',
        value: 0,
        calculation_basis: ''
      }
    ]
  }
  const source = ''
  const paymentData = {
    propertyImage: property,
    propertyTitle: 'Authentic 3-Bedroom Penthouse With A Priv...',
    sharesCount: 10,
    pricePerShare: 8.6,
    processingFee: 10,
    transactionFeePercentage: 0.015, // 1.5%
    sharesImage: img1,
    propertyId: 1
  }

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }, [])

  return (
    <div className='w-full flex flex-col'>
      <div className='pb-2.5 w-full flex flex-col gap-6 xl:pb-1'>
        <div className='flex items-center justify-between gap-5'>
          <div className='flex gap-2 flex-col justify-between'>
            <div className='flex items-center gap-2'>
              <h4 className='text-title-lg font-bold text-black 2xl:text-5xl'>
                Overview
              </h4>
            </div>
          </div>
        </div>
        {loading ? (
          <PropertyDetailsSkeleton />
        ) : (
          <PageCPropertyDetail
            propertyDetails={propertyDetails}
            summaryData={paymentData}
            source={source}
          />
        )}
        {loading ? (
          <PaymentDetailsSkeleton />
        ) : (
          <PaymentDetail
            totalOwners={propertyDetails.totalOwners}
            totalShares={propertyDetails.totalShares}
            remainingShares={propertyDetails.remainingShares}
          />
        )}
        <PaymentFlow />

        <div className='w-full grid grid-cols-1 md:grid-cols-[60%_37%] gap-8 bg-[#F5F5F5] p-4 py-8'>
          <div className='flex flex-col gap-5'>
            <h1 className='text-title-lg font-bold text-black 2xl:text-5xl'>
              Enter your Payment Details
            </h1>

            <ContactInfo />
            <PaymentForm />
          </div>
          <div className='flex flex-col gap-5'>
            {loading ? (
              <PaymentSummarySkeleton />
            ) : (
              <PaymentSummary {...paymentData} buttonColor="#9945FF"/>
            )}
            <p className='text-sm text-gray-600 text-center'>
              100% Risk-Free: Invest $10 & Get $10 Cashback on Your 1st Rent in
              30 Days
            </p>
          </div>
        </div>

        {loading ? (
          <BreadDownSkeleton />
        ) : (
          <BreadDown
            transactionBreakdown={propertyDetails.transactionBreakdown}
            rentalBreakdown={propertyDetails.rentalBreakdown}
          />
        )}
        {loading ? <DocumentsSkeleton /> : <Documents />}
      </div>
    </div>
  )
}

export default PageC

export const PropertyDetailsSkeleton = () => {
  return (
    <div className='grid grid-cols-1 w-full min-h-96  sm:grid-cols-2 gap-8'>
      <div className='flex flex-col gap-5'>
        <div className='flex items-center w-32 h-10 bg-gray-200 animate-pulse rounded-lg' />

        <p className='2xl:text-base w-1/3 h-6 bg-gray-200 animate-pulse'></p>
        <div className='flex w-full h-full relative rounded-xl overflow-hidden'>
          <div className='w-full h-full bg-gray-200 animate-pulse' />
          <div className='flex items-center justify-between w-full p-4 absolute top-0'>
            <div className='flex items-center w-24 h-5 gap-2  rounded-full bg-white'></div>
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-5 p-5 rounded-xl shadow-md bg-white border '>
      <h2 className='text-2xl font-bold text-gray-800'>Payment Summary</h2>
      <div className='flex items-center gap-4 bg-[#F5F5F5] p-3 rounded-lg'>
        <div className='w-16 h-16 rounded-lg bg-gray-200 animate-pulse' />
        <p className='w-full h-4 bg-gray-200 animate-pulse' />
      </div>
      <div className='space-y-3 border-b pb-2'>
        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-5 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>
        <div className='flex justify-between text-gray-600'>
          <span className='w-24 h-5 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>
        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-5 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>
        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-6 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>

        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-6 bg-gray-200 animate-pulse' />
          <span className='w-8 h-5 bg-gray-200 animate-pulse' />
        </div>
        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-6 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>
      </div>
      <div className='w-full bg-gray-200 rounded-full h-8' />

    </div>
    </div>
  )
}

export const PaymentDetailsSkeleton = ({ showButton = false }) => {
  return (
    <div className='w-full flex flex-col gap-5 border-2 rounded-xl shadow p-5 '>
      <div className='flex flex-wrap gap-5 w-full  2xl:text-lg'>
        <div className='flex items-center flex-1 gap-1'>
          <div className='size-8 bg-gray-200 animate-pulse' />
          <p className='2xl:text-base w-32 h-4 bg-gray-200 animate-pulse'></p>
        </div>
        <div className='flex items-center flex-1 gap-1'>
          <div className='size-8 bg-gray-200 animate-pulse' />
          <p className='2xl:text-base w-32 h-4 bg-gray-200 animate-pulse'></p>
        </div>
        <div className='flex items-center flex-1 gap-1'>
          <div className='size-8 bg-gray-200 animate-pulse' />
          <p className='2xl:text-base w-24 h-4 bg-gray-200 animate-pulse'></p>
        </div>
      </div>
      <div className='flex flex-col gap-3'>
        <div className='w-2/3 h-4 bg-gray-200 animate-pulse' />
        <div className='w-full rounded-full h-3 bg-gray-200 animate-pulse' />
      </div>
      {showButton && <div className='w-full bg-gray-200 rounded-full h-8' />}
      <div className='flex flex-wrap gap-5 w-full  2xl:text-lg'>
        <div className='flex items-center  gap-1'>
          <div className='size-8 bg-gray-200 animate-pulse' />
          <p className='2xl:text-base w-16 h-4 bg-gray-200 animate-pulse'></p>
        </div>
        <div className='flex items-center  gap-1'>
          <div className='size-8 bg-gray-200 animate-pulse' />
          <p className='2xl:text-base w-32 h-4 bg-gray-200 animate-pulse'></p>
        </div>
      </div>
    </div>
  )
}

export const PaymentSummarySkeleton = () => {
  return (
    <div className='flex flex-col gap-5 p-5 rounded-xl shadow-md bg-white border '>
      <h2 className='text-2xl font-bold text-gray-800'>Payment Summary</h2>
      <div className='flex items-center gap-4 bg-[#F5F5F5] p-3 rounded-lg'>
        <div className='w-16 h-16 rounded-lg bg-gray-200 animate-pulse' />
        <p className='w-full h-4 bg-gray-200 animate-pulse' />
      </div>

      {/* Popular Add-Ons */}
      <div>
        <h3 className='text-sm font-medium mb-3'>Popular Add-Ons</h3>
        <div className='flex flex-col gap-3 w-full bg-[#9945FF14] p-4 rounded-lg'>
          <div className='flex items-center justify-between w-full'>
            <p className=' font-bold whitespace-pre-line'>
              Dedicated Live Support
            </p>
            <button
              type='button'
              onClick={() => setShowDetails(!showDetails)}
              className='underline font-medium'
            >
              Details
            </button>
          </div>
          <div className=' flex items-center justify-between'>
            <div className='flex gap-3 items-center w-full'>
              <div className='w-10 h-10 bg-purple-200 animate-pulse flex items-center justify-center' />
              <div className='w-full bg-gray-300 animate-pulse h-4' />
              <div></div>
            </div>
          </div>
        </div>
      </div>
      <div className='space-y-3 border-b pb-2'>
        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-5 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>
        <div className='flex justify-between text-gray-600'>
          <span className='w-24 h-5 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>
        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-5 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>
        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-6 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>

        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-6 bg-gray-200 animate-pulse' />
          <span className='w-8 h-5 bg-gray-200 animate-pulse' />
        </div>
        <div className='flex justify-between text-gray-600'>
          <span className='w-32 h-6 bg-gray-200 animate-pulse' />
          <span className='w-16 h-5 bg-gray-200 animate-pulse' />
        </div>
      </div>

      {/* Agreement Checkbox */}
      <div className='flex gap-2 w-full'>
        <div className='w-5 h-5 rounded bg-gray-200 animate-pulse' />
        <p className='w-full h-5 bg-gray-200 animate-pulse' />
      </div>

      <div className='w-full bg-gray-200 rounded-full h-8' />

      {/* Powered By */}
      <div className='text-center space-y-4'>
        <div className='text-sm text-gray-600 flex items-center justify-center gap-2'>
          <span className='w-full h-5 bg-gray-200 animate-pulse' />
        </div>
      </div>
    </div>
  )
}

export const BreadDownSkeleton = () => {
  return (
    <div className='flex flex-col w-full gap-5'>
      <h4 className='text-title-lg font-bold text-black 2xl:text-3xl'>
        Financial Breakdown
      </h4>
      <div className='w-full grid grid-cols-1 md:grid-cols-2 gap-5 h-fit'>
        <div className='p-4 flex flex-col gap-5 bg-[#F7F6FF] rounded-lg h-fit'>
          <div className='flex pb-3 border-b-2 justify-between'>
            <div className='flex items-center gap-3'>
              <div className='size-10 bg-white rounded-lg shadow-lg border flex items-center justify-center'>
                <div className='size-8 rounded bg-gray-200 animate-pulse' />
              </div>
              <div className='flex flex-col gap-1'>
                <div className='w-24 h-5 bg-gray-200 animate-pulse' />
                <div className='w-16 h-4 bg-gray-200 animate-pulse' />
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <p className='w-40 h-4 bg-gray-200 animate-pulse'></p>
              <div className='size-6 bg-gray-200 animate-pulse rounded' />
            </div>
          </div>
          <div className='flex flex-col gap-5'>
            <div className='flex justify-between text-gray-600'>
              <span className='w-32 h-6 bg-gray-200 animate-pulse' />
              <span className='w-16 h-5 bg-gray-200 animate-pulse' />
            </div>
            <div className='flex justify-between text-gray-600'>
              <span className='w-32 h-6 bg-gray-200 animate-pulse' />
              <span className='w-16 h-5 bg-gray-200 animate-pulse' />
            </div>
            <div className='flex justify-between text-gray-600'>
              <span className='w-32 h-6 bg-gray-200 animate-pulse' />
              <span className='w-16 h-5 bg-gray-200 animate-pulse' />
            </div>
          </div>
        </div>
        <div className='p-4 flex flex-col gap-5 bg-[#F7F6FF] rounded-lg h-fit'>
          <div className='flex pb-3 border-b-2 justify-between'>
            <div className='flex items-center gap-3'>
              <div className='size-10 bg-white rounded-lg shadow-lg border flex items-center justify-center'>
                <div className='size-8 rounded bg-gray-200 animate-pulse' />
              </div>
              <div className='flex flex-col gap-1'>
                <div className='w-24 h-5 bg-gray-200 animate-pulse' />
                <div className='w-16 h-4 bg-gray-200 animate-pulse' />
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <p className='w-40 h-4 bg-gray-200 animate-pulse'></p>
              <div className='size-6 bg-gray-200 animate-pulse rounded' />
            </div>
          </div>
          <div className='flex flex-col gap-5'>
            <div className='flex justify-between text-gray-600'>
              <span className='w-32 h-6 bg-gray-200 animate-pulse' />
              <span className='w-16 h-5 bg-gray-200 animate-pulse' />
            </div>
            <div className='flex justify-between text-gray-600'>
              <span className='w-32 h-6 bg-gray-200 animate-pulse' />
              <span className='w-16 h-5 bg-gray-200 animate-pulse' />
            </div>
            <div className='flex justify-between text-gray-600'>
              <span className='w-32 h-6 bg-gray-200 animate-pulse' />
              <span className='w-16 h-5 bg-gray-200 animate-pulse' />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const DocumentsSkeleton = () => {
  return (
    <div className='flex items-center justify-center rounded-lg bg-gray-100 w-full min-h-52'>
      <div className='flex items-center flex-col justify-center gap-5 max-w-max '>
        <h1 className='text-3xl font-bold text-center  2xl:text-4xl'>
          Download Confidential documents
        </h1>
        <div className='flex items-center gap-5 flex-wrap justify-center'>
          <div className='flex items-center gap-2 h-6 w-48 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse' />
          <div className='flex items-center gap-2 h-6 w-32 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse' />
          <div className='flex items-center gap-2 h-6 w-52 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse' />
          <div className='flex items-center gap-2 h-6 w-32 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse' />
        </div>
      </div>
    </div>
  )
}
