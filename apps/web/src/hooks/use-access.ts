"use client";
import { useEffect, useState } from "react";

let accessPromise: Promise<any> | null = null;

export function getSharedAccess(forceRefresh = false): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!accessPromise || forceRefresh) {
    accessPromise = fetch("/api/access/me")
      .then((r) => r.json())
      .catch((e) => {
        accessPromise = null;
        throw e;
      });
  }
  return accessPromise;
}

export function clearAccessCache() {
  accessPromise = null;
}

export function useAccess() {
  const [access, setAccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getSharedAccess()
      .then((data) => {
        if (!mounted) return;
        if (data && data.success) {
          setAccess(data.data);
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { access, loading };
}
