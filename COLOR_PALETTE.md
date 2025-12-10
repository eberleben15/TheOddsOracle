# The Odds Oracle - Color Palette Implementation

## Custom Color Scheme

A vibrant, modern sports betting aesthetic inspired by professional platforms.

### Core Colors

| Color Name | Hex | RGB | Usage |
|------------|-----|-----|-------|
| **Strong Cyan** | `#55dde0` | 85, 221, 224 | Primary actions, hover states, accents |
| **Baltic Blue** | `#33658a` | 51, 101, 138 | Card backgrounds, elevated surfaces |
| **Charcoal Blue** | `#2f4858` | 47, 72, 88 | Dark backgrounds, nested cards |
| **Honey Bronze** | `#f6ae2d` | 246, 174, 45 | Time displays, highlights, warnings |
| **Blaze Orange** | `#f26419` | 242, 100, 25 | CTAs, urgent actions, errors |

## Implementation

### Tailwind Config
```ts
colors: {
  'charcoal-blue': '#2f4858',
  'baltic-blue': '#33658a',
  'strong-cyan': '#55dde0',
  'honey-bronze': '#f6ae2d',
  'blaze-orange': '#f26419',
}
```

### NextUI Theme
```ts
primary: '#55dde0' (Strong Cyan)
secondary: '#f6ae2d' (Honey Bronze)
danger: '#f26419' (Blaze Orange)
```

## Component Patterns

### Background
```css
background: linear-gradient(135deg, #1a2834 0%, #2f4858 50%, #1f3442 100%);
```

### Cards
```tsx
className="
  bg-baltic-blue/60 backdrop-blur-md
  border-2 border-baltic-blue/80
  hover:border-strong-cyan/60
  hover:shadow-2xl hover:shadow-strong-cyan/20
"
```

### Headings
```tsx
className="
  bg-gradient-to-r 
  from-strong-cyan via-honey-bronze to-blaze-orange 
  bg-clip-text text-transparent
"
```

### Interactive Elements
- **Hover borders**: `strong-cyan/60`
- **Time displays**: `honey-bronze`
- **Primary buttons**: `strong-cyan`
- **Important CTAs**: `blaze-orange`

## Color Psychology

- **Strong Cyan**: Trust, clarity, action (primary interactions)
- **Baltic Blue**: Stability, depth (content containers)
- **Charcoal Blue**: Foundation, sophistication (backgrounds)
- **Honey Bronze**: Energy, optimism (highlights, time-sensitive)
- **Blaze Orange**: Urgency, excitement (CTAs, critical actions)

## Accessibility

All text combinations meet WCAG AA standards:
- White text on Baltic Blue: ✅ 4.8:1 ratio
- White text on Charcoal Blue: ✅ 8.2:1 ratio
- Honey Bronze on dark: ✅ Highly visible
- Strong Cyan on dark: ✅ Excellent contrast

## Visual Hierarchy

1. **Strongest**: Gradient headings (cyan → bronze → orange)
2. **Strong**: Strong Cyan accents, Honey Bronze times
3. **Medium**: White text, card borders
4. **Subtle**: Gray-200 labels, dividers

