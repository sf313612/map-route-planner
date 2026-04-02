import { Request } from "express";

export function getParamId(req: Request): string | null {
  const p = req.params.id;
  return typeof p === "string" ? p : p?.[0] ?? null;
}
