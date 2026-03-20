import Loading from "./loading";

const RecentActivitySkeleton = () => {
  return (
    <div className="flex flex-col gap-5 w-full">
      <Loading width="25%" height="2rem" rounded="100px" />
      <div className="overflow-x-auto w-full">
        <table className="w-full shrink-0 whitespace-nowrap">
          <thead>
            <tr className="animate-pulse">
              <td className="p-4 text-sm 2xl:text-lg text-[#0C0839] flex items-center gap-2">
                <div className="h-5 bg-gray-200 rounded w-full"></div>
              </td>
              <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                <div className="h-5 bg-gray-200 rounded w-full"></div>
              </td>
              <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                <div className="h-5 bg-gray-200 rounded w-full"></div>
              </td>
              <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                <div className="h-5 bg-gray-200 rounded w-full"></div>
              </td>
              <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                <div className="h-5 bg-gray-200 rounded w-full"></div>
              </td>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <tr key={index} className="animate-pulse">
                <td className="p-4 text-sm 2xl:text-lg text-[#0C0839] flex items-center gap-2">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </td>
                <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </td>
                <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </td>
                <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </td>
                <td className="p-4 text-sm text-[#0C0839] 2xl:text-lg">
                  <div className="h-4 bg-gray-300 rounded w-full"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Skeleton = ({ source }) => {
  return (
    <div className="w-full">
      <div className="pb-2.5  flex flex-col w-full gap-6 xl:pb-1">
        <div className="flex items-center w-full justify-between gap-5">
          <div className="flex gap-2 w-full flex-col justify-between">
            <div className="flex items-center w-full gap-2">
              <Loading width="25%" height="2rem" rounded="100px" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[45%_52.5%] gap-6">
          <div className="flex w-full relative rounded-xl overflow-hidden">
            <Loading width="100%" height="420px" />

            <div className="flex items-center justify-between w-full p-4 absolute top-0">
              <div className="w-24 h-8 bg-gray-100 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <Loading width="26%" height="2.5rem" />
            <Loading width="100%" height="3rem" />

            <div className="flex flex-wrap gap-5 w-full  2xl:text-lg">
              <div className="flex items-center flex-1  gap-1">
                <div className="size-6 rounded-full bg-gray-200 animate-pulse" />
                <p className="2xl:text-base  w-full  rounded-full h-4 bg-gray-200 animate-pulse"></p>
              </div>
              <div className="flex items-center flex-1 gap-1">
                <div className="size-6 rounded-full bg-gray-200 animate-pulse" />
                <p className="2xl:text-base  w-full rounded-full h-4 bg-gray-200 animate-pulse"></p>
              </div>
              {source == "marketplace" && (
                <div className="flex items-center flex-1 gap-1">
                  <div className="size-6 rounded-full bg-gray-200 animate-pulse" />
                  <p className="2xl:text-base  w-full rounded-full h-4 bg-gray-200 animate-pulse"></p>
                </div>
              )}
            </div>

            {source == "marketplace" && (
              <div className="flex flex-col gap-1">
                <Loading width="40%" height="1rem" rounded="200px" />
                <Loading
                  width="100%"
                  height="1.2rem"
                  className="rounded-full"
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[45%_52.5%] gap-6">
              <Loading width="100%" height="5.3rem" />
              <Loading width="100%" height="5.3rem" />
              <Loading width="100%" height="5.3rem" />
              <Loading width="100%" height="5.3rem" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[45%_52.5%] gap-6">
          <div className="w-full min-h-[22rem]">
            <Loading width="100%" height="100%" />
          </div>

          {source !== "upcoming" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between w-full flex-wrap gap-3">
                <Loading width="40%" height="1rem" rounded="100px" />
                <Loading width="20%" height="1rem" rounded="100px" />
              </div>
              <div className="flex w-full flex-col gap-3">
                <Loading width="100%" height="2.5rem" />
                <Loading width="20%" height="1rem" rounded="100px" />

                <div className="flex w-full  gap-5">
                  <Loading width="50%" height="10rem" />
                  <Loading width="50%" height="10rem" />
                </div>
                <Loading width="20%" height="1rem" rounded="100px" />
                <Loading width="100%" height="1.5rem" rounded="100px" />
              </div>

              <Loading width="100%" height="3rem" rounded="100px" />
            </div>
          )}
          {source == "upcoming" && <Loading width="100%" height="3rem" />}
        </div>

        {source == "secondary" && <RecentActivitySkeleton />}

        {source === "marketplace" && (
          <>
            <div className="grid grid-cols-1 h-fit md:grid-cols-[68%_30%] gap-5">
              <div className="flex flex-col h-fit pb-4 gap-5 items-center w-full border rounded-lg shadow">
                <div className="w-full border-b-2 p-4">
                  <Loading width="40%" height="1.5rem" rounded="100px" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 p-4 w-full gap-5">
                  <div className="flex flex-col gap-3">
                    <Loading width="30%" height="1rem" rounded="100px" />
                    <Loading width="100%" height="2.5rem" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Loading width="30%" height="1rem" rounded="100px" />
                    <Loading width="100%" height="2.5rem" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Loading width="30%" height="1rem" rounded="100px" />
                    <Loading width="100%" height="2.5rem" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Loading width="30%" height="1rem" rounded="100px" />
                    <Loading width="100%" height="2.5rem" />
                  </div>
                </div>

                <Loading width="95%" height="10rem" />

                <Loading width="60%" height="1.5rem" rounded="200px" />
              </div>
              <div className="flex flex-col gap-5 border rounded-lg shadow">
                <div className="w-full border-b-2 p-4">
                  <Loading width="60%" height="1.5rem" rounded="100px" />
                </div>
                <div className="px-4 gap-5 flex flex-col divide-y-2">
                  <div className="flex flex-col gap-2 ">
                    <Loading width="50%" height="1.5rem" rounded="100px" />
                    <Loading width="70%" height="1rem" rounded="100px" />
                  </div>
                  <div className="flex flex-col gap-2 pt-4">
                    <Loading width="50%" height="1.5rem" rounded="100px" />
                    <Loading width="70%" height="1rem" rounded="100px" />
                  </div>
                  <div className="flex flex-col gap-2 pt-4">
                    <Loading width="50%" height="1.5rem" rounded="100px" />
                    <Loading width="70%" height="1rem" rounded="100px" />
                  </div>
                  <div className="flex flex-col gap-2 pt-4">
                    <Loading width="50%" height="1.5rem" rounded="100px" />
                    <Loading width="70%" height="1rem" rounded="100px" />
                  </div>

                  <div className="py-4">
                    <Loading width="100%" height="2.5rem" rounded="100px" />
                  </div>
                </div>
              </div>
            </div>
            <RecentActivitySkeleton />

            <div className="flex flex-col gap-5">
              <Loading width="30%" height="2rem" rounded="100px" />
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 h-fit">
                <div className="p-4 flex flex-col gap-5 bg-[#F7F6FF] rounded-lg h-fit">
                  <div className="flex pb-3 border-b-2 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-white rounded-lg shadow-lg border flex items-center justify-center">
                        <div className="size-8 rounded bg-gray-200 animate-pulse" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="w-24 h-5 bg-gray-200 animate-pulse" />
                        <div className="w-16 h-4 bg-gray-200 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="w-40 h-4 bg-gray-200 animate-pulse"></p>
                      <div className="size-6 bg-gray-200 animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-5">
                    <div className="flex justify-between text-gray-600">
                      <span className="w-32 h-6 bg-gray-200 animate-pulse" />
                      <span className="w-16 h-5 bg-gray-200 animate-pulse" />
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="w-32 h-6 bg-gray-200 animate-pulse" />
                      <span className="w-16 h-5 bg-gray-200 animate-pulse" />
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="w-32 h-6 bg-gray-200 animate-pulse" />
                      <span className="w-16 h-5 bg-gray-200 animate-pulse" />
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="w-32 h-6 bg-gray-200 animate-pulse" />
                      <span className="w-16 h-5 bg-gray-200 animate-pulse" />
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="w-32 h-6 bg-gray-200 animate-pulse" />
                      <span className="w-16 h-5 bg-gray-200 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-5 bg-[#F7F6FF] rounded-lg h-fit">
                  <div className="flex pb-3 border-b-2 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-white rounded-lg shadow-lg border flex items-center justify-center">
                        <div className="size-8 rounded bg-gray-200 animate-pulse" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="w-24 h-5 bg-gray-200 animate-pulse" />
                        <div className="w-16 h-4 bg-gray-200 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="w-40 h-4 bg-gray-200 animate-pulse"></p>
                      <div className="size-6 bg-gray-200 animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-5">
                    <div className="flex justify-between text-gray-600">
                      <span className="w-32 h-6 bg-gray-200 animate-pulse" />
                      <span className="w-16 h-5 bg-gray-200 animate-pulse" />
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="w-32 h-6 bg-gray-200 animate-pulse" />
                      <span className="w-16 h-5 bg-gray-200 animate-pulse" />
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="w-32 h-6 bg-gray-200 animate-pulse" />
                      <span className="w-16 h-5 bg-gray-200 animate-pulse" />
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="w-32 h-6 bg-gray-200 animate-pulse" />
                      <span className="w-16 h-5 bg-gray-200 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center rounded-lg bg-gray-100 w-full min-h-52">
              <div className="flex items-center flex-col justify-center gap-5 max-w-max ">
                <Loading width="70%" height="2rem" rounded="100px" />
                <div className="flex items-center gap-5 flex-wrap justify-center">
                  <div className="flex items-center gap-2 h-6 w-48 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse" />
                  <div className="flex items-center gap-2 h-6 w-32 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse" />
                  <div className="flex items-center gap-2 h-6 w-52 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse" />
                  <div className="flex items-center gap-2 h-6 w-32 px-3 py-1.5 rounded-full font-semibold bg-gray-300 2xl:text-lg animate-pulse" />
                </div>
              </div>
            </div>
            <div className="flex  w-full items-center p-4 md:p-8 shadow border rounded-lg justify-center">
              <div className="flex w-full justify-center self-center items-center flex-wrap gap-3">
                <Loading width="20%" height="2.5rem" rounded="100px" />
                <Loading width="50%" height="2.5rem" />
                <Loading width="20%" height="2.5rem" rounded="100px" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Skeleton;
