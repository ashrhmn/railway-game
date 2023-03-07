import { clx } from "@/utils/classname.utils";
import { shortenString } from "@/utils/string.utils";
import React from "react";
import toast from "react-hot-toast";

const TextTooltip = ({
  text,
  position,
  limit,
  pre,
}: {
  text: string;
  position?: "LEFT" | "RIGHT" | "BOTTOM";
  limit?: number;
  pre?: boolean;
}) => {
  const copyToClipBoard = () => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied! ${text}`);
  };
  return (
    <span
      onClick={copyToClipBoard}
      className={clx(
        "tooltip",
        position === "LEFT" && "tooltip-left",
        position === "RIGHT" && "tooltip-right",
        position === "BOTTOM" && "tooltip-bottom",
        "cursor-pointer"
      )}
      data-tip={text}
    >
      {pre ? (
        <pre>{shortenString(text, limit || 0)}</pre>
      ) : (
        <span>{shortenString(text, limit || 0)}</span>
      )}
    </span>
  );
};

export default TextTooltip;
