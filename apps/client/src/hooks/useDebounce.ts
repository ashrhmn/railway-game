import React from "react";
import useTimeout from "./useTimeout";

const useDebounce = (
  callack: any,
  delay: number | undefined,
  dependencies: any
) => {
  const { clear, reset } = useTimeout(callack, delay);
  React.useEffect(reset, [...dependencies, reset]);
  React.useEffect(clear, [clear]);
};

export default useDebounce;
