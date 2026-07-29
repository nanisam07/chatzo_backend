const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
  const otps = await prisma.oTPVerification.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { email: true, fullName: true } } },
  });

  console.log("\n📋 Latest OTPs in database:\n");
  for (const o of otps) {
    const expired = new Date(o.expiresAt) < new Date();
    console.log(`  Email    : ${o.user.email}`);
    console.log(`  OTP      : \x1b[33m\x1b[1m${o.otp}\x1b[0m`);
    console.log(`  Type     : ${o.type}`);
    console.log(`  Verified : ${o.verified}`);
    console.log(`  Expires  : ${o.expiresAt} ${expired ? "\x1b[31m(EXPIRED)\x1b[0m" : "\x1b[32m(VALID)\x1b[0m"}`);
    console.log("  " + "─".repeat(48));
  }
  await prisma.$disconnect();
}

main().catch(console.error);
