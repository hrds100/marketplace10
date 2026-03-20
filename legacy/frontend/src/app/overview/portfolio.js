const Portfolio = () => {
  const profit = "+9,512";
  return (
    <div className="flex flex-col gap-4 p-4 py-8 rounded-lg divide-y-2  shadow border">
      <div className="flex font-bold text-xl items-center 2xl:text-2xl  w-full justify-between">
        <h2>Portfolio</h2>
        <h2>USD 146,090</h2>
      </div>
      <div className="flex font-bold text-xl items-center 2xl:text-2xl pt-4 w-full justify-between ">
        <h2>Annual Rental Income:</h2>
        <h2>USD 13,050</h2>
      </div>
      <div className="flex font-bold text-xl items-center 2xl:text-2xl pt-4 w-full justify-between ">
        <h2>Total Profit/Loss:</h2>
        <h2>
          USD
          {profit.includes("+") ? (
            <span className="text-[#F29B30]"> {profit}</span>
          ) : (
            <span className="text-red-400"> {profit}</span>
          )}
        </h2>
      </div>
    </div>
  );
};

export default Portfolio;
