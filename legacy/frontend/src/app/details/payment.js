"use client";
import { useSearchParams } from "next/navigation";
import {
  useImperativeHandle,
  forwardRef,
  useEffect,
  useState,
  useRef,
} from "react";
import Image from "next/image";
import mc from "../images/mc.svg";
import visa from "../images/visa.png";
import ae from "../images/ae.svg";
import dc from "../images/dc.svg";
import t from "../images/t.svg";
import usdc from "../images/usdc.svg";
import bnb from "../images/bnb.webp";
import e from "../images/e.svg";
import b from "../images/b.svg";
import x from "../images/x.svg";
import Modal from "@/utils/modal";
import ModalHeader from "@/utils/modalHeader";
import Congratulations from "./congratulations";
import RockMigration from "../components/rockMigration";
import { usenfstayContext } from "@/context/nfstayContext";
import { CONTRACT_CONFIG } from "@/config";
import {
  NotifyError,
  NotifySuccess,
  getBuyPrimarySharesCalldata,
  getBuySecondarySharesCalldata,
  getErrorMessage,
  getEthFrom,
  getWeiFrom,
} from "@/context/helper";
import { acceptWholeNumbers } from "@/utils/acceptWholeNumbers";
import { Buffer } from "buffer";
import UpdateListing from "./updateListing";
import { Transak } from "@transak/transak-sdk";
import { useKYCContext } from "@/context/KYCModalContext";

// Set Buffer on window only on client side
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

// ---------- NEW: env + endpoints ----------
const TRANSAK_API_KEY = process.env.NEXT_PUBLIC_TRANSAK_API_KEY;
const TRANSAK_CONTRACT_ID = process.env.NEXT_PUBLIC_TRANSAK_CONTRACT_ID;
const CREATE_TX_ID_URL = process.env.NEXT_PUBLIC_TRANSAK_CREATE_TX_PROXY;
// ------------------------------------------

const Payment = forwardRef(
  (
    {
      fetchMarketplaceProperties = () => {},
      property,
      secondaryDetails,
      source,
      amount,
      setAmount,
      listingId,
      fetchSecondarySaleProperties = () => {},
      marketFees,
    },
    ref
  ) => {
    const [message, setMessage] = useState("");
    const [isConfirmPay, setIsConfirmPay] = useState(false);
    const [method, setMethod] = useState("card");
    const [currentStep, setCurrentStep] = useState(0);
    const [open, setOpen] = useState(false);
    const [currentMethod, setCurrentMethod] = useState("USDC");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isRockOpen, setIsRockOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isApproveLoading, setIsApproveLoading] = useState(false);
    const [isCancelLoading, setIsCancelLoading] = useState(false);
    const [isUpdateLoading, setIsUpdateLoading] = useState(false);
    const [buttonLoading, setButtonLoading] = useState(false);
    const [isSamCartOpen, setIsSamCartOpen] = useState(false);
    const [openListing, setOpenListing] = useState(false);

    const inputRef = useRef(null);
    const {
      getPrimaryPropertyRemainingShares,
      connectedAddress,
      getMarketplaceContract,
      getSecondaryListingDetails,
      handleNetwork,
      getValueFromRouter,
      checkForApproval,
      fetchActivityData,
      balanceChecker,
    } = usenfstayContext();
    const { checkUserRegistration } = useKYCContext();
    const searchParams = useSearchParams();

    useEffect(() => {
      const agentAmount = searchParams.get("amount");
      if (agentAmount) {
        setAmount(agentAmount); // Set the amount from the query params if available
      } else {
        source === "marketplace"
          ? setAmount(
              `${
                Number(property.pricePerShare) *
                  Number(property.remainingShares) <
                1000
                  ? Number(property.pricePerShare) *
                    Number(property.remainingShares)
                  : 1000
              }`.toLocaleString()
            )
          : setAmount(
              `${
                Number(secondaryDetails.pricePerShare) *
                Number(secondaryDetails.sharesRemaining)
              }`.toLocaleString()
            );
        // Revert to default value or handle the absence of an amount
      }
    }, [searchParams]);

    const _pricePerShare =
      source === "secondary"
        ? secondaryDetails.pricePerShare
        : property.pricePerShare;
    const shares = Math.floor(Number(amount) / _pricePerShare);
    const costWithoutFee = shares * _pricePerShare;
    const totalCost = costWithoutFee + (costWithoutFee * marketFees) / 100;
    const formattedCost = totalCost.toLocaleString();

    useEffect(() => {
      const input = inputRef.current;

      const preventScroll = (e) => e.preventDefault();

      if (input) {
        input.addEventListener("wheel", preventScroll, { passive: false });
      }

      return () => {
        if (input) {
          input.removeEventListener("wheel", preventScroll);
        }
      };
    }, []);

    useImperativeHandle(ref, () => ({
      scrollToInput: () => {
        inputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        inputRef.current.focus();
      },
      showMessage: (msg) => setMessage(msg),
    }));

    // Prevent background scrolling when iframe sidebar is open
    useEffect(() => {
      if (isSamCartOpen) {
        // Store the current overflow value to restore it later
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        // Cleanup function to restore original overflow
        return () => {
          document.body.style.overflow = originalOverflow;
        };
      } else {
        // Ensure overflow is restored when sidebar is closed
        document.body.style.overflow = "";
      }
    }, [isSamCartOpen]);

    const handlePrimaryShareBuy = async (currentMethod) => {
      try {
        if (property.pricePerShare > costWithoutFee)
          throw new Error("Invalid Amount");
        setIsLoading(true);
        await handleNetwork();
        let _amountWithFee = totalCost;
        let _currency;
        let _value = "0";

        if (currentMethod === "USDC") {
          setIsApproveLoading(true);
          await checkForApproval(
            currentMethod,
            _amountWithFee,
            CONTRACT_CONFIG.rwaMarketplace
          );
          setIsApproveLoading(false);

          _currency = CONTRACT_CONFIG.USDC;
          await balanceChecker(connectedAddress, _amountWithFee, _currency);
        } else {
          _value = await getValueFromRouter(
            CONTRACT_CONFIG.WBNB,
            _amountWithFee
          );

          _currency = CONTRACT_CONFIG.zeroAddress;
          await balanceChecker(
            connectedAddress,
            Number(getEthFrom(_value)),
            _currency
          );
        }

        let contract = getMarketplaceContract(true);
        const storedReferral =
          localStorage.getItem("referral") ?? CONTRACT_CONFIG.zeroAddress;
        await contract.callStatic.buyPrimaryShares(
          connectedAddress,
          _currency,
          property.id,
          getWeiFrom(costWithoutFee.toString()),
          0,
          storedReferral,
          { value: _value }
        );
        const tx = await contract.buyPrimaryShares(
          connectedAddress,
          _currency,
          property.id,
          getWeiFrom(costWithoutFee.toString()),
          0,
          storedReferral,
          { value: _value }
        );

        await tx.wait();

        setOpen(false);
        setAmount("");
        setCurrentMethod("USDC");
        setTimeout(() => {
          setIsSuccess(true);
        }, 800);
        fetchMarketplaceProperties(property.id, false);
        fetchActivityData(source, property.id);
        await checkUserRegistration(connectedAddress);
      } catch (err) {
        console.log(err);
        const _msg = getErrorMessage(err);
        NotifyError(_msg);
      } finally {
        setIsLoading(false);
        setIsApproveLoading(false);
      }
    };

    const handleSecondayShareBuy = async (currentMethod) => {
      try {
        if (secondaryDetails.pricePerShare > costWithoutFee)
          throw new Error("Invalid Amount");
        setIsLoading(true);
        await handleNetwork();
        const _amountWithFee = totalCost;
        let _currency;
        let _value = "0";

        if (currentMethod === "USDC") {
          setIsApproveLoading(true);

          await checkForApproval(
            currentMethod,
            _amountWithFee,
            CONTRACT_CONFIG.rwaMarketplace
          );
          setIsApproveLoading(false);

          _currency = CONTRACT_CONFIG.USDC;
          await balanceChecker(connectedAddress, _amountWithFee, _currency);
        } else {
          _value = await getValueFromRouter(
            CONTRACT_CONFIG.WBNB,
            _amountWithFee
          );

          _currency = CONTRACT_CONFIG.zeroAddress;
          await balanceChecker(connectedAddress, Number(_value), _currency);
        }

        let contract = getMarketplaceContract(true);

        await contract.callStatic.buySecondaryShares(
          connectedAddress,
          _currency,
          listingId,
          getWeiFrom(costWithoutFee.toString()),
          { value: _value }
        );
        const tx = await contract.buySecondaryShares(
          connectedAddress,
          _currency,
          listingId,
          getWeiFrom(costWithoutFee.toString()),

          { value: _value }
        );

        await tx.wait();

        setOpen(false);
        setTimeout(() => {
          setIsSuccess(true);
        }, 800);
        fetchActivityData(source, property.id);
        await checkUserRegistration(connectedAddress);
      } catch (err) {
        console.log(err);
        const _msg = getErrorMessage(err);
        NotifyError(_msg);
      } finally {
        setIsLoading(false);
        setIsApproveLoading(false);
      }
    };

    const handleCancelListing = async () => {
      try {
        if (!connectedAddress) throw new Error("Please connect your wallet");
        setIsCancelLoading(true); // Only set loading for the cancel button
        await handleNetwork();
        const contract = getMarketplaceContract(true);

        await contract.callStatic.cancelSecondarySale(listingId);

        const tx = await contract.cancelSecondarySale(listingId);

        await tx.wait();

        NotifySuccess("Secondary Sale Cancelled");
        fetchSecondarySaleProperties(listingId, false);
      } catch (err) {
        console.log(err);
        const _msg = getErrorMessage(err);
        NotifyError(_msg);
      } finally {
        setIsCancelLoading(false); // Set cancel loading to false when done
      }
    };

    const buyWithCard = async (_amountInUSDC) => {
      try {
        setIsLoading(true);
        const isPrimary = source === "marketplace";

        // 1) Validate amount
        const amountUSDC = Number(_amountInUSDC);
        if (!Number.isFinite(amountUSDC) || amountUSDC <= 0) {
          throw new Error("Invalid USDC amount");
        }

        // 2) Fees (bips)
        const market = getMarketplaceContract();
        const [primaryFeeBipsBN, secondaryFeeBipsBN] =
          await market.getPlaformFee();
        const feeBips = Number(
          isPrimary ? primaryFeeBipsBN : secondaryFeeBipsBN
        );

        // 3) Determine PPS, cap, property/listing ids
        let basePPS, sharesCap, tokenPropertyId;
        if (isPrimary) {
          basePPS = Number(property.pricePerShare);
          tokenPropertyId = String(property.id);
          if (!Number.isFinite(Number(property.remainingShares))) {
            throw new Error("Remaining shares not available for this property");
          }
          sharesCap = Number(property.remainingShares);
        } else {
          const details = await getSecondaryListingDetails(listingId);
          basePPS = Number(details.pricePerShare);
          tokenPropertyId = String(details.propertyId);
          if (!Number.isFinite(Number(details.sharesRemaining))) {
            throw new Error("Remaining shares not available for this listing");
          }
          sharesCap = Number(details.sharesRemaining);
        }
        if (!Number.isFinite(basePPS) || basePPS <= 0)
          throw new Error("Invalid price per share");
        if (sharesCap <= 0) throw new Error("No shares available");

        // 4) PPS incl. fee (preview only)
        const ppsWithFee = basePPS * (1 + feeBips / 10_000);

        // 5) Quantity from entered amount, capped (preview arrays)
        let quantity = Math.floor(amountUSDC / basePPS);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error("Amount is less than the price of one share");
        }
        quantity = Math.min(quantity, sharesCap);

        const tokenID = Array.from({ length: quantity }, () => tokenPropertyId);
        const price = Array.from({ length: quantity }, () =>
          Number(ppsWithFee)
        );

        // 6) Calldata (pass the full entered amount)
        const referral =
          localStorage.getItem("referral") || CONTRACT_CONFIG.zeroAddress;

        let calldata;
        if (isPrimary) {
          // ensure the helper signature matches (recipient, propertyId, usdcAmount, referral)
          calldata = getBuyPrimarySharesCalldata(
            tokenPropertyId,
            amountUSDC,
            referral
          );
        } else {
          // ensure the helper signature matches (recipient, listingId, usdcAmount)
          calldata = getBuySecondarySharesCalldata(listingId, amountUSDC);
        }
        if (!calldata) throw new Error("Failed to build calldata");

        // 7) Preview meta (only for payload; not used in settings)
        const imageURL =
          property?.metadata?.image ||
          "https://www.samco.in/knowledge-center/wp-content/uploads/2024/12/Top-Real-Estate-Shares-to-Watch-in-2025.jpg";
        const nftName =
          property?.metadata?.name || `Property ${tokenPropertyId}`;
        const collectionAddress = CONTRACT_CONFIG.rwa;

        // 8) POST to get nftTransactionId (INCLUDES nftData)
        const payload = {
          calldata,
          cryptoCurrencyCode: "USDC",
          estimatedGasLimit: 400000,
          contractId: TRANSAK_CONTRACT_ID,
          nftData: [
            {
              imageURL,
              nftName,
              collectionAddress,
              tokenID,
              price,
              quantity,
              nftType: "ERC1155",
            },
          ],
        };

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
        const nftTransactionId = data?.id;
        if (!nftTransactionId) throw new Error("No nftTransactionId returned");

        // 9) Launch Transak SDK with nftTransactionId (NO nftData here)
        const settings = {
          apiKey: TRANSAK_API_KEY,
          environment: Transak.ENVIRONMENTS.STAGING,
          nftTransactionId,
          themeColor: "000000",
          defaultPaymentMethod: "credit_debit_card",
          walletAddress: connectedAddress,
          exchangeScreenTitle: isPrimary
            ? "Buy Shares From Primary Market"
            : "Buy Shares From Secondary Market",
          disableWalletAddressForm: true,
          estimatedGasLimit: 400000,
          cryptoCurrencyCode: "USDC",
          isNFT: true,
        };

        const transak = new Transak(settings);
        transak.init();

        Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
          transak.close();
          setIsLoading(false);
        });
      } catch (err) {
        console.error(err);
        NotifyError(err.message || err.reason || "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    const handleClick = async (e) => {
      e.preventDefault(); // Prevent form submission and page refresh
      try {
        if (!connectedAddress) return NotifyError("Please connect your wallet");
        setButtonLoading(true);
        await handleNetwork();

        let limit;
        let data;

        if (source === "marketplace") {
          data = await getPrimaryPropertyRemainingShares(property.id);
          limit = data.remainingShares * property.pricePerShare;
        } else if (source === "secondary") {
          limit =
            secondaryDetails.pricePerShare * secondaryDetails.sharesRemaining;
        }

        if (costWithoutFee > limit)
          return NotifyError(`Can't buy more than $${limit} worth of shares`);

        if (method == "crypto") {
          setOpen(true);
          // setButtonLoading(false);
        } else {
          if (source === "marketplace") setIsSamCartOpen(true);
          else if (source === "secondary") await buyWithCard(costWithoutFee);

          // fetchActivityData(source, property.id);
        }

        // Open SamCart drawer instead of the previous payment flow
        setButtonLoading(false);
      } catch (err) {
        console.log(err);
        setButtonLoading(false);
      }
    };

    // Create SamCart URL with property ID and agent address
    const getSamCartUrl = () => {
      const storedReferral =
        localStorage.getItem("referral") ?? CONTRACT_CONFIG.zeroAddress;
      const phoneNumberData = {
        propertyId: property?.id,
        agentWallet: storedReferral,
        recipient: connectedAddress,
      };

      const encodedPhoneNumber = encodeURIComponent(
        JSON.stringify(phoneNumberData)
      );
      return `https://stay.samcart.com/products/${property?.id}?phone_number=${encodedPhoneNumber}`;
    };

    const handleUpdateListing = async () => {
      setOpenListing(true);
    };

    return (
      <div className="flex flex-col gap-5">
        {secondaryDetails.seller !== connectedAddress ? (
          <>
            <form>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <p className="opacity-70 2xl:text-base">Amount to Invest</p>
                  <p className="opacity-70 2xl:text-base">
                    Price per share ${" "}
                    {source == "secondary"
                      ? secondaryDetails.pricePerShare
                      : property.pricePerShare}
                  </p>
                </div>
                <h2 className="w-full px-4 py-2 rounded-lg border shadow text-lg font-bold 2xl:text-2xl flex items-center ">
                  $
                  <input
                    type="number"
                    ref={inputRef}
                    name="amount"
                    required
                    min={0}
                    value={amount}
                    onChange={(e) => {
                      setAmount(acceptWholeNumbers(e));
                      setMessage("");
                    }}
                    className="w-full border-none focus:ring-0 placeholder:text-black  focus:outline-none "
                    placeholder="0"
                  />
                </h2>
                {message && (
                  <p className="text-sm mt-2 text-red-500">{message}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between ">
                  <h3 className="font-bold text-base 2xl:text-xl">Payment</h3>
                  {/* <p className="font-medium 2xl:text-base">Why low fees with crypto?</p> */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <button
                    onClick={() => setMethod("card")}
                    type="button"
                    className={`flex flex-col flex-1 gap-8 justify-between p-4 border-2 transition-all ${
                      method == "card" ? "border-[#0C0839]" : ""
                    } rounded-xl`}
                  >
                    <div className="flex items-center justify-between gap-5 w-full">
                      <div className="flex items-center gap-1">
                        <Image
                          src={mc}
                          layout="auto"
                          alt="paypal"
                          className="w-10 h-full mix-blend-multiply"
                        />
                        <Image
                          src={visa}
                          layout="auto"
                          alt="paypal"
                          className="w-10 h-full object-cover mix-blend-multiply"
                        />

                        <Image
                          src={ae}
                          layout="auto"
                          alt="paypal"
                          className="w-10 h-full mix-blend-multiply"
                        />
                        <Image
                          src={dc}
                          layout="auto"
                          alt="paypal"
                          className="w-10 h-full mix-blend-multiply"
                        />
                      </div>

                      <div
                        className={`size-5 rounded-full ${
                          method == "card"
                            ? "border-[5px] border-black"
                            : "border-2"
                        } bg-white transition-all`}
                      ></div>
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                      <h3 className="font-bold text-lg">Credit/Debit Card</h3>
                      {/* <p className="opacity-70">
                        + $13.73 in credit/debit card fees
                      </p> */}
                    </div>
                  </button>
                  <button
                    onClick={() => setMethod("crypto")}
                    type="button"
                    className={`flex flex-col flex-1 gap-8 justify-between p-4 border-2 transition-all ${
                      method == "crypto" ? "border-[#0C0839]" : ""
                    } rounded-xl`}
                  >
                    <div className="flex items-center justify-between gap-5 w-full">
                      <div className="flex items-center gap-1">
                        <Image
                          src={t}
                          width={200}
                          height={50}
                          alt="paypal"
                          className="max-w-6 h-full mix-blend-multiply"
                        />
                        <Image
                          src={b}
                          width={200}
                          height={50}
                          alt="paypal"
                          className="max-w-6 h-full mix-blend-multiply"
                        />

                        <Image
                          src={x}
                          width={200}
                          height={50}
                          alt="paypal"
                          className="max-w-6 h-full mix-blend-multiply"
                        />
                        <Image
                          src={e}
                          width={200}
                          height={50}
                          alt="paypal"
                          className="max-w-6 h-full mix-blend-multiply"
                        />
                      </div>

                      <div
                        className={`size-5 rounded-full ${
                          method == "crypto"
                            ? "border-[5px] border-black"
                            : "border-2"
                        } bg-white transition-all`}
                      ></div>
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                      <h3 className="font-bold text-lg">Crypto Currency</h3>
                      <p className="opacity-70">with {marketFees}% fees</p>
                    </div>
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3 my-2">
                <h4 className="text-sm font-bold 2xl:text-lg">Confirm & Pay</h4>
                <div className="flex items-start gap-2 ">
                  <input
                    type="checkbox"
                    onChange={(e) => setIsConfirmPay(e.target.checked)}
                    className="w-5 h-5 border-2  accent-[#954AFC] rounded-md  "
                  />
                  <p className="opacity-70  2xl:text-sm ">
                    By completing this purchase, you agree to our{" "}
                    <a
                      className="underline font-bold"
                      target="_blank"
                      href="https://docs.nfstay.com/legal/token-sales-agreement-rent-2-rent"
                    >
                      Token Sale Agreement (TSA){" "}
                    </a>{" "}
                    and to complete our Know Your Customer (KYC) identification
                    via our partner Sumsub
                    {/* By completing this booking, you agree to the{" "}
                  <span className="underline mx-0.5">Terms and Conditions</span>{" "}
                  and <span className="underline mx-0.5">Privacy Policy</span>{" "}
                  and <span className="underline mx-0.5">House Rules</span>. */}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClick}
                type="button"
                disabled={!isConfirmPay || amount < 10 || buttonLoading}
                className="btn_primary_gradient relative group disabled:opacity-55 disabled:cursor-not-allowed btn_primary_gradient w-full 2xl:text-lg whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium text-white flex items-center gap-2 justify-center"
              >
                Buy Now{" "}
                <svg
                  width="20"
                  height="22"
                  viewBox="0 0 23 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14.1123 3.62082V7.10415H12.7373V3.62082C12.7373 3.37332 12.5173 3.25415 12.3707 3.25415C12.3248 3.25415 12.279 3.26332 12.2332 3.28165L4.964 6.02248C4.47817 6.20582 4.1665 6.66415 4.1665 7.18665V7.80082C3.33234 8.42415 2.7915 9.42332 2.7915 10.5508V7.18665C2.7915 6.09582 3.46067 5.12415 4.47817 4.73915L11.7565 1.98915C11.9582 1.91582 12.169 1.87915 12.3707 1.87915C13.2873 1.87915 14.1123 2.62165 14.1123 3.62082Z"
                    fill="white"
                  />
                  <path
                    d="M20.2083 13.2916V14.2083C20.2083 14.4558 20.0158 14.6574 19.7591 14.6666H18.4208C17.935 14.6666 17.495 14.3091 17.4583 13.8324C17.4308 13.5483 17.5408 13.2824 17.7241 13.0991C17.8891 12.9249 18.1183 12.8333 18.3658 12.8333H19.75C20.0158 12.8424 20.2083 13.0441 20.2083 13.2916Z"
                    fill="white"
                  />
                  <path
                    d="M18.3565 11.8709H19.2915C19.7957 11.8709 20.2082 11.4584 20.2082 10.9542V10.5509C20.2082 8.65341 18.659 7.10425 16.7615 7.10425H6.23817C5.459 7.10425 4.744 7.36091 4.1665 7.80091C3.33234 8.42425 2.7915 9.42341 2.7915 10.5509V16.7201C2.7915 18.6176 4.34067 20.1667 6.23817 20.1667H16.7615C18.659 20.1667 20.2082 18.6176 20.2082 16.7201V16.5459C20.2082 16.0417 19.7957 15.6292 19.2915 15.6292H18.494C17.614 15.6292 16.7707 15.0884 16.5415 14.2359C16.349 13.5392 16.5782 12.8701 17.0365 12.4209C17.3757 12.0726 17.8432 11.8709 18.3565 11.8709ZM13.3332 11.6876H6.9165C6.54067 11.6876 6.229 11.3759 6.229 11.0001C6.229 10.6242 6.54067 10.3126 6.9165 10.3126H13.3332C13.709 10.3126 14.0207 10.6242 14.0207 11.0001C14.0207 11.3759 13.709 11.6876 13.3332 11.6876Z"
                    fill="white"
                  />
                </svg>
                {amount == 0 && (
                  <span className="invisible absolute z-[9999] bg-[#555555bd] p-2 px-3 group-hover:visible group-hover:opacity-100 !-translate-x-1/2 !right-0 !translate-y-10">
                    Please, choose an amount to invest above
                  </span>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleUpdateListing}
              type="button"
              className="btn_primary_gradient flex-1 2xl:text-lg disabled:opacity-60 whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium text-white flex items-center gap-2 justify-center"
              disabled={isCancelLoading} // Disable the button when loading
            >
              Update Listing
            </button>

            <button
              disabled={isCancelLoading || isUpdateLoading} // Disable cancel when either button is loading
              onClick={handleCancelListing}
              type="button"
              className="flex-1 2xl:text-lg whitespace-nowrap disabled:opacity-60 px-5 py-2.5 rounded-full h-fit font-medium text-white flex items-center gap-2 justify-center bg-red-600"
            >
              {isCancelLoading && !isUpdateLoading ? (
                <div className="w-7 h-7 border-4 border-t-[4px] border-t-[#3d4a6c] rounded-full animate-spin"></div>
              ) : (
                "Cancel Listing"
              )}
            </button>
          </div>
        )}

        {method == "crypto" && (
          <Modal
            open={open}
            handleClose={() => {
              setOpen(false);
              setButtonLoading(false);
            }}
          >
            <div className="flex flex-col w-full p-4 gap-5 ">
              <ModalHeader
                title={"Complete Checkout"}
                handleClose={() => {
                  setOpen(false);
                  setButtonLoading(false);
                }}
              />

              <div className="flex flex-col gap-3 overflow-y-auto max-h-[85vh] isolate relative">
                <h2 className="uppercase opacity-60">Item</h2>
                <div className="flex flex-col gap-3 ">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0C0839] bg-opacity-5">
                    <div className="sm:size-[3.5rem] sm:shrink-0">
                      <Image
                        src={property.metadata.image}
                        width={200}
                        height={200}
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
                      <div className="flex flex-col gap-1">
                        <h3 className="font-semibold text-lg   group/title cursor-default">
                          {currentMethod !== "ROCKS" && `$${formattedCost}`}
                          <span className="invisible absolute  text-[10px] z-[9999] bg-[#9191919f] p-2 px-3 right-0 top-5 -translate-y-5 transition-all  opacity-0 group-hover/title:visible group-hover/title:opacity-100 ">
                            A 2.5% platform fee is charged on all purchases of
                            property shares
                          </span>
                        </h3>
                        <p className="flex items-center gap-1  opacity-60">
                          {/* ({property.bnb} BNB) */}{" "}
                          {currentMethod !== "ROCKS" && currentMethod}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="uppercase opacity-60">Choose Cryptocurrency</h2>

                <button
                  disabled={isLoading}
                  onClick={() => setCurrentMethod("USDC")}
                  type="button"
                  className={`flex items-center transition-all justify-between w-full border-2 ${
                    currentMethod.toLocaleLowerCase() == "usdc"
                      ? "border-[#954AFC] bg-[#954AFC0D]"
                      : "border-[#0000001A] bg-[#fff]"
                  } rounded-lg px-4 py-2`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`size-10 ${
                        currentMethod.toLocaleLowerCase() == "usdc"
                          ? "bg-white"
                          : "bg-[#0C08390F]"
                      } rounded-lg shadow border shrink-0 flex items-center justify-center`}
                    >
                      <Image
                        src={usdc}
                        width={200}
                        height={200}
                        className="rounded-lg   max-w-full size-5"
                        alt={"Image"}
                      />
                    </div>
                    <span className="font-semibold">USDC</span>
                  </div>
                  <div
                    className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${
                      currentMethod.toLocaleLowerCase() == "usdc"
                        ? "border-[#954AFC]"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex size-2 rounded-full shrink-0 ${
                        currentMethod.toLocaleLowerCase() == "usdc"
                          ? "bg-[#954AFC]"
                          : "bg-white"
                      }`}
                    ></div>
                  </div>
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => setCurrentMethod("BNB")}
                  type="button"
                  className={`flex items-center transition-all disabled:cursor-not-allowed justify-between w-full border-2 ${
                    currentMethod.toLocaleLowerCase() == "bnb"
                      ? "border-[#954AFC] bg-[#954AFC0D]"
                      : "border-[#0000001A] bg-[#fff]"
                  } rounded-lg px-4 py-2`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`size-10 ${
                        currentMethod.toLocaleLowerCase() == "bnb"
                          ? "bg-white"
                          : "bg-[#0C08390F]"
                      } rounded-lg shadow border shrink-0 flex items-center justify-center`}
                    >
                      <Image
                        src={bnb}
                        width={200}
                        height={200}
                        className="rounded-lg   max-w-full size-5"
                        alt={"Image"}
                      />
                    </div>
                    <span className="font-semibold">BNB</span>
                  </div>
                  <div
                    className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${
                      currentMethod.toLocaleLowerCase() == "bnb"
                        ? "border-[#954AFC]"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex size-2 rounded-full shrink-0 ${
                        currentMethod.toLocaleLowerCase() == "bnb"
                          ? "bg-[#954AFC]"
                          : "bg-white"
                      }`}
                    ></div>
                  </div>
                </button>
                {/* {!pathname.includes("secondary") && (
                  <button
                    disabled={isLoading}
                    onClick={() => {
                      setCurrentMethod("ROCKS");
                    }}
                    type="button"
                    className={`flex items-center transition-all disabled:cursor-not-allowed justify-between w-full border-2 ${
                      currentMethod.toLocaleLowerCase() == "rocks"
                        ? "border-[#954AFC] bg-[#954AFC0D]"
                        : "border-[#0000001A] bg-[#fff]"
                    } rounded-lg px-4 py-2`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`size-10 ${
                          currentMethod.toLocaleLowerCase() == "rocks"
                            ? "bg-white"
                            : "bg-[#0C08390F]"
                        } rounded-lg shadow border shrink-0 flex items-center justify-center`}
                      >
                        <Image
                          src={rocks}
                          width={200}
                          height={200}
                          className="rounded-lg   max-w-full size-5"
                          alt={"Image"}
                        />
                      </div>
                      <span className="font-semibold">ROCKS</span>
                    </div>
                    <div
                      className={`flex items-center justify-center size-4 border-2 shrink-0 p-2 rounded-full ${
                        currentMethod.toLocaleLowerCase() == "rocks"
                          ? "border-[#954AFC]"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex size-2 rounded-full shrink-0 ${
                          currentMethod.toLocaleLowerCase() == "rocks"
                            ? "bg-[#954AFC]"
                            : "bg-white"
                        }`}
                      ></div>
                    </div>
                  </button>
                )} */}
              </div>

              <div className="flex  items-center flex-col sm:flex-row justify-between gap-5">
                <button
                  onClick={() => {
                    setOpen(false);
                    setButtonLoading(false);
                  }}
                  type="button"
                  className="text-[#0C0839] w-full whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-semibold border"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    if (currentMethod === "ROCKS") {
                      setIsRockOpen(true);
                    } else {
                      if (source === "secondary") {
                        handleSecondayShareBuy(currentMethod);
                      } else if (source === "marketplace") {
                        handlePrimaryShareBuy(currentMethod);
                      }
                    }
                  }}
                  type="button"
                  disabled={isLoading}
                  className="btn_primary_gradient disabled:opacity-60 text-white w-full disabled:cursor-not-allowed whitespace-nowrap px-5 py-2.5 rounded-full h-fit font-medium flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-4 border-t-[#3d4a6c] rounded-full animate-spin"></div>
                      <span>
                        {isApproveLoading
                          ? "Approval pending (1/2)"
                          : `Buying property ${
                              currentMethod === "USDC" ? "(2/2)" : ""
                            } `}
                      </span>
                    </div>
                  ) : (
                    "Buy Now"
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
        <Congratulations
          open={isSuccess}
          handleClose={() => {
            setIsSuccess(false);
            fetchSecondarySaleProperties(listingId, false);
            setCurrentStep(0);
            setAmount("");
            setCurrentMethod("USDC");
          }}
        />
        <RockMigration
          fetchActivityData={fetchActivityData}
          fetchMarketplaceProperties={fetchMarketplaceProperties}
          setCurrentMethod={setCurrentMethod}
          marketFees={marketFees}
          setOpen={setOpen}
          setAmount={setAmount}
          open={isRockOpen}
          property={property}
          setCurrentStep={setCurrentStep}
          currentStep={currentStep}
          handleClose={() => {
            setIsRockOpen(false);
            setCurrentStep(0);
          }}
        />
        <UpdateListing
          fetchSecondarySaleProperties={fetchSecondarySaleProperties}
          open={openListing}
          listingId={listingId}
          handleClose={() => setOpenListing(false)}
          setIsUpdateLoading={setIsUpdateLoading}
          isUpdateLoading={isUpdateLoading}
          secondaryDetails={secondaryDetails}
          property={property}
        />

        {/* SamCart Drawer */}
        {isSamCartOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ease-in-out"></div>
        )}
        <div
          className={`fixed right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
            isSamCartOpen ? "translate-x-0" : "translate-x-full"
          } z-50`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Complete Purchase</h2>
            <button
              type="button"
              onClick={() => setIsSamCartOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Iframe Content */}
          {isSamCartOpen && (
            <div className="h-[calc(100vh-80px)] w-full samcart-iframe-container">
              <iframe
                src={getSamCartUrl()}
                className="w-full h-full border-0 samcart-iframe"
                title="SamCart Checkout"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

Payment.displayName = "Payment";

export default Payment;
