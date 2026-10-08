---
name: Imported venue provenance
description: Accuracy and duplicate-handling policy for restaurant directory uploads
---

Treat missing ratings, reviews, verified status, and coordinates as unknown rather than inferring them from restaurant descriptions or neighborhood names. Show a neutral missing-rating state; suppress unmapped pins and location-distance results instead of placing them at an approximate city center.

**Why:** Restaurant CSVs may have rich descriptions and addresses but no review scores or latitude/longitude. Fabricated values would look like user-submitted facts and could misdirect visitors.

**How to apply:** When refreshing directory data, preserve source fields, validate address data before geocoding, and only mark a venue verified after confirmation. A CSV replacement should not restore older invented metadata.

For directory uploads, the user asked: "Do not make duplicates, flag duplicates if found." Update current listings when changes are identified, and create a listing only when the restaurant is not already available.

**Why:** The user explicitly requested matching and updating existing restaurants rather than copying them twice.

**How to apply:** Treat future uploads as additive updates, report duplicate or ambiguous matches, and do not infer that restaurants omitted from a file should be deleted.