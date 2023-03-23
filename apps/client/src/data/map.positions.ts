import service from "@/service";
import { endpoints } from "api-interface";
import { COLOR } from "@prisma/client";

const getter = service(endpoints.map.getPositions);

export const mapPositions = ({
  color,
  gameId,
}: {
  color: COLOR;
  gameId: string;
}): Awaited<ReturnType<typeof getter>> =>
  Array(15)
    .fill(0)
    .map((_, i) =>
      Array(15)
        .fill(0)
        .map((_, j) => ({
          x: i,
          y: j,
        }))
    )
    .reduce((acc, cur) => [...acc, ...cur], [])
    .map(({ x, y }) => ({
      x,
      y,
      color,
      gameId,
      current: false,
      mapItem: null,
      id: "",
      nft: null,
      prePlaced: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      enemy: null,
      isRevealed: false,
      mapItemVariant: null,
      bridgeConstructedOn: 0,
      checkPointPassed: false,
      railConstructedOn: 0,
    }));
