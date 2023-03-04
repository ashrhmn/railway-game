import Sidebar from "@/components/common/Sidebar";
import { clx } from "@/utils/classname.utils";
import { ReactNode, useState } from "react";
import { Toaster } from "react-hot-toast";

export type PageProps = {
  user?: { username: string; roles: string[] };
};

const RootLayout = ({
  children,
  pageProps,
}: {
  children: ReactNode;
  pageProps?: PageProps;
}) => {
  console.log({ pageProps });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  return (
    <>
      {!pageProps?.user && <main>{children}</main>}
      {!!pageProps?.user && (
        <main className="grid grid-cols-12">
          <div
            className={clx(
              isSidebarExpanded ? "col-span-2" : "col-span-2 xs:col-span-1",
            )}
          >
            <Sidebar
              setIsSidebarExpanded={setIsSidebarExpanded}
              isSidebarExpanded={isSidebarExpanded}
              pageProps={pageProps}
            />
          </div>
          <div
            className={clx(
              isSidebarExpanded ? "col-span-10" : "col-span-10 xs:col-span-11",
              "bg-neutral-100",
            )}
          >
            {children}
          </div>
        </main>
      )}
      <Toaster position="bottom-right" />
    </>
  );
};

export default RootLayout;
