import { ZodType, z } from "zod";
import { getAddress } from "ethers/lib/utils";
import {
  MAP_ITEMS,
  COLOR,
  NFT_JOB,
  MAP_ITEM_VARIANT,
  ROLE,
} from "@prisma/client";

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

const emptyStringToUndefined = z.literal("").transform(() => undefined);

function optionalUndefinedString<T extends z.ZodTypeAny>(schema: T) {
  return schema.optional().or(emptyStringToUndefined);
}

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
  take: z.coerce.number().optional().default(255),
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
        roles: z.array(z.nativeEnum(ROLE)),
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
        unfilteredCount: z.number(),
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
    updateNftsByPercentage: {
      ...defaultConfig,
      pattern: "nfts/update-by-percentage",
      method: "POST",
      responseSchema: z.string(),
      bodySchema: z.object({
        gameId: z.string(),
        jobs: z
          .object({
            job: z.nativeEnum(NFT_JOB),
            percentage: z.number(),
          })
          .array(),
      }),
    },
  },
  map: {
    getColors: {
      ...defaultConfig,
      pattern: "map/colors",
      responseSchema: z.nativeEnum(COLOR).array(),
    },
    getMapItems: {
      ...defaultConfig,
      pattern: "map/items",
      responseSchema: z.nativeEnum(MAP_ITEMS).array(),
    },
    getNftJobs: {
      ...defaultConfig,
      pattern: "map/nft-jobs",
      responseSchema: z.nativeEnum(NFT_JOB).array(),
    },
    getMapItemVariants: {
      ...defaultConfig,
      pattern: "map/map-item-variants",
      responseSchema: z.nativeEnum(MAP_ITEM_VARIANT).array(),
      querySchema: z.object({
        mapItem: z.nativeEnum(MAP_ITEMS).optional(),
      }),
    },
    getPositions: {
      ...defaultConfig,
      pattern: "map/positions",
      responseSchema: z
        .object({
          id: z.string(),
          x: z.number().min(0).max(14),
          y: z.number().min(0).max(14),
          color: z.nativeEnum(COLOR),
          mapItem: z.string().nullable(),
          mapItemVariant: z.string().nullable(),
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
        mapItemVariant: z.string().optional(),
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
          direction: z.string(),
          createdAt: z.number(),
        })
        .passthrough(),
      querySchema: z.object({ color: z.string(), gameId: z.string() }),
    },
    getColorsAvailableForWalletByGameId: {
      ...defaultConfig,
      pattern: "games/colors-available/:gameId/:walletAddress",
      paramSchema: z.object({ gameId: z.string(), walletAddress: z.string() }),
      responseSchema: z.nativeEnum(COLOR).array(),
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
          roles: z.nativeEnum(ROLE).array(),
        })
        .array(),
      querySchema: SkipTakeSchema,
    },
    createUser: {
      ...defaultConfig,
      pattern: "users",
      method: "POST",
      bodySchema: z
        .object({
          username: z
            .string()
            .min(3, "Username too short")
            .max(20, "Username too long"),
          name: optionalUndefinedString(
            z.string().min(3, "Name too short").max(20, "Name too long"),
          ),
          password: z
            .string()
            .min(3, "Password too short")
            .max(20, "Password too long"),
          confirmPassword: z
            .string()
            .min(3, "Password too short")
            .max(20, "Password too long"),
          roles: z.nativeEnum(ROLE).array(),
        })
        .refine((data) => data.confirmPassword === data.password, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
        }),
      responseSchema: z.string(),
    },
    updateUser: {
      ...defaultConfig,
      pattern: "users/:id",
      method: "PUT",
      bodySchema: z
        .object({
          username: optionalUndefinedString(
            z
              .string()
              .min(3, "Username too short")
              .max(20, "Username too long"),
          ),
          name: optionalUndefinedString(
            z.string().min(3, "Name too short").max(20, "Name too long"),
          ),
          password: optionalUndefinedString(
            z
              .string()
              .min(3, "Password too short")
              .max(20, "Password too long"),
          ),
          confirmPassword: optionalUndefinedString(
            z
              .string()
              .min(3, "Password too short")
              .max(20, "Password too long"),
          ),
          roles: z.nativeEnum(ROLE).array(),
        })
        .refine((data) => data.confirmPassword === data.password, {
          message: "Passwords do not match",
          path: ["confirmPassword"],
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
      responseSchema: z.nativeEnum(ROLE).array(),
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
    getAllAbilityScoreMappings: {
      ...defaultConfig,
      pattern: "settings/ability-score-mappings",
      responseSchema: z
        .object({
          id: z.string(),
          level: z.number(),
          abilityB_Min: z.number(),
          abilityB_Max: z.number(),
          abilityL_Min: z.number(),
          abilityL_Max: z.number(),
          abilityK_Min: z.number(),
          abilityK_Max: z.number(),
          abilityR_Min: z.number(),
          abilityR_Max: z.number(),
        })
        .array(),
    },
  },
} as const;

export const WS_EVENTS = {
  RAIL_POSITION_CHANGED: (
    {
      color,
      gameId,
    }: {
      gameId: string;
      color: string;
    },
    payload?: { x?: number; y?: number; direction?: string } & Record<
      string,
      any
    >,
  ) => ({
    event: `RAIL_POSITION_CHANGED_${color}_${gameId}`,
    payload,
  }),
  MAP_POSITIONS_UPDATED: (
    { color, gameId }: { gameId: string; color: string },
    payload?: { x?: number; y?: number; job?: string } & Record<string, any>,
  ) => ({
    event: `MAP_POSITIONS_UPDATED_${color}_${gameId}`,
    payload,
  }),
  GAME_STARTED: ({ gameId }: { gameId: string }) => ({
    event: `GAME_STARTED_${gameId}`,
  }),
  GAME_FINISHED: (
    { gameId }: { gameId: string },
    payload?: { color: string } & Record<string, any>,
  ) => ({
    event: `GAME_FINISHED_${gameId}`,
    payload,
  }),
  NFT_OWNER_CHANGED: (payload: { gameId: string; tokenId: number }) => ({
    event: `NFT_OWNER_CHANGED`,
    payload,
  }),
  GAME_PREFERENCE_UPDATED: (payload: any) => ({
    event: `GAME_PREFERENCE_UPDATED`,
    payload,
  }),
} as const;

// --- API ---
/*

GameDev Notes


So, now we have removed the login system for the game view. So, you do not have to login to the platform.

On the platform we can have multiple game running or waiting in the pipeline. 

So, to get all the games on this platform you can use the game.getAll endpoint from above (/api/games) it will return with all the running games with the game id. User can choose to enter a running game from their. In the list we also have a status field that could be waiting/running/finished.

Each game will have 10 maps and 10 color for the maps. You can use the map.getColors endpoint to get all the available colors

Then, when an user enters the red map on game 1, you will have to fetch the map information using the map.getPositions endpoint. You will have to pass the gameId and color as query parapeter as you can already see on the endpoint schema above. From this endpoint you will get a list of positions and available items on that position. positions will be starting from 0,0 and end with 14,14. If the endpoint does not return a position, it means that the position is empty. So, you will render a dark empty field at that position. On the array of positions, we have a property named mapItem. This property could be a mountain or river or checpoint. So, you will have to render the map item on that position. We also have an nft property on the position object that will mean a user has placed an nft on this position. So, you will have to render the nft on that position. nft property also has a property that is job and job could be a bridge nft, light nft, knight nft or a railroad nft of different shapes (rail24,rail46,rail68). So, you will have to render those shaped railroad on the map.

By the game rules, rail can not go through a river so, they will have to place a bridge nft on a river. So, we have a bridgeConstructedOn property that indicates a timestamp (epoch timestamp). If the timestamp is 0 or less than the timestamp of current time, that means a bridge is not constructed on that river. If the timestamp is greater than the current time, that means a bridge is constructed on that river. So, you will have to render a bridge on that river.

If the construction complete timestamp is in future that means it will be completed by that time. So, you will have to show a timer on that place indicating the time left for the construction to complete.

Same thing happens for railConstrcutedOn value. This indicates that this railroad will be constructed at this timestamp. So, you can show a timer on that place indicating the time left for the construction to complete.

If you see an nft or specifically a rail nft on a river that has the bridge already constructed (bridgeConstructedOn is greater than now time), you will have to render a rail road on that bridge.

regarding the timestamp, all over the platform is using epoch format for timestamp. In case of javascript you can fo Date.now()/1000 to get the epoch time of current timestamp. You can also do Math.round(Date.now() / 1000) to get the rounded epoch time of current timestamp.

On the position, plePlaced item is the rail roads that has been preinstalled by the game admins, so they gets rendered on the map as well.

On the position, you will be seeing that isRevealed value is true for all the positions. that's because unrevealed positions will stay hidden or dark until they are revealed by the users. So, we are not exposing the revealed positions and you can render dark map on the positions that we do not return.


If mapItem is a checkpoint and checkPointPassed value is true, that means the checkpoint has been passed by the user and otherwise not


if the enemy is present in the map position, that means the map position has an enemy there. There could be multiple enemies with same id (enemyId). If the enemy ids are same for more than one position, that means there is only one enemy taking place of all those squares. Usually enemy can be of size 1 square or 4 square or 6 square. So, if you see 6 enemies with same id on 6 map positions, that means there is one enemy taking place of 6 squares. enemy has a strenth propery and a current strength property. Enemy strength will be shown as a bar on the enemy.

You can use the game.getCurrentRailPosition to get the current position of the rail, you will still have to pass the gameId and color here to get the result. rail position will also include the direction, which indicates which direction the rail is front faced to. So, you will have to render the rail in that direction.

Rail has a locking time, you can get the time by quering settings.getAll endpoint. And the values will be in seconds. So, on the current rail position you will be checking created_at value (epoch timestamp). If the created_at + locking time is greater than the current time, that means the rail is locked and you will have to show a timer on that rail indicating the time left for the rail to be unlocked.

There are some webcocket events available you acn find the WS_EVENtS object.

You can use the WS_EVENTS.RAIL_POSITION_CHANGED to get the updated rail positions. You will have to pass the gameId and color as specified. So, if the user is on game1 and red map, you will be listening to event RAIL_POSITION_CHANGED_RED_game1. You will get the updated rail positions on this event. Then you can refetch the current rail position using the game.getCurrentRailPosition endpoint.

You can use the WS_EVENTS.MAP_POSITIONS_UPDATED to get the updated map positions. You will have to pass the gameId and color as specified. So, if the user is on game1 and red map, you will be listening to event MAP_POSITIONS_UPDATED_RED_game1. If any event is emitted you can then query the map.getPositions endpoint to get the updated map positions.

*/
