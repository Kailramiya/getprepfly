# PrepFly (PTE Master) — Complete Testing Guide

> Test every feature of the platform before sharing with coaching centres.

## Test Accounts (from seed data)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@ptemaster.in | admin123 |
| Centre Admin | admin@divinesuccess.com | centre123 |
| Student | student@test.com | student123 |

- **Centre code:** `divine-success`
- **Coupon code:** `LAUNCH50` (50% off)

---

## 1. PUBLIC PAGES

### 1.1 Home Page (`/`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Open `https://getprepfly.com` | Home page with hero section, features, stats |
| 2 | Features section | Scroll down | 6 feature cards visible (AI Scoring, Mock Tests, etc.) |
| 3 | Stats section | Scroll down | Shows 20+ question types, 4 sections, AI scoring, Free beta |
| 4 | CTA buttons | Click "Start Practicing Free" | Redirects to `/register` |
| 5 | Login link | Click "Login" in header | Redirects to `/login` |
| 6 | Centre registration CTA | Click coaching centre CTA | Goes to centre registration |
| 7 | Mobile responsive | Resize browser to mobile width | Layout adapts, no horizontal scroll |

### 1.2 Download Page (`/download`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/download` | Shows Web, Android, iOS options |
| 2 | PWA install | On mobile Chrome, visit site | "Add to Home Screen" prompt appears |

---

## 2. AUTHENTICATION

### 2.1 Registration (`/register`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/register` | Registration form visible |
| 2 | Empty submit | Click register without filling | Validation errors shown |
| 3 | Invalid email | Enter "abc" as email | Email validation error |
| 4 | Short password | Enter 3-char password | "Minimum 6 characters" error |
| 5 | Password mismatch | Enter different passwords | "Passwords don't match" error |
| 6 | Valid registration | Fill: name, email, password (6+ chars) | Account created, redirected to login |
| 7 | Duplicate email | Register with same email again | "Email already exists" error |
| 8 | With centre code | Visit `/register?centre=divine-success` | Centre code pre-filled, joins that centre |
| 9 | Invalid centre code | Enter "fake-centre" as code | Error: centre not found |
| 10 | Centre admin registration | Select "Centre Admin" role | Creates centre admin account |
| 11 | Phone number (optional) | Register with/without phone | Both work, phone is optional |

### 2.2 Login (`/login`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/login` | Login form with email, password, Google button |
| 2 | Empty submit | Click login without filling | Validation error |
| 3 | Wrong password | Enter correct email, wrong password | "Invalid credentials" error |
| 4 | Wrong email | Enter non-existent email | "Invalid credentials" error |
| 5 | Student login | Email: `student@test.com`, Pass: `student123` | Redirected to `/dashboard` |
| 6 | Centre admin login | Email: `admin@divinesuccess.com`, Pass: `centre123` | Redirected to `/dashboard` |
| 7 | Super admin login | Email: `admin@ptemaster.in`, Pass: `admin123` | Redirected to `/dashboard` |
| 8 | Google OAuth | Click "Sign in with Google" | Google popup, login succeeds |
| 9 | Password toggle | Click eye icon on password field | Password visible/hidden |
| 10 | Remember session | Login, close tab, reopen | Still logged in (JWT 30-day) |

### 2.3 Logout

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Logout | Click logout in sidebar/profile | Redirected to `/login`, session cleared |
| 2 | Access after logout | Visit `/dashboard` after logout | Redirected to `/login` |

### 2.4 Route Protection

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Unauthenticated access | Visit `/dashboard` without login | Redirected to `/login` |
| 2 | Student accessing admin | Login as student, visit `/admin/students` | Redirected away (403 or dashboard) |
| 3 | Centre admin accessing super-admin | Login as centre admin, visit `/super-admin/users` | Redirected away |
| 4 | Super admin access | Login as super admin, visit any route | Full access |

---

## 3. STUDENT DASHBOARD

### 3.1 Main Dashboard (`/dashboard`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Login as student, visit `/dashboard` | Welcome message with user's name |
| 2 | Quick stats | Check stats section | Shows streak, questions done, avg score, practice time |
| 3 | Section cards | Check 4 section cards | Speaking, Writing, Reading, Listening with icons |
| 4 | Navigate to practice | Click any section card | Goes to `/practice/speaking` (or relevant section) |
| 5 | Quick actions | Check action cards | Mock Test, Study Guides, Vocabulary visible |
| 6 | First-time user | Login with new account | Stats show 0/0/0, empty state handled |

### 3.2 Sidebar Navigation

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Student menu | Login as student | Shows: Dashboard, Practice, Mock Test, Progress, Study Guides, Vocabulary, Settings, Feedback |
| 2 | Admin menu | Login as centre admin | Shows student menu + Admin section (Questions, Students, Batches) |
| 3 | Super admin menu | Login as super admin | Shows all menus + Super Admin section |
| 4 | Active state | Click menu item | Active item highlighted |
| 5 | Mobile sidebar | On mobile, tap hamburger | Sidebar slides in |
| 6 | Logo click | Click logo in sidebar | Goes to `/dashboard` |

---

## 4. PRACTICE MODE

### 4.1 Section Selection (`/practice/[section]`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Speaking section | Click Speaking | Shows 6 question types: Read Aloud, Repeat Sentence, Describe Image, Retell Lecture, Answer Short Question, Respond to Situation |
| 2 | Writing section | Click Writing | Shows 2 types: Write Essay, Summarize Written Text |
| 3 | Reading section | Click Reading | Shows 5 types: MCQ Single, MCQ Multiple, Reorder Paragraphs, Fill Blanks Drag, Fill Blanks Dropdown |
| 4 | Listening section | Click Listening | Shows 7 types: MCQ Single, MCQ Multiple, Summarize Spoken Text, Write from Dictation, Fill Blanks, Highlight Correct Summary, Select Missing Word |

### 4.2 Speaking Practice (`/practice/speaking/[type]`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Read Aloud | Select Read Aloud | Text displayed, microphone button visible |
| 2 | Record audio | Click record button | Recording starts, timer shown |
| 3 | Stop recording | Click stop | Recording stops, playback available |
| 4 | Submit speaking | Click submit after recording | AI scoring triggered (Whisper + GPT) |
| 5 | Score display | Wait for AI response | Shows pronunciation, fluency, content, overall (0-90) + feedback |
| 6 | Repeat Sentence | Select Repeat Sentence | Audio plays, student records response |
| 7 | Describe Image | Select Describe Image | Image displayed, student records description |
| 8 | Next question | Click Next | Loads next question of same type |
| 9 | Previous question | Click Previous | Goes back to previous question |
| 10 | No questions | If no questions of type exist | "No questions available" message |
| 11 | Difficulty badge | Check question card | Shows EASY/MEDIUM/HARD badge |
| 12 | Prediction badge | If question is prediction | Shows prediction indicator |

### 4.3 Writing Practice (`/practice/writing/[type]`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Write Essay | Select Write Essay | Prompt displayed, textarea visible |
| 2 | Word count | Start typing essay | Live word count updates |
| 3 | Submit essay | Click submit after writing | AI scoring triggered (GPT-4o-mini) |
| 4 | Essay scores | Wait for response | Shows grammar, spelling, content, structure, vocabulary, overall (0-90) |
| 5 | Essay feedback | Check feedback section | Shows corrections array (original -> corrected) |
| 6 | Word limit check | Write < 200 or > 300 words | Score penalized (visible in feedback) |
| 7 | Summarize Written Text | Select SWT | Passage displayed, one-sentence summary required |
| 8 | SWT word check | Write > 75 words | Score penalized for exceeding limit |
| 9 | Empty submit | Click submit without typing | Validation error shown |

### 4.4 Reading Practice (`/practice/reading/[type]`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | MCQ Single | Select MCQ Single | Passage + radio button options |
| 2 | Select answer | Click one radio button | Option highlighted |
| 3 | Check answer | Click Check/Submit | Correct/incorrect shown, no API call (free) |
| 4 | MCQ Multiple | Select MCQ Multiple | Passage + checkbox options |
| 5 | Multiple select | Check multiple boxes | Multiple options selectable |
| 6 | Reorder Paragraphs | Select Reorder | Draggable paragraph blocks |
| 7 | Drag and drop | Drag paragraphs to reorder | Paragraphs rearrange |
| 8 | Fill Blanks Drag | Select Fill Blanks Drag | Passage with blanks + draggable words |
| 9 | Fill Blanks Dropdown | Select Fill Blanks Dropdown | Passage with dropdown selectors |
| 10 | Model answer | After submitting | Shows explanation / correct answer |

### 4.5 Listening Practice (`/practice/listening/[type]`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Audio plays | Open any listening question | Audio player visible |
| 2 | Play audio | Click play | Audio plays once |
| 3 | Write from Dictation | Select WFD | Audio plays sentence, textarea for typing |
| 4 | Submit dictation | Type and submit | Compared against expected sentence |
| 5 | Listening MCQ | Select MCQ type | Audio + options displayed |
| 6 | Highlight Correct Summary | Select type | Audio + summary options |
| 7 | Select Missing Word | Select type | Audio with missing word to identify |
| 8 | Summarize Spoken Text | Select type | Audio plays, student writes summary |
| 9 | Fill Blanks | Select type | Audio with transcript, blanks to fill |

---

## 5. MOCK TESTS

### 5.1 Mock Test List (`/mock-test`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/mock-test` | Info card + past tests list |
| 2 | Test info | Check info card | Shows 56 questions: 28 Speaking, 3 Writing, 11 Reading, 14 Listening |
| 3 | No tests yet | First visit with new user | Empty state, "Start New Mock Test" button |
| 4 | Start new test | Click "Start New Mock Test" | Creates test, redirects to test page |

### 5.2 Taking Mock Test (`/mock-test/[testId]`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Test loads | After starting test | First speaking question shown |
| 2 | Timer | Check top bar | Timer counting up |
| 3 | Progress bar | Check top bar | Shows current position (e.g., 1/56) |
| 4 | Section badges | Check section indicators | Speaking/Writing/Reading/Listening badges |
| 5 | Answer question | Answer and submit | Next question auto-loads |
| 6 | Section transition | Complete all speaking questions | Moves to Writing section |
| 7 | Skip question | Click Next without answering | Question skipped, can come back |
| 8 | Speaking in mock | Speaking question appears | Audio recorder works |
| 9 | Writing in mock | Writing question appears | Textarea with word count |
| 10 | Reading in mock | Reading question appears | MCQ/Reorder/Fill-blanks UI |
| 11 | Listening in mock | Listening question appears | Audio player + answer UI |
| 12 | Complete test | Answer all 56 questions | Results screen appears |
| 13 | Results screen | After completion | Overall score /90, section-wise scores |
| 14 | Resume test | Leave mid-test, come back | Resumes from where you left (IN_PROGRESS) |

### 5.3 Past Tests

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Test history | Complete a test, go to `/mock-test` | Completed test shown with scores |
| 2 | Status badge | Check test card | IN_PROGRESS (yellow) or COMPLETED (green) |
| 3 | Score display | Check completed test | Shows S/W/R/L section scores + overall |
| 4 | Date & duration | Check test card | Shows start date and time taken |

---

## 6. PROGRESS TRACKING

### 6.1 Progress Page (`/progress`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/progress` | Stats + charts visible |
| 2 | Quick stats | Check top section | Streak, total attempts, avg score, practice time |
| 3 | Section performance | Check section bars | Speaking, Writing, Reading, Listening with visual bars |
| 4 | Weak areas | Check weak areas section | Bottom 3 question types by average score |
| 5 | Strong areas | Check strong areas | Top 3 question types by average score |
| 6 | Recent activity | Check recent section | Last 10 practice attempts with dates & scores |
| 7 | Empty state | New user with no attempts | Graceful empty state, no errors |
| 8 | After practice | Do 5+ practice questions, revisit | Stats updated with new data |

---

## 7. STUDY RESOURCES

### 7.1 Study Guides (`/study-guides`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/study-guides` | 4 sections visible |
| 2 | Speaking guides | Check Speaking section | Read Aloud Strategy, Describe Image Template, etc. |
| 3 | Writing guides | Check Writing section | Essay Templates, SWT Formula, Grammar Checklist |
| 4 | Reading guides | Check Reading section | Reorder Strategy, Fill Blanks Technique |
| 5 | Listening guides | Check Listening section | Dictation Strategy, Note-taking Tips |
| 6 | Click guide | Click any guide | Guide content opens |

### 7.2 Vocabulary (`/vocabulary`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/vocabulary` | Vocabulary cards visible |
| 2 | Flashcard mode | Select Flashcard view | Click-to-reveal cards |
| 3 | Reveal meaning | Click a flashcard | Shows meaning + example sentence |
| 4 | List mode | Switch to List view | All words in table format |
| 5 | Mark mastered | Click "Mastered" on a word | Word marked, progress updates |
| 6 | Progress tracker | Check progress bar | Shows X/Total mastered |
| 7 | Categories | Check word categories | Academic, everyday, topic-specific |
| 8 | Difficulty levels | Check difficulty badges | EASY, MEDIUM, HARD |

---

## 8. SETTINGS

### 8.1 Profile Settings (`/settings`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/settings` | Profile form with current data |
| 2 | Update name | Change name, save | Name updated, success message |
| 3 | Update phone | Add/change phone, save | Phone updated |
| 4 | Change language | Select Hindi/Punjabi | Language preference saved |
| 5 | Change password | Enter current + new password | Password updated |
| 6 | Wrong current password | Enter wrong current password | "Incorrect current password" error |
| 7 | Account info | Check bottom section | Shows role, centre code |
| 8 | Logout button | Click logout | Logged out, redirected |

### 8.2 Centre Branding (Centre Admin only)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Branding section | Login as centre admin, visit settings | Centre branding form visible |
| 2 | Update centre name | Change name, save | Centre name updated |
| 3 | Update contact | Change phone/email | Contact info updated |
| 4 | Update location | Change city/state/address | Location updated |
| 5 | Change primary color | Pick a color or preset | Brand color changes |
| 6 | 6 preset colors | Click preset swatches | Color picker updates |
| 7 | Not visible to students | Login as student | Centre branding section NOT shown |

---

## 9. FEEDBACK

### 9.1 Feedback Page (`/feedback`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/feedback` | 5 category cards + form |
| 2 | Select category | Click "Bug Report" | Category highlighted |
| 3 | Star rating | Click 4 stars | 4 stars selected |
| 4 | Submit feedback | Fill message, submit | Success message, feedback saved |
| 5 | Empty submit | Submit without message | Validation error |
| 6 | All categories | Try each category | Bug, Feature, Question Issue, AI Scoring, General |

---

## 10. CENTRE ADMIN FEATURES

### 10.1 Questions Management (`/admin/questions`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Login as centre admin, visit `/admin/questions` | Question list visible |
| 2 | Search | Type in search box | Questions filtered by title/tags |
| 3 | Filter by section | Select "Speaking" filter | Only speaking questions shown |
| 4 | Pagination | If > 20 questions, click next page | Next page loads |
| 5 | Add question | Click "Add Question" | Question form modal opens |
| 6 | Create Read Aloud | Fill: section=Speaking, type=Read Aloud, title, content={text: "..."} | Question created, appears in list |
| 7 | Create MCQ | Fill: section=Reading, type=MCQ Single, content={passage, options, correctAnswer} | Question created with options |
| 8 | Create Essay | Fill: section=Writing, type=Write Essay, content={prompt, minWords, maxWords} | Essay question created |
| 9 | Mark prediction | Toggle "isPrediction" checkbox | Prediction badge shown on question |
| 10 | Edit question | Click edit on a question | Form pre-filled, can modify |
| 11 | Delete question | Click delete on a question | Confirmation prompt, question removed |
| 12 | Difficulty levels | Set EASY/MEDIUM/HARD | Difficulty badge shows correctly |
| 13 | Tags | Add tags: "science", "graph" | Tags displayed on question card |
| 14 | Bulk upload | Click Bulk Upload | Bulk upload form/modal opens |

### 10.2 Students Management (`/admin/students`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/admin/students` | Student list + invite card |
| 2 | Invite card | Check invite section | Shows centre code + copy link button |
| 3 | Copy invite link | Click copy link | Link copied: `https://getprepfly.com/register?centre=divine-success` |
| 4 | Search students | Type student name/email | List filtered |
| 5 | Student details | Check table columns | Name, Email, Plan, Practice attempts, Mock tests |
| 6 | Active status | Check student row | Green/grey active indicator |
| 7 | New student joins | Register with centre code, check list | New student appears |

### 10.3 Batches Management (`/admin/batches`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/admin/batches` | Batch cards + create form |
| 2 | Create batch | Type "Morning Batch", submit | New batch card appears |
| 3 | Batch card info | Check batch card | Name, member count, creation date |
| 4 | Empty batch | Create batch, no members added | Shows 0 members |
| 5 | Multiple batches | Create 3+ batches | Grid layout, responsive |

---

## 11. SUPER ADMIN FEATURES

### 11.1 Users Management (`/super-admin/users`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Login as super admin, visit `/super-admin/users` | All platform users listed |
| 2 | Search | Type name/email | Users filtered |
| 3 | Role badges | Check user rows | Color-coded: Super Admin (red), Centre Admin (blue), Teacher (purple), Student (green) |
| 4 | Centre affiliation | Check user row | Shows which centre user belongs to |

### 11.2 Centres Management (`/super-admin/centres`)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Page loads | Visit `/super-admin/centres` | All centres listed |
| 2 | Centre cards | Check card info | Name, location, status, student count, code, join date |
| 3 | Active/Inactive | Check status badge | Green (active) / grey (inactive) |
| 4 | Add centre | Click "Add Centre" | Centre creation form |

---

## 12. AI SCORING (requires OpenAI API key)

### 12.1 Speaking Scoring

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Record & submit | Practice Read Aloud, record, submit | Loading state shown while processing |
| 2 | Transcription | After submit | Whisper transcribes audio to text |
| 3 | Score breakdown | Check results | pronunciation, fluency, content, overall (each 0-90) |
| 4 | Feedback | Check feedback section | 2-3 sentences of constructive feedback |
| 5 | Score saved | Check progress page | Attempt recorded in history |
| 6 | No API key | Remove OPENAI_API_KEY from env | "Failed to score" error (graceful) |
| 7 | All speaking types | Test Read Aloud, Repeat Sentence, Describe Image, Retell Lecture | Each scored correctly with type-specific criteria |

### 12.2 Writing Scoring

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Submit essay | Write 200+ words, submit | Loading state while scoring |
| 2 | Score breakdown | Check results | grammar, spelling, content, structure, vocabulary, overall |
| 3 | Word count | Check score response | wordCount field matches actual count |
| 4 | Corrections | Check corrections section | Array of {original, corrected, type} |
| 5 | Short essay penalty | Write < 200 words | Overall score reduced by 10-20 |
| 6 | SWT scoring | Submit one-sentence summary | Scored on single-sentence criteria |
| 7 | SWT too long | Write > 75 words for SWT | Score penalized |

### 12.3 Reading & Listening Scoring (No API)

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | MCQ correct | Select correct answer, submit | Score: correct, no API call |
| 2 | MCQ wrong | Select wrong answer, submit | Score: incorrect, shows correct answer |
| 3 | Reorder correct | Put paragraphs in right order | Full marks |
| 4 | Fill blanks | Fill all blanks correctly | Full marks |

---

## 13. PAYMENTS (requires Razorpay keys)

### 13.1 Payment Flow

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | View plans | Check pricing/plans page | VIP 30 (499), VIP 90 (999), VIP 180 (1499) |
| 2 | Select plan | Click VIP 30 | Razorpay checkout opens |
| 3 | Apply coupon | Enter "LAUNCH50" | 50% discount applied |
| 4 | Invalid coupon | Enter "FAKECODE" | "Invalid coupon" or no discount |
| 5 | Payment success | Complete test payment | Plan upgraded, access unlocked |
| 6 | Payment failed | Cancel Razorpay popup | Status: FAILED, plan unchanged |
| 7 | No Razorpay keys | Without keys configured | "Payment gateway not configured" error |

---

## 14. MOBILE & PWA

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Mobile responsive | Open on phone browser | All pages render correctly |
| 2 | PWA install | Visit on Chrome mobile, wait 5s | Install prompt appears |
| 3 | Install app | Accept install prompt | App icon on home screen |
| 4 | Offline support | Open PWA without internet | Cached pages load (if service worker active) |
| 5 | Touch interactions | Tap buttons, swipe | All interactions work |

---

## 15. EDGE CASES & ERROR HANDLING

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Slow network | Throttle to 3G in DevTools | Loading states shown, no crashes |
| 2 | API timeout | Disconnect internet mid-request | Error toast shown, retry option |
| 3 | Invalid URL | Visit `/practice/invalid-section` | 404 or redirect to valid page |
| 4 | Expired session | Wait 30+ days or clear cookies | Redirected to login |
| 5 | Concurrent tabs | Open in 2 tabs, logout in one | Other tab handles gracefully |
| 6 | Large file upload | Upload 50MB+ audio | Size limit error |
| 7 | Special characters | Enter `<script>alert(1)</script>` in name | Input sanitized, no XSS |
| 8 | SQL injection | Enter `'; DROP TABLE users;--` in search | Parameterized query, no injection |
| 9 | Empty database | No questions seeded | "No questions available" message |
| 10 | Browser back button | Navigate back after submission | Previous state maintained |

---

## 16. CROSS-BROWSER TESTING

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | Test all features | Test all features |
| Firefox | Test core features | Test core features |
| Safari | Test core features | Test all features (iOS) |
| Edge | Test core features | — |

---

## Testing Priority Order

1. **Login & Registration** — users must be able to sign in
2. **Practice Mode (Speaking + Writing)** — core value prop, tests AI scoring
3. **Practice Mode (Reading + Listening)** — tests answer checking
4. **Mock Tests** — end-to-end exam simulation
5. **Progress Tracking** — students need to see improvement
6. **Admin: Question Management** — centres need to add questions
7. **Admin: Student Management** — centres need to see students
8. **Settings & Profile** — user preferences
9. **Payments** — monetization (after beta)
10. **Mobile & PWA** — mobile experience

---

## Quick Smoke Test (5 minutes)

If you only have 5 minutes, test these critical paths:

1. Open `https://getprepfly.com` — home page loads
2. Login as `student@test.com` / `student123` — dashboard loads
3. Go to Practice > Speaking > Read Aloud — question loads
4. Record audio, submit — AI score appears (confirms OpenAI API works)
5. Go to Practice > Reading > MCQ Single — answer question (confirms DB works)
6. Check Progress page — attempts show up
7. Logout, login as `admin@divinesuccess.com` / `centre123` — admin menu visible
8. Go to Admin > Students — student list loads
9. Go to Admin > Questions — question list loads
