"use client";
import React, { useState } from "react";
import Sidebar from "../sidebar";
import Header from "../header";
import { usePathname } from "next/navigation";

const Layout = ({ children, isRestricted, setIsRestricted }) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <>
      {/* <!-- ===== Page Wrapper Start ===== --> */}
      <div className="flex justify-between w-full">
        {/* <!-- ===== Sidebar Start ===== --> */}
        <Sidebar
          isRestricted={isRestricted}
          setIsRestricted={setIsRestricted}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        {/* <!-- ===== Sidebar End ===== --> */}

        {/* <!-- ===== Content Area Start ===== --> */}
        <div className="relative flex flex-1 flex-col w-full lg:max-w-[calc(100vw-18rem)] ">
          {/* <!-- ===== Header Start ===== --> */}
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isRestricted={isRestricted} />

          {/* <!-- ===== Header End ===== --> */}

          {/* <!-- ===== Main Content Start ===== --> */}
          <main className="w-full  flex flex-col">
            <div
              className={`w-full flex flex-col ${
                pathname.includes("checkout")
                  ? "py-4 md:py-6 2xl:py-10"
                  : "p-4 md:p-6 2xl:p-10"
              }`}
            >
              {children}
            </div>
          </main>
          {/* <!-- ===== Main Content End ===== --> */}
        </div>
        {/* <!-- ===== Content Area End ===== --> */}
      </div>
      {/* <!-- ===== Page Wrapper End ===== --> */}
    </>
  );
};

export default Layout;
