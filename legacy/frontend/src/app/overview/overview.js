import Incinerator from "../farm/incinerator";
import AnalysisCards from "./analysisCards";
import BuyStayWithCard from "./buyStayWithCard";
import BuyStayWithCrypto from "./buyStayWithCrypto";
import Portfolio from "./portfolio";
import StayValueGraph from "./stayValueGraph";

const Overview = () => {
  return (
    <div className="w-full">
      <div className="pb-2.5  flex flex-col gap-6 xl:pb-1">
        <div className="flex items-center justify-between gap-5">
          <div className="flex gap-2 flex-col justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-title-lg font-bold text-black 2xl:text-5xl">
                Overview
              </h4>
            </div>
          </div>
        </div>
        <AnalysisCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <BuyStayWithCard />
          <BuyStayWithCrypto />
        </div>
        <StayValueGraph />
        <Incinerator />
        <Portfolio />
      </div>
    </div>
  );
};

export default Overview;
