import { ZodType, z, coerce } from "zod";

const defaultConfig = {
  paramSchema: z.object({}),
  bodySchema: z.object({}),
  responseSchema: z.object({}),
  querySchema: z.object({}),
  method: "GET",
} as const;

export type IEndpoint<P, Q, R, B> = {
  pattern: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  paramSchema: z.ZodSchema<P>;
  responseSchema: z.ZodSchema<R>;
  bodySchema: z.ZodSchema<B>;
  querySchema: z.ZodSchema<Q>;
};

type PickSchemaType<IEndpoint, key> = key extends keyof IEndpoint
  ? IEndpoint[key] extends ZodType<any, any, any>
  ? z.infer<IEndpoint[key]>
  : never
  : never;

export type InferInputs<IEndpoint> = {
  param: PickSchemaType<IEndpoint, "paramSchema">;
  query: PickSchemaType<IEndpoint, "querySchema">;
  body: PickSchemaType<IEndpoint, "bodySchema">;
};

export type InferOutputs<IEndpoint> = PickSchemaType<
  IEndpoint,
  "responseSchema"
>;
export type InferOutputsPromise<IEndpoint> = Promise<InferOutputs<IEndpoint>>;

const NFTResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  image: z.string(),
  isFrozen: z.boolean(),
  owner: z.string().nullable(),
  nftMetadata: z.array(
    z.object({
      type: z.string(),
      value: z.string(),
    }),
  ),
});

const SkipTakeSchema = z.object({
  skip: z.coerce.number().optional().default(0),
  take: z.coerce.number().optional().default(10),
});

export const endpoints = {
  auth: {
    login: {
      ...defaultConfig,
      pattern: "auth/login",
      method: "POST",
      bodySchema: z.object({ username: z.string(), password: z.string() }),
      responseSchema: z.object({
        access_token: z.string(),
        refresh_token: z.string(),
      }),
    },
    signup: {
      ...defaultConfig,
      pattern: "auth/signup",
      method: "POST",
      bodySchema: z.object({
        username: z.string(),
        password: z.string(),
        confirmPassword: z.string(),
      }),
      responseSchema: z.string(),
    },
    currentUser: {
      ...defaultConfig,
      pattern: "auth/current-user",
      responseSchema: z.object({
        username: z.string(),
        roles: z.array(z.string()),
      }),
    },
    logout: {
      ...defaultConfig,
      pattern: "auth/logout",
      responseSchema: z.void(),
    },
    refreshToken: {
      ...defaultConfig,
      pattern: "auth/refresh-token",
      responseSchema: z.object({
        access_token: z.string(),
        refresh_token: z.string(),
      }),
    },
  },
  nft: {
    getAllNfts: {
      ...defaultConfig,
      pattern: "nfts",
      responseSchema: NFTResponseSchema.array(),
      querySchema: SkipTakeSchema,
    },
    getNft: {
      ...defaultConfig,
      pattern: "nfts/:id",
      paramSchema: z.object({ id: z.string() }),
      responseSchema: NFTResponseSchema,
    },
  },
  map: {
    getColors: {
      ...defaultConfig,
      pattern: "map/colors",
      responseSchema: z.string().array(),
    },
  },
} as const;
