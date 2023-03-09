import React from "react";
import Spinner from "./Spinner";

const FullScreenSpinner = () => {
  return (
    <div className="fixed inset-0 z-50 flex h-[100vh] w-full scale-150 items-center justify-center">
      <Spinner />
    </div>
  );
};

export default FullScreenSpinner;
