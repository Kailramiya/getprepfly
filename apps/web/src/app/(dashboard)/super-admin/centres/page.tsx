"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Plus, Globe } from "lucide-react";

interface Centre {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { users: number };
}

export default function SuperAdminCentresPage() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCentres = async () => {
      const res = await fetch("/api/centres");
      const data = await res.json();
      if (data.success) setCentres(data.data);
      setLoading(false);
    };
    fetchCentres();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Centres</h1>
          <p className="text-gray-500">{centres.length} coaching centres registered</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Centre</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : centres.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">No centres registered yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {centres.map((centre) => (
            <Card key={centre.id} className="transition hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
                      <Globe className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{centre.name}</h3>
                      <p className="text-xs text-gray-500">{centre.city}, {centre.state}</p>
                    </div>
                  </div>
                  <Badge variant={centre.isActive ? "success" : "destructive"}>
                    {centre.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {centre._count.users} students
                  </span>
                  <span>Code: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">{centre.slug}</code></span>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Joined {new Date(centre.createdAt).toLocaleDateString("en-IN")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
