export const timestamp = (opt?: { round: "CEIL" | "FLOOR" }) => {
  const time = Date.now() / 1000;
  if (!opt) return Math.round(time);
  if (opt.round === "CEIL") return Math.ceil(time);
  if (opt.round === "FLOOR") return Math.floor(time);
  return Math.round(time);
};
