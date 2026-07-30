import { Router } from "express";
import authRoutes from "./auth.routes";
import merchantRoutes from "./merchant.routes";
import whatsappRoutes from "./whatsapp.routes";
import webhookRoutes from "./webhook.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/merchant", merchantRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/webhook", webhookRoutes);

export default router;
