import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { authApi } from "../lib/api";
import { useAuthStore } from "../stores/auth-store";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(email.trim(), password);
      const { user, token } = res.data;
      await setAuth(user, token);
    } catch (err: any) {
      Alert.alert("Login Failed", err.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.appName}>PTE Master</Text>
          <Text style={styles.tagline}>AI-Powered PTE Practice</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.linkText}>
            Don&apos;t have an account? <Text style={styles.linkBold}>Sign up free</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  logoContainer: { alignItems: "center", marginBottom: 40 },
  logoIcon: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center",
  },
  logoText: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  appName: { marginTop: 12, fontSize: 24, fontWeight: "bold", color: "#111827" },
  tagline: { marginTop: 4, fontSize: 14, color: "#6B7280" },
  form: { gap: 12 },
  input: {
    height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#D1D5DB",
    backgroundColor: "#fff", paddingHorizontal: 16, fontSize: 15, color: "#111827",
  },
  button: {
    height: 48, borderRadius: 12, backgroundColor: "#4F46E5",
    justifyContent: "center", alignItems: "center", marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkText: { textAlign: "center", marginTop: 20, fontSize: 14, color: "#6B7280" },
  linkBold: { color: "#4F46E5", fontWeight: "600" },
});
