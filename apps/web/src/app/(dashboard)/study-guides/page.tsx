"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic, PenTool, BookOpen, Headphones,
  ArrowRight, Lightbulb, FileText, Star, ChevronDown, ChevronUp,
} from "lucide-react";

interface Template {
  id: string;
  title: string;
  questionType: string;
  content: string;
  language: string;
  isPremium: boolean;
}

const guides = [
  {
    section: "Speaking",
    icon: Mic,
    gradient: "from-teal-500 to-teal-600",
    tips: [
      {
        title: "Read Aloud Strategy",
        description: "How to score 79+ in Read Aloud with proper pacing and pronunciation",
        slug: "read-aloud-strategy",
        content: `How to ace Read Aloud:

1. PREP PHASE (30 seconds before recording):
   • Skim the text once — identify difficult words
   • Note punctuation (commas = short pause, periods = full pause)
   • Say tough words silently before recording starts

2. WHILE RECORDING (40 seconds):
   • Start speaking within 1–2 seconds (don't wait too long)
   • Pace: Natural — not too fast, not too slow (~150 words/min)
   • Pause at commas (0.5s) and periods (1s)
   • Keep volume consistent — don't trail off
   • Continue even if you make a mistake — don't restart

3. COMMON MISTAKES TO AVOID:
   • Reading too fast (lowers fluency score)
   • Mumbling the last word of each sentence
   • Long pauses mid-sentence
   • Monotone voice (vary pitch slightly)

4. SCORING TIP:
   Content (40%) + Pronunciation (30%) + Fluency (30%)
   You NEED all three — one weak area will cap your score.`,
      },
      {
        title: "Repeat Sentence Tips",
        description: "Memory techniques to remember and repeat long sentences accurately",
        slug: "repeat-sentence-tips",
        content: `Repeat Sentence — Memory Hacks:

1. LISTEN ACTIVELY:
   • Don't try to memorize word-by-word
   • Focus on MEANING — visualize what's being described
   • Note the sentence structure (subject → verb → object)

2. CHUNKING TECHNIQUE:
   Break sentence into 3–4 meaningful groups:
   "The teenage brain / is not just / an adult brain / with fewer miles on it."

3. IMMEDIATE REPETITION:
   • Start speaking within 1–2 seconds after beep
   • If you forget a word, say something similar — DON'T stop
   • Keep the SAME intonation as the original audio

4. SCORING TIP:
   Even getting 70% of words right → good content score
   Fluency matters MORE than perfection. Say it smoothly.`,
      },
      {
        title: "Describe Image Template",
        description: "A proven template that works for graphs, charts, maps, and processes",
        slug: "describe-image-template",
        content: `Describe Image — Universal Template (40 seconds):

INTRODUCTION (5 sec):
"The image shows / illustrates [type: graph/chart/map/process] about [topic]."

MAIN FEATURES (15 sec):
"The most notable feature is [highest/biggest/key element].
Meanwhile, [second notable element] is also significant."

COMPARISON/TREND (15 sec):
For graphs: "There is a clear [upward/downward] trend from [X] to [Y]."
For charts: "[Category A] is higher than [Category B] by [amount]."
For maps: "[Location 1] is located to the [direction] of [Location 2]."

CONCLUSION (5 sec):
"Overall, the image suggests that [main takeaway]."

TIPS:
• Use varied vocabulary: illustrates, depicts, represents, highlights
• Include at least 2 specific numbers/labels from the image
• Don't repeat the same words — use synonyms`,
      },
      {
        title: "Re-tell Lecture Strategy",
        description: "Note-taking method to capture key points and re-tell effectively",
        slug: "retell-lecture-strategy",
        content: `Re-tell Lecture — 3-Column Note Method:

WHILE LISTENING, USE 3 COLUMNS:
| WHO/WHAT | KEY POINTS | NUMBERS/EXAMPLES |

EXAMPLE for a lecture on climate change:
| Scientists | Rising temps | 2°C by 2050 |
| Governments | New policies | Paris Agreement |
| Oceans | Sea level up | 8cm/decade |

RECORDING STRUCTURE (40 seconds):
1. TOPIC (5 sec): "The lecture was about [topic]."
2. KEY POINTS (25 sec): "The speaker mentioned [point 1] and [point 2]..."
3. EVIDENCE (8 sec): "For example, [specific data]..."
4. CONCLUSION (2 sec): "In summary, [main idea]."

POWER PHRASES:
• "The speaker emphasized..."
• "According to the lecture..."
• "It was also mentioned that..."
• "Another important point is..."`,
      },
    ],
  },
  {
    section: "Writing",
    icon: PenTool,
    gradient: "from-blue-500 to-blue-600",
    tips: [
      {
        title: "Essay Templates — 3 types",
        description: "3 proven essay templates: agree/disagree, discuss both sides, problem/solution",
        slug: "essay-templates",
        content: `3 Essay Templates (200–300 words):

=== TEMPLATE 1: AGREE/DISAGREE ===
Para 1 (Intro): Many people believe [topic]. I strongly agree/disagree with this view for several reasons.
Para 2: Firstly, [reason 1]. For example, [example].
Para 3: Moreover, [reason 2]. This is evident because [explanation].
Para 4 (Conclusion): In conclusion, [restate position]. Therefore, [final thought].

=== TEMPLATE 2: DISCUSS BOTH SIDES ===
Para 1 (Intro): There is an ongoing debate about [topic]. This essay will examine both views before concluding.
Para 2 (Side A): On one hand, [advocates argue X]. They believe [reason + example].
Para 3 (Side B): On the other hand, [critics argue Y]. They point out [reason + example].
Para 4 (Conclusion): While both sides have merit, I believe [your stance] because [brief justification].

=== TEMPLATE 3: PROBLEM/SOLUTION ===
Para 1 (Intro): [Problem] has become a serious issue in modern society. This essay will discuss the causes and suggest solutions.
Para 2 (Causes): There are two main causes. First, [cause 1]. Second, [cause 2].
Para 3 (Solutions): To address this, [solution 1]. Additionally, [solution 2].
Para 4 (Conclusion): In conclusion, [restate problem + solutions].`,
      },
      {
        title: "SWT One-Sentence Formula",
        description: "How to write a perfect one-sentence summary every time",
        slug: "swt-formula",
        content: `Summarize Written Text — The Formula:

RULE: One sentence, 5–75 words, use CONJUNCTIONS to connect ideas.

FORMULA:
[Main idea], while/whereas [contrast point], and [supporting point], which [conclusion].

STEPS:
1. Find the TOPIC sentence (usually first or last of paragraph)
2. Identify 2–3 SUPPORTING points
3. Connect them using:
   • "while" / "whereas" (for contrast)
   • "and" / "moreover" (for addition)
   • "which" / "because" (for cause)
4. Keep it under 75 words — aim for 40–60

EXAMPLE:
Passage is about ocean pollution →
"Ocean pollution, caused mainly by plastic waste and industrial chemicals, threatens marine ecosystems and human health, while also disrupting the global food chain, which highlights the urgent need for international cooperation and stricter regulations."

CHECKLIST:
✓ ONE sentence only (no periods in middle)
✓ 5–75 words
✓ Covers main idea + key supporting points
✓ Grammatically correct`,
      },
      {
        title: "Grammar Checklist",
        description: "Top 10 grammar mistakes Indian students make in PTE Writing",
        slug: "grammar-checklist",
        content: `Top 10 Grammar Mistakes to Avoid:

1. SUBJECT-VERB AGREEMENT
   ❌ "The government are..." → ✓ "The government is..."

2. ARTICLES (a/an/the)
   ❌ "She is teacher." → ✓ "She is a teacher."
   ❌ "Sun rises in east." → ✓ "The sun rises in the east."

3. PREPOSITIONS
   ❌ "Discuss about..." → ✓ "Discuss..."
   ❌ "Different than..." → ✓ "Different from..."

4. TENSE CONSISTENCY
   ❌ "He went to the store and buys milk." → ✓ "He went to the store and bought milk."

5. COUNTABLE/UNCOUNTABLE NOUNS
   ❌ "Many informations" → ✓ "Much information"
   ❌ "Furniture's" → ✓ "Pieces of furniture"

6. "PEOPLE" vs "PERSONS"
   Use "people" for plural, "persons" only in legal contexts.

7. "FEWER" vs "LESS"
   Fewer for countable (fewer people), less for uncountable (less time).

8. DOUBLE NEGATIVES
   ❌ "I don't have no money." → ✓ "I don't have any money."

9. APOSTROPHES
   "its" = possessive | "it's" = it is
   "your" = possessive | "you're" = you are

10. MODAL VERBS
    ❌ "I can be able to..." → ✓ "I can..." or "I am able to..."`,
      },
      {
        title: "Linking Words Bank",
        description: "Essential linking words and phrases for cohesion and scoring high",
        slug: "linking-words",
        content: `Essential Linking Words (use 4–6 in your essay):

=== ADDING IDEAS ===
• Moreover, Furthermore, In addition, Besides this
• Additionally, What's more, Not only... but also

=== CONTRASTING IDEAS ===
• However, Nevertheless, On the other hand
• Although, Despite, In contrast, Whereas

=== SHOWING CAUSE ===
• Because, Due to, Owing to, As a result of
• Since, Given that, On account of

=== SHOWING EFFECT ===
• Therefore, Consequently, Thus, Hence
• As a result, For this reason, Accordingly

=== GIVING EXAMPLES ===
• For instance, For example, Such as
• Namely, In particular, To illustrate

=== CONCLUDING ===
• In conclusion, To sum up, Overall
• To conclude, In brief, All in all

=== SEQUENCING ===
• Firstly, Secondly, Finally, Lastly
• Initially, Subsequently, Eventually

TIP: Use ONE linking word per paragraph start, avoid repeating the same one.`,
      },
    ],
  },
  {
    section: "Reading",
    icon: BookOpen,
    gradient: "from-purple-500 to-purple-600",
    tips: [
      {
        title: "Reorder Paragraphs Strategy",
        description: "Step-by-step approach to identify the correct order quickly",
        slug: "reorder-strategy",
        content: `Reorder Paragraphs — The 4-Step Method:

STEP 1: FIND THE OPENER
• Usually a GENERAL statement (not specific)
• No reference to "this", "that", "it", "they"
• Introduces the topic broadly

STEP 2: SPOT THE CLOSER
• Contains conclusion words: "therefore", "thus", "finally", "in conclusion"
• Summarizes or makes a final point
• Often has "this/these" referring back

STEP 3: CONNECT THE MIDDLE
Look for CHAINS:
• Pronouns: "it", "they", "this" → refers to something mentioned
• Transition words: "however", "moreover", "for example"
• Repeated/related keywords

STEP 4: VERIFY THE FLOW
Read the final order — does it flow logically?
Each paragraph should lead naturally to the next.

COMMON CLUES:
• "In recent years..." → Often opener
• "However..." → Follows a positive statement
• "For example..." → Gives evidence for previous claim
• "As a result..." → Shows consequence

PRACTICE TIP:
Don't waste time trying to memorize — drag and re-read aloud. Your ear will catch awkward orderings.`,
      },
      {
        title: "Fill in Blanks Technique",
        description: "Contextual clues and collocations to fill blanks accurately",
        slug: "fill-blanks-technique",
        content: `Fill in Blanks — The CLUE Method:

C — CONTEXT: Read the full sentence (and surrounding ones)
L — LOGIC: Does the word make sense grammatically?
U — USAGE: Check if it's a common collocation
E — ELIMINATE: Cross out obviously wrong options

COLLOCATIONS (words that go together):
• "make a decision" NOT "do a decision"
• "heavy rain" NOT "strong rain"
• "take a risk" NOT "make a risk"
• "pay attention" NOT "give attention"

GRAMMAR CLUES:
• If blank follows "a/an" → singular noun
• If blank follows "the" → could be anything
• If blank follows "to" → usually a verb (base form)
• If blank follows preposition → noun or gerund (-ing)

MEANING CLUES:
• "although", "however" → contrast expected
• "because", "therefore" → cause/effect
• "for example" → specific instance coming

DRAG vs DROPDOWN:
• DRAG: Words are shared — match carefully
• DROPDOWN: Each blank has its OWN options — read local context

TIP: If unsure between 2 options, pick the one that sounds more NATURAL in English.`,
      },
      {
        title: "MCQ Elimination Method",
        description: "How to eliminate wrong answers and pick the right one",
        slug: "mcq-elimination",
        content: `MCQ — Elimination Technique:

ELIMINATE options that:

1. CONTAIN EXTREME WORDS (usually wrong)
   • "always", "never", "everyone", "nobody", "only"

2. CONTRADICT THE PASSAGE
   If the passage says "some people believe X", an option saying "everyone believes X" is wrong.

3. ARE TOO SPECIFIC OR TOO GENERAL
   If passage is about environmental issues broadly, skip options about just one species.

4. INTRODUCE NEW INFORMATION
   Correct answer must come FROM the passage — not your outside knowledge.

5. PARTIALLY TRUE
   If an option has one correct + one wrong element, it's wrong.

FIND THE ANSWER BY:

✓ IDENTIFY KEYWORDS in the question
✓ SCAN the passage for matching keywords
✓ READ 2–3 lines around those keywords carefully
✓ Match meaning, NOT exact words (PTE uses paraphrasing)

SINGLE vs MULTIPLE:
• Single: Pick ONE best answer
• Multiple: Usually 2–3 correct — missing one = wrong question. Check all carefully.

TIMING:
Don't spend more than 90 seconds per MCQ. If stuck, mark your best guess and move on.`,
      },
    ],
  },
  {
    section: "Listening",
    icon: Headphones,
    gradient: "from-orange-500 to-orange-600",
    tips: [
      {
        title: "Write from Dictation Strategy",
        description: "This question type gives the highest marks — learn how to ace it",
        slug: "dictation-strategy",
        content: `Write from Dictation — The MVP Question:

WHY IT MATTERS:
• Contributes to 3 scoring categories: Listening, Writing, AND spelling
• Each word you get right = marks across MULTIPLE sections
• Missing one WFD can cost you 5–10 points overall

THE TECHNIQUE:

1. BEFORE AUDIO PLAYS:
   • Take a deep breath
   • Clear your notepad
   • Pen ready to write

2. DURING AUDIO (only plays ONCE):
   • Write abbreviations for longer words
   • Use symbols: & (and), w/ (with), b/c (because)
   • Note down EVERY word you catch

3. IMMEDIATELY AFTER:
   • Fill in gaps from memory
   • Re-check word endings (-s, -ed, -ing)
   • Check articles (a/an/the)
   • Verify capitalization and punctuation

COMMON TRAPS:
• Words that sound similar: "their/there", "to/two/too"
• Silent letters: "knight", "through", "receipt"
• Past tense endings: "walked" (sounds like "walkt")

PRACTICE TIP:
Listen to BBC News or podcasts and try transcribing 1 sentence daily. Your ear will get sharper.

SCORING:
Every correct word = 1 point
Spelling matters — "climat" ≠ "climate"`,
      },
      {
        title: "Summarize Spoken Text Template",
        description: "A simple template that covers all scoring criteria",
        slug: "spoken-text-template",
        content: `Summarize Spoken Text — Template (50–70 words):

WHILE LISTENING:
Take notes in this format:
• TOPIC: What is the speaker talking about?
• MAIN CLAIM: What's the central point?
• 2–3 KEY DETAILS: Examples, data, reasons
• CONCLUSION: Final thought or implication

TEMPLATE:

"The speaker discusses [TOPIC], emphasizing that [MAIN CLAIM]. According to the lecture, [KEY DETAIL 1] and [KEY DETAIL 2]. Additionally, [another point or example]. In conclusion, the speaker suggests that [CONCLUSION/IMPLICATION]."

EXAMPLE (on climate change):
"The speaker discusses climate change, emphasizing that rising global temperatures are primarily caused by human activity. According to the lecture, greenhouse gas emissions have increased significantly over the past century, and deforestation has accelerated the problem. Additionally, the speaker mentions that rising sea levels threaten coastal cities. In conclusion, the speaker suggests that immediate international action is essential to prevent catastrophic effects."

WORD COUNT CHECKLIST:
• 50–70 words (not less, not more)
• 2–4 complete sentences
• No bullet points — flowing prose only
• Proper grammar and punctuation`,
      },
      {
        title: "Note-taking for Listening",
        description: "Efficient shorthand techniques for PTE listening questions",
        slug: "listening-notes",
        content: `Note-taking for Listening — Shorthand System:

SYMBOLS TO LEARN:
• → leads to, causes
• ↑ increase, rise
• ↓ decrease, fall
• = equals, is the same as
• ≠ not, is different from
• ∴ therefore
• ∵ because
• + and, plus
• — minus, but
• ? question, uncertain

ABBREVIATIONS:
• w/ (with), w/o (without)
• b/c (because), b4 (before)
• govt (government)
• env (environment)
• ppl (people)
• info (information)
• ASAP (as soon as possible)

STRUCTURE YOUR NOTES:
Use a T-chart or mind map:

  MAIN TOPIC
  ├── Point 1
  │   ├── Example
  │   └── Data
  ├── Point 2
  │   └── Example
  └── Conclusion

SPEED TIPS:
• Don't write full sentences — just keywords
• Skip articles (a/an/the) and common verbs
• Use the FIRST letter of long words
• Leave space between sections — easier to read later

LISTEN FOR SIGNAL WORDS:
• "The most important thing is..." → Key point coming
• "For example..." → Supporting evidence
• "In conclusion..." → Summary
• "Research shows..." → Factual data to note

PRACTICE:
Watch TED Talks daily and take notes. Review them after to check accuracy.`,
      },
    ],
  },
];

export default function StudyGuidesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [expandedTipSlug, setExpandedTipSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTemplates(data.data || []);
      })
      .catch(() => { /* ignore */ });
  }, []);

  const formatType = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Study Guides</h1>
        <p className="mt-1 text-gray-500 dark:text-slate-400">Tips, strategies, and templates for every PTE question type</p>
      </div>

      {/* Quick Tips Banner */}
      <Card className="rounded-[2rem] border-none shadow-glass bg-amber-500/10 backdrop-blur-xl ring-1 ring-amber-500/20">
        <CardContent className="flex items-center gap-4 p-5">
          <Lightbulb className="h-8 w-8 shrink-0 text-amber-500" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">Quick Tip of the Day</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              In PTE, Write from Dictation and Read Aloud contribute to MULTIPLE scoring categories.
              Prioritize these question types — they have the highest impact on your overall score.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Templates Section */}
      {templates.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Ready-to-use Templates</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Adapt these templates for faster, higher-scoring answers</p>
            </div>
          </div>
          <div className="space-y-3">
            {templates.map((t) => {
              const isExpanded = expandedTemplateId === t.id;
              return (
                <Card key={t.id} className="rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden transition-all duration-700 ease-fluid hover:shadow-float hover:-translate-y-1">
                  <CardContent className="p-0">
                    <button
                      onClick={() => setExpandedTemplateId(isExpanded ? null : t.id)}
                      className="flex w-full items-center justify-between p-5 text-left hover:bg-muted-foreground/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 shadow-inner">
                          <FileText className="h-6 w-6 text-indigo-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-slate-100">{t.title}</h3>
                            {t.isPremium && (
                              <Badge variant="warning" className="gap-1">
                                <Star className="h-3 w-3" /> Premium
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="mt-1.5 text-xs rounded-full shadow-sm font-bold">
                            {formatType(t.questionType)}
                          </Badge>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                          {t.content}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Section-wise Guides */}
      {guides.map((section) => (
        <div key={section.section}>
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${section.gradient}`}>
              <section.icon className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{section.section} Guides</h2>
          </div>
          <div className="space-y-3">
            {section.tips.map((tip) => {
              const isExpanded = expandedTipSlug === tip.slug;
              return (
                <Card key={tip.slug} className="rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden transition-all duration-700 ease-fluid hover:shadow-float hover:-translate-y-1">
                  <CardContent className="p-0">
                    <button
                      onClick={() => setExpandedTipSlug(isExpanded ? null : tip.slug)}
                      className="group flex w-full items-center justify-between p-5 text-left hover:bg-muted-foreground/5 transition-colors"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-slate-100">{tip.title}</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{tip.description}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-gray-600" />
                      ) : (
                        <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-gray-600 group-hover:translate-x-0.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/5 bg-background/30 p-6 backdrop-blur-md">
                        <div className="whitespace-pre-wrap rounded-2xl bg-background/50 p-6 text-sm font-medium leading-relaxed text-muted-foreground/90 shadow-inner ring-1 ring-white/5">
                          {(tip as any).content || "Content coming soon..."}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
