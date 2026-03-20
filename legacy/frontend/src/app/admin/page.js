"use client";
import React from "react";
import Layout from "../components/layout";
import Admin from "./admin";
import { useNfstayContext } from "@/context/NfstayContext";
import Loading from "../loading";
import AccessDenied from "./accessDenied";

const Page = () => {
  const { isAdminWallet, isWalletLoading } = useNfstayContext();

  if (isWalletLoading) {
    return <Loading />;
  }

  if (!isAdminWallet) {
    return <AccessDenied />;
  }

  return (
    <Layout>
      <div className=" h-full flex flex-col gap-8">
        <Admin />
      </div>
    </Layout>
  );
};

export default Page;
