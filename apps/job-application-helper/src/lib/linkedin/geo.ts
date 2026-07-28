const TYPEAHEAD_URL = "https://www.linkedin.com/jobs-guest/api/typeaheadHits";

interface TypeaheadHit {
  geoId?: string;
  id?: string;
}

/** Resolves a free-text location name to a LinkedIn geoId via the guest typeahead endpoint. */
export async function resolveGeoId(query: string): Promise<string | undefined> {
  const params = new URLSearchParams({
    origin: "jserp",
    typeaheadType: "GEO",
    geoTypes: "POPULATED_PLACE",
    query,
  });
  const res = await fetch(`${TYPEAHEAD_URL}?${params.toString()}`, {
    cache: "no-store",
    headers: { "User-Agent": "job-application-helper (personal use)" },
  });
  if (!res.ok) throw new Error(`LinkedIn geo lookup failed: ${res.status}`);
  const hits = (await res.json()) as TypeaheadHit[];
  return hits[0]?.geoId ?? hits[0]?.id;
}
