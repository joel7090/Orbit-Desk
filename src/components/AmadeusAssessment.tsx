import React, { useState, useEffect, useRef } from "react";
import { 
  Award, 
  Check, 
  HelpCircle, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Terminal as TerminalIcon, 
  FileText, 
  ArrowLeftRight, 
  User, 
  Bookmark, 
  Smile,
  Type
} from "lucide-react";
import { 
  GdsSession, 
  createEmptySession, 
  executeCrypticCommand, 
  renderGdsPnrBuffer,
  cleanupPnrDuplication
} from "../lib/gdsEngine";

const THEMES_CONFIG = {
  blue: {
    bg: "#000080",
    textClass: "text-white",
    borderClass: "border-blue-950/40",
    dotBg: "bg-blue-600",
    name: "Original Blue"
  },
  black: {
    bg: "#000000",
    textClass: "phosphor-green",
    borderClass: "border-zinc-800",
    dotBg: "bg-black border border-zinc-700",
    name: "Classic Black"
  },
  slate: {
    bg: "#1D3F52",
    textClass: "phosphor-cyan",
    borderClass: "border-teal-950/40",
    dotBg: "bg-[#1D3F52]",
    name: "Slate GDS"
  }
} as const;

interface Question {
  id: number;
  title: string;
  description: string;
  hint: string;
  idealCommand: string;
  expectedTopic: string;
  validate: (input: string, session: GdsSession, output: string[]) => boolean;
}

const MASTER_QUESTIONS: Question[] = [
  {
    id: 1,
    title: "Sign-On to Amadeus Workplace",
    description: "Amadeus requires agents to sign-on before modifying any flights or bookings. Sign-on using agent code '0001' with supervisor duty code 'SU' in area 'A' (Office area Link code is also '/SU').",
    hint: "Remember the Joint sign-on syntax starts with JI. Combine the agent code, supervisor duty code, and area link: JI0001SU/SU",
    idealCommand: "JI0001SU/SU",
    expectedTopic: "Sign-on / Activation",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "JI0001SU/SU";
    }
  },
  {
    id: 2,
    title: "Search Flight Availability (Direct Flight)",
    description: "How do you search direct/neutral flight availability from London Heathrow (LHR) to Auckland, New Zealand (AKL) on the 9th of June?",
    hint: "Use AN followed by date in standard format (DDMMM) and the origin/destination city codes: AN09JUNLHRAKL",
    idealCommand: "AN09JUNLHRAKL",
    expectedTopic: "Availability Searches",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "AN09JUNLHRAKL" || u === "AN9JUNLHRAKL";
    }
  },
  {
    id: 3,
    title: "Availability with Return Segment",
    description: "How do you search availability from London Heathrow (LHR) to Auckland (AKL) on the 9th of June, but with an automatically requested returning leg on the 20th of June?",
    hint: "Amadeus lets you append a return leg to search queries using the asterisk '*' syntax followed by the return date: AN09JUNLHRAKL*20JUN",
    idealCommand: "AN09JUNLHRAKL*20JUN",
    expectedTopic: "Availability Specials",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "AN09JUNLHRAKL*20JUN" || u === "AN9JUNLHRAKL*20JUN";
    }
  },
  {
    id: 4,
    title: "Book/Sell Flight Segment",
    description: "Book/sell exactly 1 seat in class of service 'Y' from line 1 of the flight availability list. Note: Make sure the availability status displays first.",
    hint: "Use the standard segment sell code SS, followed by class 'Y' and flight option '1': SSY1 (or SS1Y1)",
    idealCommand: "SSY1",
    expectedTopic: "Segment Sell",
    validate: (input, session) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return ["SSY1", "SS1Y1"].includes(u) || session.segments.length > 0;
    }
  },
  {
    id: 5,
    title: "Add Primary Passenger Name",
    description: "Add the primary adult passenger to the workspace: Lastname is 'SMITH', Firstname is 'ANNA', and Title is 'MS'.",
    hint: "Name entries start with NM1 followed by LASTNAME/FIRSTNAME TITLE. Do not miss the space before MS: NM1SMITH/ANNA MS",
    idealCommand: "NM1SMITH/ANNA MS",
    expectedTopic: "Names (NM)",
    validate: (input, session) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "NM1SMITH/ANNAMS" || session.names.some(n => n.toUpperCase().includes("SMITH/ANNA"));
    }
  },
  {
    id: 6,
    title: "Add Secondary Passenger Name",
    description: "Add the secondary passenger to the active session workspace: Lastname is 'SMITH', Firstname is 'GEORGE', and Title/Gender is 'MR'.",
    hint: "Each passenger must be added using a unique segment descriptor: NM1SMITH/GEORGE MR",
    idealCommand: "NM1SMITH/GEORGE MR",
    expectedTopic: "Names (NM)",
    validate: (input, session) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "NM1SMITH/GEORGEMR" || (session.names.length >= 2 && session.names.some(n => n.toUpperCase().includes("SMITH/GEORGE")));
    }
  },
  {
    id: 7,
    title: "Add Contact Phone Number",
    description: "Connect the booking file with traveler contact coordinates: Add the phone number '02071234567' to the session memory.",
    hint: "Use AP followed by the details. Slashes or spaces can be added but raw string works: AP02071234567",
    idealCommand: "AP02071234567",
    expectedTopic: "Contact Info",
    validate: (input, session) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u.startsWith("AP") && (u.includes("02071234567") || session.phones.some(p => p.includes("02071234567")));
    }
  },
  {
    id: 8,
    title: "Finnair Frequent Flyer Number",
    description: "Add a frequent flyer loyalty number for Finnair (carrier code: 'AY') with account number 'AY611879925' linked to passenger 1 ('P1').",
    hint: "Amadeus requires Special Service Request (SR) with loyalty sub-code FQTV: SR FQTV AY -AY611879925/P1",
    idealCommand: "SR FQTV AY -AY611879925/P1",
    expectedTopic: "Frequent Flyer SSRs",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u.includes("SRFQTVAY-AY611879925/P1") || u.includes("SRFQTVAY-AY611879925");
    }
  },
  {
    id: 9,
    title: "Passenger 2 Wheelchair to Ramp",
    description: "Special request: Passenger 2 require a Wheelchair to the Ramp (service code: 'WCHR'). What is the correct entry?",
    hint: "SSRs use SR. Concatenate code 'WCHR' and specify passenger pairing '/P2' at the end: SR WCHR/P2 (or SRWCHR/P2)",
    idealCommand: "SR WCHR/P2",
    expectedTopic: "Special Assistance SSR",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "SRWCHR/P2" || u === "SRWCHRP2" || (u.includes("WCHR") && (u.includes("P2") || u.includes("2")));
    }
  },
  {
    id: 10,
    title: "Add Ticketing Time Limit",
    description: "Assign a standard ticketing arrangement confirmation time limit to the carrier BA scheduled for the 15th of October.",
    hint: "Always verify tick arrangement syntax: TK OK 15OCT/LON-BA",
    idealCommand: "TK OK 15OCT/LON-BA",
    expectedTopic: "Ticketing (TK)",
    validate: (input, session) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "TKOK15OCT/LON-BA" || session.ticketing !== null;
    }
  },
  {
    id: 11,
    title: "Ignore and Retrieve Reservation (IR)",
    description: "You need to clear uncommitted workspace lines but immediately re-display and retrieve the pristine, active reservation details from memory. What is the entry?",
    hint: "Use IR (Ignore & Retrieve) to reset active workspace coordinates without dumping locator indexes.",
    idealCommand: "IR",
    expectedTopic: "Workspace Utilities",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "IR";
    }
  },
  {
    id: 12,
    title: "Commit and Save Reservation (ER)",
    description: "Finishing up! Commit and save the booking transaction coordinates securely to finalize your PNR record locator and write database indexes.",
    hint: "Use the End and Retrieve command: ER",
    idealCommand: "ER",
    expectedTopic: "Transaction Saving",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "ER" || u === "ET";
    }
  },
  {
    id: 13,
    title: "Sign-Off from Amadeus workplace",
    description: "You have completed your shift. Sign-off and close down your active terminal session safely.",
    hint: "The joint sign-off entry to clear all areas in Amadeus is: JO",
    idealCommand: "JO",
    expectedTopic: "Sign-off / Security",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "JO" || u.startsWith("JO");
    }
  },
  {
    id: 14,
    title: "Search Flight Availability for Specific Airline",
    description: "Search neutral availability from London Heathrow (LHR) to New York JFK on the 20th of November, specifically filtering for British Airways (carrier code: 'BA').",
    hint: "In Amadeus, append airline filter with /A followed by carrier code: AN20NOVLHRJFK/ABA",
    idealCommand: "AN20NOVLHRJFK/ABA",
    expectedTopic: "Availability Searches",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "AN20NOVLHRJFK/ABA" || u === "AN20NOVLHRJFK*BA";
    }
  },
  {
    id: 15,
    title: "Display Booking by Specific Record Locator",
    description: "Retrieve and display the active PNR with locator code 'GW86XP' directly on your active workspace screen.",
    hint: "Retrieve record using RT followed by the locator code: RTGW86XP",
    idealCommand: "RTGW86XP",
    expectedTopic: "Worksheet Utilities",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "RTGW86XP";
    }
  },
  {
    id: 16,
    title: "Retrieve booking file by Passenger Surname",
    description: "Find and display booking records matching passenger surname 'SMITH' in the active GDS session.",
    hint: "To search and retrieve PNR by name, use: RT/SMITH",
    idealCommand: "RT/SMITH",
    expectedTopic: "Worksheet Utilities",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "RT/SMITH";
    }
  },
  {
    id: 17,
    title: "Add Client Contact Email Address",
    description: "Add traveler email coordinates 'traveler@orbitdesk.com' to the Booking worksheet memory.",
    hint: "Email entries start with APE. Replace the '@' symbol with its Amadeus cryptic equivalent '//': APE traveler//orbitdesk.com",
    idealCommand: "APE traveler//orbitdesk.com",
    expectedTopic: "Contact Info",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u.startsWith("APE") && (u.includes("TRAVELER//ORBITDESK.COM") || u.includes("TRAVELER@ORBITDESK.COM"));
    }
  },
  {
    id: 18,
    title: "Set Transaction Form of Payment",
    description: "Secure the booking ticket issue procedure by adding 'CASH' as the form of payment.",
    hint: "Use form of payment code prefix FP followed by CASH: FPCASH",
    idealCommand: "FPCASH",
    expectedTopic: "Ticketing Prep",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "FPCASH";
    }
  },
  {
    id: 19,
    title: "Assign Received-From Signature",
    description: "Assign the custom 'Received From' signature parameter to traveler name 'ANNA' to designate the update request's author.",
    hint: "Assign Received From field using code RF: RFANNA",
    idealCommand: "RFANNA",
    expectedTopic: "Worksheet Utilities",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "RFANNA" || u.startsWith("RF");
    }
  },
  {
    id: 20,
    title: "End Transaction and Clear Worksheet (ET)",
    description: "End this PNR reservation session and save active changes to database, but clear the active screen without re-displaying the traveler file.",
    hint: "Use End and Clear entry: ET",
    idealCommand: "ET",
    expectedTopic: "Transaction Saving",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "ET" || u === "ER";
    }
  },
  {
    id: 21,
    title: "Run Best-Fare Pricing Query (Best Buy)",
    description: "Instruct the Amadeus pricing system to automatically re-evaluate your booked flights and display the cheapest available alternate options.",
    hint: "Use Best Buy informative entry: FXB",
    idealCommand: "FXB",
    expectedTopic: "Fares and Pricing",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return ["FXB", "FXP", "FXX"].includes(u);
    }
  },
  {
    id: 22,
    title: "Refresh / Redisplay Itinerary Worksheet",
    description: "Type the simplest command to refresh, reload, and view the entire active worksheet items on your workspace terminal.",
    hint: "The command to redisplay/retrieve active sheet without parameters is RT alone: RT",
    idealCommand: "RT",
    expectedTopic: "Worksheet Utilities",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "RT";
    }
  },
  {
    id: 23,
    title: "Price Worksheet Flights and Store TST Record",
    description: "Calculate standard fare pricing for active flights and compile a Transitional State Ticket (TST) record index automatically in the traveler's file.",
    hint: "The pricing command that stores the TST matches: FXP",
    idealCommand: "FXP",
    expectedTopic: "Fares and Pricing",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return ["FXP", "FXX", "FXB"].includes(u);
    }
  },
  {
    id: 24,
    title: "Page Scroll / Move Down Results",
    description: "You've searched for flight options but need to scroll down to view secondary options. Type the Amadeus scrolling directive.",
    hint: "Move Down code is MD: MD",
    idealCommand: "MD",
    expectedTopic: "Worksheet Utilities",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "MD";
    }
  },
  {
    id: 25,
    title: "Request Specific Vegetarian Hindu Meal SSR",
    description: "Request a Special Service request (SR) for a vegetarian Hindu meal ('VGML') for passenger index 1 ('P1').",
    hint: "Request specifier is SR followed by airline code space, service code and passenger identifier: SR VGML/P1",
    idealCommand: "SR VGML/P1",
    expectedTopic: "Special Assistance SSR",
    validate: (input) => {
      const u = input.toUpperCase().trim().replace(/\s+/g, "");
      return u === "SRVGML/P1" || u === "SRVGMLP1" || (u.includes("SR") && u.includes("VGML") && u.includes("1"));
    }
  }
];

function shuffleArray(array: Question[]): Question[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getPrecedingLinesForQuestionId(id: number): string[] {
  switch (id) {
    case 1: // Sign-On to Amadeus Workplace
      return [
        "AMADEUS GDS SYSTEM LINK v2.61 - SIGN-ON REQUIRED",
        "ENTER JOINT SIGN-ON TO INITIATE SECURITY LINK AREA A.",
        ""
      ];
    case 2: // Search Flight Availability (Direct Flight)
      return [
        "JI0001SU/SU",
        "OK - SIGN-ON COMPLETE - AREA A ACTIVE",
        "READY FOR TRANS-GLOBAL AVAILABILITY SEARCH...",
        ""
      ];
    case 3: // Availability with Return Segment
      return [
        "JI0001SU/SU",
        "OK - SIGN-ON COMPLETE - AREA A ACTIVE",
        "READY FOR SPECIFIED SEGMENTS SEARCH OR SPECIAL FARES AVAILABILITY...",
        ""
      ];
    case 4: // Book/Sell Flight Segment
      return [
        "AN09JUNLHRAKL",
        "AN 09JUN LHR-AKL DIRECT/NEUTRAL SOLUTIONS",
        " 1  NZ 002  Y9 B9 M9 Q9 H9 / LHR AKL  2115  0545+2  773 0 D E",
        " 2  SQ 301  Y4 B4 M4 Q3 H2 / LHR SIN  1015  0615+1 *77W 0",
        "    SQ 285  Y4 B4 M4 Q3 H2 / SIN AKL  0900  2315    77W 0",
        "PLEASE ENTER THE BOOKING / SELL REQUEST CODES FOR LINE ITEM(S)...",
        ""
      ];
    case 5: // Add Primary Passenger Name
      return [
        "RP/LON1A2900/0001AA - ACTIVE WORKSPACE ITINERARY",
        " 1  NZ 002 Y 09JUN LHR AKL HK1  2115 0545+2",
        "NO NAMES PRESENT - SYSTEM DETECTED 1 SOLD SEAT.",
        "PLEASE ADD PASSENGER NAME TO ALLOCATE WORKSPACE SEAT INDICES...",
        ""
      ];
    case 6: // Add Secondary Passenger Name
      return [
        "RP/LON1A2900/0001AA - ACTIVE WORKSPACE ITINERARY",
        " 1  NZ 002 Y 09JUN LHR AKL HK2  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        "SEATS CONFIGURED: 2  -  NAMES RECORDED: 1",
        "PLEASE ADD THE SECONDARY PASSENGER SURNAME & DETAILS...",
        ""
      ];
    case 7: // Add Contact Phone Number
      return [
        "RP/LON1A2900/0001AA - ACTIVE WORKSPACE ITINERARY",
        " 1  NZ 002 Y 09JUN LHR AKL HK2  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        " 2.1 SMITH/GEORGE MR",
        "CONTACT RECORD IS VOID. ADD AP OR CELL PHONE COORDINATES...",
        ""
      ];
    case 8: // Finnair Frequent Flyer Number
      return [
        "RP/LON1A2900/0001AA - SAVED RESERVATION WORKSHEET",
        " 1  AY 134 Y 15OCT HEL LHR HK2  1610 1715",
        " 1.1 SMITH/ANNA MS",
        " 2.1 SMITH/GEORGE MR",
        "AP 02071234567 - M",
        "LOYALTY SSR STATUS - NO FQTV DETECTED",
        "PLEASE INPUT FINNAIR FREQUENT FLYER ID CARD ASSIGNMENT FOR PASSENGER 1...",
        ""
      ];
    case 9: // Passenger 2 Wheelchair to Ramp
      return [
        "RP/LON1A2900/0001AA - ACTIVE WORKSPACE ITINERARY",
        " 1  NZ 002 Y 09JUN LHR AKL HK2  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        " 2.1 SMITH/GEORGE MR",
        "AP 02071234567",
        "SPECIAL WORKFLOW DETECTED - SPECIFY ASSISTANCE SSR WCHR FOR PASSENGER 2...",
        ""
      ];
    case 10: // Add Ticketing Time Limit
      return [
        "RP/LON1A2900/0001AA - ACTIVE WORKSPACE ITINERARY",
        " 1  BA 011 Y 15OCT LHR SIN HK1  1840 1430+1",
        " 1.1 SMITH/ANNA MS",
        "AP 02071234567",
        "WARNING: TICKETING CONSTRAINTS RECORD EMPTY. TK FIELD REQUIRED BEFORE SIGNING.",
        "SPECIFY TICKETING CONFIRMATION TIME LIMIT SPECIFICATIONS...",
        ""
      ];
    case 11: // Ignore and Retrieve Reservation (IR)
      return [
        "RP/LON1A2900/0001AA - UNCOMMITTED SEGMENTS OUT-OF-SYNC DETECTED",
        " 1  NZ 002 Y 09JUN LHR AKL HK2  2115 0545+2",
        " 2  **UNFINISHED MOD** REQUESTING TAX CALC FLT AP208298",
        "PLEASE ENTER COMMAND TO IGNORE LOCAL BUFFER MODS AND REDISPLAY CACHE...",
        ""
      ];
    case 12: // Commit and Save Reservation (ER)
      return [
        "RP/LON1A2900/0001AA - VALID ATTEMPT GDS SHEET SUMMARY",
        " 1  NZ 002 Y 09JUN LHR AKL HK1  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        "AP 02071234567",
        "APE traveler//orbitdesk.com",
        "TK OK 15OCT/LON-BA",
        "RECORD VERIFIED. ENTIRE WORKSPACE PENDING FINAL STORAGE COMMIT...",
        ""
      ];
    case 13: // Sign-Off from Amadeus workplace
      return [
        "AMADEUS GDS SECURE WORKSPACE - AREA A - OPERATOR ID: 0001",
        "ALL OPEN WORKSPACE SHEETS COMPLETED. MEMORY CLEAN.",
        "PLEASE INPUT DIRECTIVE FORCE SIGN-OFF (JO) TO CLOSE DOWN AREA A...",
        ""
      ];
    case 14: // Search Flight Availability for Specific Airline
      return [
        "JI0001SU/SU - USER SIGN-ON VERIFIED. AREA A OPEN.",
        "READY FOR SPECIFIED OR FILTERED NEUTRAL CARRIER SOLUTIONS...",
        ""
      ];
    case 15: // Display Booking by Specific Record Locator
      return [
        "AMADEUS CENTRAL RECORD POOLED DATABASES - ONLINE",
        "USE COMPREHENSIVE RT GRAPHICS ROUTE TO RETRIEVE GW86XP...",
        ""
      ];
    case 16: // Retrieve booking file by Passenger Surname
      return [
        "AMADEUS SEARCH LOGS - PASSENGER LOCATOR ROUTER",
        "SURNAME PARAMETER INDEX LOOKUP ACTIVE. READY FOR KEY INPUT DIRECTIVE...",
        ""
      ];
    case 17: // Add Client Contact Email Address
      return [
        "RP/LON1A2900/0001AA - ACTIVE WORKSPACE ITINERARY",
        " 1  NZ 002 Y 09JUN LHR AKL HK1  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        "AP 02071234567",
        "EMAIL FIELD VOID - PLEASE ADD RECIPIENT APE DETAILS SPECIFIED...",
        ""
      ];
    case 18: // Set Transaction Form of Payment
      return [
        "RP/LON1A2900/0001AA - FARES CALC COMPLETE",
        " 1  NZ 002 Y 09JUN LHR AKL HK1  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        "AP 02071234567",
        "FORM OF PAYMENT DESCRIPTOR VOID - SPECIFY FP METHOD...",
        ""
      ];
    case 19: // Assign Received-From Signature
      return [
        "RP/LON1A2900/0001AA - RECEIVED FROM FIELD REQUIRED",
        " 1  NZ 002 Y 09JUN LHR AKL HK1  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        "AP 02071234567",
        "ATTEMPT TO STORE BLOCKED - WHO AUTHORIZED THIS ACTION? DESIGNATE SIGNATURE (RF)...",
        ""
      ];
    case 20: // End Transaction and Clear Worksheet (ET)
      return [
        "RP/LON1A2900/0001AA - PENDING FINAL DATABASE DISPATCH",
        " 1  NZ 002 Y 09JUN LHR AKL HK1  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        "AP 02071234567",
        "TK OK 15OCT/LON-BA",
        "FPCASH",
        "RFANNA",
        "SYSTEM ENVELOPE APPROVED. COMMIT AND FLUSH ACTIVE TERMINAL WITH ET...",
        ""
      ];
    case 21: // Run Best-Fare Pricing Query (Best Buy)
      return [
        "RP/LON1A2900/0001AA - ACTIVE ITINERARY CONFIGURED",
        " 1  NZ 002 Y 09JUN LHR AKL HK1  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        "ITINERARY REQUIRES BEST FARE ASSESSMENTS. USE FX FORMAT TO PRICINGS...",
        ""
      ];
    case 22: // Refresh / Redisplay Itinerary Worksheet
      return [
        "AMADEUS MONITOR BUFFER ALERT: SCREEN DESYNCHRONIZED WITH BACKEND CHANNELS.",
        "PLEASE EXECUTE TERMINAL REDISPLAY COMMAND WITH NO SPECIFIERS...",
        ""
      ];
    case 23: // Price Worksheet Flights and Store TST Record
      return [
        "RP/LON1A2900/0001AA - UNSAVED CALC PREP STATUS",
        " 1  NZ 002 Y 09JUN LHR AKL HK1  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        "TST RECORD BLANK - COMPUTE PRICES AND COMMIT TRANSITIONAL STORED TICKET...",
        ""
      ];
    case 24: // Page Scroll / Move Down Results
      return [
        "AN09JUNLHRAKL",
        "AN 09JUN LHR-AKL DIRECT/NEUTRAL SOLUTIONS",
        " 1  NZ 002  Y9 B9 M9 Q9 H9 / LHR AKL  2115  0545+2  773 0 D E",
        " 2  SQ 301  Y4 B4 M4 Q3 H2 / LHR SIN  1015  0615+1 *77W 0",
        "    SQ 285  Y4 B4 M4 Q3 H2 / SIN AKL  0900  2315    77W 0",
        " 3  MH 004  Y9 B9 M9 H9 M2 / LHR KUL  1200  0815+1  388 0",
        "    MH 133  Y9 B9 M9 K2 M0 / KUL AKL  0945  2255    772 0",
        "   -- MORE SOLUTIONS TO DISPLAY BELOW -- PLEASE REQUEST SCROLL DOWN PAGE ENTRY...",
        ""
      ];
    case 25: // Request Specific Vegetarian Hindu Meal SSR
      return [
        "RP/LON1A2900/0001AA - MEAL RECONCILING SYSTEM",
        " 1  NZ 002 Y 09JUN LHR AKL HK1  2115 0545+2",
        " 1.1 SMITH/ANNA MS",
        "AP 02071234567",
        "SECTOR MEAL DIRECTIVE PREFERENCE DETECTED FOR PASSENGER 1. SUBMIT SSR VGML FORMAT...",
        ""
      ];
    default:
      return [
        "AMADEUS WORKING DIRECTORY - ACTIVE CONTEXT",
        ""
      ];
  }
}

export default function AmadeusAssessment() {
  const [questions, setQuestions] = useState<Question[]>(() => shuffleArray(MASTER_QUESTIONS));
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [incorrectQuestions, setIncorrectQuestions] = useState<number[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [monitorTheme, setMonitorTheme] = useState<"blue" | "black" | "slate">("blue");
  const [terminalTextScale, setTerminalTextScale] = useState<number>(100);
  const [assessmentSession, setAssessmentSession] = useState<GdsSession>(createEmptySession());
  const [assessmentSavedPnrs, setAssessmentSavedPnrs] = useState<Record<string, any>>({});
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [shownLines, setShownLines] = useState<string[]>([
    "AMADEUS COMPETENCY ASSESSMENT UNIT - BETA MODE",
    "PLEASE ENTER THE REQUESTED COMMANDS TO COMMENCE THE BENCHMARK.",
    "> "
  ]);
  const [lastFeedback, setLastFeedback] = useState<{ type: "success" | "error" | "info" | null, message: string }>({
    type: "info",
    message: "Ready to answer. Read the question on the left and enter your response."
  });
  
  const [showCertificate, setShowCertificate] = useState<boolean>(false);
  const [finishedTime, setFinishedTime] = useState<string>("");
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const activeQuestion = questions[currentIdx];

  // Preload realistic GDS terminal context whenever a user changes / navigates to another question
  useEffect(() => {
    if (!activeQuestion) return;
    const baseLines = getPrecedingLinesForQuestionId(activeQuestion.id);
    const savedAnswer = userAnswers[activeQuestion.id];
    
    if (savedAnswer) {
      setShownLines([
        "AMADEUS GDS CLIENT-A WORKSPACE - SECURE AREA",
        ...baseLines,
        `> ${savedAnswer.toUpperCase()}`,
        "--- COMMAND RECORDED SUCCESSFULLY ---",
        "Enter alternate command to update, or proceed to next task.",
        "> "
      ]);
    } else {
      setShownLines([
        "AMADEUS GDS CLIENT-A WORKSPACE - SECURE AREA",
        ...baseLines,
        "> "
      ]);
    }
    // We only want to run this when the selected question (currentIdx) changes or questions list is shuffled.
    // If we included userAnswers, it would overwrite the live emulator response during submission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, questions]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [shownLines]);

  const handleAssessmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = terminalInput.trim();
    if (!command) return;

    // Execute through core emulate check
    const emuResult = executeCrypticCommand(
      "amadeus",
      command,
      assessmentSession,
      setAssessmentSession,
      assessmentSavedPnrs,
      setAssessmentSavedPnrs
    );

    // Filter output lines to push to terminal output
    const outputLines = emuResult.recognized ? emuResult.output : [
      "--- COMMAND RECORDED SUCCESSFULLY ---",
      "Enter alternate command to update, or proceed to next task.",
      ""
    ];

    setShownLines(prev => {
      const promptLine = `> ${command}`;
      const cleaned = cleanupPnrDuplication(prev, outputLines);
      return [...cleaned, promptLine, ...outputLines];
    });

    setTerminalInput("");

    // Validate if it matches custom criteria for the target active questions
    const isCorrect = activeQuestion.validate(command, assessmentSession, outputLines);

    // Save the user's answer
    setUserAnswers(prev => ({ ...prev, [activeQuestion.id]: command }));

    if (isCorrect) {
      const nextCompleted = [...completedQuestions];
      if (!nextCompleted.includes(activeQuestion.id)) {
        nextCompleted.push(activeQuestion.id);
        setCompletedQuestions(nextCompleted);
      }
      setIncorrectQuestions(prev => prev.filter(id => id !== activeQuestion.id));
    } else {
      const nextIncorrect = [...incorrectQuestions];
      if (!nextIncorrect.includes(activeQuestion.id)) {
        nextIncorrect.push(activeQuestion.id);
        setIncorrectQuestions(nextIncorrect);
      }
      setCompletedQuestions(prev => prev.filter(id => id !== activeQuestion.id));
    }

    setLastFeedback({
      type: "info",
      message: `Command recorded for Q${currentIdx + 1}. Press Enter again to override, or proceed.`
    });

    // Auto-advance to the next question if available
    const nextIdx = currentIdx + 1;
    if (nextIdx < questions.length) {
      setTimeout(() => {
        setCurrentIdx(nextIdx);
        setLastFeedback({
          type: "info",
          message: `Progressed to Task ${nextIdx + 1}: ${questions[nextIdx].title}`
        });
      }, 1000);
    } else {
      setTimeout(() => {
        setLastFeedback({
          type: "success",
          message: `All tasks complete! Feel free to review your answers on any task number, or click "Finish & View Report".`
        });
      }, 1000);
    }
  };

  const handleQuestionSelect = (idx: number) => {
    setCurrentIdx(idx);
    setLastFeedback({
      type: "info",
      message: `Selected Question ${idx + 1}: ${questions[idx].title}. Read carefully.`
    });
  };

  const handleRestartAssessment = () => {
    setQuestions(shuffleArray(MASTER_QUESTIONS));
    setCompletedQuestions([]);
    setIncorrectQuestions([]);
    setUserAnswers({});
    setCurrentIdx(0);
    setAssessmentSession(createEmptySession());
    setAssessmentSavedPnrs({});
    setShowCertificate(false);
    setShownLines([
      "AMADEUS COMPETENCY ASSESSMENT UNIT - BETA MODE",
      "RELOADING WORKSPACE DATA... READY.",
      "> "
    ]);
    setLastFeedback({
      type: "info",
      message: "Assessment fully reset. Let's do this!"
    });
  };

  const handleFinishAndShowReport = () => {
    setFinishedTime(new Date().toLocaleString());
    setShowCertificate(true);
  };

  const attemptedCount = questions.filter(q => userAnswers[q.id] !== undefined && userAnswers[q.id] !== "").length;

  return (
    <div id="amadeus-assessment-portal" className="w-full flex flex-col gap-6 font-sans">
      
      {/* Top Banner section */}
      <div className="bg-slate-900 rounded-2xl p-6 border-2 border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600/30 rounded-xl border border-indigo-500/50">
            <Award className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Beta Mode</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Certification Match</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight mt-1">Amadeus Basic Competency Assessment</h1>
            <p className="text-xs text-slate-300 max-w-xl mt-0.5">
              Verify your GDS qualifications under pressure. Complete all {questions.length} randomized tasks on the live terminal to generate your certification.
            </p>
          </div>
        </div>

        <div className="flex flex-row md:flex-col items-end gap-3 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t border-slate-800 md:border-none">
          <div className="text-left md:text-right flex-1 md:flex-none">
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Attempted Tasks</span>
            <span className="text-3xl font-black text-indigo-400">{attemptedCount} <span className="text-sm text-slate-400 font-medium">/ {questions.length}</span></span>
          </div>
          <button
            type="button"
            onClick={handleRestartAssessment}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Reset
          </button>
        </div>
      </div>

      {showCertificate ? (
        /* Detailed Summary, Certificate & Diagnostic Grading Report */
        <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full animate-fade-in my-4">
          
          {completedQuestions.length === questions.length ? (
            /* Gold Foiled Certificate View (if 100% correct) */
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 md:p-10 border-4 border-amber-300/60 shadow-xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full filter blur-xl transform translate-x-12 -translate-y-12"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-200/20 rounded-full filter blur-xl transform -translate-x-12 translate-y-12"></div>
              
              <div className="max-w-2xl mx-auto border-2 border-dashed border-amber-300/40 p-4 md:p-8 rounded-xl bg-white/70 backdrop-blur-sm relative z-10">
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-30"></div>
                    <div className="bg-amber-400 p-3 rounded-full border-2 border-amber-500 shadow-md">
                      <Award className="w-8 h-8 text-slate-900" />
                    </div>
                  </div>
                </div>

                <h2 className="font-serif text-2xl md:text-3xl font-black text-amber-900 tracking-tight">Certificate of Achievement</h2>
                <p className="text-[10px] font-mono text-amber-700/80 uppercase tracking-widest mt-1">Class-A GDS Distribution Competency</p>
                
                <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto my-4"></div>
                
                <p className="text-slate-600 text-xs italic">
                  This credentials verification certifies that the terminal operator has successfully compiled, executed, and validated all required steps of the Amadeus Basic Assessment Suite with zero syntax errors:
                </p>

                <h3 className="text-lg font-extrabold font-sans text-slate-800 mt-4 capitalize">
                  GDS OPERATIONS SPECIALIST (AMADEUS GDS)
                </h3>
                
                <div className="mt-6 grid grid-cols-2 gap-4 text-left max-w-sm mx-auto text-[11px] font-sans text-slate-500 border-t border-slate-100 pt-4">
                  <div>
                    <span className="font-semibold block text-slate-400 uppercase tracking-widest text-[8px]">Scope Assessed</span>
                    <span className="font-bold text-slate-700">{questions.length} Primary Commands</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-400 uppercase tracking-widest text-[8px]">Timestamp</span>
                    <span className="font-bold text-slate-700 block">{finishedTime || new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Diagnostic Summary Card (if under target length) */
            <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 border-2 border-indigo-500/30 shadow-lg text-center relative overflow-hidden">
              <div className="relative z-10 max-w-2xl mx-auto">
                <div className="flex justify-center mb-3">
                  <div className="bg-indigo-500/10 p-3 rounded-full border border-indigo-500/40">
                    <Award className="w-8 h-8 text-indigo-400" />
                  </div>
                </div>

                <h2 className="text-xl md:text-2xl font-black text-indigo-300 tracking-tight">Amadeus Competency Assessment Finished!</h2>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">Grading Summary & Workspace Diagnostic</p>

                <div className="my-6 bg-slate-950/65 border border-slate-800 p-4 rounded-xl inline-block">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-widest">Final Certified Score</span>
                  <span className="text-4xl font-extrabold text-indigo-400">
                    {completedQuestions.length} <span className="text-sm text-slate-500">/ {questions.length}</span>
                  </span>
                  <span className="block text-[11px] text-emerald-400 font-bold mt-1">
                    ({((completedQuestions.length / questions.length) * 100).toFixed(0)}% Accuracy)
                  </span>
                </div>

                <p className="text-slate-300 text-xs max-w-lg mx-auto leading-relaxed">
                  A perfect <span className="text-amber-400 font-bold">100% accuracy score ({questions.length} of {questions.length})</span> is required to unlock your Class-A Gold Foil Credentials. Use the custom Diagnostic Report table below to review incorrect entries and their ideal cryptic syntaxes!
                </p>
              </div>
            </div>
          )}

          {/* Diagnostic Report Table showing correct answers */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 text-slate-800">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-150 pb-3">
              <FileText className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-wider">
                  AMADEUS GDS GRADING DIAGNOSTIC REPORT
                </h3>
                <p className="text-[11px] text-slate-400">Review correct inputs used to control host databases</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                    <th className="py-3 px-4 font-extrabold">Task No / Topic</th>
                    <th className="py-3 px-4 font-extrabold text-center">Status</th>
                    <th className="py-3 px-4 font-extrabold">Your Inputted Command</th>
                    <th className="py-3 px-4 font-extrabold">Ideal Amadeus Syntax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {questions.map((q, idx) => {
                    const isCorrect = completedQuestions.includes(q.id);
                    const isIncorrect = incorrectQuestions.includes(q.id);
                    const attemptedText = userAnswers[q.id];

                    return (
                      <tr key={q.id} className="hover:bg-slate-50/50 transition">
                        {/* Task metadata */}
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-slate-700 block mt-0.5">Q{idx + 1}. {q.title}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">
                            {q.expectedTopic}
                          </span>
                        </td>

                        {/* Status Label */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isCorrect ? (
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" /> Correct
                            </span>
                          ) : isIncorrect ? (
                            <span className="px-2 py-1 bg-rose-50 text-rose-800 border border-rose-250 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                              <span className="text-[10px] font-black">✕</span> Incorrect
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-slate-50 text-slate-400 border border-slate-150 rounded-lg text-[10px] font-bold inline-flex items-center">
                              Skipped
                            </span>
                          )}
                        </td>

                        {/* User answer */}
                        <td className="py-3.5 px-4 font-mono">
                          {attemptedText ? (
                            <span className={`px-2 py-1 rounded bg-slate-900 text-xs font-bold ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                              {attemptedText.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No Entry Saved</span>
                          )}
                        </td>

                        {/* Ideal syntax */}
                        <td className="py-3.5 px-4 font-mono">
                          <span className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-750 text-xs font-black rounded block w-fit shadow-xxs">
                            {q.idealCommand}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <span className="text-[11px] text-slate-400 italic">
                Operated within safe simulation area sandbox. Verification code: ADV-7090.
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRestartAssessment}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" /> Start Another Run
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 border border-amber-500 rounded-xl text-xs font-extrabold uppercase transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <FileText className="w-4 h-4 text-slate-900" /> Print Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Dynamic Assessment Terminal Split Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Panel: Tasks, Questions & Controls */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Task Index Selector Tracker Grid */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xxs">
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Assessment Milestones</h2>
              <div className="grid grid-cols-6 sm:grid-cols-12 lg:grid-cols-4 gap-1.5 font-mono text-center">
                {questions.map((q, idx) => {
                  const isAttempted = userAnswers[q.id] !== undefined && userAnswers[q.id] !== "";
                  const isActive = currentIdx === idx;
                  
                  let btnStyle = "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700";
                  if (isActive) {
                    btnStyle = "bg-indigo-600 text-white border-indigo-600 font-black shadow-md ring-2 ring-indigo-500/20";
                  } else if (isAttempted) {
                    btnStyle = "bg-indigo-50 border-indigo-250 text-indigo-700 font-extrabold shadow-xxs";
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleQuestionSelect(idx)}
                      className={`py-2 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer border ${btnStyle}`}
                    >
                      <span>Q{idx + 1}</span>
                      {isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                      ) : isAttempted ? (
                        <Check className="w-3.5 h-3.5 text-indigo-600 font-black" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-350"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Active Question Detailed Card */}
            <div className="bg-gradient-to-b from-white to-slate-50/50 rounded-2xl border border-slate-250 p-6 shadow-sm flex-1 flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-150 font-extrabold uppercase px-2.5 py-1 rounded-lg">
                    Task {currentIdx + 1} of {questions.length}
                  </span>
                  <span className="text-xs text-slate-400 font-mono italic">
                    {activeQuestion.expectedTopic}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-500" />
                    {activeQuestion.title}
                  </h3>
                  <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                    {activeQuestion.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* Info / Toast Feedback Indicator */}
                {lastFeedback.message && (
                  <div className={`p-3 rounded-lg border text-xs font-semibold leading-normal ${
                    lastFeedback.type === "success" 
                      ? "bg-emerald-50/70 border-emerald-250 text-emerald-800"
                      : lastFeedback.type === "error"
                        ? "bg-rose-50/70 border-rose-250 text-rose-800 animate-shake"
                        : "bg-indigo-50/50 border-indigo-100 text-indigo-800"
                  }`}>
                    {lastFeedback.message}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleFinishAndShowReport}
                    className="text-indigo-700 hover:text-indigo-800 text-[10px] sm:text-xs font-black uppercase tracking-wider bg-indigo-50 border border-indigo-150 hover:bg-indigo-100/80 px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xxs"
                  >
                    🏁 Finish & View Report
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentIdx === 0}
                      onClick={() => handleQuestionSelect(currentIdx - 1)}
                      className={`p-2 rounded-lg border transition ${
                        currentIdx === 0
                          ? "opacity-45 cursor-not-allowed border-slate-100 text-slate-300"
                          : "border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      }`}
                      title="Previous Question"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentIdx === questions.length - 1}
                      onClick={() => handleQuestionSelect(currentIdx + 1)}
                      className={`p-2 rounded-lg border transition ${
                        currentIdx === questions.length - 1
                          ? "opacity-45 cursor-not-allowed border-slate-100 text-slate-300"
                          : "border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                      }`}
                      title="Next Question"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Panel: Interactive GDS Emulator terminal */}
          <div className="lg:col-span-7 flex flex-col border border-slate-800 rounded-2xl overflow-hidden shadow-lg bg-black text-white h-[580px] lg:h-auto min-h-[500px]">
            
            {/* Terminal Header */}
            <div className="bg-slate-950 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-indigo-400" />
                <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">
                  AMADEUS ASSESSMENT TERMINAL
                </span>
              </div>

              {/* Theme & Text Options mirrored from the Sandbox */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Theme Selectors */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg select-none">
                  <span className="text-[9px] text-slate-400 font-mono font-bold uppercase mr-1">THEME:</span>
                  {(["blue", "black", "slate"] as const).map((themeKey) => {
                    const active = monitorTheme === themeKey;
                    const cfg = THEMES_CONFIG[themeKey];
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => setMonitorTheme(themeKey)}
                        className={`w-3 h-3 rounded-full border cursor-pointer border-slate-700 ${cfg.dotBg} ${active ? "ring-2 ring-cyan-400 scale-110 shadow" : "opacity-55 hover:opacity-100"}`}
                        title={`${cfg.name} Theme`}
                      />
                    );
                  })}
                </div>

                {/* Text Size Control */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg text-slate-300 font-sans select-none">
                  <Type className="w-3 h-3 text-cyan-450 text-cyan-400" />
                  <button
                    type="button"
                    disabled={terminalTextScale <= 80}
                    onClick={() => setTerminalTextScale(prev => Math.max(80, prev - 20))}
                    className="p-0 px-1.5 bg-slate-800 border border-slate-750 hover:border-slate-500 disabled:opacity-40 disabled:hover:border-slate-750 text-[9px] font-black rounded cursor-pointer transition-all active:scale-95 text-white"
                    title="Decrease Text Size"
                  >
                    A-
                  </button>
                  <span className="text-[9px] font-black font-sans w-8 text-center text-cyan-400">
                    {terminalTextScale}%
                  </span>
                  <button
                    type="button"
                    disabled={terminalTextScale >= 220}
                    onClick={() => setTerminalTextScale(prev => Math.min(220, prev + 20))}
                    className="p-0 px-1.5 bg-slate-800 border border-slate-750 hover:border-slate-500 disabled:opacity-40 disabled:hover:border-slate-750 text-[9px] font-black rounded cursor-pointer transition-all active:scale-95 text-white"
                    title="Increase Text Size"
                  >
                    A+
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-mono text-[9px] text-emerald-400 uppercase tracking-wider">LIVE</span>
                </div>
              </div>
            </div>

            {/* CRT Screen Display */}
            <div 
              style={{ 
                backgroundColor: THEMES_CONFIG[monitorTheme].bg,
                fontSize: `${(15 * terminalTextScale) / 100}px`
              }}
              onClick={() => terminalInputRef.current?.focus()}
              className={`flex-1 overflow-y-auto p-4 md:p-6 font-mono leading-relaxed tracking-wide relative crt-monitor-glow shadow-inner border cursor-text select-text ${THEMES_CONFIG[monitorTheme].borderClass}`}
            >
              
              {/* Scanlines Overlay for retro texture */}
              <div className="pointer-events-none absolute inset-0 crt-scanlines z-0 opacity-45"></div>
              
              <div className={`relative z-10 flex flex-col gap-1 h-full min-h-full ${THEMES_CONFIG[monitorTheme].textClass}`}>
                {shownLines.map((line, idx) => {
                  let lineStyle = "";
                  if (line.startsWith(">")) {
                    lineStyle = "text-cyan-300 font-bold";
                    if (monitorTheme === "slate") lineStyle = "text-emerald-300 font-bold";
                    if (monitorTheme === "black") lineStyle = "text-emerald-400 font-bold";
                  } else if (line.startsWith("ERR:") || line.startsWith(">>>") || line.startsWith("ERR")) {
                    lineStyle = "text-rose-450 text-rose-400 font-bold";
                  }
                  return (
                    <div 
                      key={idx} 
                      className={`whitespace-pre-wrap select-text ${lineStyle}`}
                    >
                      {line}
                    </div>
                  );
                })}
                
                {/* Interactive cursor line */}
                <form onSubmit={handleAssessmentSubmit} className="flex items-center gap-1.5 mt-1">
                  <span className={`font-bold select-none ${
                    monitorTheme === "blue" ? "text-cyan-300" : monitorTheme === "slate" ? "text-emerald-300" : "text-emerald-400"
                  }`}>&gt;</span>
                  <input
                    ref={terminalInputRef}
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Type cryptic command and press Enter..."
                    className="flex-1 bg-transparent border-none outline-none font-mono focus:ring-0 focus:outline-none placeholder:opacity-30 font-bold uppercase select-text"
                    style={{ 
                      fontSize: `${(15 * terminalTextScale) / 100}px`,
                      color: "inherit"
                    }}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="on"
                    spellCheck="false"
                  />
                </form>
                <div ref={terminalEndRef}></div>
              </div>

            </div>

            {/* Quick terminal instructions */}
            <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-t border-slate-900 text-[10px] font-mono text-slate-500">
              <span>ENTER: EXECUTE & EVALUATE</span>
              <span>AMADEUS DIRECT SATELLITE SYSTEM LINK V2.61</span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
