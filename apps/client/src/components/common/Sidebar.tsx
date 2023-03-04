import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import {
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon,
  HomeIcon,
  MapIcon,
  CircleStackIcon,
  Cog8ToothIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid";
import { clx } from "@/utils/classname.utils";
import { PageProps } from "@/layouts/RootLayout";

const Sidebar = ({
  isSidebarExpanded,
  setIsSidebarExpanded,
  pageProps,
}: {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: Dispatch<SetStateAction<boolean>>;
  pageProps?: PageProps;
}) => {
  return (
    <div className="h-[100vh] text-center transition-all">
      <div className="flex justify-end items-center">
        <button onClick={() => setIsSidebarExpanded((v) => !v)}>
          {isSidebarExpanded ? (
            <ChevronDoubleLeftIcon className="h-6 w-6" />
          ) : (
            <ChevronDoubleRightIcon className="h-6 w-6" />
          )}
        </button>
      </div>
      <div className="flex flex-col justify-center items-center h-[30vh]">
        <UserCircleIcon className="h-12 w-12 md:h-20 md:w-20" />
        <h1 className="text-2xl hidden md:block">
          {pageProps?.user?.username}
        </h1>
        <p className="text-sm hidden md:block text-neutral-800/70">
          {pageProps?.user?.roles.join(" | ")}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-3 p-2">
        <SidebarLinks
          Icon={HomeIcon}
          expanded={isSidebarExpanded}
          text={"Dashboard"}
          href="/"
        />
        <SidebarLinks
          Icon={MapIcon}
          expanded={isSidebarExpanded}
          text={"Map"}
          href="/map"
        />
        <SidebarLinks
          Icon={CircleStackIcon}
          expanded={isSidebarExpanded}
          text={"NFTs"}
          href="/nfts"
        />
        <SidebarLinks
          Icon={Cog8ToothIcon}
          expanded={isSidebarExpanded}
          text={"Settings"}
          href="/settings"
        />
      </div>
    </div>
  );
};

const SidebarLinks = ({
  href,
  text,
  expanded,
  Icon,
}: {
  href: string;
  text: string;
  expanded: boolean;
  Icon: React.ForwardRefExoticComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string | undefined;
      titleId?: string | undefined;
    }
  >;
}) => (
  <Link
    className={clx(
      "flex items-center text-2xl gap-2",
      expanded ? "justify-start" : "justify-center",
    )}
    href={href}
  >
    <Icon className={clx(expanded ? "h-6 w-6" : "h-10 w-10")} title={text} />
    {expanded && <span>{text}</span>}
  </Link>
);

export default Sidebar;
