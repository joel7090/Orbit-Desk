export interface FlightTemplate {
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

// Scraped realistic flight data from Google Flights for key routes
export const GOOGLE_FLIGHTS_DATA: Record<string, Omit<FlightTemplate, "origin" | "destination">[]> = {
  // 1. LONDON (LHR/LGW/STN) to NEW YORK (JFK/EWR)
  "LON-NYC": [
    {
      airline: "BA",
      flightNo: "117",
      classesList: ["F8 A4 J9 C9 D9 I9 Y9", "B9 M9 H9 K9 L9 V9 M5"],
      terminal: "5",
      depTime: "0830",
      arrTime: "1115",
      aircraft: "777",
      duration: "7:45",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "VS",
      flightNo: "003",
      classesList: ["J9 C9 I9 Z4 W9 S9 Y9", "B9 R9 L9 M9 G4 V5 Q0"],
      terminal: "3",
      depTime: "0900",
      arrTime: "1155",
      aircraft: "350",
      duration: "7:55",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "173",
      classesList: ["F4 A2 J9 C9 D9 R9 Y9", "B9 M9 H9 K9 L9 GL"],
      terminal: "5",
      depTime: "1120",
      arrTime: "1415",
      aircraft: "777",
      duration: "7:55",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "DL",
      flightNo: "001",
      classesList: ["J9 C9 D9 I5 Y9 B9 M9", "H9 K9 L9 V9 U9 X5 Q2"],
      terminal: "3",
      depTime: "1230",
      arrTime: "1530",
      aircraft: "333",
      duration: "8:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "AA",
      flightNo: "107",
      classesList: ["F5 A3 J9 C9 D9 R9 Y9", "B9 M9 H9 K2 L0 L2 GL"],
      terminal: "3",
      depTime: "1400",
      arrTime: "1700",
      aircraft: "777",
      duration: "8:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "VS",
      flightNo: "009",
      classesList: ["J9 C9 I9 W9 Y9 B9 G4"],
      terminal: "3",
      depTime: "1600",
      arrTime: "1910",
      aircraft: "789",
      duration: "8:10",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "115",
      classesList: ["F7 A0 J9 C9 Y9 GL"],
      terminal: "5",
      depTime: "1710",
      arrTime: "2010",
      aircraft: "777",
      duration: "8:00",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  // 2. NEW YORK (JFK/EWR) to LONDON (LHR/LGW)
  "NYC-LON": [
    {
      airline: "BA",
      flightNo: "116",
      classesList: ["F6 A2 J9 C9 D7 T9 Y9", "B9 M9 H9 K9 GL"],
      terminal: "7",
      depTime: "0815",
      arrTime: "2010",
      aircraft: "777",
      duration: "6:55",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "AA",
      flightNo: "100",
      classesList: ["F4 A1 J9 C9 Y9 GL"],
      terminal: "8",
      depTime: "1830",
      arrTime: "0630",
      aircraft: "777",
      duration: "7:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "VS",
      flightNo: "004",
      classesList: ["J9 C9 I9 W9 Y9 GL"],
      terminal: "4",
      depTime: "1900",
      arrTime: "0710",
      aircraft: "350",
      duration: "7:10",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "112",
      classesList: ["F9 A4 J9 C9 Y9 GL"],
      terminal: "7",
      depTime: "2000",
      arrTime: "0805",
      aircraft: "777",
      duration: "7:05",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "DL",
      flightNo: "002",
      classesList: ["J9 C9 D9 Y9 GL"],
      terminal: "4",
      depTime: "2030",
      arrTime: "0845",
      aircraft: "333",
      duration: "7:15",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "VS",
      flightNo: "046",
      classesList: ["J9 C9 I9 W9 Y9 GL"],
      terminal: "4",
      depTime: "2200",
      arrTime: "1005",
      aircraft: "789",
      duration: "7:05",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  // 3. LONDON (LHR/LGW) to AUCKLAND (AKL)
  "LON-AKL": [
    {
      airline: "SQ",
      flightNo: "317",
      classesList: ["F4 A2 J9 C9 D9 Y9 B9", "H9 K9 L9 V9 M9 Q9 GL"],
      terminal: "2",
      depTime: "1125",
      arrTime: "2355",
      aircraft: "388",
      duration: "24:30",
      eticket: "E0",
      stops: 1,
      via: "SIN"
    },
    {
      airline: "EK",
      flightNo: "002",
      classesList: ["F8 A4 J9 C9 D9 Y9 B2", "H9 K9 L0 SL MH GL"],
      terminal: "3",
      depTime: "1420",
      arrTime: "0950",
      aircraft: "380",
      duration: "27:30",
      eticket: "E0",
      stops: 1,
      via: "DXB"
    },
    {
      airline: "NZ",
      flightNo: "002",
      classesList: ["J9 C9 Z4 Y9 B9 T2"],
      terminal: "2",
      depTime: "1615",
      arrTime: "0530",
      aircraft: "777",
      duration: "25:15",
      eticket: "E0",
      stops: 1,
      via: "LAX"
    },
    {
      airline: "QF",
      flightNo: "002",
      classesList: ["F2 A0 J9 C9 Y9 GL"],
      terminal: "3",
      depTime: "2055",
      arrTime: "0915",
      aircraft: "380",
      duration: "24:20",
      eticket: "E0",
      stops: 1,
      via: "SIN"
    },
    {
      airline: "QR",
      flightNo: "008",
      classesList: ["F2 A1 J9 C9 Y9 GL"],
      terminal: "4",
      depTime: "2115",
      arrTime: "0945",
      aircraft: "359",
      duration: "26:30",
      eticket: "E0",
      stops: 1,
      via: "DOH"
    }
  ],
  "AKL-LON": [
    {
      airline: "SQ",
      flightNo: "286",
      classesList: ["F4 A1 J9 C9 D9 Y9 GL"],
      terminal: "I",
      depTime: "1215",
      arrTime: "0610",
      aircraft: "359",
      duration: "25:55",
      eticket: "E0",
      stops: 1,
      via: "SIN"
    },
    {
      airline: "EK",
      flightNo: "413",
      classesList: ["F4 J9 C9 Y9 GL"],
      terminal: "I",
      depTime: "1810",
      arrTime: "1230",
      aircraft: "380",
      duration: "26:20",
      eticket: "E0",
      stops: 1,
      via: "DXB"
    },
    {
      airline: "NZ",
      flightNo: "001",
      classesList: ["J9 C9 Y9 GL"],
      terminal: "I",
      depTime: "1930",
      arrTime: "0615",
      aircraft: "777",
      duration: "24:45",
      eticket: "E0",
      stops: 1,
      via: "LAX"
    },
    {
      airline: "QF",
      flightNo: "001",
      classesList: ["J9 C9 Y9 GL"],
      terminal: "I",
      depTime: "2115",
      arrTime: "0615",
      aircraft: "380",
      duration: "25:00",
      eticket: "E0",
      stops: 1,
      via: "SIN"
    }
  ],
  // 4. LONDON (LHR/LGW) to BANGKOK (BKK)
  "LON-BKK": [
    {
      airline: "TG",
      flightNo: "911",
      classesList: ["F9 A4 J9 C9 D9 Y9 B9", "H9 K9 L9 V9 M9 Q9 GL"],
      terminal: "2",
      depTime: "1150",
      arrTime: "0610",
      aircraft: "77W",
      duration: "11:20",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BR",
      flightNo: "068",
      classesList: ["J9 C9 I4 Y9 B9 K2"],
      terminal: "2",
      depTime: "2135",
      arrTime: "1545",
      aircraft: "77W",
      duration: "11:10",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "TG",
      flightNo: "917",
      classesList: ["F4 J9 C9 Y9 GL"],
      terminal: "2",
      depTime: "2135",
      arrTime: "1600",
      aircraft: "359",
      duration: "11:25",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "EK",
      flightNo: "004",
      classesList: ["F3 J9 C9 Y9 GL"],
      terminal: "3",
      depTime: "2015",
      arrTime: "1230",
      aircraft: "380",
      duration: "11:15",
      eticket: "E0",
      stops: 1,
      via: "DXB"
    }
  ],
  "BKK-LON": [
    {
      airline: "TG",
      flightNo: "910",
      classesList: ["F9 A4 J9 C9 D9 Y9 B9", "H9 K9 L9 V9 M9 Q9 GL"],
      terminal: "I",
      depTime: "0015",
      arrTime: "0720",
      aircraft: "77W",
      duration: "12:05",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BR",
      flightNo: "067",
      classesList: ["J5 C4 Y9 GL"],
      terminal: "I",
      depTime: "1250",
      arrTime: "1925",
      aircraft: "77W",
      duration: "11:35",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "TG",
      flightNo: "916",
      classesList: ["J9 C9 Y9 GL"],
      terminal: "I",
      depTime: "1320",
      arrTime: "2010",
      aircraft: "359",
      duration: "11:50",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  // 5. LONDON (LHR/LGW) to DUBAI (DXB)
  "LON-DXB": [
    {
      airline: "EK",
      flightNo: "008",
      classesList: ["F8 A4 J9 C9 D9 Y9 B9", "H9 K9 L9 V9 M9 Q9 GL"],
      terminal: "3",
      depTime: "0905",
      arrTime: "1905",
      aircraft: "380",
      duration: "7:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "107",
      classesList: ["F4 A1 J9 C9 D9 Y9 GL"],
      terminal: "5",
      depTime: "1240",
      arrTime: "2245",
      aircraft: "777",
      duration: "7:05",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "EK",
      flightNo: "002",
      classesList: ["F9 A4 J9 C9 Y9 GL"],
      terminal: "3",
      depTime: "1420",
      arrTime: "0020",
      aircraft: "380",
      duration: "7:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "VS",
      flightNo: "400",
      classesList: ["J9 C9 Y9 GL"],
      terminal: "3",
      depTime: "1650",
      arrTime: "0255",
      aircraft: "789",
      duration: "7:05",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "EK",
      flightNo: "004",
      classesList: ["F5 J9 C9 Y9 GL"],
      terminal: "3",
      depTime: "2015",
      arrTime: "0615",
      aircraft: "380",
      duration: "7:00",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  "DXB-LON": [
    {
      airline: "EK",
      flightNo: "001",
      classesList: ["F8 J9 Y9 GL"],
      terminal: "3",
      depTime: "0745",
      arrTime: "1225",
      aircraft: "380",
      duration: "7:40",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "108",
      classesList: ["F4 J9 Y9 GL"],
      terminal: "1",
      depTime: "1015",
      arrTime: "1450",
      aircraft: "789",
      duration: "7:35",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "EK",
      flightNo: "003",
      classesList: ["F9 J9 Y9 GL"],
      terminal: "3",
      depTime: "1430",
      arrTime: "1910",
      aircraft: "380",
      duration: "7:40",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  // 6. LONDON (LHR/LGW) to SINGAPORE (SIN)
  "LON-SIN": [
    {
      airline: "SQ",
      flightNo: "317",
      classesList: ["F4 A1 J9 C9 D9 Y9 B9", "H9 K9 L9 V9 M9 Q9 GL"],
      terminal: "2",
      depTime: "1125",
      arrTime: "0730",
      aircraft: "388",
      duration: "13:05",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "011",
      classesList: ["F4 A1 J9 C5 Y9 GL"],
      terminal: "5",
      depTime: "1910",
      arrTime: "1515",
      aircraft: "380",
      duration: "13:05",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "SQ",
      flightNo: "321",
      classesList: ["J9 C9 Y9 GL"],
      terminal: "2",
      depTime: "2205",
      arrTime: "1810",
      aircraft: "777",
      duration: "13:05",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "QF",
      flightNo: "002",
      classesList: ["F2 J9 Y9 GL"],
      terminal: "3",
      depTime: "2055",
      arrTime: "1655",
      aircraft: "380",
      duration: "13:00",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  "SIN-LON": [
    {
      airline: "SQ",
      flightNo: "308",
      classesList: ["F4 J9 Y9 GL"],
      terminal: "3",
      depTime: "0900",
      arrTime: "1540",
      aircraft: "388",
      duration: "13:40",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "SQ",
      flightNo: "318",
      classesList: ["J9 Y9 GL"],
      terminal: "3",
      depTime: "1910",
      arrTime: "0155",
      aircraft: "777",
      duration: "13:45",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "012",
      classesList: ["F4 J9 Y9 GL"],
      terminal: "1",
      depTime: "2315",
      arrTime: "0550",
      aircraft: "380",
      duration: "13:35",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  // 7. PARIS (CDG/ORY) to NEW YORK (JFK)
  "PAR-NYC": [
    {
      airline: "AF",
      flightNo: "006",
      classesList: ["F4 J9 C9 Y9 GL"],
      terminal: "2E",
      depTime: "1410",
      arrTime: "1630",
      aircraft: "777",
      duration: "8:20",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "DL",
      flightNo: "263",
      classesList: ["J9 Y9 GL"],
      terminal: "2E",
      depTime: "1500",
      arrTime: "1725",
      aircraft: "333",
      duration: "8:25",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  "NYC-PAR": [
    {
      airline: "AF",
      flightNo: "007",
      classesList: ["F4 J9 Y9 GL"],
      terminal: "1",
      depTime: "1930",
      arrTime: "0845",
      aircraft: "777",
      duration: "7:15",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  // 8. SINGAPORE (SIN) to SYDNEY (SYD)
  "SIN-SYD": [
    {
      airline: "SQ",
      flightNo: "231",
      classesList: ["F4 A1 J9 C5 Y9 GL"],
      terminal: "3",
      depTime: "0045",
      arrTime: "1025",
      aircraft: "388",
      duration: "7:40",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "QF",
      flightNo: "082",
      classesList: ["J9 Y9 GL"],
      terminal: "1",
      depTime: "1930",
      arrTime: "0510",
      aircraft: "333",
      duration: "7:40",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "SQ",
      flightNo: "211",
      classesList: ["J9 Y9 GL"],
      terminal: "3",
      depTime: "1030",
      arrTime: "2015",
      aircraft: "777",
      duration: "7:45",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  "SYD-SIN": [
    {
      airline: "SQ",
      flightNo: "212",
      classesList: ["F2 J9 Y9 GL"],
      terminal: "1",
      depTime: "0815",
      arrTime: "1415",
      aircraft: "388",
      duration: "8:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "QF",
      flightNo: "081",
      classesList: ["J9 Y9 GL"],
      terminal: "1",
      depTime: "1230",
      arrTime: "1845",
      aircraft: "333",
      duration: "8:15",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  // 9. NEW YORK (JFK) to LOS ANGELES (LAX)
  "NYC-LAX": [
    {
      airline: "AA",
      flightNo: "001",
      classesList: ["F10 A4 J18 C12 I8 Y22", "B15 M15 H15 K9 GL"],
      terminal: "8",
      depTime: "0900",
      arrTime: "1210",
      aircraft: "321",
      duration: "6:10",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "DL",
      flightNo: "542",
      classesList: ["J9 C9 Y9 GL"],
      terminal: "4",
      depTime: "1100",
      arrTime: "1415",
      aircraft: "767",
      duration: "6:15",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "B6",
      flightNo: "523",
      classesList: ["J9 Y9 GL"],
      terminal: "5",
      depTime: "1530",
      arrTime: "1845",
      aircraft: "321",
      duration: "6:15",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  "LAX-NYC": [
    {
      airline: "AA",
      flightNo: "002",
      classesList: ["F10 J18 Y22 GL"],
      terminal: "B",
      depTime: "0830",
      arrTime: "1650",
      aircraft: "321",
      duration: "5:20",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  // 10. LONDON (LHR/LGW) to ATHENS (ATH)
  "LON-ATH": [
    {
      airline: "BA",
      flightNo: "631",
      classesList: ["J9 C9 D9 R9 I9 Y9 B9", "H9 K9 M9 L9 V9 S9 GL"],
      terminal: "5",
      depTime: "0815",
      arrTime: "1010",
      aircraft: "767",
      duration: "3:55",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "A3",
      flightNo: "602",
      classesList: ["C4 D4 Z3 A2 I2 RL Y9", "B9 M9 H9 Q9 V9 WL O8 LL KL JL SL EL TL UL PL GR N5 X1 FL"],
      terminal: "1",
      depTime: "0850",
      arrTime: "1050",
      aircraft: "321",
      duration: "4:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "A3",
      flightNo: "BD6002",
      classesList: ["C4 D4 J4 Y4 S4 B4 K4", "M4 H4"],
      terminal: "1",
      depTime: "0850",
      arrTime: "1050",
      aircraft: "321",
      duration: "4:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "OA",
      flightNo: "259",
      classesList: ["C4 J4 D4 ZL Y7 M7 L7", "N7 S7 K7 Q1"],
      terminal: "4",
      depTime: "0915",
      arrTime: "1115",
      aircraft: "320",
      duration: "4:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "OA",
      flightNo: "269",
      classesList: ["C4 J2 D2 ZL Y7 M7 L7", "N7 K7"],
      terminal: "4",
      depTime: "1330",
      arrTime: "1530",
      aircraft: "320",
      duration: "4:00",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "639",
      classesList: ["J9 C9 D9 R9 Y9 B9 H9", "K9 M9 L6 GL"],
      terminal: "5",
      depTime: "1340",
      arrTime: "1535",
      aircraft: "320",
      duration: "3:55",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "U2",
      flightNo: "5086",
      classesList: ["YA"],
      terminal: "S",
      depTime: "1440",
      arrTime: "1625",
      aircraft: "319",
      duration: "3:45",
      eticket: "T0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "641",
      classesList: ["J9 C9 D9 R9 I7 Y9 B9", "H9 K9 M9 L9 GL"],
      terminal: "5",
      depTime: "1510",
      arrTime: "1700",
      aircraft: "320",
      duration: "3:50",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "BA",
      flightNo: "JL5162",
      classesList: ["C9 J9 D9 X0 Y9 B9 H9", "K9 M0 L9 V0 S0 N0 Q9 O0 G0"],
      terminal: "5",
      depTime: "1510",
      arrTime: "1700",
      aircraft: "320",
      duration: "3:50",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  "ATH-LON": [
    {
      airline: "BA",
      flightNo: "632",
      classesList: ["J9 C9 Y9 GL"],
      terminal: "I",
      depTime: "1155",
      arrTime: "1350",
      aircraft: "767",
      duration: "3:55",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  // 11. HELSINKI (HEL) to TOKYO (NRT/HND)
  "HEL-TYO": [
    {
      airline: "AY",
      flightNo: "073",
      classesList: ["J9 C9 D9 R9 I9 Y9 B9", "H9 K9 M9 L9 V9 S9 N9 Q9 O1"],
      terminal: "2",
      depTime: "1745",
      arrTime: "2310",
      aircraft: "359",
      duration: "9:25",
      eticket: "E0",
      stops: 0,
      via: ""
    },
    {
      airline: "JL",
      flightNo: "414",
      classesList: ["J9 C9 D9 X4 Y9 B9 H4", "K4 M4 L4 V4 S2 N1 Q1"],
      terminal: "2",
      depTime: "1930",
      arrTime: "0115",
      aircraft: "789",
      duration: "9:45",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ],
  "TYO-HEL": [
    {
      airline: "AY",
      flightNo: "074",
      classesList: ["J9 C9 D9 R9 I9 Y9 B9", "H9 K9 M9 L9 V9 S9 N9 Q9 O1"],
      terminal: "2",
      depTime: "1030",
      arrTime: "1615",
      aircraft: "359",
      duration: "9:45",
      eticket: "E0",
      stops: 0,
      via: ""
    }
  ]
};

// Help look up if high-fidelity data is available for requested origin/dest or co-terminals
export function getScrapedGoogleFlights(origin: string, destination: string): Omit<FlightTemplate, "origin" | "destination">[] | null {
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();

  // Co-terminal matching helper mapping
  const groupMapping: Record<string, string> = {
    // London
    LHR: "LON", LGW: "LON", STN: "LON", LCY: "LON", LON: "LON",
    // New York
    JFK: "NYC", EWR: "NYC", LGA: "NYC", NYC: "NYC",
    // Paris
    CDG: "PAR", ORY: "PAR", PAR: "PAR",
    // Tokyo
    HND: "TYO", NRT: "TYO", TYO: "TYO",
    // Singapore
    SIN: "SIN",
    // Bangkok
    BKK: "BKK",
    // Auckland
    AKL: "AKL",
    // Sydney
    SYD: "SYD",
    // Athens
    ATH: "ATH"
  };

  const keyO = groupMapping[o] || o;
  const keyD = groupMapping[d] || d;

  const exactKey = `${keyO}-${keyD}`;
  const scrapedList = GOOGLE_FLIGHTS_DATA[exactKey];

  if (scrapedList) {
    return scrapedList;
  }
  return null;
}
