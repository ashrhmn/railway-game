import service from "@/service";
import { endpoints } from "api-interface";
import { useState } from "react";

const getter = service(endpoints.auth.currentUser);

type ICurrentUser = Awaited<ReturnType<typeof getter>>;

export const useCurrentUser = () => {
  const [user, setUser] = useState<undefined | null | ICurrentUser>(undefined);
};
