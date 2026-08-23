import { prisma } from "./prisma";

/**
 * Resolves a workspace member user by ID, email, full name, or partial name.
 */
export async function resolveWorkspaceUser(workspaceId: string, identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  // Check if ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    const directUser = await prisma.user.findFirst({
      where: {
        id: trimmed,
        memberships: { some: { workspaceId } },
      },
    });
    if (directUser) return directUser;
  }

  const needle = trimmed.toLowerCase();
  const words = needle.split(/\s+/);

  // Try direct single match
  let user = await prisma.user.findFirst({
    where: {
      memberships: { some: { workspaceId } },
      OR: [
        { email: { contains: needle, mode: "insensitive" } },
        { firstName: { contains: needle, mode: "insensitive" } },
        { lastName: { contains: needle, mode: "insensitive" } },
      ],
    },
  });

  // If not found and multiple words provided, match firstName and lastName
  if (!user && words.length > 1) {
    user = await prisma.user.findFirst({
      where: {
        memberships: { some: { workspaceId } },
        AND: [
          { firstName: { contains: words[0], mode: "insensitive" } },
          { lastName: { contains: words[words.length - 1], mode: "insensitive" } },
        ],
      },
    });
  }

  return user;
}
