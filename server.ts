import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = 3000;

// Lazy initialize Gemini to prevent start crashes if the key isn't set yet during build setup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ================= GDS MODEL MEMORY & GROUNDING DICTIONARY =================
const MODEL_MEMORY_FILE = path.join(process.cwd(), "model_memory.json");

const SEED_MODEL_MEMORY = [
  {
    "id": "std_amadeus_infant",
    "title": "Amadeus Infant Segment Sale",
    "gds": "amadeus",
    "keywords": "infant, baby, child, ss1inf1, book baby",
    "expectedCommand": "SS1INF1",
    "commandDescription": "SS (Sell Status) + 1 (Line number from availability) + INF (Infant code) + 1 (Qty) - Books segment correctly.",
    "terminalOutput": "SS1INF1\n 1  BA 115 Y 15OCT LHRJFK HK1/INF1  0830 1130\n>",
    "topic": "Infants & Children"
  },
  {
    "id": "std_sabre_infant",
    "title": "Sabre Infant SSR Command",
    "gds": "sabre",
    "keywords": "infant, baby, child, 3inf, register infant",
    "expectedCommand": "3INFT/1.1",
    "commandDescription": "3 (Special Service indicator) + INFT (Infant code) + /1.1 (pax sequence linking)",
    "terminalOutput": "3INFT/1.1\n  SSR INFT YY RECD CONFIRMED OK FOR PAX 1.1\n*",
    "topic": "Infants & Children"
  },
  {
    "id": "std_amadeus_wheelchair",
    "title": "Amadeus Wheelchair Special Request",
    "gds": "amadeus",
    "keywords": "wheelchair, wchr, mobility, disabled, wheelchair request",
    "expectedCommand": "SRWCHR/P1",
    "commandDescription": "SR (Special Request) + WCHR (Wheelchair code) + /P1 (Passenger 1 linking index)",
    "terminalOutput": "SRWCHR/P1\n  SSR WCHR BA HK1 CONFIRMED FOR SMITH/ANNA MS\n>",
    "topic": "Special Services (SSR)"
  },
  {
    "id": "std_sabre_wheelchair",
    "title": "Sabre Wheelchair Entry",
    "gds": "sabre",
    "keywords": "wheelchair, wchr, mobility, disabled, wheelchair entry",
    "expectedCommand": "3WCHRA/1.1",
    "commandDescription": "3 (SSR modifier) + WCHRA (Wheelchair SSR code) + /1.1 (Traveler sequence pairing)",
    "terminalOutput": "3WCHRA/1.1\n  SSR WCHRA YY LOGGED DIRECT CODES FOR PASSENGER 1.1\n*",
    "topic": "Special Services (SSR)"
  },
  {
    "id": "std_galileo_wheelchair",
    "title": "Galileo Wheelchair Standard Integration",
    "gds": "galileo",
    "keywords": "wheelchair, wchr, mobility, disabled, wheelchair request",
    "expectedCommand": "SI.DL*WCHR",
    "commandDescription": "SI. (Special Information prefix) + DL (Carrier double code) + *WCHR (Assistance Request identifier)",
    "terminalOutput": "SI.DL*WCHR\n  01 SPECIAL SERVICE DETAILS REGISTERED SECURELY - STATUS HK1\n>",
    "topic": "Special Services (SSR)"
  },
  {
    "id": "std_amadeus_vegmeal",
    "title": "Amadeus Vegetarian Meal (VGML)",
    "gds": "amadeus",
    "keywords": "veg, meal, vegetarian, dietary, vgml, request meal",
    "expectedCommand": "SRVGML/P1",
    "commandDescription": "SR (Special Request) + VGML (Vegetarian standard code) + /P1 (Passenger index lookup)",
    "terminalOutput": "SRVGML/P1\n  SSR VGML BA HK1 RECORD COMPLETED FOR TRANS 1\n>",
    "topic": "Special Services (SSR)"
  },
  {
    "id": "std_sabre_vegmeal",
    "title": "Sabre Vegetarian Meal Request (VGML)",
    "gds": "sabre",
    "keywords": "veg, meal, vegetarian, dietary, vgml, request meal",
    "expectedCommand": "3VGML/1.1",
    "commandDescription": "3 (SSR line code) + VGML (Vegetarian vegan meal code) + /1.1 (Pax sequence linking)",
    "terminalOutput": "3VGML/1.1\n  SSR VGML YY LOGGED IN MEAL LEDGER FOR PAX 1.1\n*",
    "topic": "Special Services (SSR)"
  },
  {
    "id": "std_galileo_vegmeal",
    "title": "Galileo Vegetarian Meal Request (VGML)",
    "gds": "galileo",
    "keywords": "veg, meal, vegetarian, dietary, vgml, request meal",
    "expectedCommand": "SI.BA*VGML",
    "commandDescription": "SI. (Special Info) + BA (Carrier identifier) + *VGML (Standard meal indicator)",
    "terminalOutput": "SI.BA*VGML\n  01 SI VGML BA HK1 RECORD CONFIRMED SECURELY BY CARRIER\n>",
    "topic": "Special Services (SSR)"
  },
  {
    "id": "std_amadeus_pnr",
    "title": "Amadeus Name Entry (NM1)",
    "gds": "amadeus",
    "keywords": "enter name, insert name, add name, nm1",
    "expectedCommand": "NM1SMITH/ANNA MS",
    "commandDescription": "NM1 (Name Field, 1 Pax) + SMITH/ANNA MS (Last/First Title)",
    "terminalOutput": "NM1SMITH/ANNA MS\n 1 SMITH/ANNA MS\n>",
    "topic": "Passenger Names"
  },
  {
    "id": "std_sabre_pnr",
    "title": "Sabre Name Insert",
    "gds": "sabre",
    "keywords": "enter name, insert name, add name, name entry",
    "expectedCommand": "-SMITH/ANNA MS",
    "commandDescription": "- (Name entry prefix character) + SMITH/ANNA MS (Last/First Title)",
    "terminalOutput": "-SMITH/ANNA MS\n1.1 SMITH/ANNA MS\n*",
    "topic": "Passenger Names"
  },
  {
    "id": "std_galileo_pnr",
    "title": "Galileo Name Entry",
    "gds": "galileo",
    "keywords": "enter name, insert name, add name, name entry",
    "expectedCommand": "N.SMITH/ANNA MS",
    "commandDescription": "N. (Name format code) + SMITH/ANNA MS (Last/First Title)",
    "terminalOutput": "N.SMITH/ANNA MS\n1.1SMITH/ANNA MS\n>",
    "topic": "Passenger Names"
  },
  {
    "id": "std_amadeus_hotel",
    "title": "Amadeus Hotel Availability by Date",
    "gds": "amadeus",
    "keywords": "hotel availability, find hotel, search hotel, HASAN, check hotel",
    "expectedCommand": "HASAN6FEB-9FEB/RT-2",
    "commandDescription": "HA (Hotel Availability) + SAN (City code San Diego) + Date range (6FEB-9FEB) + /RT-2 (Rate code for 2 adults)",
    "terminalOutput": "HASAN6FEB-9FEB/RT-2\n** AMADEUS HOTEL AVAILABILITY - HA ** SAN DIEGO, CA\n 1  MARRIOTT GASLAMP SAN  SGL/DBL  USD 185.00  REQS OK\n 2  HILTON SANDIEGO BAY   SGL/DBL  USD 210.00  REQS OK\n>",
    "topic": "Hotel Bookings"
  },
  {
    "id": "std_sabre_hotel",
    "title": "Sabre Hotel Availability",
    "gds": "sabre",
    "keywords": "hotel availability, find hotel, search hotel, HOTSAN, check hotel",
    "expectedCommand": "HOTSAN/6FEB-3NT2",
    "commandDescription": "HOT (Hotel availability) + SAN (San Diego) + / + check in date + duration 3 nights + 2 adults",
    "terminalOutput": "HOTSAN/6FEB-3NT2\nSABRE HOTEL DIRECTORY - SAN SAN DIEGO 06FEB-09FEB 2 Adults\n 1 MARRIOTT SAN GASLAMP  SGLD  USD 185.00 NT\n 2 HILTON SAN BAYFRONT    SGLD  USD 210.00 NT\n*",
    "topic": "Hotel Bookings"
  },
  {
    "id": "std_galileo_hotel",
    "title": "Galileo Hotel Availability",
    "gds": "galileo",
    "keywords": "hotel availability, find hotel, search hotel, HOA6FEB, check hotel",
    "expectedCommand": "HOA6FEB-09FEBSAN2",
    "commandDescription": "HOA (Hotel Availability) + check in date + hyphen + check out date + SAN city + 2 guests",
    "terminalOutput": "HOA6FEB-09FEBSAN2\n* TRAVELPORT GALILEO HOTEL INDEX - SAN DIEGO 06FEB-09FEB *\n01 MARRIOTT GASLAMP SGL  USD185.00  B-Y\n02 HILTON BAYFRONT  SGL  USD210.00  B-Y\n>",
    "topic": "Hotel Bookings"
  },
  {
    "id": "std_amadeus_car",
    "title": "Amadeus Car Availability",
    "gds": "amadeus",
    "keywords": "car availability, rent car, car hire, CADEN, check car",
    "expectedCommand": "CADEN23AUG-25AUG/ARR-9A-9P",
    "commandDescription": "CA (Car Availability) + DEN (Denver) + Date range (23AUG-25AUG) + /ARR-9A-9P (Arrival/Departure time)",
    "terminalOutput": "CADEN23AUG-25AUG/ARR-9A-9P\n** AMADEUS CAR AVAILABILITY - CAR ** DEN DENVER\n 1  ZE ECAR COLD DEN0900/0900  USD 45.00 DAY\n 2  ZI CCAR COLD DEN0900/0900  USD 49.00 DAY\n>",
    "topic": "Car Rentals"
  },
  {
    "id": "std_sabre_car",
    "title": "Sabre Car Availability",
    "gds": "sabre",
    "keywords": "car availability, rent car, car hire, CFDEN, check car",
    "expectedCommand": "CFDEN/23AUG-25AUG/1P-6P",
    "commandDescription": "CF (Car Availability command) + DEN (Denver) + / + check in, check out dates + 1P check in, 6P drop off time",
    "terminalOutput": "CFDEN/23AUG-25AUG/1P-6P\nSABRE CAR DIRECTORY - DEN DENVER 23AUG-25AUG\n 1 HERTZ ECAR DAILY USD 45.00 UNL\n 2 AVIS  CCAR DAILY USD 49.00 UNL\n*",
    "topic": "Car Rentals"
  },
  {
    "id": "std_galileo_car",
    "title": "Galileo Car Availability",
    "gds": "galileo",
    "keywords": "car availability, rent car, car hire, CAL/, check car",
    "expectedCommand": "CAL/DT-1500",
    "commandDescription": "CAL (Car Availability) + / + DT (Denver airport code) + -1500 (Rent time)",
    "terminalOutput": "CAL/DT-1500\n* TRAVELPORT GALILEO CAR AVAILABILITY - DEPART DT (DEN) *\n 1 ZI ECAR USD45.00 DY - CONTRACT RATES SECURED\n 2 ZE CCAR USD49.00 DY - CONTRACT RATES SECURED\n>",
    "topic": "Car Rentals"
  },
  {
    "id": "std_amadeus_encode_city",
    "title": "Amadeus Encode City name",
    "gds": "amadeus",
    "keywords": "encode city, encode peoria, how to encode, city encoding",
    "expectedCommand": "DANPEORIA",
    "commandDescription": "DAN (Decode/Encode name prefix) + Name to encode (PEORIA)",
    "terminalOutput": "DANPEORIA\nPEORIA ILL, USA           PIA\n>",
    "topic": "System Utilities"
  },
  {
    "id": "std_sabre_encode_city",
    "title": "Sabre Encode City name",
    "gds": "sabre",
    "keywords": "encode city, encode peoria, how to encode, city encoding",
    "expectedCommand": "W/-CCPEORIA",
    "commandDescription": "W/ (Workstation utility) + -CC (Encode City Code flag) + PEORIA",
    "terminalOutput": "W/-CCPEORIA\nPEORIA ILLINOIS           PIA\n*",
    "topic": "System Utilities"
  },
  {
    "id": "std_galileo_encode_city",
    "title": "Galileo Encode City name",
    "gds": "galileo",
    "keywords": "encode city, encode peoria, how to encode, city encoding",
    "expectedCommand": ".CE PEORIA",
    "commandDescription": ".CE (Encode City/Airport standard command) + PEORIA",
    "terminalOutput": ".CE PEORIA\nPEORIA ILLINOIS           PIA\n>",
    "topic": "System Utilities"
  },
  {
    "id": "std_amadeus_decode_city",
    "title": "Amadeus Decode City Code",
    "gds": "amadeus",
    "keywords": "decode city, decode pia, decode nyc, decode airport",
    "expectedCommand": "DACPIA",
    "commandDescription": "DAC (Decode Airport City indicator) + Airport/City IATA Code (PIA)",
    "terminalOutput": "DACPIA\nPIA   PEORIA ILLINOIS USA - GREATER PEORIA REGIONAL\n>",
    "topic": "System Utilities"
  },
  {
    "id": "std_sabre_decode_city",
    "title": "Sabre Decode City Code",
    "gds": "sabre",
    "keywords": "decode city, decode pia, decode nyc, decode airport",
    "expectedCommand": "W/*PIA",
    "commandDescription": "W/ (Workstation utility) + * (Display Decode) + PIA",
    "terminalOutput": "W/*PIA\nPIA   PEORIA ILLINOIS USA - GREATER PEORIA REGIONAL\n*",
    "topic": "System Utilities"
  },
  {
    "id": "std_galileo_decode_city",
    "title": "Galileo Decode City Code",
    "gds": "galileo",
    "keywords": "decode city, decode pia, decode nyc, decode airport",
    "expectedCommand": ".CD NYC",
    "commandDescription": ".CD (Decode City command) + NYC",
    "terminalOutput": ".CD NYC\nNYC   NEW YORK  NY  USA - ALL METROPOLITAN AIRPORTS\n>",
    "topic": "System Utilities"
  },
  {
    "id": "std_amadeus_currency",
    "title": "Amadeus Currency Exchange",
    "gds": "amadeus",
    "keywords": "currency, exchange, convert currency, FXS, conversion",
    "expectedCommand": "FQC35000JPY/USD/B",
    "commandDescription": "FQC (Fare Quote Conversion) + amount and currency (35000JPY) + /target currency (USD) + /B (Bank Sell rate)",
    "terminalOutput": "FQC35000JPY/USD/B\nCONVERSION EUR RECONSTRUCTED\n35000 JPY = 224.50 USD\nBANK SELL RATE - SECURE EXCHANGE RATIO APPLIED\n>",
    "topic": "System Utilities"
  },
  {
    "id": "std_sabre_currency",
    "title": "Sabre Currency Exchange",
    "gds": "sabre",
    "keywords": "currency, exchange, convert currency, conversion",
    "expectedCommand": "DC+JPY3500/USD",
    "commandDescription": "DC+ (Direct Conversion command) + JPY3500 + / + target currency USD",
    "terminalOutput": "DC+JPY3500/USD\n3500 JPY = 22.45 USD\nRATE APPLIED 1 USD = 155.90 JPY\n*",
    "topic": "System Utilities"
  },
  {
    "id": "std_galileo_currency",
    "title": "Galileo Currency Exchange",
    "gds": "galileo",
    "keywords": "currency, exchange, convert currency, conversion",
    "expectedCommand": "FZSJPY35000USD",
    "commandDescription": "FZS (Fare Zero Segment Currency Converter) + source currency with amount (JPY35000) + target currency (USD)",
    "terminalOutput": "FZSJPY35000USD\n35000 JPY = 224.50 USD\n1.00 USD = 155.90 JPY\n>",
    "topic": "System Utilities"
  },
  {
    "id": "std_amadeus_time",
    "title": "Amadeus Determine Local Time",
    "gds": "amadeus",
    "keywords": "local time, determine time, check time, timezone, HNL",
    "expectedCommand": "DDHNL",
    "commandDescription": "DD (Display Date-Time) + Airport Code HNL",
    "terminalOutput": "DDHNL\nDATE: 29MAY26 FRIDAY\nHONOLULU CO TIME: 0025\n>",
    "topic": "System Utilities"
  },
  {
    "id": "std_sabre_time",
    "title": "Sabre Determine Local Time",
    "gds": "sabre",
    "keywords": "local time, determine time, check time, timezone, HNL",
    "expectedCommand": "T*HNL",
    "commandDescription": "T* (Time Display) + HNL city",
    "terminalOutput": "T*HNL\nHONOLULU HAWAII TIME: 0025\n*",
    "topic": "System Utilities"
  },
  {
    "id": "std_galileo_time",
    "title": "Galileo Determine Local Time",
    "gds": "galileo",
    "keywords": "local time, determine time, check time, timezone, HNL",
    "expectedCommand": "3LTHNL",
    "commandDescription": "3LT (Time Display command) + City HNL",
    "terminalOutput": "3LTHNL\nHONOLULU CURRENT TIME: 0025\n>",
    "topic": "System Utilities"
  },
  {
    "id": "std_amadeus_record_locator",
    "title": "Amadeus Airline Record Locator Display",
    "gds": "amadeus",
    "keywords": "airline location, vendor locator, record locator, rl, display locator, display airline local, ticket number, ticket no, tkt designator, ticket receipt, tkt no, check ticket, check a ticket, check a ticket number",
    "expectedCommand": "RL",
    "commandDescription": "RL (Record Location) displays the airline/vendor record locators for the carrier segment bookings in the active itinerary.",
    "terminalOutput": "RL\nRP/XXXXXXXXX/XXXXXXXXX TN/SU 19FEB25/0747Z 4RSZLV\nBA/4RSZLV TK/UD52QT (example)\n>",
    "topic": "System Utilities"
  }
];

function readModelMemory(): any[] {
  try {
    if (fs.existsSync(MODEL_MEMORY_FILE)) {
      const data = fs.readFileSync(MODEL_MEMORY_FILE, "utf-8");
      return JSON.parse(data);
    } else {
      // Auto seed
      fs.writeFileSync(MODEL_MEMORY_FILE, JSON.stringify(SEED_MODEL_MEMORY, null, 2), "utf-8");
      return SEED_MODEL_MEMORY;
    }
  } catch (error) {
    console.error("Error reading GDS model grounding memory:", error);
    return SEED_MODEL_MEMORY;
  }
}

function writeModelMemory(memoryList: any[]): void {
  try {
    fs.writeFileSync(MODEL_MEMORY_FILE, JSON.stringify(memoryList, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing GDS model grounding memory:", error);
  }
}

function findMemoryMatch(gdsSystem: string, userPrompt: string): any {
  try {
    const list = readModelMemory();
    const rawClean = userPrompt.trim();
    const promptLower = rawClean.toLowerCase();
    // Strip leading prompt characters if user typed with a terminal prompt prefix
    const strippedPromptLower = promptLower.replace(/^[>*#?!/]+\s*/, "").trim();
    const promptNoSpace = promptLower.replace(/\s+/g, "");
    const strippedNoSpace = strippedPromptLower.replace(/\s+/g, "");
    const gdsCode = gdsSystem.toLowerCase().trim();
    
    // PRIORITY 1: Exact command match or placeholder match or stripped match
    for (const rule of list) {
      if (rule.gds.toLowerCase() !== gdsCode) continue;
      if (!rule.expectedCommand) continue;
      
      const expectedLower = rule.expectedCommand.toLowerCase().trim();
      const expectedNoSpace = expectedLower.replace(/\s+/g, "");
      
      if (
        expectedLower === promptLower || 
        expectedLower === strippedPromptLower || 
        expectedNoSpace === promptNoSpace || 
        expectedNoSpace === strippedNoSpace
      ) {
        return rule;
      }
      
      const placeholderRegex = /\{FREE\s+TEXT\}|\{FREE_TEXT\}|\{TEXT\}|\[FREE\s+TEXT\]|\[FREE_TEXT\]|\*/gi;
      if (placeholderRegex.test(expectedLower)) {
        const segments = expectedLower.split(placeholderRegex);
        const escapedSegments = segments.map((seg: string) => seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regexStr = "^" + escapedSegments.join("(.*)") + "$";
        const regex = new RegExp(regexStr);
        const match = promptLower.match(regex) || strippedPromptLower.match(regex);
        if (match) {
          const capturedText = match.slice(1).join(" ").trim().toUpperCase();
          // Create dynamic copy of rule with placeholders replaced
          const ruleCopy = JSON.parse(JSON.stringify(rule));
          const phRegex = /\{FREE\s+TEXT\}|\{FREE_TEXT\}|\{TEXT\}|\[FREE\s+TEXT\]|\[FREE_TEXT\]/gi;
          ruleCopy.expectedCommand = ruleCopy.expectedCommand.replace(phRegex, capturedText);
          ruleCopy.commandDescription = ruleCopy.commandDescription.replace(phRegex, capturedText);
          ruleCopy.terminalOutput = ruleCopy.terminalOutput.replace(phRegex, capturedText);
          if (ruleCopy.pnrLineTemplate) {
            ruleCopy.pnrLineTemplate = ruleCopy.pnrLineTemplate.replace(phRegex, capturedText);
          }
          return ruleCopy;
        }

        // Prefix match fallback (e.g., if expected is "SI {FREE TEXT}" and input starts with "SI")
        if (segments[0] && segments[0].trim().length > 1) {
          const prefixNoSpace = segments[0].replace(/\s+/g, "");
          if (promptNoSpace.startsWith(prefixNoSpace) || strippedNoSpace.startsWith(prefixNoSpace)) {
            const rawPrefixLen = segments[0].length;
            const capturedText = rawClean.substring(rawPrefixLen).trim().toUpperCase();
            const ruleCopy = JSON.parse(JSON.stringify(rule));
            const phRegex = /\{FREE\s+TEXT\}|\{FREE_TEXT\}|\{TEXT\}|\[FREE\s+TEXT\]|\[FREE_TEXT\]/gi;
            ruleCopy.expectedCommand = ruleCopy.expectedCommand.replace(phRegex, capturedText);
            ruleCopy.commandDescription = ruleCopy.commandDescription.replace(phRegex, capturedText);
            ruleCopy.terminalOutput = ruleCopy.terminalOutput.replace(phRegex, capturedText);
            if (ruleCopy.pnrLineTemplate) {
              ruleCopy.pnrLineTemplate = ruleCopy.pnrLineTemplate.replace(phRegex, capturedText);
            }
            return ruleCopy;
          }
        }
      }
    }
    
    // PRIORITY 2: Keyword matches (for natural language / Ask queries)
    for (const rule of list) {
      if (rule.gds.toLowerCase() === gdsCode) {
        const keywords = (rule.keywords || "")
          .split(",")
          .map((k: string) => k.trim().toLowerCase())
          .filter(Boolean);
          
        for (const kw of keywords) {
          if (promptLower.includes(kw) || strippedPromptLower.includes(kw)) {
            const ruleCopy = JSON.parse(JSON.stringify(rule));
            
            // Try to extract free text from user prompt after the keyword
            let capturedText = "";
            const kwIdx = promptLower.indexOf(kw);
            if (kwIdx !== -1) {
              const afterKw = userPrompt.substring(kwIdx + kw.length).trim();
              if (afterKw) {
                let cleanAfter = afterKw.replace(/^(for|of|with|as|to|is|a|an|the)\s+/gi, "").trim();
                if (cleanAfter) {
                  capturedText = cleanAfter.toUpperCase();
                }
              }
            }
            if (!capturedText) {
              capturedText = kw.toUpperCase();
            }
            
            const phRegex = /\{FREE\s+TEXT\}|\{FREE_TEXT\}|\{TEXT\}|\[FREE\s+TEXT\]|\[FREE_TEXT\]/gi;
            ruleCopy.expectedCommand = ruleCopy.expectedCommand.replace(phRegex, capturedText);
            ruleCopy.commandDescription = ruleCopy.commandDescription.replace(phRegex, capturedText);
            ruleCopy.terminalOutput = ruleCopy.terminalOutput.replace(phRegex, capturedText);
            if (ruleCopy.pnrLineTemplate) {
              ruleCopy.pnrLineTemplate = ruleCopy.pnrLineTemplate.replace(phRegex, capturedText);
            }
            return ruleCopy;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error matching grounding model memory:", err);
  }
  return null;
}
// =========================================================================

function getRetrievePnrStep(
  gds: string,
  locator?: string,
  origin?: string,
  destination?: string,
  date?: string,
  cabin?: string,
  seats?: number,
  lastname?: string,
  firstname?: string,
  title?: string
): any {
  const loc = (locator && locator !== "undefined") ? locator : "4RSZLV";
  const org = (origin && origin !== "undefined") ? origin : "LHR";
  const dest = (destination && destination !== "undefined") ? destination : "JFK";
  const d = (date && date !== "undefined") ? date : "15OCT";
  const cab = (cabin && cabin !== "undefined") ? cabin : "Y";
  const sts = seats || 1;
  const ln = (lastname && lastname !== "undefined") ? lastname : "SMITH";
  const fn = (firstname && firstname !== "undefined") ? firstname : "ANNA";
  const t = (title && title !== "undefined") ? title : "MS";

  if (gds === "amadeus") {
    return {
      command: `RT${loc}`,
      commandDescription: "RT (Retrieve Transaction) followed by the 6-character PNR record locator.",
      terminalOutput: `RT${loc}\nRP/LONBA2460/LONBA2460            27MAY26/1330Z   ${loc}\n 1.${ln}/${fn} ${t}\n 2  BA 115 ${cab} ${d} ${org}${dest} HK${sts}   0835 1130\n 3  AP ${org} 020 8999 1234\n 4  TK OK ${d}/LON-BA\nPNR LOCATOR - ${loc}\n>`
    };
  } else if (gds === "galileo") {
    return {
      command: `*${loc}`,
      commandDescription: "* (Display/Retrieve command) followed directly by the 6-character Galileo booking locator.",
      terminalOutput: `*${loc}\n${loc}/1D LON   SYSTEM GDS   27MAY26 13:30Z\n1.1${ln}/${fn} ${t}\n 1. BA 115 ${cab} ${d} ${org}${dest}*HS${sts}  0830 1130\n 2. P.${org}*02089991234\nRECORD LOCATOR - ${loc}\n>`
    };
  } else { // sabre
    return {
      command: `*${loc}`,
      commandDescription: "* (Display/Retrieve command) followed directly by the 6-character Sabre record locator.",
      terminalOutput: `*${loc}\nSABRE DISPLAY RECORD RE-DISPLAY COMPLETE\nSABRE LOCATOR - ${loc}\n1.1 ${ln}/${fn} ${t}\n1 BA 115${cab} ${d} ${org}${dest} SS${sts}  0830 1130\n9. 020-8999-1234-A\n7. T-A${d}26\n*`
    };
  }
}

function parseBookingDetails(prompt: string) {
  const promptLower = prompt.toLowerCase().trim();

  // Define persistent 3-letter common English words to ignore when guessing airport codes
  const ignoredThreeLetterWords = new Set([
    "how", "and", "for", "the", "any", "not", "out", "new", "all", "one", "two", "via", "get", "add", "pnr", "gds", "way", 
    "fly", "day", "fee", "tax", "car", "bus", "bag", "air", "can", "you", "are", "who", "why", "let", "run", "see", "try", 
    "use", "has", "had", "our", "him", "his", "her", "she", "man", "boy", "yes", "com", "net", "org", "int", "web", "app", 
    "row", "pkg", "ssr", "tkt", "tkx", "cov", "ptc", "inf", "chd", "src", "api", "cop", "ask", "say", "but", "off", "fun",
    "its", "now", "big", "bad", "map", "cat", "dog", "fit", "run", "pay", "set", "tip", "key", "tab", "did"
  ]);

  // 1. Resolve cities/airports
  const cityMappings: { [key: string]: string } = {
    "london": "LON",
    "london heathrow": "LHR",
    "heathrow": "LHR",
    "london gatwick": "LGW",
    "gatwick": "LGW",
    "amsterdam": "AMS",
    "amsterdam schiphol": "AMS",
    "schiphol": "AMS",
    "ams": "AMS",
    "lhr": "LHR",
    "lgw": "LGW",
    "new york": "JFK",
    "jfk": "JFK",
    "ewr": "EWR",
    "lga": "LGA",
    "bangkok": "BKK",
    "bkk": "BKK",
    "paris": "CDG",
    "cdg": "CDG",
    "ory": "ORY",
    "tokyo": "NRT",
    "nrt": "NRT",
    "hnd": "HND",
    "sydney": "SYD",
    "syd": "SYD",
    "singapore": "SIN",
    "sin": "SIN",
    "dubai": "DXB",
    "dxb": "DXB",
    "honolulu": "HNL",
    "hnl": "HNL",
    "los angeles": "LAX",
    "lax": "LAX",
    "chicago": "ORD",
    "ord": "ORD",
    "miami": "MIA",
    "mia": "MIA",
    "barcelona": "BCN",
    "bcn": "BCN",
    "madrid": "MAD",
    "mad": "MAD",
    "rome": "FCO",
    "fco": "FCO",
    "frankfurt": "FRA",
    "fra": "FRA"
  };

  let origin = "LON";
  let destination = "JFK";

  interface RawMatch {
    code: string;
    start: number;
    end: number;
    matchText: string;
  }

  const allMatches: RawMatch[] = [];

  // Match mapped words
  const sortedMappings = Object.keys(cityMappings).sort((a, b) => b.length - a.length);
  for (const key of sortedMappings) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    let match;
    while ((match = regex.exec(promptLower)) !== null) {
      allMatches.push({
        code: cityMappings[key],
        start: match.index,
        end: match.index + key.length,
        matchText: key
      });
    }
  }

  // Next, identify any standalone three letter or six letter codes (IATA) that were not already covered
  const promptWords = promptLower.split(/[^a-z]+/);
  let searchWordIdx = 0;
  for (const w of promptWords) {
    if (!w) continue;
    let idx = promptLower.indexOf(w, searchWordIdx);
    if (idx !== -1) {
      searchWordIdx = idx + w.length;
      if (w.length === 3 && !ignoredThreeLetterWords.has(w)) {
        allMatches.push({
          code: w.toUpperCase(),
          start: idx,
          end: idx + w.length,
          matchText: w
        });
      } else if (w.length === 6) {
        const code1 = w.substring(0, 3);
        const code2 = w.substring(3, 6);
        if (!ignoredThreeLetterWords.has(code1) && !ignoredThreeLetterWords.has(code2)) {
          allMatches.push({
            code: code1.toUpperCase(),
            start: idx,
            end: idx + 3,
            matchText: code1
          });
          allMatches.push({
            code: code2.toUpperCase(),
            start: idx + 3,
            end: idx + 6,
            matchText: code2
          });
        }
      }
    }
  }

  // Resolve overlaps prioritising longer keyword matches first
  const sortedMatchesByLength = allMatches.sort((a, b) => b.matchText.length - a.matchText.length);
  const acceptedMatches: RawMatch[] = [];
  
  for (const m of sortedMatchesByLength) {
    const overlaps = acceptedMatches.some(a => 
      (m.start >= a.start && m.start < a.end) || 
      (m.end > a.start && m.end <= a.end) || 
      (m.start <= a.start && m.end >= a.end)
    );
    if (!overlaps) {
      acceptedMatches.push(m);
    }
  }

  // Sort accepted matches back to natural order of occurrence
  acceptedMatches.sort((a, b) => a.start - b.start);

  if (acceptedMatches.length >= 2) {
    let fromMatch: RawMatch | null = null;
    let toMatch: RawMatch | null = null;

    for (const m of acceptedMatches) {
      const textBefore = promptLower.substring(0, m.start).trim();
      const lastWords = textBefore.split(/\s+/).slice(-3);
      if (lastWords.includes("from")) {
        fromMatch = m;
      } else if (lastWords.includes("to")) {
        toMatch = m;
      }
    }

    if (fromMatch && toMatch && fromMatch.code !== toMatch.code) {
      origin = fromMatch.code;
      destination = toMatch.code;
    } else {
      origin = acceptedMatches[0].code;
      destination = acceptedMatches[1].code;
    }
  } else if (acceptedMatches.length === 1) {
    origin = acceptedMatches[0].code;
    destination = origin === "LON" ? "JFK" : "LON";
  }

  if (origin === destination) {
    destination = origin === "LON" ? "BKK" : "LON";
  }

  // 2. Parse dates
  const monthsMap: { [key: string]: string } = {
    january: "JAN", feb: "FEB", february: "FEB", mar: "MAR", march: "MAR",
    apr: "APR", april: "APR", may: "MAY", jun: "JUN", june: "JUN",
    jul: "JUL", july: "JUL", aug: "AUG", august: "AUG", sep: "SEP",
    september: "SEP", oct: "OCT", october: "OCT", nov: "NOV", november: "NOV",
    dec: "DEC", december: "DEC", jan: "JAN"
  };

  const monthRegexPart = "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)";
  const datesFound: string[] = [];

  function formatGdsDate(dayStr: string, monthStr: string): string {
    const d = parseInt(dayStr, 10);
    const m = monthsMap[monthStr.toLowerCase()];
    if (!m) return "";
    return `${d}${m}`;
  }

  const regex1 = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthRegexPart}\\b`, "gi");
  let match;
  while ((match = regex1.exec(promptLower)) !== null) {
    const formatted = formatGdsDate(match[1], match[2]);
    if (formatted) datesFound.push(formatted);
  }

  const regex2 = new RegExp(`\\b${monthRegexPart}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "gi");
  while ((match = regex2.exec(promptLower)) !== null) {
    const formatted = formatGdsDate(match[2], match[1]);
    if (formatted) datesFound.push(formatted);
  }

  const regex3 = new RegExp(`\\b(\\d{1,2})${monthRegexPart}\\b`, "gi");
  while ((match = regex3.exec(promptLower)) !== null) {
    const formatted = formatGdsDate(match[1], match[2]);
    if (formatted) datesFound.push(formatted);
  }

  const uniqueDates = Array.from(new Set(datesFound));

  let outboundDate = "2DEC"; // default high-fidelity matching
  let inboundDate = "19OCT";

  if (uniqueDates.length >= 2) {
    outboundDate = uniqueDates[0];
    inboundDate = uniqueDates[1];
  } else if (uniqueDates.length === 1) {
    outboundDate = uniqueDates[0];
    inboundDate = outboundDate === "19OCT" ? "2DEC" : "19OCT";
  }

  return {
    origin,
    destination,
    outboundDate,
    inboundDate
  };
}

function getCreatePnrSteps(promptText: string) {
  const { origin, destination, outboundDate, inboundDate } = parseBookingDetails(promptText);
  const loc = Math.random().toString(36).substring(2, 8).toUpperCase();

  return [
    {
      command: "NM1SMITH/ANNA MRS",
      commandDescription: "Adds a traveler name to the reservation. Format is NM1 [LastName]/[FirstName] [Title].",
      terminalOutput: "NM1SMITH/ANNA MRS\n 1 SMITH/ANNA MRS\n>",
      isHighlighted: true
    },
    {
      command: `AN${outboundDate}${origin}${destination}`,
      commandDescription: `Neutral Availability request for flights from ${origin} to ${destination} on ${outboundDate}.`,
      terminalOutput: `AN${outboundDate}${origin}${destination}\n** AMADEUS AVAILABILITY - AN ** ${origin} / ${destination}  ${outboundDate}\n 1   BA 115  Y2 C4 M4  0835   1130  777 0/E\n>`,
      isHighlighted: true
    },
    {
      command: "SS1Y1",
      commandDescription: "IT WILL HOLD 2 SEATS IN Y CLASS ON THIS FLIGHT SS1Y1.",
      terminalOutput: `SS1Y1\n 1  BA 115 Y ${outboundDate} ${origin}${destination} HK2   0835 1130   *EF*\n>`,
      isHighlighted: true
    },
    {
      command: `AN${inboundDate}${destination}${origin}`,
      commandDescription: `Neutral Availability request for return flights from ${destination} to ${origin} on ${inboundDate}.`,
      terminalOutput: `AN${inboundDate}${destination}${origin}\n** AMADEUS AVAILABILITY - AN ** ${destination} / ${origin}  ${inboundDate}\n 1   BA 116  Y2 C4 M4  2000   0730+1 M88 0/E\n>`,
      isHighlighted: true
    },
    {
      command: "SS1Y1",
      commandDescription: "IT WILL HOLD 2 SEATS IN Y CLASS ON THIS FLIGHT SS1Y1.",
      terminalOutput: `SS1Y1\n 2  BA 116 Y ${inboundDate} ${destination}${origin} HK2   2000 0730+1 *EF*\n>`,
      isHighlighted: true
    },
    {
      command: "TKTL14SEP",
      commandDescription: "Specifies a ticketing time limit date to avoid booking auto-cancellation.",
      terminalOutput: "TKTL14SEP\n  TK TL 14SEP\n>",
      isHighlighted: true
    },
    {
      command: "RFUSER",
      commandDescription: "Binds the Received From reference parameter, confirming authorship.",
      terminalOutput: "RFUSER\n  RECD FROM - USER\n>",
      isHighlighted: true
    },
    {
      command: "ER",
      commandDescription: "End and Retrieve commits the entire transaction and retrieves the generated PNR record allocator code.",
      terminalOutput: `ER\nRP/LONBA2460/LONBA2460            29MAY26/1330Z   ${loc}\n 1.SMITH/ANNA MRS\n 2  BA 115 Y ${outboundDate} ${origin}${destination} HK2   0835 1130\n 3  BA 116 Y ${inboundDate} ${destination}${origin} HK2   2000 0730+1\n 4  TK TL 14SEP\n 5  AP LON 020 8999 1234\nPNR LOCATOR - ${loc}\n>`,
      isHighlighted: true
    }
  ];
}

function generateGdsFallbackResponse(gdsRaw: string, promptRaw: string): any {
  const gds = gdsRaw.toLowerCase();
  const prompt = promptRaw.toLowerCase();
  const gdsFormatted = gdsRaw.charAt(0).toUpperCase() + gdsRaw.slice(1);

  // Use optimal unified parsing engine for absolute correctness
  const parsed = parseBookingDetails(promptRaw);
  const origin = parsed.origin;
  const destination = parsed.destination;
  const date = parsed.outboundDate || "15OCT";

  // Parse potential seat count
  let seats = 1;
  const seatMatch = prompt.match(/\b(\d+)\s*(seat|passenger|pax|ticket|place)/i);
  if (seatMatch && seatMatch[1]) {
    seats = parseInt(seatMatch[1], 10);
  }

  // Parse class
  let cabin = "Y";
  if (prompt.includes("business") || prompt.includes("club")) {
    cabin = "C";
  } else if (prompt.includes("first")) {
    cabin = "F";
  } else if (prompt.includes("premium")) {
    cabin = "W";
  }

  // Parse passenger names
  let lastname = "SMITH";
  let firstname = "ANNA";
  let title = "MS";
  const nameMatch = prompt.match(/name\s+(is\s+)?([a-zA-Z]+)\/([a-zA-Z]+)/i);
  if (nameMatch) {
    lastname = nameMatch[2].toUpperCase();
    firstname = nameMatch[3].toUpperCase();
  }

  // Random reference key
  const locator = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Scenario 0.0: Create PNR / Book Flight (Amadeus)
  const hasBookingKeywords = prompt.includes("book") || 
                             prompt.includes("create a pnr") || 
                             prompt.includes("create pnr") || 
                             prompt.includes("how to create a pnr") || 
                             prompt.includes("how do i create a pnr") || 
                             prompt.includes("reserve") || 
                             prompt.includes("itinerary") ||
                             prompt.includes("booking");

  const hasFlightAndLocations = (prompt.includes("flight") || prompt.includes("travel") || prompt.includes("go") || prompt.includes("fly")) && 
                                (prompt.includes("from") || prompt.includes("to") || prompt.includes("return"));

  const isCreatePnrQuery = gds === "amadeus" && (hasBookingKeywords || hasFlightAndLocations);

  if (isCreatePnrQuery) {
    const steps = getCreatePnrSteps(prompt);
    return {
      gds_name: "Amadeus",
      explanation: "To build a complete Passenger Name Record (PNR) or flight booking in Amadeus, follow these standard commands step-by-step to register your traveler name, search outbound and inbound flights, sell the desired seat cabins, specify a critical ticketing deadline, declare your received-from signature, and commit the final transaction.",
      steps
    };
  }

  const isFrequentFlyerQuery = gds === "amadeus" && (
    prompt.includes("frequent flyer") ||
    prompt.includes("fqtv") ||
    prompt.includes("frequentflyer") ||
    prompt.includes("ff number") ||
    prompt.includes("ff id") ||
    prompt.includes("ff code") ||
    prompt === "add ff" ||
    prompt.includes("add frequent flyer")
  );

  if (isFrequentFlyerQuery) {
    const carrier = "AY";
    const targetCommand = `SR FQTV ${carrier} -${carrier}611879925/P1`;
    return {
      gds_name: "Amadeus",
      explanation: `To add a frequent flyer number in Amadeus GDS, use the command format: SR FQTV <Airline> -<Account>/P<PassengerNum>. This is added to the open PNR on a new line.`,
      steps: [
        {
          command: "RT[LOCATOR]",
          commandDescription: "Retrieve the active passenger record to view the current segments.",
          terminalOutput: `RT[LOCATOR]\nRP/LONBA2460/LONBA2460            29MAY26/1330Z   [LOCATOR]\n 1.SMITH/ANNA MS\n 2  ${carrier} 115 Y 15OCT LHRJFK HK1   0835 1130\n 3  AP LHR 020 8999 1234\n 4  TK OK 15OCT/LON-${carrier}\nPNR LOCATOR - [LOCATOR]\n>`,
          isHighlighted: false
        },
        {
          command: targetCommand,
          commandDescription: `Register traveler's frequent flyer number for passenger 1 linked with active ${carrier} segment.`,
          terminalOutput: `${targetCommand}\nRP/LONBA2460/LONBA2460            29MAY26/1330Z   [LOCATOR]\n 1.SMITH/ANNA MS\n 2  ${carrier} 115 Y 15OCT LHRJFK HK1   0835 1130\n 3  AP LHR 020 8999 1234\n 4  TK OK 15OCT/LON-${carrier}\n 5  SSR FQTV ${carrier} HK/ ${carrier}611879925/P1\nPNR LOCATOR - [LOCATOR]\n>`,
          isHighlighted: true
        }
      ]
    };
  }

  // Scenario 0.1: Hotels
  if (
    prompt.includes("hotel") || 
    prompt.includes("hoa") || 
    prompt.includes("hot") || 
    prompt.includes("hasan") || 
    prompt.includes("room") || 
    prompt.includes("lodging")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] In Amadeus, hotel availability is initiated with the 'HA' command. Example: 'HASAN6FEB-9FEB/RT-2' checks San Diego hotel rates for 2 adults.`,
        steps: [
          {
            command: "HASAN6FEB-9FEB/RT-2",
            commandDescription: "HA (Hotel Availability) + SAN (San Diego city code) + Date range + /RT-2 (Rate code for 2 adults)",
            terminalOutput: "HASAN6FEB-9FEB/RT-2\n** AMADEUS HOTEL AVAILABILITY - HA ** SAN DIEGO, CA\n 1  MARRIOTT GASLAMP SAN  SGL/DBL  USD 185.00  REQS OK\n 2  HILTON SANDIEGO BAY   SGL/DBL  USD 210.00  REQS OK\n>"
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Travelport Galileo uses the 'HOA' command for hotel search based on dates and guests.`,
        steps: [
          {
            command: "HOA6FEB-09FEBSAN2",
            commandDescription: "HOA (Hotel Availability) + check-in + check-out + city + number of guests",
            terminalOutput: "HOA6FEB-09FEBSAN2\n* TRAVELPORT GALILEO HOTEL INDEX - SAN DIEGO 06FEB-09FEB *\n01 MARRIOTT GASLAMP SGL  USD185.00  B-Y\n02 HILTON BAYFRONT  SGL  USD210.00  B-Y\n>"
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Sabre initiates hotel search with the 'HOT' command, designating date duration and guest quantity.`,
        steps: [
          {
            command: "HOTSAN/6FEB-3NT2",
            commandDescription: "HOT + City Code + / + Check-in date + Number of Nights + Number of guests",
            terminalOutput: "HOTSAN/6FEB-3NT2\nSABRE HOTEL DIRECTORY - SAN SAN DIEGO 06FEB-09FEB 2 Adults\n 1 MARRIOTT SAN GASLAMP  SGLD  USD 185.00 NT\n 2 HILTON SAN BAYFRONT    SGLD  USD 210.00 NT\n*"
          }
        ]
      };
    }
  }

  // Scenario 0.2: Cars
  if (
    prompt.includes("car ") || 
    prompt.includes("car\n") || 
    prompt.includes("rent") || 
    prompt.includes("hire") || 
    prompt.includes("caden") || 
    prompt.includes("cal/") || 
    prompt.includes("cfden") ||
    prompt.includes("vehicle")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] Amadeus uses the 'CA' (Car Availability) command to display rental rates for standard companies.`,
        steps: [
          {
            command: "CADEN23AUG-25AUG/ARR-9A-9P",
            commandDescription: "CA (Car Availability) + Airport City + Dates + Arrival/Departure hours",
            terminalOutput: "CADEN23AUG-25AUG/ARR-9A-9P\n** AMADEUS CAR AVAILABILITY - CAR ** DEN DENVER\n 1  ZE ECAR COLD DEN0900/0900  USD 45.00 DAY\n 2  ZI CCAR COLD DEN0900/0900  USD 49.00 DAY\n>"
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Travelport Galileo requests rental car availability using the 'CAL/' prefix and airport identifier.`,
        steps: [
          {
            command: "CAL/DT-1500",
            commandDescription: "CAL + / + Departure point city code + rent time",
            terminalOutput: "CAL/DT-1500\n* TRAVELPORT GALILEO CAR AVAILABILITY - DEPART DT (DEN) *\n 1 ZI ECAR USD45.00 DY - CONTRACT RATES SECURED\n 2 ZE CCAR USD49.00 DY - CONTRACT RATES SECURED\n>"
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Sabre car rental lookup commands start with the 'CF' prefix followed by location, dates, and times.`,
        steps: [
          {
            command: "CFDEN/23AUG-25AUG/1P-6P",
            commandDescription: "CF (Car Availability) + City + Dates + Times",
            terminalOutput: "CFDEN/23AUG-25AUG/1P-6P\nSABRE CAR DIRECTORY - DEN DENVER 23AUG-25AUG\n 1 HERTZ ECAR DAILY USD 45.00 UNL\n 2 AVIS  CCAR DAILY USD 49.00 UNL\n*"
          }
        ]
      };
    }
  }

  // Scenario 0.3: Encode name
  if (
    prompt.includes("encode") || 
    prompt.includes("city name") || 
    prompt.includes("peoria") || 
    prompt.includes("japan") || 
    prompt.includes("danpeoria") || 
    prompt.includes(".ce ") || 
    prompt.includes("w/-cc")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] In Amadeus, city name encoding is executed with 'DAN' followed by the city name. Example: 'DANPEORIA' yields airport code PIA.`,
        steps: [
          {
            command: "DANPEORIA",
            commandDescription: "DAN (Encode City Name) + City Name PEORIA",
            terminalOutput: "DANPEORIA\nPEORIA ILL, USA           PIA\n>"
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Travelport Galileo city encoding is declared with the dot command '.CE' and city name.`,
        steps: [
          {
            command: ".CE PEORIA",
            commandDescription: ".CE (Encode City Name) + PEORIA",
            terminalOutput: ".CE PEORIA\nPEORIA ILLINOIS           PIA\n>"
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Sabre encodes city names using the 'W/-CC' workstation command.`,
        steps: [
          {
            command: "W/-CCPEORIA",
            commandDescription: "W/ (Workstation unit) + -CC (Encode City) + city name",
            terminalOutput: "W/-CCPEORIA\nPEORIA ILLINOIS           PIA\n*"
          }
        ]
      };
    }
  }

  // Scenario 0.4: Decode code
  if (
    prompt.includes("decode") || 
    prompt.includes("dacpia") || 
    prompt.includes(".cd ") || 
    prompt.includes("w/*") || 
    prompt.includes("iata code")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] Decode airport codes in Amadeus using 'DAC' followed by the IATA code.`,
        steps: [
          {
            command: "DACPIA",
            commandDescription: "DAC (Decode Airport Code) + Code PIA",
            terminalOutput: "DACPIA\nPIA   PEORIA ILLINOIS USA - GREATER PEORIA REGIONAL\n>"
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Galileo airport code decodes are made via '.CD' followed by the 3-letter city code.`,
        steps: [
          {
            command: ".CD NYC",
            commandDescription: ".CD (Decode City Code) + NYC",
            terminalOutput: ".CD NYC\nNYC   NEW YORK  NY  USA - ALL METROPOLITAN AIRPORTS\n>"
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Sabre decodes agency codes and airport indicators starting with workstation display command 'W/*' or 'W/CR*'.`,
        steps: [
          {
            command: "W/*PIA",
            commandDescription: "W/ (Workstation command) + * + target IATA Code",
            terminalOutput: "W/*PIA\nPIA   PEORIA ILLINOIS USA - GREATER PEORIA REGIONAL\n*"
          }
        ]
      };
    }
  }

  // Scenario 0.5: Local Time & Currency Converter
  if (
    prompt.includes("time") || 
    prompt.includes("currency") || 
    prompt.includes("convert") || 
    prompt.includes("exchange") || 
    prompt.includes("timezone") || 
    prompt.includes("fqc") || 
    prompt.includes("fzs") ||
    prompt.includes("dc+")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] Amadeus local times are queried with 'DD' + city. Currency conversions are made with 'FQC'.`,
        steps: [
          {
            command: "DDHNL",
            commandDescription: "DD (Display Date-Time) + Airport Code HNL",
            terminalOutput: "DDHNL\nDATE: 29MAY26 FRIDAY\nHONOLULU CO TIME: 0025\n>"
          },
          {
            command: "FQC35000JPY/USD/B",
            commandDescription: "FQC (Fare Quote Conversion) + amount and currency (35000JPY) + target (USD) + Bank sell rate (/B)",
            terminalOutput: "FQC35000JPY/USD/B\n35000 JPY = 224.50 USD\nBANK SELL RATE - EXCHANGE APPLIED\n>"
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Travelport Galileo timezone/local times are retrieved with '3LT' + city. Currency uses 'FZS'.`,
        steps: [
          {
            command: "3LTHNL",
            commandDescription: "3LT (Time Display) + City HNL",
            terminalOutput: "3LTHNL\nHONOLULU CURRENT TIME: 0025\n>"
          },
          {
            command: "FZSJPY35000USD",
            commandDescription: "FZS (Fare Zero Segment Currency Converter) + JPY34000 amount + target currency USD",
            terminalOutput: "FZSJPY35000USD\n35000 JPY = 224.50 USD\n1.00 USD = 155.90 JPY\n>"
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Sabre local times use 'T*' + city indicator. Currency conversions are driven by 'DC+' command.`,
        steps: [
          {
            command: "T*HNL",
            commandDescription: "T* (Time Display) + HNL city multiplier",
            terminalOutput: "T*HNL\nHONOLULU HAWAII TIME: 0025\n*"
          },
          {
            command: "DC+JPY3500/USD",
            commandDescription: "DC+ (Direct Conversion command) + JPY3500 amount + target currency USD",
            terminalOutput: "DC+JPY3500/USD\n3500 JPY = 22.45 USD\nRATE APPLIED 1 USD = 155.90 JPY\n*"
          }
        ]
      };
    }
  }

  // Scenario 1: Availability
  if (
    prompt.includes("avail") || 
    prompt.includes("flight") || 
    prompt.includes("schedule") || 
    prompt.includes("timetable") || 
    prompt.includes("find") || 
    prompt.includes("show") ||
    prompt.includes("check")
  ) {
    if (gds === "amadeus") {
      const cmd = `AN${date}${origin}${destination}`;
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] To check flight availability in Amadeus, use the 'AN' (Availability Neutral) command, followed by date, origin, and destination code.`,
        steps: [
          {
            command: cmd,
            commandDescription: `AN (Availability Neutral) + ${date} (Date of outbound travel) + ${origin} (Origin IATA) + ${destination} (Destination IATA)`,
            terminalOutput: `${cmd}\n** AMADEUS AVAILABILITY - AN ** ${origin} LONDON / ${destination} NEW YORK  ${date}26\n 1   BA 115  F9 A9 J9 C9 W9 Y9 B9 H4 /${origin} 0835   ${destination} 1130  777 L 0/E\n 2   VS  005  J9 C9 I9 W9 S9 Y9 B9 L5 /${origin} 1230   ${destination} 1545  350 L 0/E\n 3   LH 402  C9 D9 I9 Y9 B9 M9 Q9 /${origin} 1005   ${destination} 1255  74H D 0/E\n 4   AA  143  F4 A2 J9 C9 D9 Y9 B9 H9 /${origin} 1445   ${destination} 1810  777 D 0\n>`
          }
        ]
      };
    } else if (gds === "galileo") {
      const cmd = `A${date}${origin}${destination}`;
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Galileo queries standard neutral timelines using the 'A' (Availability) key with date and origin/destination coordinates.`,
        steps: [
          {
            command: cmd,
            commandDescription: `A (Availability) + ${date} (Departure date) + ${origin} (Departure base) + ${destination} (Arrival base)`,
            terminalOutput: `${cmd}\n${origin}-${destination} ${date}2026      ** TRAVELPORT GALILEO DIRECT SATELLITE **\n 1   BA 115  F9 A9 C9 D9 I9 Y9 B9 M9  0830 ${origin} 1130 ${destination} 777 0*E\n 2   VS  05  J9 C9 I9 W9 Y9 B9 H9 L9  1230 ${origin} 1545 ${destination} 350 0*E\n 3   AA 143  C7 D5 I2 Y9 B9 H9 K9 M9  1445 ${origin} 1810 ${destination} 777 0*E\n 4   LH 402  C9 Y9 B9 M9 H9 Q9 V9 S9  1005 ${origin} 1255 ${destination} 74H 0*E\n>`
          }
        ]
      };
    } else { // sabre
      const cmd = `1${date}${origin}${destination}`;
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Sabre uses the digit '1' to prefix live flight queries. The system displays direct and connecting airline segments.`,
        steps: [
          {
            command: cmd,
            commandDescription: `1 (Air Availability query code) + ${date} (Departure date) + ${origin} + ${destination}`,
            terminalOutput: `${cmd}\n${date}26 ${origin}-${destination} C*BA/VS/AA/LH\n${origin}  CO-LOCATION                         ${destination}  TRAVELPORT INFO\n 1BA 115 F9 A9 C9 Y9 B9   ${origin}0830   ${destination}1130 777 0 /E\n 2VS  05 J9 C9 Y9 B9 M9   ${origin}1230   ${destination}1545 350 0 /E\n 3AA 143 F4 J9 Y9 B9 H9   ${origin}1445   ${destination}1810 777 0 /E\n 4LH 402 C9 D9 Y9 B9 M9   ${origin}1005   ${destination}1255 74H 0 /E\n*`
          }
        ]
      };
    }
  }

  // Scenario 2: Booking Seats
  if (
    prompt.includes("sell") || 
    prompt.includes("book") || 
    prompt.includes("reserve") || 
    prompt.includes("seat") || 
    prompt.includes("cabin") ||
    prompt.includes("add segment")
  ) {
    if (gds === "amadeus") {
      const cmd = `SS1${cabin}${seats}`;
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] Booking cabin segments on Amadeus occurs via the 'SS' prefix followed by the flight row item, seat tier, and quantity.`,
        steps: [
          {
            command: cmd,
            commandDescription: `SS (Sell Status) + 1 (Line number from availability) + ${cabin} (Class) + ${seats} (NumberOfSeats)`,
            terminalOutput: `${cmd}\n 1  BA 115 ${cabin} ${date} ${origin}${destination} HK${seats}   0835 1130   *EF*\n> `
          }
        ]
      };
    } else if (gds === "galileo") {
      const cmd = `N${seats}${cabin}1`;
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Galileo uses 'N' (Need) for active booking creation on highlighted availability segments.`,
        steps: [
          {
            command: cmd,
            commandDescription: `N (Need) + ${seats} (Seats) + ${cabin} (Class) + 1 (Line index on screen)`,
            terminalOutput: `${cmd}\n 1  BA 115 ${cabin} ${date} ${origin}${destination}*HS${seats}   0830 1130  E*\n>`
          }
        ]
      };
    } else { // sabre
      const cmd = `0${seats}${cabin}1`;
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Sabre reserves seats starting with the indicator digit '0' accompanied by class and volume.`,
        steps: [
          {
            command: cmd,
            commandDescription: `0 (Sell command) + ${seats} (Seats) + ${cabin} (Class) + 1 (Active flight line)`,
            terminalOutput: `${cmd}\n${cmd} - SEAT SOLD\n 1 BA 115${cabin} ${date} ${origin}${destination} SS${seats}   0830  1130\n*`
          }
        ]
      };
    }
  }

  // Scenario 3.5: Ticketing Deadlines & Limits (TKTL / TKXL)
  const isTicketingDeadlineQuery = gds === "amadeus" && (
    prompt.includes("tktl") ||
    prompt.includes("tkxl") ||
    prompt.includes("tkldate") ||
    prompt.includes("tktldate") ||
    prompt.includes("ticketing limit") ||
    prompt.includes("ticket limit") ||
    prompt.includes("deadline") ||
    prompt.includes("ticketing deadline") ||
    prompt.includes("ticket deadline") ||
    prompt.includes("ticketing time limit") ||
    prompt.includes("ticket time limit") ||
    prompt.includes("ticketing field") ||
    prompt.includes("ticket field") ||
    prompt.includes("add ticketing") ||
    prompt.includes("add ticket field")
  );

  if (isTicketingDeadlineQuery) {
    let targetCommand = "TKTL14SEP/1800"; // default high-fidelity target
    let targetDescription = "Adds a ticketing field specifying a ticket time limit for the active passenger reservation.";
    let terminalOutputText = "  TK TL 14SEP/1800";

    // Matching exact formats from user request
    if (prompt.includes("tkxl/1800")) {
      targetCommand = "TKXL/1800";
      targetDescription = "Sets PNR auto-cancellation to today at 18:00 in your local office ID.";
      terminalOutputText = "  TK XL /1800";
    } else if (prompt.includes("tkxl/sydab1234")) {
      targetCommand = "TKXL/SYDAB1234";
      targetDescription = "Sets PNR auto-cancellation to today in local time of Office ID SYDAB1234.";
      terminalOutputText = "  TK XL /SYDAB1234";
    } else if (prompt.includes("tkxl14sep/1800/sydab1234")) {
      targetCommand = "TKXL14SEP/1800/SYDAB1234";
      targetDescription = "Sets PNR auto-cancellation to September 14 at 18:00 in local time of Office ID SYDAB1234.";
      terminalOutputText = "  TK XL 14SEP/1800/SYDAB1234";
    } else if (prompt.includes("tkxl14sep/1800")) {
      targetCommand = "TKXL14SEP/1800";
      targetDescription = "Sets PNR auto-cancellation to September 14 at 18:00 in local office time.";
      terminalOutputText = "  TK XL 14SEP/1800";
    } else if (prompt.includes("tkxl14sep")) {
      targetCommand = "TKXL14SEP";
      targetDescription = "Sets PNR auto-cancellation to September 14 in local office time.";
      terminalOutputText = "  TK XL 14SEP";
    } else if (prompt.includes("tktl/1800")) {
      targetCommand = "TKTL/1800";
      targetDescription = "Sets ticket time limit to today at 18:00 in your local office ID.";
      terminalOutputText = "  TK TL /1800";
    } else if (prompt.includes("tktl/sydab1234")) {
      targetCommand = "TKTL/SYDAB1234";
      targetDescription = "Sets ticket time limit to today in local time of Office ID SYDAB1234.";
      terminalOutputText = "  TK TL /SYDAB1234";
    } else if (prompt.includes("tktl14sep/1800/sydab1234")) {
      targetCommand = "TKTL14SEP/1800/SYDAB1234";
      targetDescription = "Sets ticket time limit to September 14 at 18:00 in local time of Office ID SYDAB1234.";
      terminalOutputText = "  TK TL 14SEP/1800/SYDAB1234";
    } else if (prompt.includes("tktl14sep/1800")) {
      targetCommand = "TKTL14SEP/1800";
      targetDescription = "Sets ticket time limit to September 14 at 18:00 in local office time.";
      terminalOutputText = "  TK TL 14SEP/1800";
    } else if (prompt.includes("tktl14sep")) {
      targetCommand = "TKTL14SEP";
      targetDescription = "Sets ticket time limit to September 14 in local office time.";
      terminalOutputText = "  TK TL 14SEP";
    } else if (prompt.includes("tkxl")) {
      targetCommand = "TKXL/1800";
      targetDescription = "Sets PNR auto-cancellation to today at 18:00 in your local office ID.";
      terminalOutputText = "  TK XL /1800";
    } else if (prompt.includes("tktldate") || prompt.includes("tkldate")) {
      targetCommand = "TKTL03SEP";
      targetDescription = "Adds an automatic ticket time limit date, generating a random limit date such as TKTL03SEP.";
      terminalOutputText = "  TK TL 03SEP";
    }

    return {
      gds_name: "Amadeus",
      explanation: "To manage ticketing fields or ticket time limits in Amadeus GDS, you can use the following standard formats:\n\n" +
        "1. **Automatic Ticketing/Ticket Time Limit date (TKTLDATE)**\n" +
        "   - `TKTL03SEP` (Ticketing limit on explicit random date September 3).\n\n" +
        "2. **Ticket Time Limit (TKTL)**\n" +
        "   - `TKTL/1800` (Ticket time limit is today at 18:00 in local office time).\n" +
        "   - `TKTL/SYDAB1234` (Ticket time limit is today in local time of Office ID SYDAB1234).\n" +
        "   - `TKTL14SEP` (Ticket time limit is September 14 in local office time).\n" +
        "   - `TKTL14SEP/1800` (Ticket time limit is September 14 at 18:00 in local office time).\n" +
        "   - `TKTL14SEP/1800/SYDAB1234` (Ticket time limit is September 14 at 18:00 in local time of Office ID SYDAB1234).\n\n" +
        "3. **Auto-Cancellation Ticket Limit (TKXL)**\n" +
        "   - `TKXL/1800` (PNR auto-cancellation is at 18:00 today in local office ID).\n" +
        "   - `TKXL/SYDAB1234` (PNR auto-cancellation is today in local time of Office ID SYDAB1234).\n" +
        "   - `TKXL14SEP` (PNR auto-cancellation is on September 14 in local office time).\n" +
        "   - `TKXL14SEP/1800` (PNR auto-cancellation is on September 14 at 18:00 in local office time).\n" +
        "   - `TKXL14SEP/1800/SYDAB1234` (PNR auto-cancellation is on September 14 at 18:00 in local time of Office ID SYDAB1234).\n\n" +
        "Always fetch/retrieve the active booking with `RT[LOCATOR]` before applying modifications to custom PNR records.",
      steps: [
        {
          command: targetCommand,
          commandDescription: targetDescription,
          terminalOutput: `${targetCommand}\n${terminalOutputText}\n>`,
          isHighlighted: true
        },
        {
          command: "ER",
          commandDescription: "ER (End and Retrieve) saves the updated ticketing deadline, registering the revised marker inside the database.",
          terminalOutput: `ER\nRP/LONBA2460/LONBA2460            29MAY26/1330Z   [LOCATOR]\n 1.SMITH/ANNA MS\n 2  BA 115 Y 17OCT LHRJFK HK1   0835 1130\n 3  AP LON 020 8999 1234\n 4  ${terminalOutputText.trim()}/LON-BA\nPNR LOCATOR - [LOCATOR]\n>`,
          isHighlighted: true
        }
      ]
    };
  }

  // Scenario 3: Names / Passengers Contact Detail Builder
  if (
    prompt.includes("name") || 
    prompt.includes("passenger") || 
    prompt.includes("profile") || 
    prompt.includes("pnr") || 
    prompt.includes("smith") || 
    prompt.includes("contact") || 
    prompt.includes("phone") || 
    prompt.includes("save") || 
    prompt.includes("retrieve")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] A complete Passenger Name Record (PNR) in Amadeus requires Name (NM1), Contact detail (AP), Ticketing date limit (TK), and Saving/Retrieval (ER).`,
        steps: [
          {
            command: `NM1${lastname}/${firstname} ${title}`,
            commandDescription: `NM1 (Name field, one passenger) + Passenger surname/name.`,
            terminalOutput: `NM1${lastname}/${firstname} ${title}\n 1 SMITH/ANNA MS\n>`
          },
          {
            command: `AP ${origin} 020 8999 1234`,
            commandDescription: "AP (Agency/Passenger Phone contact details).",
            terminalOutput: `AP ${origin} 020 8999 1234\n  AP ${origin} 020 8999 1234 - REGISTERED OFFICE\n>`
          },
          {
            command: `TKOK${date}`,
            commandDescription: "TKOK (Ticketing OK status setup with date reference).",
            terminalOutput: `TKOK${date}\n  TK OK ${date}/LON-BA\n>`
          },
          {
            command: "ER",
            commandDescription: "ER (End and Retrieve) - Commits record context to server database producing the Booking Loc.",
            terminalOutput: `ER\nRP/LONBA2460/LONBA2460            27MAY26/1330Z   ${locator}\n 1.${lastname}/${firstname} ${title}\n 2  BA 115 ${cabin} ${date} ${origin}${destination} HK${seats}   0835 1130\n 3  AP ${origin} 020 8999 1234\n 4  TK OK ${date}/LON-BA\nPNR LOCATOR - ${locator}\n>`
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Creating booking records in Galileo uses 'N.' (Name field), 'P.' (Phone), 'T.' (Ticketing) and 'ER' (End reservation).`,
        steps: [
          {
            command: `N.${lastname}/${firstname} ${title}`,
            commandDescription: `N. (Name field indicator) + Lastname / Firstname Title.`,
            terminalOutput: `N.${lastname}/${firstname} ${title}\n1.1SMITH/ANNA MS\n>`
          },
          {
            command: `P.${origin}*02089991234`,
            commandDescription: `P. (Phone) + Station + Asterisk separator + digits.`,
            terminalOutput: `P.${origin}*02089991234\n01 ${origin}*02089991234 AGENT TERMINAL\n>`
          },
          {
            command: `T.T*${date}`,
            commandDescription: "T.T* (Ticket layout date limit setting).",
            terminalOutput: `T.T*${date}\n01 T*${date}\n>`
          },
          {
            command: "ER",
            commandDescription: "ER (End reservation confirmation and session refresh).",
            terminalOutput: `ER\n${locator}/1D LON   SYSTEM GDS   27MAY26 13:30Z\n1.1${lastname}/${firstname} ${title}\n 1. BA 115 ${cabin} ${date} ${origin}${destination}*HS${seats}  0830 1130\n 2. P.${origin}*02089991234\nRECORD LOCATOR - ${locator}\n>`
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Sabre structures files by entering name using '-' hyphen, phone using '9', ticket timing via '7' and ending the session with 'ER'.`,
        steps: [
          {
            command: `-${lastname}/${firstname} ${title}`,
            commandDescription: `Hyphen prefix (-) specifying passenger name entry.`,
            terminalOutput: `-${lastname}/${firstname} ${title}\n1.1 SMITH/ANNA MS\n*`
          },
          {
            command: "9020-8999-1234-A",
            commandDescription: "9 (Phone prefix) + customer telephone link + A (Agent signature symbol).",
            terminalOutput: "9020-8999-1234-A\n  1 /PH-020-8999-1234-A - SAVED\n*"
          },
          {
            command: `7TAW${date}/`,
            commandDescription: "7 (Ticket arrangement) + TAW (Ticketing arrangement warning limit date) and boundary.",
            terminalOutput: `7TAW${date}/\n  1 /TL-A${date}26\n*`
          },
          {
            command: "ER",
            commandDescription: "ER (End transaction and Retrieve) - Produces the authentic 6-character Sabre File Loc.",
            terminalOutput: `ER\nER RE-DISPLAY COMPLETE\nSABRE LOCATOR - ${locator}\n1.1 SMITH/ANNA MS\n1 BA 115${cabin} ${date} ${origin}${destination} SS${seats}  0830 1130\n9. 020-8999-1234-A\n7. T-A${date}26\n*`
          }
        ]
      };
    }
  }

  // Scenario 4: Special Request SSR
  if (prompt.includes("wheelchair") || prompt.includes("wchr") || prompt.includes("ssr") || prompt.includes("assist") || prompt.includes("request")) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] To add a special service request (such as a wheelchair), you first retrieve the active held booking using 'RT', then append helper command 'SR' linked to your passenger.`,
        steps: [
          getRetrievePnrStep("amadeus", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "SRWCHR/P1",
            commandDescription: "SR (Special Request) + WCHR (Wheelchair code) + Passenger 1 linkage.",
            terminalOutput: "SRWCHR/P1\n SSR WCHR BA HN1 LHRJFK/SMITH ANNA/P1 - SPECIAL REQUEST SEND SENT\n>",
            isHighlighted: true
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] In Travelport Galileo, retrieve the held traveler layout with '*' prefix first, then input the 'SI.BA*WCHR' command.`,
        steps: [
          getRetrievePnrStep("galileo", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "SI.BA*WCHR",
            commandDescription: "SI. (Special Information) + carrier BA + asterisk wheelchair code.",
            terminalOutput: "SI.BA*WCHR\n01 SSR WCHR BA NN1 LHRJFK 15OCT/SMITH ANNA MS\n>",
            isHighlighted: true
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Retrieve the existing held traveler booking with '*' first, then add the SSR wheelchair assignment on Sabre using code prefix '3'.`,
        steps: [
          getRetrievePnrStep("sabre", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "3WCHRA/1.1",
            commandDescription: "3 (SSR modifier) + WCHR code + A (All segments) + passenger 1.1 link.",
            terminalOutput: "3WCHRA/1.1\nSSR WCHR APPLIED SEG ALL PSGR 1.1\n*",
            isHighlighted: true
          }
        ]
      };
    }
  }

  // Scenario 5: Sign On / System admin
  if (prompt.includes("sign-in") || prompt.includes("login") || prompt.includes("son") || prompt.includes("credential")) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] Perform agent office validation sign-on in Amadeus using JI command credentials.`,
        steps: [
          {
            command: "JI0001SU/SU",
            commandDescription: "JI (Joint sign-on) + ID + Agent Class Code + Area Selection.",
            terminalOutput: "JI0001SU/SU\nAMADEUS SIGN-ON ACCEPTED FOR AREA A\nGOOD MORNING OFFICE LONBA2460\n>"
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Sign into Travelport Galileo workspace using the SON command with security signatures.`,
        steps: [
          {
            command: "SON/F-71EY/AG",
            commandDescription: "SON (Sign-On) + F (Force action flag) + initials and area target.",
            terminalOutput: "SON/F-71EY/AG\nSIGN ON ACCEPTED AREA A - PROCEED\n27MAY26 - HOLIDAYCONSULTANTSCOM LI LON - GALILEO\n>"
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Access Sabre terminal services by broadcasting SI* along with individual passcode credentials.`,
        steps: [
          {
            command: "SI*1234AB",
            commandDescription: "SI* (Sign-In sequence) + 6-character agent secret pass signature.",
            terminalOutput: "SI*1234AB\nSIGN IN SUCCESSFUL FOR TERMINAL 5649Y\nSABRE SYSTEM COOPERATIVE SECURE CONVOLUTION INITIATED\n*"
          }
        ]
      };
    }
  }

  // Scenario 6: Pricing / Fares / Fare Quote (FQ / WP / FXP)
  if (
    prompt.includes("price") ||
    prompt.includes("pricing") ||
    prompt.includes("fare") ||
    prompt.includes("quote") ||
    prompt.includes("cost") ||
    prompt.includes("best buy") ||
    prompt.includes("tariff")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] In Amadeus, to price an existing itinerary, first retrieve the held booking record, then price using the 'FXP' (Price booked itinerary) or 'FXB' (Price and re-book at the cheapest available fare) commands. To view general city-pair fare tariffs, use 'FQD'.`,
        steps: [
          getRetrievePnrStep("amadeus", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "FXP",
            commandDescription: "Price the current itinerary retaining cabin class of service.",
            terminalOutput: "FXP\nLAST TKT DATE 15OCT26 - SGD 1240.00\nVAL-BA SGD 1120.00 TAX 120.00 TOTAL SGD SGD 1240.00\nS1 BA 115 Y 15OCT LHRJFK SGD1120.00\nEND PRICING\n>"
          },
          {
            command: "FXB",
            commandDescription: "Best Buy: Prices the itinerary and automatically books the cheapest available class.",
            terminalOutput: "FXB\nBEST BUY APPLIED - REBOOKED TO CLASS Q - SAVES SGD 340.00\nNEW FARE SGD 900.00 VAL-BA TAX 120.00 TOTAL SGD 1020.00\nS1 BA 115 Q 15OCT LHRJFK SGD900.00\n>"
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] In Travelport Galileo, retrieve the passenger booking record with '*' first, then price the active itinerary via 'FQ' (Fare Quote). To check cheaper options, type 'FQBB' (Fare Quote Best Buy).`,
        steps: [
          getRetrievePnrStep("galileo", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "FQ",
            commandDescription: "Price the booked itinerary at the current class of service.",
            terminalOutput: "FQ\n* TRAVELPORT GALILEO SECTOR PRICING *\nLHR-BA-NYC Q SGD1240.00\nFARE SGD1120.00 TAX SGD120.00 TTL SGD1240.00\nTICKET STATUS REQUIRED - TAX SUMMARY ATTACHED\n>"
          },
          {
            command: "FQBB",
            commandDescription: "Fare Quote Best Buy: Check alternative cheaper fares on the itinerary.",
            terminalOutput: "FQBB\n* SYSTEM DISCOVERED LOWEST SECTOR COMBINATION *\nCLASS Q AVAILABLE - FARE REDISTRIBUTED TO SGD1020.00\nTO REBOOK TYPE FQQ\n>"
          },
          {
            command: `FD${origin}${destination}${date}/BA`,
            commandDescription: `FD (Fare Display) + origin + destination + date + carrier filter command to check general sector fares.`,
            terminalOutput: `FD${origin}${destination}${date}/BA\n${origin}-${destination} ON ${date} - BA FARES\nLN FARE-BASIS  OW/RT   CUR  MINMAX   CLASS\n01 YOWSTANDARD  620   GBP       -      Y\n02 QOWDISCOUNT  410   GBP       -      Q\n>`
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] In Sabre, pricing an existing booking requires first retrieving the reservation code, then processing 'WP' (Will Price) to price segments or 'WPNC' to find the lowest available fare (Best Buy rebook).`,
        steps: [
          getRetrievePnrStep("sabre", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "WP",
            commandDescription: "Will Price default command for current booked itinerary segments.",
            terminalOutput: "WP\nBASE FARE GBP680.00 TAX GBP80.00 TOTAL GBP760.00\nS1 BA115Y 15OCT LHRJFK\nBG 1PC - CARRIER VALIDATION BA\n*"
          },
          {
            command: "WPNC",
            commandDescription: "Price lowest available fare for the system's best-buy function.",
            terminalOutput: "WPNC\nLOWEST FARE RE-BOOKING COMMITTED - SAVINGS DEPOSIT\nCLASS Q AVAILABLE BASE GBP450.00 TAX GBP80.00 TOTAL GBP530.00\nTO ACCEPT REBOOK TYPE WPNCB\n*"
          }
        ]
      };
    }
  }

  // Scenario 7: Seating Display / Reservation (SD / ST / S.)
  if (
    prompt.includes("seat") ||
    prompt.includes("seating") ||
    prompt.includes("window") ||
    prompt.includes("aisle") ||
    prompt.includes("seat map") ||
    prompt.includes("seatmap")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] In Amadeus, to book specific seats, first retrieve the held booking record with 'RT', load the current seat map layout utilizing 'SMST', then assign chosen seats to travelers.`,
        steps: [
          getRetrievePnrStep("amadeus", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "SMST1",
            commandDescription: "Display the seat map for Flight Segment 1.",
            terminalOutput: "SMST1\n** AMADEUS SEAT MAP FLIGHT 1 **\n   A  B  C     D  E  F     G  H  J\n10 .  .  .     .  X  X     .  .  .\n11 .  X  .     X  X  X     .  X  .\n12 .  .  .     .  .  .     .  .  .  << WINDOW / AISLE\n13 .  .  .     .  .  .     .  .  .\n. AVAILABLE   X ASSIGNED\n>"
          },
          {
            command: "ST/12A",
            commandDescription: "Reserve seat 12A (Window seat) for traveler 1.",
            terminalOutput: "ST/12A\nSEAT 12A SELECTED FOR SMITH/ANNA - BA 115 S1\nREPLY MSG - HK1 SEAT CONFIRMED CORR\n>"
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] In Travelport Galileo, retrieve the existing held ticket record with '*', display the seat map utilizing 'SD' with segment number, then register seat preferences.`,
        steps: [
          getRetrievePnrStep("galileo", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "SD1",
            commandDescription: "SD (Seat Display) + 1 (Active Flight Segment index 1) to inspect cabin availability.",
            terminalOutput: "SD1\n** GALILEO SEAT DISPLAY - B777 SEGMENT 1 **\n   A  B     C  D  E     F  G\n12 .  X     .  .  .     X  .\n14 .  .     .  X  X     .  .  << 14A WINDOW SEAT FREE\n15 .  .     .  .  .     .  .\n. FREE   X ASSIGNED\n>"
          },
          {
            command: "S.S1/14A",
            commandDescription: "S.S (Seat Selection) + Segment 1 + / + 14A (chosen row & seat).",
            terminalOutput: "S.S1/14A\n* GALILEO SEATING RESPONSE *\nSEG 1 SEAT 14A SELECTED FOR SMITH/ANNA MS\nSTATUS CODE: HK1 (HOLD CONFIRMED)\n>"
          },
          {
            command: "S.S1/W",
            commandDescription: "Request generic Window seat (W) on segment 1.",
            terminalOutput: "S.S1/W\nPREFERENCE RECEIVED - ASSIGNING WINDOW SEAT\n>"
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] In Sabre, query the active PNR record using '*' lookup, query the visual seating grid with '4G' and segment index, then command segment seat allocation.`,
        steps: [
          getRetrievePnrStep("sabre", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "4G1*",
            commandDescription: "4G (Seat mapping inquiry) + Segment 1 + Asterisk delimiter.",
            terminalOutput: "4G1*\nSABRE DISPLAY MAP SECTOR 1\n   A  \n20 [.]  [X]   [.]\n21 [.]  [.]   [.]\n22 [.]  [.]   [.]\n*"
          },
          {
            command: "4G1/20A",
            commandDescription: "Assign Seat 20A on Segment 1.",
            terminalOutput: "4G1/20A\nSEAT 20A SOLD SEGMENT 1 TO PASSENGER 1.1\n*"
          }
        ]
      };
    }
  }

  // Scenario 8: Queue Administration & Access (Q/ / QS)
  if (
    prompt.includes("queue") ||
    prompt.includes("queues") ||
    prompt.includes("sign off") ||
    prompt.includes("signout") ||
    prompt.includes("sof") ||
    prompt.includes("exit")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] Amadeus uses 'QS' (Queue Session) to enter queues, 'QT' to view the queue table counts, and 'QI' to escape or ignore a queue transaction. 'SOF' signs the agent out of the system.`,
        steps: [
          {
            command: "QT",
            commandDescription: "QT (Queue Table) to inspect incoming/outgoing passenger queues.",
            terminalOutput: "QT\n** AMADEUS QUEUE LIST TABLE **\nQ 01 C01  -  15 SEC\nQ 12 C02  -   4 URGENT\nQ 50 C01  -  22 DEVIATE\n>"
          },
          {
            command: "QS12C02",
            commandDescription: "Enter Queue 12, Category 10.",
            terminalOutput: "QS12C02\n- QUEUE SESSION IN PROGRESS - ITEM 1 OF 4\n* SMITH/ANNA MS - SCHEDULE CHANGE BA 115\n>"
          },
          {
            command: "SOF",
            commandDescription: "Sign Out Forcefully from the desktop workspace.",
            terminalOutput: "SOF\nAMADEUS SIGN-OFF COMPLETED. THANK YOU.\n>"
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Galileo queues are entered via 'Q/' followed by queue number. Display queue size with 'Q*'. Quit the active queue stream with 'QXI' (Queue Exit Ignore). 'SOF' is used to Sign Off.`,
        steps: [
          {
            command: "Q*",
            commandDescription: "Q* (Queue Display) list totals for active agency queues.",
            terminalOutput: "Q*\n* TRAVELPORT GALILEO QUEUE SUMMARY *\nQ-97 (TICKETING)    - 14 PENDING\nQ-01 (SCHEDULES)    -  3 UPDATES\nQ-10 (URGENT REQ)   - 28 PENDING\n>"
          },
          {
            command: "Q/97",
            commandDescription: "Q/ (Queue Entrance) + 97 (Ticketing Queue).",
            terminalOutput: "Q/97\n* START QUEUE 97 - STEP 1 OF 14 *\nRECORD: FX89Y2 - SMITH/JOHN MR\nON QUEUE FOR TICKETING CONFIRMATION\n>"
          },
          {
            command: "QXI",
            commandDescription: "QXI (Queue Exit and Ignore) completes active task review without saving alterations.",
            terminalOutput: "QXI\nSESSION REMOVED FROM Q97 - LOADING NEXT ITEM\n>"
          },
          {
            command: "SOF",
            commandDescription: "Sign Off (SOF) to clear terminal access credentials.",
            terminalOutput: "SOF\nSIGN OFF ACCEPTED - WORKSTATION INACTIVE\n>"
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] Sabre utilizes 'Q*' to count files, 'Q/' to open queues, and 'QR' to declare queue tasks complete and exit. 'SOF' clears work sessions.`,
        steps: [
          {
            command: "Q*",
            commandDescription: "Query a roster of all work queues.",
            terminalOutput: "Q*\nSABRE QUEUE SUMMARY\nQ5  - 12 ITEMS\nQ14 -  2 ITEMS\n*"
          },
          {
            command: "Q/5",
            commandDescription: "Open and display first message in queue 5.",
            terminalOutput: "Q/5\nRECORD FIRST ACTIVE S1Y\nPMAX RE-DISPLAY SECURED\n*"
          },
          {
            command: "SOF",
            commandDescription: "Sign Off From active terminal block.",
            terminalOutput: "SOF\nSABRE SIGN OFF RE-ROUTED COMPLETED\n*"
          }
        ]
      };
    }
  }

  // Scenario 10: Meals / Food / Dietary requests on existing booking
  if (
    prompt.includes("meal") ||
    prompt.includes("food") ||
    prompt.includes("diet") ||
    prompt.includes("catering") ||
    prompt.includes("vgml") ||
    prompt.includes("ksml") ||
    prompt.includes("chml")
  ) {
    if (gds === "amadeus") {
      return {
        gds_name: "Amadeus",
        explanation: `[SANDBOX HOST MODE] To add a special dietary or catering meal code (e.g., VGML for vegetarian vegan meal) on an existing reservation, retrieve the active held booking record with 'RT[locator]', then append the Special Service Request ('SR') command targeted to passenger index 1.`,
        steps: [
          getRetrievePnrStep("amadeus", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "SRVGML/P1",
            commandDescription: "SR (Special Request) + VGML (Vegetarian Vegan Meal Code) + /P1 (Passenger index 1 linkage)",
            terminalOutput: "SRVGML/P1\n SSR VGML BA HN1 LHRJFK/SMITH ANNA/P1 - SPECIAL REQUEST SEND SENT\n>",
            isHighlighted: true
          }
        ]
      };
    } else if (gds === "galileo") {
      return {
        gds_name: "Galileo",
        explanation: `[SANDBOX HOST MODE] Adding meals on Travelport Galileo requires first retrieving the active held reservation record using '*', then commanding Special Information ('SI.BA*VGML') for the specific flight carrier.`,
        steps: [
          getRetrievePnrStep("galileo", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "SI.BA*VGML",
            commandDescription: "SI. (Special Information) + carrier BA + asterisk + VGML (Dietary Vegan Meal Code)",
            terminalOutput: "SI.BA*VGML\n01 SSR VGML BA NN1 LHRJFK 15OCT/SMITH ANNA MS\n>",
            isHighlighted: true
          }
        ]
      };
    } else { // sabre
      return {
        gds_name: "Sabre",
        explanation: `[SANDBOX HOST MODE] To register catering requirements in Sabre, retrieve the held traveler booking with '*' first, then add the special SSR meal code using indicator '3' and traveler links.`,
        steps: [
          getRetrievePnrStep("sabre", locator, origin, destination, date, cabin, seats, lastname, firstname, title),
          {
            command: "3VGML/1.1",
            commandDescription: "3 (Special request indicator) + VGML (Vegan meal code) + /1.1 (link to Passenger 1.1)",
            terminalOutput: "3VGML/1.1\nSSR VGML APPLIED SEG ALL PSGR 1.1\n*",
            isHighlighted: true
          }
        ]
      };
    }
  }

  // Scenario 9: General Catch-All GDS sandbox responder
  const subject = prompt.replace(/how to|what is|book|check/g, "").toUpperCase().trim() || "PNR CONTEXT";
  if (gds === "amadeus") {
    return {
      gds_name: "Amadeus",
      explanation: `[SANDBOX HOST MODE] This is a fallback simulated response highlighting generic Amadeus command options for: ${subject}.`,
      steps: [
        {
          command: `HE ${subject.substring(0, 10)}`,
          commandDescription: `HE (Help query descriptor) + target query keyword.`,
          terminalOutput: `HE ${subject.substring(0, 10)}\n* AMADEUS SYSTEMS TRAINING AND SATELLITE HELP *\nTOPIC INDEX: ${subject}\n\nUSE SPECIFIC CODES TO CONVERT TO AN RESERVATIONS.\nFOR ADVANCED TRAINER FLOWS, CHECK SCENARIO LISTINGS.\n>`
        }
      ]
    };
  } else if (gds === "galileo") {
    return {
      gds_name: "Galileo",
      explanation: `[SANDBOX HOST MODE] This is a fallback simulated response highlighting generic Travelport Galileo command options for: ${subject}.`,
      steps: [
        {
          command: `H/${subject.substring(0, 10)}`,
          commandDescription: `H/ (Help lookup descriptor) + target query code.`,
          terminalOutput: `H/${subject.substring(0, 10)}\n* GALILEO TERMINAL LEARNER UTILITY DIRECTORY *\nSUPPORT FILE: ${subject}\n\nREFER TO ADVANCED MANUALS FOR DOT/STAR FORMAT CODES.\n>`
        }
      ]
    };
  } else { // sabre
    return {
      gds_name: "Sabre",
      explanation: `[SANDBOX HOST MODE] This is a fallback simulated response highlighting generic Sabre command options for: ${subject}.`,
      steps: [
        {
          command: `HE/${subject.substring(0, 10)}`,
          commandDescription: `HE/ (Help code loader) + target query parameters.`,
          terminalOutput: `HE/${subject.substring(0, 10)}\n* SABRE COOPERATIVE SECTOR ADVISORY SERVICES *\nINFORMATION BANK KEY: ${subject}\n\nUSE CORRECT COMPONENT COMMUNION SIGNS (-, *, 9, 6) TO PROCEED\n*`
        }
      ]
    };
  }
}

async function startServer() {
  const app = express();

  // JSON Body parser
  app.use(express.json());

  // API to query GDS assistance from Gemini
  app.post("/api/gds/help", async (req: Request, res: Response): Promise<void> => {
    const { gds, prompt, activeAirline, activeLocator } = req.body;

    if (!gds || !prompt) {
      res.status(400).json({ error: "Missing required fields 'gds' or 'prompt'" });
      return;
    }

    const gdsFormatted = gds.charAt(0).toUpperCase() + gds.slice(1);
    
    // Check if there is an instructor-defined ground-truth match in Model Memory
    const matchedRule = findMemoryMatch(gds, prompt);

    if (matchedRule) {
      const steps = [
        {
          command: matchedRule.expectedCommand,
          commandDescription: matchedRule.commandDescription,
          terminalOutput: matchedRule.terminalOutput,
          isHighlighted: true,
          pnrRequired: !!matchedRule.pnrRequired,
          appendPnrLine: !!matchedRule.appendPnrLine,
          pnrLineTemplate: matchedRule.pnrLineTemplate || "",
          pnrLinePosition: matchedRule.pnrLinePosition || "bottom"
        }
      ];
      res.json({
        explanation: `[ADMIN OVERRIDE ACTIVE] matched GDS translation in model memory: "${matchedRule.title || matchedRule.commandDescription}".`,
        gds_name: gdsFormatted,
        steps,
        isSandbox: true,
        // also bubble key properties at root of response for easy access
        pnrRequired: !!matchedRule.pnrRequired,
        appendPnrLine: !!matchedRule.appendPnrLine,
        pnrLineTemplate: matchedRule.pnrLineTemplate || "",
        pnrLinePosition: matchedRule.pnrLinePosition || "bottom"
      });
      return;
    }

    // If we have an instructor-defined match OR the search terms refer to vendor locator/airline location, bypass Gemini and return immediately with clean 2-step retrieval and command format
    const activeGdsLower = gds.toLowerCase().trim();
    const promptLower = prompt.toLowerCase().trim();

    const isFrequentFlyerQuery = activeGdsLower === "amadeus" && (
      promptLower.includes("frequent flyer") ||
      promptLower.includes("fqtv") ||
      promptLower.includes("frequentflyer") ||
      promptLower.includes("ff number") ||
      promptLower.includes("ff id") ||
      promptLower.includes("ff code") ||
      promptLower === "add ff" ||
      promptLower.includes("add frequent flyer")
    );

    if (isFrequentFlyerQuery) {
      const carrier = (activeAirline && activeAirline.trim().length === 2) ? activeAirline.toUpperCase().trim() : "AY";
      const targetCommand = `SR FQTV ${carrier} -${carrier}611879925/P1`;
      
      const steps = [
        {
          command: "RT[LOCATOR]",
          commandDescription: "Retrieve the active passenger record to view the current segments.",
          terminalOutput: `RT[LOCATOR]\nRP/LONBA2460/LONBA2460            29MAY26/1330Z   [LOCATOR]\n 1.SMITH/ANNA MS\n 2  ${carrier} 115 Y 15OCT LHRJFK HK1   0835 1130\n 3  AP LHR 020 8999 1234\n 4  TK OK 15OCT/LON-${carrier}\nPNR LOCATOR - [LOCATOR]\n>`,
          isHighlighted: false
        },
        {
          command: targetCommand,
          commandDescription: `Register traveler's frequent flyer number for passenger 1 linked with active ${carrier} segment.`,
          terminalOutput: `${targetCommand}\nRP/LONBA2460/LONBA2460            29MAY26/1330Z   [LOCATOR]\n 1.SMITH/ANNA MS\n 2  ${carrier} 115 Y 15OCT LHRJFK HK1   0835 1130\n 3  AP LHR 020 8999 1234\n 4  TK OK 15OCT/LON-${carrier}\n 5  SSR FQTV ${carrier} HK/ ${carrier}611879925/P1\nPNR LOCATOR - [LOCATOR]\n>`,
          isHighlighted: true
        }
      ];

      res.json({
        explanation: `To add a frequent flyer number in Amadeus GDS, use the command format: SR FQTV <Airline> -<Account>/P<PassengerNum>. This is added to the open PNR on a new line.`,
        gds_name: "Amadeus",
        steps,
        isSandbox: true
      });
      return;
    }

    const hasBookingKeywords = promptLower.includes("book") || 
                               promptLower.includes("create a pnr") || 
                               promptLower.includes("create pnr") || 
                               promptLower.includes("how to create a pnr") || 
                               promptLower.includes("how do i create a pnr") || 
                               promptLower.includes("reserve") || 
                               promptLower.includes("itinerary") ||
                               promptLower.includes("booking");

    const hasFlightAndLocations = (promptLower.includes("flight") || promptLower.includes("travel") || promptLower.includes("go") || promptLower.includes("fly")) && 
                                  (promptLower.includes("from") || promptLower.includes("to") || promptLower.includes("return"));

    const isCreatePnrQuery = activeGdsLower === "amadeus" && (hasBookingKeywords || hasFlightAndLocations);

    if (isCreatePnrQuery) {
      const steps = getCreatePnrSteps(prompt);
      res.json({
        explanation: "To build a complete Passenger Name Record (PNR) or flight booking in Amadeus, follow these standard commands step-by-step to register your traveler name, search outbound and inbound flights, sell the desired seat cabins, specify a critical ticketing deadline, declare your received-from signature, and commit the final transaction.",
        gds_name: "Amadeus",
        steps,
        isSandbox: true
      });
      return;
    }

    const isSaveBookingQuery = activeGdsLower === "amadeus" && (
      promptLower.includes("how do i save a booking file") ||
      promptLower.includes("how to save a booking file") ||
      promptLower.includes("how do i save a booking") ||
      promptLower.includes("how to save booking") ||
      promptLower.includes("save a booking") ||
      promptLower.includes("save booking") ||
      promptLower.includes("save file") ||
      promptLower.includes("save a file") ||
      promptLower.includes("store booking") ||
      promptLower.includes("end a booking") ||
      promptLower.includes("end booking") ||
      promptLower.includes("end and retrieve")
    );

    if (isSaveBookingQuery) {
      const steps = [
        {
          command: "RFNAME",
          commandDescription: "RF (Received From) registers the source name of the person requesting the transaction save.",
          terminalOutput: "RFNAME\n>",
          isHighlighted: true
        },
        {
          command: "ER",
          commandDescription: "ER (End and Retrieve) commits all changes made, saves the active layout, and displays the finalized record locator.",
          terminalOutput: "ER\nRP/LONBA2460/LONBA2460            29MAY26/1330Z   [LOCATOR]\n 1.SMITH/ANNA MS\n 2  BA 115 Y 17OCT LHRJFK HK1   0835 1130\n 3  AP LON 020 8999 1234\n 4  TK OK 15OCT/LON-BA\nPNR LOCATOR - [LOCATOR]\n>",
          isHighlighted: true
        }
      ];

      res.json({
        explanation: "To save a Passenger Name Record (PNR) in Amadeus, you must record who you received the request from (RFNAME) and then commit/finalize the record with End and Retrieve (ER).",
        gds_name: "Amadeus",
        steps,
        isSandbox: true
      });
      return;
    }

    const isTicketingQuery = activeGdsLower === "amadeus" && (
      promptLower.includes("ticketing field") ||
      promptLower.includes("ticket field") ||
      promptLower.includes("add ticketing") ||
      promptLower.includes("add ticket field") ||
      promptLower.includes("ticketing limit") ||
      promptLower.includes("ticket time limit") ||
      promptLower.includes("tkldate") ||
      promptLower.includes("tktldate") ||
      promptLower.includes("tktl") ||
      promptLower.includes("tkxl") ||
      promptLower.includes("how do i add a ticketing") ||
      promptLower.includes("how to add a ticketing") ||
      promptLower.includes("ticketing deadline") ||
      promptLower.includes("ticket deadline") ||
      promptLower.includes("deadline")
    );

    if (isTicketingQuery) {
      let targetCommand = "TKTL14SEP/1800"; // default high-fidelity command
      let targetDescription = "Adds a ticketing field specifying a ticket time limit for the active passenger reservation.";
      let terminalOutputText = "  TK TL 14SEP/1800";

      // Matching exact formats from user request
      if (promptLower.includes("tkxl/1800")) {
        targetCommand = "TKXL/1800";
        targetDescription = "Sets PNR auto-cancellation to today at 18:00 in your local office ID.";
        terminalOutputText = "  TK XL /1800";
      } else if (promptLower.includes("tkxl/sydab1234")) {
        targetCommand = "TKXL/SYDAB1234";
        targetDescription = "Sets PNR auto-cancellation to today in local time of Office ID SYDAB1234.";
        terminalOutputText = "  TK XL /SYDAB1234";
      } else if (promptLower.includes("tkxl14sep/1800/sydab1234")) {
        targetCommand = "TKXL14SEP/1800/SYDAB1234";
        targetDescription = "Sets PNR auto-cancellation to September 14 at 18:00 in local time of Office ID SYDAB1234.";
        terminalOutputText = "  TK XL 14SEP/1800/SYDAB1234";
      } else if (promptLower.includes("tkxl14sep/1800")) {
        targetCommand = "TKXL14SEP/1800";
        targetDescription = "Sets PNR auto-cancellation to September 14 at 18:00 in local office time.";
        terminalOutputText = "  TK XL 14SEP/1800";
      } else if (promptLower.includes("tkxl14sep")) {
        targetCommand = "TKXL14SEP";
        targetDescription = "Sets PNR auto-cancellation to September 14 in local office time.";
        terminalOutputText = "  TK XL 14SEP";
      } else if (promptLower.includes("tktl/1800")) {
        targetCommand = "TKTL/1800";
        targetDescription = "Sets ticket time limit to today at 18:00 in your local office ID.";
        terminalOutputText = "  TK TL /1800";
      } else if (promptLower.includes("tktl/sydab1234")) {
        targetCommand = "TKTL/SYDAB1234";
        targetDescription = "Sets ticket time limit to today in local time of Office ID SYDAB1234.";
        terminalOutputText = "  TK TL /SYDAB1234";
      } else if (promptLower.includes("tktl14sep/1800/sydab1234")) {
        targetCommand = "TKTL14SEP/1800/SYDAB1234";
        targetDescription = "Sets ticket time limit to September 14 at 18:00 in local time of Office ID SYDAB1234.";
        terminalOutputText = "  TK TL 14SEP/1800/SYDAB1234";
      } else if (promptLower.includes("tktl14sep/1800")) {
        targetCommand = "TKTL14SEP/1800";
        targetDescription = "Sets ticket time limit to September 14 at 18:00 in local office time.";
        terminalOutputText = "  TK TL 14SEP/1800";
      } else if (promptLower.includes("tktl14sep")) {
        targetCommand = "TKTL14SEP";
        targetDescription = "Sets ticket time limit to September 14 in local office time.";
        terminalOutputText = "  TK TL 14SEP";
      } else if (promptLower.includes("tkxl")) {
        targetCommand = "TKXL/1800";
        targetDescription = "Sets PNR auto-cancellation to today at 18:00 in your local office ID.";
        terminalOutputText = "  TK XL /1800";
      } else if (promptLower.includes("tktldate") || promptLower.includes("tkldate")) {
        targetCommand = "TKTL03SEP";
        targetDescription = "Adds an automatic ticket time limit date, generating a random limit date such as TKTL03SEP.";
        terminalOutputText = "  TK TL 03SEP";
      }

      const steps = [
        {
          command: targetCommand,
          commandDescription: targetDescription,
          terminalOutput: `${targetCommand}\n${terminalOutputText}\n>`,
          isHighlighted: true
        },
        {
          command: "ER",
          commandDescription: "ER (End and Retrieve) saves the updated ticketing deadline, registering the revised marker inside the database.",
          terminalOutput: `ER\nRP/LONBA2460/LONBA2460            29MAY26/1330Z   [LOCATOR]\n 1.SMITH/ANNA MS\n 2  BA 115 Y 17OCT LHRJFK HK1   0835 1130\n 3  AP LON 020 8999 1234\n 4  ${terminalOutputText.trim()}/LON-BA\nPNR LOCATOR - [LOCATOR]\n>`,
          isHighlighted: true
        }
      ];

      res.json({
        explanation: "To manage ticketing fields or ticket time limits in Amadeus GDS, you can use the following standard formats:\n\n" +
          "1. **Automatic Ticketing/Ticket Time Limit date (TKTLDATE)**\n" +
          "   - `TKTL03SEP` (Ticketing limit on explicit random date September 3).\n\n" +
          "2. **Ticket Time Limit (TKTL)**\n" +
          "   - `TKTL/1800` (Ticket time limit is today at 18:00 in local office time).\n" +
          "   - `TKTL/SYDAB1234` (Ticket time limit is today in local time of Office ID SYDAB1234).\n" +
          "   - `TKTL14SEP` (Ticket time limit is September 14 in local office time).\n" +
          "   - `TKTL14SEP/1800` (Ticket time limit is September 14 at 18:00 in local office time).\n" +
          "   - `TKTL14SEP/1800/SYDAB1234` (Ticket time limit is September 14 at 18:00 in local time of Office ID SYDAB1234).\n\n" +
          "3. **Auto-Cancellation Ticket Limit (TKXL)**\n" +
          "   - `TKXL/1800` (PNR auto-cancellation is at 18:00 today in local office ID).\n" +
          "   - `TKXL/SYDAB1234` (PNR auto-cancellation is today in local time of Office ID SYDAB1234).\n" +
          "   - `TKXL14SEP` (PNR auto-cancellation is on September 14 in local office time).\n" +
          "   - `TKXL14SEP/1800` (PNR auto-cancellation is on September 14 at 18:00 in local office time).\n" +
          "   - `TKXL14SEP/1800/SYDAB1234` (PNR auto-cancellation is on September 14 at 18:00 in local time of Office ID SYDAB1234).\n\n" +
          "Always fetch/retrieve the active booking with `RT[LOCATOR]` before applying modifications to custom PNR records.",
        gds_name: "Amadeus",
        steps,
        isSandbox: true
      });
      return;
    }

    const isVendorLocatorQuery = promptLower.includes("vendor locator") || 
                                 promptLower.includes("airline location") || 
                                 promptLower.includes("record locator") || 
                                 promptLower.includes("rl") ||
                                 promptLower.includes("ticket number") ||
                                 promptLower.includes("ticket no") ||
                                 promptLower.includes("tkt no") ||
                                 promptLower.includes("tkt number") ||
                                 promptLower.includes("check ticket") ||
                                 promptLower.includes("view ticket") ||
                                 promptLower.includes("show ticket") ||
                                 promptLower.includes("check a ticket") ||
                                 promptLower.includes("check a ticket number") ||
                                 promptLower.includes("ticket receipt") ||
                                 promptLower.includes("ticket details");

    if (matchedRule || isVendorLocatorQuery) {
      const activeGds = matchedRule ? matchedRule.gds.toLowerCase() : activeGdsLower;
      const promptChar = activeGds === "sabre" ? "*" : ">";
      const steps: any[] = [];

      // Step 2: Terminal system response action command
      const expectedCmd = matchedRule ? matchedRule.expectedCommand : "RL";
      const cmdDesc = matchedRule ? matchedRule.commandDescription : "RL (Record Location) displays the airline/vendor record locators";
      let termOutput = matchedRule ? matchedRule.terminalOutput : "";

      if (expectedCmd === "RL") {
        let carrier = (activeAirline || "BA").toUpperCase().trim();
        let ticketCode = "UD52QT";
        if (carrier === "TG" || carrier === "THAI") {
          carrier = "TG";
          ticketCode = "2M27NI";
        }
        termOutput = `RP/XXXXXXXXX/XXXXXXXXX            TN/SU  19FEB25/0747Z   [LOCATOR]\n${carrier}/[LOCATOR]      TK/${ticketCode}\n${promptChar}`;
      } else if (!termOutput) {
        termOutput = `TRANSACTION COMPLETED RECORD UPDATED SUCCESSFULLY\n${promptChar}`;
      } else {
        // Guarantee prompt character suffix
        if (!termOutput.trim().endsWith(promptChar)) {
          termOutput = termOutput.trim() + `\n${promptChar}`;
        }
      }

      // Clean duplicate echo in output if any
      if (termOutput.startsWith(expectedCmd)) {
        termOutput = termOutput.substring(expectedCmd.length).trim();
      }

      steps.push({
        command: expectedCmd,
        commandDescription: cmdDesc,
        terminalOutput: `${expectedCmd}\n${termOutput}`,
        isHighlighted: true
      });

      res.json({
        explanation: "", // Absolutely no conversational text, instructions, or footnotes shown
        gds_name: gdsFormatted,
        steps,
        isSandbox: true
      });
      return;
    }

    try {
      let instructionsOverride = "";
      if (matchedRule) {
        instructionsOverride = `\n\nCRITICAL DIRECTIVE (INSTRUCTOR-INJECTED GROUND TRUTH):
The user's query matches an official training entry taught in GDS memory: "${matchedRule.title}" for GDS: "${matchedRule.gds}".
You MUST use EXACTLY the following parameters in your returned JSON response steps:
- Expected command string to type: "${matchedRule.expectedCommand}"
- Expected command syntax break down: "${matchedRule.commandDescription}"
- Expected terminal simulated screen response: 
${matchedRule.terminalOutput}

Do not invent, alter, or ignore this GDS format. It is crucial to prevent students from being presented with mismatched syntax templates!`;
      }

      const systemPrompt = `You are an absolute expert travel agency trainer specializing in the three principal Global Distribution Systems (GDS): Amadeus, Galileo, and Sabre.
Your mission is to help a student learn GDS commands by simulating a professional terminal interface.

The user is requesting guidance for the following target task:
"${prompt}"

Using the ${gdsFormatted} GDS system, generate between 1 and 4 detailed command steps to fulfill this task.
The commands must use official, syntactically correct codes for ${gdsFormatted}:

AMADEUS:
- Sign On / Sign Off: JI0001SU/SU, SOF
- Air Availability: AN15OCTLHRJFK, carrier filtered: AN15OCTLHRJFK*BA or AN15OCTLHRJFK/ABA, Re-display: A*, Return availability: AN15OCTLHRJFK*20OCT, Change Date: AD1 / AD-1, MD (Move Down), MU (Move Up)
- Booking cabin segments: SS1Y1 (Sell Status, 1 seat, Y class, line 1 from availability) or direct sell: 0BA115Y15OCTLHRJFKNN1
- Passenger Names: NM1SMITH/ANNA MS, multiple names: NM2SMITH/JOHN MR/ANNA MS, Child: NM1SMITH/GEORGE MSTR(CHD), Infant: NM1SMITH/ANNA MS(INF/BABY/15OCT25)
- Contact Phone / Email / Mobile: AP LON 020 8999 1234, APE-AGENT@TRAVEL.COM, APM-+447911123456
- Ticketing: TKOK (Ticketing OK status), TKTL15OCT/1800 (Ticket time limit with deadline), TKXL/1800 (Auto-cancellation deadline)
- Special Services (SSR): SRWCHR/P1 (Wheelchair ramp), SRVGML/P1 (Vegetarian meal), SRDOCS BA HK1/P/GBR/012345678/GBR/15OCT85/M/15OCT30/SMITH/JOHN/P1, SRFQTV BA-BA12345678/P1 (Frequent Flyer)
- OSI messages: OS BA VIP PASSENGER
- Pricing / Fares: FXP (Price current itinerary and create TST), FXB (Price and re-book lowest available class of service), FXA (Informative pricing quote), FQD LHRSIN/D15OCT/ABA (Fare tariff display), FQC35000JPY/USD (Currency conversion)
- Seating: SMST1 (Seat map segment 1), ST/12A (Assign seat 12A), ST/14B/P1 (Assign seat to passenger 1), SM1
- Queues: QT (Queue count table), QS12C10 (Enter Queue 12 Category 10), QI (Ignore queue item and exit), QN (Next queue item), SOF (Sign off)
- Received From: RFPASSENGER, RFJOHN (Received from passenger signature)
- Save Record: ET (End Transaction), ER (End and Retrieve - commits and redisplays PNR), IR (Ignore and Retrieve)
- Decode / Encode: DANPEORIA (Encode city), DACPIA (Decode airport), DNAAMERICAN (Encode airline), DCAAA (Decode airline)
- Minimum Connection Time (MCT): DM1 (Check connection between segment 1 and 2), DMI (Check full itinerary continuity and MCT)
- Record Locators / Airline Vendor Locators: RL (Displays carrier vendor record locator detail), RT (Retrieve/redisplay active PNR)

GALILEO (Travelport formats: support.travelport.com/webhelp/formats/Content/default.htm):
- Sign On / Sign Off: SON/F-71EY/AG, SOF
- Air Availability: A15OCTLHRJFK, carrier filtered: A15OCTLHRJFK*BA or A15OCTLHRJFK/BA, Re-display: A*, Return: AR20OCT, Change Date: AD1 / AD-1, A*1
- Booking cabin segments: 01Y1 (Sell 1 seat, Y class, segment line 1) or N1Y1, direct sell: 0BA115Y15OCTLHRJFKNN1
- Passenger Names: N.SMITH/ANNA MS (Note 'N.' prefix), multiple: N.2SMITH/JOHN MR/ANNA MS, Infant: N.I/SMITH/BABY/15OCT25
- Contact Phone / Email: P.LON*02089991234, agency: P.T*02071234567, traveler: P.H*02089991234, email: P.E*AGENT@TRAVEL.COM
- Ticketing: T.TAU/15OCT (Ticketing warning date limit), T.T* (Ticketing OK status), T.D/15OCT (Ticketing deadline)
- Special Services (SSR): SI.BA*VGML (Vegetarian meal for BA), SI.DL*WCHR (Wheelchair for Delta), SI.BA*FQTVBA12345678/P1
- OSI messages: SI.OSI BA VIP TRAVELER
- Pricing / Fares: FQ (Fare Quote booked itinerary), FQBB (Fare Quote Best Buy option search), FQQ (Price and auto-rebook cheapest class), FDLHRJFK15OCT/BA (Fare tariff display), FZSJPY35000USD (Currency conversion)
- Seating: SD1 (Seat map display for segment 1), S.S1/14A (Select seat 14A on segment 1), S.S1/W (Select Window seat), S.S1/A (Select Aisle seat)
- Queues: Q* (Queue display total list), Q/97 (Enter queue session 97), QXI (Queue exit and ignore item), QN (Next queue item), SOF (Sign off)
- Received From: R.P (Received from Passenger), R.A (Received from Agent), R.SMITH (Received from name)
- Save Record: ET (End Transaction), ER (End and Retrieve), IR (Ignore and Retrieve), I (Ignore)
- Decode / Encode: .CE PEORIA (Encode city), .CD NYC (Decode airport), .AE DELTA (Encode airline), .AD DL (Decode airline)
- Minimum Connection Time (MCT): T.MCT1 (MCT check for segment 1), T.MCT (MCT full itinerary check)
- Retrieve: *[LOCATOR] (Retrieve booking file by 6-char locator), *-SMITH (Retrieve by surname), *ALL (Display entire booking file)

SABRE:
- Sign On / Sign Off: SI*1234AB, SOF
- Air Availability: 115OCTLHRJFK, carrier filtered: 115OCTLHRJFK¥BA or 115OCTLHRJFK*BA, Re-display: 1*, Change Date: 116OCT or 1R
- Booking cabin segments: 01Y1 (Sell 1 seat in Y class on segment line 1), direct sell: 0BA115Y15OCTLHRJFKNN1
- Passenger Names: -SMITH/ANNA MS (Note '-' prefix), multiple: -2SMITH/JOHN MR/ANNA MS, Infant: -I/SMITH/BABY/15OCT25
- Contact Phone / Email: 9020-8999-1234-A (Phone with agency indicator -A), home: 902089991234-H, email: 9EMAIL-AGENT@TRAVEL.COM¥
- Ticketing: 7TAW15OCT/ (Ticket arrangement warning deadline), 7T-A15OCT (Ticket time limit), 7T-OK (Ticketing OK)
- Special Services (SSR): 3VGML/1.1 (SSR Vegetarian meal for pax 1.1), 3WCHRA/1.1 (Wheelchair ramp), 3FFBA12345678-1.1 (Frequent flyer)
- OSI messages: 3OSI BA VIP PASSENGER
- Pricing / Fares: WP (Will Price booked itinerary), WPNC (Will Price Lowest Cabin option best buy), WPNCB (Accept and auto-rebook lowest price), FQLHRJFK15OCT-BA (Fare quote tariff display), DC+JPY35000/USD (Currency conversion)
- Seating: 4G1* (Seat map display segment 1), 4G1/20A (Assign seat 20A on segment 1), 4G1/20A/1.1 (Assign seat to pax 1.1)
- Queues: Q* (Queue summary total list), Q/5 (Sign in to Queue 5), QR (Queue task complete and remove), QI (Queue ignore and exit), SOF
- Received From: 6PASSENGER, 6SMITH (Received from modifier '6' and caller name)
- Save Record: E (End Transaction), ER (End and Redisplay), IR (Ignore and Redisplay), I (Ignore)
- Decode / Encode: W/-CCPEORIA (Encode city), W/*PIA (Decode airport), W/-ALAMERICAN (Encode airline), W/*ALAA (Decode airline)
- Minimum Connection Time (MCT): *MCT1 (MCT segment check), *MCT (MCT itinerary check)
- Retrieve: *[LOCATOR] (Retrieve PNR by 6-char locator), *-SMITH (Retrieve by surname), *A or * (Display entire active PNR)

CRITICAL RULE FOR ACTIONS ON EXISTING RESERVATIONS (PNR / HELD BOOKINGS):
If the student is asking a question ("how-to", "how do I...", "how to book seats", "add a meal code", "wchr request", etc.) about an action that applies to an EXISTING or HELD booking record (e.g., reserving specific seats, seat maps, special meals/dietary requests, SSR/Auxiliary services, pricing of already booked segments, checking queue items):
1. The FIRST step inside your response's "steps" array MUST be an authentic retrieval command to display the existing held GDS booking record (PNR).
   - For AMADEUS GDS, the command must be: "RT[LOCATOR]" (e.g., "RTHX89Y2") or "RT". The terminalOutput block should copy/simulate displaying a completed, active held record locator containing passenger name, flight segment status (HK/HK1/SS), etc.
   - For GALILEO GDS, the command must be: "*[LOCATOR]" (e.g., "*HX89Y2") or "*ALL". The terminalOutput block should display the active held Travelport Galileo reservation worksheet.
   - For SABRE GDS, the command must be: "*[LOCATOR]" (e.g., "*HX89Y2") or "*A". The terminalOutput block should redisplay the active Passenger Name Record.
2. The SUBSEQUENT step(s) inside your "steps" array should then show the actual commands needed to apply or perform their requested action (such as selecting seat rows, adding the requested meal code like SRVGML or SI.BA*VGML or 3VGML/1.1, pricing segments, etc.) on that retrieved/held PNR.
   - **Crucial**: Set the "isHighlighted" boolean property to true on the subsequent command steps that perform the actual task the user requested (like the meal codes or seat selections).
Ensure the student gets used to retrieving held reservations before modifying or adding actions to them.

For each step, synthesize the exact text block that the terminal screen would output in a real-world monochrome CRT travel terminal. The output screen should look highly authentic: monospaced, all-uppercase, decorated with realistic airline identifiers (e.g., AA, BA, LH, AF, etc.), travel class symbols, flight numbers, airport codes (e.g., LHR, JFK, PAR, DXB, FRA), correct sector routing, received-from signatures, passenger counts, and locator variables. Ensure lines fit nicely within standard CRT telemetry screens (approx 60-80 character columns).

Provide a Plain English explanation of the overall flow and what the commands mean.${instructionsOverride}`;

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Generate step-by-step training content for: ${prompt} in ${gdsFormatted}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: {
                type: Type.STRING,
                description: "Plain English summary explaining how this process works in this GDS."
              },
              gds_name: {
                type: Type.STRING,
                description: "Name of the GDS system (e.g. Amadeus, Galileo, Sabre)"
              },
              steps: {
                type: Type.ARRAY,
                description: "Sequential list of GDS commands and terminal responses.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    command: {
                      type: Type.STRING,
                      description: "The verbatim GDS command to type on the terminal prompt."
                    },
                    commandDescription: {
                      type: Type.STRING,
                      description: "Brief breakdown explaining each element of the command syntax."
                    },
                    terminalOutput: {
                      type: Type.STRING,
                      description: "Realistic multi-line response returned by the terminal screen, mimicking a physical travel agency workstation."
                    },
                    isHighlighted: {
                      type: Type.BOOLEAN,
                      description: "True if this command represents the actual main target action (e.g., the meal code command or seat assignment rather than retrieval pre-requisites)."
                    }
                  },
                  required: ["command", "commandDescription", "terminalOutput"]
                }
              }
            },
            required: ["explanation", "gds_name", "steps"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response or empty response returned from the Gemini AI model.");
      }

      // Parse the JSON representation
      const parsedData = JSON.parse(responseText.trim());

      // Defensively sanitize and clean the returned step objects to eliminate undefined fields
      const cleanSteps = (parsedData.steps || []).map((step: any) => ({
        command: step.command || step.cmd || step.commandText || "",
        commandDescription: step.commandDescription || step.description || step.command_description || step.cmdDescription || "",
        terminalOutput: step.terminalOutput || step.output || step.terminal_output || step.response || "",
        isHighlighted: !!(step.isHighlighted || step.highlighted || step.highlight)
      }));

      const cleanResponse = {
        explanation: parsedData.explanation || "No explanation provided.",
        gds_name: parsedData.gds_name || gdsFormatted,
        steps: cleanSteps,
        isSandbox: false
      };

      res.json(cleanResponse);

    } catch (error: any) {
      console.log("ℹ️ [GEMINI REDIRECT] Running in premium offline-capable local simulator mode.");
      
      let fallbackResponse;
      
      // If we have an instructor-defined matched rule, let's serve it directly with extreme high-fidelity!
      if (matchedRule) {
        const steps: any[] = [];
        
        steps.push({
          command: matchedRule.expectedCommand,
          commandDescription: matchedRule.commandDescription,
          terminalOutput: matchedRule.terminalOutput,
          isHighlighted: true
        });
        
        fallbackResponse = {
          explanation: `[KNOWLEDGE FEED ACTIVE] Directly matched GDS translation in instructor model memory: "${matchedRule.title}". Handled with 100% correct syntactic layouts.`,
          gds_name: gdsFormatted,
          steps
        };
      } else {
        // Run general procedural builder
        fallbackResponse = generateGdsFallbackResponse(gds, prompt);
      }

      // Defensively sanitize and clean fallback outputs as well
      const cleanSteps = (fallbackResponse.steps || []).map((step: any) => ({
        command: step.command || step.cmd || step.commandText || "",
        commandDescription: step.commandDescription || step.description || step.command_description || step.cmdDescription || "",
        terminalOutput: step.terminalOutput || step.output || step.terminal_output || step.response || "",
        isHighlighted: !!(step.isHighlighted || step.highlighted || step.highlight)
      }));

      const cleanResponse = {
        explanation: fallbackResponse.explanation || "No explanation provided.",
        gds_name: fallbackResponse.gds_name || gds,
        steps: cleanSteps,
        isSandbox: true
      };

      res.json(cleanResponse);
    }
  });

  // CUSTOM WORKSPACE BACKEND PERSISTENT STORE (GDS Assignments Memory)
  const CUSTOM_ASSIGNMENTS_FILE = path.join(process.cwd(), "custom_assignments.json");

  // Helper to read custom assignments securely
  function readCustomAssignments(): any[] {
    try {
      if (fs.existsSync(CUSTOM_ASSIGNMENTS_FILE)) {
        const data = fs.readFileSync(CUSTOM_ASSIGNMENTS_FILE, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading custom_assignments.json:", error);
    }
    return [];
  }

  // Helper to write custom assignments securely
  function writeCustomAssignments(assignments: any[]): void {
    try {
      fs.writeFileSync(CUSTOM_ASSIGNMENTS_FILE, JSON.stringify(assignments, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing custom_assignments.json:", error);
    }
  }

  // Get list of custom instructor entries to feedfront users
  app.get("/api/assignments", (req: Request, res: Response) => {
    try {
      const customOnes = readCustomAssignments();
      res.json(customOnes);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read custom GDS assignments", details: err?.message });
    }
  });

  // Add a newly structured training exercise / expected entries
  app.post("/api/assignments", (req: Request, res: Response): any => {
    try {
      const { 
        title, 
        category, 
        gds, 
        difficulty, 
        objective, 
        expectedCommand, 
        description, 
        hint, 
        successResponse 
      } = req.body;

      if (!title || !expectedCommand || !gds || !objective) {
        return res.status(400).json({ error: "Missing required parameters (title, expectedCommand, gds, objective)" });
      }

      const currentList = readCustomAssignments();
      const newId = `custom_${gds}_${Date.now()}`;
      
      const newEntry = {
        id: newId,
        title,
        category: category || "Custom Exercises",
        gds,
        gdsLabel: gds === "amadeus" ? "Amadeus" : gds === "sabre" ? "Sabre GDS" : "Travelport Galileo",
        difficulty: difficulty || "Beginner",
        objective,
        expectedCommand: expectedCommand.toUpperCase().trim(),
        description: description || `Custom scenario for GDS checking on standard syntax commands.`,
        hint: hint || `Type the exact sequence of commands: ${expectedCommand}`,
        successResponse: successResponse || `${expectedCommand.toUpperCase()}\n[SIMULATION SUCCESS: PROCESSED VIA CUSTOM ENTRY BACKEND]\n>`,
        isCustom: true
      };

      currentList.push(newEntry);
      writeCustomAssignments(currentList);
      res.status(201).json(newEntry);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to log custom GDS assignment", details: err?.message });
    }
  });

  // Delete an existing course or entry
  app.delete("/api/assignments/:id", (req: Request, res: Response): any => {
    try {
      const { id } = req.params;
      let currentList = readCustomAssignments();
      const initialLength = currentList.length;
      
      currentList = currentList.filter(a => a.id !== id);
      
      if (currentList.length === initialLength) {
        return res.status(404).json({ error: "No custom assignment matched that identifier" });
      }

      writeCustomAssignments(currentList);
      res.json({ success: true, message: `Successfully deleted custom exercise: ${id}` });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete custom GDS assignment", details: err?.message });
    }
  });

  // ================= ROUTE RULES ENDPOINTS =================
  const ROUTE_RULES_FILE = path.join(process.cwd(), "route_rules.json");

  function readRouteRules(): any {
    try {
      if (fs.existsSync(ROUTE_RULES_FILE)) {
        const data = fs.readFileSync(ROUTE_RULES_FILE, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading route rules in server.ts:", error);
    }
    // Fallback seed structure if something goes wrong
    return {
      groupCities: { "LON": ["LHR", "LGW", "STN"] },
      destinationRules: []
    };
  }

  function writeRouteRules(rules: any): void {
    try {
      fs.writeFileSync(ROUTE_RULES_FILE, JSON.stringify(rules, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing route rules in server.ts:", error);
    }
  }

  app.get("/api/route-rules", (req: Request, res: Response) => {
    try {
      const rules = readRouteRules();
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load route rules config", details: err?.message });
    }
  });

  app.post("/api/route-rules", (req: Request, res: Response): any => {
    try {
      const newRules = req.body;
      if (!newRules || typeof newRules !== "object") {
        return res.status(400).json({ error: "Invalid route rules format" });
      }
      writeRouteRules(newRules);
      res.json({ success: true, rules: newRules });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to store route rules config", details: err?.message });
    }
  });

  // ================= MODEL MEMORY ENDPOINTS =================
  // Get all grounding rules / model memory entries
  app.get("/api/model-memory", (req: Request, res: Response) => {
    try {
      const memory = readModelMemory();
      res.json(memory);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load model truth feeds", details: err?.message });
    }
  });

  // Add or update a model memory entry
  app.post("/api/model-memory", (req: Request, res: Response): any => {
    try {
      const { title, gds, keywords, expectedCommand, commandDescription, terminalOutput, topic, pnrRequired, appendPnrLine, pnrLineTemplate, pnrLinePosition } = req.body;
      
      if (!title || !gds || !keywords || !expectedCommand || !commandDescription || !terminalOutput) {
        return res.status(400).json({ error: "Missing required model memory rule fields" });
      }

      const list = readModelMemory();
      
      const newEntry = {
        id: "mem_" + Math.random().toString(36).substring(2, 11),
        title,
        gds,
        keywords,
        expectedCommand,
        commandDescription,
        terminalOutput,
        topic: topic || "Custom Override",
        pnrRequired: !!pnrRequired,
        appendPnrLine: !!appendPnrLine,
        pnrLineTemplate: pnrLineTemplate || "",
        pnrLinePosition: pnrLinePosition || "bottom"
      };

      list.push(newEntry);
      writeModelMemory(list);
      
      res.status(201).json(newEntry);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to feed memory rule into model", details: err?.message });
    }
  });

  // Update a model memory entry
  app.put("/api/model-memory/:id", (req: Request, res: Response): any => {
    try {
      const { id } = req.params;
      const { title, gds, keywords, expectedCommand, commandDescription, terminalOutput, topic, pnrRequired, appendPnrLine, pnrLineTemplate, pnrLinePosition } = req.body;
      
      if (!title || !gds || !keywords || !expectedCommand || !commandDescription || !terminalOutput) {
        return res.status(400).json({ error: "Missing required model memory rule fields" });
      }

      let list = readModelMemory();
      const idx = list.findIndex(item => item.id === id);
      
      if (idx === -1) {
        return res.status(404).json({ error: "No matching model memory entry found to update" });
      }

      list[idx] = {
        id,
        title,
        gds,
        keywords,
        expectedCommand: expectedCommand.toUpperCase().trim(),
        commandDescription,
        terminalOutput,
        topic: topic || "Custom Override",
        pnrRequired: !!pnrRequired,
        appendPnrLine: !!appendPnrLine,
        pnrLineTemplate: pnrLineTemplate || "",
        pnrLinePosition: pnrLinePosition || "bottom"
      };

      writeModelMemory(list);
      res.json(list[idx]);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update memory rule", details: err?.message });
    }
  });

  // Delete a model memory entry
  app.delete("/api/model-memory/:id", (req: Request, res: Response): any => {
    try {
      const { id } = req.params;
      let list = readModelMemory();
      const originLength = list.length;
      
      list = list.filter(item => item.id !== id);
      
      if (list.length === originLength) {
        return res.status(404).json({ error: "No matching model memory entry found to delete" });
      }

      writeModelMemory(list);
      res.json({ success: true, message: "Successfully deleted GDS translation from model memory" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete memory rule", details: err?.message });
    }
  });

  // Chatbot parser for GDS Instructor Portal
  app.post("/api/model-memory/chat", async (req: Request, res: Response): Promise<any> => {
    try {
      const { message, selectedGds } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      let client;
      try {
        client = getGeminiClient();
      } catch (err: any) {
        console.warn("Gemini is not initialized: ", err.message);
        
        // Offline basic parser fallback
        const msgLower = message.toLowerCase();
        const keywordsMatch = msgLower.match(/(?:for|match)\s+([a-zA-Z,\s]+)/i) || [null, "diet, veg, custom"];
        const commandMatch = msgLower.match(/(?:sequence|command|code)\s+(?:is|be)\s+([a-zA-Z0-9*/.]+)/i) || [null, "SRCUSTOM/P1"];
        
        if (msgLower.includes("remember") || msgLower.includes("if a user") || msgLower.includes("when asks") || msgLower.includes("command is") || msgLower.includes("instruct")) {
          const targetGds = msgLower.includes("sabre") ? "sabre" : msgLower.includes("galileo") ? "galileo" : (selectedGds || "amadeus");
          const extractedCommand = (commandMatch[1] || "SRCUSTOM/P1").toUpperCase().trim();
          
          const mockRule = {
            id: "mem_" + Math.random().toString(36).substring(2, 11),
            title: `Instructor Rule (${extractedCommand})`,
            gds: targetGds,
            keywords: (keywordsMatch[1] || "custom").toLowerCase().replace(/\./g, "").trim(),
            expectedCommand: extractedCommand,
            commandDescription: `Offline parsed instructor instructions for adding ${extractedCommand}`,
            terminalOutput: `${extractedCommand}\n  PROCESSED OFFLINE COMPLETED SECURELY\n>`,
            topic: "Custom Memory Override"
          };
          
          const list = readModelMemory();
          list.push(mockRule);
          writeModelMemory(list);

          return res.status(200).json({
            isRuleSaved: true,
            chatReply: `### ℹ️ Offline Simulation Success!\n\nI parsed your requirement in offline mode. I've stored a new rule for **${targetGds.toUpperCase()}**:\n\n- **Rule Title**: _Instructor Rule (${extractedCommand})_\n- **Matched Keywords**: _${mockRule.keywords}_\n- **Expected Command**: \`${extractedCommand}\`\n\n*(Note: Set your real \`GEMINI_API_KEY\` in Secrets for full high-fidelity intelligent chat translation!)*`,
            ruleParsed: mockRule
          });
        } else {
          return res.status(200).json({
            isRuleSaved: false,
            chatReply: `Welcome, GDS Instructor! I am currently running in **Offline Mode** because the Gemini API Key is not set in Secrets. \n\nTo instruct me offline, use statements like: \n- _"Remember that Amadeus vegetarian meal command is SRVGML."_ \n- _"If a user asks for wheelchairs Sabre, command is 3WCHRA/1.1."_\n\nOther questions can be answered locally by the offline engine!`,
            ruleParsed: null
          });
        }
      }

      const systemPrompt = `You are GdsChatMemoryAgent, an expert GDS training coordinator AI assistant. Your main task is to translate an airline instructor's raw natural language instructions or conversation into high-fidelity structured model memory entries for GDS simulators (Amadeus, Sabre GDS, and Travelport Galileo).

The instructor will converse with you or order you to remember, save, train, or seed a specific rule, for example:
- "If a user asks for business class upgrade in Sabre, the command is 4G1/BIZ with description 'Upgrade segment' and output 'UPGRADE CONFIRMED'"
- "Whenever they want to add an infant on Galileo, use the SI.BA*INFT/1.1 command"
- "remember a rule: Amadeus pet service code is SRAVIH with output 'AVIH ASSISTANCE CONFIRMED'"
- "instruct: if a user asks for vegetarian meal in amadeus use SRVGML/P1"

Your actions:
1. Analyze the statement. Decide if it represents a request to ADD/SAVE/REMEMBER/INSTRUCT a translation memory grounding rule.
If YES:
- Set 'isRuleSaved' to true.
- Synthesize an expert 'title' (e.g., "Sabre Business Class Upgrade").
- Determine 'gds': 'amadeus', 'sabre', or 'galileo'. Check if they name Sabre, Galileo, or Amadeus in their message. If not found, use "${selectedGds || 'amadeus'}".
- Compute 'keywords': a lowercase, comma-separated string containing broad matching synonyms, tokens, and overlapping phrases (e.g., "upgrade, business, cabin, premium, biz, class"). Ensure it matches what a student might ask about.
- Capture the 'expectedCommand' verbatim in uppercase (e.g., "4G1/BIZ").
- Parse or construct a high-fidelity 'commandDescription' in plain English explaining what the command parts mean.
- Build a beautiful, realistic, monospaced simulated travel CRT terminal output screen in 'terminalOutput' (all-uppercase, returning typical sector logs, confirmations, or indicators like '>' for Amadeus/Galileo or '*' for Sabre).
- Set a clean category in 'topic' (e.g. 'Special Services (SSR)', 'Seat Assignation', 'Fares & Pricing', 'Passenger Profiles', or 'Upgrades').
- Generate a beautiful, friendly 'chatReply' confirming the addition, detailing what was stored clearly in Markdown format so the instructor sees it perfectly.

If NO (e.g., they are greeting you, asking a general GDS question, or chatting):
- Set 'isRuleSaved' to false.
- Set 'ruleParsed' to null.
- Generate a highly helpful, custom professional 'chatReply' responding to their question, explaining how you can remember GDS formulas for them.

You MUST return a response strictly conforming to the response schema.`;

      const response = await client.models.generateContent({
        model: "gemini-flash-latest",
        contents: message,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isRuleSaved: { type: Type.BOOLEAN },
              chatReply: { type: Type.STRING },
              ruleParsed: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  gds: { type: Type.STRING },
                  keywords: { type: Type.STRING },
                  expectedCommand: { type: Type.STRING },
                  commandDescription: { type: Type.STRING },
                  terminalOutput: { type: Type.STRING },
                  topic: { type: Type.STRING }
                },
                required: ["title", "gds", "keywords", "expectedCommand", "commandDescription", "terminalOutput"]
              }
            },
            required: ["isRuleSaved", "chatReply"]
          }
        }
      });

      const rawText = response.text || "{}";
      const data = JSON.parse(rawText.trim());

      if (data.isRuleSaved && data.ruleParsed) {
        const list = readModelMemory();
        
        let builtOutput = data.ruleParsed.terminalOutput;
        const formattedCommand = data.ruleParsed.expectedCommand.trim().toUpperCase();
        if (!builtOutput) {
          if (data.ruleParsed.gds === "amadeus") {
            builtOutput = `${formattedCommand}\nSSR ${formattedCommand} HK1 BA CONFIRMED\n> `;
          } else if (data.ruleParsed.gds === "sabre") {
            builtOutput = `${formattedCommand}\nSECURE SSR LINK ACCEPTED\n* `;
          } else {
            builtOutput = `${formattedCommand}\nGALILEO GDS TRN WORK RES CONFIRMED\n> `;
          }
        }

        const finalRule = {
          id: "mem_" + Math.random().toString(36).substring(2, 11),
          title: data.ruleParsed.title || `Taught Rule (${formattedCommand})`,
          gds: data.ruleParsed.gds || selectedGds || "amadeus",
          keywords: data.ruleParsed.keywords || "general",
          expectedCommand: formattedCommand,
          commandDescription: data.ruleParsed.commandDescription || "Instructor-provided simulation sequence",
          terminalOutput: builtOutput,
          topic: data.ruleParsed.topic || "Custom Override"
        };
        
        list.push(finalRule);
        writeModelMemory(list);
        
        return res.json({
          isRuleSaved: true,
          chatReply: data.chatReply,
          ruleParsed: finalRule
        });
      }

      return res.json({
        isRuleSaved: false,
        chatReply: data.chatReply,
        ruleParsed: null
      });

    } catch (error: any) {
      console.error("Error in GDS instructor parsing chat agent:", error);
      res.status(500).json({ error: "Failed to process GDS instruction", details: error?.message });
    }
  });
  // ==========================================================

  // Client Assets Delivery & Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[GDS Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start GDS server: ", err);
  process.exit(1);
});
