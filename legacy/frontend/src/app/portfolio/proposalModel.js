'use client'
import { CONTRACT_CONFIG } from '@/config'
import {
  getErrorMessage,
  getEthFrom,
  getWeiFrom,
  NotifyError,
  NotifySuccess
} from '@/context/helper'
import Image from 'next/image'
import { usenfstayContext } from '@/context/nfstayContext'
import Modal from '@/utils/modal'
import ModalHeader from '@/utils/modalHeader'
import { useEffect, useState } from 'react'
import { LuMapPin } from 'react-icons/lu'
import Property from '/public/property.png'
import Tooltip from '@/utils/tooltip'

const ProposalModel = ({ open, handleClose, property, handleSubmit }) => {
  const {
    getVotingContract,
    connectedAddress,
    checkForApproval,
    getRouterContract,
    handleNetwork,
    balanceChecker
  } = usenfstayContext()

  const [proposal, setProposal] = useState('')
  const [isCreatingProposal, setIsCreatingProposal] = useState(false)
  const [isApprovalLoading, setIsApprovalLoading] = useState(false)
  const [proposalFee, setProposalFee] = useState(0)

  const handleAddProposal = async (address, propertyId, description) => {
    try {
      setIsCreatingProposal(true)
      setIsApprovalLoading(true)

      await handleNetwork()

      const contract = getVotingContract(true) // Get contract instance with signer
      const routerContract = await getRouterContract()

      const path = [CONTRACT_CONFIG.STAY, CONTRACT_CONFIG.USDC]

      const val = await routerContract.getAmountsIn(
        getWeiFrom(proposalFee),
        path
      )
      await checkForApproval('STAY', getEthFrom(val[0]), CONTRACT_CONFIG.voting)
      setIsApprovalLoading(false)

      await balanceChecker(
        address,
        Number(getEthFrom(val[0])),
        CONTRACT_CONFIG.STAY
      )

      const encodedDescription = await contract.encodeString(description)

      // Check for preconditions via callStatic
      await contract.callStatic.addProposal(propertyId, encodedDescription)

      // Call the function on the contract
      const tx = await contract.addProposal(propertyId, encodedDescription)

      await tx.wait() // Wait for transaction confirmation

      handleClose()
      setProposal('')
      handleSubmit()
    } catch (err) {
      console.log(err)
      const _msg = getErrorMessage(err)
      NotifyError(_msg)
    } finally {
      setIsCreatingProposal(false) // Set cancel loading to false when done
      setIsApprovalLoading(false)
    }
  }

  useEffect(() => {
    const getProposalFee = async () => {
      const contract = getVotingContract()
      const feeInUsdc = await contract.getProposalFees()
      setProposalFee(getEthFrom(feeInUsdc._hex))
    }
    getProposalFee()
  }, [])

  return (
    <Modal open={open} handleClose={handleClose} max='max-w-xl'>
      <div className='flex flex-col w-full p-4 gap-5 '>
        <ModalHeader
          title={property?.metadata?.name}
          handleClose={handleClose}
        />
        <div>
          <label className='text-[#a7a7a7] inline-block pb-3'>ITEM</label>
          <div className='flex items-center flex-wrap gap-3 justify-between'>
            <div className='bg-[#f5f5f7] p-4 min-h-[85px] w-full sm:w-3/4 flex justify-between flex-wrap items-center rounded-md'>
              <div className='flex flex-wrap items-center gap-4'>
                <Image
                  src={property?.metadata?.image}
                  width={60}
                  height={60}
                  className=''
                  alt='Property'
                />
                <div>
                  <div className='flex items-center gap-2'>
                    <p className='text-[17px] font-bold'>
                      {property?.metadata?.name}
                    </p>
                    <button className="relative group">
  <svg
    width="21"
    height="21"
    viewBox="0 0 21 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g opacity={0.7}>
      <path
        d="M10.5 19.25C15.3325 19.25 19.25 15.3325 19.25 10.5C19.25 5.66751 15.3325 1.75 10.5 1.75C5.66751 1.75 1.75 5.66751 1.75 10.5C1.75 15.3325 5.66751 19.25 10.5 19.25Z"
        stroke="#0C0839"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 14V10.5"
        stroke="#0C0839"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 7H10.5088"
        stroke="#0C0839"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
  <span
    className="invisible absolute z-[9999] bg-[#555555bd] p-2 px-3 text-xs sm:text-sm 
    group-hover:visible group-hover:opacity-100 
    right-0 translate-x-1/2 sm:translate-x-full 
    w-[16rem] sm:w-[20rem] max-w-[90vw]"
  >
    A $25 fee worth of STAY tokens is required to create a proposal.
  </span>
</button>

                  
                  </div>
                  <div className='flex items-center mt-1 text-[#9945FF] font-medium gap-1'>
                    <LuMapPin className='text-lg font-medium' />
                    <p>{property?.propertyLocation.location}</p>
                  </div>
                </div>
              </div>
              <div className='flex flex-col gap-1'>
                <p className='text-sm font-bold'>${proposalFee}</p>
                <span>USDC</span>
              </div>
            </div>
            <a
              href='/farm' // This sets the link's destination
              className='w-24 h-10 flex items-center justify-center border rounded-md font-medium bg-slate-50'
              onClick={e => {
                e.preventDefault() // Prevents the default link behavior
                window.location.href = '/farm' // Programmatically changes the page location
              }}
            >
              Buy STAY
            </a>
          </div>
        </div>

        <div className='flex flex-col gap-8 overflow-y-auto max-h-[85vh]'>
          <div className='flex flex-col gap-3'>
            <h2 className='uppercase opacity-60'>Property ID</h2>
            <p className='p-4 rounded-lg text-[#0C0839] bg-[#0C08390A] font-medium whitespace-pre-line'>
              {property?.id}
            </p>
          </div>
          <div className='flex flex-col gap-3'>
            <h2 className='uppercase opacity-60'>Proposal</h2>
            <textarea
              className='p-4 rounded-lg text-[#0C0839] bg-[#0C08390A] border-none outline-none resize-none font-medium whitespace-pre-line'
              value={proposal}
              rows={6}
              onChange={e => setProposal(e.target.value)}
              disabled={isCreatingProposal}
            />
          </div>
          <div className='flex items-center justify-between flex-wrap gap-5'>
            {/* cancel button with outline border */}
            <button
              className='border-2  px-5 py-2.5 rounded-full h-fit flex-1  font-medium '
              onClick={handleClose}
            >
              Cancel
            </button>

            <button
              type='button'
              onClick={() =>
                handleAddProposal(connectedAddress, property.id, proposal)
              }
              className='btn_primary_gradient disabled:cursor-not-allowed disabled:opacity-60 flex-1 text-white whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center gap-2'
              disabled={proposal == '' || isCreatingProposal}
            >
              {/* Conditionally render loader or button text */}
              {isCreatingProposal ? (
                <>
                  {' '}
                  <div className='w-5 h-5 border-4 border-t-[4px]  border-t-white rounded-full animate-spin'></div>{' '}
                  {isApprovalLoading ? 'Approve Pending (1/2)' : 'Creating Proposal (2/2)'}
                </>
              ) : (
                'Create Proposal'
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ProposalModel
