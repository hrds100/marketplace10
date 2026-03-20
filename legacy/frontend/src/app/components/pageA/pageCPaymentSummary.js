'use client'

import Image from 'next/image'

export default function PageCPaymentSummary ({
  propertyImage,
  propertyTitle,
  sharesCount,
  pricePerShare,
  processingFee,
  transactionFeePercentage,
 
}) {


  // Calculate totals
  const subtotal = pricePerShare * sharesCount
  const transactionFee = (subtotal * transactionFeePercentage).toFixed(0)
  const grandTotal = subtotal + Number.parseInt(transactionFee)

  return (
    <div className='flex flex-col gap-5 p-5 rounded-xl shadow-md bg-white border '>
      <h2 className='text-2xl font-bold text-gray-800'>Payment Summary</h2>

      {/* Property Preview */}
      <div className='flex items-center gap-4 bg-[#F5F5F5] p-3 rounded-lg'>
        <Image
          src={propertyImage}
          width={100}
          height={100}
          alt={propertyTitle}
          className='w-16 h-16 rounded-lg object-cover'
        />
        <p className=''>
          <span className='font-medium mr-1'>{sharesCount}× Shares</span>
          <span className='text-gray-600 whitespace-pre-line'>
            {propertyTitle}
          </span>
        </p>
      </div>
      <div className='space-y-3 border-b pb-2'>
        <div className='flex justify-between text-gray-600'>
          <span>Dedicated Live Support</span>
          <span>${processingFee} $0</span>
        </div>
        <div className='flex justify-between text-gray-600'>
          <span>Price Per Share</span>
          <span>${pricePerShare.toFixed(2)}</span>
        </div>
        <div className='flex justify-between text-gray-600'>
          <span>Shares Purchased</span>
          <span>{sharesCount.toLocaleString()}</span>
        </div>
        <div className='flex justify-between text-gray-600'>
          <span>Subtotal</span>
          <span>${subtotal.toLocaleString()}</span>
        </div>
        <div className='flex justify-between text-gray-600'>
          <span>
            Transaction Fee ({(transactionFeePercentage * 100).toFixed(1)}%)
          </span>
          <span>${transactionFee}</span>
        </div>
        <div className='flex justify-between font-semibold text-lg'>
          <span>Grand Total</span>
          <span>${grandTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Order Button */}
      <button
        className='w-full bg-[#9945FF] text-white py-4 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed'
      >
        Buy Now
      </button>
     
    </div>
  )
}
