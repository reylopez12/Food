import reviews from "./data/venue-address-reviews.json";
import type { InsertVenue } from "./schema";
import type { LocationInput } from "./geocoding";

/** Research is not a verified badge. Apply only explicitly recorded corrections. */
export function withConfirmedAddresses<T extends Pick<InsertVenue, "id" | "address" | "city" | "lat" | "lng">>(venues: T[]): T[] {
  return venues.map(venue => {
    const review = reviews.find(item => item.id === venue.id);
    if (review?.status !== "confirmed" || !review.previousAddress
      || review.previousAddress !== venue.address || review.city !== venue.city) return venue;
    return { ...venue, address: review.address!, lat: 0, lng: 0 };
  });
}

/** Only an official ZIP bound to this exact ID/address/city may narrow a query. */
export function confirmedPostalCode(input: LocationInput): string | undefined {
  const review = reviews.find(item => item.id === input.id);
  return review?.status === "confirmed" && review.address === input.address
    && review.city === input.city && review.zip && /^\d{5}$/.test(review.zip)
    ? review.zip : undefined;
}
