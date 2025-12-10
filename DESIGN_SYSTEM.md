# The Odds Oracle - Design System

A sophisticated sports betting color scheme with excellent contrast, inspired by professional betting platforms like DraftKings and FanDuel.

## Color Palette

### Background & Surface Colors
**The foundation of our dark theme with proper contrast**

- **Background**: `#0f1419` → `#1a1f2e` (gradient)
  - Dark slate with subtle blue undertones
  - Tailwind: `slate-950` base
  
- **Cards**: `slate-800/40` with `backdrop-blur-sm`
  - Semi-transparent elevated surfaces
  - Better visual hierarchy
  - Example: `bg-slate-800/40 backdrop-blur-sm`

- **Borders**: `slate-700/50` (50% opacity)
  - Subtle separation
  - Hover: `blue-500/50` for interactive elements

### Primary - Professional Blue
**Use for:** Main actions, navigation, links, primary CTAs, highlights

- `#4f9cf9` (blue-400/500)
- Use for interactive elements
- NextUI: `color="primary"`
- Good contrast against dark backgrounds

### Secondary - Emerald Green
**Use for:** Success states, winning indicators, positive metrics

- `#10b981` (emerald-500)
- Tailwind: `emerald-500`
- NextUI: `color="success"`

### Accent - Amber
**Use for:** Highlights, warnings, important callouts

- `#f59e0b` (amber-500)
- NextUI: `color="warning"`

### Text Colors

- **Primary Text**: `slate-100` (#f1f5f9) - High contrast
- **Secondary Text**: `slate-400` (#94a3b8) - Medium contrast
- **Tertiary Text**: `slate-500` (#64748b) - Low contrast
- **Interactive Text**: `blue-400` (#60a5fa) - Links, CTAs

## Component Patterns

### Cards

```tsx
// Standard card
<Card className="
  bg-slate-800/40 backdrop-blur-sm
  border border-slate-700/50
  shadow-xl
">

// Interactive card (hoverable)
<Card className="
  bg-slate-800/40 backdrop-blur-sm
  border border-slate-700/50
  hover:bg-slate-800/60
  hover:border-blue-500/50
  hover:shadow-xl hover:shadow-blue-500/10
  transition-all duration-300
  cursor-pointer
">
```

### Buttons

```tsx
// Primary Action
<Button variant="flat" color="primary" size="md">
  Action
</Button>

// With icon
<Button 
  variant="flat" 
  color="primary"
  startContent={<Icon />}
  className="font-medium"
>
  Back to Dashboard
</Button>
```

### Typography

```tsx
// Main Heading (with gradient)
<h1 className="
  text-5xl font-bold 
  bg-gradient-to-r from-blue-400 via-blue-500 to-emerald-400 
  bg-clip-text text-transparent
  drop-shadow-lg
">

// Section Heading
<h2 className="text-2xl font-bold text-slate-100">

// Card Title
<h3 className="text-lg font-semibold text-slate-100">

// Body Text
<p className="text-slate-300">

// Secondary Text
<p className="text-slate-400 text-sm">
```

### Borders & Dividers

```tsx
// Card header divider
<CardHeader className="border-b border-slate-700/50">

// Between sections
<div className="border-t border-slate-700/50 pt-4">
```

## Effects & Interactions

### Hover States

```css
/* Card hover */
hover:bg-slate-800/60
hover:border-blue-500/50
hover:shadow-xl hover:shadow-blue-500/10

/* Smooth transitions */
transition-all duration-300
```

### Backdrop Blur

```css
/* For glassmorphism effect */
backdrop-blur-sm
bg-slate-800/40
```

### Shadows

```css
/* Elevation */
shadow-xl  /* For cards */
shadow-xl shadow-blue-500/10  /* With color glow */
shadow-black/20  /* Subtle depth */
```

## Design Principles

1. **High Contrast**: Slate-100 text on slate-800/900 backgrounds
2. **Glassmorphism**: Semi-transparent cards with backdrop blur
3. **Subtle Borders**: 50% opacity for non-intrusive separation
4. **Blue Accents**: Interactive elements use blue-400/500
5. **Smooth Transitions**: 300ms for hover, 200ms for clicks

## Color Usage Examples

### Good ✅
- Slate-100 headings on slate-800 cards (excellent contrast)
- Blue-400 for time/scores (draws attention)
- Slate-400 for labels (readable, not distracting)
- Semi-transparent cards with blur (modern, depth)
- Border-slate-700/50 (subtle, not harsh)

### Avoid ❌
- Gray-500 text on gray-800 (too low contrast)
- Solid black backgrounds (too harsh)
- 100% opacity borders (too prominent)
- Overusing bright colors (causes fatigue)
- No backdrop blur on transparent cards (looks flat)

## Accessibility

- **WCAG AA Compliant**: Slate-100 on slate-800 = 8.59:1 ratio ✅
- **Interactive Elements**: Clear hover states with color change
- **Focus States**: NextUI provides keyboard navigation styles
- **Color Meaning**: Never rely solely on color (use icons + text)


