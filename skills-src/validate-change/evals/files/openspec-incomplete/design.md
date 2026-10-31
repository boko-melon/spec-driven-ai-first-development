# Design: Flight Card Component

## Component Architecture

- **Location**: `src/components/molecules/FlightCard/`
- **Type**: Server Component (no client-side interactivity needed for display)
- **Styling**: CSS Modules with easyjet tokens

## File Structure

```
src/components/molecules/FlightCard/
├── FlightCard.tsx
├── FlightCard.module.scss
├── FlightCard.types.ts
├── index.ts
└── __tests__/
    └── FlightCard.test.tsx
```

## Props Interface

```typescript
interface FlightCardProps {
  origin: AirportInfo;
  destination: AirportInfo;
  departureDate: string;
  returnDate?: string;
  price: { amount: number; currency: string };
  airline: string;
  href: string;
}
```

## Responsive Behaviour

- **Mobile** (< 768px): Stacked layout, full width
- **Desktop** (≥ 768px): Horizontal layout with price right-aligned

## Accessibility

- Card is wrapped in an `<article>` element
- Route info uses `aria-label` for screen reader clarity (e.g. "Flight from London to Paris")
- CTA link has descriptive text including destination
