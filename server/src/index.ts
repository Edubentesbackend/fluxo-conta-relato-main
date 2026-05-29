import { env } from "./env.js";
import { buildApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

const app = buildApp();

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app.listen({ host: env.API_HOST, port: env.API_PORT }).catch(async (error) => {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
