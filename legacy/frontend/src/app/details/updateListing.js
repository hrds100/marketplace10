import {
  getErrorMessage,
  getWeiFrom,
  NotifyError,
  NotifySuccess,
} from "@/context/helper";
import { usenfstayContext } from "@/context/nfstayContext";
import { acceptWholeNumbers } from "@/utils/acceptWholeNumbers";
import Modal from "@/utils/modal";
import ModalHeader from "@/utils/modalHeader";
import Image from "next/image";
import { useState } from "react";

const UpdateListing = ({
  fetchSecondarySaleProperties = () => {},
  property,
  secondaryDetails,
  open,
  handleClose,
  listingId,
  setIsUpdateLoading,
  isUpdateLoading,
}) => {
  const { getMarketplaceContract, connectedAddress, handleNetwork } =
    usenfstayContext();
  const [numberOfShares, setNumberOfShares] = useState(
    secondaryDetails?.sharesRemaining || 0
  );
  const [pricePerShare, setPricePerShare] = useState(
    secondaryDetails?.pricePerShare || 0
  );

  const handleUpdate = async () => {
    try {
      if (!connectedAddress) throw new Error("Please connect your wallet"); 
      setIsUpdateLoading(true);
      await handleNetwork();

      const contract = getMarketplaceContract(true);

      await contract.callStatic.updateSecondarySale(
        listingId,
        numberOfShares,
        getWeiFrom(pricePerShare)
      );

      const tx = await contract.updateSecondarySale(
        listingId,
        numberOfShares,
        getWeiFrom(pricePerShare)
      );

      await tx.wait();

      fetchSecondarySaleProperties(listingId, false);

      handleClose();
      NotifySuccess("Property Updated Successfully");
    } catch (err) {
      console.log(err);
      const _msg = getErrorMessage(err);
      NotifyError(_msg);
    } finally {
      setIsUpdateLoading(false);
    }
  };

  return (
    <Modal open={open} handleClose={handleClose} max="max-w-md">
      <div className="flex flex-col w-full p-4 gap-5 ">
        <ModalHeader title={"Update Listing"} handleClose={handleClose} />

        <div className="flex flex-col gap-3 overflow-y-auto max-h-[85vh] isolate relative">
          <div className="flex flex-col gap-3 ">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0C0839] bg-opacity-5">
              <div className="sm:size-[8rem] sm:shrink-0">
                <Image
                  src={property.metadata.image}
                  width={300}
                  height={500}
                  className="rounded-lg object-cover h-full max-w-full "
                  alt={"Image"}
                />
              </div>
              <div className="flex items-center justify-between gap-5 flex-wrap w-full">
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-lg truncate">
                    {property.metadata.name}
                  </h3>
                  <p className="flex items-center gap-1  text-[#954AFC]">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M16.6668 8.33341C16.6668 12.4942 12.051 16.8276 10.501 18.1659C10.3566 18.2745 10.1808 18.3332 10.0002 18.3332C9.8195 18.3332 9.64373 18.2745 9.49933 18.1659C7.94933 16.8276 3.3335 12.4942 3.3335 8.33341C3.3335 6.5653 4.03588 4.86961 5.28612 3.61937C6.53636 2.36913 8.23205 1.66675 10.0002 1.66675C11.7683 1.66675 13.464 2.36913 14.7142 3.61937C15.9645 4.86961 16.6668 6.5653 16.6668 8.33341Z"
                        stroke="#954AFC"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10 10.8333C11.3807 10.8333 12.5 9.71396 12.5 8.33325C12.5 6.95254 11.3807 5.83325 10 5.83325C8.61929 5.83325 7.5 6.95254 7.5 8.33325C7.5 9.71396 8.61929 10.8333 10 10.8333Z"
                        stroke="#954AFC"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {property.propertyLocation.location}
                  </p>
                </div>
                <div className="flex flex-col h-full items-start justify-center w-full">
                  <p className="text-sm font-bold text-left w-full">
                    Current Shares: {secondaryDetails.sharesRemaining || 0}
                  </p>
                  <p className="text-sm font-bold text-left w-full">
                    Current Price: ${secondaryDetails.pricePerShare || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {/* update the share and price */}
              <div className="flex flex-col gap-3">
                <label className="text-lg font-bold">New Shares:</label>
                <input
                  type="number"
                  name="price"
                  value={numberOfShares}
                  onChange={(e) => setNumberOfShares(acceptWholeNumbers(e))}
                  className="w-full bg-[#F5F5F5] border-none outline-none font-bold text-lg p-2"
                />
                <label className="text-lg font-bold">New Price:</label>
                <input
                  type="number"
                  name="amount"
                  value={pricePerShare}
                  onChange={(e) => setPricePerShare(acceptWholeNumbers(e))}
                  className="w-full bg-[#F5F5F5] border-none outline-none font-bold text-lg p-2"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex  items-center flex-col sm:flex-row justify-between gap-5">
          <div className="flex items-center flex-col sm:flex-row justify-between gap-5">
            <button
              disabled={pricePerShare == 0 && numberOfShares == 0}
              onClick={handleClose}
              type="button"
              className="text-[#0C0839] w-full whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-semibold border flex items-center justify-center gap-2"
            >
              Cancel
            </button>

            <button
              disabled={
                (pricePerShare == 0 && numberOfShares == 0) || isUpdateLoading
              }
              onClick={handleUpdate}
              type="button"
              className="btn_primary_gradient text-white w-full disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center gap-2"
            >
              {/* Show loader if needed */}
              {isUpdateLoading ? (
                <div className="w-5 h-5 border-4 border-t-[4px] border-t-[#3d4a6c] rounded-full animate-spin"></div>
              ) : (
                "Update"
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UpdateListing;
