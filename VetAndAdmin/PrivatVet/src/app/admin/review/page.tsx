import { db } from "@/lib/db";
import { clinics, municipalities, counties, staff } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { ReviewDashboard } from "./review-dashboard";

export const metadata = {
  title: "Granska — Admin",
};

export const dynamic = "force-dynamic";

export type ReviewClinic = {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  countyName: string;
  googleRating: number | null;
  googleReviewCount: number | null;
  description: string | null;
  story: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  faqData: unknown;
  enrichmentData: Record<string, unknown> | null;
  detectedServices: string[];
  animalTypes: string[];
  openingHours: unknown;
  email: string | null;
  phone: string | null;
  website: string | null;
  bookingUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  linkedinUrl: string | null;
  heroPhotoUrl: string | null;
  photos: unknown;
  photoAlts: unknown;
  discoveredPrices: unknown;
  topRated: boolean;
  topRatedRank: number | null;
  lastEnrichedAt: string | null;
  enrichmentStatus: string;
  staffMembers: { id: number; name: string; role: string; photoUrl: string | null; sortOrder: number }[];
};

export default async function ReviewPage() {
  const rows = await db
    .select({
      id: clinics.id,
      name: clinics.name,
      slug: clinics.slug,
      city: clinics.city,
      countyName: counties.name,
      googleRating: clinics.googleRating,
      googleReviewCount: clinics.googleReviewCount,
      description: clinics.description,
      story: clinics.story,
      seoTitle: clinics.seoTitle,
      seoDescription: clinics.seoDescription,
      faqData: clinics.faqData,
      enrichmentData: clinics.enrichmentData,
      detectedServices: clinics.detectedServices,
      animalTypes: clinics.animalTypes,
      openingHours: clinics.openingHours,
      email: clinics.email,
      phone: clinics.phone,
      website: clinics.website,
      bookingUrl: clinics.bookingUrl,
      facebookUrl: clinics.facebookUrl,
      instagramUrl: clinics.instagramUrl,
      youtubeUrl: clinics.youtubeUrl,
      linkedinUrl: clinics.linkedinUrl,
      heroPhotoUrl: clinics.heroPhotoUrl,
      photos: clinics.photos,
      photoAlts: clinics.photoAlts,
      discoveredPrices: clinics.discoveredPrices,
      topRated: clinics.topRated,
      topRatedRank: clinics.topRatedRank,
      lastEnrichedAt: clinics.lastEnrichedAt,
      enrichmentStatus: clinics.enrichmentStatus,
    })
    .from(clinics)
    .innerJoin(municipalities, eq(clinics.municipalityId, municipalities.id))
    .innerJoin(counties, eq(municipalities.countyId, counties.id))
    .where(eq(clinics.enrichmentStatus, "enriched"))
    .orderBy(desc(clinics.googleReviewCount));

  // Batch fetch all staff for enriched clinics
  const clinicIds = rows.map((r) => r.id);
  const allStaff = clinicIds.length > 0
    ? await db
        .select({
          id: staff.id,
          clinicId: staff.clinicId,
          name: staff.name,
          role: staff.role,
          photoUrl: staff.photoUrl,
          sortOrder: staff.sortOrder,
        })
        .from(staff)
        .where(inArray(staff.clinicId, clinicIds))
    : [];

  // Group staff by clinic
  const staffByClinic = new Map<number, typeof allStaff>();
  for (const s of allStaff) {
    if (s.name === "Medarbetare") continue;
    const list = staffByClinic.get(s.clinicId) ?? [];
    list.push(s);
    staffByClinic.set(s.clinicId, list);
  }

  const data: ReviewClinic[] = rows.map((r) => ({
    ...r,
    detectedServices: r.detectedServices ?? [],
    animalTypes: r.animalTypes ?? [],
    topRated: r.topRated ?? false,
    enrichmentData: (r.enrichmentData as Record<string, unknown>) ?? null,
    lastEnrichedAt: r.lastEnrichedAt ? String(r.lastEnrichedAt) : null,
    staffMembers: (staffByClinic.get(r.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));

  return <ReviewDashboard clinics={data} />;
}
