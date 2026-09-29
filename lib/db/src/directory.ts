import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { InsertVenue } from "./schema";

type CsvRow = Record<string, string>;

export const DIRECTORY_FILES = [
  ["Alameda", "Alameda_CSV1_1790271911542.csv"],
  ["Berkeley", "BerkeleyCSV1_1790271919821.csv"],
  ["Oakland", "OaklandCSV1_1790271925802.csv"],
] as const;

type DirectorySource = (typeof DIRECTORY_FILES)[number][0];

// Handle commas, escaped quotes, and newlines inside quoted CSV fields.
export function parseCsv(content: string): CsvRow[] {
  const records: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (quoted && content[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((cell) => cell.trim())) records.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field");
  if (value || row.length) {
    row.push(value);
    records.push(row);
  }
  const [headers, ...data] = records;
  if (!headers) throw new Error("Empty CSV");
  return data.map((cells, index) => {
    if (cells.length !== headers.length) {
      throw new Error(`CSV row ${index + 2}: expected ${headers.length} columns, got ${cells.length}`);
    }
    return Object.fromEntries(headers.map((header, i) => [header.replace(/^﻿/, "").trim(), cells[i].trim()]));
  });
}

function slug(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const palette = ["#995B46", "#486D68", "#A16D40", "#695F82", "#9B5050", "#4C688C"];

function asVenue(row: CsvRow, source: DirectorySource): InsertVenue {
  const name = row.Restaurant || row.Name;
  if (!name || !row.Address || !(row["Directory Description"] || row["Listing Description"])) {
    throw new Error(`Missing name, address or description in ${source}: ${JSON.stringify(row)}`);
  }
  const addressCity = row.Address.match(/,\s*(Berkeley|Albany|El Cerrito|Kensington),\s*CA(?:\s*\d{5})?$/i);
  const city = source === "Berkeley" ? addressCity?.[1] : source;
  if (!city) throw new Error(`Unrecognized Berkeley-area city for ${name}: ${row.Address}`);
  const address = addressCity ? row.Address.slice(0, addressCity.index).trim() : row.Address.replace(/,\s*Oakland,\s*CA(?:\s*\d{5})?$/i, "").trim();
  const id = `${slug(name)}-${slug(city)}`;
  const cuisine = row.Cuisine.split(/[\/,]/).map((value) => value.trim()).filter(Boolean);
  const highlights = (row.Highlights || "").split(";").map((value) => value.trim()).filter(Boolean);
  const tags = [...new Set([...cuisine, ...highlights].filter((value) => value.length <= 38))].slice(0, 5);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join("");
  const description = row["Directory Description"] || row["Listing Description"];
  return {
    id,
    name,
    category: "restaurants",
    rating: 0, // The supplied files do not contain ratings.
    reviewCount: 0,
    address,
    city: `${city}, CA`,
    neighborhood: row.Neighborhood,
    phone: row.Phone,
    website: row.Website,
    hours: row.Hours || "",
    description: row.Status === "Temporarily closed" ? `Temporarily closed. ${description}` : description,
    tags,
    featured: false,
    verified: false,
    priceRange: /^\${1,4}$/.test(row["Price Level"] || "") ? row["Price Level"] : "",
    color: palette[Array.from(id).reduce((hash, char) => hash + char.charCodeAt(0), 0) % palette.length],
    initials,
    hasVideo: false,
    video: null,
    lat: 0, // Coordinates were not supplied; never place a pin at a made-up location.
    lng: 0,
  };
}

/** Parse the three city CSVs in `assetsDir` into venue rows. */
export function loadDirectoryVenues(assetsDir: string): InsertVenue[] {
  const venues = DIRECTORY_FILES.flatMap(([city, filename]) =>
    parseCsv(readFileSync(path.join(assetsDir, filename), "utf8")).map((row) => asVenue(row, city)),
  );
  const ids = venues.map((venue) => venue.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate venue IDs in CSVs");
  return venues;
}

/** Walk up from `start` until the pnpm workspace root is found. */
export function findWorkspaceRoot(start = process.cwd()): string {
  let dir = path.resolve(start);
  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}
