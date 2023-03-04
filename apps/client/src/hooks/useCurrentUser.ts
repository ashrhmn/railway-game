import service from "@/service";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "api-interface";

const getter = service(endpoints.auth.currentUser);

export const useCurrentUser = () =>
  useQuery({
    queryKey: ["current-user"],
    queryFn: () => getter({}),
    retry: false,
  });
