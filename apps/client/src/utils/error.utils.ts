import { toast } from "react-hot-toast";
import { z } from "zod";

export const handleReqError = (reason: unknown) => {
  console.log(reason);
  const schema = z.object({
    response: z.object({ data: z.object({ message: z.string() }) }),
  });
  try {
    toast.error(schema.parse(reason).response.data.message);
  } catch (err) {
    toast.error("An error occurred");
  }
};
