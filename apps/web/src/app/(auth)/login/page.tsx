"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const registered = searchParams.get("registered");
  const authError = searchParams.get("error");
  const kicked = searchParams.get("kicked");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const getAuthErrorMessage = (err: string | null) => {
    if (!err) return "";
    switch (err) {
      case "AccessDenied":
      case "Callback":
        return "No account found with this email. Please register first, then use Google to login.";
      case "OAuthAccountNotLinked":
        return "This email is already registered with a different method. Try logging in with email and password.";
      case "OAuthSignin":
      case "OAuthCallback":
        return "Google login failed. Please try again or use email and password.";
      case "CredentialsSignin":
        return "Invalid email or password.";
      default:
        return "No account found with this email. Please register first, then use Google to login.";
    }
  };
  const [error, setError] = useState(getAuthErrorMessage(authError));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div>
      {/* Mobile logo */}
      <div className="mb-8 lg:hidden">
        <Logo size="sm" />
      </div>

      <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Welcome back</h2>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        Log in to continue your PTE preparation
      </p>

      {registered && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">
          Account created successfully! Please log in.
        </div>
      )}

      {kicked && (
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Your account was used to log in on another device. Please log in again to continue.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Google Login */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="group mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-card px-4 py-3 text-sm font-bold tracking-wide text-foreground shadow-glass transition-all duration-500 ease-fluid hover:bg-white/5 hover:shadow-float active:scale-[0.98]"
      >
        <svg className="h-5 w-5 group-hover:scale-110 transition-transform duration-500 ease-fluid" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-full pl-11 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
            required
          />
        </div>

        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-full pl-11 pr-12 shadow-inner bg-black/5 dark:bg-black/20 focus-visible:ring-primary/20"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>

        <div className="flex justify-end pt-1">
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full rounded-full shadow-glass hover:shadow-float font-bold tracking-wide transition-all duration-700 ease-fluid active:scale-[0.98]" size="xl" loading={loading}>
          Log in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-bold text-primary hover:text-primary/80 transition-colors">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
