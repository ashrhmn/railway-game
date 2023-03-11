import { toast } from "react-hot-toast";
import { z } from "zod";
import { shortenString } from "./string.utils";
import { fromZodError } from "zod-validation-error";

export const extractReqError = (reason: unknown) => {
  // console.log("extract-req-error", { reason });
  if (reason instanceof z.ZodError) {
    return fromZodError(reason).toString();
  }
  const schema = z.object({
    response: z.object({ data: z.object({ message: z.string() }) }),
  });
  try {
    return shortenString(schema.parse(reason).response.data.message, 700);
  } catch (err) {
    // console.log("extract-req-error", err);
    if (typeof reason === "string") return reason;
    return "An error occurred";
  }
};

type ISuccesResponse<T> = { status: "SUCCESS"; data: T; error: null };

type IErrorResponse = { status: "ERROR"; error: string; data: null };

export const formatSuccess = <T>(data: T): ISuccesResponse<T> =>
  ({
    status: "SUCCESS",
    data,
    error: null,
  } as const);

export const formatError = (error: unknown): IErrorResponse =>
  ({
    status: "ERROR",
    error: extractReqError(error),
    data: null,
  } as const);

export const handleReqError = (reason: unknown) =>
  toast.error(extractReqError(reason));
