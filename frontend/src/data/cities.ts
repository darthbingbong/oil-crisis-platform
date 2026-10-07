// Major cities meaningfully exposed to oil-supply disruption / the EV
// transition. Coordinates are real, verifiable geography. The impact
// metrics are NOT backed by a live model (the platform has no per-city
// economic dataset) -- they're illustrative placeholders, explicitly
// labeled as such in sourceNote, per the brief's instruction not to
// present invented figures as verified fact. Extend this file (or wire
// it to a real per-city dataset/endpoint) rather than hardcoding numbers
// elsewhere in the app.

export interface CityDatum {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export const CITIES: CityDatum[] = [
  { id: "rotterdam", name: "Rotterdam", country: "Netherlands", lat: 51.92, lng: 4.48 },
  { id: "singapore", name: "Singapore", country: "Singapore", lat: 1.35, lng: 103.82 },
  { id: "mumbai", name: "Mumbai", country: "India", lat: 19.08, lng: 72.88 },
  { id: "lagos", name: "Lagos", country: "Nigeria", lat: 6.52, lng: 3.38 },
  { id: "shanghai", name: "Shanghai", country: "China", lat: 31.23, lng: 121.47 },
  { id: "houston", name: "Houston", country: "United States", lat: 29.76, lng: -95.37 },
];
