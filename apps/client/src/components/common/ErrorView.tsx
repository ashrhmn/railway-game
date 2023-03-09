import { extractReqError } from "@/utils/error.utils";
import React from "react";

const ErrorView = ({ error }: { error: unknown }) => {
  return (
    <div className="mt-[30%] w-full text-center text-error">
      <div className="mx-auto my-8 flex h-16 w-16 scale-150 items-center justify-center rounded-full border-2 border-error text-5xl">
        !
      </div>
      <h1 className="text-4xl">{extractReqError(error)}</h1>
      {extractReqError(error) === "Forbidden resource" && (
        <h2 className="mt-4">You are not authorized to view this resource</h2>
      )}
    </div>
  );
};

export default ErrorView;
