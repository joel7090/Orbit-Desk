import { getScrapedGoogleFlights } from "./googleFlightsScraperData";

export interface GdsSession {
  availability: Array<{
    line: number;
    airline: string;
    flightNo: string;
    classes: string;
    origin: string;
    destination: string;
    date: string;
    depTime: string;
    arrTime: string;
    aircraft: string;
    classesList?: string[];
    duration?: string;
    eticket?: string;
    terminal?: string;
  }>;
  segments: Array<{
    airline: string;
    flightNo: string;
    classOfService: string;
    origin: string;
    destination: string;
    date: string;
    seats: number;
    depTime: string;
    arrTime: string;
    isArnk?: boolean;
    customLines?: {
      amadeus?: string;
      sabre?: string;
      galileo?: string;
    };
  }>;
  names: string[];
  phones: string[];
  ticketing: string | null;
  receivedFrom: string | null;
  activeLocator: string | null;
  extraLines?: string[];
}

export const createEmptySession = (): GdsSession => ({
  availability: [],
  segments: [],
  names: [],
  phones: [],
  ticketing: null,
  receivedFrom: null,
  activeLocator: null,
  extraLines: [],
});

export interface EmulatorResult {
  recognized: boolean;
  output: string[];
  explanation: string;
  isSandbox: boolean;
  updateTerminalLines?: (prevLines: string[]) => string[];
}

// Helper dictionary for full city name displays in headers
const CITY_NAME_MAP: Record<string, string> = {
  LON: "LONDON.GB",
  LHR: "LONDON.GB",
  LGW: "LONDON.GB",
  ATH: "ATHENS.GR",
  TYO: "TOKYO.JP",
  NRT: "TOKYO.JP",
  HND: "TOKYO.JP",
  JFK: "NEW YORK.US",
  NYC: "NEW YORK.US",
  HEL: "HELSINKI.FI",
  AMS: "AMSTERDAM.NL",
  FRA: "FRANKFURT.DE",
  CDG: "PARIS.FR",
  PAR: "PARIS.FR",
  ROM: "ROME.IT",
  FCO: "ROME.IT",
  MUC: "MUNICH.DE",
  SIN: "SINGAPORE.SG",
  HKG: "HONG KONG.HK",
  SYD: "SYDNEY.AU",
  MAD: "MADRID.ES",
  BCN: "BARCELONA.ES",
  VIE: "VIENNA.AT",
  ZRH: "ZURICH.CH",
  DUB: "DUBLIN.IE",
  DXB: "DUBAI.AE",
  DOH: "DOHA.QA",
  AUH: "ABU DHABI.AE",
  CPH: "COPENHAGEN.DK",
  LIS: "LISBON.PT",
  BRU: "BRUSSELS.BE",
  JNB: "JOHANNESBURG.ZA",
};

// Maps hub airports to their respective primary carriers for realistic route matching
const HUB_CARRIERS: Record<string, string[]> = {
  LHR: ["BA", "VS"],
  LGW: ["BA", "U2"],
  LON: ["BA", "VS"],
  JFK: ["AA", "DL", "UA"],
  NYC: ["DL", "UA", "AA"],
  EWR: ["UA"],
  ATH: ["A3", "OA"],
  HEL: ["AY"],
  AMS: ["KL"],
  CDG: ["AF"],
  PAR: ["AF"],
  FRA: ["LH"],
  MUC: ["LH"],
  FCO: ["AZ"],
  ROM: ["AZ"],
  HND: ["JL", "NH"],
  NRT: ["JL", "NH"],
  TYO: ["JL", "NH"],
  SIN: ["SQ"],
  HKG: ["CX"],
  SYD: ["QF"],
  MEL: ["QF"],
  BNE: ["QF"],
  DXB: ["EK"],
  DOH: ["QR"],
  AUH: ["EY"],
  ZRH: ["LX"],
  VIE: ["OS"],
  DUB: ["EI"],
  MAD: ["IB"],
  SFO: ["UA", "AS"],
  LAX: ["DL", "AA", "UA"],
  ORD: ["UA", "AA"],
  DFW: ["AA"],
  MIA: ["AA"],
  ATL: ["DL"],
  CAI: ["MS"],
  ADD: ["ET"],
  JNB: ["SA"],
  CPH: ["SK"],
  ARN: ["SK"],
  OSL: ["SK"],
  LIS: ["TP"],
  BRU: ["SN"],
};

// Parse GDS DDMMM date into custom day of week properties and days advance values
function parseGdsDate(dateStr: string): { dayOfWeek: string; daysAdvance: number; dateFormatted: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const match = dateStr.match(/^(\d{1,2})([A-Z]{3})$/i);
  if (!match) {
    return { dayOfWeek: "SA", daysAdvance: 58, dateFormatted: dateStr.toUpperCase() };
  }
  const day = parseInt(match[1], 10);
  const monthAbbrev = match[2].toUpperCase();
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const monthIdx = months.indexOf(monthAbbrev);
  if (monthIdx === -1) {
    return { dayOfWeek: "SA", daysAdvance: 58, dateFormatted: dateStr.toUpperCase() };
  }
  
  let depDate = new Date(currentYear, monthIdx, day);
  // Set day boundary safely
  if (depDate.getTime() < now.getTime() - 86400000) {
    depDate = new Date(currentYear + 1, monthIdx, day);
  }
  
  const weekDays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const dayOfWeek = weekDays[depDate.getDay()];
  
  const diffTime = depDate.getTime() - now.getTime();
  const daysAdvance = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  return {
    dayOfWeek,
    daysAdvance,
    dateFormatted: `${day.toString().padStart(2, "0")}${monthAbbrev}`
  };
}

// Check if a specific booking class is available on a flight
function isClassAvailable(matchedFlight: any, cabinClass: string): boolean {
  if (!matchedFlight) return false;
  const classesList: string[] = matchedFlight.classesList || (matchedFlight.classes ? [matchedFlight.classes] : []);
  if (classesList.length === 0) return false;

  const target = cabinClass.toUpperCase();
  for (const classLine of classesList) {
    if (!classLine) continue;
    const tokens = classLine.toUpperCase().split(/\s+/);
    for (const token of tokens) {
      if (!token) continue;
      if (token.charAt(0) === target) {
        return true;
      }
    }
  }
  return false;
}

// In-memory cache to guarantee flight schedule memory and route consistency
interface FlightTemplate {
  airline: string;
  flightNo: string;
  classesList: string[];
  origin: string;
  destination: string;
  terminal?: string;
  depTime: string;
  arrTime: string;
  aircraft: string;
  duration: string;
  eticket?: string;
  stops?: number;
  via?: string;
}

const ROUTE_SCHEDULE_CACHE: Record<string, FlightTemplate[]> = {};

let globalRouteRules: any = null;

export function setGlobalRouteRules(rules: any) {
  globalRouteRules = rules;
  clearRouteScheduleCache();
}

export function clearRouteScheduleCache() {
  for (const key in ROUTE_SCHEDULE_CACHE) {
    delete ROUTE_SCHEDULE_CACHE[key];
  }
}

// Guess the country/region to calculate correct flight durations
function getAirportRegion(code: string): string {
  const usAirports = ["JFK", "NYC", "EWR", "LGA", "MIA", "LAX", "SFO", "ORD", "DFW", "ATL", "BOS", "SEA", "DEN", "LAS", "CLT", "PHX", "IAH", "MCO", "MSP", "DTW", "SAN", "SJC"];
  const euAirports = ["LHR", "LGW", "LON", "LCY", "MAN", "EDI", "GLA", "AMS", "CDG", "ORY", "PAR", "FRA", "MUC", "ZRH", "VIE", "DUB", "BRU", "LIS", "OPO", "MAD", "BCN", "AGP", "FCO", "MXP", "ROM", "MIL", "HEL", "ATH", "CPH", "ARN", "OSL", "BER"];
  const asAirports = ["HND", "NRT", "TYO", "KIX", "PEK", "PVG", "CAN", "HKG", "TPE", "ICN", "SIN", "BKK", "HKT", "KUL", "MNL", "CGK"];
  const meAirports = ["DXB", "DOH", "AUH", "MCT", "RUH", "JED", "KWI", "BAH"];
  const auAirports = ["SYD", "MEL", "BNE", "PER", "AKL", "WLG", "CHC"];
  const afAirports = ["JNB", "CPT", "DUR", "CAI", "ADD", "LOS", "NBO", "CMN"];
  
  if (usAirports.includes(code)) return "US";
  if (euAirports.includes(code)) return "EU";
  if (asAirports.includes(code)) return "AS";
  if (meAirports.includes(code)) return "ME";
  if (auAirports.includes(code)) return "AU";
  if (afAirports.includes(code)) return "AF";
  return "EU";
}

// Math timezone-agnostic helper to add flight duration to departure time
function addDurationToTime(timeStr: string, durationStr: string): string {
  const depMatch = timeStr.match(/^(\d{2})(\d{2})$/);
  const durMatch = durationStr.match(/^(\d+):(\d{2})$/);
  if (!depMatch || !durMatch) return "1200";
  
  const depHrs = parseInt(depMatch[1], 10);
  const depMins = parseInt(depMatch[2], 10);
  const durHrs = parseInt(durMatch[1], 10);
  const durMins = parseInt(durMatch[2], 10);
  
  let totalMins = (depHrs * 60 + depMins) + (durHrs * 60 + durMins);
  totalMins = totalMins % 1440;
  
  const arrHrs = Math.floor(totalMins / 60);
  const arrMins = totalMins % 60;
  
  return `${arrHrs.toString().padStart(2, "0")}${arrMins.toString().padStart(2, "0")}`;
}

// Calculate flight duration and possible aircraft kinds depending on route
function estimateFlightDuration(org: string, dest: string): { duration: string; minDuration: number; aircrafts: string[] } {
  const regA = getAirportRegion(org);
  const regB = getAirportRegion(dest);

  if (org === "LHR" || org === "LGW" || org === "LON") {
    if (dest === "ATH") return { duration: "3:55", minDuration: 235, aircrafts: ["320", "321", "767"] };
    if (dest === "JFK" || dest === "NYC") return { duration: "8:05", minDuration: 485, aircrafts: ["777", "350", "789"] };
    if (dest === "AMS") return { duration: "1:20", minDuration: 80, aircrafts: ["320", "73H"] };
    if (dest === "CDG" || dest === "PAR") return { duration: "1:15", minDuration: 75, aircrafts: ["320", "321"] };
    if (dest === "HEL") return { duration: "2:55", minDuration: 175, aircrafts: ["321", "320"] };
    if (dest === "DXB") return { duration: "6:45", minDuration: 405, aircrafts: ["380", "777"] };
    if (dest === "SIN") return { duration: "12:50", minDuration: 770, aircrafts: ["380", "777", "350"] };
    if (dest === "SYD") return { duration: "22:15", minDuration: 1335, aircrafts: ["380", "777"] };
  }
  if (org === "ATH" && (dest === "LHR" || dest === "LGW" || dest === "LON")) {
    return { duration: "3:55", minDuration: 235, aircrafts: ["320", "321", "767"] };
  }
  if ((org === "JFK" || org === "NYC") && (dest === "LHR" || dest === "LGW" || dest === "LON")) {
    return { duration: "7:35", minDuration: 455, aircrafts: ["777", "350", "789"] };
  }
  if (org === "HEL" && (dest === "TYO" || dest === "HND" || dest === "NRT")) {
    return { duration: "9:25", minDuration: 565, aircrafts: ["359", "789"] };
  }
  if ((org === "TYO" || org === "HND" || org === "NRT") && dest === "HEL") {
    return { duration: "9:45", minDuration: 585, aircrafts: ["359", "789"] };
  }

  // Cross-Region Estimation
  if (regA === "EU" && regB === "US") return { duration: "8:15", minDuration: 495, aircrafts: ["777", "350", "789"] };
  if (regA === "US" && regB === "EU") return { duration: "7:45", minDuration: 465, aircrafts: ["777", "350", "789"] };
  
  if (regA === "US" && regB === "AS") return { duration: "11:30", minDuration: 690, aircrafts: ["777", "789", "350"] };
  if (regA === "AS" && regB === "US") return { duration: "10:45", minDuration: 645, aircrafts: ["777", "789", "350"] };

  if (regA === "EU" && regB === "AS") return { duration: "12:15", minDuration: 735, aircrafts: ["350", "777", "789"] };
  if (regA === "AS" && regB === "EU") return { duration: "11:50", minDuration: 710, aircrafts: ["350", "777", "789"] };

  if (regA === "EU" && regB === "AU") return { duration: "21:40", minDuration: 1300, aircrafts: ["380", "777", "350"] };
  if (regA === "AU" && regB === "EU") return { duration: "22:10", minDuration: 1330, aircrafts: ["380", "777", "350"] };

  if (regA === "ME" && regB === "EU") return { duration: "6:30", minDuration: 390, aircrafts: ["777", "380", "333"] };
  if (regA === "EU" && regB === "ME") return { duration: "6:15", minDuration: 375, aircrafts: ["777", "380", "333"] };

  if (regA === "ME" && regB === "AS") return { duration: "8:30", minDuration: 510, aircrafts: ["777", "380", "789"] };
  if (regA === "AS" && regB === "ME") return { duration: "8:15", minDuration: 495, aircrafts: ["777", "380", "789"] };

  // Intra-Region estimation
  if (regA === regB) {
    if (org === dest) return { duration: "0:45", minDuration: 45, aircrafts: ["DH4", "AT7"] };
    const isMedium = ["ATH", "HEL", "MIA", "LAX", "SFO", "SIN", "SYD", "HND", "NRT", "JNB"].includes(org) || 
                     ["ATH", "HEL", "MIA", "LAX", "SFO", "SIN", "SYD", "HND", "NRT", "JNB"].includes(dest);
    if (isMedium) {
      return { duration: "3:30", minDuration: 210, aircrafts: ["320", "321", "73H"] };
    }
    return { duration: "1:35", minDuration: 95, aircrafts: ["320", "319", "73H"] };
  }

  return { duration: "5:30", minDuration: 330, aircrafts: ["73H", "320", "752"] };
}

// Generate realistic airline operators for a route pairing
function getAirlinesForRoute(org: string, dest: string): string[] {
  const oHubs = HUB_CARRIERS[org] || [];
  const dHubs = HUB_CARRIERS[dest] || [];

  const candidates = new Set<string>();
  
  if (oHubs[0]) candidates.add(oHubs[0]);
  if (dHubs[0]) candidates.add(dHubs[0]);
  if (oHubs[1]) candidates.add(oHubs[1]);
  if (dHubs[1]) candidates.add(dHubs[1]);

  oHubs.forEach(c => candidates.add(c));
  dHubs.forEach(c => candidates.add(c));

  if (org === "LHR" || dest === "LHR") candidates.add("BA");
  if (org === "ATH" || dest === "ATH") candidates.add("A3");
  if (org === "HEL" || dest === "HEL") candidates.add("AY");
  if (org === "AMS" || dest === "AMS") candidates.add("KL");
  if (org === "CDG" || dest === "CDG") candidates.add("AF");
  if (org === "FRA" || dest === "FRA" || org === "MUC" || dest === "MUC") candidates.add("LH");
  if (org === "FCO" || dest === "FCO" || org === "ROM" || dest === "ROM") candidates.add("AZ");

  if (candidates.size === 0) {
    candidates.add("LH");
    candidates.add("BA");
    candidates.add("UA");
  }

  return Array.from(candidates).slice(0, 5);
}

// Deterministic hashing engine to compute consistent numbers and offsets per route
function getRouteSeed(org: string, dest: string): number {
  const str = `${org}-${dest}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

// Generates dynamic flights for availability searches
export function generateMockFlights(date: string, origin: string, destination: string) {
  const d = date ? date.toUpperCase() : "15OCT";
  const org = origin ? origin.toUpperCase() : "LHR";
  const dest = destination ? destination.toUpperCase() : "JFK";

  const cacheKey = `${org}-${dest}`;

  // If already in memory cache, reuse it for this route!
  if (ROUTE_SCHEDULE_CACHE[cacheKey]) {
    return ROUTE_SCHEDULE_CACHE[cacheKey].map((template, idx) => ({
      line: idx + 1,
      airline: template.airline,
      flightNo: template.flightNo,
      classes: template.classesList[0],
      classesList: template.classesList,
      origin: template.origin,
      destination: template.destination,
      date: d,
      depTime: template.depTime,
      arrTime: template.arrTime,
      aircraft: template.aircraft,
      duration: template.duration,
      eticket: template.eticket || "E0",
      terminal: template.terminal || "",
      stops: template.stops || 0,
      via: template.via || ""
    }));
  }

  // Determine if a custom route rule matches this search
  const activeRules = globalRouteRules || {
    groupCities: { "LON": ["LHR", "LGW", "STN"] },
    destinationRules: [
      {
        "destination": "BKK",
        "airlines": [
          { "airline": "TG", "isDirect": true, "via": "", "allowedOrigins": ["LHR"] },
          { "airline": "BA", "isDirect": true, "via": "", "allowedOrigins": [] },
          { "airline": "EK", "isDirect": false, "via": "DXB", "allowedOrigins": [] },
          { "airline": "QR", "isDirect": false, "via": "DOH", "allowedOrigins": [] },
          { "airline": "EY", "isDirect": false, "via": "AUH", "allowedOrigins": [] }
        ]
      },
      {
        "destination": "JFK",
        "airlines": [
          { "airline": "BA", "isDirect": true, "via": "", "allowedOrigins": [] },
          { "airline": "VS", "isDirect": true, "via": "", "allowedOrigins": [] },
          { "airline": "AA", "isDirect": true, "via": "", "allowedOrigins": [] },
          { "airline": "DL", "isDirect": true, "via": "", "allowedOrigins": [] }
        ]
      },
      {
        "destination": "ATH",
        "airlines": [
          { "airline": "BA", "isDirect": true, "via": "", "allowedOrigins": [] },
          { "airline": "A3", "isDirect": true, "via": "", "allowedOrigins": [] },
          { "airline": "OA", "isDirect": true, "via": "", "allowedOrigins": [] }
        ]
      }
    ]
  };

  const originAirports: string[] = activeRules.groupCities?.[org] || [org];
  const destinationAirports: string[] = activeRules.groupCities?.[dest] || [dest];

  let matchedRule: any = null;
  let targetDestAirport = dest;

  for (const dCode of destinationAirports) {
    const r = activeRules.destinationRules?.find((rule: any) => rule.destination.toUpperCase() === dCode.toUpperCase());
    if (r) {
      matchedRule = r;
      targetDestAirport = dCode;
      break;
    }
  }

  if (matchedRule) {
    const generatedTemplates: FlightTemplate[] = [];

    matchedRule.airlines.forEach((airlineConfig: any, configIdx: number) => {
      const allowedOrigins = airlineConfig.allowedOrigins || [];
      const activeOrigins = allowedOrigins.length > 0
        ? originAirports.filter(o => allowedOrigins.map((ao: string) => ao.toUpperCase()).includes(o.toUpperCase()))
        : originAirports;

      if (activeOrigins.length === 0) return;

      const baseNos: Record<string, number> = {
        TG: 910, BA: 100, EK: 380, QR: 830, EY: 400, VS: 10, SQ: 300, CX: 200, JL: 40, NH: 200, QF: 1, LH: 400, AF: 300, KL: 1200
      };

      activeOrigins.forEach((oAirport) => {
        // Spread times across standard slots
        const rawTimes = ["0845", "1830"];
        rawTimes.forEach((depTime, tIdx) => {
          const carrier = airlineConfig.airline.toUpperCase();
          const startNo = baseNos[carrier] || 100;
          const flightNoVal = startNo + (configIdx * 10) + (tIdx * 2);
          const flightNo = flightNoVal.toString();

          const est = estimateFlightDuration(oAirport, targetDestAirport);
          let durationStr = est.duration;
          let stopsCount = 0;
          let viaStr = "";

          if (!airlineConfig.isDirect) {
            stopsCount = 1;
            viaStr = (airlineConfig.via || "DXB").toUpperCase();
            // Extend flight duration dynamically due to connection
            const parts = durationStr.split(":");
            const h = parseInt(parts[0], 10) || 4;
            const m = parseInt(parts[1], 10) || 0;
            let totalMin = h * 60 + m + 165; // add 2h45m layover
            const newH = Math.floor(totalMin / 60);
            const newM = totalMin % 60;
            durationStr = `${newH}:${newM.toString().padStart(2, "0")}`;
          }

          const arrTime = addDurationToTime(depTime, durationStr);
          const aircraft = est.aircrafts[(configIdx + tIdx) % est.aircrafts.length] || "777";

          let classesList = [
            "J9 C9 D9 I9 Y9 B9 M9",
            "H9 K9 L9 V9 S9 N9 GL"
          ];
          if (["TG", "BA", "EK", "QR", "EY", "SQ"].includes(carrier)) {
            classesList = [
              "F9 A9 J9 C9 D9 Y9 B9",
              "H9 K9 L9 V9 M9 Q9 GL"
            ];
          }

          generatedTemplates.push({
            airline: carrier,
            flightNo,
            classesList,
            origin: oAirport,
            destination: targetDestAirport,
            terminal: oAirport === "LHR" ? "5" : "1",
            depTime,
            arrTime,
            aircraft,
            duration: durationStr,
            eticket: "E0",
            stops: stopsCount,
            via: viaStr
          });
        });
      });
    });

    // Chronological sorting
    generatedTemplates.sort((a, b) => parseInt(a.depTime, 10) - parseInt(b.depTime, 10));

    ROUTE_SCHEDULE_CACHE[cacheKey] = generatedTemplates;

    return generatedTemplates.map((template, idx) => ({
      line: idx + 1,
      airline: template.airline,
      flightNo: template.flightNo,
      classes: template.classesList[0],
      classesList: template.classesList,
      origin: template.origin,
      destination: template.destination,
      date: d,
      depTime: template.depTime,
      arrTime: template.arrTime,
      aircraft: template.aircraft,
      duration: template.duration,
      eticket: template.eticket || "E0",
      terminal: template.terminal || "",
      stops: template.stops || 0,
      via: template.via || ""
    }));
  }

  // Pre-configured high-fidelity routes (Scraped from Google Flights)
  const scrapedFlights = getScrapedGoogleFlights(org, dest);
  let flightTemplates: FlightTemplate[] = [];

  if (scrapedFlights) {
    flightTemplates = scrapedFlights.map((f) => ({
      ...f,
      origin: org,
      destination: dest
    }));
  } else {
    // Dynamically generate realistic flights for are other origin-destination pairs
    const seed = getRouteSeed(org, dest);
    const carriers = getAirlinesForRoute(org, dest);
    const { duration, aircrafts } = estimateFlightDuration(org, dest);
    
    // Spread flights out realistically across the day
    const departureTimes = ["0645", "0830", "1115", "1350", "1540", "1715", "1930", "2100"];
    const flightCount = 5 + (seed % 3); // 5 to 7 flights depending on seed
    
    // Standard airline flight numbering prefixes
    const baseNos: Record<string, number> = {
      BA: 100, LH: 400, AF: 300, KL: 1200, AY: 70, A3: 600, OA: 200, AZ: 400, AA: 100, DL: 50,
      UA: 900, VS: 10, SQ: 300, CX: 200, JL: 40, NH: 200, QF: 1, EK: 7, QR: 8, EY: 10, U2: 5000,
    };

    for (let idx = 0; idx < flightCount; idx++) {
      const carrier = carriers[idx % carriers.length] || "LH";
      const baseVal = baseNos[carrier] || 100;
      const flNoVal = baseVal + (seed % 70) + (idx * 6);
      const flightNo = flNoVal.toString();
      
      const depTime = departureTimes[idx % departureTimes.length];
      const arrTime = addDurationToTime(depTime, duration);
      const aircraft = aircrafts[(seed + idx) % aircrafts.length] || "320";
      
      let classesList = [
        "J9 C9 D9 I9 Y9 B9 M9",
        "H9 K9 L9 V9 S9 N9 GL"
      ];
      
      if (["U2", "FR"].includes(carrier)) {
        classesList = ["YA"]; 
      } else if (["EK", "QR", "EY", "SQ", "BA", "AF", "LH"].includes(carrier) && duration.startsWith("1") || duration.startsWith("2") || parseInt(duration.split(":")[0]) >= 7) {
        // High-end long-haul features First Class
        classesList = [
          "F9 A9 J9 C9 D9 Y9 B9",
          "H9 K9 L9 V9 M9 Q9 GL"
        ];
      }

      flightTemplates.push({
        airline: carrier,
        flightNo,
        classesList,
        origin: org,
        destination: dest,
        terminal: (idx % 3 === 0) ? "2" : (idx % 3 === 1 ? "1" : "5"),
        depTime,
        arrTime,
        aircraft,
        duration,
        eticket: "E0"
      });
    }
  }

  // Save generated schedule to cache memory
  ROUTE_SCHEDULE_CACHE[cacheKey] = flightTemplates;

  return flightTemplates.map((template, idx) => ({
    line: idx + 1,
    airline: template.airline,
    flightNo: template.flightNo,
    classes: template.classesList[0],
    classesList: template.classesList,
    origin: template.origin,
    destination: template.destination,
    date: d,
    depTime: template.depTime,
    arrTime: template.arrTime,
    aircraft: template.aircraft,
    duration: template.duration,
    eticket: template.eticket || "E0",
    terminal: template.terminal || "",
    stops: template.stops || 0,
    via: template.via || ""
  }));
}

// Generate random airline record locators (6 alphanumeric)
function generateLocator(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate current time in GDS timestamp format: DDMMMYY/HHMMZ (e.g., 19FEB25/0747Z)
function getGdsTimestamp(): string {
  const now = new Date();
  const days = String(now.getUTCDate()).padStart(2, "0");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const month = months[now.getUTCMonth()];
  const year = String(now.getUTCFullYear()).substring(2);
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  return `${days}${month}${year}/${hours}${minutes}Z`;
}

export function formatTicketingLine(ticketingStr: string): string {
  const upper = ticketingStr.toUpperCase().trim();
  if (upper === "LDATE" || upper === "TKLDATE" || upper === "TLDATE" || upper === "TKTLDATE") {
    return "TK TL DATE";
  }
  if (upper.startsWith("TKTL")) {
    const part = ticketingStr.substring(4);
    return `TK TL ${part}`;
  }
  if (upper.startsWith("TKXL")) {
    const part = ticketingStr.substring(4);
    return `TK XL ${part}`;
  }
  if (upper.startsWith("TL")) {
    const part = ticketingStr.substring(2);
    return `TK TL ${part}`;
  }
  if (upper.startsWith("XL")) {
    const part = ticketingStr.substring(2);
    return `TK XL ${part}`;
  }
  if (upper.startsWith("TKOK")) {
    const part = ticketingStr.substring(4).trim();
    return `TK OK ${part || "OK"}`;
  }
  if (upper.startsWith("OK")) {
    return `TK OK ${ticketingStr}`;
  }
  return `TK OK ${ticketingStr}`;
}

export function isPnrLayoutLine(line: string): boolean {
  const cleanLine = line
    .replace(/^__HIGHLIGHT_ORB_YELLOW__/, "")
    .replace(/^__HIGHLIGHT_ORB_GREEN__/, "");
  const trimmed = cleanLine.trim();
  if (!trimmed) return false;
  
  // Amadeus matchers
  if (trimmed.startsWith("RP/")) return true;
  if (trimmed.startsWith("PNR KEY REGISTERED") || trimmed.startsWith("PNR CONVAL CLOUD KEY")) return true;
  
  // Sabre matchers
  if (trimmed.includes("SABRE SECURITY") || trimmed.startsWith("LOCATOR -") || trimmed.includes("SABRE ACTIVE DISPLAY")) return true;
  
  // Galileo matchers
  if (trimmed.includes("/1D LON") && trimmed.includes("SYSTEM GDS")) return true;

  // General numbered lines inside GDS PNR layout
  if (/^\s*\d+\.\s*/.test(cleanLine)) return true;
  if (/^\s*\d+\.\d+\s*/.test(cleanLine)) return true;
  if (/^\s*\d+\s+[A-Z0-9]{2}\s+/.test(cleanLine)) return true;
  if (/^\s*\d+\s+AP\s+/.test(cleanLine)) return true;
  if (/^\s*\d+\s+APE\s+/.test(cleanLine)) return true;
  if (/^\s*\d+\s+TK\s+/.test(cleanLine)) return true;
  if (/^\s*\d+\s+OP RECEIVED\s+/.test(cleanLine)) return true;
  if (/^\s*\d+\s+SSR\s+/.test(cleanLine)) return true;
  if (trimmed.includes("OP RECEIVED FROM")) return true;
  if (trimmed.startsWith("SSR ")) return true;

  return false;
}

export function cleanupPnrDuplication(prevLines: string[], newLines: string[]): string[] {
  const hasNewPnrBlock = newLines.some(line => {
    const clean = line
      .replace(/^__HIGHLIGHT_ORB_YELLOW__/, "")
      .replace(/^__HIGHLIGHT_ORB_GREEN__/, "");
    const trimmed = clean.trim();
    return trimmed.startsWith("RP/") || 
           trimmed.includes("SABRE SECURITY") || 
           trimmed.startsWith("LOCATOR -") || 
           trimmed.includes("SABRE ACTIVE DISPLAY") || 
           (trimmed.includes("/1D LON") && trimmed.includes("SYSTEM GDS"));
  });

  if (!hasNewPnrBlock) {
    return prevLines;
  }

  return prevLines.filter(line => {
    const clean = line
      .replace(/^__HIGHLIGHT_ORB_YELLOW__/, "")
      .replace(/^__HIGHLIGHT_ORB_GREEN__/, "");
    const trimmed = clean.trim();
    if (trimmed.startsWith(">") || trimmed.startsWith("*") || trimmed.startsWith("¤")) {
      return true;
    }
    return !isPnrLayoutLine(line);
  });
}

/**
 * Inserts an appended line directly after the last numbered GDS line of a terminal block.
 * Returns null if no numbered line could be resolved.
 */
export function insertLineBelowLastNumberedLine(
  lines: string[],
  customLine: string,
  gdsStyle: "amadeus" | "sabre" | "galileo"
): string[] | null {
  let lastNumberedIdx = -1;
  let lastNumStr = "";
  
  // Robust matcher for numbered PNR lines:
  // Match groups:
  // 1. leading optional space
  // 2. number or dotted number (like 1, 12, 1.1)
  // 3. dot or space separator
  // 4. actual line contents
  const gdsNumRegex = /^\s*(\d+(?:\.\d+)?)(?:\.|\s)\s*(.*)$/;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const cleanLine = line
      .replace(/^__HIGHLIGHT_ORB_YELLOW__/, "")
      .replace(/^__HIGHLIGHT_ORB_GREEN__/, "");
    const trimmed = cleanLine.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith(">") || trimmed.startsWith("*") || trimmed.startsWith("¤")) {
      continue;
    }

    const match = cleanLine.match(gdsNumRegex);
    if (match) {
      const numPart = match[1];
      const mainFirstPart = numPart.split(".")[0];
      const firstInt = parseInt(mainFirstPart, 10);
      
      // Ensure it is a valid GDS-like sequence line number
      if (!isNaN(firstInt) && firstInt >= 1 && firstInt <= 99) {
        lastNumberedIdx = i;
        lastNumStr = numPart;
        break;
      }
    }
  }

  if (lastNumberedIdx !== -1) {
    let nextNumStr = "";
    if (lastNumStr.includes(".")) {
      const parts = lastNumStr.split(".");
      const firstNum = parseInt(parts[0], 10);
      if (!isNaN(firstNum)) {
        nextNumStr = String(firstNum + 1);
      } else {
        nextNumStr = "1";
      }
    } else {
      const numVal = parseInt(lastNumStr, 10);
      if (!isNaN(numVal)) {
        nextNumStr = String(numVal + 1);
      } else {
        nextNumStr = "1";
      }
    }

    let formattedAppended = "";
    if (gdsStyle === "amadeus") {
      const numPadding = nextNumStr.length > 1 ? "  " : "   ";
      formattedAppended = ` ${nextNumStr}${numPadding}${customLine}`;
    } else if (gdsStyle === "sabre") {
      formattedAppended = `${nextNumStr}. ${customLine}`;
    } else {
      formattedAppended = ` ${nextNumStr}. ${customLine}`;
    }

    const modified = [...lines];
    modified.splice(lastNumberedIdx + 1, 0, formattedAppended);
    return modified;
  }

  return null;
}

export function renderGdsPnrBuffer(
  gdsStyle: "amadeus" | "sabre" | "galileo",
  session: GdsSession,
  customLocator?: string
): string[] {
  const activeLocStr = customLocator || session.activeLocator || "BA123A";
  const names = session.names && session.names.length > 0 ? session.names : ["SMITH/ANNA MS", "SMITH/GEORGE MR"];
  const segments = session.segments || [];
  const phones = session.phones && session.phones.length > 0 ? session.phones : ["02071234567"];
  const ticketing = session.ticketing || "BA OK 15OCT/LON-BA";
  const receivedFrom = session.receivedFrom || "PASSENGER";

  // Parse extraLines for position prefixes
  const topLines: string[] = [];
  const middleLines: string[] = [];
  const bottomLines: string[] = [];

  (session.extraLines || []).forEach(line => {
    if (line.startsWith("[POS_TOP]")) {
      topLines.push(line.substring(9));
    } else if (line.startsWith("[POS_MID]")) {
      middleLines.push(line.substring(9));
    } else {
      bottomLines.push(line);
    }
  });

  const pnrLines: string[] = [];
  let lineNo = 1;

  if (gdsStyle === "amadeus") {
    pnrLines.push(`RP/LONBA2460/LONBA2460             29MAY26/0830Z   ${activeLocStr}`);

    // 1. Top lines
    topLines.forEach(line => {
      pnrLines.push(` ${lineNo++}  ${line}`);
    });

    // 2. Names
    names.forEach(n => {
      pnrLines.push(` ${lineNo++}.${n}`);
    });

    // 3. Segments and Middle lines
    const midIndex = segments.length > 1 ? Math.floor(segments.length / 2) - 1 : 0;
    if (segments.length === 0) {
      middleLines.forEach(line => {
        pnrLines.push(` ${lineNo++}  ${line}`);
      });
    } else {
      segments.forEach((seg, idx) => {
        pnrLines.push(formatAmadeusSegment(lineNo++, seg));
        if (idx === midIndex) {
          middleLines.forEach(line => {
            pnrLines.push(` ${lineNo++}  ${line}`);
          });
        }
      });
    }

    // 4. Phones
    phones.forEach(p => {
      if (p.includes("@")) {
        pnrLines.push(` ${lineNo++} APE ${p}`);
      } else {
        pnrLines.push(` ${lineNo++}  AP ${p}`);
      }
    });

    // 5. Ticketing
    if (ticketing) {
      pnrLines.push(` ${lineNo++}  ${formatTicketingLine(ticketing)}`);
    }

    // 6. Received From
    if (receivedFrom) {
      pnrLines.push(` ${lineNo++}  OP RECEIVED FROM ${receivedFrom}`);
    }

    // 7. Bottom lines
    bottomLines.forEach(line => {
      pnrLines.push(` ${lineNo++}  ${line}`);
    });

  } else if (gdsStyle === "sabre") {
    pnrLines.push(`SABRE SECURITY DISK MONITORS - COOPERATIVE RECD`);
    pnrLines.push(`LOCATOR - ${activeLocStr}`);

    // 1. Top lines
    topLines.forEach(line => {
      pnrLines.push(`${lineNo++}. ${line}`);
    });

    // 2. Names
    names.forEach(n => {
      pnrLines.push(`${lineNo++}.1 ${n}`);
    });

    // 3. Segments and Middle lines
    const midIndex = segments.length > 1 ? Math.floor(segments.length / 2) - 1 : 0;
    if (segments.length === 0) {
      middleLines.forEach(line => {
        pnrLines.push(`${lineNo++}. ${line}`);
      });
    } else {
      segments.forEach((seg, idx) => {
        pnrLines.push(formatSabreSegment(lineNo++, seg));
        if (idx === midIndex) {
          middleLines.forEach(line => {
            pnrLines.push(`${lineNo++}. ${line}`);
          });
        }
      });
    }

    // 4. Phones
    phones.forEach(p => {
      pnrLines.push(`${lineNo++}. AP ${p}`);
    });

    // 5. Ticketing
    if (ticketing) {
      pnrLines.push(`${lineNo++}. T-A${ticketing}`);
    }

    // 6. Bottom lines
    bottomLines.forEach(line => {
      pnrLines.push(`${lineNo++}. ${line}`);
    });

  } else { // galileo
    pnrLines.push(`${activeLocStr}/1D LON   SYSTEM GDS   29MAY26 13:30Z`);

    // 1. Top lines
    topLines.forEach(line => {
      pnrLines.push(` ${lineNo++}. ${line}`);
    });

    // 2. Names
    names.forEach(n => {
      pnrLines.push(`${lineNo++}.1${n}`);
    });

    // 3. Segments and Middle lines
    const midIndex = segments.length > 1 ? Math.floor(segments.length / 2) - 1 : 0;
    if (segments.length === 0) {
      middleLines.forEach(line => {
        pnrLines.push(` ${lineNo++}. ${line}`);
      });
    } else {
      segments.forEach((seg, idx) => {
        pnrLines.push(formatGalileoSegment(lineNo++, seg));
        if (idx === midIndex) {
          middleLines.forEach(line => {
            pnrLines.push(` ${lineNo++}. ${line}`);
          });
        }
      });
    }

    // 4. Phones
    phones.forEach(p => {
      pnrLines.push(` ${lineNo++}. P.${p}`);
    });

    // 5. Bottom lines
    bottomLines.forEach(line => {
      pnrLines.push(` ${lineNo++}. ${line}`);
    });
  }

  return pnrLines;
}

export function formatAmadeusSegment(lineNo: number, seg: any): string {
  if (seg.isArnk || seg.airline === "ARNK") {
    const spacePrefix = lineNo < 10 ? " " : "";
    return `${spacePrefix}${lineNo}      ARNK`;
  }
  if (seg.customLines && seg.customLines.amadeus) {
    const lineStr = String(lineNo);
    const pads = lineStr.length === 1 ? " " : "";
    return seg.customLines.amadeus.replace(/^\s*\d+/, `${pads}${lineStr}`);
  }
  const spacePrefix = lineNo < 10 ? " " : "";
  return `${spacePrefix}${lineNo}  ${seg.airline} ${seg.flightNo} ${seg.classOfService} ${seg.date} ${seg.origin}${seg.destination} HK${seg.seats}   ${seg.depTime} ${seg.arrTime}`;
}

export function formatSabreSegment(lineNo: number, seg: any): string {
  if (seg.isArnk || seg.airline === "ARNK") {
    return `${lineNo} ARNK`;
  }
  if (seg.customLines && seg.customLines.sabre) {
    return seg.customLines.sabre.replace(/^\d+/, `${lineNo}`);
  }
  return `${lineNo} ${seg.airline} ${seg.flightNo}${seg.classOfService} ${seg.date} ${seg.origin}${seg.destination} SS${seg.seats}  ${seg.depTime} ${seg.arrTime}`;
}

export function formatGalileoSegment(lineNo: number, seg: any): string {
  if (seg.isArnk || seg.airline === "ARNK") {
    const spacePrefix = lineNo < 10 ? " " : "";
    return `${spacePrefix}${lineNo}. ARNK`;
  }
  if (seg.customLines && seg.customLines.galileo) {
    const lineStr = String(lineNo);
    const pads = lineStr.length === 1 ? " " : "";
    return seg.customLines.galileo.replace(/^\s*\d+\.?/, `${pads}${lineStr}.`);
  }
  const spacePrefix = lineNo < 10 ? " " : "";
  return `${spacePrefix}${lineNo}. ${seg.airline} ${seg.flightNo} ${seg.classOfService} ${seg.date} ${seg.origin}${seg.destination}*HS${seg.seats}  ${seg.depTime} ${seg.arrTime}`;
}

export const DEFAULT_PRACTICE_PNRS: Record<string, any> = {
  "SU14JA": {
    locator: "SU14JA",
    names: ["WINTER/EMILY MS"],
    segments: [
      {
        airline: "BA",
        flightNo: "016",
        classOfService: "M",
        origin: "SIN",
        destination: "LHR",
        date: "13MAR",
        seats: 1,
        depTime: "2305",
        arrTime: "0525+1",
        customLines: {
          amadeus: " 2  BA 016 M 13MAR 4 SINLHR HK1       1  2305 0525+1 *1A/E*",
          sabre: "2 BA 016 M 13MAR 4 SINLHR HK1 2305 0525+1 *1A/E*",
          galileo: " 2. BA 016 M 13MAR SINLHR*HS1  2305 0525+1"
        }
      },
      {
        airline: "BA",
        flightNo: "428",
        classOfService: "M",
        origin: "LHR",
        destination: "AMS",
        date: "14MAR",
        seats: 1,
        depTime: "0645",
        arrTime: "0910",
        customLines: {
          amadeus: " 3  BA 428 M 14MAR 5 LHRAMS HK1       5  0645 0910    *1A/E*",
          sabre: "3 BA 428 M 14MAR 5 LHRAMS HK1 0645 0910 *1A/E*",
          galileo: " 3. BA 428 M 14MAR LHRAMS*HS1  0645 0910"
        }
      },
      {
        airline: "BA",
        flightNo: "451",
        classOfService: "S",
        origin: "AMS",
        destination: "LHR",
        date: "19MAR",
        seats: 1,
        depTime: "1830",
        arrTime: "1855",
        customLines: {
          amadeus: " 4  BA 451 S 19MAR 3 AMSLHR HK1          1830 1855    *1A/E*",
          sabre: "4 BA 451 S 19MAR 3 AMSLHR HK1 1830 1855 *1A/E*",
          galileo: " 4. BA 451 S 19MAR AMSLHR*HS1  1830 1855"
        }
      },
      {
        airline: "BA",
        flightNo: "015",
        classOfService: "S",
        origin: "LHR",
        destination: "SIN",
        date: "19MAR",
        seats: 1,
        depTime: "2110",
        arrTime: "1825+1",
        customLines: {
          amadeus: " 5  BA 015 S 19MAR 3 LHRSIN HK1       5  2110 1825+1  *1A/E*",
          sabre: "5 BA 015 S 19MAR 3 LHRSIN HK1 2110 1825+1 *1A/E*",
          galileo: " 5. BA 015 S 19MAR LHRSIN*HS1  2110 1825+1"
        }
      }
    ],
    phones: ["EMILY.WINTER@EMAIL.COM"],
    ticketing: "OK14JAN/XXXXXXXXX",
    receivedFrom: "SU",
    extraLines: [
      "FE PAX CARRIER RESTRICTION APPLY PENALTY APPLIES/S2-5",
      "FV PAX BA/S2-5"
    ]
  },
  "LH89Y3": {
    locator: "LH89Y3",
    names: ["SMITH/JOHN MR", "SMITH/ANNA MS"],
    segments: [
      {
        airline: "LH",
        flightNo: "401",
        classOfService: "Y",
        origin: "LHR",
        destination: "FRA",
        date: "15OCT",
        seats: 2,
        depTime: "0835",
        arrTime: "1115"
      },
      {
        airline: "LH",
        flightNo: "402",
        classOfService: "Y",
        origin: "FRA",
        destination: "LHR",
        date: "25OCT",
        seats: 2,
        depTime: "1620",
        arrTime: "1700"
      }
    ],
    phones: ["02089991234"],
    ticketing: "LH OK 15OCT/LON-LH",
    receivedFrom: "PASSENGER"
  },
  "BA123A": {
    locator: "BA123A",
    names: ["DAVIS/ROBERT MR"],
    segments: [
      {
        airline: "BA",
        flightNo: "117",
        classOfService: "Y",
        origin: "LHR",
        destination: "JFK",
        date: "05NOV",
        seats: 1,
        depTime: "0835",
        arrTime: "1130"
      },
      {
        airline: "BA",
        flightNo: "116",
        classOfService: "Y",
        origin: "JFK",
        destination: "LHR",
        date: "15NOV",
        seats: 1,
        depTime: "2000",
        arrTime: "0800+1"
      }
    ],
    phones: ["02071234567"],
    ticketing: "BA OK 01_NOV/LON-BA",
    receivedFrom: "TRAVEL AGENT"
  },
  "TG994Z": {
    locator: "TG994Z",
    names: ["CHOMPOO/SOMCHAI MR"],
    segments: [
      {
        airline: "TG",
        flightNo: "911",
        classOfService: "C",
        origin: "LHR",
        destination: "BKK",
        date: "12DEC",
        seats: 1,
        depTime: "1150",
        arrTime: "0615+1"
      },
      {
        airline: "TG",
        flightNo: "912",
        classOfService: "C",
        origin: "BKK",
        destination: "LHR",
        date: "22DEC",
        seats: 1,
        depTime: "0110",
        arrTime: "0715"
      }
    ],
    phones: ["0221234567"],
    ticketing: "TG OK 01DEC/BKK-TG",
    receivedFrom: "PASSENGER"
  },
  "SQ721X": {
    locator: "SQ721X",
    names: ["LEE/WENDELL MR", "LEE/MEILING MRS"],
    segments: [
      {
        airline: "SQ",
        flightNo: "317",
        classOfService: "Y",
        origin: "LHR",
        destination: "SIN",
        date: "18JAN",
        seats: 2,
        depTime: "1125",
        arrTime: "0730+1"
      },
      {
        airline: "SQ",
        flightNo: "306",
        classOfService: "Y",
        origin: "SIN",
        destination: "LHR",
        date: "29JAN",
        seats: 2,
        depTime: "0110",
        arrTime: "0745"
      }
    ],
    phones: ["026123456"],
    ticketing: "SQ OK 10JAN/SIN-SQ",
    receivedFrom: "PASSENGER"
  },
  "UA552K": {
    locator: "UA552K",
    names: ["BROWN/SARAH DR"],
    segments: [
      {
        airline: "UA",
        flightNo: "901",
        classOfService: "W",
        origin: "LHR",
        destination: "SFO",
        date: "10FEB",
        seats: 1,
        depTime: "1015",
        arrTime: "1320"
      },
      {
        airline: "UA",
        flightNo: "900",
        classOfService: "W",
        origin: "SFO",
        destination: "LHR",
        date: "22FEB",
        seats: 1,
        depTime: "1810",
        arrTime: "1220+1"
      }
    ],
    phones: ["4155550199"],
    ticketing: "UA OK 30JAN/SFO-UA",
    receivedFrom: "PASSENGER"
  },
  "EK421P": {
    locator: "EK421P",
    names: ["KHAN/AIMAN MR"],
    segments: [
      {
        airline: "EK",
        flightNo: "002",
        classOfService: "Y",
        origin: "LHR",
        destination: "DXB",
        date: "14MAR",
        seats: 1,
        depTime: "1340",
        arrTime: "0040+1"
      },
      {
        airline: "EK",
        flightNo: "005",
        classOfService: "Y",
        origin: "DXB",
        destination: "LHR",
        date: "25MAR",
        seats: 1,
        depTime: "1545",
        arrTime: "2015"
      }
    ],
    phones: ["02089991234"],
    ticketing: "EK OK 05MAR/DXB-EK",
    receivedFrom: "MOTHER"
  },
  "EK717Y": {
    locator: "EK717Y",
    names: ["PATEL/PRIYA MRS", "PATEL/KIRAN MR"],
    durationText: "17 Nights Return",
    segments: [
      {
        airline: "EK",
        flightNo: "012",
        classOfService: "K",
        origin: "LGW",
        destination: "DXB",
        date: "17AUG",
        seats: 2,
        depTime: "1000",
        arrTime: "1950",
        customLines: {
          amadeus: " 3  EK 012 K 17AUG 5 LGWDXB HK2       N  1000 1950    *1A/E*",
          sabre: "3 EK 012 K 17AUG 5 LGWDXB HK2 1000 1950 *1A/E*",
          galileo: " 3. EK 012 K 17AUG LGWDXB*HS2  1000 1950"
        }
      },
      {
        airline: "EK",
        flightNo: "512",
        classOfService: "K",
        origin: "DXB",
        destination: "DEL",
        date: "17AUG",
        seats: 2,
        depTime: "2210",
        arrTime: "0245+1",
        customLines: {
          amadeus: " 4  EK 512 K 17AUG 5 DXBDEL HK2       3  2210 0245+1  *1A/E*",
          sabre: "4 EK 512 K 17AUG 5 DXBDEL HK2 2210 0245+1 *1A/E*",
          galileo: " 4. EK 512 K 17AUG DXBDEL*HS2  2210 0245+1"
        }
      },
      {
        airline: "ARNK",
        isArnk: true,
        flightNo: "",
        classOfService: "",
        origin: "",
        destination: "",
        date: "",
        seats: 0,
        depTime: "",
        arrTime: "",
        customLines: {
          amadeus: " 5      ARNK",
          sabre: "5 ARNK",
          galileo: " 5. ARNK"
        }
      },
      {
        airline: "EK",
        flightNo: "521",
        classOfService: "B",
        origin: "DEL",
        destination: "DXB",
        date: "03SEP",
        seats: 2,
        depTime: "0435",
        arrTime: "0700",
        customLines: {
          amadeus: " 6  EK 52125 B 03SEP 1 DELDXB HK2          0435 0700    *1A/E*",
          sabre: "6 EK 52125 B 03SEP 1 DELDXB HK2 0435 0700 *1A/E*",
          galileo: " 6. EK 52125 B 03SEP DELDXB*HS2  0435 0700"
        }
      },
      {
        airline: "EK",
        flightNo: "009",
        classOfService: "B",
        origin: "DXB",
        destination: "LGW",
        date: "03SEP",
        seats: 2,
        depTime: "1500",
        arrTime: "1930",
        customLines: {
          amadeus: " 7  EK 009 B 03SEP 1 DXBLGW HK2    3  1500 1930    *1A/E*",
          sabre: "7 EK 009 B 03SEP 1 DXBLGW HK2 1500 1930 *1A/E*",
          galileo: " 7. EK 009 B 03SEP DXBLGW*HS2  1500 1930"
        }
      }
    ],
    phones: ["02071239999"],
    ticketing: "EK OK 10AUG/LON-EK",
    receivedFrom: "PASSENGER"
  },
  "DL405X": {
    locator: "DL405X",
    names: ["SMITH/JOHN MR"],
    durationText: "Connection Check",
    segments: [
      {
        airline: "DL",
        flightNo: "1285",
        classOfService: "Y",
        origin: "ORD",
        destination: "LGA",
        date: "12OCT",
        seats: 1,
        depTime: "0830",
        arrTime: "1140",
        customLines: {
          amadeus: " 3  DL 1285 Y 12OCT 1 ORDLGA HK1          0830 1140    *1A/E*",
          sabre: "3 DL 1285 Y 12OCT 1 ORDLGA HK1 0830 1140 *1A/E*",
          galileo: " 3. DL 1285 Y 12OCT ORDLGA*HS1  0830 1140"
        }
      },
      {
        airline: "DL",
        flightNo: "1582",
        classOfService: "Y",
        origin: "LGA",
        destination: "BOS",
        date: "12OCT",
        seats: 1,
        depTime: "1215",
        arrTime: "1320",
        customLines: {
          amadeus: " 4  DL 1582 Y 12OCT 1 LGABOS HK1          1215 1320    *1A/E*",
          sabre: "4 DL 1582 Y 12OCT 1 LGABOS HK1 1215 1320 *1A/E*",
          galileo: " 4. DL 1582 Y 12OCT LGABOS*HS1  1215 1320"
        }
      }
    ],
    phones: ["2125550188"],
    ticketing: "DL OK 10OCT/NYC-DL",
    receivedFrom: "PASSENGER"
  }
};

/**
 * Stateful Cryptic Command Parser for Amadeus, Sabre and Galileo GDS Terminals
 * Matches the logic of the spacetab-io emulator core and expands interactive learning.
 */
export function executeCrypticCommand(
  gds: string,
  rawCommand: string,
  session: GdsSession,
  setSession: (session: GdsSession) => void,
  savedPnrs: Record<string, any>,
  setSavedPnrs: (pnrs: Record<string, any>) => void
): EmulatorResult {
  const command = rawCommand.trim();
  const upperCmd = command.toUpperCase();
  const gdsStyle = gds.toLowerCase();

  const promptChar = gdsStyle === "sabre" ? "*" : ">";

  // ----------------------------------------------------
  // UNIVERSAL GDS MCT - MINIMUM CONNECTION TIME CHECK
  // ----------------------------------------------------
  const isHelpMct =
    upperCmd === "HE DM" ||
    upperCmd === "HE MCT" ||
    upperCmd === "HELP DM" ||
    upperCmd === "HELP MCT";

  const isItineraryMct =
    upperCmd === "DMI" ||
    upperCmd === "DMCI" ||
    upperCmd === "MCT" ||
    upperCmd === "V*MCT" ||
    upperCmd === "T.MCT" ||
    upperCmd === "T.M";

  const segmentMctRegex = /^(DM|T\.MCT|V\*MCT|\*MCT|T\.M)([0-9]+)(\/[0-9]+)?$/;
  const isSegmentMct = segmentMctRegex.test(upperCmd);

  const isMctCheck = isHelpMct || isItineraryMct || isSegmentMct;

  if (isMctCheck) {
    if (session.segments.length === 0) {
      return {
        recognized: true,
        output: [
          "MCT CHECK ERROR: ACTIVE PNR REQUIRED",
          "REASON: NO ACTIVE FLIGHT SEGMENTS RECORDED IN CURRENT SESSION",
          "PLEASE RETRIEVE A VALID PNR FIRST (E.G. RTDL405X OR RTSU14JA)",
          ""
        ],
        explanation: "The MCT command validates the Minimum Connection Time of consecutive flight connections in the active PNR.",
        isSandbox: true,
      };
    }

    // Helper to check if airport represents domestic or international hub
    const DOMESTIC_US = ["JFK", "LGA", "ORD", "LAX", "SFO", "SEA", "ATL", "BOS", "DFW", "DEN", "MIA"];
    const DOMESTIC_UK = ["LHR", "LGW", "MAN", "BHX", "EDI", "STN"];
    const DOMESTIC_IN = ["DEL", "BOM", "BLR", "MAA", "CCU", "HYD"];

    function getCountry(apt: string): string {
      if (!apt) return "US";
      const u = apt.toUpperCase();
      if (DOMESTIC_US.includes(u)) return "US";
      if (DOMESTIC_UK.includes(u)) return "UK";
      if (DOMESTIC_IN.includes(u)) return "IN";
      return "INT"; // International
    }

    function parseSegmentDateTime(segDate: string, timeStr: string): number | null {
      if (!segDate || !timeStr) return null;
      const match = segDate.toUpperCase().match(/^(\d+)([A-Z]{3})$/);
      if (!match) return null;
      const day = parseInt(match[1], 10);
      const monthStr = match[2];
      const months: Record<string, number> = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
      };
      const month = months[monthStr];
      if (month === undefined) return null;
      
      const baseDate = new Date(2026, month, day, 0, 0, 0, 0);

      const cleanTime = timeStr.trim();
      const plusIndex = cleanTime.indexOf("+");
      let timeOnly = cleanTime;
      let dayOffset = 0;
      if (plusIndex !== -1) {
        timeOnly = cleanTime.substring(0, plusIndex);
        dayOffset = parseInt(cleanTime.substring(plusIndex + 1), 10) || 0;
      }

      if (timeOnly.length < 3) return null;
      const hh = parseInt(timeOnly.substring(0, timeOnly.length - 2), 10) || 0;
      const mm = parseInt(timeOnly.substring(timeOnly.length - 2), 10) || 0;

      return baseDate.getTime() + (dayOffset * 24 * 60 * 60 * 1000) + (hh * 60 * 60 * 1000) + (mm * 60 * 1000);
    }

    const namesCount = session.names.length;
    const isAmadeus = gdsStyle === "amadeus";

    // Find segment by dynamic line number in PNR display
    function getSegmentIndexByLineNo(lineNo: number): number {
      return lineNo - 1 - namesCount;
    }

    // 1. HELP INTERFACES
    if (isHelpMct) {
      return {
        recognized: true,
        output: [
          "HE DM",
          "MINIMUM CONNECTING TIME HELP SCREEN - EMULATOR CORE",
          "================================================================",
          "DM<segNo>        - DISPLAY MCT DETAILS BETWEEN SEGMENT <segNo> AND NEXT.",
          "DM<segNo>/<leg>   - DISPLAY SECOND/SPECIFIED CONNECTION OF FLIGHT.",
          "DMI              - DETERMINE CONTINUITY AND MCT FOR ENTIRE ITINERARY.",
          "",
          "MCT PROCEDURES:",
          "• ACTIVE PNR IN WORKSPACE REQUIRED BEFORE RUNNING CHECKS.",
          "• TWO SEGMENTS WITH LAYOVER > 7 HOURS BYPASSED (NOT A CONNECTION).",
          "• AUXILIARY SEGMENTS (E.G. CAR, HOTEL, ARNK) ARE PROGRESSIVELY BYPASSED.",
          "• IN ITINERARY MODE, ANY FAILED CONNECTION WILL INHIBIT 'ITINERARY OK'.",
          "",
          "SYSTEM DISCREPANCY RESPONSES:",
          "  I/I            - INTERNATIONAL-TO-INTERNATIONAL TRANSFER TYPE",
          "  D/D            - DOMESTIC-TO-DOMESTIC TRANSFER TYPE",
          "  ACTUAL         - ACTUAL IN-MEMORY MEASURED LAYOVER LAPSE",
          "  LIMIT          - THE DECLARED AIRPORT OR CARRIER THRESHOLD",
          "",
          "ENTER 'RT <PNR>' THEN 'DMI' OR 'DM2' TO RUN VALIDATION CHECKS.",
          ""
        ],
        explanation: "Displayed GDS Minimum Connection Time tutorial panel instructions.",
        isSandbox: true
      };
    }

    // 2. SEGMENT-SPECIFIC CHECK
    if (isSegmentMct) {
      const match = upperCmd.match(segmentMctRegex);
      if (match) {
        const lineNo = parseInt(match[2], 10);
        const s1Index = getSegmentIndexByLineNo(lineNo);

        if (s1Index < 0 || s1Index >= session.segments.length) {
          return {
            recognized: true,
            output: [
              `DM CHECK ERROR: INVALID SEGMENT LINE NUMBER ${lineNo}`,
              "REASON: SELECTED LINE DOES NOT MAP TO A VALID FLIGHT SEGMENT",
              ""
            ],
            explanation: `Line number ${lineNo} was checked for MCT connections but couldn't be resolved in the active PNR.`,
            isSandbox: true
          };
        }

        const s1 = session.segments[s1Index];
        const s2 = session.segments[s1Index + 1];

        if (!s2 || s1.isArnk || s1.airline === "ARNK" || s2.isArnk || s2.airline === "ARNK") {
          return {
            recognized: true,
            output: [
              `DM CHECK ERROR: NO CONNECTION FROM SEGMENT ${lineNo}`,
              "REASON: THERE IS NO SEQUENTIAL CONNECTING FLIGHT SEGMENT RECORDED AFTER THIS LINE",
              ""
            ],
            explanation: `MCT check failed because there is no connecting flight departing from ${s1.destination || "destination"}.`,
            isSandbox: true
          };
        }

        if (!s1.destination || !s2.origin || s1.destination.toUpperCase() !== s2.origin.toUpperCase()) {
          return {
            recognized: true,
            output: [
              `DM CHECK ERROR: SEGMENTS DO NOT CONNECT`,
              `REASON: SEGMENT ${lineNo} ARRIVES AT ${s1.destination || "N/A"} BUT NEXT SEGMENT DEPARTS FROM ${s2.origin || "N/A"}`,
              ""
            ],
            explanation: "Flight continuity validation failed. Inbound destination and outbound origin airports must be identical.",
            isSandbox: true
          };
        }

        const apt = s1.destination.toUpperCase();
        const r1 = getCountry(s1.origin);
        const rTransit = getCountry(s1.destination);
        const r2 = getCountry(s2.destination);
        
        const connType = (r1 === rTransit && r2 === rTransit && rTransit !== "INT") ? "D/D" : "I/I";

        // Determine MCT requirements
        let mctMinutes = connType === "D/D" ? 60 : 90;
        if (apt === "LGA" && s1.airline === "DL" && s2.airline === "DL") {
          mctMinutes = 60;
        } else if (apt === "DXB" && s1.airline === "EK" && s2.airline === "EK") {
          mctMinutes = 75;
        } else if (apt === "LHR" && s1.airline === "BA" && s2.airline === "BA") {
          mctMinutes = 75;
        }

        const arrMs = parseSegmentDateTime(s1.date, s1.arrTime);
        const depMs = parseSegmentDateTime(s2.date, s2.depTime);

        if (arrMs === null || depMs === null) {
          return {
            recognized: true,
            output: [
              "DM CHECK ERROR: UNABLE TO RECONCILE DATES/TIMES",
              ""
            ],
            explanation: "Review flight arrival and departure times on active segments.",
            isSandbox: true
          };
        }

        const actualMins = (depMs - arrMs) / (60 * 1000);

        if (actualMins > 420) {
          // Connections larger than 7 hours are bypassed
          return {
            recognized: true,
            output: [
              `DM CHECK ERROR: BEYOND MCT PARAMETER RANGE`,
              "REASON: LAYOVER TIME EXCEEDS SEVEN HOURS (420 MINUTES)",
              "THE GDS BYPASSES MCT VALIDATION FOR STOPOVERS BEYOND SEVEN HOURS",
              ""
            ],
            explanation: "Layover is greater than 7 hours, meaning it's categorized as a regular stopover rather than a connecting transfer.",
            isSandbox: true
          };
        }

        const mctHH = String(Math.floor(mctMinutes / 60)).padStart(2, "0");
        const mctMM = String(mctMinutes % 60).padStart(2, "0");
        const actualHH = String(Math.floor(actualMins / 60)).padStart(2, "0");
        const actualMM = String(Math.floor(actualMins % 60)).padStart(2, "0");

         let rulesRow = "";
        if (apt === "LHR" && s1.airline === "BA" && s2.airline === "BA") {
          const f1Range = parseInt(s1.flightNo, 10) < 300 ? "BA 0001-0299" : "BA 0300-0999";
          const f2Range = parseInt(s2.flightNo, 10) < 300 ? "BA 0001-0299" : "BA 0300-0999";
          rulesRow = `${f1Range}       5   -${f2Range}       5    I/I:0115`;
        } else if (apt === "LGA") {
          rulesRow = " ".repeat(27) + "-DL" + " ".repeat(26) + "D/D:0100";
        } else {
          // Standard rules row formatting
          const leftStr = `${s1.airline} ${s1.flightNo.padEnd(9)}`;
          const rightStr = `-${s2.airline} ${s2.flightNo.padEnd(9)}`;
          rulesRow = `${leftStr.padEnd(27)}${rightStr.padEnd(27)}${connType}:${mctHH}${mctMM}`;
        }

        const outputLines = [
          `${apt}-${apt}      FROM          -             TO`,
          "CC FLTN-FLTR ORGN EQP TM CS-CC FLTN-FLTR DEST EQP TM CS     HHMM",
          rulesRow,
          `ACTUAL CONNECTING TIME IS ${actualHH}${actualMM}`,
          ""
        ];

        return {
          recognized: true,
          output: outputLines,
          explanation: `Checked minimum connection time (MCT) for connection starting on GDS line number ${lineNo}.`,
          isSandbox: true
        };
      }
    }

    // 3. ENTIRE ITINERARY CHECK (DMI)
    const errors: string[] = [];
    let hasConnection = false;

    for (let i = 0; i < session.segments.length - 1; i++) {
      const s1 = session.segments[i];
      const s2 = session.segments[i + 1];

      // Skip fake, ARNK, or invalid flights
      if (!s1 || !s2 || s1.isArnk || s1.airline === "ARNK" || s2.isArnk || s2.airline === "ARNK") {
        continue;
      }

      if (s1.destination && s2.origin && s1.destination.toUpperCase() === s2.origin.toUpperCase()) {
        const apt = s1.destination.toUpperCase();
        const arrMs = parseSegmentDateTime(s1.date, s1.arrTime);
        const depMs = parseSegmentDateTime(s2.date, s2.depTime);

        if (arrMs !== null && depMs !== null) {
          const actualMins = (depMs - arrMs) / (60 * 1000);

          // Connections are same-day or within 7 hours (420 mins)
          if (actualMins > 0 && actualMins <= 420) {
            hasConnection = true;

            // Determine regions
            const r1 = getCountry(s1.origin);
            const rTransit = getCountry(s1.destination);
            const r2 = getCountry(s2.destination);
            
            const connType = (r1 === rTransit && r2 === rTransit && rTransit !== "INT") ? "D/D" : "I/I";

            // Determine MCT requirements
            let mctMinutes = connType === "D/D" ? 60 : 90;
            if (apt === "LGA" && s1.airline === "DL" && s2.airline === "DL") {
              mctMinutes = 60;
            } else if (apt === "DXB" && s1.airline === "EK" && s2.airline === "EK") {
              mctMinutes = 75;
            } else if (apt === "LHR" && s1.airline === "BA" && s2.airline === "BA") {
              mctMinutes = 75;
            }

            if (actualMins < mctMinutes) {
              const segLabel = `${i + 1}/${i + 2}`;

              const mctHH = String(Math.floor(mctMinutes / 60)).padStart(2, "0");
              const mctMM = String(mctMinutes % 60).padStart(2, "0");
              const actualHH = String(Math.floor(actualMins / 60)).padStart(2, "0");
              const actualMM = String(Math.floor(actualMins % 60)).padStart(2, "0");

              errors.push(`CHECK MINIMUM CONNECTING TIME - SEGMENT ${segLabel}`);
              errors.push(`${apt}-${apt}      FROM          -             TO`);
              errors.push("CC FLTN-FLTR ORGN EQP TM CS-CC FLTN-FLTR DEST EQP TM CS     HHMM");
              
              let rulesRow = "";
              if (apt === "LHR" && s1.airline === "BA" && s2.airline === "BA") {
                const f1Range = parseInt(s1.flightNo, 10) < 300 ? "BA 0001-0299" : "BA 0300-0999";
                const f2Range = parseInt(s2.flightNo, 10) < 300 ? "BA 0001-0299" : "BA 0300-0999";
                rulesRow = `${f1Range}       5   -${f2Range}       5    I/I:0115`;
              } else if (apt === "LGA") {
                rulesRow = " ".repeat(27) + "-DL" + " ".repeat(26) + "D/D:0100";
              } else {
                const leftStr = `${s1.airline} ${s1.flightNo.padEnd(9)}`;
                const rightStr = `-${s2.airline} ${s2.flightNo.padEnd(9)}`;
                rulesRow = `${leftStr.padEnd(27)}${rightStr.padEnd(27)}${connType}:${mctHH}${mctMM}`;
              }
              
              errors.push(rulesRow);
              errors.push(`ACTUAL CONNECTING TIME IS ${actualHH}${actualMM}`);
              errors.push("");
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      if (isAmadeus) {
        errors.push("Enter HE DM for more information.");
      }
      return {
        recognized: true,
        output: [...errors, ""],
        explanation: "The connection validation failed as minimum connecting time requirements are not satisfied.",
        isSandbox: true,
      };
    } else {
      return {
        recognized: true,
        output: [
          "ITINERARY OK"
        ],
        explanation: "All connections successfully meet or exceed the required airport Minimum Connecting Times (MCT).",
        isSandbox: true,
      };
    }
  }

  // ----------------------------------------------------
  // UNIVERSAL GDS XE LINE CANCELLATION COMMAND
  // ----------------------------------------------------
  if (upperCmd.startsWith("XE")) {
    const params = upperCmd.substring(2).trim(); // e.g. "1" or "1-2"
    if (!params) {
      return {
        recognized: true,
        output: ["ERR: XE COMMAND REQUIRES A DISPLAYED LINE NUMBER (E.G., XE1 OR XE1-2)", ""],
        explanation: "The XE (Cancel Element) command is used across all GDS vendors to remove segments/lines from the active PNR record memory workspace by line number.",
        isSandbox: true,
      };
    }

    // Parse the single number or range
    const linesToCancel: number[] = [];
    const rangeMatch = params.match(/^(\d+)-(\d+)$/);
    const singleMatch = params.match(/^(\d+)$/);

    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      for (let i = min; i <= max; i++) {
        linesToCancel.push(i);
      }
    } else if (singleMatch) {
      linesToCancel.push(parseInt(singleMatch[1], 10));
    } else {
      return {
        recognized: true,
        output: [`ERR: INVALID XE SYNTAX - '${command}'`, ""],
        explanation: "XE line cancel supports single numbers (e.g., XE1) or range sequences (e.g., XE1-2).",
        isSandbox: true,
      };
    }

    const namesCount = session.names.length;
    const segmentsCount = session.segments.length;
    const phonesCount = session.phones.length;
    const ticketingExists = !!session.ticketing;
    const receivedExists = !!session.receivedFrom;

    if (namesCount === 0 && segmentsCount === 0 && phonesCount === 0 && !ticketingExists && !receivedExists) {
      return {
        recognized: true,
        output: ["ERR: WORKSPACE RECORD COMPILATION BLOCKED", "REASON: WORKSPACE RECORD IS VACANT", ""],
        explanation: "There are no names, flight segments, contacts or ticketing fields in memory to cancel.",
        isSandbox: true,
      };
    }

    // Map screen sequence numbers to entries in GdsSession
    let currentIdx = 1;

    const namesIndices: { indexInArray: number; screenLine: number }[] = [];
    for (let i = 0; i < namesCount; i++) {
      namesIndices.push({ indexInArray: i, screenLine: currentIdx++ });
    }

    const segmentsIndices: { indexInArray: number; screenLine: number }[] = [];
    for (let i = 0; i < segmentsCount; i++) {
      segmentsIndices.push({ indexInArray: i, screenLine: currentIdx++ });
    }

    const phonesIndices: { indexInArray: number; screenLine: number }[] = [];
    for (let i = 0; i < phonesCount; i++) {
      phonesIndices.push({ indexInArray: i, screenLine: currentIdx++ });
    }

    let ticketingLineNo: number | null = null;
    if (ticketingExists) {
      ticketingLineNo = currentIdx++;
    }

    let receivedLineNo: number | null = null;
    if (receivedExists) {
      receivedLineNo = currentIdx++;
    }

    // Filter updated contents
    const namesAfter = session.names.filter((_, i) => {
      const match = namesIndices.find(item => item.indexInArray === i);
      return match ? !linesToCancel.includes(match.screenLine) : true;
    });

    const segmentsAfter = session.segments.filter((_, i) => {
      const match = segmentsIndices.find(item => item.indexInArray === i);
      return match ? !linesToCancel.includes(match.screenLine) : true;
    });

    const phonesAfter = session.phones.filter((_, i) => {
      const match = phonesIndices.find(item => item.indexInArray === i);
      return match ? !linesToCancel.includes(match.screenLine) : true;
    });

    const ticketingAfter = ticketingLineNo && linesToCancel.includes(ticketingLineNo) ? null : session.ticketing;
    const receivedAfter = receivedLineNo && linesToCancel.includes(receivedLineNo) ? null : session.receivedFrom;

    const nextSession = {
      ...session,
      names: namesAfter,
      segments: segmentsAfter,
      phones: phonesAfter,
      ticketing: ticketingAfter,
      receivedFrom: receivedAfter,
    };
    setSession(nextSession);

    // Formulate updated GDS printout
    const out: string[] = [`XE${params}`];
    const pnrBuffer = renderGdsPnrBuffer(gdsStyle as "amadeus" | "sabre" | "galileo", nextSession);
    out.push(...pnrBuffer);
    out.push("");

    return {
      recognized: true,
      output: out,
      explanation: `Cancelled screen lines ${linesToCancel.join(", ")} from current memory buffer. These modifications are in-session only and will reset if you retrieve the PNR again (RT[LOCATOR] or *[LOCATOR]).`,
      isSandbox: true,
    };
  }

  // ----------------------------------------------------
  // UNIVERSAL GDS SPECIAL SERVICE REQUEST (SR) COMMAND
  // ----------------------------------------------------
  if (upperCmd.startsWith("SR") && !upperCmd.startsWith("SR FQTV") && !upperCmd.startsWith("SRFQTV")) {
    const srClean = command.toUpperCase().trim();
    let remainder = srClean.substring(2).trim(); // Skip "SR"
    let passengerNum = 1; // Default to 1
    
    // Check if remainder ends with a passenger suffix like /P1, P1, /p1, p1, etc.
    const lastPSuffix = remainder.match(/(?:[\/\s]P|P)\s*(\d+)$/i);
    if (lastPSuffix) {
      passengerNum = parseInt(lastPSuffix[1], 10);
      remainder = remainder.substring(0, remainder.length - lastPSuffix[0].length).trim();
    }
    
    const serviceCode = remainder.replace(/[^A-Z0-9]/g, ""); // clean up e.g. "WCHR"
    
    if (serviceCode.length >= 2 && serviceCode.length <= 6) {
      const paxSuffix = `/P${passengerNum}`;

      // Get active airline
      let activeAirline = "LH"; // default to LH
      if (session.segments && session.segments.length > 0) {
        activeAirline = session.segments[0].airline.toUpperCase();
      } else if (session.activeLocator) {
        const saved = savedPnrs[session.activeLocator] || DEFAULT_PRACTICE_PNRS[session.activeLocator];
        if (saved && saved.segments && saved.segments.length > 0) {
          activeAirline = saved.segments[0].airline.toUpperCase();
        }
      }

      const ssrLine = `SSR ${serviceCode} ${activeAirline} HK${paxSuffix}`;

      // Add to session's extraLines so that it retrieves and prints correctly
      const updatedExtraLines = [...(session.extraLines || []), ssrLine];
      const updatedSession = {
        ...session,
        extraLines: updatedExtraLines
      };
      setSession(updatedSession);

      // If active locator is set, persist the addition to savedPnrs
      if (session.activeLocator && savedPnrs[session.activeLocator]) {
        const found = savedPnrs[session.activeLocator];
        setSavedPnrs({
          ...savedPnrs,
          [session.activeLocator]: {
            ...found,
            extraLines: [...(found.extraLines || []), ssrLine]
          }
        });
      }

      const pnrBuffer = renderGdsPnrBuffer(gdsStyle as "amadeus" | "sabre" | "galileo", updatedSession);
      const out: string[] = pnrBuffer;
      out.push("");

      return {
        recognized: true,
        output: out,
        explanation: `Added Special Service Request (SSR) ${serviceCode} for travel passenger ${passengerNum}: ${ssrLine}`,
        isSandbox: true
      };
    }
  }

  // ----------------------------------------------------
  // AMADEUS CODES
  // ----------------------------------------------------
  if (gdsStyle === "amadeus") {
    // 1. Reset/Workspace Ignore commands: IG or I
    if (upperCmd === "IG" || upperCmd === "I") {
      setSession(createEmptySession());
      return {
        recognized: true,
        output: ["IGNORE COMPLETE - WORKSPACE RESET", ""],
        explanation: "The Ignore ('IG' / 'I') command dumps the current active memory buffer, resetting your workspace coordinates. Essential for starting over.",
        isSandbox: true,
      };
    }

    // 1b. Refreshed Ignore of Workstation (IR): clears screen but keeps the PNR active, rendering it immediately
    if (upperCmd === "IR") {
      // Keep session/workspace fully active (do not call setSession or reset).
      const pnrBuffer = renderGdsPnrBuffer("amadeus", session);
      const out = [
        `>IR`,
        ...pnrBuffer,
        ""
      ];

      return {
        recognized: true,
        output: out,
        updateTerminalLines: (prevLines: string[]) => out,
        explanation: "The Ignore and Retrieve ('IR') command cleans uncommitted workspace lines and re-displays the pristine, active reservation details.",
        isSandbox: true,
      };
    }

    // 2. Retrieve reservation details: RT [LOCATOR] or RT
    if (upperCmd.startsWith("RT")) {
      const locatorStr = upperCmd.substring(2).trim();
      
      if (locatorStr) {
        // Retrieve saved PNR by key
        let saved = savedPnrs[locatorStr];
        if (!saved && locatorStr.length === 6 && /^[A-Z0-9]{6}$/.test(locatorStr)) {
          // Retrieve a random PNR from our practice database set & record it under this locator
          const keys = Object.keys(savedPnrs).length > 0 ? Object.keys(savedPnrs) : Object.keys(DEFAULT_PRACTICE_PNRS);
          const randomKey = keys[Math.floor(Math.random() * keys.length)];
          const basePnr = savedPnrs[randomKey] || DEFAULT_PRACTICE_PNRS[randomKey];
          saved = {
            ...basePnr,
            locator: locatorStr
          };
          setSavedPnrs({
            ...savedPnrs,
            ...DEFAULT_PRACTICE_PNRS,
            [locatorStr]: saved
          });
        }

        if (saved) {
          // Update activeLocator in session state and load values
          const loadedSession = {
            availability: session.availability,
            names: [...saved.names],
            segments: [...saved.segments],
            phones: saved.phones ? [...saved.phones] : [],
            ticketing: saved.ticketing || null,
            receivedFrom: saved.receivedFrom || null,
            activeLocator: locatorStr,
            extraLines: saved.extraLines ? [...saved.extraLines] : []
          };
          setSession(loadedSession);

          const pnrBuffer = renderGdsPnrBuffer("amadeus", loadedSession);
          const out = [
            ...pnrBuffer,
          ];
          out.push("");

          return {
            recognized: true,
            output: out,
            explanation: `Retrieved successfully saved booking record locator ${locatorStr} from GDS backend archives.`,
            isSandbox: true,
          };
        } else {
          return {
            recognized: true,
            output: [`ERR: SECURE HOST SYSTEM - RECORD KEY ${locatorStr} NOT FOUND`, ""],
            explanation: `The system searched for GDS locator '${locatorStr}' but no matched record was found in the database.`,
            isSandbox: true,
          };
        }
      } else {
        // Show active draft PNR worksheet
        if (session.names.length === 0 && session.segments.length === 0) {
          return {
            recognized: true,
            output: ["NO ACTIVE WORKSPACE FILE REGISTERED", ""],
            explanation: "Displays the active Passenger Name Record (PNR) drafts in progress. Currently empty.",
            isSandbox: true,
          };
        }

        const saved = session.activeLocator ? (savedPnrs[session.activeLocator] || DEFAULT_PRACTICE_PNRS[session.activeLocator]) : null;
        const tempSession: GdsSession = {
          ...session,
          extraLines: session.extraLines && session.extraLines.length > 0 ? session.extraLines : (saved && saved.extraLines ? saved.extraLines : [])
        };
        const pnrBuffer = renderGdsPnrBuffer("amadeus", tempSession);
        const out = [
          ...pnrBuffer
        ];
        out.push("");

        return {
          recognized: true,
          output: out,
          explanation: "Displaying your unsaved GDS active traveler worksheet ledger.",
          isSandbox: true,
        };
      }
    }

    // 2b. Display record locators (airline location / vendor locator): RL
    if (upperCmd === "RL") {
      let locator = session.activeLocator;
      let saved = locator ? savedPnrs[locator] : null;
      if (!saved) {
        // Fallback or find the first saved PNR
        const keys = Object.keys(savedPnrs);
        if (keys.length > 0) {
          locator = keys[0];
          saved = savedPnrs[locator];
        }
      }

      const activeLoc = locator || "4RSZLV";
      
      let airlinesLine = "";
      if (saved && saved.segments && saved.segments.length > 0) {
        // Extract unique airlines
        const airlines = Array.from(new Set(saved.segments.map((s: any) => s.airline.toUpperCase())));
        const mainCarrier = airlines.includes("BA") ? "BA" : airlines[0];
        
        airlinesLine = `${mainCarrier}/${activeLoc}`;

        // Add other unique airlines in the list
        const secondaryAirlines = airlines.filter(a => a !== mainCarrier);
        if (secondaryAirlines.length > 0) {
          secondaryAirlines.forEach((air, idx) => {
            airlinesLine += `      ${air}/${idx === 0 ? (mainCarrier === "TG" ? "2M27NI" : "UD52QT") : generateLocator()}`;
          });
        } else {
          // Default multiple airlines as shown in the example image
          const secondCarrierCode = mainCarrier === "TG" ? "2M27NI" : "UD52QT";
          airlinesLine += `      TK/${secondCarrierCode}`;
        }
      } else {
        // Default exactly as shown in the upload image
        airlinesLine = `BA/${activeLoc}      TK/UD52QT`;
      }

      // Format timestamp
      const timestamp = getGdsTimestamp();
      
      const out = [
        `RP/XXXXXXXXX/XXXXXXXXX            TN/SU  ${timestamp}   ${activeLoc}`,
        airlinesLine,
        ""
      ];

      return {
        recognized: true,
        output: out,
        explanation: "The 'RL' command displays the record locator (airline location / vendor locator) for each carrier/airline involved in the itinerary.",
        isSandbox: true
      };
    }

    // 3. Flight schedule search / Availability: AN Date Org Dest (e.g. AN15OCTLHRJFK)
    if (upperCmd.startsWith("AN")) {
      const body = upperCmd.substring(2).trim();
      
      // Parse dates and city codes
      const parsedMatch = body.match(/^(\d{1,2}[A-Z]{3})?([A-Z]{3})([A-Z]{3})?(\*[A-Z]{2})?/i);
      if (parsedMatch) {
         const date = parsedMatch[1] || "15OCT";
         const origin = parsedMatch[2] || "LHR";
         const destination = parsedMatch[3] || "JFK";
         
         let mockFlights = generateMockFlights(date, origin, destination);
         
         // Parse carrier filter if present in the command, e.g. /ABA
         const carrierMatch = body.match(/\/A([A-Z0-9]{2})/i);
         const filteredCarrier = carrierMatch ? carrierMatch[1].toUpperCase() : null;
         if (filteredCarrier) {
           mockFlights = mockFlights.filter(f => 
             f.airline.toUpperCase() === filteredCarrier || 
             f.flightNo.toUpperCase().includes(filteredCarrier)
           );
         }
         
         // Update active availability array in session
         setSession({
           ...session,
           availability: mockFlights
         });

         const { dayOfWeek, daysAdvance, dateFormatted } = parseGdsDate(date);
         const titlePart = `** AMADEUS AVAILABILITY - AN ** ${origin.toUpperCase().padEnd(3)} ${(CITY_NAME_MAP[origin.toUpperCase()] || `${origin.toUpperCase()} CITY.GB`).toUpperCase()}`;
         const rightPart = `${daysAdvance.toString().padStart(2)} ${dayOfWeek.toUpperCase()} ${dateFormatted.toUpperCase()} 0000`;
         const spacesCount = Math.max(2, 80 - titlePart.length - rightPart.length);
         const headerLine = titlePart + " ".repeat(spacesCount) + rightPart;

         const out = [
           headerLine
         ];

         mockFlights.forEach(f => {
           const isCodeshare = f.flightNo.includes(":") || /^[A-Z]{2}\d+/.test(f.flightNo);
           const flightCol = isCodeshare
             ? `${f.line.toString().padStart(2, " ")}${f.airline}:${f.flightNo}`.padEnd(12, " ")
             : `${f.line.toString().padStart(2, " ")}  ${f.airline.padEnd(2)} ${f.flightNo.padStart(3, " ")}  `;

           const classesList = f.classesList || [f.classes];
           const firstClassesRow = (classesList[0] || "").padEnd(20, " ");
           const destCol = `/${f.destination.toUpperCase()}`.padEnd(8, " ");
           const terminalStr = f.terminal ? ` ${f.terminal}` : "  ";
           const originCol = `${f.origin.toUpperCase()}${terminalStr}`.padEnd(7, " ");
           const depCol = f.depTime.toUpperCase().padStart(4, "0");
           const middleSpaces = "     ";
           const arrCol = f.arrTime.toUpperCase().padStart(4, "0");
           const afterArrSpaces = "   ";
           const connector = f.eticket?.startsWith("T") ? "-" : "/";
           const eqCol = `${f.eticket || "E0"}${connector}${f.aircraft.toUpperCase()}`.padEnd(6, " ");
           const beforeDurationSpaces = "       ";
           const durationCol = f.duration || "3:55";

           let flightLine = `${flightCol}${firstClassesRow}${destCol}${originCol}${depCol}${middleSpaces}${arrCol}${afterArrSpaces}${eqCol}${beforeDurationSpaces}${durationCol}`;
           if (f.stops && f.via) {
             flightLine += `  *VIA ${f.via.toUpperCase()}*`;
           }
           out.push(flightLine);

           if (classesList[1]) {
             const secondClassesLine = " ".repeat(12) + classesList[1];
             out.push(secondClassesLine);
           }
         });
         out.push("");

         return {
           recognized: true,
           output: out,
           explanation: `AN (Availability Neutral) command display flights for ${origin} to ${destination} on ${date}. This initializes segments in your simulator queue memory.`,
           isSandbox: true
         };
      }
    }

    // 4. Booking Sell Status: SS [Line][CabinClass][SeatCount] (e.g. SS1Y1)
    if (upperCmd.startsWith("SS")) {
      const param = upperCmd.substring(2).trim();
      const match = param.match(/^(\d+)([A-Z])(\d+)$/);
      if (match) {
        const lineNo = parseInt(match[1], 10);
        const cabinClass = match[2];
        const count = parseInt(match[3], 10);

        // Find from flight availability history
        const matchedFlight = session.availability.find(f => f.line === lineNo);
        if (!matchedFlight || !isClassAvailable(matchedFlight, cabinClass)) {
          return {
            recognized: true,
            output: [
              "UNAVAILABLE",
              ""
            ],
            explanation: `The booking class '${cabinClass}' is not available on flight line ${lineNo}.`,
            isSandbox: true
          };
        }

        const booked = {
          airline: matchedFlight.airline,
          flightNo: matchedFlight.flightNo,
          classOfService: cabinClass,
          origin: matchedFlight.origin,
          destination: matchedFlight.destination,
          date: matchedFlight.date,
          seats: count,
          depTime: matchedFlight.depTime,
          arrTime: matchedFlight.arrTime
        };

        const updatedSegments = [...session.segments, booked];
        setSession({
          ...session,
          segments: updatedSegments
        });

        const out = [
          `SS${param}`,
          ` 1  ${booked.airline} ${booked.flightNo} ${booked.classOfService} ${booked.date} ${booked.origin}${booked.destination} HK${booked.seats}   ${booked.depTime} ${booked.arrTime}   *EF*`,
          ""
        ];

        return {
          recognized: true,
          output: out,
          explanation: `Reserved segment line ${lineNo} for ${count} passenger(s) in cabin division '${cabinClass}'. Segment status holds ('HK${count}').`,
          isSandbox: true
        };
      }
    }

    // 4b. Rebook/Change Segment: SB (e.g. SBY, SBC2, SBC2,5, SBY3-6, SBY2/C4/M5, SB19JUN, SB18AUG4, SB14MAY2,4, SB18APR3-5, SB3AUG2/4AUG3, SBY10JUN, SBF19DEC4, SBAF194*3, SBUA101*Y 21APR4, SBMH193*3/UMH94*4, SBSK100*6/C4, SBIB102*6/C4/30OCT5, SB4*5, SB4*C5)
    if (upperCmd.startsWith("SB")) {
      if (session.segments.length === 0) {
        return {
          recognized: true,
          output: ["REASON: NO ACTIVE FLIGHT SEGMENTS RECORDED IN CURRENT SESSION", ""],
          explanation: "You must have active flight segments in your workstation session to run rebooking (SB) commands.",
          isSandbox: true,
        };
      }

      const paramStr = upperCmd.substring(2).trim();
      if (!paramStr) {
        return {
          recognized: true,
          output: ["ERR: INVALID REBOOKING ENTRY FORMAT", ""],
          explanation: "The SB command requires parameters to specify booking classes, dates, flight numbers, or availability lines.",
          isSandbox: true,
        };
      }

      const parts = paramStr.split("/");
      const updatedSegments = JSON.parse(JSON.stringify(session.segments));
      const modifiedIndicesArray: number[] = [];
      const namesCount = session.names.length;

      for (let part of parts) {
        part = part.trim();
        if (!part) continue;

        if (part.includes("*")) {
          if (/^\d/.test(part)) {
            const availMatch = part.match(/^(\d+)\*([A-Z])?(\d+)$/);
            if (availMatch) {
              const availLine = parseInt(availMatch[1], 10);
              const customClass = availMatch[2];
              const segTarget = parseInt(availMatch[3], 10);

              const targetIdx = segTarget - 1 - namesCount;
              if (targetIdx >= 0 && targetIdx < updatedSegments.length) {
                const matchedFlight = session.availability.find(f => f.line === availLine);
                if (matchedFlight) {
                  updatedSegments[targetIdx].airline = matchedFlight.airline;
                  updatedSegments[targetIdx].flightNo = matchedFlight.flightNo;
                  if (customClass) {
                    updatedSegments[targetIdx].classOfService = customClass;
                  }
                  updatedSegments[targetIdx].origin = matchedFlight.origin;
                  updatedSegments[targetIdx].destination = matchedFlight.destination;
                  updatedSegments[targetIdx].date = matchedFlight.date;
                  updatedSegments[targetIdx].depTime = matchedFlight.depTime;
                  updatedSegments[targetIdx].arrTime = matchedFlight.arrTime;
                  if (!modifiedIndicesArray.includes(targetIdx)) {
                    modifiedIndicesArray.push(targetIdx);
                  }
                }
              }
            }
          } else {
            const starParts = part.split("*");
            if (starParts.length === 2) {
              const left = starParts[0].trim();
              const right = starParts[1].trim();

              const leftMatch = left.match(/^([A-Z])?([A-Z]{2})(\d{1,4})$/);
              const rightMatch = right.match(/^([A-Z])?\s*(?:(\d{1,2}[A-Z]{3}))?\s*(\d+)$/);

              if (leftMatch && rightMatch) {
                const classLeft = leftMatch[1];
                const airline = leftMatch[2];
                const flightNo = leftMatch[3];

                const classRight = rightMatch[1];
                const dateVal = rightMatch[2];
                const segTarget = parseInt(rightMatch[3], 10);

                const finalClass = classRight || classLeft;
                const targetIdx = segTarget - 1 - namesCount;

                if (targetIdx >= 0 && targetIdx < updatedSegments.length) {
                  updatedSegments[targetIdx].airline = airline;
                  updatedSegments[targetIdx].flightNo = flightNo;
                  if (finalClass) {
                    updatedSegments[targetIdx].classOfService = finalClass;
                  }
                  if (dateVal) {
                    updatedSegments[targetIdx].date = dateVal;
                  }
                  if (!modifiedIndicesArray.includes(targetIdx)) {
                    modifiedIndicesArray.push(targetIdx);
                  }
                }
              }
            }
          }
        } else {
          let str = part;
          let customClass: string | undefined = undefined;

          if (/^[A-Z](?:\d|,|-|$)/.test(str)) {
            customClass = str[0];
            str = str.substring(1);
          }

          let customDate: string | undefined = undefined;
          const dateMatch = str.match(/^(\d{1,2}[A-Z]{3})/);
          if (dateMatch) {
            customDate = dateMatch[1];
            str = str.substring(customDate.length);
          }

          const targetStr = str.trim();
          let indicesToUpdate: number[] = [];

          if (!targetStr) {
            indicesToUpdate = updatedSegments.map((_: any, i: number) => i);
          } else if (/^\d+$/.test(targetStr)) {
            indicesToUpdate = [parseInt(targetStr, 10) - 1 - namesCount];
          } else if (/^\d+-\d+$/.test(targetStr)) {
            const bounds = targetStr.split("-");
            const start = parseInt(bounds[0], 10) - 1 - namesCount;
            const end = parseInt(bounds[1], 10) - 1 - namesCount;
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              indicesToUpdate.push(i);
            }
          } else if (/^\d+(?:,\d+)+$/.test(targetStr)) {
            const partsList = targetStr.split(",");
            for (const p of partsList) {
              indicesToUpdate.push(parseInt(p, 10) - 1 - namesCount);
            }
          }

          for (const idx of indicesToUpdate) {
            if (idx >= 0 && idx < updatedSegments.length) {
              if (customClass) {
                updatedSegments[idx].classOfService = customClass;
              }
              if (customDate) {
                updatedSegments[idx].date = customDate;
              }
              if (!modifiedIndicesArray.includes(idx)) {
                modifiedIndicesArray.push(idx);
              }
            }
          }
        }
      }

      if (modifiedIndicesArray.length === 0) {
        return {
          recognized: true,
          output: ["ERR: INVALID SEGMENT INDEX OR MATCH RULE", ""],
          explanation: "Ensure that the segment numbers specified exist inside your active reservation itinerary workspace.",
          isSandbox: true,
        };
      }

      setSession({
        ...session,
        segments: updatedSegments,
      });

      if (session.activeLocator) {
         const saved = savedPnrs[session.activeLocator];
         if (saved) {
           setSavedPnrs({
             ...savedPnrs,
             [session.activeLocator]: {
               ...saved,
               segments: updatedSegments,
             },
           });
         }
      }

      const formatSegmentFn = formatAmadeusSegment;

      const updateTerminalLines = (prevLines: string[]) => {
        const namesCount = session.names.length;
        return prevLines.map(line => {
          for (const idx of modifiedIndicesArray) {
            const printLineNo = namesCount + 1 + idx;
            const regex = new RegExp(`^\\s*${printLineNo}\\s+`);
            if (regex.test(line)) {
              return formatSegmentFn(printLineNo, updatedSegments[idx]);
            }
          }
          return line;
        });
      };

      const out = [
        rawCommand.toUpperCase()
      ];
      for (const idx of modifiedIndicesArray.sort((a, b) => a - b)) {
        const namesCount = session.names.length;
        const printLineNo = namesCount + 1 + idx;
        out.push(formatSegmentFn(printLineNo, updatedSegments[idx]));
      }
      out.push("");

      return {
        recognized: true,
        output: out,
        updateTerminalLines,
        explanation: "Processed Amadeus Segment Rebook (SB) command. Segment details, booking classes, or travel dates have been successfully altered in terminal memory.",
        isSandbox: true,
      };
    }

    // 4c. Amadeus Frequent Flyer entry: SR FQTV AY -AY611879925/P1
    if (upperCmd.startsWith("SR FQTV") || upperCmd.startsWith("SRFQTV")) {
      const match = command.trim().match(/^SR\s*FQTV\s*([A-Za-z0-9]{2})\s*-\s*([A-Za-z0-9]+?)(?:\s*\/P\s*(\d+))?\s*$/i);
      
      if (!match) {
        return {
          recognized: true,
          output: [
            command,
            "ERR: INVALID SSR FQTV ENTRY FORMAT",
            "EXPECTED FORMAT EXAMPLE: SR FQTV AY -AY611879925/P1",
            ""
          ],
          explanation: "Amadeus Frequent Flyer entries must follow the standard structure: SR FQTV <Airline> -<Account>/P<PassengerNum>.",
          isSandbox: true
        };
      }

      let targetAirline = match[1].toUpperCase();
      let ffId = match[2].toUpperCase();
      const passengerNum = match[3] ? parseInt(match[3], 10) : null;

      // Ensure that if there is already a PNR displayed/loaded, it uses the airline displayed at the time
      let activeAirline = "";
      if (session.segments && session.segments.length > 0) {
        activeAirline = session.segments[0].airline.toUpperCase();
      } else if (session.activeLocator) {
        const saved = savedPnrs[session.activeLocator] || DEFAULT_PRACTICE_PNRS[session.activeLocator];
        if (saved && saved.segments && saved.segments.length > 0) {
          activeAirline = saved.segments[0].airline.toUpperCase();
        }
      }

      if (activeAirline) {
        const origAirline = targetAirline;
        targetAirline = activeAirline;
        // If the frequent flyer ID starts with the typed original airline prefix, substitute it with the active airline
        if (ffId.startsWith(origAirline)) {
          ffId = targetAirline + ffId.substring(origAirline.length);
        }
      }

      // Format the resulting line exactly as specified on the image: SSR FQTV <Airline> HK/ <Account>/P<PassengerNum>
      const paxSuffix = passengerNum ? `/P${passengerNum}` : "";
      const ssrLine = `SSR FQTV ${targetAirline} HK/ ${ffId}${paxSuffix}`;

      // Add to session's extraLines so that it retrieves and prints correctly
      const updatedExtraLines = [...(session.extraLines || []), ssrLine];
      const updatedSession = {
        ...session,
        extraLines: updatedExtraLines
      };
      setSession(updatedSession);

      // If active locator is set, persist the addition to savedPnrs
      if (session.activeLocator && savedPnrs[session.activeLocator]) {
        const found = savedPnrs[session.activeLocator];
        setSavedPnrs({
          ...savedPnrs,
          [session.activeLocator]: {
            ...found,
            extraLines: [...(found.extraLines || []), ssrLine]
          }
        });
      }

      const pnrBuffer = renderGdsPnrBuffer("amadeus", updatedSession);
      const out = pnrBuffer;
      out.push("");

      return {
        recognized: true,
        output: out,
        explanation: `Added Frequent Flyer details ${ffId} to active ${targetAirline} itinerary record: ${ssrLine}`,
        isSandbox: true
      };
    }

    // 5. Traveler Passenger Name Add: NM1 [Lastname]/[Firstname] [Title] (e.g. NM1SMITH/ANNA MS)
    if (upperCmd.startsWith("NM1")) {
      const nameBody = command.substring(3).trim();
      
      if (nameBody.includes("/")) {
        const updatedNames = [...session.names, nameBody.toUpperCase()];
        setSession({
          ...session,
          names: updatedNames
        });

        return {
          recognized: true,
          output: [
            `NM1${nameBody}`,
            ` 1 ${nameBody.toUpperCase()}`,
            ""
          ],
          explanation: "Saved passenger primary name string in GDS database record locator templates.",
          isSandbox: true
        };
      }
    }

    // 6. Contact phone add: AP [Phone]
    if (upperCmd.startsWith("AP")) {
      const phoneText = command.substring(2).trim();
      if (phoneText) {
        const updatedPhones = [...session.phones, phoneText];
        setSession({
          ...session,
          phones: updatedPhones
        });

        return {
          recognized: true,
          output: [
            `AP ${phoneText}`,
            `  AP ${phoneText} - CUSTOMER ADVISER DESK`,
            ""
          ],
          explanation: "Registered contact telephone coordinate data in stateful memory profiles.",
          isSandbox: true
        };
      }
    }

    // 7. Ticketing codes: TK OK, TKTLDATE, TKLDATE, TKTL, TKXL or TKOK Date
    if (upperCmd.startsWith("TK")) {
      // Require active passenger record context to have loaded first
      if (session.segments.length === 0 && !session.activeLocator && session.names.length === 0) {
        return {
          recognized: true,
          output: [
            command,
            "RT NO ACTIVE WORKSPACE FILE REGISTERED",
            "REASON: ACTIVE PASSENGER RECORD (RT) REQUIRED PRIOR TO ENTERING TICKETING LIMITS",
            "ERR: WORKSPACE CONTEXT EMPTY",
            ""
          ],
          explanation: "You must retrieve the active flight reservation space (using RT[LOCATOR]) or build segments and name blocks prior to applying ticketing limits.",
          isSandbox: true
        };
      }

      let tkText = "";
      let explanation = "";

      if (upperCmd === "TKTLDATE" || upperCmd === "TKLDATE") {
        tkText = "TKTL03SEP";
        explanation = "Ticketing field set with automatic ticketing limit date (TKTL03SEP) which must be added relative to the departure date.";
      } else if (upperCmd.startsWith("TKTL")) {
        tkText = command; // Store full command for high-fidelity formatting
        const param = command.substring(4).trim();
        
        if (param.startsWith("/")) {
          const limitVal = param.substring(1);
          if (/^\d{4}$/.test(limitVal)) {
            explanation = `Ticket time limit is today at ${limitVal.substring(0, 2)}.${limitVal.substring(2)} in the local time of your office ID.`;
          } else {
            explanation = `Ticket time limit is today in the local time of office ID ${limitVal}.`;
          }
        } else if (param) {
          const parts = param.split("/");
          const datePart = parts[0];
          const timePart = parts[1];
          const officePart = parts[2];

          if (parts.length === 1) {
            explanation = `Ticket time limit is September 14 (or specified date) in the local time of your office.`;
            if (/^\d+[A-Z]{3}$/i.test(datePart)) {
              const day = datePart.match(/^\d+/)?.[0] || "";
              const month = datePart.match(/[A-Z]{3}/i)?.[0]?.toUpperCase() || "";
              explanation = `Ticket time limit is ${month} ${day} in the local time of your office.`;
            }
          } else if (parts.length === 2) {
            explanation = `Ticket time limit is ${datePart} at ${timePart.substring(0, 2)}.${timePart.substring(2)} in the local time of your office ID.`;
          } else {
            explanation = `Ticket time limit is ${datePart} at ${timePart.substring(0, 2)}.${timePart.substring(2)} in the local time of office ID ${officePart}.`;
          }
        } else {
          explanation = "Ticket time limit set for the active itinerary.";
        }
      } else if (upperCmd.startsWith("TKXL")) {
        tkText = command; // Store full command for high-fidelity formatting
        const param = command.substring(4).trim();

        if (param.startsWith("/")) {
          const limitVal = param.substring(1);
          if (/^\d{4}$/.test(limitVal)) {
            explanation = `PNR auto-cancellation is at ${limitVal.substring(0, 2)}.${limitVal.substring(2)} today in the local time of your office ID.`;
          } else {
            explanation = `PNR auto-cancellation is today in the local time of office ID ${limitVal}.`;
          }
        } else if (param) {
          const parts = param.split("/");
          const datePart = parts[0];
          const timePart = parts[1];
          const officePart = parts[2];

          if (parts.length === 1) {
            explanation = `PNR auto-cancellation is on ${datePart} in the local time of your office ID.`;
          } else if (parts.length === 2) {
            explanation = `PNR auto-cancellation is on ${datePart} at ${timePart.substring(0, 2)}.${timePart.substring(2)} in the local time of your office ID.`;
          } else {
            explanation = `PNR auto-cancellation is on ${datePart} at ${timePart.substring(0, 2)}.${timePart.substring(2)} in the local time of office ID ${officePart}.`;
          }
        } else {
          explanation = "PNR auto-cancellation limit set for the active itinerary.";
        }
      } else {
        // Standard TKOK or TK OK / TK OK Date
        const tIdx = upperCmd.startsWith("TKOK") ? 4 : 2;
        tkText = command.substring(tIdx).trim();
        explanation = "Ticketing (TK OK) status entered, satisfying time-limit thresholds for the reservation queue.";
      }

      setSession({
        ...session,
        ticketing: tkText || "OK"
      });

      const displayLine = formatTicketingLine(tkText || "OK");

      return {
        recognized: true,
        output: [
          command,
          `  ${displayLine}`,
          ""
        ],
        explanation,
        isSandbox: true
      };
    }

    // 8. Received From: RF Name
    if (upperCmd.startsWith("RF")) {
      const name = command.substring(2).trim();

      setSession({
        ...session,
        receivedFrom: name
      });

      return {
        recognized: true,
        output: [
          `RF ${name}`,
          `  RECD FROM - ${name.toUpperCase()}`,
          ""
        ],
        explanation: "Signed/Authorized the received-from transaction. Standard pre-requisite for final booking locks.",
        isSandbox: true
      };
    }

    // 9. End and Retrieve (Submit / Save / Commit): ER or ET
    if (upperCmd === "ER" || upperCmd === "ET") {
      if (session.names.length === 0) {
        return {
          recognized: true,
          output: [
            "ER",
            "ERR: WORKSPACE RECORD COMPILATION BLOCKED",
            "REASON: AT LEAST ONE TRAVELER NAME 'NM1...' REQUIRED.",
            ""
          ],
          explanation: "GDS requires a passenger name record input before committing file records.",
          isSandbox: true
        };
      }

      if (session.segments.length === 0) {
        return {
          recognized: true,
          output: [
            "ER",
            "ERR: EMPTY AIR SEGMENTS BLOCK ON MAIN LEAF",
            "REASON: PLEASE BOOK SEGMENTS VIA 'SS [INDEX]' FIRST.",
            ""
          ],
          explanation: "GDS files cannot save empty itinerary rosters. Search via 'AN' and Sell via 'SS' to continue.",
          isSandbox: true
        };
      }

      const loc = generateLocator();
      
      // Save PNR record in state
      const pnrData: any = {
        locator: loc,
        names: [...session.names],
        segments: [...session.segments],
        phones: session.phones.length > 0 ? [...session.phones] : ["LHR 020 8999 1234"],
        ticketing: session.ticketing || "15OCT",
        receivedFrom: session.receivedFrom || "AGENT",
        extraLines: session.extraLines ? [...session.extraLines] : []
      };

      setSavedPnrs({
        ...savedPnrs,
        [loc]: pnrData
      });

      // Reset transaction sandbox keep the active locator committed
      setSession({
        ...createEmptySession(),
        activeLocator: loc
      });

      const out = [
        "ER",
        `RP/LONBA2460/LONBA2460            29MAY26/1330Z   ${loc}`,
      ];
      let printLineNo = 1;
      pnrData.names.forEach((n: string) => {
        out.push(` ${printLineNo++}.${n}`);
      });
      pnrData.segments.forEach((seg: any) => {
        out.push(formatAmadeusSegment(printLineNo++, seg));
      });
      pnrData.phones.forEach((p: string) => {
        out.push(` ${printLineNo++}  AP ${p}`);
      });
      out.push(` ${printLineNo++}  ${formatTicketingLine(pnrData.ticketing)}/LON-BA`);
      out.push(` ${printLineNo++}  OP RECEIVED FROM ${pnrData.receivedFrom}`);
      if (pnrData.extraLines) {
        pnrData.extraLines.forEach((line: string) => {
          out.push(` ${printLineNo++}  ${line}`);
        });
      }
      out.push(`PNR CONVAL CLOUD KEY - ${loc}`);
      out.push("");

      return {
        recognized: true,
        output: out,
        explanation: `Transaction successfully initialized and end-retrieved! Key locator generated: '${loc}'. You can view this reservation at any time using: 'RT${loc}'`,
        isSandbox: true
      };
    }

    // 10. Amadeus Fares, Pricing & Best Buy Commands: FQBB, FQBBK, FXB, FXP, FXX (including FXB/R,UP)
    const normalizedCmd = upperCmd.replace(/\s+/g, "");
    if (
      normalizedCmd.startsWith("FQBB") ||
      normalizedCmd.startsWith("FXB") ||
      normalizedCmd.startsWith("FXP") ||
      normalizedCmd.startsWith("FXX")
    ) {
      const isFqbb = normalizedCmd === "FQBB";
      const isFqbbk = normalizedCmd === "FQBBK";
      const isFxbRebook = normalizedCmd.startsWith("FXB");
      const isFxpStore = normalizedCmd.startsWith("FXP");
      
      const shouldDropClass = Math.random() < 0.5;
      let activeShouldDrop = shouldDropClass;
      if (normalizedCmd.startsWith("FXP") || normalizedCmd.startsWith("FXX")) {
        activeShouldDrop = false;
      }

      const hasRealSegments = session.segments.length > 0;
      const originalSegments = hasRealSegments ? session.segments : [
        {
          airline: "AY",
          flightNo: "73",
          classOfService: "J", // Default to Business J, which we can drop to Z
          origin: "HEL",
          destination: "TYO",
          date: "09NOV",
          seats: 1,
          depTime: "1745",
          arrTime: "2310"
        },
        {
          airline: "AY",
          flightNo: "74",
          classOfService: "J",
          origin: "TYO",
          destination: "HEL",
          date: "15NOV",
          seats: 1,
          depTime: "2310",
          arrTime: "0615"
        }
      ];

      let cabin: "business" | "premium" | "economy" = "economy";
      for (const seg of originalSegments) {
        const c = (seg.classOfService || "Y").toUpperCase();
        if (["J", "C", "D", "Z", "I"].includes(c)) {
          cabin = "business";
        } else if (["W", "E", "P"].includes(c) && cabin !== "business") {
          cabin = "premium";
        }
      }

      const rebookedSegments = originalSegments.map(seg => {
        const currentClass = (seg.classOfService || "Y").toUpperCase();
        let newClass = currentClass;
        if (activeShouldDrop) {
          if (["J", "C", "D", "Z", "I"].includes(currentClass)) {
            if (currentClass === "J") newClass = "D";
            else if (currentClass === "C") newClass = "Z";
            else if (["Z", "D"].includes(currentClass)) newClass = "I";
          } else if (["W", "E", "P"].includes(currentClass)) {
            if (currentClass === "W") newClass = "E";
            else newClass = "P";
          } else {
            if (["Y", "B", "M"].includes(currentClass)) {
              newClass = "Q";
            } else {
              newClass = "O";
            }
          }
        }
        return { ...seg, classOfService: newClass };
      });

      if ((isFxbRebook || isFqbbk) && hasRealSegments) {
        setSession({
          ...session,
          segments: rebookedSegments,
          extraLines: [...(session.extraLines || []).filter(l => !l.includes("TST")), "TST 1 - S1-2 - VAL-AY"]
        });
      } else if (isFxpStore && hasRealSegments) {
        setSession({
          ...session,
          extraLines: [...(session.extraLines || []).filter(l => !l.includes("TST")), "TST 1 - S1-2 - VAL-AY"]
        });
      }

      const paxCount = Math.max(1, session.names.length);
      
      let baseFarePerPax = 603.00;
      let taxYqPerPax = 30.00;
      let taxYrPerPax = 253.00;
      let taxXtPerPax = 43.22;
      
      if (cabin === "business") {
        if (activeShouldDrop) {
          baseFarePerPax = 1450.00;
          taxYqPerPax = 120.00;
          taxYrPerPax = 450.00;
          taxXtPerPax = 90.00;
        } else {
          baseFarePerPax = 3200.00;
          taxYqPerPax = 180.00;
          taxYrPerPax = 680.00;
          taxXtPerPax = 140.00;
        }
      } else if (cabin === "premium") {
        if (activeShouldDrop) {
          baseFarePerPax = 850.00;
          taxYqPerPax = 60.00;
          taxYrPerPax = 310.00;
          taxXtPerPax = 65.00;
        } else {
          baseFarePerPax = 1400.00;
          taxYqPerPax = 90.00;
          taxYrPerPax = 480.00;
          taxXtPerPax = 95.00;
        }
      } else {
        if (activeShouldDrop) {
          baseFarePerPax = 236.00;
          taxYqPerPax = 15.00;
          taxYrPerPax = 110.00;
          taxXtPerPax = 23.50;
        } else {
          baseFarePerPax = 603.00;
          taxYqPerPax = 30.00;
          taxYrPerPax = 253.00;
          taxXtPerPax = 43.22;
        }
      }

      const totalBase = baseFarePerPax * paxCount;
      const totalYq = taxYqPerPax * paxCount;
      const totalYr = taxYrPerPax * paxCount;
      const totalXt = taxXtPerPax * paxCount;
      const totalTaxes = totalYq + totalYr + totalXt;
      const grandTotal = totalBase + totalTaxes;

      if (isFqbb) {
        const seg1 = originalSegments[0];
        const airline = seg1.airline.toUpperCase();
        
        const baggageLines: string[] = [];
        originalSegments.forEach(seg => {
          const sCarrier = seg.airline.toUpperCase();
          const sOrigin = seg.origin.toUpperCase();
          const sDest = seg.destination.toUpperCase();
          const sClass = activeShouldDrop ? rebookedSegments[0].classOfService : seg.classOfService;
          const sBag = ["J", "C", "D", "Z", "I"].includes(sClass) ? "2P" : "1P";
          baggageLines.push(` ${sCarrier} ${sOrigin}${sDest}  ${sBag}`);
        });

        const out = [
          command.toUpperCase(),
          "           *** BEST BUY QUOTATION ***           ",
          "    LOWEST FARE AVAILABLE FOR THIS ITINERARY    ",
          `         *** REBOOK BF SEGMENTS ${originalSegments.length}F ***         `,
          " PSGR             FARE       TAXES       TOTAL PSG DES",
          `FQG 1       EUR   ${totalBase.toFixed(2).padEnd(9, " ")} ${totalTaxes.toFixed(2).padEnd(10, " ")}  ${grandTotal.toFixed(2)} ADT`,
          "    GUARANTEED AT TIME OF TICKETING",
          `GRAND TOTAL INCLUDING TAXES ****    EUR               ${grandTotal.toFixed(2)}`,
          "  **FEE TOTAL                                   0.00",
          `  **PRICE INCLUDING TAXES AND FEES            ${grandTotal.toFixed(2)}`,
          "  FEES BASED ON CURRENT REQUEST-SEE >FO. FOR ALL TICKET FEES",
          "     **CARRIER MAY OFFER ADDITIONAL SERVICES**SEE >FQBB/DASO.",
          "    ADT      LAST DATE TO PURCHASE TICKET: 11OCT26",
          "    ADT      TICKETING AGENCY",
          `    ADT      DEFAULT PLATING CARRIER ${airline}`,
          "    ADT      FARE HAS A PLATING CARRIER RESTRICTION",
          "    ADT      E-TKT REQUIRED",
          "TO REBOOK ENTER >FQBBK.",
          "BAGGAGE ALLOWANCE",
          "ADT",
          ...baggageLines,
          "   BAG 1 -  60.00 EUR    PREPAID OVERWEIGHT",
          "   BAG 2 -  60.00 EUR    PREPAID OVERWEIGHT",
          `  VIEWTRIP.TRAVELPORT.COM/BAGGAGEPOLICY/${airline}`,
          ""
        ];

        return {
          recognized: true,
          output: out,
          explanation: "Best available/lowest-pricing query for the configured route space listing rebookable class instructions.",
          isSandbox: true
        };
      }

      const segmentsToPrice = (isFxbRebook || isFqbbk) ? rebookedSegments : originalSegments;
      const originCity = segmentsToPrice[0].origin.toUpperCase();
      const segLines: string[] = [];
      segLines.push(` ${originCity}`);
      
      segmentsToPrice.forEach((seg) => {
        const dest = seg.destination.toUpperCase();
        const airline = seg.airline.toUpperCase();
        const flt = seg.flightNo.replace(/\D/g, "");
        const carrierFlt = `${airline} ${flt.padStart(4, " ")}`;
        const bClass = seg.classOfService.toUpperCase();
        const fDate = seg.date.toUpperCase();
        const depTime = seg.depTime;
        
        let fareBasis = `${bClass}CN0A6M3`;
        if (cabin === "business") fareBasis = `${bClass}CBA0G7S`;
        if (cabin === "premium") fareBasis = `${bClass}PClassic`;

        const bag = ["J", "C", "D", "Z", "I"].includes(bClass) ? "2P" : "1P";
        
        const lineDest = dest.padEnd(4, " ");
        const lineCarrier = carrierFlt.padEnd(8, " ");
        const lineClass = bClass.padEnd(2, " ");
        const lineTkt = `*${bClass}`.padEnd(3, " ");
        const lineDate = fDate.padEnd(6, " ");
        const lineTime = depTime.padEnd(6, " ");
        const lineBasis = fareBasis.padEnd(10, " ");
        const lineNvb = "".padEnd(10, " ");
        const lineNva = "".padEnd(10, " ");
        const lineBag = bag;
        
        segLines.push(` ${lineDest} ${lineCarrier} ${lineClass} ${lineTkt} ${lineDate} ${lineTime} ${lineBasis} ${lineNvb} ${lineNva} ${lineBag}`);
      });

      const seg1 = segmentsToPrice[0];
      const seg2 = segmentsToPrice[1];
      const carrier1 = seg1.airline.toUpperCase();
      const origin1 = seg1.origin.toUpperCase();
      const dest1 = seg1.destination.toUpperCase();
      const dateFormatted = `${seg1.date}26`.toUpperCase();
      
      let routeCalc = `${dateFormatted}${origin1} ${carrier1} ${dest1}${(baseFarePerPax).toFixed(2)}`;
      if (seg2) {
        const carrier2 = seg2.airline.toUpperCase();
        const origin2 = seg2.origin.toUpperCase();
        const halfBaseStr = (baseFarePerPax / 2).toFixed(2);
        routeCalc = `${dateFormatted}${origin1} ${carrier1} ${dest1}${halfBaseStr}${carrier2} ${origin2}${halfBaseStr}NUC`;
      } else {
        routeCalc = `${routeCalc}NUC`;
      }

      const outLines = [
        command.toUpperCase(),
        ""
      ];

      if (session.names.length > 0) {
        session.names.forEach((name, nIdx) => {
          outLines.push(`0${nIdx+1} ${name} *`);
        });
      } else {
        outLines.push("01 SMITH/LUNA *");
      }

      if (isFxbRebook || isFqbbk) {
        if (activeShouldDrop) {
          outLines.push("ITINERARY REBOOKED");
        } else {
          outLines.push("ITINERARY PRICED - NO CHEAPER CLASS AVAILABLE");
        }
      } else if (isFxpStore) {
        outLines.push("ITINERARY PRICED - TST CREATED");
      } else {
        outLines.push("ITINERARY PRICED");
      }

      outLines.push("LAST TKT DTE 11OCT26/23:59 LT in POS");
      outLines.push("------------------------------------------------------------");
      outLines.push("     AL FLGT  BK T DATE  TIME  FARE BASIS      NVB  NVA   BG");
      segLines.forEach(l => outLines.push(l));
      outLines.push("");
      outLines.push(`EUR   ${totalBase.toFixed(2).padStart(8, " ")}      ${routeCalc}`);
      outLines.push(`                  ${(totalBase * 1.1068).toFixed(2)}END ROE0.903454`);
      outLines.push(`EUR   ${totalYq.toFixed(2).padStart(8, " ")}-YQ   XT EUR 5.71-DQ EUR 11.11-FI EUR 0.90-XU`);
      outLines.push(`EUR   ${totalYr.toFixed(2).padStart(8, " ")}-YR   EUR 4.29-OI EUR 15.08-SW EUR 6.13-TK`);
      outLines.push(`EUR   ${totalXt.toFixed(2).padStart(8, " ")}-XT`);
      outLines.push(`EUR   ${grandTotal.toFixed(2).padStart(8, " ")}`);
      outLines.push("FARE FAMILIES:    (ENTER FQFn FOR DETAILS, FXY FOR UPSELL)");
      outLines.push("FARE FAMILY:FC1:1:ECLASSIC");
      outLines.push("FARE FAMILY:FC2:2:ECLASSIC");
      outLines.push("");

      let actionExplanation = "Calculates pricing and details the fare breakdown for the given class of service.";
      if (isFxbRebook || isFqbbk) {
        actionExplanation = "Evaluates the cheapest possible booking classes. If lower classes are found, the reservation itinerary segments are instantly rebooked to the lower fares.";
      } else if (isFxpStore) {
        actionExplanation = "Prices the booked classes of service on the worksheet itinerary and logs a Transitional State Ticket (TST) indices record.";
      }

      return {
        recognized: true,
        output: outLines,
        explanation: actionExplanation,
        isSandbox: true
      };
    }
  }

  // ----------------------------------------------------
  // SABRE CODES
  // ----------------------------------------------------
  if (gdsStyle === "sabre") {
    // 1. Reset
    if (upperCmd === "I" || upperCmd === "IR" || upperCmd === "IG") {
      setSession(createEmptySession());
      return {
        recognized: true,
        output: ["SABRE WORKSPACE RESET", ""],
        explanation: "Ignore ('I' / 'IR') clears the operational scratchpad for the active Sabre simulator.",
        isSandbox: true
      };
    }

    // 2. Retrieve *[Locator] or *A
    if (upperCmd.startsWith("*")) {
      const locatorStr = upperCmd.substring(1).trim();

      if (locatorStr && locatorStr !== "A") {
        let saved = savedPnrs[locatorStr];
        if (!saved && locatorStr.length === 6 && /^[A-Z0-9]{6}$/.test(locatorStr)) {
          // Retrieve a random PNR from our practice database set & record it under this locator
          const keys = Object.keys(savedPnrs).length > 0 ? Object.keys(savedPnrs) : Object.keys(DEFAULT_PRACTICE_PNRS);
          const randomKey = keys[Math.floor(Math.random() * keys.length)];
          const basePnr = savedPnrs[randomKey] || DEFAULT_PRACTICE_PNRS[randomKey];
          saved = {
            ...basePnr,
            locator: locatorStr
          };
          setSavedPnrs({
            ...savedPnrs,
            ...DEFAULT_PRACTICE_PNRS,
            [locatorStr]: saved
          });
        }

        if (saved) {
          const loadedSession = {
            availability: session.availability,
            names: [...saved.names],
            segments: [...saved.segments],
            phones: saved.phones ? [...saved.phones] : [],
            ticketing: saved.ticketing || null,
            receivedFrom: saved.receivedFrom || null,
            activeLocator: locatorStr,
            extraLines: saved.extraLines ? [...saved.extraLines] : []
          };
          setSession(loadedSession);

          const pnrBuffer = renderGdsPnrBuffer("sabre", loadedSession);
          const out = [
            ...pnrBuffer,
          ];
          out.push("");

          return {
            recognized: true,
            output: out,
            explanation: `Loaded Sabre reservation ${locatorStr} from regional host.`,
            isSandbox: true
          };
        } else {
          return {
            recognized: true,
            output: [`ERR: LOCATOR ${locatorStr} NOT REGISTERED`, ""],
            explanation: `Sabre host failed to locate record ${locatorStr}.`,
            isSandbox: true
          };
        }
      } else {
        if (session.names.length === 0 && session.segments.length === 0) {
          return {
            recognized: true,
            output: ["SABRE FILE IS VACANT", ""],
            explanation: "Display command ('*') returned no records currently loaded in the active sandbox workspace.",
            isSandbox: true
          };
        }

        const saved = session.activeLocator ? (savedPnrs[session.activeLocator] || DEFAULT_PRACTICE_PNRS[session.activeLocator]) : null;
        const tempSession: GdsSession = {
          ...session,
          extraLines: session.extraLines && session.extraLines.length > 0 ? session.extraLines : (saved && saved.extraLines ? saved.extraLines : [])
        };
        const pnrBuffer = renderGdsPnrBuffer("sabre", tempSession);
        const out = [
          ...pnrBuffer
        ];
        out.push("");

        return {
          recognized: true,
          output: out,
          explanation: "Displaying draft Sabre files.",
          isSandbox: true
        };
      }
    }

    // 3. Search: 1 Date Org Dest (e.g. 115OCTLHRJFK)
    if (upperCmd.startsWith("1")) {
      const body = upperCmd.substring(1).trim();
      const parsedMatch = body.match(/^(\d{1,2}[A-Z]{3})?([A-Z]{3})([A-Z]{3})?(\*[A-Z]{2})?/i);
      if (parsedMatch) {
         const date = parsedMatch[1] || "15OCT";
         const origin = parsedMatch[2] || "LHR";
         const destination = parsedMatch[3] || "JFK";
         
         const mockFlights = generateMockFlights(date, origin, destination);
         setSession({
           ...session,
           availability: mockFlights
         });

         const { dateFormatted } = parseGdsDate(date);
         const firstCarrier = mockFlights[0]?.airline || "BA";
         const headerCityOrg = (CITY_NAME_MAP[origin.toUpperCase()] || `${origin.toUpperCase()} CITY`).split(".")[0].padEnd(16).toUpperCase();
         const headerCityDest = (CITY_NAME_MAP[destination.toUpperCase()] || `${destination.toUpperCase()} CITY`).split(".")[0].padEnd(16).toUpperCase();

         const out = [
           `1${body}`,
           `${dateFormatted}26 ${origin.toUpperCase()}-${destination.toUpperCase()} C*${firstCarrier}`,
           `${origin.toUpperCase()}  ${headerCityOrg}               ${destination.toUpperCase()}  ${headerCityDest}`
         ];
         mockFlights.forEach(f => {
           const shortClasses = f.classes ? f.classes.split(" ").slice(0, 4).join(" ") : "F9 C9 Y9 Y9";
           const stopsCode = f.stops ? `${f.stops}` : "0";
           let lineStr = ` ${f.line}${f.airline} ${f.flightNo.padEnd(3)} ${shortClasses.padEnd(15)} /${f.origin}${f.depTime} ${f.destination}${f.arrTime} ${f.aircraft} ${stopsCode} /E`;
           if (f.stops && f.via) {
             lineStr += `  *VIA ${f.via.toUpperCase()}*`;
           }
           out.push(lineStr);
         });
         out.push("");

         return {
           recognized: true,
           output: out,
           explanation: "Sabre Availability Search initiated.",
           isSandbox: true
         };
      }
    }

    // 4. Booking segment sell: 0 [seats][cabin][line] (01Y1)
    if (upperCmd.startsWith("0")) {
      const param = upperCmd.substring(1).trim();
      const match = param.match(/^(\d+)([A-Z])(\d+)$/);
      if (match) {
        const lineNo = parseInt(match[3], 10);
        const cabinClass = match[2];
        const count = parseInt(match[1], 10);

        const matchedFlight = session.availability.find(f => f.line === lineNo);
        if (!matchedFlight || !isClassAvailable(matchedFlight, cabinClass)) {
          return {
            recognized: true,
            output: [
              "UNAVAILABLE",
              ""
            ],
            explanation: `The booking class '${cabinClass}' is not available on flight line ${lineNo}.`,
            isSandbox: true
          };
        }

        const booked = {
          airline: matchedFlight.airline,
          flightNo: matchedFlight.flightNo,
          classOfService: cabinClass,
          origin: matchedFlight.origin,
          destination: matchedFlight.destination,
          date: matchedFlight.date,
          seats: count,
          depTime: matchedFlight.depTime,
          arrTime: matchedFlight.arrTime
        };

        const updatedSegments = [...session.segments, booked];
        setSession({
          ...session,
          segments: updatedSegments
        });

        const out = [
          `0${param}`,
          `01${cabinClass}${lineNo} - SEAT SOLD SEGMENT COMMITTED`,
          ` 1  ${booked.airline} ${booked.flightNo}${booked.classOfService} ${booked.date} ${booked.origin}${booked.destination} SS${booked.seats}  0830 1130`,
          ""
        ];

        return {
          recognized: true,
          output: out,
          explanation: `Seat sold successfully in Sabre on segment ${lineNo}. Seats: ${count}. Status holds (SS).`,
          isSandbox: true
        };
      }
    }

    // 5. Name entry: - [lastname]/[firstname] [title]
    if (upperCmd.startsWith("-")) {
      const nameBody = command.substring(1).trim();
      if (nameBody.includes("/")) {
        const updatedNames = [...session.names, nameBody.toUpperCase()];
        setSession({
          ...session,
          names: updatedNames
        });

        return {
          recognized: true,
          output: [
            `-${nameBody}`,
            `1.1 ${nameBody.toUpperCase()}`,
            ""
          ],
          explanation: "Passenger name stored via Sabre hyphen index modifier.",
          isSandbox: true
        };
      }
    }
  }

  // ----------------------------------------------------
  // GALILEO CODES
  // ----------------------------------------------------
  if (gdsStyle === "galileo") {
    // 1. Reset
    if (upperCmd === "I" || upperCmd === "IR" || upperCmd === "IG") {
      setSession(createEmptySession());
      return {
        recognized: true,
        output: ["IGNORE COMPLETE - WORKSPACE RESET", ""],
        explanation: "Galileo Workspace cleared.",
        isSandbox: true
      };
    }

    // 2. Retrieve * [Locator] or *ALL
    if (upperCmd.startsWith("*")) {
      const locatorStr = upperCmd.substring(1).trim();

      if (locatorStr && locatorStr !== "ALL") {
        let saved = savedPnrs[locatorStr];
        if (!saved && locatorStr.length === 6 && /^[A-Z0-9]{6}$/.test(locatorStr)) {
          // Retrieve a random PNR from our practice database set & record it under this locator
          const keys = Object.keys(savedPnrs).length > 0 ? Object.keys(savedPnrs) : Object.keys(DEFAULT_PRACTICE_PNRS);
          const randomKey = keys[Math.floor(Math.random() * keys.length)];
          const basePnr = savedPnrs[randomKey] || DEFAULT_PRACTICE_PNRS[randomKey];
          saved = {
            ...basePnr,
            locator: locatorStr
          };
          setSavedPnrs({
            ...savedPnrs,
            ...DEFAULT_PRACTICE_PNRS,
            [locatorStr]: saved
          });
        }

        if (saved) {
          const loadedSession = {
            availability: session.availability,
            names: [...saved.names],
            segments: [...saved.segments],
            phones: saved.phones ? [...saved.phones] : [],
            ticketing: saved.ticketing || null,
            receivedFrom: saved.receivedFrom || null,
            activeLocator: locatorStr,
            extraLines: saved.extraLines ? [...saved.extraLines] : []
          };
          setSession(loadedSession);

          const pnrBuffer = renderGdsPnrBuffer("galileo", loadedSession);
          const out = [
            ...pnrBuffer,
          ];
          out.push("");

          return {
            recognized: true,
            output: out,
            explanation: `Loaded Galileo booking worksheet indices for ${locatorStr}.`,
            isSandbox: true
          };
        } else {
          return {
            recognized: true,
            output: [`ERR: SATELLITE LOCATOR ${locatorStr} UNRECOGNIZED`, ""],
            explanation: `Galileo could not resolve database index '${locatorStr}'.`,
            isSandbox: true
          };
        }
      } else {
        if (session.names.length === 0 && session.segments.length === 0) {
          return {
            recognized: true,
            output: ["GALILEO WORKSPACE IS EMPTY", ""],
            explanation: "Active files empty.",
            isSandbox: true
          };
        }

        const saved = session.activeLocator ? (savedPnrs[session.activeLocator] || DEFAULT_PRACTICE_PNRS[session.activeLocator]) : null;
        const tempSession: GdsSession = {
          ...session,
          extraLines: session.extraLines && session.extraLines.length > 0 ? session.extraLines : (saved && saved.extraLines ? saved.extraLines : [])
        };
        const pnrBuffer = renderGdsPnrBuffer("galileo", tempSession);
        const out = [
          ...pnrBuffer
        ];
        out.push("");

        return {
          recognized: true,
          output: out,
          explanation: "Displaying Galileo active draft keys.",
          isSandbox: true
        };
      }
    }

    // 3. Search: A Date Org Dest (e.g. A15OCTLHRJFK)
    if (upperCmd.startsWith("A")) {
      const body = upperCmd.substring(1).trim();
      const parsedMatch = body.match(/^(\d{1,2}[A-Z]{3})?([A-Z]{3})([A-Z]{3})?(\*[A-Z]{2})?/i);
      if (parsedMatch) {
         const date = parsedMatch[1] || "15OCT";
         const origin = parsedMatch[2] || "LHR";
         const destination = parsedMatch[3] || "JFK";
         
         const mockFlights = generateMockFlights(date, origin, destination);
         setSession({
           ...session,
           availability: mockFlights
         });

         const { dateFormatted } = parseGdsDate(date);
         const out = [
           `A${body}`,
           `${origin.toUpperCase()}-${destination.toUpperCase()} ${dateFormatted.toUpperCase()}      ** TRAVELPORT GALILEO SATELLITE ENTRY **`
         ];
         mockFlights.forEach(f => {
           const stopsCode = f.stops ? `${f.stops}` : "0";
           let lineStr = ` ${f.line}   ${f.airline} ${f.flightNo.padEnd(4)}  ${f.classes.substring(0, 20).padEnd(20)}  ${f.depTime} ${f.origin} ${f.arrTime} ${f.destination} ${f.aircraft} ${stopsCode}*E`;
           if (f.stops && f.via) {
             lineStr += `  *VIA ${f.via.toUpperCase()}*`;
           }
           out.push(lineStr);
         });
         out.push("");

         return {
           recognized: true,
           output: out,
           explanation: "Galileo Availability Search initiated.",
           isSandbox: true
         };
      }
    }

    // 4. Booking segment sell: N [seats][group][line] (N1Y1)
    if (upperCmd.startsWith("N")) {
      const param = upperCmd.substring(1).trim();
      const match = param.match(/^(\d+)([A-Z])(\d+)$/);
      if (match) {
        const lineNo = parseInt(match[3], 10);
        const cabinClass = match[2];
        const count = parseInt(match[1], 10);

        const matchedFlight = session.availability.find(f => f.line === lineNo);
        if (!matchedFlight || !isClassAvailable(matchedFlight, cabinClass)) {
          return {
            recognized: true,
            output: [
              "UNAVAILABLE",
              ""
            ],
            explanation: `The booking class '${cabinClass}' is not available on flight line ${lineNo}.`,
            isSandbox: true
          };
        }

        const booked = {
          airline: matchedFlight.airline,
          flightNo: matchedFlight.flightNo,
          classOfService: cabinClass,
          origin: matchedFlight.origin,
          destination: matchedFlight.destination,
          date: matchedFlight.date,
          seats: count,
          depTime: matchedFlight.depTime,
          arrTime: matchedFlight.arrTime
        };

        const updatedSegments = [...session.segments, booked];
        setSession({
          ...session,
          segments: updatedSegments
        });

        const out = [
          `N${param}`,
          ` 1  ${booked.airline} ${booked.flightNo} ${booked.classOfService} ${booked.date} ${booked.origin}${booked.destination}*HS${booked.seats}   0830 1130  E*`,
          ""
        ];

        return {
          recognized: true,
          output: out,
          explanation: `Seat reserved under Galileo segment ${lineNo}. Seats: ${count}. Status holds (HS).`,
          isSandbox: true
        };
      }
    }

    // 5. Name entry: N.[lastname]/[firstname] [title]
    if (upperCmd.startsWith("N.")) {
      const nameBody = command.substring(2).trim();
      if (nameBody.includes("/")) {
        const updatedNames = [...session.names, nameBody.toUpperCase()];
        setSession({
          ...session,
          names: updatedNames
        });

        return {
          recognized: true,
          output: [
            `N.${nameBody}`,
            `1.1${nameBody.toUpperCase()}`,
            ""
          ],
          explanation: "Passenger name registered inside Travelport Galileo template.",
          isSandbox: true
        };
      }
    }
  }

  // Not recognized as a standard cryptic terminal command sequence
  return {
    recognized: false,
    output: [],
    explanation: "",
    isSandbox: false,
  };
}
