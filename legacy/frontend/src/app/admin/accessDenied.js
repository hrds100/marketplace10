import { useNfstayContext } from "@/context/NfstayContext";
import { shortenWalletAddress } from "@/context/helper";
import Link from "next/link";
import { FiAlertCircle } from "react-icons/fi";

export default function AccessDenied() {
  const { connectedAddress } = useNfstayContext();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white shadow-lg rounded-xl">
        <div className="text-center">
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your admin can access this page.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {connectedAddress
              ? `Connected Wallet: ${shortenWalletAddress(connectedAddress)}`
              : "Wallet Not Connected"}
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            href="/dashboard"
            className="btn_primary_gradient p-3 rounded-full px-6 text-white"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
