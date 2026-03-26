import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'

function guessTags(name: string): string[] {
  const n = name.toLowerCase()
  const tags: string[] = []
  if (/biryani|dum/.test(n)) tags.push('Biryani')
  if (/dosa|idli|vada|medu|uttapam/.test(n)) tags.push('South Indian')
  if (/chai|tea|chay/.test(n)) tags.push('Chai')
  if (/pizza|pasta|italian/.test(n)) tags.push('Italian')
  if (/burger|sandwich|sub/.test(n)) tags.push('Burgers')
  if (/chinese|noodle|manchurian|fried rice|chowmein/.test(n)) tags.push('Chinese')
  if (/pav bhaji|vada pav|mumbai/.test(n)) tags.push('Mumbai Street Food')
  if (/chaat|pani puri|golgappa|bhel|sev puri/.test(n)) tags.push('Chaat')
  if (/roll|kathi|frankie/.test(n)) tags.push('Rolls')
  if (/kebab|tikka|seekh|tandoor/.test(n)) tags.push('Kebabs')
  if (/juice|lassi|shake|smoothie/.test(n)) tags.push('Drinks')
  if (/ice cream|gelato|kulfi/.test(n)) tags.push('Ice Cream')
  if (/paratha|roti|naan|bread/.test(n)) tags.push('Breads')
  if (/fish|seafood|prawn|crab/.test(n)) tags.push('Seafood')
  if (/chicken|mutton|meat/.test(n)) tags.push('Non-Veg')
  if (tags.length === 0) tags.push('Street Food')
  return tags
}

async function fetchPage(lat: string, lng: string, radius: string, pageToken?: string): Promise<{
  results: any[]
  nextPageToken?: string
}> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius,
    type: 'restaurant',
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  })
  if (pageToken) params.set('pagetoken', pageToken)

  const res = await fetch(`${PLACES_BASE}?${params}`)
  const data = await res.json()
  return {
    results: data.results ?? [],
    nextPageToken: data.next_page_token,
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat') ?? '17.385'
  const lng = searchParams.get('lng') ?? '78.4867'
  const radius = searchParams.get('radius') ?? '2000'
  const city = searchParams.get('city') ?? 'Hyderabad'

  // Fetch existing google-sourced vendor names to skip duplicates
  const { data: existing } = await supabase
    .from('vendors')
    .select('name')
    .eq('source', 'google')

  const existingNames = new Set((existing ?? []).map((v: any) => v.name.toLowerCase()))

  const allPlaces: any[] = []
  let pageToken: string | undefined

  for (let page = 0; page < 3; page++) {
    if (page > 0) await sleep(2000) // Google requires delay before using next_page_token
    const { results, nextPageToken } = await fetchPage(lat, lng, radius, pageToken)
    allPlaces.push(...results)
    if (!nextPageToken) break
    pageToken = nextPageToken
  }

  let inserted = 0
  let skipped = 0

  for (const place of allPlaces) {
    if (!place.geometry?.location) { skipped++; continue }
    if (existingNames.has(place.name.toLowerCase())) { skipped++; continue }

    const vendor = {
      name: place.name,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      address: place.vicinity ?? null,
      city,
      tags: guessTags(place.name),
      source: 'google',
      added_by: null,
    }

    const { error } = await supabase.from('vendors').insert(vendor)
    if (error) {
      skipped++
    } else {
      inserted++
      existingNames.add(place.name.toLowerCase())
    }
  }

  return Response.json({
    ok: true,
    total_found: allPlaces.length,
    inserted,
    skipped,
    city,
    center: { lat, lng },
    radius_m: radius,
  })
}
