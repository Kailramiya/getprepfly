import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from "react-native";
import { questionsApi } from "../lib/api";

const SECTION_CONFIG: Record<string, {
  title: string; emoji: string; color: string;
  types: { type: string; label: string; time: string }[];
}> = {
  speaking: {
    title: "Speaking", emoji: "🎤", color: "#0D9488",
    types: [
      { type: "READ_ALOUD", label: "Read Aloud", time: "40s" },
      { type: "REPEAT_SENTENCE", label: "Repeat Sentence", time: "15s" },
      { type: "DESCRIBE_IMAGE", label: "Describe Image", time: "40s" },
      { type: "RETELL_LECTURE", label: "Re-tell Lecture", time: "40s" },
      { type: "ANSWER_SHORT_QUESTION", label: "Answer Short Question", time: "10s" },
      { type: "RESPOND_TO_SITUATION", label: "Respond to Situation", time: "20s" },
    ],
  },
  writing: {
    title: "Writing", emoji: "✏️", color: "#2563EB",
    types: [
      { type: "SUMMARIZE_WRITTEN_TEXT", label: "Summarize Written Text", time: "10m" },
      { type: "WRITE_ESSAY", label: "Write Essay", time: "20m" },
    ],
  },
  reading: {
    title: "Reading", emoji: "📖", color: "#7C3AED",
    types: [
      { type: "READING_MCQ_SINGLE", label: "MCQ (Single)", time: "2m" },
      { type: "READING_MCQ_MULTIPLE", label: "MCQ (Multiple)", time: "2m" },
      { type: "REORDER_PARAGRAPHS", label: "Re-order Paragraphs", time: "2m" },
      { type: "READING_FILL_BLANKS_DRAG", label: "Fill Blanks (Drag)", time: "2m" },
      { type: "READING_FILL_BLANKS_DROPDOWN", label: "Fill Blanks (Dropdown)", time: "2m" },
    ],
  },
  listening: {
    title: "Listening", emoji: "🎧", color: "#EA580C",
    types: [
      { type: "SUMMARIZE_SPOKEN_TEXT", label: "Summarize Spoken Text", time: "10m" },
      { type: "LISTENING_MCQ_SINGLE", label: "MCQ (Single)", time: "2m" },
      { type: "LISTENING_MCQ_MULTIPLE", label: "MCQ (Multiple)", time: "2m" },
      { type: "LISTENING_FILL_BLANKS", label: "Fill in Blanks", time: "2m" },
      { type: "HIGHLIGHT_CORRECT_SUMMARY", label: "Correct Summary", time: "2m" },
      { type: "SELECT_MISSING_WORD", label: "Missing Word", time: "2m" },
      { type: "WRITE_FROM_DICTATION", label: "Write from Dictation", time: "1m" },
    ],
  },
};

export default function PracticeScreen({ route, navigation }: any) {
  const sectionKey = route.params?.section || "speaking";
  const config = SECTION_CONFIG[sectionKey];
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    questionsApi.list({ section: config.title.toUpperCase(), pageSize: "1" })
      .then((res) => setQuestionCount(res.data.data?.total || 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [config.title]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: config.color }]}>
          <Text style={{ fontSize: 40 }}>{config.emoji}</Text>
          <View>
            <Text style={styles.headerTitle}>{config.title} Practice</Text>
            <Text style={styles.headerSub}>
              {config.types.length} question types • {loading ? "..." : questionCount} questions
            </Text>
          </View>
        </View>

        {/* Question Types */}
        {config.types.map((qt, i) => (
          <TouchableOpacity
            key={qt.type}
            style={styles.typeCard}
            onPress={() => navigation.navigate("QuestionPractice", {
              section: sectionKey,
              type: qt.type,
              label: qt.label,
            })}
          >
            <View style={[styles.typeNumber, { backgroundColor: config.color + "20" }]}>
              <Text style={[styles.typeNumberText, { color: config.color }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.typeName}>{qt.label}</Text>
              <Text style={styles.typeTime}>{qt.time}</Text>
            </View>
            <Text style={{ color: "#D1D5DB", fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { padding: 16 },
  headerCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    borderRadius: 20, padding: 20, marginBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  typeCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, padding: 16, marginBottom: 10, gap: 14,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  typeNumber: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  typeNumberText: { fontSize: 16, fontWeight: "bold" },
  typeName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  typeTime: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
});
