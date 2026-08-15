import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not defined.");
}

// MySQL 8.0+ caching_sha2_password RSA 키 핸드셰이크 지연 및 풀 타임아웃 방지
if (!connectionString.includes("allowPublicKeyRetrieval")) {
  const separator = connectionString.includes("?") ? "&" : "?";
  connectionString = `${connectionString}${separator}allowPublicKeyRetrieval=true`;
}

// Prisma 7 MariaDB 어댑터에 커넥션 스트링 주입
const adapter = new PrismaMariaDb(connectionString);

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
