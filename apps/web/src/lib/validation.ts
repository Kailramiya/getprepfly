import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Parse + validate a request body against a Zod schema.
 *
 *   const parsed = await parseBody(req, RegisterSchema);
 *   if (!parsed.ok) return parsed.response;
 *   const { email } = parsed.data;
 *
 * Returns a 400 NextResponse with a readable message on failure.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path?.join(".");
    const message = first ? `${path ? path + ": " : ""}${first.message}` : "Invalid request";
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: message }, { status: 400 }),
    };
  }

  return { ok: true, data: result.data };
}

// ---- Shared field schemas ----------------------------------------------------

/**
 * Single source of truth for password rules across register / reset / change.
 * Min 8 chars with at least one letter and one number.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
    message: "Password must contain at least one letter and one number",
  });

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
