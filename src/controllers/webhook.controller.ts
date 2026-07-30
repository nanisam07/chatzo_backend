import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { whatsappService } from "../services/whatsapp.service";
import { env } from "../config/env";

const prisma = new PrismaClient();

export const verifyWebhook = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === env.META_VERIFY_TOKEN) {
        console.log("[Webhook] Webhook verified successfully!");
        res.status(200).send(challenge);
        return;
      }
    }
    res.sendStatus(403);
  } catch (error) {
    next(error);
  }
};

export const receiveWebhookEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body;
    console.log("[Webhook] Received event:", JSON.stringify(body, null, 2));

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const metadata = value?.metadata;
      const message = value?.messages?.[0];
      const status = value?.statuses?.[0];

      // Handle incoming messages
      if (message) {
        const fromPhoneNumberId = metadata?.phone_number_id;
        const customerPhone = message.from;
        const customerName = value?.contacts?.[0]?.profile?.name || customerPhone;

        let textContent = "[Received Attachment]";
        if (message.type === "text") {
          textContent = message.text?.body || "";
        } else if (message.type === "interactive") {
          const type = message.interactive?.type;
          if (type === "button_reply") {
            textContent = message.interactive?.button_reply?.title || "";
          } else if (type === "list_reply") {
            textContent = message.interactive?.list_reply?.title || "";
          }
        }

        if (fromPhoneNumberId) {
          // Look up matching merchant account
          const account = await prisma.whatsAppAccount.findFirst({
            where: { phoneNumberId: fromPhoneNumberId },
          });

          if (account && account.connectionStatus === "Connected") {
            await whatsappService.persistMessage({
              merchantId: account.merchantId,
              customerPhone,
              customerName,
              text: textContent,
              sender: "customer",
            });
            console.log(`[Webhook] Saved message from ${customerPhone} for merchant ${account.merchantId}`);
          } else {
            console.log(`[Webhook] No active merchant connected with phoneNumberId: ${fromPhoneNumberId}`);
          }
        }
      }

      // Handle message statuses (sent, delivered, read)
      if (status) {
        const messageId = status.id;
        const messageStatus = status.status;
        const recipientId = status.recipient_id;
        console.log(`[Webhook] Message ID ${messageId} status updated to: ${messageStatus} for recipient: ${recipientId}`);
      }

      res.status(200).send("EVENT_RECEIVED");
      return;
    }

    res.sendStatus(404);
  } catch (error) {
    next(error);
  }
};
