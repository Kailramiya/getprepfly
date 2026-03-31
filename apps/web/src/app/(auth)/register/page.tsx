"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Globe, Mail, Lock, User, Phone, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const centreSlug = searchParams.get("centre") || "";
  const isCentreRegistration = searchParams.get("role") === "centre";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    centreSlug: centreSlug,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          centreSlug: form.centreSlug || undefined,
          role: isCentreRegistration ? "centre" : "student",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Mobile logo */}
      <div className="mb-8 flex items-center gap-2 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
          <Globe className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">PTE Master</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">
        {isCentreRegistration ? "Register Your Centre" : "Create your account"}
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        {isCentreRegistration
          ? "Set up your coaching centre on PTE Master"
          : "Start your PTE preparation journey for free"}
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            className="pl-10"
            required
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            className="pl-10"
            required
          />
        </div>

        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="tel"
            placeholder="Phone number (optional)"
            value={form.phone}
            onChange={(e) => updateForm("phone", e.target.value)}
            className="pl-10"
          />
        </div>

        {!isCentreRegistration && (
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Centre code (optional — ask your coaching centre)"
              value={form.centreSlug}
              onChange={(e) => updateForm("centreSlug", e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={(e) => updateForm("password", e.target.value)}
            className="pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => updateForm("confirmPassword", e.target.value)}
            className="pl-10"
            required
          />
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {isCentreRegistration ? "Register Centre" : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </p>

      {!isCentreRegistration && (
        <p className="mt-3 text-center text-sm text-gray-500">
          Are you a coaching centre?{" "}
          <Link href="/register?role=centre" className="font-medium text-teal-600 hover:text-teal-500">
            Register as Centre
          </Link>
        </p>
      )}
    </div>
  );
}
