import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { encrypt, decrypt } from "../utils/crypto";

const prisma = new PrismaClient();

export class MetaOAuthError extends Error {
  code?: number;
  subcode?: number;
  trace_id?: string;

  constructor(message: string, code?: number, subcode?: number, trace_id?: string) {
    super(message);
    this.name = "MetaOAuthError";
    this.code = code;
    this.subcode = subcode;
    this.trace_id = trace_id;
  }
}

interface SendMessageOptions {
  recipientPhone: string;
  type: "text" | "image" | "document" | "template" | "interactive_button" | "interactive_list" | "product";
  text?: string;
  mediaUrl?: string;
  filename?: string;
  templateName?: string;
  buttons?: { id: string; title: string }[];
  sections?: { title: string; rows: { id: string; title: string; description?: string }[] }[];
  catalogId?: string;
  productSku?: string;
}

export const whatsappService = {
  // Exchange OAuth code for access token
  async exchangeCodeForToken(
    code: string,
    redirectUri?: string,
    requestId?: string
  ): Promise<{
    accessToken: string;
    tokenExpiry?: Date;
  }> {
    // For Facebook JS SDK FB.login() Embedded Signup popups, redirect_uri MUST default to empty string ""
    // because FB.login() modal popups generate authorization codes bound without a redirect_uri.
    const effectiveRedirectUri = redirectUri !== undefined ? redirectUri : "";
    const connectionRequestId = requestId || "N/A";

    console.log("[Token Exchange Metadata]");
    console.log("connectionRequestId:", connectionRequestId);
    console.log("hasCode:", Boolean(code));
    console.log("codeLength:", code ? code.length : 0);
    console.log("appIdPresent:", Boolean(env.META_APP_ID));
    console.log("backendAppId:", env.META_APP_ID);
    console.log("redirectUriUsed:", effectiveRedirectUri === "" ? '""' : effectiveRedirectUri);
    console.log('tokenExchangeEndpoint: "/oauth/access_token"');

    const body = new URLSearchParams({
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      code,
      redirect_uri: effectiveRedirectUri,
    });

    const res = await fetch(
      "https://graph.facebook.com/v26.0/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = (await res.json()) as any;

    if (!res.ok || data.error) {
      const errorObj = data.error || {};
      console.error("[Token Exchange Meta Error]");
      console.error("connectionRequestId:", connectionRequestId);
      console.error("message:", errorObj.message || "N/A");
      console.error("type:", errorObj.type || "N/A");
      console.error("code:", errorObj.code !== undefined ? errorObj.code : "N/A");
      console.error("error_subcode:", errorObj.error_subcode !== undefined ? errorObj.error_subcode : "N/A");
      console.error("fbtrace_id:", errorObj.fbtrace_id || "N/A");

      throw new MetaOAuthError(
        errorObj.message || "Meta token exchange failed",
        errorObj.code,
        errorObj.error_subcode,
        errorObj.fbtrace_id
      );
    }

    console.log("[Token Exchange] Token exchange successful for connectionRequestId:", connectionRequestId);

    return {
      accessToken: data.access_token,
      tokenExpiry: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  },

  // Fetch WABA details shared with the token (with support for exact WABA ID & Phone Number ID from Embedded Signup)
  async fetchAccountDetails(
    token: string,
    inputWabaId?: string,
    inputPhoneNumberId?: string
  ): Promise<{
    businessId: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    businessName: string;
  }> {
    console.log("[Account Fetch] Fetching shared WhatsApp Business Accounts from Meta Graph API v26.0...");

    // 1. Get shared WhatsApp Business Accounts
    const wabaUrl = `https://graph.facebook.com/v26.0/me/whatsapp_business_accounts?access_token=${token}`;
    const wabaRes = await fetch(wabaUrl);
    const wabaData = (await wabaRes.json()) as any;

    if (!wabaRes.ok || wabaData.error) {
      const errorObj = wabaData.error || {};
      console.error("[Account Fetch] Fetching WhatsApp Business Accounts failed:", errorObj);
      throw new MetaOAuthError(
        errorObj.message || "Failed to fetch WhatsApp Business Accounts",
        errorObj.code,
        errorObj.error_subcode,
        errorObj.fbtrace_id
      );
    }

    if (!wabaData.data || wabaData.data.length === 0) {
      console.error("[Account Fetch] No WhatsApp Business Accounts linked to this token");
      throw new Error("No WhatsApp Business Accounts linked to this token");
    }

    let targetWaba = wabaData.data[0];
    if (inputWabaId) {
      const matched = wabaData.data.find((acc: any) => acc.id === inputWabaId);
      if (matched) {
        targetWaba = matched;
        console.log("[Account Fetch] Matched exact WABA ID from Embedded Signup payload:", inputWabaId);
      } else {
        console.warn("[Account Fetch] Specified inputWabaId not found in shared accounts array, defaulting to first WABA:", targetWaba.id);
      }
    }

    const wabaId = targetWaba.id;
    const businessName = targetWaba.name || "My WhatsApp Store";

    // 2. Get phone numbers registered with this WABA
    console.log("[Account Fetch] Fetching phone numbers for WABA:", wabaId);
    const phoneUrl = `https://graph.facebook.com/v26.0/${wabaId}/phone_numbers?access_token=${token}`;
    const phoneRes = await fetch(phoneUrl);
    const phoneData = (await phoneRes.json()) as any;

    if (!phoneRes.ok || phoneData.error) {
      const errorObj = phoneData.error || {};
      console.error("[Account Fetch] Fetching phone numbers failed:", errorObj);
      throw new MetaOAuthError(
        errorObj.message || "Failed to fetch phone numbers from WhatsApp Business Account",
        errorObj.code,
        errorObj.error_subcode,
        errorObj.fbtrace_id
      );
    }

    if (!phoneData.data || phoneData.data.length === 0) {
      console.error("[Account Fetch] No phone numbers registered with this WhatsApp Business Account");
      throw new Error("No phone numbers registered with this WhatsApp Business Account");
    }

    let targetPhone = phoneData.data[0];
    if (inputPhoneNumberId) {
      const matchedPhone = phoneData.data.find((p: any) => p.id === inputPhoneNumberId);
      if (matchedPhone) {
        targetPhone = matchedPhone;
        console.log("[Account Fetch] Matched exact Phone Number ID from Embedded Signup payload:", inputPhoneNumberId);
      } else {
        console.warn("[Account Fetch] Specified inputPhoneNumberId not found in WABA phone numbers, defaulting to first number:", targetPhone.id);
      }
    }

    const phoneNumberId = targetPhone.id;
    const displayPhoneNumber = targetPhone.display_phone_number || "";
    console.log("[Account Fetch] Registered phone number ID validated:", phoneNumberId);

    const businessId = targetWaba.owner_business_info?.id || "1234567890";

    return {
      businessId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      businessName,
    };
  },

  // Subscribe WABA to the app's webhooks (POST /{waba_id}/subscribed_apps)
  async subscribeWaba(
    wabaId: string,
    accessToken: string
  ): Promise<{ success: boolean; data?: any }> {
    console.log(`[WABA Subscription] Subscribing WABA ID: ${wabaId} to app webhooks...`);
    const subscribeUrl = `https://graph.facebook.com/v26.0/${wabaId}/subscribed_apps`;

    try {
      const res = await fetch(subscribeUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const responseData = (await res.json()) as any;

      if (!res.ok || responseData.error) {
        const errorObj = responseData.error || {};
        console.error("[WABA Subscription] Subscription request failed:", errorObj.message || errorObj);
        return { success: false, data: errorObj };
      }

      console.log("[WABA Subscription] Successfully subscribed WABA to webhooks.");
      return { success: true, data: responseData };
    } catch (err: any) {
      console.error("[WABA Subscription] Exception during subscription request:", err.message || err);
      return { success: false, data: err };
    }
  },

  // Inspect phone number state on Meta Cloud API without hardcoding PINs
  async verifyPhoneState(
    phoneNumberId: string,
    accessToken: string
  ): Promise<{
    isRegistered: boolean;
    displayPhoneNumber?: string;
    verifiedName?: string;
    codeVerificationStatus?: string;
    qualityRating?: string;
  }> {
    console.log(`[Phone Verification] Inspecting Meta phone state for Phone ID: ${phoneNumberId}...`);
    const url = `https://graph.facebook.com/v26.0/${phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,status`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = (await res.json()) as any;

      if (!res.ok || data.error) {
        console.error("[Phone Verification] Meta phone state lookup failed:", data.error?.message || data.error);
        return { isRegistered: false };
      }

      console.log(`[Phone Verification] Phone state fetched. Verification status: ${data.code_verification_status || "N/A"}`);

      const isRegistered =
        data.code_verification_status === "VERIFIED" ||
        data.status === "APPROVED" ||
        data.status === "CONNECTED" ||
        Boolean(data.display_phone_number);

      return {
        isRegistered,
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
        codeVerificationStatus: data.code_verification_status,
        qualityRating: data.quality_rating,
      };
    } catch (err: any) {
      console.error("[Phone Verification] Exception verifying phone state:", err.message || err);
      return { isRegistered: false };
    }
  },

  // Persist conversation and message to Database
  async persistMessage(options: {
    merchantId: string;
    customerPhone: string;
    customerName?: string;
    text: string;
    sender: "customer" | "merchant" | "bot";
  }): Promise<any> {
    const { merchantId, customerPhone, customerName, text, sender } = options;

    let thread = await prisma.chatThread.findFirst({
      where: {
        merchantId,
        phone: customerPhone,
      },
    });

    const cleanTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          name: customerName || customerPhone,
          phone: customerPhone,
          lastMessage: text,
          time: cleanTime,
          unread: sender === "customer" ? 1 : 0,
          category: "retail",
          merchantId,
        },
      });
    } else {
      thread = await prisma.chatThread.update({
        where: { id: thread.id },
        data: {
          lastMessage: text,
          time: cleanTime,
          unread: sender === "customer" ? thread.unread + 1 : 0,
        },
      });
    }

    return prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        sender,
        text,
        time: cleanTime,
      },
    });
  },

  // Send WhatsApp message via Meta Cloud API
  async sendMessage(merchantId: string, options: SendMessageOptions): Promise<any> {
    const account = await prisma.whatsAppAccount.findUnique({
      where: { merchantId },
    });

    if (!account || account.connectionStatus === "Disconnected") {
      throw new Error("WhatsApp account not connected");
    }

    const accessToken = decrypt(account.accessToken);
    const phoneNumberId = account.phoneNumberId;

    let messageBody: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: options.recipientPhone,
    };

    switch (options.type) {
      case "text":
        messageBody = {
          ...messageBody,
          type: "text",
          text: { body: options.text || "" },
        };
        break;

      case "image":
        messageBody = {
          ...messageBody,
          type: "image",
          image: { link: options.mediaUrl || "" },
        };
        break;

      case "document":
        messageBody = {
          ...messageBody,
          type: "document",
          document: {
            link: options.mediaUrl || "",
            filename: options.filename || "Document",
          },
        };
        break;

      case "template":
        messageBody = {
          ...messageBody,
          type: "template",
          template: {
            name: options.templateName || "",
            language: { code: "en_US" },
          },
        };
        break;

      case "interactive_button":
        messageBody = {
          ...messageBody,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: options.text || "Please select an option" },
            action: {
              buttons: (options.buttons || []).map((b) => ({
                type: "reply",
                reply: { id: b.id, title: b.title },
              })),
            },
          },
        };
        break;

      case "interactive_list":
        messageBody = {
          ...messageBody,
          type: "interactive",
          interactive: {
            type: "list",
            body: { text: options.text || "Please select from the options" },
            action: {
              button: "Select",
              sections: (options.sections || []).map((sec) => ({
                title: sec.title,
                rows: sec.rows.map((r) => ({
                  id: r.id,
                  title: r.title,
                  description: r.description,
                })),
              })),
            },
          },
        };
        break;

      case "product":
        messageBody = {
          ...messageBody,
          type: "interactive",
          interactive: {
            type: "product",
            action: {
              catalog_id: options.catalogId || "",
              product_retailer_id: options.productSku || "",
            },
          },
        };
        break;
    }

    // Call Graph API (if config is real, otherwise mock)
    let metaMessageId = "mock_msg_id_" + Math.random().toString(36).substr(2, 9);
    
    if (env.META_APP_ID && accessToken && accessToken !== "mock_token") {
      const url = `https://graph.facebook.com/v26.0/${phoneNumberId}/messages`;
      try {
        console.log("[Graph API] Sending WhatsApp message via Meta Cloud API v26.0...");
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageBody),
        });
        const responseData = (await response.json()) as any;
        if (!response.ok || responseData.error) {
          console.error("[Graph API] Meta API Message Send Error:", responseData.error);
        } else {
          metaMessageId = responseData.messages?.[0]?.id || metaMessageId;
        }
      } catch (err) {
        console.error("[Graph API] Failed to make request to Meta API:", err);
      }
    }

    // Store outgoing message
    await this.persistMessage({
      merchantId,
      customerPhone: options.recipientPhone,
      text: options.text || `[Sent ${options.type} message]`,
      sender: "merchant",
    });

    return { success: true, messageId: metaMessageId };
  },
};
