---
name: Expo Web API routing
description: Why Expo Web and native clients need different generated API client configuration
---

On Expo Web, leave generated API requests same-origin and do not install the native bearer-token getter. Use the external API domain and secure token getter only on native platforms.

**Why:** Browser clients rely on same-origin cookie and HTTP-cache semantics, while native clients need an explicitly reachable API origin and bearer authentication.

**How to apply:** Branch generated client configuration at platform bootstrap rather than changing individual query or UI code.