"use client";
import { useState } from "react";
import Layout from "../components/layout";
import Checkout from "./checkout";

const Page = () => {
  const [isRestricted, setIsRestricted] = useState(true);
  return (
    <>
      <head>
        <script
          rel="preload"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-T7P8W7NJ');`,
          }}
        />
      </head>
      <Layout isRestricted={isRestricted} setIsRestricted={setIsRestricted}>
        <div className=" h-full flex flex-col gap-8">
          <Checkout />
        </div>
      </Layout>
    </>
  );
};

export default Page;
