const GradientBtn = ({
  text,
  handleClick,
  disabled= false,
  width = "a-fit",
  size = "",
  radius = "rounded-full",
}) => {
  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (handleClick) {
      handleClick(e);
    }
  };

  return (
    <button
      onClick={handleButtonClick}
      disabled={disabled}
      className={`${width} ${size} border btn_primary_gradient disabled:cursor-not-allowed disabled:opacity-60 2xl:text-lg whitespace-nowrap ${radius} px-6 py-1.5 font-medium text-white`}
    >
      {text}
    </button>
  );
};

export default GradientBtn;
