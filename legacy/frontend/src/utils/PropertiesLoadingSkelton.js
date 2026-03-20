import PropertySkelton from "./propertySkelton";

const PropertiesLoadingSkelton = ({ numbers = 3, source }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-full gap-5 h-fit">
      {Array.from({ length: numbers }, (_, index) => (
        <PropertySkelton source={source} key={index} />
      ))}
    </div>
  );
};

export default PropertiesLoadingSkelton;
