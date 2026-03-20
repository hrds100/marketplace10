"use client";
import ShowPagination from "@/utils/showPagination";
import { useState } from "react";
import TableForm from "../components/table/table";

const Incinerator = () => {
  const columns = ["#", "Source", "Date", "Amount", "Status"];
  const rows = [
    {
      source: "PancakeSwap",
      date: "12/12/2021",
      amount: "1000",
      status: "Burned",
    },
    {
      source: "PancakeSwap",
      date: "12/12/2021",
      amount: "1000",
      status: "Burned",
    },
    {
      source: "PancakeSwap",
      date: "12/12/2021",
      amount: "1000",
      status: "Burned",
    },
    {
      source: "PancakeSwap",
      date: "12/12/2021",
      amount: "1000",
      status: "Burned",
    },
    {
      source: "PancakeSwap",
      date: "12/12/2021",
      amount: "1000",
      status: "Burned",
    },
  ];
  const itemsPerPage = 4;
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate the total number of pages
  const totalPages = Math.ceil(rows.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return; // Prevent invalid pages
    setCurrentPage(page);
  };

  // Get rows for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = rows.slice(startIndex, startIndex + itemsPerPage);

  const renderRows = () => {
    const cellPercentage = 100 / columns?.length;
    return currentRows.map((row, key) => (
      <tr
        className={`text-[#0C0839] font-bold 2xl:text-lg ${
          key < currentRows.length - 1 ? "border-b-2" : ""
        }`}
        key={key}
      >
        <td className="text-center p-4">{startIndex + key + 1}</td>

        <td className="text-center p-4">{row.source}</td>
        <td className="text-center p-4">{row.date}</td>
        <td className="text-center p-4">${row.amount}</td>
        <td className={`text-center p-4 `}>
          <span
            className={`rounded-full  px-4 py-1.5 w-fit ${
              row.status.toLowerCase() == "burned"
                ? "bg-[#F29B30] text-white"
                : "text-red-400"
            }`}
          >
            {row.status}
          </span>
        </td>
      </tr>
    ));
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg shadow border">
      <div className="flex flex-col md:flex-row gap-6 md:items-center p-4 md:justify-between border-b-2 md:p-8">
        <div className="flex flex-col gap-5">
          <h1 className="text-3xl font-bold 2xl:text-5xl">Incinerator</h1>
          <p className="lg:max-w-sm text-[#0C0839] 2xl:text-lg 2xl:max-w-xl">
            Posuere fringilla et suspendisse sed. Posuere nunc sed eget risus
            sollicitudin nisl. Eu amet nulla aliquet vitae orci. Nulla eget.
          </p>
          <button
            type="button"
            className="px-6 py-2 w-fit bg-[#954AFC] rounded-lg text-white font-medium 2xl:text-lg"
          >
            Check on BscScan
          </button>
        </div>
        <div className="flex items-center p-6 gap-5 border shadow-lg rounded-xl">
          <div className="shrink-0">
            <svg
              width="45"
              height="48"
              viewBox="0 0 51 51"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M45.4864 34.0106C45.4864 48.4287 31.0683 50.2031 31.0683 50.2031H20.3264C20.3264 50.2031 19.6039 50.1713 18.4671 50.0013H18.4564C14.6846 49.4594 6.47144 47.4406 5.62144 40.2262C4.95206 34.5525 7.38519 31.7263 10.4239 27.9331C12.8146 24.9688 11.0614 20.6019 10.9552 20.3363C11.1996 20.4637 15.0989 22.6525 16.0552 24.5119C16.5534 25.4228 16.9524 26.3845 17.2452 27.3806C17.2452 27.3806 16.3314 20.2406 20.0077 15.47C23.6839 10.6994 24.4489 9.2225 24.5233 6.77875C24.37 4.70154 23.8257 2.67199 22.9189 0.796875C25.5165 2.27546 27.798 4.25018 29.6339 6.60875C29.6339 6.60875 30.3458 7.55438 30.6539 8.02188C31.0683 8.61688 31.4083 9.12687 31.7377 9.61563C33.4735 12.4109 34.4445 15.6133 34.5533 18.9019C35.5088 17.9597 36.2547 16.8265 36.7421 15.5763C37.1133 14.1514 37.1964 12.6668 36.9864 11.2094L39.2283 15.0025C41.7464 19.6138 45.4864 27.5506 45.4864 34.0106Z"
                fill="#FF953F"
              />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M35.3297 41.5117C35.1597 48.7474 30.6759 50.203 30.6759 50.203H20.3272C20.3272 50.203 19.6047 50.1711 18.4678 50.0011H18.4572C16.056 48.8536 14.6853 45.7511 14.4941 43.9874C14.3558 43.0589 14.4063 42.1121 14.6428 41.2036C15.0765 39.5582 15.9465 38.0605 17.161 36.8686C20.2635 33.543 22.2503 32.2999 23.0578 28.5599C23.3394 26.946 23.3895 25.3003 23.2066 23.6724C25.1135 24.8831 26.7282 26.5015 27.9347 28.4111C28.8829 29.904 29.408 31.6263 29.4541 33.3942C29.9682 32.8886 30.37 32.2804 30.6334 31.6092C30.8286 30.8351 30.8719 30.0305 30.761 29.2399C30.761 29.2399 35.4572 35.7424 35.3297 41.5117Z"
                fill="#FCAC44"
              />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M31.1384 31.0016C31.2448 31.7236 31.2054 32.4595 31.0226 33.166C30.7826 33.7815 30.4163 34.34 29.9473 34.8054C29.9024 33.1855 29.4228 31.6075 28.5586 30.2366C27.4521 28.4878 25.9725 27.0052 24.2258 25.8953C24.3915 27.3874 24.3453 28.8955 24.0887 30.3748C23.3534 33.8045 21.527 34.9371 18.6933 37.9823C18.3778 38.3003 18.0829 38.6382 17.8104 38.9938C17.0904 39.846 16.5977 40.8665 16.3781 41.9603C16.1612 42.7924 16.1146 43.6597 16.2411 44.5103C16.427 46.2294 17.8518 49.3468 20.3349 50.2021H31.0693C31.0693 50.2021 35.1695 48.875 35.3268 42.2386C35.4479 36.9516 31.1384 31.0016 31.1384 31.0016Z"
                fill="#FCCA6E"
              />
            </svg>
          </div>
          <div className="flex flex-col  items-center">
            <h2 className="font-bold text-2xl 2xl:text-5xl">1.83M</h2>
            <p className="text-[#0C0839] font-medium 2xl:text-xl">
              Tokens burned
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col pb-5">
        <TableForm
          columns={columns}
          rows={renderRows}
          pagination={() =>
            ShowPagination({
              currentPage: currentPage,
              totalPages: totalPages,
              handlePageChange: handlePageChange,
            })
          }
        />
      </div>
    </div>
  );
};

export default Incinerator;
