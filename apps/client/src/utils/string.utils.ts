export const shortenString = (str: string, limit = 10) => {
  if (limit !== 0 && str.length > limit) {
    return (
      str.slice(0, Math.ceil(limit / 2)) +
      "..." +
      str.slice(-Math.floor(limit / 2))
    );
  } else {
    return str;
  }
};
