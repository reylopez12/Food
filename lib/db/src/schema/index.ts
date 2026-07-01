import { pgTable, text, real, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export interface VideoHighlight {
  dish: string;
  tagline: string;
  descriptors: [string, string, string];
  accentColor: string;
}

export const venuesTable = pgTable("venues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  rating: real("rating").notNull(),
  reviewCount: integer("reviewCount").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood").notNull(),
  phone: text("phone").notNull(),
  website: text("website").notNull(),
  hours: text("hours").notNull(),
  description: text("description").notNull(),
  tags: jsonb("tags").notNull().$type<string[]>(),
  featured: boolean("featured").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  priceRange: text("priceRange").notNull(),
  color: text("color").notNull(),
  initials: text("initials").notNull(),
  hasVideo: boolean("hasVideo").notNull().default(false),
  video: jsonb("video").$type<VideoHighlight | null>().default(null),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export type Venue = typeof venuesTable.$inferSelect;
export type InsertVenue = typeof venuesTable.$inferInsert;
