import { db } from "./index";
import { venuesTable, type InsertVenue } from "./schema";
import { ne } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const COLORS = [
  '#B91C1C', '#1D4ED8', '#15803D', '#C2410C', '#7C3AED',
  '#0F766E', '#B45309', '#4338CA', '#BE185D', '#334155',
  '#0369A1', '#DC2626', '#16A34A', '#D97706', '#9333EA',
  '#0E7490', '#92400E', '#1E40AF', '#065F46', '#831843',
];

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'XX';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function slugify(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = parseRow(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]));
  });
}

async function importCsv() {
  // Step 1: delete everything except La Taqueria (id='1')
  console.log('Deleting all venues except La Taqueria...');
  await db.delete(venuesTable).where(ne(venuesTable.id, '1'));
  console.log('  Done.');

  // Step 2: parse CSV
  const csvPath = path.resolve(process.cwd(), 'attached_assets/Bay_Area_Locally_Owned_Restaurants_1786822562732.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);
  console.log(`Parsed ${rows.length} rows from CSV.`);

  // Step 3: map rows to venue records
  const seenIds = new Set<string>(['1']); // reserve La Taqueria's id
  const venues: InsertVenue[] = [];

  for (const row of rows) {
    const name = row['Name'];
    const city = row['City'];
    if (!name) continue;

    // Unique id: name + city slug (handles duplicate names across cities)
    let baseId = slugify(name + '-' + city);
    let id = baseId;
    let suffix = 2;
    while (seenIds.has(id)) {
      id = `${baseId}-${suffix++}`;
    }
    seenIds.add(id);

    const priceLevel = row['Price Level'];
    const cuisineRaw = row['Cuisine'];
    const tags = cuisineRaw
      ? cuisineRaw.split(/[\/&,]/).map(t => t.trim()).filter(Boolean)
      : [];

    venues.push({
      id,
      name,
      category: 'restaurants',
      rating: parseFloat(row['Rating']) || 0,
      reviewCount: 0,
      address: row['Address'],
      city: city ? `${city}, CA` : '',
      neighborhood: row['Neighborhood'],
      phone: row['Phone'],
      website: '',
      hours: '',
      description: row['Summary'],
      tags,
      featured: false,
      verified: false,
      priceRange: priceLevel || '$',
      color: hashColor(name),
      initials: getInitials(name),
      hasVideo: false,
      video: null,
      lat: 0,
      lng: 0,
    });
  }

  // Step 4: insert in batches of 50
  console.log(`Inserting ${venues.length} venues...`);
  for (let i = 0; i < venues.length; i += 50) {
    const batch = venues.slice(i, i + 50);
    await db.insert(venuesTable).values(batch).onConflictDoNothing();
    console.log(`  Batch ${Math.floor(i / 50) + 1}/${Math.ceil(venues.length / 50)} done`);
  }

  console.log(`\nDone. La Taqueria preserved + ${venues.length} CSV venues imported.`);
  process.exit(0);
}

importCsv().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
