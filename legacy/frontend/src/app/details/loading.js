const Loading = ({ width, height, className, rounded }) => {
  return (
    <div
      className={`bg-gray-200 animate-pulse rounded ${className}`}
      style={{ width: width, height: height, borderRadius: rounded }}
    />
  );
};

export default Loading;
