"use client";
import Layout from "../components/layout";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Skeleton from "../details/skeleton";

const Marketplace = dynamic(() => import("./marketplace"), {
  ssr: false,
  loading: () => <Skeleton source="marketplace" />,
});
const MarketplacePage = dynamic(() => import("./marketplacePage"), {
  ssr: false,
  loading: () => <Skeleton source="marketplace" />,
});

const Page = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [isRestricted, setIsRestricted] = useState(false);

  return (
    <Layout isRestricted={isRestricted} setIsRestricted={setIsRestricted}>
      <div className=" h-full flex flex-col gap-8">
        {id ? (
          <MarketplacePage setIsRestricted={setIsRestricted} />
        ) : (
          <Marketplace />
        )}
      </div>
    </Layout>
  );
};

export default Page;
