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

Research notes, suggested marketing placeholders, and verification questions are not confirmed restaurant descriptions, addresses, or verification status. Leave unknown details empty and hold listings with unconfirmed street addresses for review.

**Why:** Uploaded directories can mix publishable restaurant information with research tables and suggested placeholder copy. Publishing the latter as facts would mislead customers.

**How to apply:** Distinguish source facts from research notes before importing; include unresolved questions in the review report rather than filling customer-facing fields from guesses.

Confirm directory data separately in development and production before declaring
uploaded listings available on the published site.

**Why:** A successfully published app can have an empty production directory even
when the preview has imported restaurants, leaving restaurant wheels and browsing
without choices. Successful builds and schema synchronization do not prove that
listing records were copied.

**How to apply:** Check the live listings endpoint or a read-only production count
after publishing. Treat missing production records as a data-import issue, not a
reason to invent demo restaurants or disable distance constraints.

Street-address geocoding is not business verification. Census locations are
estimated along address ranges, not rooftops or entrances. Treat differing
street types, directions and cities as unresolved even when the provider says
it found a match; never convert coordinate acceptance into a verified badge.

**Why:** East Bay Census responses can change supplied Park Street to Park
Avenue or Grand Avenue to West Grand Avenue. Accepting those would attach a
plausible but wrong pin to an unchanged restaurant record.

**How to apply:** Keep exact street-and-city matching with standard abbreviation
normalization only, preserve evidence for review, and invalidate coordinates
when the underlying supplied address changes.
