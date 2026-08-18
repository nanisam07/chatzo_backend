import app from "./app";
import prisma from "./config/database";
import { env } from "./config/env";

const PORT = env.PORT;

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log("✅ Connected to Neon PostgreSQL via Prisma");

    app.listen(PORT, () => {
      console.log(`🚀 Offshift Backend running on port ${PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🌐 API Base: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

startServer();