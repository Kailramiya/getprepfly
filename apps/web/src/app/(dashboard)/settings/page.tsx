"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Crown, LogOut, User, Save, Lock, Building2,
  Palette, Globe, Phone, Mail, MapPin, Check,
} from "lucide-react";

export default function SettingsPage() {
  const { user, isCentreAdmin } = useAuth();
  const confirm = useConfirm();

  // Profile state
  const [profile, setProfile] = useState({ name: "", phone: "", language: "EN", examDate: "", dailyGoal: 20 });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password state
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Centre branding state
  const [centre, setCentre] = useState({
    name: "", phone: "", email: "", city: "", state: "",
    address: "", primaryColor: "#0D9488", website: "",
  });
  const [savingCentre, setSavingCentre] = useState(false);
  const [centreSaved, setCentreSaved] = useState(false);

  // Load profile
  useEffect(() => {
    fetch("/api/users/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setProfile({
            name: data.data.name || "",
            phone: data.data.phone || "",
            language: data.data.language || "EN",
            examDate: data.data.examDate ? data.data.examDate.slice(0, 10) : "",
            dailyGoal: data.data.dailyGoal ?? 20,
          });
          if (data.data.centre) {
            setCentre({
              name: data.data.centre.name || "",
              phone: data.data.centre.phone || "",
              email: data.data.centre.email || "",
              city: data.data.centre.city || "",
              state: data.data.centre.state || "",
              address: data.data.centre.address || "",
              primaryColor: data.data.centre.primaryColor || "#0D9488",
              website: data.data.centre.website || "",
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    const res = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (data.success) setProfileSaved(true);
    else alert(data.error || "Failed to save");
    setSavingProfile(false);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const changePassword = async () => {
    setPasswordError("");
    setPasswordSaved(false);
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    setSavingPassword(true);
    const res = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    });
    const data = await res.json();
    if (data.success) {
      setPasswordSaved(true);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setPasswordError(data.error || "Failed to change password");
    }
    setSavingPassword(false);
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const saveCentreBranding = async () => {
    setSavingCentre(true);
    setCentreSaved(false);
    const res = await fetch("/api/centres/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(centre),
    });
    const data = await res.json();
    if (data.success) setCentreSaved(true);
    else alert(data.error || "Failed to save");
    setSavingCentre(false);
    setTimeout(() => setCentreSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Settings</h1>

      {/* Free Beta */}
      <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-indigo-50 dark:border-teal-900 dark:from-slate-800 dark:to-slate-800">
        <CardContent className="flex items-center gap-4 p-5">
          <Crown className="h-6 w-6 shrink-0 text-teal-600" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Free Beta Access</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">All features unlocked during beta</p>
          </div>
          <Badge className="ml-auto shrink-0 bg-teal-600 text-white">FREE</Badge>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-gray-400" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Full Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Your full name"
          />
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-slate-300">Email</p>
            <p className="flex h-10 items-center rounded-lg bg-gray-50 px-3 text-sm text-gray-500 dark:bg-slate-700 dark:text-slate-400">{user?.email}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Email cannot be changed</p>
          </div>
          <Input
            label="Phone Number"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            placeholder="+91 9876543210"
            type="tel"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Language</label>
            <select
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={profile.language}
              onChange={(e) => setProfile({ ...profile, language: e.target.value })}
            >
              <option value="EN">English</option>
              <option value="HI">Hindi</option>
              <option value="PA">Punjabi</option>
            </select>
          </div>
          {user?.role === "STUDENT" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="examDate" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">PTE exam date</label>
                <input
                  id="examDate"
                  type="date"
                  value={profile.examDate}
                  onChange={(e) => setProfile({ ...profile, examDate: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Shows a countdown on your dashboard. Leave blank to clear.</p>
              </div>
              <div>
                <label htmlFor="dailyGoal" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Daily goal (questions)</label>
                <input
                  id="dailyGoal"
                  type="number"
                  min={1}
                  max={200}
                  value={profile.dailyGoal}
                  onChange={(e) => setProfile({ ...profile, dailyGoal: Number(e.target.value) })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Tracked daily on your dashboard.</p>
              </div>
            </div>
          )}
          {user?.centreName && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-slate-300">Coaching Centre</p>
              <p className="flex h-10 items-center gap-2 rounded-lg bg-gray-50 px-3 text-sm text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                <Building2 className="h-4 w-4 text-gray-400" />{user.centreName}
              </p>
            </div>
          )}
          <Button onClick={saveProfile} loading={savingProfile} className="gap-2">
            {profileSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {profileSaved ? "Saved!" : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-5 w-5 text-gray-400" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">{passwordError}</div>}
          {passwordSaved && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-300">Password changed!</div>}
          <Input label="Current Password" type="password" value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} placeholder="Enter current password" />
          <Input label="New Password" type="password" value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} placeholder="Min 6 characters" />
          <Input label="Confirm New Password" type="password" value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} placeholder="Re-enter new password" />
          <Button onClick={changePassword} loading={savingPassword} variant="outline" className="gap-2"
            disabled={!passwords.currentPassword || !passwords.newPassword}>
            {passwordSaved ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {passwordSaved ? "Changed!" : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Centre Branding (Centre Admin Only) */}
      {isCentreAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-5 w-5 text-gray-400" />
              Centre Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Customize how your centre appears to students. Only your students will see this branding.
            </p>
            <Input label="Centre Name" value={centre.name}
              onChange={(e) => setCentre({ ...centre, name: e.target.value })} placeholder="Your coaching centre name" />
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Phone className="absolute left-3 top-[38px] h-4 w-4 text-gray-400" />
                <Input label="Phone" value={centre.phone}
                  onChange={(e) => setCentre({ ...centre, phone: e.target.value })} placeholder="+91 98765..." className="pl-10" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-[38px] h-4 w-4 text-gray-400" />
                <Input label="Email" value={centre.email}
                  onChange={(e) => setCentre({ ...centre, email: e.target.value })} placeholder="info@..." className="pl-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" value={centre.city} onChange={(e) => setCentre({ ...centre, city: e.target.value })} placeholder="Kaithal" />
              <Input label="State" value={centre.state} onChange={(e) => setCentre({ ...centre, state: e.target.value })} placeholder="Haryana" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-[38px] h-4 w-4 text-gray-400" />
              <Input label="Address" value={centre.address}
                onChange={(e) => setCentre({ ...centre, address: e.target.value })} placeholder="Full address" className="pl-10" />
            </div>
            <div className="relative">
              <Globe className="absolute left-3 top-[38px] h-4 w-4 text-gray-400" />
              <Input label="Website (optional)" value={centre.website}
                onChange={(e) => setCentre({ ...centre, website: e.target.value })} placeholder="https://..." className="pl-10" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">Brand Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={centre.primaryColor}
                  onChange={(e) => setCentre({ ...centre, primaryColor: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 dark:border-slate-600" />
                <span className="text-sm text-gray-500 dark:text-slate-400">{centre.primaryColor}</span>
                <div className="ml-2 flex gap-2">
                  {["#0D9488", "#4F46E5", "#2563EB", "#DC2626", "#D97706", "#059669"].map((c) => (
                    <button key={c} onClick={() => setCentre({ ...centre, primaryColor: c })}
                      className={`h-8 w-8 rounded-full border-2 transition ${centre.primaryColor === c ? "border-gray-900 scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={saveCentreBranding} loading={savingCentre} className="gap-2">
              {centreSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {centreSaved ? "Saved!" : "Save Centre Branding"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Account Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-slate-700/50">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Role</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{user?.role?.replace(/_/g, " ")}</p>
            </div>
            <Badge variant="secondary">{user?.role?.replace(/_/g, " ")}</Badge>
          </div>
          {user?.centreSlug && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-slate-700/50">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Centre Code</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Share with students to register under your centre</p>
              </div>
              <code className="rounded border border-teal-200 bg-white px-2 py-1 font-mono text-sm text-teal-700 dark:border-teal-900 dark:bg-slate-700 dark:text-teal-300">{user.centreSlug}</code>
            </div>
          )}
          <div className="pt-2">
            <Button variant="destructive" onClick={async () => {
              const ok = await confirm({
                title: "Log out?",
                description: "You'll be signed out of your account on this device.",
                confirmLabel: "Log out",
                cancelLabel: "Stay",
                variant: "warning",
              });
              if (ok) signOut({ callbackUrl: "/login" });
            }} className="gap-2">
              <LogOut className="h-4 w-4" /> Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
