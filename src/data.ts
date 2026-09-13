import { GDSPresetScenario } from './types';

export const GDS_SYSTEM_INFO = {
  amadeus: {
    fullName: "Amadeus",
    origin: "Created in 1987 by Air France, Iberia, Lutfhansa, and SAS. Dominates European and global markets.",
    designPhilosophy: "Structured, keyword-centric, strict spacing. Prompt is typically a cursor or command action.",
    promptChar: ">"
  },
  galileo: {
    fullName: "Travelport Galileo",
    origin: "Created in 1987 by 9 North American and European airlines. Highly popular in UK, Asia, and Africa.",
    designPhilosophy: "Punctuation-heavy (dots, stars, and slashes). Prompt is typically preceded by '>' or ')'.",
    promptChar: ">"
  },
  sabre: {
    fullName: "Sabre GDS",
    origin: "Spun off from American Airlines in 1960. Pioneer in electronic reservations. Deep market share in the Americas.",
    designPhilosophy: "Uses unique modifier symbols (star '*', cross-of-lorraine '¤' or backslash, hyphen '-'). Prefers numerical prefixes.",
    promptChar: "*"
  }
};

export const PRESET_SCENARIOS: GDSPresetScenario[] = [
  {
    id: "check_availability",
    title: "Check Flight Availability",
    category: "Flights & Scheduling",
    description: "Scan the schedules for flights from London (LHR) to New York (JFK) on October 15th.",
    difficulty: "Beginner",
    amadeus: {
      explanation: "In Amadeus, flight availability is checked using the AN (Availability Neutral) command, followed by date, origin, and destination code.",
      gds_name: "Amadeus",
      steps: [
        {
          command: "AN15OCTLHRJFK",
          commandDescription: "AN (Availability Neutral) + 15OCT (Date) + LHR (Origin) + JFK (Destination)",
          terminalOutput: "AN15OCTLHRJFK\n** AMADEUS AVAILABILITY - AN ** LHR LONDON.GB / JFK NEW YORK.US  15OCT26\n 1   LH 400  C9 D9 I9 Y9 B9 M9 Q9 /LHR 1005   JFK 1255  74H D 0/E\n 2   BA 117  F9 A9 J9 C9 W9 Y9 B9 H4 /LHR 0835   JFK 1130  777 L 0/E\n 3   VS  003  J9 C9 I9 W9 S9 Y9 B9 L5 /LHR 1230   JFK 1545  350 L 0/E\n 4   AA  141  F4 A2 J9 C9 D9 Y9 B9 H9 /LHR 1445   JFK 1810  777 D 0\n>"
        }
      ]
    },
    galileo: {
      explanation: "Galileo uses the 'A' command to query flight availability. The air timetable returns available booking classes and flight indicators.",
      gds_name: "Galileo",
      steps: [
        {
          command: "A15OCTLHRJFK",
          commandDescription: "A (Availability) + 15OCT (Date) + LHR (Origin) + JFK (Destination)",
          terminalOutput: "A15OCTLHRJFK\nLHR-JFK 15OCT2026      ** TRAVELPORT GALILEO DIRECT SATELLITE **\n 1   BA 117  F9 A9 C9 D9 I9 Y9 B9 M9  0830 LHR 1130 JFK 777 0*E\n 2   VS  03  J9 C9 I9 W9 Y9 B9 H9 L9  1230 LHR 1545 JFK 350 0*E\n 3   AA 141  C7 D5 I2 Y9 B9 H9 K9 M9  1445 LHR 1810 JFK 777 0*E\n 4   LH 400  C9 Y9 B9 M9 H9 Q9 V9 S9  1005 LHR 1255 JFK 74H 0*E\n>"
        }
      ]
    },
    sabre: {
      explanation: "Sabre uses the prefix '1' for air availability. Flights are listed with direct access indicator code column and terminal links.",
      gds_name: "Sabre",
      steps: [
        {
          command: "115OCTLHRJFK",
          commandDescription: "1 (Air Availability command) + 15OCT (Date) + LHR (Origin) + JFK (Destination)",
          terminalOutput: "115OCTLHRJFK\n15OCT26 LHR-JFK C*BA/VS/AA/LH\nLHR  LONDON                         JFK  NEW YORK\n 1BA 117 F9 A9 C9 Y9 B9   LHR0830   JFK1130 777 0 /E\n 2VS  03 J9 C9 Y9 B9 M9   LHR1230   JFK1545 350 0 /E\n 3AA 141 F4 J9 Y9 B9 H9   LHR1445   JFK1810 777 0 /E\n 4LH 400 C9 D9 Y9 B9 M9   LHR1005   JFK1255 74H 0 /E\n*"
        }
      ]
    }
  },
  {
    id: "sell_seats",
    title: "Sell Flight Segments",
    category: "Flights & Scheduling",
    description: "Book 1 seat in Economy class (Y class) on flight item #2 from our previous availability list.",
    difficulty: "Beginner",
    amadeus: {
      explanation: "In Amadeus, the 'SS' (Sell Status) command is used to book. Specify segment number, booking class, and seat count.",
      gds_name: "Amadeus",
      steps: [
        {
          command: "SS1Y1",
          commandDescription: "SS (Sell Status) + 1 (Active index from screen) + Y (Booking Class) + 1 (Quantity of seat)",
          terminalOutput: "SS1Y1\n 1  BA 117 Y 15OCT LHRJFK HK1   0835 1130   *EF*\n> "
        }
      ]
    },
    galileo: {
      explanation: "In Galileo, request segment selling via the 'N' (Need) command. Define number of seats, class code, and flight option index.",
      gds_name: "Galileo",
      steps: [
        {
          command: "N1Y1",
          commandDescription: "N (Need) + 1 (Seats) + Y (Booking Class) + 1 (Active flight list item)",
          terminalOutput: "N1Y1\n 1  BA 117 Y 15OCT LHRJFK*HS1   0830 1130  E*\n>"
        }
      ]
    },
    sabre: {
      explanation: "In Sabre, sell segments by starting with the number '0'. Format is '0' + number of seats + booking class + active flight index.",
      gds_name: "Sabre",
      steps: [
        {
          command: "01Y1",
          commandDescription: "0 (Sell prefix) + 1 (Number of seats) + Y (Cabin booking class) + 1 (Item index on screen)",
          terminalOutput: "01Y1\n01Y1 - SEAT SOLD\n 1 BA 117Y 15OCT LHRJFK SS1   0830  1130\n*"
        }
      ]
    }
  },
  {
    id: "create_pnr",
    title: "Create Passenger Record (PNR)",
    category: "Passenger Records (PNR)",
    description: "Enter a passenger's name, telephone number, ticket arrangement time limit, and save files to forge a PNR.",
    difficulty: "Intermediate",
    amadeus: {
      explanation: "To build a complete passenger file in Amadeus, we enter the name (NM1), a contact phone number (AP), a ticketing limit (TKOK), and complete the transaction (ER).",
      gds_name: "Amadeus",
      steps: [
        {
          command: "NM1SMITH/ANNA MS",
          commandDescription: "NM1 (Name Field, 1 passenger) + SMITH/ANNA MS (Lastname/Firstname Title)",
          terminalOutput: "NM1SMITH/ANNA MS\n 1 SMITH/ANNA MS\n>"
        },
        {
          command: "AP LHR 020 8999 1234",
          commandDescription: "AP (Agency/Passenger Phone) + LHR (City Code) + Phone coordinates",
          terminalOutput: "AP LHR 020 8999 1234\n  AP LHR 020 8999 1234 - CUSTOMER ADVISER DESK\n>"
        },
        {
          command: "TKOK15OCT",
          commandDescription: "TKOK (Ticket arrangement limit date)",
          terminalOutput: "TKOK15OCT\n  TK OK 15OCT/LON-BA\n>"
        },
        {
          command: "RF ANNA",
          commandDescription: "RF (Received From signature) + ANNA (Reporter Name)",
          terminalOutput: "RF ANNA\n  RECD FROM - ANNA\n>"
        },
        {
          command: "ER",
          commandDescription: "ER (End and Retrieve transaction) - This generates the final locator record code",
          terminalOutput: "ER\nRP/LONBA2460/LONBA2460            27MAY26/0830Z   Z5B9XE\n 1.SMITH/ANNA MS\n 2  BA 117 Y 15OCT LHRJFK HK1   0835 1130\n 3  AP LHR 020 8999 1234\n 4  TK OK 15OCT/LON-BA\n 5  OP RECEIVED FROM ANNA\nPNR KEY - Z5B9XE\n>"
        }
      ]
    },
    galileo: {
      explanation: "Galileo structures PNR with specific syntax: N. (Name), P. (Phone), T. (Ticketing arrangments) and ER. Let's create the booking.",
      gds_name: "Galileo",
      steps: [
        {
          command: "N.SMITH/ANNA MS",
          commandDescription: "N. (Name indicator) + Lastname/Firstname Title",
          terminalOutput: "N.SMITH/ANNA MS\n1.1SMITH/ANNA MS\n>"
        },
        {
          command: "P.LON*02089991234",
          commandDescription: "P. (Phone indicator) + LON* (City prefix separator) + Phone characters",
          terminalOutput: "P.LON*02089991234\n01 LON*02089991234 AGENT OFFICE\n>"
        },
        {
          command: "T.T*15OCT",
          commandDescription: "T.T* (Ticket limit indicator) + Date",
          terminalOutput: "T.T*15OCT\n01 T*15OCT\n>"
        },
        {
          command: "R.ANNA",
          commandDescription: "R. (Received From indicator) + Signer name",
          terminalOutput: "R.ANNA\nRCVD FROM - ANNA\n>"
        },
        {
          command: "ER",
          commandDescription: "ER (End transaction and Redisplay)",
          terminalOutput: "ER\nGW86XP/1D LON   SYSTEM GDS   27MAY26 08:30Z\n1.1SMITH/ANNA MS\n 1. BA 117 Y 15OCT LHRJFK*HS1  0830 1130\n 2. P.LON*02089991234\n 3. T.T*15OCT\nRECORD LOCATOR - GW86XP\n>"
        }
      ]
    },
    sabre: {
      explanation: "Sabre organizes files around numerical headers (9, 7, 8 etc). Hyphen '-' starts names. *A retrieves the complete PNR once stored with ER.",
      gds_name: "Sabre",
      steps: [
        {
          command: "-SMITH/ANNA MS",
          commandDescription: "- (Name entry prefix) + SMITH/ANNA MS (Lastname/Firstname Title)",
          terminalOutput: "-SMITH/ANNA MS\n1.1 SMITH/ANNA MS\n*"
        },
        {
          command: "9020-8999-1234-A",
          commandDescription: "9 (Phone details field indicator) + Standard number digits + -A (Agent association)",
          terminalOutput: "9020-8999-1234-A\n  1 /PH-020-8999-1234-A - AGENT\n*"
        },
        {
          command: "7TAW15OCT/",
          commandDescription: "7 (Ticket Limit field indicator) + TAW (Ticket Any Way arrangement) + Date + slash",
          terminalOutput: "7TAW15OCT/\n  1 /TL-A15OCT26\n*"
        },
        {
          command: "6ANNA",
          commandDescription: "6 (Received From indicator) + Signer authorizer",
          terminalOutput: "6ANNA\n  RECD FROM - ANNA\n*"
        },
        {
          command: "ER",
          commandDescription: "ER (End and Redisplay transactions) - Generates the active Sabre Alpha-numeric Locator",
          terminalOutput: "ER\nER RE-DISPLAY COMPLETE\nSABRE RECORD LOCATOR - YXN9QL\n1.1 SMITH/ANNA MS\n1 BA 117Y 15OCT LHRJFK SS1  0830 1130\n9. 020-8999-1234-A\n7. T-A15OCT26\n*"
        }
      ]
    }
  },
  {
    id: "add_wheelchair",
    title: "Special Service Requests (SSR)",
    category: "Passenger Records (PNR)",
    description: "Request a Special Service request (SSR) for Passenger 1: Add a Wheelchair (WCHR) assist trigger.",
    difficulty: "Intermediate",
    amadeus: {
      explanation: "SSR (Special Service Request) in Amadeus is entered with SR followed by the appropriate 4-letter service shortcode and passenger attachments.",
      gds_name: "Amadeus",
      steps: [
        {
          command: "SRWCHR/P1",
          commandDescription: "SR (Special Request) + WCHR (Wheelchair code) + /P1 (Passenger #1 linkage)",
          terminalOutput: "SRWCHR/P1\n SSR WCHR BA HN1 LHRJFK/SMITH ANNA/P1 - SPECIAL REQUEST SEND SENT\n>"
        }
      ]
    },
    galileo: {
      explanation: "In Galileo, SSR messages are initiated via 'SI.' followed by carrier code (or YY for all carriers) and wheelchair details.",
      gds_name: "Galileo",
      steps: [
        {
          command: "SI.BA*WCHR",
          commandDescription: "SI. (Service Information) + BA (Airlines carrier) + *WCHR (Wheelchair code indicator)",
          terminalOutput: "SI.BA*WCHR\n01 SSR WCHR BA NN1 LHRJFK 15OCT/SMITH ANNA MS\n>"
        }
      ]
    },
    sabre: {
      explanation: "In Sabre, SSR information uses the prefix '3'. Enter segment details and wheelchair codes followed by passenger attachments.",
      gds_name: "Sabre",
      steps: [
        {
          command: "3WCHRA/1.1",
          commandDescription: "3 (General SSR indicator) + WCHR (Code) + A (All segments) + /1.1 (Passenger #1.1 name index association)",
          terminalOutput: "3WCHRA/1.1\nSSR WCHR APPLIED SEG ALL PSGR 1.1\n*"
        }
      ]
    }
  },
  {
    id: "sign_in",
    title: "GDS Terminal Activation",
    category: "System Administration",
    description: "Perform system Sign-In with credential sign-on and active work-area selections.",
    difficulty: "Beginner",
    amadeus: {
      explanation: "Use the JI command followed by duty code, workspace password, and area flags.",
      gds_name: "Amadeus",
      steps: [
        {
          command: "JI0001SU/SU",
          commandDescription: "JI (Joint sign-on command) + 0001 (Agent ID Number) + SU (Super User duty code) + /SU (Office Area link)",
          terminalOutput: "JI0001SU/SU\nAMADEUS SIGN-ON ACCEPTED FOR AREA A\nGOOD MORNING OFFICE LONBA2460\n>"
        }
      ]
    },
    galileo: {
      explanation: "To sign into Galileo, travel agents send 'SON/F-' followed by agent initials and system authorizations.",
      gds_name: "Galileo",
      steps: [
        {
          command: "SON/F-71EY/AG",
          commandDescription: "SON/F- (Sign-on command prefix) + 71EY (Agent unique terminal initial) + /AG (Agent Area Code)",
          terminalOutput: "SON/F-71EY/AG\nSIGN ON ACCEPTED AREA A - PROCEED\n27MAY26 - HOLIDAYCONSULTANTSCOM LI LON - GALILEO\n>"
        }
      ]
    },
    sabre: {
      explanation: "Sabre uses SI* followed by agent credentials and workspace areas to unlock the terminal access.",
      gds_name: "Sabre",
      steps: [
        {
          command: "SI*1234AB",
          commandDescription: "SI* (Sign-In sequence indicator) + 1234AB (Agent passcode designation)",
          terminalOutput: "SI*1234AB\nSIGN IN SUCCESSFUL FOR TERMINAL 5649Y\nSABRE SYSTEM COOPERATIVE SECURE CONVOLUTION INITIATED\n*"
        }
      ]
    }
  }
];
