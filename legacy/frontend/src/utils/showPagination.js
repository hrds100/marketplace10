

const ShowPagination = ({ totalPagesToShow = 4, totalPages, handlePageChange,currentPage }) => {


    const pageNumbers = [];


    if (totalPages <= totalPagesToShow) {
        // If total pages are less than or equal to total pages to show, show all
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        const halfPageCount = Math.floor(totalPagesToShow / 2);

        // Show the first page, some pages around the current page, and the last page
        if (currentPage <= halfPageCount + 1) {
            // Current page is near the start
            for (let i = 1; i <= totalPagesToShow; i++) {
                pageNumbers.push(i);
            }
            pageNumbers.push("...");
            pageNumbers.push(totalPages);
        } else if (currentPage >= totalPages - halfPageCount) {
            // Current page is near the end
            pageNumbers.push(1);
            pageNumbers.push("...");
            for (let i = totalPages - totalPagesToShow + 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // Current page is in the middle
            pageNumbers.push(1);
            pageNumbers.push("...");
            for (let i = currentPage - halfPageCount; i <= currentPage + halfPageCount; i++) {
                pageNumbers.push(i);
            }
            pageNumbers.push("...");
            pageNumbers.push(totalPages);
        }

    }
    return (
        <div className="flex justify-center mt-4">
            {pageNumbers.map((page, index) => (
                <button
                    key={index}
                    className={`px-4 py-2 mx-1 transition-all rounded-full font-bold 2xl:text-lg ${currentPage === page ? "text-[#954AFC] bg-[#F7F6FF]" : "text-black"
                        }`}
                    onClick={() => handlePageChange(page)}
                    disabled={page === "..."} // Disable ellipsis
                >
                    {page}
                </button>
            ))}
        </div>
    );


}

export default ShowPagination