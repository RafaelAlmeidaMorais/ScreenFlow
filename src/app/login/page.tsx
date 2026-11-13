"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Get CSRF token first
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();

      // Call NextAuth credentials endpoint directly
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          email,
          password,
          callbackUrl: "/dashboard",
        }),
        redirect: "manual",
      });

      // NextAuth returns a redirect (302) on success
      if (res.type === "opaqueredirect" || res.status === 302 || res.status === 200) {
        window.location.href = "/dashboard";
        return;
      }

      setError("Email ou senha inválidos");
      setLoading(false);
    } catch (err) {
      console.error("Login error:", err);
      setError("Erro ao conectar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-orange/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange/3 rounded-full blur-3xl" />

      <div className="w-full max-w-md px-6">
        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <h1>
            <BrandLogo className="h-12 mx-auto" priority />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gestão de telas corporativas
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-background/50 border-border/50 focus:border-orange/50 focus:ring-orange/20 placeholder:text-muted-foreground/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-background/50 border-border/50 focus:border-orange/50 focus:ring-orange/20 placeholder:text-muted-foreground/40"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-orange transition-colors">
                Esqueci minha senha
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-orange hover:bg-orange/90 text-orange-foreground font-semibold text-sm tracking-wide transition-all duration-200 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-orange-foreground/30 border-t-orange-foreground rounded-full animate-spin" />
                  Entrando...
                </div>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          ScreenFlow v1.0 — Gestão de Telas Corporativas
        </p>
      </div>
    </div>
  );
}
