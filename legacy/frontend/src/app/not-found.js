"use client";
import { ArrowLeftOutlined, BulbTwoTone } from "@ant-design/icons";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-500">
      <div className="text-center space-y-6 p-8 bg-white rounded-lg shadow-2xl max-w-md w-full">
        <h1 className="text-4xl font-bold text-purple-700">404</h1>
        <h2 className="text-2xl font-semibold text-purple-600">
          Oops! Page Not Found
        </h2>
        <p className="text-gray-600">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <button
          onClick={() => router.back()}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        >
          <ArrowLeftOutlined className="mr-2 h-4 w-4" /> Go Back
        </button>
      </div>
    </div>
  );
}
