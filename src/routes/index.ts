import { Router } from "express";
import authRoutes from "./auth.routes";
import merchantRoutes from "./merchant.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/merchant", merchantRoutes);

export default router;
