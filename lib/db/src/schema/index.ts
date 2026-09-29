import { sql } from "drizzle-orm";
import { pgTable, text, real, integer, boolean, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export * from "./auth";

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
  // Broadcaster subscription flag — set true via admin once venue owner has paid
  broadcasterActive: boolean("broadcaster_active").notNull().default(false),
});

export type Venue = typeof venuesTable.$inferSelect;
export type InsertVenue = typeof venuesTable.$inferInsert;

// Follows — users following venues to receive announcements
export const followsTable = pgTable(
  "follows",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    venueId: text("venue_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("follows_user_venue_idx").on(table.userId, table.venueId)],
);

export type Follow = typeof followsTable.$inferSelect;

// Announcements — posted by broadcaster venues
export const announcementsTable = pgTable("announcements", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  venueId: text("venue_id").notNull(),
  /** User id (from usersTable) of the person who posted it */
  postedById: text("posted_by_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  /** 'closed' | 'special' | 'general' */
  type: text("type").notNull().default("general"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Announcement = typeof announcementsTable.$inferSelect;

// Notifications — one per follower per announcement
export const notificationsTable = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  announcementId: text("announcement_id").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;

// Partner inquiries — businesses asking to be listed, claim a listing, or upgrade
export const partnerInquiriesTable = pgTable("partner_inquiries", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  city: text("city").notNull().default(""),
  website: text("website").notNull().default(""),
  /** Set when the business is claiming an existing directory listing */
  venueId: text("venue_id"),
  /** 'listing' | 'claim' | 'broadcaster' | 'featured' | 'other' */
  interest: text("interest").notNull().default("listing"),
  message: text("message").notNull().default(""),
  /** 'new' | 'contacted' | 'approved' | 'declined' */
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PartnerInquiry = typeof partnerInquiriesTable.$inferSelect;
