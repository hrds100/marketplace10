"use client";
import Properties from "./properties";
import Revenue from "./revenue";
import { useEffect, useState } from "react";
import { usenfstayContext } from "@/context/nfstayContext";
import { fetchRewardAndRentEvents } from "@/context/subgraphHelper";
// import StayEarned from "../portfolio/stayEarned";

const Portfolio = () => {
  const { connectedAddress, assetPrices } = usenfstayContext();
  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState([]);
  const [totalRewards, setTotalRewards] = useState(0);

  const getPortfolioData = async (address, stayPrice) => {
    try {
      const _data = await fetchRewardAndRentEvents(
        address.toLowerCase(),
        stayPrice
      );
      setPortfolioData(_data);
      setTotalRewards(_data.reduce((acc, curr) => acc + curr.amount, 0));
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      if (!connectedAddress) {
        setLoading(false);
        return;
      }
      setLoading(true);

      if (assetPrices.stayPrice > 0) {
        await getPortfolioData(connectedAddress, assetPrices.stayPrice);
        setLoading(false);
      }
    };
    loadData();
  }, [connectedAddress, assetPrices]);

  return (
    <div className="w-full">
      <div className="pb-2.5 flex flex-col gap-6 xl:pb-1">
        <div className="flex items-center justify-between gap-5">
          <div className="flex gap-2 flex-col justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
                Portfolio
              </h4>
            </div>
            <p className="opacity-80 text-[#0C0839] 2xl:text-lg">
              Stay updated with the latest news from nfstay!
            </p>
          </div>
        </div>
        <Revenue
          loading={loading}
          data={portfolioData}
          totalRewards={totalRewards}
        />
        <Properties />
      </div>
      {/*  */}
    </div>
  );
};

export default Portfolio;
