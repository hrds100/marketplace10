"use client";
import Modal from "@/utils/modal";
import ModalHeader from "@/utils/modalHeader";
import Image from "next/image";
import usdt from "../images/usdc.svg";
import bnb from "../images/bnb.webp";
import { useState } from "react";
import { usenfstayContext } from "@/context/nfstayContext";
import {
  getErrorMessage,
  getEthFrom,
  getWeiFrom,
  NotifyError,
  formatNumber,
  getBulkBuyPrimarySharesCalldata,
} from "@/context/helper";
import { CONTRACT_CONFIG } from "@/config";
import { Transak } from "@transak/transak-sdk";
import { useKYCContext } from "@/context/KYCModalContext";

// env for POST endpoint
const CREATE_TX_ID_URL = process.env.NEXT_PUBLIC_TRANSAK_CREATE_TX_PROXY;
const TRANSAK_CONTRACT_ID = process.env.NEXT_PUBLIC_TRANSAK_CONTRACT_ID;
const TRANSAK_API_KEY = process.env.NEXT_PUBLIC_TRANSAK_API_KEY;

const BulkCheckout = ({
  marketFee,
  open,
  setOpen,
  setIsSuccess,
  cartItems,
  total,
}) => {
  const {
    getMarketplaceFee,
    connectedAddress,
    getMarketplaceContract,
    checkForApproval,
    handleNetwork,
    balanceChecker,
    getValueFromRouter,
  } = usenfstayContext();

  const { checkUserRegistration } = useKYCContext();

  const [currentMethod, setCurrentMethod] = useState("USDC");
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const prepareBulkBuyOrders = async (orders) => {
    try {
      const updatedOrders = [];
      let totalCostWithoutFee = 0;

      for (const order of orders) {
        const { pricePerShare, quantity, propertyId } = order;
        const costWithoutFee = Number(quantity) * Number(pricePerShare);

        updatedOrders.push({
          _propertyId: propertyId,
          _usdcAmount: getWeiFrom(`${costWithoutFee}`),
        });

        totalCostWithoutFee += costWithoutFee;
      }

      let platformFee = await getMarketplaceFee();
      platformFee = Number(platformFee[0]._hex) / 100;

      const finalAmount =
        totalCostWithoutFee + (totalCostWithoutFee * platformFee) / 100;

      return { updatedOrders, finalAmount };
    } catch (err) {
      console.error("Error preparing bulk buy orders:", err);
      throw err;
    }
  };

  // POST -> returns nftTransactionId
  async function createNftTransactionId(payload) {
    const res = await fetch(CREATE_TX_ID_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Transak POST failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    const id = data?.id;
    if (!id) throw new Error("No id returned from nft-transaction-id API");
    return id;
  }

  const handleBulkBuyPrimaryShares = async (method, items) => {
    try {
      if (!connectedAddress) throw new Error("Please connect your wallet");
      if (!items || items.length === 0)
        throw new Error("No properties selected");
      await handleNetwork();

      // ----- CARD FLOW via Transak SDK (use nftTransactionId in settings) -----
      if (method === "card") {
        setIsBulkLoading(true);

        // 1) Grab fee bips
        const market = getMarketplaceContract();
        const [primaryFeeBipsBN] = await market.getPlaformFee();
        const primaryFeeBips = Number(primaryFeeBipsBN);

        // 2) Build calldata inputs (NO fee) + preview arrays (WITH fee)
        const ordersNoFee = [];
        const tokenID = [];
        const price = [];
        let totalQuantity = 0;

        for (const item of items) {
          const propertyId = item.propertyId;
          const qty = Math.floor(Number(item.quantity));
          const basePPS = Number(item.pricePerShare);

          if (!Number.isFinite(qty) || qty <= 0)
            throw new Error("Invalid quantity in cart");
          if (!Number.isFinite(basePPS) || basePPS <= 0)
            throw new Error("Invalid price per share in cart");

          // calldata (no fee)
          const usdcAmountNoFee = basePPS * qty;
          ordersNoFee.push({ propertyId, usdcAmount: usdcAmountNoFee });

          // preview (with fee)
          const ppsWithFee = basePPS * (1 + primaryFeeBips / 10_000);
          for (let i = 0; i < qty; i++) {
            tokenID.push(propertyId);
            price.push(Number(ppsWithFee));
          }
          totalQuantity += qty;
        }

        // 3) Build calldata for bulk
        const referral =
          localStorage.getItem("referral") ?? CONTRACT_CONFIG.zeroAddress;
        const calldata = getBulkBuyPrimarySharesCalldata(referral, ordersNoFee);
        if (!calldata) throw new Error("Failed to build calldata");

        const imageURL =
          "https://www.shutterstock.com/image-illustration/bulk-purchase-text-on-carton-600nw-1867394227.jpg";
        const nftName = "Multiple Property Shares";
        const collectionAddress = CONTRACT_CONFIG.rwa;

        const payload = {
          calldata,
          cryptoCurrencyCode: "USDC",
          estimatedGasLimit: 800000,
          contractId: TRANSAK_CONTRACT_ID,
          nftData: [
            {
              imageURL,
              nftName,
              collectionAddress,
              tokenID,
              price,
              quantity: totalQuantity,
              nftType: "ERC1155",
            },
          ],
        };

        // 5) Get nftTransactionId then open SDK with ONLY the id in settings
        const nftTransactionId = await createNftTransactionId(payload);

        const settings = {
          apiKey: TRANSAK_API_KEY,
          environment: Transak.ENVIRONMENTS.STAGING,
          nftTransactionId,
          walletAddress: connectedAddress,
          defaultPaymentMethod: "credit_debit_card",
          themeColor: "000000",
          exchangeScreenTitle: "Buy Property Shares (Bulk)",
          disableWalletAddressForm: true,
          isNFT: true,
        };
        const transak = new Transak(settings);
        transak.init();
        setOpen(false);

        Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
          transak.close();
          setIsBulkLoading(false);
        });

        return;
      }

      // -------------------- ON-CHAIN PATHS (USDC / BNB) --------------------
      const { updatedOrders, finalAmount } = await prepareBulkBuyOrders(items);
      let _amountWithFee = finalAmount;
      let _currency;
      let _value = "0";

      if (method === "USDC") {
        setIsApprovalLoading(true);
        await checkForApproval(
          method,
          _amountWithFee,
          CONTRACT_CONFIG.rwaMarketplace
        );
        setIsApprovalLoading(false);
        setIsBulkLoading(true);

        _currency = CONTRACT_CONFIG.USDC;
        await balanceChecker(connectedAddress, _amountWithFee, _currency);
      } else {
        setIsBulkLoading(true);

        _value = await getValueFromRouter(CONTRACT_CONFIG.WBNB, _amountWithFee);
        _currency = CONTRACT_CONFIG.zeroAddress;
        await balanceChecker(
          connectedAddress,
          Number(getEthFrom(_value._hex)),
          _currency
        );
      }

      const contract = getMarketplaceContract(true);
      let storedReferral = localStorage.getItem("referral");
      if (!storedReferral) storedReferral = CONTRACT_CONFIG.zeroAddress;

      await contract.callStatic.bulkBuyPrimaryShares(
        connectedAddress,
        _currency,
        storedReferral,
        updatedOrders,
        { value: _value }
      );

      const tx = await contract.bulkBuyPrimaryShares(
        connectedAddress,
        _currency,
        storedReferral,
        updatedOrders,
        { value: _value }
      );
      await tx.wait();
      setOpen(false);
      setTimeout(() => setIsSuccess(true), 800);
      await checkUserRegistration(connectedAddress);
    } catch (err) {
      console.error(err);
      NotifyError(getErrorMessage(err) || "Something went wrong");
    } finally {
      setIsBulkLoading(false);
      setIsApprovalLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} handleClose={() => setOpen(false)}>
        <div className="flex flex-col w-full p-4 gap-5 z-10">
          <ModalHeader
            title={"Complete Checkout"}
            handleClose={() => setOpen(false)}
          />

          <div className="flex items-center gap-4 p-3 justify-between flex-start rounded-xl bg-[#0C0839] bg-opacity-5">
            <span className="text-lg font-semibold">Total</span>
            <p className="text-xl font-bold">
              <span>
                $
                {formatNumber(
                  Number(total) + Number((total * marketFee) / 100)
                )}{" "}
                USD
              </span>
              <p className="opacity-70 text-xs font-normal">
                {marketFee}% fee included
              </p>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="uppercase opacity-60">Choose Cryptocurrency</h2>

            <button
              onClick={() => setCurrentMethod("card")}
              type="button"
              className={`flex items-center transition-all justify-between w-full border-2 ${
                currentMethod == "card"
                  ? "border-[#954AFC] bg-[#954AFC0D]"
                  : "border-[#0000001A] bg-[#fff]"
              } rounded-lg px-4 py-2`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`size-10 ${
                    currentMethod == "card" ? "bg-white" : "bg-[#0C08390F]"
                  } rounded-lg shadow border shrink-0 flex items-center justify-center`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18.3337 6.29159C18.3337 6.84159 17.8837 7.29158 17.3337 7.29158H2.66699C2.11699 7.29158 1.66699 6.84159 1.66699 6.29159V6.28325C1.66699 4.37492 3.20866 2.83325 5.11699 2.83325H14.8753C16.7837 2.83325 18.3337 4.38325 18.3337 6.29159Z"
                      fill="#0C0839"
                    />
                    <path
                      d="M1.66699 9.54175V13.7167C1.66699 15.6251 3.20866 17.1667 5.11699 17.1667H14.8753C16.7837 17.1667 18.3337 15.6167 18.3337 13.7084V9.54175C18.3337 8.99175 17.8837 8.54175 17.3337 8.54175H2.66699C2.11699 8.54175 1.66699 8.99175 1.66699 9.54175ZM6.66699 14.3751H5.00033C4.65866 14.3751 4.37533 14.0917 4.37533 13.7501C4.37533 13.4084 4.65866 13.1251 5.00033 13.1251H6.66699C7.00866 13.1251 7.29199 13.4084 7.29199 13.7501C7.29199 14.0917 7.00866 14.3751 6.66699 14.3751ZM12.0837 14.3751H8.75033C8.40866 14.3751 8.12533 14.0917 8.12533 13.7501C8.12533 13.4084 8.40866 13.1251 8.75033 13.1251H12.0837C12.4253 13.1251 12.7087 13.4084 12.7087 13.7501C12.7087 14.0917 12.4253 14.3751 12.0837 14.3751Z"
                      fill="#0C0839"
                    />
                  </svg>
                </div>
                <span className="font-semibold">Card</span>
              </div>
              <div
                className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${
                  currentMethod == "card" ? "border-[#954AFC]" : ""
                }`}
              >
                <div
                  className={`flex size-2 rounded-full shrink-0 ${
                    currentMethod == "card" ? "bg-[#954AFC]" : "bg-white"
                  }`}
                />
              </div>
            </button>

            <button
              onClick={() => setCurrentMethod("USDC")}
              type="button"
              className={`flex items-center transition-all justify-between w-full border-2 ${
                currentMethod == "USDC"
                  ? "border-[#954AFC] bg-[#954AFC0D]"
                  : "border-[#0000001A] bg-[#fff]"
              } rounded-lg px-4 py-2`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`size-10 ${
                    currentMethod == "USDC" ? "bg-white" : "bg-[#0C08390F]"
                  } rounded-lg shadow border shrink-0 flex items-center justify-center`}
                >
                  <Image
                    src={usdt}
                    width={200}
                    height={200}
                    className="rounded-lg max-w-full size-5"
                    alt="Image"
                  />
                </div>
                <span className="font-semibold">USDC</span>
              </div>
              <div
                className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${
                  currentMethod == "USDC" ? "border-[#954AFC]" : ""
                }`}
              >
                <div
                  className={`flex size-2 rounded-full shrink-0 ${
                    currentMethod == "USDC" ? "bg-[#954AFC]" : "bg-white"
                  }`}
                />
              </div>
            </button>

            <button
              onClick={() => setCurrentMethod("BNB")}
              type="button"
              className={`flex items-center transition-all justify-between w-full border-2 ${
                currentMethod == "BNB"
                  ? "border-[#954AFC] bg-[#954AFC0D]"
                  : "border-[#0000001A] bg-[#fff]"
              } rounded-lg px-4 py-2`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`size-10 ${
                    currentMethod == "BNB" ? "bg-white" : "bg-[#0C08390F]"
                  } rounded-lg shadow border shrink-0 flex items-center justify-center`}
                >
                  <Image
                    src={bnb}
                    width={200}
                    height={200}
                    className="rounded-lg max-w-full size-5"
                    alt="Image"
                  />
                </div>
                <span className="font-semibold">BNB</span>
              </div>
              <div
                className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${
                  currentMethod == "BNB" ? "border-[#954AFC]" : ""
                }`}
              >
                <div
                  className={`flex size-2 rounded-full shrink-0 ${
                    currentMethod == "BNB" ? "bg-[#954AFC]" : "bg-white"
                  }`}
                />
              </div>
            </button>
          </div>

          <div className="flex items-center flex-col sm:flex-row justify-between gap-5">
            <button
              onClick={() => setOpen(false)}
              type="button"
              className="text-[#0C0839] w-full whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-semibold border"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleBulkBuyPrimaryShares(currentMethod, cartItems);
              }}
              type="button"
              className="btn_primary_gradient disabled:cursor-not-allowed disabled:opacity-60 text-white w-full whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium"
              disabled={isApprovalLoading || isBulkLoading}
            >
              {isApprovalLoading || isBulkLoading ? (
                <div className="flex justify-center items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                    <span>
                      {isApprovalLoading
                        ? "Approval Pending (1/2)"
                        : `Buying Properties ${
                            currentMethod === "USDC" ? "(2/2)" : ""
                          }`}
                    </span>
                  </div>
                </div>
              ) : (
                " Buy Now"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default BulkCheckout;
