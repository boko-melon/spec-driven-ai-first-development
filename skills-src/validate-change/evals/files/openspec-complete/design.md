# Design: Locale Switcher Component

## Component Architecture

- **Location**: `src/components/atoms/LocaleSwitcher/`
- **Type**: Client Component (`'use client'` directive required for dropdown interactivity)
- **Styling**: CSS Modules with `@easyjet-dev/shared-styles` tokens via `@use '@/styles/easyjet-tokens' as tokens`

## File Structure

```
src/components/atoms/LocaleSwitcher/
├── LocaleSwitcher.tsx
├── LocaleSwitcher.module.scss
└── index.ts
```

## Behaviour

1. Renders a button showing current locale flag + language name
2. On click, opens a dropdown listing all available locales
3. Selecting a locale navigates to the equivalent page in that locale
4. Dropdown closes on outside click or Escape key

## Accessibility

- Button has `aria-expanded` and `aria-haspopup="listbox"`
- Dropdown list uses `role="listbox"` with `role="option"` children
- Focus trapped within dropdown when open
- Escape key closes dropdown and returns focus to trigger

## Exports

- Named export `LocaleSwitcher` from component file
- Re-exported from `src/components/atoms/LocaleSwitcher/index.ts`
- Re-exported from `src/components/atoms/index.ts`
