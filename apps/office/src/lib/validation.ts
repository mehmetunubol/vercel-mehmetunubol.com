import { z } from "zod";

const base64 = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9+/]+=*$/);

export const publicKeySchema = base64(200);
export const encryptedPrivateKeySchema = z
  .string()
  .max(1000)
  .refine((value) => {
    try {
      const b = JSON.parse(value) as Record<string, unknown>;
      return (
        b.v === 1 &&
        typeof b.salt === "string" &&
        typeof b.iv === "string" &&
        typeof b.ct === "string"
      );
    } catch {
      return false;
    }
  });

export const sendMessageSchema = z.object({
  id: z.uuid(),
  senderPublicKey: publicKeySchema,
  ciphertext: base64(24_000),
  iv: base64(32),
  keys: z.record(z.uuid(), base64(200)),
});

export const presenceSchema = z
  .object({
    presence: z.enum(["in", "out"]).optional(),
    // null clears a scheduled change; omitted leaves it alone (unless presence changes).
    plan: z
      .object({
        at: z.iso.datetime({ offset: true }),
        precision: z.enum(["exact", "morning", "afternoon", "evening"]),
      })
      .nullable()
      .optional(),
  })
  .refine((body) => body.presence !== undefined || body.plan !== undefined, "nothing to change");
