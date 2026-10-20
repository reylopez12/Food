# Restaurant coordinates

Imported restaurants have unknown coordinates `(0, 0)` until a street address
and city/state match is confirmed. No neighborhood or city-center fallback is
allowed. Location matching does **not** set the restaurant's `verified` badge,
ratings, reviews, hours or other imported fields.

## Provider and accuracy

This directory uses the public **US Census Geocoder**, benchmark
`Public_AR_Current`. No API credential is needed. The available Google Maps
integration was checked before choosing this credential-free provider.

Census estimates locations along TIGER street-address ranges. These are useful
for map pins and approximate straight-line distances, but are **not rooftop,
entrance or business-identity verification**, nor driving distances. An accepted
result has exactly one match, the same street number/name/direction (allowing
standard abbreviations and spelled-out ordinals), matching city/state and valid
East Bay coordinates. A differing street suffix or missing direction is held
for review, not accepted as a fuzzy match.

API documentation:
https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.pdf

## Commands

Run with the project's configured PostgreSQL database, not a second concurrent
embedded PGlite process:

```sh
# Geocode missing locations and produce evidence and a review report.
# Does not write to the database.
pnpm --filter @workspace/db run geocode

# Apply accepted results, changing ONLY lat/lng on matching existing IDs.
pnpm --filter @workspace/db run geocode --apply

# Apply bundled evidence to an already-imported environment, without network.
pnpm --filter @workspace/db run geocode --from-evidence --apply

# Deliberately recheck cached provider results.
pnpm --filter @workspace/db run geocode --refresh
```

Production writes also require `--allow-production` when `NODE_ENV=production`;
only run this after authorization to modify production data. This work does not
publish the site or restore production restaurant records.

The coordinate-only update compares ID, original address, city and still-missing
coordinates at write time. Existing nonzero coordinates are not overwritten.
`reports/directory-before-geocoding.json` records the pre-apply data. A move in a
later CSV import clears the old pin for re-geocoding.

## Evidence and unresolved addresses

- `lib/db/src/data/venue-locations.json`: accepted provider evidence, bundled
  into the seed path. Seeded restaurants keep the same IDs and other metadata.
- `reports/directory-geocoding.json`: all examined listings, original address,
  timestamp, match evidence and exact reason for acceptance or review.
- `reports/directory-geocoding.csv`: spreadsheet-readable review report.

Interrupted runs reuse results bound to the same ID/address/city. Provider
failures are retried on the next run; `--refresh` bypasses the cache. Cached
matches are validated again before acceptance or application.

Review rows remain at `(0, 0)`, invisible to map pins and nearby spins. Confirm
missing/ambiguous addresses against a restaurant's official source before
correcting the address and rerunning; never substitute a convenient nearby pin.

## Official-source address review (2026-10-08)

All 48 originally unresolved IDs were researched individually. The audit is in
`lib/db/src/data/venue-address-reviews.json`: each row records the primary-source
URL, a short address quotation when independently retrieved, and the decision.
Search snippets from social accounts are explicitly **unconfirmed**, not treated
as direct business confirmation. No businesses were contacted.

- 33 building/street-and-city addresses have independently retrieved official
  support. Where a site omits a supplied unit, the unit remains unchanged.
- 15 remain unconfirmed, including conflicting addresses, unavailable official
  pages, a domain now belonging to another business, and closure notices.
- Only two supplied addresses were corrected: C'era Una Volta's SoFive/Hub
  annotation and Vinyl's Alameda Point annotation were removed from the street
  field. Street numbers, West direction and Vinyl's unit 166 were preserved.
  Corrections are guarded by the original ID/address/city and applied before
  seed coordinate validation; uploads themselves were not rewritten.
- Great China's official site gives **2190 Bancroft Way, Berkeley, CA 94704**.
  Passing that confirmed ZIP to Census produces one exact match instead of two.
  The complete returned match and ZIP are stored in the geocoding evidence.
  Cached responses without the new ZIP must be queried again, and mismatching
  ZIP responses are rejected.
- Great China and Vinyl gained validated locations. C'era Una Volta's corrected
  street address still has no provider match. The other 46 remain unpinned:
  official-address confirmation alone does not make a disagreeing Census result
  acceptable.

Do not delete a street suffix or add West/Road to make Census accept a listing.
In particular, Park Street is confirmed for the Alameda restaurants, and
Grand Lake Kitchen confirms Grand Avenue, not West Grand Avenue. Lettered and
fractional numbers remain unresolved when the provider drops the letter/fraction.

Current official pages report Greens & Grains closed and Admiral Maltings offers
a farewell message; Mistura has a third-party closure report. Los Cocos's social
search results conflict between Fruitvale Avenue and Trask Street. These are
status/contact-review findings, **not** permission to delete, relocate, rename,
or close a directory listing.

The development PostgreSQL database initially had all 296 coordinates missing,
despite the earlier report recording 248 accepted coordinates. Existing accepted
evidence was revalidated, not replaced with guessed locations. After this pass,
250 development listings have validated coordinates and 46 remain unpinned.
IDs, ratings, review counts, badges and all non-address/location metadata are
preserved. Production was neither queried nor written and nothing was published.

The production SQL handoff and its HTML guide are also regenerated from the
original import with the same guarded address corrections and revalidated
coordinate evidence. They now describe 250 coordinates and 46 unresolved
locations, including Great China and Vinyl. This is file preparation only,
**not authorization to execute the import**. The isolated import test exercises
empty-directory import, upgrading the old annotated records, unchanged reruns,
metadata preservation and whole-batch conflict blocking.

### Review regression checks

```sh
artifacts/web/node_modules/.bin/tsx --test lib/db/src/confirmed-addresses.test.ts lib/db/src/geocoding.test.ts lib/db/src/directory-updates.test.ts
```

## Radius checks

Both web and mobile full spin screens filter eligible venues by valid
coordinates and Haversine distance before shuffling or choosing a winner.
Home wheels have an intentional all-directory mode until a location and radius
are enabled; in nearby mode they use the same strict distance comparison.

Run:

```sh
node --test scripts/tests/nearby-locations.test.cjs
artifacts/web/node_modules/.bin/tsx --test lib/db/src/geocoding.test.ts lib/db/src/directory-updates.test.ts
```

The first check executes the actual eligibility callbacks on both platforms
for 1, 5, 10 and 25 miles, including just-inside, just-outside, invalid, unknown
and no-in-range candidates. The second checks provider validation, seed
provenance, coordinate-only updates and invalidation after address changes.
