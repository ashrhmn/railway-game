import { ZodType, z } from "zod";
import { getAddress } from "ethers/lib/utils";

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

const ValidAddressSchema = <S>(schema: ZodType<S>) =>
  z.string().transform((v, c) => {
    try {
      if (!v) return schema.parse(v);
      return getAddress(v);
    } catch (error) {
      c.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid address",
      });
      return z.NEVER;
    }
  });

const NFTResponseSchema = z
  .object({
    id: z.string(),
    tokenId: z.number(),
    name: z.string(),
    description: z.string(),
    image: z.string(),
    frozenTill: z.number(),
    owner: z.string().nullable(),
    color: z.string(),
    level: z.number(),
    abilityB: z.number(),
    abilityL: z.number(),
    abilityR: z.number(),
    abilityK: z.number(),
    job: z.string(),
    metadata: z.array(z.any()),
  })
  .passthrough();

const SkipTakeSchema = z.object({
  skip: z.coerce.number().optional().default(0),
  take: z.coerce.number().optional().default(100),
});

export const endpoints = {
  auth: {
    login: {
      // login route
      ...defaultConfig,
      pattern: "auth/login",
      method: "POST",
      bodySchema: z.object({ username: z.string(), password: z.string() }),
      responseSchema: z.object({
        access_token: z.string(),
        refresh_token: z.string(),
      }),
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
      responseSchema: z.object({
        data: NFTResponseSchema.array(),
        count: z.number(),
      }),
      querySchema: SkipTakeSchema.and(
        z.object({
          gameId: z.string().optional(),
          color: z.string().optional(),
          level: z.coerce.number().optional(),
          owner: z.string().optional(),
          abilityB: z.coerce.number().optional(),
          abilityL: z.coerce.number().optional(),
          abilityR: z.coerce.number().optional(),
          abilityK: z.coerce.number().optional(),
        }),
      ),
    },
    getNft: {
      ...defaultConfig,
      pattern: "nfts/:id",
      paramSchema: z.object({ id: z.string() }),
      responseSchema: NFTResponseSchema,
    },
    deleteAllNfts: {
      ...defaultConfig,
      pattern: "nfts/:game_id",
      method: "DELETE",
      responseSchema: z.string(),
      paramSchema: z.object({ game_id: z.string() }),
    },
    randomizeFixTokenId: {
      ...defaultConfig,
      pattern: "nfts/randomize-fix-token-id",
      method: "POST",
      responseSchema: z.string(),
      bodySchema: z.object({
        gameId: z.string(),
      }),
    },
  },
  map: {
    getColors: {
      ...defaultConfig,
      pattern: "map/colors",
      responseSchema: z.string().array(),
    },
    getMapItems: {
      ...defaultConfig,
      pattern: "map/items",
      responseSchema: z.string().array(),
    },
    getNftJobs: {
      ...defaultConfig,
      pattern: "map/nft-jobs",
      responseSchema: z.string().array(),
    },
    getPositions: {
      ...defaultConfig,
      pattern: "map/positions",
      responseSchema: z
        .object({
          id: z.string(),
          x: z.number().min(0).max(14),
          y: z.number().min(0).max(14),
          color: z.string(),
          mapItem: z.string().nullable(),
          prePlaced: z.string().nullable(),
          gameId: z.string(),
          isRevealed: z.boolean(),
          nft: NFTResponseSchema.nullable(),
          checkPointPassed: z.boolean(),
          bridgeConstructedOn: z.number(),
          railConstructedOn: z.number(),
          enemy: z
            .object({
              id: z.string(),
              name: z.string(),
              strength: z.number(),
              currentStrength: z.number(),
              _count: z.object({ positions: z.number() }),
            })
            .nullable(),
        })
        .passthrough()
        .array(),
      querySchema: z
        .object({
          gameId: z.string(),
          color: z.string(),
        })
        .and(SkipTakeSchema),
    },
    assignItemToPosition: {
      ...defaultConfig,
      pattern: "map/assign-item-to-position",
      method: "POST",
      bodySchema: z.object({
        x: z.number().min(0).max(14),
        y: z.number().min(0).max(14),
        color: z.string(),
        mapItem: z.string().optional(),
        prePlaced: z.string().optional(),
        gameId: z.string(),
      }),
      responseSchema: z.string(),
    },
    removeItem: {
      ...defaultConfig,
      pattern: "map/remove-item/:id",
      method: "DELETE",
      paramSchema: z.object({ id: z.string() }),
      responseSchema: z.string(),
    },
    assignEnemyToPosition: {
      ...defaultConfig,
      pattern: "map/assign-enemy",
      method: "POST",
      bodySchema: z.object({
        x: z.number().min(0).max(14),
        y: z.number().min(0).max(14),
        color: z.string(),
        gameId: z.string(),
        strength: z.coerce.number().min(1),
        name: z.string().min(1),
      }),
      responseSchema: z.string(),
    },
    expandEnemySize: {
      ...defaultConfig,
      pattern: "map/expand-enemy-size",
      method: "POST",
      bodySchema: z.object({
        direction: z.enum(["TL", "TR", "BL", "BR", "L", "R"]),
        enemyId: z.string(),
      }),
      responseSchema: z.string(),
    },
    placeNftOnMap: {
      ...defaultConfig,
      pattern: "map/place-nft",
      method: "POST",
      bodySchema: z.object({
        x: z.number().min(0).max(14),
        y: z.number().min(0).max(14),
        color: z.string(),
        gameId: z.string(),
        nftId: z.string(),
        walletAddress: z.string(),
        additionalLightUpPositions: z
          .object({
            x: z.number().min(0).max(14),
            y: z.number().min(0).max(14),
          })
          .array()
          .optional(),
      }),
      responseSchema: z.string(),
    },
    updateRailLocation: {
      ...defaultConfig,
      pattern: "map/update-rail-location",
      method: "POST",
      bodySchema: z.object({
        x: z.number().min(0).max(14),
        y: z.number().min(0).max(14),
        color: z.string(),
        gameId: z.string(),
      }),
      responseSchema: z.string(),
    },
  },
  game: {
    getAll: {
      ...defaultConfig,
      pattern: "games",
      responseSchema: z
        .object({
          id: z.string(),
          name: z.string(),
          contractAddress: z.string().nullable(),
          chainId: z.number().nullable(),
          status: z.string(),
        })
        .passthrough()
        .array(),
      querySchema: SkipTakeSchema,
    },
    createGame: {
      ...defaultConfig,
      pattern: "games",
      method: "POST",
      bodySchema: z.object({
        name: z.string().min(3, "Name too short").max(20, "Name too long"),
        contractAddress: ValidAddressSchema(z.string().optional()),
        chainId: z.coerce.number().optional(),
      }),
      responseSchema: z.string(),
    },
    updateGame: {
      ...defaultConfig,
      pattern: "games/:id",
      method: "PUT",
      bodySchema: z.object({
        name: z.string().min(3, "Name too short").max(20, "Name too long"),
        contractAddress: ValidAddressSchema(z.string().optional()),
        status: z
          .string()
          .optional()
          .or(z.literal(""))
          .transform((v) => (!!v ? v : undefined)),
        chainId: z.coerce.number().optional(),
      }),
      paramSchema: z.object({ id: z.string() }),
      responseSchema: z.string(),
    },
    getAllStatus: {
      ...defaultConfig,
      pattern: "games/status",
      responseSchema: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .array(),
    },
    getCurrentRailPosition: {
      ...defaultConfig,
      pattern: "games/rail-position",
      responseSchema: z
        .object({
          x: z.number().min(0).max(14),
          y: z.number().min(0).max(14),
        })
        .passthrough(),
      querySchema: z.object({ color: z.string(), gameId: z.string() }),
    },
  },
  user: {
    getAllUsers: {
      ...defaultConfig,
      pattern: "users",
      responseSchema: z
        .object({
          id: z.string(),
          username: z.string(),
          name: z.string().nullable(),
          roles: z.string().array(),
        })
        .array(),
      querySchema: SkipTakeSchema,
    },
    createUser: {
      ...defaultConfig,
      pattern: "users",
      method: "POST",
      bodySchema: z.object({
        username: z
          .string()
          .min(3, "Username too short")
          .max(20, "Username too long"),
        name: z
          .string()
          .min(3, "Name too short")
          .max(20, "Name too long")
          .nullable(),
        password: z
          .string()
          .min(3, "Password too short")
          .max(20, "Password too long"),
        roles: z.object({ id: z.number(), name: z.string() }).array(),
      }),
      responseSchema: z.string(),
    },
    updateUser: {
      ...defaultConfig,
      pattern: "users/:id",
      method: "PUT",
      bodySchema: z.object({
        username: z
          .string()
          .min(3, "Username too short")
          .max(20, "Username too long")
          .optional(),
        name: z
          .string()
          .min(3, "Name too short")
          .max(20, "Name too long")
          .optional(),
        password: z
          .string()
          .max(20, "Password too long")
          .transform((v) => (v === "" ? undefined : v))
          .optional(),
        roles: z.object({ id: z.number(), name: z.string() }).array(),
      }),
      paramSchema: z.object({ id: z.string() }),
      responseSchema: z.string(),
    },
    deleteUser: {
      ...defaultConfig,
      pattern: "users/:id",
      method: "DELETE",
      paramSchema: z.object({ id: z.string() }),
      responseSchema: z.string(),
    },
    getRoles: {
      ...defaultConfig,
      pattern: "users/roles",
      responseSchema: z.object({ id: z.number(), name: z.string() }).array(),
    },
  },
  settings: {
    getAll: {
      ...defaultConfig,
      pattern: "settings",
      responseSchema: z
        .object({
          id: z.string(),
          key: z.string(),
          numValue: z.number().nullable(),
          strValue: z.string().nullable(),
          boolValue: z.boolean().nullable(),
          title: z.string().nullable(),
          description: z.string().nullable(),
          valueType: z.string(),
        })
        .array(),
    },
    update: {
      ...defaultConfig,
      pattern: "settings/:key",
      method: "PUT",
      bodySchema: z.object({
        numValue: z.coerce.number().nullable().optional(),
        strValue: z.string().nullable().optional(),
        boolValue: z.boolean().nullable().optional(),
      }),
      paramSchema: z.object({ key: z.string() }),
      responseSchema: z.string(),
    },
  },
} as const;

// --- API ---
/*

GameDev Notes

1. First you will have to login to the game using username password
2. Check on line no 78 which is login route
3. On the route the pattern is auth/login and the method is POST
4. So, you will have to send a POST request to https://railway.n3xchain.com/api/auth/login
5. As the bodyschema you can see it requires a object with username and password in it. It also defines the types so, the username is string and password is string
6. So, when you send a post request to https://railway.n3xchain.com/api/auth/login with body as {username: "your username", password: "your password"} you will get a response with a object and the object consistes of access_token and refresh_token and both are string type

7. Now, you will have to use the access_token to access the other protected routes as they are not public

8. When you add a headder with your request and the access_token in it, our application knows that it is you requesting to the server, so only then we provide data and otherwise not

9. You will have to add a header with the key 'authorization' and value as the access_token you acquired previously

10. Now, you can access the other routes as they are protected and you will get the data, but in each request you have to provide that access_token



11. You can also see a route that is used to get all the games from game.getAll
12. The pattern is games and the method is GET (by default if it is not specified)

13. So, you will have to send a GET request to https://railway.n3xchain.com/api/games

14. As the responseSchema here says, you will get back an array of object containing id,name,status and more.

So, this is how all the api routes work, you can see the other routes and their usage in the code above

So, for the game workflow, at first the user will come to the game app and connect their wallet. From that, you get the wallet address of the user. On line 112, you can see a getAllNfts route. You can hit this api following the pattern and get an array of NFTs. on the query schema you can see there is a owner option. So, you can use something like this, https://railway.n3xchain.com/api/nfts?owner=0x1234567890abcdef1234567890abcdef12345678 and you will get all the NFTs owned by that address. So, the part after ? is just filtering out items. But this will return nfts from all games, but in that case you might want to pass a gameId alongside and hit the url like this, https://railway.n3xchain.com/api/nfts?owner=0x1234567890abcdef1234567890abcdef12345678&gameId=abcdefg and you will get all the NFTs owned by that address in that game.

Initially you do not have the game id, but you can hit the game.getAll route from the aboev object and in return you get all the games with its ids alongside the game status. Usually when the user connects, they will connect to the currently running game, so you can check the status RUNNING from the array of game list and the provide the id of a running game to the above url and get all the NFTs owned by that address in that game.

So, you can list all the nfts owned by that user for them so they can place them on the map.

But the map, to get the map information use the map.getPositions route and pass the game id and color(all game has 10 color maps, you can get all possible colors using the map.getColors route) as query param. So, the url will be like this, https://railway.n3xchain.com/api/map/positions?gameId=abcdefg&color=RED and you will get all the positions of the nfts in that game.

on the resoonse you will get an array of objects and the object will contain the mapItem (RIVER,MOUNTAIN,CHECKPOINT, also you can possible mapItem values using the map.getMapItems route). As you can see the mapItem property is nullable, so in a possition there could be a map item or not. If there is one you will render it on the game screen. Similarly prePlaced are the pre existing rail roads on a map you can render them as the data response comes back. nft is the property nft that is already placed on that position. bridgeConstructedOn is number type and it is a timestamp in seconds. In javascript you can get current timestamp using Math.round(Date.now()/1000). You can compare the bridgeConstructedOn value with current timestamp. If the value less that current timestamp that means a bridge construction is completed on that position. If the value is greater than current timestamps that means the bridge is still under construction and the construction will be completed at that timestamp. Using the timestamp you can show a timer until that timestamp on the map that shows after this time the bridge will be constructed. Same thing applies for railConstructedOn. Wehn a user assigns an nft on the map, that rail has to complete constructions and this will show you the timestamp of last completion or the time in future if the construction is not completed yet. enemy is also a nullable value here, so a position might or might not have an enemy.

So, this way you can get the map informations from the server.

When a user wants to place an nft on the map, you can user the map.placeNft route and pass the game id, color, x, y, nftId etc(check the bodySchema).  You will get a response with a message that the nft is placed on the map. if anything wrong happens we are throwing error http status. So, you can check the status code and show the error message to the user. if the status code is 200 or 201 that means the nft is placed on the map successfully. Anything other than 200 and 201 means something went wrong and our response will contain information about what went wrong.


We also have another route that is map.updateRailLocation. By the rules, rail will automatically travel to the next available rail tracks if the constructions is completed. There are some other rules too regarding the collision with mountain and all. You can check the requirement doc for that. So, you will have to find out the next location of the rail according to the rule every 10minutes. Every 10minutes you will be sending a post request to the map.updateRailLocation  and pass the required information on it (defined in the endpoint above). If you get a ok response that means placement was successful and thus the rail can move forward. So, every 10minutes you will be sending information regarding the new location and if the response is that means everything is good to go.
*/
