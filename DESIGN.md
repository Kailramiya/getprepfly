# Design System & Aesthetics
**Project Name:** PrepFly (PTE Practice Platform)

This document details the core visual philosophy of the platform. We strive for a "High-End Visual Design" that rivals top-tier consumer products (e.g., Apple, Vercel). The platform must never look like a generic corporate dashboard.

---

## 1. Core Principles

1. **Depth over Flatness:** Do not use flat, solid background colors for interactive elements. Utilize translucent layers, subtle borders, and layered shadows to establish depth.
2. **Fluidity over Stiff Transitions:** Every interaction (hover, focus, click) must be animated smoothly. Elements should feel responsive and "alive."
3. **Contrast & Readability:** Text must maintain strict contrast ratios against backgrounds, utilizing `text-foreground` and `text-muted-foreground` appropriately in both Light and Dark modes.

---

## 2. Tailwind Configuration & Tokens

The platform relies on `globals.css` where core HSL tokens are defined.

### 2.1. Glassmorphism
To achieve the frosted glass effect, use the following combination of classes:
- Background: `bg-background/50` or `bg-white/5` (dark mode)
- Blur: `backdrop-blur-xl` or `backdrop-blur-2xl`
- Border: `ring-1 ring-white/10` (or `border border-white/10`)
- Shadow: `shadow-glass` (custom tailwind shadow defined in config)

**Example Card:**
```tsx
<Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10">
  <CardContent>Premium Content</CardContent>
</Card>
```

### 2.2. Fluid Animations
Use the custom `ease-fluid` transition cubic-bezier for a hyper-smooth feel.
- Base: `transition-all duration-700 ease-fluid`
- Hover State: `hover:-translate-y-1 hover:shadow-float`
- Active State (Click): `active:scale-[0.98]`

### 2.3. Gradients
Gradients should be used sparingly but effectively to draw attention to critical elements (e.g., Overall Scores, primary CTAs).
- Example: `bg-gradient-to-br from-teal-500 to-indigo-600`
- Text Gradients: `bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500`

---

## 3. UI Components (shadcn/ui Customization)

While we use `shadcn/ui` for accessibility and primitive structure, we completely override the default styling to match the premium aesthetic.

- **Buttons:** Must always have `rounded-full` instead of `rounded-md`. Add `shadow-sm` and hover/active scaling effects.
- **Badges:** Use highly rounded corners and low-opacity backgrounds with solid text (e.g., `bg-green-500/10 text-green-500`).
- **Inputs:** Avoid hard solid borders. Use translucent backgrounds (`bg-muted-foreground/5`) with subtle focus rings (`focus:ring-2 focus:ring-primary/20`).

---

## 4. Dark Mode vs. Light Mode
Both modes must look immaculate. 
- **Light Mode:** Use extreme care to avoid washed-out borders. Use `bg-white/80` with blurs over subtle abstract background blobs or gradients.
- **Dark Mode:** Do not use pure `#000000`. Use deep rich slates (`bg-slate-950`). Borders should use `white/5` or `white/10` to stand out.
