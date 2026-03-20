const Card = ({ icon, title, subTitle }) => {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg shadow-1 border">
      <div className="w-10 h-10 rounded-full shadow-1 border flex items-center justify-center">
        {icon}
      </div>
      <h1 className="text-3xl font-bold 2xl:text-4xl">{title}</h1>
      <p className="text-[#0C0839] 2xl:text-lg font-medium">{subTitle}</p>
    </div>
  );
};

export default Card;
