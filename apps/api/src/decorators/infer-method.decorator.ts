import { Delete, Get, Post, Put } from "@nestjs/common";
import { IEndpoint } from "api-interface";

export const InferMethod = <P, Q, R, B>(endpoint: IEndpoint<P, Q, R, B>) => {
  const { method, pattern } = endpoint;
  switch (method) {
    case "GET":
      return Get(pattern);
    case "POST":
      return Post(pattern);
    case "DELETE":
      return Delete(pattern);
    case "PUT":
      return Put(pattern);
    default:
      return Get(pattern);
  }
};
