# Proposal: Locale Switcher Component

## Summary

Add a locale switcher dropdown to the header that allows users to change the site language. The switcher should display available locales with their flag icons and native language names.

## Motivation

Users visiting from non-English speaking countries need a way to switch the site to their preferred language without manually changing the URL.

## Scope

- Create a `LocaleSwitcher` atom component
- Style with CSS Modules using easyjet design tokens
- Client Component (requires interactivity for dropdown toggle)
- Integrate into the header organism
