
export const GlobalSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
