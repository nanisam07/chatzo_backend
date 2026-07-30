import { Router } from "express";
import { verifyWebhook, receiveWebhookEvent } from "../controllers/webhook.controller";

const router = Router();

router.get("/", verifyWebhook);
router.post("/", receiveWebhookEvent);

export default router;
