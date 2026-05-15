import { doublePrecision, integer, numeric, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { citiesTable } from "./cities";

export const placesTable = pgTable("places", {
  id: serial("id").primaryKey(),
  cityId: serial("city_id").references(() => citiesTable.id),
  name: text("name").notNull(),
  shortDescription: text("short_description").notNull(),
  history: text("history").notNull(),
  address: text("address"),
  imageUrl: text("image_url"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  qrCode: text("qr_code").notNull().unique(),
  category: text("category").notNull().default("Historic"),
  visitHours: text("visit_hours"),
  visitDuration: text("visit_duration"),
  video360Url: text("video_360_url"),
  avgRating: numeric("avg_rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
});

export const insertPlaceSchema = createInsertSchema(placesTable).omit({ id: true });
export type InsertPlace = z.infer<typeof insertPlaceSchema>;
export type Place = typeof placesTable.$inferSelect;
