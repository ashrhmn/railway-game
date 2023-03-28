import Sidebar from "@/components/common/Sidebar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clx } from "@/utils/classname.utils";
import { ReactNode, useState } from "react";

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
  const { data: currentUser, status } = useCurrentUser();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div>
      {!pageProps?.user && status === "error" && <main>{children}</main>}
      {(!!pageProps?.user || !!currentUser) && (
        <main className="grid grid-cols-12">
          <div
            className={clx(
              isSidebarExpanded ? "col-span-2" : "col-span-2 xs:col-span-1",
              "transition-all",
              "border-r-2"
            )}
          >
            <Sidebar
              setIsSidebarExpanded={setIsSidebarExpanded}
              isSidebarExpanded={isSidebarExpanded}
              pageProps={{
                ...pageProps,
                ...(!!currentUser ? { user: currentUser } : {}),
              }}
            />
          </div>
          <div
            className={clx(
              isSidebarExpanded ? "col-span-10" : "col-span-10 xs:col-span-11",
              "bg-inherit",
              "p-3",
              "overflow-y-auto",
              "h-[100vh]"
            )}
          >
            {children}
          </div>
        </main>
      )}
    </div>
  );
};

export default RootLayout;
