const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
  const emails = ["jgmclydia929@gmail.com", "newmerchant@chatzo.io"];
  
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`🗑️ Deleted test user: ${email}`);
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
