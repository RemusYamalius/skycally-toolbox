## Add Fazier Launch Badge to Footer

Add the Fazier "Launched on" badge to `src/components/site-footer.tsx`, placed at the bottom of the footer alongside the existing copyright bar.

**Placement:** Inside the bottom copyright `<div>` or just above it, right-aligned with existing footer text.

**Badge variant:** Use `theme=dark` instead of `neutral` because the site renders in dark mode.

**Code to insert:**
```tsx
<a
  href="https://fazier.com/launches/skycally.com"
  target="_blank"
  rel="noopener noreferrer"
>
  <img
    src="https://fazier.com/api/v1/public/badges/launch_badges.svg?badge_type=launched&theme=dark"
    width={120}
    alt="Launched on Fazier"
    className="opacity-70 hover:opacity-100 transition-opacity"
  />
</a>
```

No other footer content or styling will be changed.