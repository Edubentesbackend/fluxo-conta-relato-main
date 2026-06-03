import "../src/load-env.js";
import { PrismaClient } from "@prisma/client";
import { buildPasswordCredential } from "../src/services/password-service.js";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@local.dev";
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Administrador";
  const username = process.env.ADMIN_USERNAME || "admin";

  if (!password) {
    throw new Error("Defina ADMIN_PASSWORD temporariamente ao rodar npm.cmd run prisma:seed");
  }

  const passwordCredential = await buildPasswordCredential(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      name,
      role: "admin",
      isActive: true,
    },
    create: {
      email,
      username,
      name,
      role: "admin",
      isActive: true,
    },
  });

  await prisma.userCredential.upsert({
    where: {
      userId_credentialType: {
        userId: user.id,
        credentialType: passwordCredential.credentialType,
      },
    },
    update: {
      secretHash: passwordCredential.secretHash,
      hashAlgorithm: passwordCredential.hashAlgorithm,
      hashParams: passwordCredential.hashParams,
      pepperVersion: passwordCredential.pepperVersion,
    },
    create: {
      userId: user.id,
      ...passwordCredential,
    },
  });

  console.log(`Admin user ready: ${email} (username: ${username})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
