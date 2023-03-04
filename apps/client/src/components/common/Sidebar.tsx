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
  PuzzlePieceIcon,
  ArrowLeftOnRectangleIcon,
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
    <div className="relative h-[100vh] text-center transition-all">
      <div className="flex items-center justify-end">
        <button onClick={() => setIsSidebarExpanded((v) => !v)}>
          {isSidebarExpanded ? (
            <ChevronDoubleLeftIcon className="h-6 w-6" />
          ) : (
            <ChevronDoubleRightIcon className="h-6 w-6" />
          )}
        </button>
      </div>
      <div className="flex h-[30vh] flex-col items-center justify-center">
        <UserCircleIcon className="h-12 w-12 md:h-20 md:w-20" />
        <h1 className="hidden text-2xl md:block">
          {pageProps?.user?.username}
        </h1>
        <p className="hidden text-sm text-neutral-800/70 md:block">
          {pageProps?.user?.roles.join(" | ")}
        </p>
      </div>
      <div className="flex flex-col justify-center gap-4 p-2">
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
          Icon={PuzzlePieceIcon}
          expanded={isSidebarExpanded}
          text={"Games"}
          href="/games"
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

      <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center">
        <Link
          href={`/api/auth/logout`}
          className="flex items-center gap-2 rounded p-1 text-neutral-700/80 transition-colors hover:bg-red-600 hover:text-white"
        >
          <ArrowLeftOnRectangleIcon className="h-6 w-6" />
          {isSidebarExpanded && (
            <span className="hidden md:inline">Logout</span>
          )}
        </Link>
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
      "flex items-center gap-2 text-2xl",
      expanded ? "justify-center md:justify-start" : "justify-center"
    )}
    href={href}
  >
    <Icon
      className={clx(expanded ? "h-10 w-10 md:h-6 md:w-6" : "h-10 w-10")}
      title={text}
    />
    {expanded && <span className="hidden md:block">{text}</span>}
  </Link>
);

export default Sidebar;
