import { User, MerchantProfile } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User & { merchantProfile?: MerchantProfile | null };
    }
  }
}
