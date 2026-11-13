"use server";

import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { sendQuoteRequestEmail, type QuoteRequest } from "@/lib/email";

export type QuoteState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<keyof QuoteRequest, string>>;
  values?: QuoteRequest;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function requestQuote(
  _prev: QuoteState,
  formData: FormData
): Promise<QuoteState> {
  // Honeypot: real users never fill this hidden field
  if (field(formData, "website", 200)) {
    return { status: "success" };
  }

  const data: QuoteRequest = {
    name: field(formData, "name", 100),
    company: field(formData, "company", 120),
    email: field(formData, "email", 160),
    phone: field(formData, "phone", 40),
    screens: field(formData, "screens", 20),
    segment: field(formData, "segment", 60),
    message: field(formData, "message", 2000),
  };

  const fieldErrors: QuoteState["fieldErrors"] = {};
  if (data.name.length < 2) fieldErrors.name = "Informe seu nome";
  if (!EMAIL_RE.test(data.email)) fieldErrors.email = "Email inválido";
  if (data.phone.replace(/\D/g, "").length < 10)
    fieldErrors.phone = "Informe um telefone com DDD";
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Confira os campos destacados.", fieldErrors, values: data };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (!rateLimit(`quote:${ip}`, 5, 60 * 60 * 1000).ok) {
    return {
      status: "error",
      message: "Muitas solicitações em pouco tempo. Tente novamente mais tarde.",
      values: data,
    };
  }

  const to = process.env.QUOTE_EMAIL_TO;
  if (!to || !process.env.RESEND_API_KEY) {
    console.error("[quote] QUOTE_EMAIL_TO ou RESEND_API_KEY não configurados", data);
    return {
      status: "error",
      message: "Não foi possível enviar agora. Tente novamente em instantes.",
      values: data,
    };
  }

  try {
    await sendQuoteRequestEmail(to, data);
  } catch (err) {
    console.error("[quote] Falha ao enviar email", err);
    return {
      status: "error",
      message: "Não foi possível enviar agora. Tente novamente em instantes.",
      values: data,
    };
  }

  return { status: "success" };
}
