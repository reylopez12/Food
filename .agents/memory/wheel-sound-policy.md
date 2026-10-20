---
name: Wheel sound policy
description: Default sound behavior and user control for the website spin wheels
---

Wheel sound should be on by default, with a toggle so users can turn it off.
Keep the user's mute choice consistent between the homepage and dedicated wheel.

**Why:** The user explicitly requested default-on sound with an opt-out. Sharing
the preference avoids playing sound again after the user has muted another wheel.

**How to apply:** Retain the opt-out when updating wheel controls. Default-on
does not mean autoplay on page load; sounds belong to user-initiated spins.
