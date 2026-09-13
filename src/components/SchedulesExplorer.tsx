import React, { useState, useEffect } from "react";
import { Plane, Search, Copy, Check, Terminal, Calendar, ArrowRight, HelpCircle } from "lucide-react";
import { generateMockFlights } from "../lib/gdsEngine";

interface SchedulesExplorerProps {
  selectedGds: "amadeus" | "sabre" | "galileo";
  onExecuteCommand: (cmd: string) => void;
}

const AIRPORTS = [
  { code: "LHR", city: "London", country: "United Kingdom", desc: "Heathrow Airport" },
  { code: "JFK", city: "New York", country: "United States", desc: "John F. Kennedy Intl" },
  { code: "HND", city: "Tokyo", country: "Japan", desc: "Haneda Airport" },
  { code: "HEL", city: "Helsinki", country: "Finland", desc: "Helsinki-Vantaa Airport" },
  { code: "SIN", city: "Singapore", country: "Singapore", desc: "Changi Airport" },
  { code: "BKK", city: "Bangkok", country: "Thailand", desc: "Suvarnabhumi Airport" },
  { code: "AMS", city: "Amsterdam", country: "Netherlands", desc: "Schiphol Airport" },
  { code: "CDG", city: "Paris", country: "France", desc: "Charles de Gaulle" },
  { code: "DXB", city: "Dubai", country: "United Arab Emirates", desc: "Dubai International" },
  { code: "ATH", city: "Athens", country: "Greece", desc: "Eleftherios Venizelos" },
];

const PRESETS = [
  { origin: "LHR", destination: "JFK", label: "London to New York", desc: "High-Fidelity BA/VS/AA/DL schedule" },
  { origin: "HND", destination: "HEL", label: "Tokyo to Helsinki", desc: "Siberian Corridor AY Route" },
  { origin: "LHR", destination: "BKK", label: "London to Bangkok", desc: "TG/EK long-haul airline flights" },
  { origin: "LHR", destination: "SIN", label: "London to Singapore", desc: "SQ/BA Kangaroo Route segments" },
];

const AIRLINE_NAMES: Record<string, string> = {
  BA: "British Airways",
  VS: "Virgin Atlantic",
  AA: "American Airlines",
  DL: "Delta Air Lines",
  AY: "Finnair",
  SQ: "Singapore Airlines",
  TG: "Thai Airways",
  EK: "Emirates",
  QR: "Qatar Airways",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM Royal Dutch",
  A3: "Aegean Airlines",
  OA: "Olympic Air",
  AZ: "ITA Airways",
  UA: "United Airlines",
};

export default function SchedulesExplorer({ selectedGds, onExecuteCommand }: SchedulesExplorerProps) {
  const [origin, setOrigin] = useState("LHR");
  const [destination, setDestination] = useState("JFK");
  const [dateStr, setDateStr] = useState("15OCT");
  const [flights, setFlights] = useState<any[]>([]);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Generate appropriate command for the selected GDS
  const getGdsCommand = (orgCode: string, destCode: string, dStr: string) => {
    const d = dStr.toUpperCase();
    const o = orgCode.toUpperCase();
    const dst = destCode.toUpperCase();
    
    if (selectedGds === "amadeus") {
      return `AN${d}${o}${dst}`;
    } else if (selectedGds === "sabre") {
      return `A${d}${o}${dst}`;
    } else { // galileo
      return `A${d}${o}${dst}`;
    }
  };

  const currentCommand = getGdsCommand(origin, destination, dateStr);

  useEffect(() => {
    try {
      const generated = generateMockFlights(dateStr, origin, destination);
      setFlights(generated || []);
    } catch (err) {
      console.error("Error generating mock flights in SchedulesExplorer", err);
    }
  }, [origin, destination, dateStr]);

  const handlePresetClick = (o: string, d: string) => {
    setOrigin(o);
    setDestination(d);
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleRunCommand = (cmd: string) => {
    onExecuteCommand(cmd);
  };

  return (
    <div className="bg-white border-2 border-slate-200 p-6 md:p-8 rounded-2xl flex flex-col gap-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100 shrink-0">
            <Plane className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black uppercase tracking-wider text-slate-800 font-display flex items-center gap-2">
              Realistic Flight Schedules (Not Live)
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-cyan-100 text-cyan-700 font-sans border border-cyan-200 uppercase tracking-widest scale-95">
                Schedule Engine
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Query off-line airline routes and display structural timetable blocks. Learn exact GDS Cryptic command translations in real-time.
            </p>
          </div>
        </div>

        {/* Dynamic Command Preview Box */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 px-4 font-mono text-xs self-start lg:self-auto shrink-0 shadow-xs">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-sans">Command:</span>
          <code className="font-bold text-cyan-750 text-cyan-600 bg-cyan-50 px-2 py-1 rounded border border-cyan-100 tracking-wider">
            {currentCommand}
          </code>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => handleCopyCommand(currentCommand)}
              className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Copy GDS Availability Command"
            >
              {copiedCmd === currentCommand ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => handleRunCommand(currentCommand)}
              className="p-1.5 px-3 bg-cyan-500 hover:bg-slate-800 text-slate-950 hover:text-white rounded-lg font-sans font-extrabold text-[11px] uppercase tracking-wider transition-all duration-200 flex items-center gap-1 cursor-pointer active:scale-95"
              title="Run Availability command in active terminal screen"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Run in Terminal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Routes Grid */}
      <div>
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2 font-sans">
          🌍 Quick Hot-Routes Presets:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESETS.map((p) => {
            const isSelected = origin === p.origin && destination === p.destination;
            return (
              <button
                key={`${p.origin}-${p.destination}`}
                type="button"
                onClick={() => handlePresetClick(p.origin, p.destination)}
                className={`text-left p-3 rounded-xl border transition-all duration-250 cursor-pointer flex flex-col justify-between h-20 active:scale-[0.98] ${
                  isSelected
                    ? "bg-cyan-50/50 border-cyan-300 shadow-xs ring-2 ring-cyan-100"
                    : "bg-slate-50 hover:bg-slate-100/70 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide font-sans">
                    {p.label}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-cyan-600">
                    {p.origin}➔{p.destination}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans leading-normal block">
                  {p.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Route Selector Panel */}
      <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        {/* Origin Airport Select */}
        <div className="flex flex-col gap-1.5 font-sans">
          <label htmlFor="origin-select" className="text-[11px] font-black text-slate-500 uppercase tracking-wider pl-1">
            Departing Airport (Origin)
          </label>
          <select
            id="origin-select"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full bg-white border-2 border-slate-250 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-705 text-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 cursor-pointer"
          >
            {AIRPORTS.map((a) => (
              <option key={a.code} value={a.code} disabled={a.code === destination}>
                {a.code} - {a.city} ({a.country})
              </option>
            ))}
          </select>
        </div>

        {/* Destination Airport Select */}
        <div className="flex flex-col gap-1.5 font-sans">
          <label htmlFor="dest-select" className="text-[11px] font-black text-slate-500 uppercase tracking-wider pl-1">
            Arriving Airport (Destination)
          </label>
          <select
            id="dest-select"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full bg-white border-2 border-slate-250 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-705 text-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 cursor-pointer"
          >
            {AIRPORTS.map((a) => (
              <option key={a.code} value={a.code} disabled={a.code === origin}>
                {a.code} - {a.city} ({a.country})
              </option>
            ))}
          </select>
        </div>

        {/* Departure Date Input */}
        <div className="flex flex-col gap-1.5 font-sans">
          <label htmlFor="date-select" className="text-[11px] font-black text-slate-500 uppercase tracking-wider pl-1">
            Timetable Date
          </label>
          <div className="relative">
            <select
              id="date-select"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-white border-2 border-slate-250 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-705 text-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 cursor-pointer"
            >
              <option value="15OCT">15 Oct (Autumn Season Peak)</option>
              <option value="05NOV">05 Nov (Late Season Low)</option>
              <option value="12DEC">12 Dec (Holiday Winter Peak)</option>
              <option value="18JAN">18 Jan (Post-New Year low)</option>
              <option value="14MAR">14 Mar (Spring-Break Season)</option>
              <option value="13MAY">13 May (Early Summer Peak)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flight timetable result listing */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 font-sans">
          <span>Available Timetable Block ({flights.length} flights found)</span>
          <span>Schedules generated with deterministic integrity</span>
        </div>

        {flights.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 text-center py-10 rounded-2xl font-sans font-semibold text-sm">
            No flight schedules available for this route pairing.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flights.map((f, idx) => {
              const airlineName = AIRLINE_NAMES[f.airline] || f.airline;
              const formattedTime = (t: string) => {
                if (t.length === 4) {
                  return `${t.slice(0, 2)}:${t.slice(2)}`;
                }
                return t;
              };

              // Color coordinate based on carrier
              const getCarrierBadge = (code: string) => {
                const map: Record<string, string> = {
                  BA: "bg-blue-50 text-blue-700 border-blue-200",
                  VS: "bg-red-50 text-red-700 border-red-200",
                  AA: "bg-slate-100 text-slate-700 border-slate-350",
                  DL: "bg-sky-50 text-sky-700 border-sky-200",
                  AY: "bg-indigo-50 text-indigo-700 border-indigo-200",
                  SQ: "bg-amber-50 text-amber-800 border-amber-200",
                  TG: "bg-purple-50 text-purple-700 border-purple-200",
                  EK: "bg-rose-50 text-rose-700 border-rose-200",
                };
                return map[code] || "bg-slate-50 text-slate-600 border-slate-200";
              };

              return (
                <div
                  key={idx}
                  className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-cyan-400 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all duration-300 relative group"
                >
                  <div className="flex items-start justify-between">
                    {/* Carrier Info */}
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-1 text-[11px] font-black tracking-widest rounded border font-mono uppercase ${getCarrierBadge(f.airline)}`}>
                        {f.airline} {f.flightNo}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 font-sans">
                          {airlineName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans font-medium">
                          Aircraft: {f.aircraft} • Terminal {f.terminal || "1"}
                        </span>
                      </div>
                    </div>

                    {/* Stops Indicator */}
                    <div className="text-right flex flex-col">
                      <span className={`text-[10px] font-black tracking-widest uppercase font-sans ${f.stops > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {f.stops > 0 ? `${f.stops} STOP` : "NON-STOP"}
                      </span>
                      {f.stops > 0 && f.via && (
                        <span className="text-[9px] text-slate-400 font-mono font-bold">
                          VIA {f.via}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Core Timings & Route visual */}
                  <div className="border-t border-slate-100 pt-2 pb-1.5 flex items-center justify-between">
                    {/* Departure */}
                    <div className="flex flex-col">
                      <span className="font-mono text-base font-black text-slate-800">
                        {formattedTime(f.depTime)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase font-sans">
                        {f.origin} Airport
                      </span>
                    </div>

                    {/* Duration connector line */}
                    <div className="flex-1 px-4 flex flex-col items-center justify-center relative">
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {f.duration} hr
                      </span>
                      <div className="w-full h-[1px] bg-slate-300 relative my-1">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white p-0.5 border border-slate-300 rounded-full">
                          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    {/* Arrival */}
                    <div className="flex flex-col text-right">
                      <span className="font-mono text-base font-black text-slate-800">
                        {formattedTime(f.arrTime)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase font-sans">
                        {f.destination} Airport
                      </span>
                    </div>
                  </div>

                  {/* Class Cabin Seats string and click-to-book */}
                  <div className="bg-slate-200/40 hover:bg-slate-200/60 rounded-lg p-2 flex items-center justify-between border border-slate-200/20 font-mono text-[10px] text-slate-600 transition-all duration-200">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-sans font-black uppercase text-slate-400 tracking-wider">
                        Available Cabin Classes (Seats Available):
                      </span>
                      <span className="font-black text-slate-700 tracking-wider whitespace-nowrap text-xs">
                        {f.classes}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        // Let's generate a command to book a seat on this flight!
                        // In GDS, e.g. SS1Y1 means Sell Segment 1, Cabin class Y, seat count 1.
                        // Wait, a student needs to first sell from availability. They can type SS [line] [class] [seats].
                        // Let's give them the exact booking command as a helpful tip!
                        const classChar = f.classes.split(" ")[0]?.charAt(0) || "Y";
                        const sellCmd = `SS${f.line}${classChar}1`;
                        onExecuteCommand(sellCmd);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-650 hover:bg-slate-800 text-slate-700 hover:text-white rounded border border-slate-250 font-sans font-black uppercase tracking-wider text-[9px] transition-colors cursor-pointer select-none"
                      title="Auto-book seat on this specific flight using Sell Segment (SS) command"
                    >
                      Book 1 Seat
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helpful timetabling tutorial footer */}
      <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1 text-xs text-slate-600 font-sans">
          <span className="font-extrabold text-slate-800 uppercase tracking-wider">
            💡 GDS Scheduling Availability Guide
          </span>
          <p className="leading-relaxed">
            In standard GDS booking systems, flight timetables and seat maps are queried using the Availability command. 
            Once you type <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-850 font-semibold">{currentCommand}</code>, the terminal generates an active screen list. 
            You can then book a specific segment directly using the Sell Segment command (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-850 font-semibold">SS1Y2</code> for selling 2 seats in Economy on line 1).
          </p>
        </div>
      </div>
    </div>
  );
}
