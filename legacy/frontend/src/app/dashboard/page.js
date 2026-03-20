import Layout from "../components/layout";
import Agent from "./agent";
import Carousel from "./carousel";
import FeaturedProperties from "./featuredProperties";
import LeaderBoard from "./leaderBoard";
import PropertyOfTheDay from "./propertyOfTheDay";
import TopStateAgent from "./topStateAgent";

const page = () => {
  return (
    <Layout>
      <div className=" h-full flex flex-col gap-8 w-full">
        <Carousel />
        <FeaturedProperties />
        <LeaderBoard />
        <PropertyOfTheDay />
        <TopStateAgent />
        <Agent />
      </div>
    </Layout>
  );
};

export default page;
