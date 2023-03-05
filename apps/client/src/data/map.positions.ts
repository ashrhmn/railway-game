export const mapPositions = ({
  color,
  gameId,
}: {
  color: string;
  gameId: string;
}) =>
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
      nfts: [],
      prePlaced: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      enemy: null,
    }));
