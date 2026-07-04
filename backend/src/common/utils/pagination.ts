export function parsePagination(
  page?: string,
  limit?: string,
  defaultLimit = 20,
  maxLimit = 100,
) {
  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    limit:
      Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, maxLimit)
        : defaultLimit,
  };
}
