import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create Super Admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@ptemaster.in" },
    update: {},
    create: {
      email: "admin@ptemaster.in",
      name: "Super Admin",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
      studentPlan: { create: { planType: "FREE" } },
    },
  });
  console.log("  Super Admin created:", admin.email);

  // 2. Create Sample Centre
  const centre = await db.centre.upsert({
    where: { slug: "divine-success" },
    update: {},
    create: {
      name: "Divine Success Immigration Consultancy",
      slug: "divine-success",
      email: "info@divinesuccess.com",
      phone: "+91-9876543210",
      city: "Kaithal",
      state: "Haryana",
      address: "Karnal Road, Kaithal",
      primaryColor: "#0D9488",
    },
  });
  console.log("  Centre created:", centre.name);

  // 3. Create Centre Admin
  const centreAdminPass = await bcrypt.hash("centre123", 12);
  const centreAdmin = await db.user.upsert({
    where: { email: "admin@divinesuccess.com" },
    update: {},
    create: {
      email: "admin@divinesuccess.com",
      name: "Centre Admin",
      passwordHash: centreAdminPass,
      role: "CENTRE_ADMIN",
      centreId: centre.id,
      emailVerified: new Date(),
      studentPlan: { create: { planType: "FREE" } },
    },
  });
  console.log("  Centre Admin created:", centreAdmin.email);

  // 4. Create Sample Student
  const studentPass = await bcrypt.hash("student123", 12);
  const student = await db.user.upsert({
    where: { email: "student@test.com" },
    update: {},
    create: {
      email: "student@test.com",
      name: "Rahul Sharma",
      passwordHash: studentPass,
      role: "STUDENT",
      centreId: centre.id,
      emailVerified: new Date(),
      studentPlan: { create: { planType: "VIP_90", endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } },
    },
  });
  console.log("  Student created:", student.email);

  // 5. Create Batch
  const batch = await db.batch.create({
    data: {
      name: "Morning Batch",
      centreId: centre.id,
      members: { create: { userId: student.id } },
    },
  });
  console.log("  Batch created:", batch.name);

  // 6. Seed Questions — all 20+ PTE types
  const questions = [
    // ===== SPEAKING =====
    {
      section: "SPEAKING", type: "READ_ALOUD", difficulty: "EASY",
      title: "Climate Change Impact",
      content: { text: "Climate change is one of the most pressing issues facing our planet today. Rising global temperatures are causing ice caps to melt, sea levels to rise, and weather patterns to become increasingly unpredictable. Scientists warn that without immediate action, the consequences could be irreversible." },
      modelAnswer: "The passage discusses climate change as a critical global issue, mentioning melting ice caps, rising sea levels, and unpredictable weather, with scientists urging immediate action.",
    },
    {
      section: "SPEAKING", type: "READ_ALOUD", difficulty: "MEDIUM",
      title: "Digital Economy",
      content: { text: "The digital economy has transformed the way businesses operate across the globe. E-commerce platforms have enabled small businesses to reach customers in distant markets, while digital payment systems have made transactions faster and more secure than ever before." },
    },
    {
      section: "SPEAKING", type: "READ_ALOUD", difficulty: "HARD",
      title: "Quantum Computing",
      content: { text: "Quantum computing represents a fundamental shift in computational paradigms. Unlike classical computers that process information in binary bits, quantum computers leverage quantum mechanical phenomena such as superposition and entanglement to perform calculations exponentially faster for certain types of problems." },
    },
    {
      section: "SPEAKING", type: "REPEAT_SENTENCE", difficulty: "EASY",
      title: "University Library",
      content: { audioUrl: "", transcript: "The university library is open until midnight during the exam period." },
    },
    {
      section: "SPEAKING", type: "REPEAT_SENTENCE", difficulty: "MEDIUM",
      title: "Economic Growth",
      content: { audioUrl: "", transcript: "Economic growth in developing countries has been driven primarily by technological innovation and foreign investment." },
    },
    {
      section: "SPEAKING", type: "DESCRIBE_IMAGE", difficulty: "MEDIUM",
      title: "Population Growth Chart",
      content: { imageUrl: "", sampleAnswer: "The bar chart illustrates the population growth across five major cities from 2010 to 2020. The most significant increase was observed in Delhi, which grew by approximately 25 percent. Mumbai and Bangalore also showed substantial growth, while Chennai and Kolkata experienced moderate increases." },
    },
    {
      section: "SPEAKING", type: "ANSWER_SHORT_QUESTION", difficulty: "EASY",
      title: "Capital of France",
      content: { audioUrl: "", question: "What is the capital of France?", acceptedAnswers: ["Paris", "paris"] },
    },
    {
      section: "SPEAKING", type: "ANSWER_SHORT_QUESTION", difficulty: "EASY",
      title: "Water Boiling Point",
      content: { audioUrl: "", question: "At what temperature does water boil in degrees Celsius?", acceptedAnswers: ["100", "one hundred", "hundred"] },
    },

    // ===== WRITING =====
    {
      section: "WRITING", type: "SUMMARIZE_WRITTEN_TEXT", difficulty: "MEDIUM",
      title: "Renewable Energy Transition",
      content: {
        passage: "The global transition to renewable energy sources is accelerating at an unprecedented pace. Solar and wind power costs have plummeted by over 70% in the past decade, making them competitive with fossil fuels in many markets. Governments worldwide are implementing ambitious targets to achieve net-zero emissions by 2050, driving massive investments in clean energy infrastructure. However, challenges remain, including the intermittent nature of renewable sources, the need for improved energy storage solutions, and the requirement for upgraded power grids to handle distributed generation. Despite these obstacles, experts predict that renewables will account for over 80% of global electricity generation by 2040.",
        sampleAnswer: "The global shift to renewable energy is accelerating due to significant cost reductions in solar and wind power, government net-zero targets, and massive clean energy investments, though challenges such as intermittency, storage limitations, and grid upgrades persist.",
      },
    },
    {
      section: "WRITING", type: "WRITE_ESSAY", difficulty: "MEDIUM",
      title: "Technology in Education",
      content: {
        prompt: "Some people believe that technology has made education more accessible and effective, while others argue that it has created more distractions and reduced the quality of learning. Discuss both views and give your opinion.",
        minWords: 200,
        maxWords: 300,
        sampleAnswer: "Technology has fundamentally transformed the educational landscape, bringing both significant advantages and notable challenges. On one hand, digital tools have democratized access to education, allowing students in remote areas to attend world-class lectures through online platforms. On the other hand, the constant presence of devices has introduced unprecedented levels of distraction. In my view, the benefits outweigh the drawbacks when technology is implemented thoughtfully.",
      },
    },
    {
      section: "WRITING", type: "WRITE_ESSAY", difficulty: "HARD",
      title: "Urbanization Effects",
      content: {
        prompt: "Rapid urbanization in developing countries brings both economic opportunities and social challenges. To what extent do you agree that the benefits of urbanization outweigh its drawbacks?",
        minWords: 200,
        maxWords: 300,
      },
    },

    // ===== READING =====
    {
      section: "READING", type: "READING_MCQ_SINGLE", difficulty: "EASY",
      title: "Photosynthesis Process",
      content: {
        passage: "Photosynthesis is the process by which green plants convert sunlight into chemical energy. During this process, plants absorb carbon dioxide from the atmosphere and water from the soil. Using the energy from sunlight, they convert these raw materials into glucose and oxygen. The glucose serves as food for the plant, while oxygen is released into the atmosphere as a byproduct.",
        question: "What is the primary purpose of photosynthesis?",
        options: [
          "To release carbon dioxide into the atmosphere",
          "To convert sunlight into chemical energy for the plant",
          "To absorb oxygen from the atmosphere",
          "To decompose organic matter in the soil",
        ],
        correctAnswers: [1],
      },
    },
    {
      section: "READING", type: "READING_MCQ_MULTIPLE", difficulty: "MEDIUM",
      title: "Artificial Intelligence Applications",
      content: {
        passage: "Artificial intelligence is being applied across numerous sectors. In healthcare, AI algorithms can analyze medical images to detect diseases earlier than human doctors. In finance, machine learning models predict market trends and detect fraudulent transactions. The transportation sector uses AI for autonomous vehicles and traffic optimization. Meanwhile, in education, AI-powered tutoring systems provide personalized learning experiences for students.",
        question: "According to the passage, in which sectors is AI being applied?",
        options: [
          "Healthcare and disease detection",
          "Agriculture and crop management",
          "Finance and fraud detection",
          "Mining and resource extraction",
          "Education and personalized learning",
        ],
        correctAnswers: [0, 2, 4],
      },
    },
    {
      section: "READING", type: "REORDER_PARAGRAPHS", difficulty: "MEDIUM",
      title: "History of the Internet",
      content: {
        paragraphs: [
          "The World Wide Web was invented by Tim Berners-Lee in 1989, making the internet accessible to ordinary users.",
          "The internet originated as ARPANET, a US military project in the late 1960s.",
          "Today, the internet connects billions of people worldwide and has become essential for commerce, communication, and entertainment.",
          "By the 1980s, the network had expanded to universities and research institutions.",
          "The introduction of smartphones in the 2000s further accelerated internet adoption globally.",
        ],
        correctOrder: [1, 3, 0, 4, 2],
      },
      explanation: "The correct chronological order starts with ARPANET (1960s), expansion to universities (1980s), WWW invention (1989), smartphones (2000s), and the current state.",
    },
    {
      section: "READING", type: "READING_FILL_BLANKS_DROPDOWN", difficulty: "MEDIUM",
      title: "Ocean Pollution",
      content: {
        passage: "Ocean pollution has become a {{BLANK}} crisis affecting marine ecosystems worldwide. Plastic waste, which takes hundreds of years to {{BLANK}}, accumulates in massive garbage patches across the oceans. This pollution {{BLANK}} threatens marine wildlife, as animals often mistake plastic for food.",
        blanks: [
          { index: 0, correctAnswer: "growing", options: ["growing", "shrinking", "stable", "minor"] },
          { index: 1, correctAnswer: "decompose", options: ["decompose", "multiply", "strengthen", "evaporate"] },
          { index: 2, correctAnswer: "directly", options: ["directly", "rarely", "never", "occasionally"] },
        ],
      },
    },

    // ===== LISTENING =====
    {
      section: "LISTENING", type: "WRITE_FROM_DICTATION", difficulty: "EASY",
      title: "Library Hours",
      content: { audioUrl: "", correctText: "The library will be closed for renovation during the summer break." },
    },
    {
      section: "LISTENING", type: "WRITE_FROM_DICTATION", difficulty: "MEDIUM",
      title: "Research Paper",
      content: { audioUrl: "", correctText: "Students must submit their research papers by the end of the semester." },
    },
    {
      section: "LISTENING", type: "WRITE_FROM_DICTATION", difficulty: "HARD",
      title: "Environmental Policy",
      content: { audioUrl: "", correctText: "The government has implemented new environmental policies to reduce carbon emissions significantly." },
    },
    {
      section: "LISTENING", type: "LISTENING_MCQ_SINGLE", difficulty: "MEDIUM",
      title: "University Lecture on Migration",
      content: {
        audioUrl: "",
        question: "What is the main topic of the lecture?",
        options: [
          "The economic impact of migration on host countries",
          "The history of human migration patterns",
          "The challenges faced by first-generation immigrants",
          "The role of technology in facilitating migration",
        ],
        correctAnswers: [0],
      },
    },
    {
      section: "LISTENING", type: "HIGHLIGHT_CORRECT_SUMMARY", difficulty: "MEDIUM",
      title: "Climate Adaptation",
      content: {
        audioUrl: "",
        options: [
          "The speaker discusses how cities are adapting to climate change through infrastructure improvements and urban planning strategies.",
          "The speaker argues that climate change is not a significant threat to urban areas.",
          "The speaker explains the history of climate change research over the past century.",
          "The speaker focuses on the economic costs of renewable energy implementation.",
        ],
        correctAnswer: 0,
      },
    },
    {
      section: "LISTENING", type: "SELECT_MISSING_WORD", difficulty: "EASY",
      title: "Study Habits",
      content: {
        audioUrl: "",
        options: ["effective", "inefficient", "dangerous", "expensive"],
        correctAnswer: 0,
      },
    },
  ];

  let created = 0;
  for (const q of questions) {
    await db.question.create({
      data: {
        section: q.section as any,
        type: q.type as any,
        difficulty: (q.difficulty || "MEDIUM") as any,
        title: q.title,
        content: q.content as any,
        explanation: (q as any).explanation || null,
        modelAnswer: (q as any).modelAnswer || null,
        tags: [],
        isPrediction: false,
        centreId: null, // global questions
      },
    });
    created++;
  }
  console.log(`  ${created} questions seeded`);

  // 7. Seed Vocabulary
  const vocabWords = [
    { word: "Ubiquitous", meaning: "Present, appearing, or found everywhere", meaningHi: "सर्वव्यापी", example: "Mobile phones have become ubiquitous in modern society.", category: "academic", difficulty: "MEDIUM" },
    { word: "Pragmatic", meaning: "Dealing with things sensibly and realistically", meaningHi: "व्यावहारिक", example: "A pragmatic approach to solving environmental issues.", category: "academic", difficulty: "MEDIUM" },
    { word: "Mitigate", meaning: "Make less severe, serious, or painful", meaningHi: "कम करना", example: "Measures to mitigate the effects of climate change.", category: "academic", difficulty: "MEDIUM" },
    { word: "Facilitate", meaning: "Make an action or process easier", meaningHi: "सुविधा देना", example: "Technology facilitates communication across borders.", category: "academic", difficulty: "EASY" },
    { word: "Unprecedented", meaning: "Never done or known before", meaningHi: "अभूतपूर्व", example: "The pandemic caused unprecedented disruption globally.", category: "academic", difficulty: "HARD" },
    { word: "Constitute", meaning: "Be a part of a whole", meaningHi: "गठन करना", example: "Women constitute 50% of the workforce.", category: "academic", difficulty: "EASY" },
    { word: "Inevitable", meaning: "Certain to happen; unavoidable", meaningHi: "अनिवार्य", example: "Change is inevitable in a growing economy.", category: "academic", difficulty: "EASY" },
    { word: "Discrepancy", meaning: "A difference between things that should be the same", meaningHi: "विसंगति", example: "There was a discrepancy between the two reports.", category: "academic", difficulty: "MEDIUM" },
    { word: "Implications", meaning: "The effect or consequence of an action", meaningHi: "निहितार्थ", example: "The implications of the new policy are far-reaching.", category: "academic", difficulty: "EASY" },
    { word: "Albeit", meaning: "Although; even though", meaningHi: "यद्यपि", example: "It was a significant, albeit small, improvement.", category: "academic", difficulty: "HARD" },
  ];

  for (const v of vocabWords) {
    await db.vocabulary.upsert({
      where: { word: v.word },
      update: {},
      create: {
        word: v.word,
        meaning: v.meaning,
        meaningHi: v.meaningHi,
        example: v.example,
        category: v.category,
        difficulty: v.difficulty as any,
      },
    });
  }
  console.log(`  ${vocabWords.length} vocabulary words seeded`);

  // 8. Seed Coupon
  await db.coupon.upsert({
    where: { code: "LAUNCH50" },
    update: {},
    create: {
      code: "LAUNCH50",
      discountPercent: 50,
      maxUses: 100,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  console.log("  Coupon LAUNCH50 created (50% off)");

  console.log("\nSeed completed successfully!");
  console.log("\nTest accounts:");
  console.log("  Super Admin:  admin@ptemaster.in / admin123");
  console.log("  Centre Admin: admin@divinesuccess.com / centre123");
  console.log("  Student:      student@test.com / student123");
  console.log("  Centre code:  divine-success");
  console.log("  Coupon:       LAUNCH50 (50% off)");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
