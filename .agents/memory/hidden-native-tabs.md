---
name: Hidden native tabs
description: Expo Router native-tab hiding behavior when retaining secondary screens
---

In the current Expo Router native-tab implementation, `hidden` filters the screen from the rendered native tab view, and navigating to that route resets selection to a visible tab. Do not use a hidden NativeTabs trigger for a secondary screen that must remain reachable.

**Why:** The mobile directory needs Map and Alerts reachable outside the bottom navigation; hiding their native triggers removed them from the rendered screen list.

**How to apply:** For secondary routes within a tab group, use classic Tabs with invisible tab buttons, or move the secondary screens into a separate root stack before returning to NativeTabs. Recheck this behavior after Expo Router upgrades.