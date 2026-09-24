---
name: Imported venue provenance
description: Accuracy policy for replacing directory listings from uploaded restaurant data
---

Treat missing ratings, reviews, verified status, and coordinates as unknown rather than inferring them from restaurant descriptions or neighborhood names. Show a neutral missing-rating state; suppress unmapped pins and location-distance results instead of placing them at an approximate city center.

**Why:** Restaurant CSVs may have rich descriptions and addresses but no review scores or latitude/longitude. Fabricated values would look like user-submitted facts and could misdirect visitors.

**How to apply:** When refreshing directory data, preserve source fields, validate address data before geocoding, and only mark a venue verified after confirmation. A CSV replacement should not restore older invented metadata.