import { toast } from "react-hot-toast";
import { z } from "zod";
import { shortenString } from "./string.utils";
import { fromZodError } from "zod-validation-error";

export const handleReqError = (reason: unknown) => {
  if (reason instanceof z.ZodError) {
    toast.error(fromZodError(reason).toString());
    return;
  }
  const schema = z.object({
    response: z.object({ data: z.object({ message: z.string() }) }),
  });
  try {
    toast.error(shortenString(schema.parse(reason).response.data.message, 700));
  } catch (err) {
    console.log("handle-req-error", err);
    toast.error("An error occurred");
  }
};
