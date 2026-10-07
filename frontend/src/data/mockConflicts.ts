// Real historical events, fetched from GET /api/v1/conflicts on 2026-09-14.
// Hardcoded here so the globe has real, correctly-shaped data before the
// frontend is wired to a live backend -- see PHASE1_SUMMARY.md for the source.
import type { ConflictEvent } from "../types";

export const mockConflicts: ConflictEvent[] = [
  {
    "name": "1973 OPEC Oil Embargo",
    "event_date": "1973-10-17",
    "chokepoint": "none",
    "conflict_intensity": 9.0,
    "supply_loss_pct": 7.0,
    "lat": null,
    "lng": null
  },
  {
    "name": "1979 Iranian Revolution",
    "event_date": "1979-01-16",
    "chokepoint": "Hormuz",
    "conflict_intensity": 8.0,
    "supply_loss_pct": 4.5,
    "lat": 26.57,
    "lng": 56.25
  },
  {
    "name": "1980 Iran-Iraq War",
    "event_date": "1980-09-22",
    "chokepoint": "Hormuz",
    "conflict_intensity": 9.0,
    "supply_loss_pct": 6.0,
    "lat": 26.57,
    "lng": 56.25
  },
  {
    "name": "1986 Saudi 'Yamani Flood' (Price War)",
    "event_date": "1986-01-02",
    "chokepoint": "none",
    "conflict_intensity": 2.0,
    "supply_loss_pct": -4.5,
    "lat": null,
    "lng": null
  },
  {
    "name": "1990 Gulf War (Iraq invades Kuwait)",
    "event_date": "1990-08-02",
    "chokepoint": "Hormuz",
    "conflict_intensity": 8.0,
    "supply_loss_pct": 6.0,
    "lat": 26.57,
    "lng": 56.25
  },
  {
    "name": "1997-98 Asian Financial Crisis",
    "event_date": "1997-07-02",
    "chokepoint": "none",
    "conflict_intensity": 1.0,
    "supply_loss_pct": 0.0,
    "lat": null,
    "lng": null
  },
  {
    "name": "2002-03 Venezuela PDVSA General Strike",
    "event_date": "2002-12-02",
    "chokepoint": "none",
    "conflict_intensity": 4.0,
    "supply_loss_pct": 2.9,
    "lat": null,
    "lng": null
  },
  {
    "name": "2003 Iraq War",
    "event_date": "2003-03-20",
    "chokepoint": "Hormuz",
    "conflict_intensity": 7.0,
    "supply_loss_pct": 2.5,
    "lat": 26.57,
    "lng": 56.25
  },
  {
    "name": "2005 Hurricane Katrina",
    "event_date": "2005-08-29",
    "chokepoint": "none",
    "conflict_intensity": 0.0,
    "supply_loss_pct": 1.7,
    "lat": null,
    "lng": null
  },
  {
    "name": "2008 Global Financial Crisis (Lehman Collapse)",
    "event_date": "2008-09-15",
    "chokepoint": "none",
    "conflict_intensity": 2.0,
    "supply_loss_pct": 0.0,
    "lat": null,
    "lng": null
  },
  {
    "name": "2011 Libyan Civil War",
    "event_date": "2011-02-17",
    "chokepoint": "none",
    "conflict_intensity": 6.0,
    "supply_loss_pct": 1.9,
    "lat": null,
    "lng": null
  },
  {
    "name": "2012 EU Oil Embargo on Iran",
    "event_date": "2012-07-01",
    "chokepoint": "none",
    "conflict_intensity": 3.0,
    "supply_loss_pct": 1.1,
    "lat": null,
    "lng": null
  },
  {
    "name": "2014 OPEC Refuses to Cut Output (Price War Begins)",
    "event_date": "2014-11-27",
    "chokepoint": "none",
    "conflict_intensity": 3.0,
    "supply_loss_pct": -2.1,
    "lat": null,
    "lng": null
  },
  {
    "name": "2016 OPEC Vienna Agreement (First Cut Since 2008)",
    "event_date": "2016-11-30",
    "chokepoint": "none",
    "conflict_intensity": 1.0,
    "supply_loss_pct": 1.25,
    "lat": null,
    "lng": null
  },
  {
    "name": "2018 US Reimposes Iran Sanctions (JCPOA Withdrawal)",
    "event_date": "2018-11-04",
    "chokepoint": "none",
    "conflict_intensity": 3.0,
    "supply_loss_pct": 1.5,
    "lat": null,
    "lng": null
  },
  {
    "name": "2019 Abqaiq-Khurais Drone Attack",
    "event_date": "2019-09-14",
    "chokepoint": "Hormuz",
    "conflict_intensity": 7.0,
    "supply_loss_pct": 5.7,
    "lat": 26.57,
    "lng": 56.25
  },
  {
    "name": "2020 COVID Demand Collapse + Saudi-Russia Price War",
    "event_date": "2020-03-06",
    "chokepoint": "none",
    "conflict_intensity": 4.0,
    "supply_loss_pct": 0.0,
    "lat": null,
    "lng": null
  },
  {
    "name": "2021 Texas Winter Storm Uri",
    "event_date": "2021-02-15",
    "chokepoint": "none",
    "conflict_intensity": 0.0,
    "supply_loss_pct": 3.0,
    "lat": null,
    "lng": null
  },
  {
    "name": "2022 Russia invades Ukraine",
    "event_date": "2022-02-24",
    "chokepoint": "none",
    "conflict_intensity": 7.0,
    "supply_loss_pct": 3.0,
    "lat": null,
    "lng": null
  },
  {
    "name": "2022 US Strategic Petroleum Reserve Release",
    "event_date": "2022-03-31",
    "chokepoint": "none",
    "conflict_intensity": 0.0,
    "supply_loss_pct": -1.0,
    "lat": null,
    "lng": null
  },
  {
    "name": "2023 Israel-Hamas War Begins",
    "event_date": "2023-10-07",
    "chokepoint": "none",
    "conflict_intensity": 5.0,
    "supply_loss_pct": 0.0,
    "lat": null,
    "lng": null
  },
  {
    "name": "2023 Houthi Red Sea Attacks Begin",
    "event_date": "2023-11-19",
    "chokepoint": "Bab el-Mandeb",
    "conflict_intensity": 6.0,
    "supply_loss_pct": 0.0,
    "lat": 12.58,
    "lng": 43.32
  },
  {
    "name": "2025 Israel-Iran '12-Day War'",
    "event_date": "2025-06-13",
    "chokepoint": "Hormuz",
    "conflict_intensity": 7.0,
    "supply_loss_pct": 0.0,
    "lat": 26.57,
    "lng": 56.25
  },
  {
    "name": "2026 US-Israel War on Iran (Hormuz Blockade)",
    "event_date": "2026-02-28",
    "chokepoint": "Hormuz",
    "conflict_intensity": 9.0,
    "supply_loss_pct": 8.0,
    "lat": 26.57,
    "lng": 56.25
  }
];
