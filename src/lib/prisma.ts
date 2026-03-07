import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const isProduction = process.env.NODE_ENV === "production";
const enablePrismaConnectionDebug = process.env.PRISMA_DEBUG_CONNECTION === "1";

if (!isProduction && enablePrismaConnectionDebug) {
  const url = process.env.DATABASE_URL ?? "<undefined>";
  try {
    // Avoid logging full credentials; just show which kind of DB we are using.
    const parsed = new URL(
      url.startsWith("postgres") || url.startsWith("mysql")
        ? url
        : "http://local"
    );
    // This will print once on server start so we can verify DB host/db name.
    console.log(
      "[Prisma] Using DATABASE_URL host=",
      parsed.hostname,
      "path=",
      parsed.pathname
    );
  } catch {
    console.log("[Prisma] Using DATABASE_URL=", url);
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error", "warn"] : ["warn"]
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
