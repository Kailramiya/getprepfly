import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from "react-native";
import { useAuthStore } from "../stores/auth-store";

const sections = [
  { key: "speaking", title: "Speaking", emoji: "🎤", color: "#0D9488", types: 6 },
  { key: "writing", title: "Writing", emoji: "✏️", color: "#2563EB", types: 2 },
  { key: "reading", title: "Reading", emoji: "📖", color: "#7C3AED", types: 5 },
  { key: "listening", title: "Listening", emoji: "🎧", color: "#EA580C", types: 7 },
];

export default function DashboardScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name?.split(" ")[0] || "Student"}!</Text>
          </View>
          <TouchableOpacity style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mock Test CTA */}
        <TouchableOpacity
          style={styles.mockTestCard}
          onPress={() => navigation.navigate("MockTest")}
        >
          <Text style={styles.mockTestEmoji}>📝</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.mockTestTitle}>Start Mock Test</Text>
            <Text style={styles.mockTestSub}>Simulate the real PTE exam</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Streak", value: "0 days", emoji: "🔥" },
            { label: "Done", value: "0", emoji: "🎯" },
            { label: "Score", value: "--", emoji: "📈" },
            { label: "Time", value: "0h", emoji: "⏱️" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={{ fontSize: 20 }}>{stat.emoji}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Practice Sections */}
        <Text style={styles.sectionTitle}>Practice by Section</Text>
        <View style={styles.sectionsGrid}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.key}
              style={styles.sectionCard}
              onPress={() => navigation.navigate("Practice", { section: section.key })}
            >
              <View style={[styles.sectionIcon, { backgroundColor: section.color + "20" }]}>
                <Text style={{ fontSize: 28 }}>{section.emoji}</Text>
              </View>
              <Text style={styles.sectionName}>{section.title}</Text>
              <Text style={styles.sectionTypes}>{section.types} types</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>More</Text>
        {[
          { title: "Progress & Analytics", emoji: "📊", screen: "Progress" },
          { title: "Study Guides", emoji: "📚", screen: "StudyGuides" },
          { title: "Vocabulary Builder", emoji: "📝", screen: "Vocabulary" },
          { title: "Settings", emoji: "⚙️", screen: "Settings" },
        ].map((item) => (
          <TouchableOpacity
            key={item.title}
            style={styles.listItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
            <Text style={styles.listItemText}>{item.title}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  welcome: { fontSize: 14, color: "#6B7280" },
  name: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#EEF2FF",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "bold", color: "#4F46E5" },

  mockTestCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#4F46E5",
    borderRadius: 16, padding: 16, marginBottom: 16, gap: 12,
  },
  mockTestEmoji: { fontSize: 32 },
  mockTestTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  mockTestSub: { fontSize: 12, color: "#C7D2FE", marginTop: 2 },
  arrow: { fontSize: 20, color: "#fff" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: "#F3F4F6",
  },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#111827", marginTop: 4 },
  statLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },

  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 12 },
  sectionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  sectionCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  sectionIcon: {
    width: 56, height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center",
    marginBottom: 8,
  },
  sectionName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  sectionTypes: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  listItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  listItemText: { flex: 1, fontSize: 15, fontWeight: "500", color: "#111827" },
});
