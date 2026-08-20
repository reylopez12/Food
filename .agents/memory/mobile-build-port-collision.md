---
name: Mobile build port collision
description: Static Expo mobile builds temporarily need the local Metro port used by the mockup preview service.
---

The mobile static build script starts Metro on local port 8081. When the mockup sandbox workflow is running, its Vite server occupies that port and Expo exits in non-interactive mode instead of choosing another port.

**Why:** Both artifact services are intentionally useful during development, but they have an undeclared local port overlap only during the one-off mobile production build.

**How to apply:** Before running the mobile production build, temporarily stop the mockup-sandbox workflow, run the build, then restart that workflow. Keep the user-facing mobile and API workflows running.