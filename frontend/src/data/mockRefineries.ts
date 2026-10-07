// Real refinery/export-hub data, fetched from GET /api/v1/refineries on
// 2026-09-14. Hardcoded here so the globe has real, correctly-shaped data
// before the frontend is wired to a live backend.
import type { RefineryHub } from "../types";

export const mockRefineries: RefineryHub[] = [
  {
    "name": "Ras Tanura",
    "country": "Saudi Arabia",
    "lat": 26.7,
    "lng": 50.15,
    "capacity_bpd": 550000.0,
    "hub_type": "refinery_and_export_terminal",
    "nearest_chokepoint": "Hormuz",
    "notes": "World's largest crude oil export terminal; refinery capacity ~550k bpd, terminal loading capacity far higher (~6M bpd nameplate). Estimate."
  },
  {
    "name": "Jamnagar",
    "country": "India",
    "lat": 22.37,
    "lng": 69.85,
    "capacity_bpd": 1240000.0,
    "hub_type": "refinery",
    "nearest_chokepoint": "Hormuz",
    "notes": "Reliance complex, world's largest single refinery site (combined SEZ+DTA units); most crude feedstock transits Hormuz. Estimate."
  },
  {
    "name": "Ulsan",
    "country": "South Korea",
    "lat": 35.5,
    "lng": 129.38,
    "capacity_bpd": 840000.0,
    "hub_type": "refinery",
    "nearest_chokepoint": "Malacca",
    "notes": "SK Energy; South Korea's crude imports predominantly transit the Strait of Malacca. Estimate."
  },
  {
    "name": "Yeosu",
    "country": "South Korea",
    "lat": 34.76,
    "lng": 127.66,
    "capacity_bpd": 800000.0,
    "hub_type": "refinery",
    "nearest_chokepoint": "Malacca",
    "notes": "GS Caltex. Estimate."
  },
  {
    "name": "Singapore (Jurong/Pulau Bukom)",
    "country": "Singapore",
    "lat": 1.27,
    "lng": 103.7,
    "capacity_bpd": 1300000.0,
    "hub_type": "refinery_and_export_terminal",
    "nearest_chokepoint": "Malacca",
    "notes": "Combined capacity across major refineries on Jurong Island/Pulau Bukom; sits directly on the Malacca Strait shipping lane. Estimate."
  },
  {
    "name": "Houston Ship Channel",
    "country": "United States",
    "lat": 29.73,
    "lng": -95.26,
    "capacity_bpd": 2600000.0,
    "hub_type": "refinery_and_export_terminal",
    "nearest_chokepoint": "none",
    "notes": "Largest US refining/export hub; not chokepoint-dependent (Gulf of Mexico access). Estimate, aggregated across multiple refineries."
  },
  {
    "name": "Port Arthur",
    "country": "United States",
    "lat": 29.9,
    "lng": -93.94,
    "capacity_bpd": 640000.0,
    "hub_type": "refinery",
    "nearest_chokepoint": "none",
    "notes": "Motiva Port Arthur, largest single refinery in the US. Estimate."
  },
  {
    "name": "Corpus Christi",
    "country": "United States",
    "lat": 27.8,
    "lng": -97.4,
    "capacity_bpd": 800000.0,
    "hub_type": "export_terminal",
    "nearest_chokepoint": "none",
    "notes": "Leading US crude export terminal since the shale boom. Estimate."
  },
  {
    "name": "Rotterdam (Pernis)",
    "country": "Netherlands",
    "lat": 51.9,
    "lng": 4.35,
    "capacity_bpd": 404000.0,
    "hub_type": "refinery_and_export_terminal",
    "nearest_chokepoint": "none",
    "notes": "Shell Pernis, largest refinery in Europe; Rotterdam port overall handles far higher throughput as Europe's main entrepot. Estimate."
  },
  {
    "name": "Fujairah",
    "country": "United Arab Emirates",
    "lat": 25.12,
    "lng": 56.34,
    "capacity_bpd": 1500000.0,
    "hub_type": "export_terminal",
    "nearest_chokepoint": "none",
    "notes": "Purpose-built to bypass Hormuz via the ADCOP overland pipeline from Abu Dhabi to the Gulf of Oman. Pipeline capacity estimate."
  },
  {
    "name": "Yanbu",
    "country": "Saudi Arabia",
    "lat": 24.09,
    "lng": 38.06,
    "capacity_bpd": 550000.0,
    "hub_type": "refinery_and_export_terminal",
    "nearest_chokepoint": "none",
    "notes": "Red Sea terminus of the East-West (Petroline) pipeline; lets Saudi crude bypass Hormuz entirely. Estimate."
  },
  {
    "name": "Kharg Island",
    "country": "Iran",
    "lat": 29.23,
    "lng": 50.32,
    "capacity_bpd": 4000000.0,
    "hub_type": "export_terminal",
    "nearest_chokepoint": "Hormuz",
    "notes": "Iran's main crude export terminal; nameplate loading capacity far exceeds Iran's actual output/exports. Estimate."
  },
  {
    "name": "Ceyhan",
    "country": "Turkey",
    "lat": 36.85,
    "lng": 35.56,
    "capacity_bpd": 1600000.0,
    "hub_type": "export_terminal",
    "nearest_chokepoint": "none",
    "notes": "Mediterranean terminus of the BTC (Baku-Tbilisi-Ceyhan) and Iraq-Turkey pipelines; bypasses both Hormuz and Suez. Estimate."
  },
  {
    "name": "Sidi Kerir",
    "country": "Egypt",
    "lat": 31.13,
    "lng": 32.55,
    "capacity_bpd": 2500000.0,
    "hub_type": "export_terminal",
    "nearest_chokepoint": "Suez",
    "notes": "SUMED pipeline terminal, the overland bypass for the Suez Canal when the canal itself is congested or blocked. Estimate."
  },
  {
    "name": "Primorsk",
    "country": "Russia",
    "lat": 60.33,
    "lng": 28.71,
    "capacity_bpd": 1200000.0,
    "hub_type": "export_terminal",
    "nearest_chokepoint": "none",
    "notes": "Russia's main Baltic Sea crude export terminal. Estimate."
  },
  {
    "name": "Novorossiysk",
    "country": "Russia",
    "lat": 44.72,
    "lng": 37.77,
    "capacity_bpd": 600000.0,
    "hub_type": "export_terminal",
    "nearest_chokepoint": "none",
    "notes": "Black Sea export terminal; transits the Bosphorus/Turkish Straits, a chokepoint not currently tracked in this platform's 4-chokepoint set. Estimate."
  },
  {
    "name": "Ras Laffan",
    "country": "Qatar",
    "lat": 25.91,
    "lng": 51.55,
    "capacity_bpd": 400000.0,
    "hub_type": "export_terminal",
    "nearest_chokepoint": "Hormuz",
    "notes": "Primarily an LNG hub but also exports crude/condensate; entirely Hormuz-dependent. Estimate."
  }
];
