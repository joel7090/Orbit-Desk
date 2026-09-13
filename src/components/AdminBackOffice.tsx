import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Sparkles, 
  RefreshCw, 
  Search, 
  Share2, 
  Check, 
  Info, 
  ArrowLeft, 
  Settings, 
  Layout, 
  Play, 
  BookOpen, 
  Code 
} from "lucide-react";

interface Rule {
  id: string;
  title: string;
  gds: string;
  keywords: string;
  expectedCommand: string;
  commandDescription: string;
  terminalOutput: string;
  topic?: string;
  pnrRequired?: boolean;
  appendPnrLine?: boolean;
  pnrLineTemplate?: string;
  pnrLinePosition?: "top" | "middle" | "bottom";
}

interface AdminBackOfficeProps {
  onBackToSimulator: () => void;
  onRefreshGlobalRules?: () => void;
  onRefreshRouteRules?: () => void;
}

export default function AdminBackOffice({ onBackToSimulator, onRefreshGlobalRules, onRefreshRouteRules }: AdminBackOfficeProps) {
  // DB States
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gdsFilter, setGdsFilter] = useState<string>("all");

  // Route Configuration States
  const [activeAdminTab, setActiveAdminTab] = useState<"overrides" | "routes">("overrides");
  const [routeConfig, setRouteConfig] = useState<any>({
    groupCities: { "LON": ["LHR", "LGW", "STN"] },
    destinationRules: []
  });
  const [routeIsLoading, setRouteIsLoading] = useState(false);

  // Router Form fields
  const [editingDestRuleIdx, setEditingDestRuleIdx] = useState<number | null>(null);
  const [routeDest, setRouteDest] = useState("");
  const [routeAirlines, setRouteAirlines] = useState<any[]>([
    { airline: "", isDirect: true, via: "", allowedOrigins: "" }
  ]);

  // Group city editor inputs
  const [groupCodeInput, setGroupCodeInput] = useState("");
  const [groupAirportsInput, setGroupAirportsInput] = useState("");
  
  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formGds, setFormGds] = useState("amadeus");
  const [formExpectedCommand, setFormExpectedCommand] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formTopic, setFormTopic] = useState("Custom Overrides");
  const [formTerminalOutput, setFormTerminalOutput] = useState("");
  const [formPnrRequired, setFormPnrRequired] = useState(false);
  const [formAppendPnrLine, setFormAppendPnrLine] = useState(false);
  const [formPnrLineTemplate, setFormPnrLineTemplate] = useState("");
  const [formPnrLinePosition, setFormPnrLinePosition] = useState<"top" | "middle" | "bottom">("bottom");

  // Sandbox Terminal States
  const [sandboxGds, setSandboxGds] = useState<"amadeus" | "sabre" | "galileo">("amadeus");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    "*** ORBIT DESK BACK OFFICE TERMINAL v4.28 ***",
    "SYSTEM STATUS: ADMIN PRIVILEGES ACTIVE",
    "GDS MODE: AMADEUS DIRECT CRADLE LINK",
    "TYPE GDS COMMAND WITH THE ARROW BUTTON OR PRESS ENTER TO RETRIEVE OVERRIDES.",
    "> "
  ]);
  const [crtTheme, setCrtTheme] = useState<"green" | "cyan" | "gold">("green");

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Load Rules on mount
  useEffect(() => {
    fetchRules();
    fetchRouteRules();
  }, []);

  const fetchRouteRules = async () => {
    setRouteIsLoading(true);
    try {
      const res = await fetch("/api/route-rules");
      if (res.ok) {
        const data = await res.json();
        setRouteConfig(data);
      }
    } catch (err) {
      console.error("Error loading route rules:", err);
    } finally {
      setRouteIsLoading(false);
    }
  };

  const handleSaveRouteRules = async (updatedConfig: any) => {
    try {
      const res = await fetch("/api/route-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      if (res.ok) {
        const responseData = await res.json();
        setRouteConfig(responseData.rules);
        if (onRefreshRouteRules) {
          onRefreshRouteRules();
        }
        return true;
      }
    } catch (error) {
      console.error("Error storing route rules:", error);
    }
    return false;
  };

  // Save or edit a destination rule
  const handleSaveDestRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeDest) return;

    const formattedAirlines = routeAirlines
      .filter(a => a.airline && a.airline.trim().length > 0)
      .map(a => ({
        airline: a.airline.toUpperCase().trim(),
        isDirect: !!a.isDirect,
        via: a.isDirect ? "" : (a.via ? a.via.toUpperCase().trim() : ""),
        allowedOrigins: a.allowedOrigins
          ? a.allowedOrigins.split(",").map((o: string) => o.trim().toUpperCase()).filter(Boolean)
          : []
      }));

    if (formattedAirlines.length === 0) {
      alert("Please add at least one airline for this destination.");
      return;
    }

    const currentRules = [...(routeConfig.destinationRules || [])];
    const newRule = {
      destination: routeDest.toUpperCase().trim(),
      airlines: formattedAirlines
    };

    if (editingDestRuleIdx !== null) {
      currentRules[editingDestRuleIdx] = newRule;
    } else {
      // Check if already exists, then substitute or add
      const existingIdx = currentRules.findIndex(r => r.destination.toUpperCase() === newRule.destination);
      if (existingIdx >= 0) {
        currentRules[existingIdx] = newRule;
      } else {
        currentRules.push(newRule);
      }
    }

    const nextConfig = {
      ...routeConfig,
      destinationRules: currentRules
    };

    const success = await handleSaveRouteRules(nextConfig);
    if (success) {
      // Reset form
      setRouteDest("");
      setRouteAirlines([{ airline: "", isDirect: true, via: "", allowedOrigins: "" }]);
      setEditingDestRuleIdx(null);
      appendTerminalLine(`\n[ADMIN_CONSOLE] Saved routing rule for destination: ${newRule.destination}`);
    }
  };

  const handleEditDestRuleClick = (idx: number) => {
    const rule = routeConfig.destinationRules[idx];
    setEditingDestRuleIdx(idx);
    setRouteDest(rule.destination);
    setRouteAirlines(rule.airlines.map((a: any) => ({
      airline: a.airline,
      isDirect: a.isDirect,
      via: a.via || "",
      allowedOrigins: a.allowedOrigins ? a.allowedOrigins.join(", ") : ""
    })));
  };

  const handleDeleteDestRule = async (idx: number) => {
    const currentRules = [...(routeConfig.destinationRules || [])];
    const targetDest = currentRules[idx]?.destination;
    currentRules.splice(idx, 1);

    const nextConfig = {
      ...routeConfig,
      destinationRules: currentRules
    };

    const success = await handleSaveRouteRules(nextConfig);
    if (success) {
      appendTerminalLine(`\n[ADMIN_CONSOLE] Deleted destination routing rule for: ${targetDest}`);
    }
  };

  const handleAddAirlineRow = () => {
    if (routeAirlines.length >= 5) {
      alert("You can assign up to 5 airlines per destination.");
      return;
    }
    setRouteAirlines([...routeAirlines, { airline: "", isDirect: true, via: "", allowedOrigins: "" }]);
  };

  const handleRemoveAirlineRow = (idx: number) => {
    const nextList = [...routeAirlines];
    nextList.splice(idx, 1);
    setRouteAirlines(nextList);
  };

  const handleUpdateAirlineRow = (idx: number, fields: any) => {
    const nextList = [...routeAirlines];
    nextList[idx] = { ...nextList[idx], ...fields };
    setRouteAirlines(nextList);
  };

  // Group city mapping
  const handleAddGroupCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupCodeInput || !groupAirportsInput) return;

    const parts = groupAirportsInput.split(",").map(p => p.trim().toUpperCase()).filter(Boolean);
    if (parts.length === 0) return;

    const nextGroupCities = {
      ...(routeConfig.groupCities || {}),
      [groupCodeInput.toUpperCase().trim()]: parts
    };

    const nextConfig = {
      ...routeConfig,
      groupCities: nextGroupCities
    };

    const success = await handleSaveRouteRules(nextConfig);
    if (success) {
      setGroupCodeInput("");
      setGroupAirportsInput("");
      appendTerminalLine(`\n[ADMIN_CONSOLE] Created group airport mapping for: ${groupCodeInput.toUpperCase().trim()}`);
    }
  };

  const handleDeleteGroupCity = async (code: string) => {
    const nextGroupCities = { ...(routeConfig.groupCities || {}) };
    delete nextGroupCities[code];

    const nextConfig = {
      ...routeConfig,
      groupCities: nextGroupCities
    };

    const success = await handleSaveRouteRules(nextConfig);
    if (success) {
      appendTerminalLine(`\n[ADMIN_CONSOLE] Removed group airport mapping: ${code}`);
    }
  };

  // Sync sandbox GDS when form GDS changes
  useEffect(() => {
    if (formGds === "amadeus" || formGds === "sabre" || formGds === "galileo") {
      setSandboxGds(formGds as any);
      appendTerminalLine(`\n* SWITCHING TERMINAL MODULE LINK TO ${formGds.toUpperCase()}...`);
    }
  }, [formGds]);

  // Scroll to bottom of admin terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalHistory]);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/model-memory");
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error("Error loading rules:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRule = (rule: Rule) => {
    setEditingId(rule.id);
    setFormTitle(rule.title);
    setFormGds(rule.gds);
    setFormExpectedCommand(rule.expectedCommand);
    setFormDescription(rule.commandDescription);
    setFormKeywords(rule.keywords);
    setFormTopic(rule.topic || "Custom Overrides");
    setFormTerminalOutput(rule.terminalOutput);
    setFormPnrRequired(!!rule.pnrRequired);
    setFormAppendPnrLine(!!rule.appendPnrLine);
    setFormPnrLineTemplate(rule.pnrLineTemplate || "");
    setFormPnrLinePosition(rule.pnrLinePosition || "bottom");

    // Auto load rule command in sandbox terminal
    appendTerminalLine(`\n[ADMIN_CONSOLE] Loaded Rule: "${rule.title}"`);
    appendTerminalLine(`Type command "${rule.expectedCommand}" into the admin terminal to inspect output.`);
  };

  const handleClearForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormGds("amadeus");
    setFormExpectedCommand("");
    setFormDescription("");
    setFormKeywords("");
    setFormTopic("Custom Overrides");
    setFormTerminalOutput("");
    setFormPnrRequired(false);
    setFormAppendPnrLine(false);
    setFormPnrLineTemplate("");
    setFormPnrLinePosition("bottom");
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this custom grounding entry? This action is irreversible.")) return;

    try {
      const res = await fetch(`/api/model-memory/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== id));
        if (editingId === id) {
          handleClearForm();
        }
        appendTerminalLine(`\n[DATABASE] Successfully deleted grounding rule ID: ${id}`);
        if (onRefreshGlobalRules) onRefreshGlobalRules();
      } else {
        alert("Failed to delete rule from backend database.");
      }
    } catch (err) {
      console.error("Error deleting rule:", err);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim() || !formExpectedCommand.trim() || !formDescription.trim() || !formKeywords.trim() || !formTerminalOutput.trim()) {
      alert("All rules must possess a completed Title, Expected Trigger Command, Description, Keywords, and simulated Terminal CRT Output.");
      return;
    }

    const payload = {
      title: formTitle.trim(),
      gds: formGds,
      keywords: formKeywords.trim(),
      expectedCommand: formExpectedCommand.trim().toUpperCase(),
      commandDescription: formDescription.trim(),
      terminalOutput: formTerminalOutput,
      topic: formTopic.trim(),
      pnrRequired: formPnrRequired,
      appendPnrLine: formAppendPnrLine,
      pnrLineTemplate: formPnrLineTemplate.trim(),
      pnrLinePosition: formPnrLinePosition
    };

    setIsLoading(true);
    try {
      if (editingId) {
        // PUT update
        const res = await fetch(`/api/model-memory/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const updated = await res.json();
          setRules(prev => prev.map(r => r.id === editingId ? updated : r));
          appendTerminalLine(`\n[DATABASE SUCCESS] Rule "${formTitle}" updated securely.`);
          handleClearForm();
          if (onRefreshGlobalRules) onRefreshGlobalRules();
        } else {
          alert("Failed to commit rule edits to custom database.");
        }
      } else {
        // POST create
        const res = await fetch("/api/model-memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const added = await res.json();
          setRules(prev => [...prev, added]);
          appendTerminalLine(`\n[DATABASE SUCCESS] Live Grounding Rule Created: ${formTitle}`);
          handleClearForm();
          if (onRefreshGlobalRules) onRefreshGlobalRules();
        } else {
          alert("Failed to create rule.");
        }
      }
    } catch (err) {
      console.error("Error saving rule database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to add lines inside the Admin Terminal
  const appendTerminalLine = (text: string) => {
    setTerminalHistory(prev => [...prev, text]);
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = terminalInput.trim();
    if (!query) return;

    setTerminalInput("");
    const promptChar = sandboxGds === "amadeus" || sandboxGds === "galileo" ? "> " : "* ";
    appendTerminalLine(`${promptChar}${query}`);

    // Match this command in the rules (both saved database and current unsaved editor!)
    const queryUpper = query.toUpperCase();
    const queryNoSpace = queryUpper.replace(/\s+/g, "");
    
    let databaseMatch: any = null;
    let capturedFreeText = "";

    // Check saved rules
    for (const r of rules) {
      if (r.gds !== sandboxGds) continue;
      const expectedUpper = r.expectedCommand.trim().toUpperCase();
      const expectedNoSpace = expectedUpper.replace(/\s+/g, "");
      
      if (expectedUpper === queryUpper || expectedNoSpace === queryNoSpace) {
        databaseMatch = r;
        break;
      }

      const placeholderRegex = /\{FREE\s+TEXT\}|\{FREE_TEXT\}|\{TEXT\}|\[FREE\s+TEXT\]|\[FREE_TEXT\]/gi;
      if (placeholderRegex.test(expectedUpper)) {
        const segments = expectedUpper.split(placeholderRegex);
        const escapedSegments = segments.map(seg => seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regexStr = "^" + escapedSegments.join("(.*)") + "$";
        const regex = new RegExp(regexStr);
        const match = queryUpper.match(regex);
        if (match) {
          databaseMatch = r;
          capturedFreeText = match.slice(1).join(" ").trim();
          break;
        }

        if (segments[0] && segments[0].trim().length > 1) {
          const prefixNoSpace = segments[0].replace(/\s+/g, "");
          if (queryNoSpace.startsWith(prefixNoSpace)) {
            databaseMatch = r;
            const rawPrefixLen = segments[0].length;
            capturedFreeText = query.substring(rawPrefixLen).trim().toUpperCase();
            break;
          }
        }
      }
    }

    const placeholderRegex = /\{FREE\s+TEXT\}|\{FREE_TEXT\}|\{TEXT\}|\[FREE\s+TEXT\]|\[FREE_TEXT\]/gi;
    const isEditingMatchDirect = formExpectedCommand.trim().toUpperCase() === queryUpper && formGds === sandboxGds;
    let isEditingMatchWithPlaceholder = false;
    let editingCapturedFreeText = "";

    if (!isEditingMatchDirect && formGds === sandboxGds) {
      const formExpectedUpper = formExpectedCommand.trim().toUpperCase();
      if (placeholderRegex.test(formExpectedUpper)) {
        const segments = formExpectedUpper.split(placeholderRegex);
        const escapedSegments = segments.map(seg => seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regexStr = "^" + escapedSegments.join("(.*)") + "$";
        const regex = new RegExp(regexStr);
        const match = queryUpper.match(regex);
        if (match) {
          isEditingMatchWithPlaceholder = true;
          editingCapturedFreeText = match.slice(1).join(" ").trim();
        } else if (segments[0] && segments[0].trim().length > 1) {
          const prefixNoSpace = segments[0].replace(/\s+/g, "");
          if (queryNoSpace.startsWith(prefixNoSpace)) {
            isEditingMatchWithPlaceholder = true;
            const rawPrefixLen = segments[0].length;
            editingCapturedFreeText = query.substring(rawPrefixLen).trim().toUpperCase();
          }
        }
      }
    }

    const isEditingMatch = isEditingMatchDirect || isEditingMatchWithPlaceholder;
    
    if (isEditingMatch) {
      let finalTerminalOutput = formTerminalOutput;
      let finalDescription = formDescription || "No description written yet";
      let pnrLineTemplateAppended = formPnrLineTemplate || "";

      if (isEditingMatchWithPlaceholder && editingCapturedFreeText) {
        finalTerminalOutput = finalTerminalOutput.replace(placeholderRegex, editingCapturedFreeText);
        finalDescription = finalDescription.replace(placeholderRegex, editingCapturedFreeText);
        pnrLineTemplateAppended = pnrLineTemplateAppended.replace(placeholderRegex, editingCapturedFreeText);
      }

      if (formPnrRequired) {
        appendTerminalLine(`[DIAGNOSTIC] PNR CHECKS: ACTIVE (REQUIRES RETRIEVED PNR LOCATOR)`);
      }
      if (formAppendPnrLine) {
        appendTerminalLine(`[DIAGNOSTIC] AUTOMATIC WRITER: YES — APPENDS "${pnrLineTemplateAppended}" TO RESERVATION`);
      }
      appendTerminalLine(`\n[DRAFT ACTIVE OVERULE PREVIEW]`);
      appendTerminalLine(finalTerminalOutput);
      appendTerminalLine(`\n(Description: ${finalDescription})`);
    } else if (databaseMatch) {
      let finalTerminalOutput = databaseMatch.terminalOutput;
      let finalDescription = databaseMatch.commandDescription;
      let pnrLineTemplateAppended = databaseMatch.pnrLineTemplate || "";

      if (capturedFreeText) {
        finalTerminalOutput = finalTerminalOutput.replace(placeholderRegex, capturedFreeText);
        finalDescription = finalDescription.replace(placeholderRegex, capturedFreeText);
        pnrLineTemplateAppended = pnrLineTemplateAppended.replace(placeholderRegex, capturedFreeText);
      }

      if (databaseMatch.pnrRequired) {
        appendTerminalLine(`[DIAGNOSTIC] PNR CHECKS: ACTIVE (REQUIRES RETRIEVED PNR LOCATOR)`);
      }
      if (databaseMatch.appendPnrLine) {
        appendTerminalLine(`[DIAGNOSTIC] AUTOMATIC WRITER: YES — APPENDS "${pnrLineTemplateAppended}" TO RESERVATION`);
      }
      appendTerminalLine(`\n[DATABASE RULE ACTIVE]`);
      appendTerminalLine(finalTerminalOutput);
      appendTerminalLine(`\n(Description: ${finalDescription})`);
    } else {
      // General procedural response for GDS commands in debug sandbox
      let proceduralOutput = "";
      if (queryUpper.startsWith("AN") || queryUpper.startsWith("1") || queryUpper.startsWith("A")) {
        proceduralOutput = `${queryUpper}\n** STANDARD SIMULATION RUNNING **\n 1  LH 441  C9 Y9    LHR 1005  JFK 1255  74H 0/E\n 2  BA 115  F9 J9 Y9 LHR 0830  JFK 1130  777 0/E\n> `;
      } else if (queryUpper.startsWith("SS") || queryUpper.startsWith("01")) {
        proceduralOutput = `${queryUpper}\n01 SEAT RESERVATION SOLDOUT SEGMENT HELD SECURELY\n> `;
      } else if (queryUpper.startsWith("RT") || queryUpper.startsWith("*")) {
        proceduralOutput = `${queryUpper}\nRP/LONBA2460/LONBA2460            27MAY26/1330Z   Z5X9LV\n 1.SMITH/ANNA MS\n 2  BA 115 Y 15OCT LHRJFK HK1   0835 1130\nPNR LOCATOR - Z5X9LV\n> `;
      } else {
        proceduralOutput = `${queryUpper}\nCMD UNRECOGNIZED CRYTIC COMMAND ENTRY SYNTX. STATUS 100\nTRY SPECIFYING TRGGER EXPECTED COMMAND TO CREATE OVERRULE RULES.\n> `;
      }
      appendTerminalLine(proceduralOutput);
    }
  };

  // Quick Command Templates to bootstrap the editor
  const applyTemplate = (type: "avail" | "ssr" | "ticket" | "names") => {
    if (sandboxGds === "amadeus") {
      if (type === "avail") {
        setFormExpectedCommand("AN15OCTLHRAMS");
        setFormTitle("Amadeus Custom Flight Availability");
        setFormDescription("Displays custom airline seat class inventory availability details for the London to Amsterdam corridor.");
        setFormKeywords("availability, flight, london, amsterdam, an15oct, ams");
        setFormTerminalOutput("AN15OCTLHRAMS\n** AMADEUS OVERULED ACTIVE - AN ** LHR LONDON.GB / AMS AMSTERDAM  15OCT\n 1   BA 428  F9 C9 J9 Y9 B9 M9 Q9 /LHR 0645   AMS 0910  320 L 0/E\n 2   KL 112  C9 Y9 M9 Q9 K9 H9 L9 /LHR 0830   AMS 1055  73H D 0/E\n 3   BA 430  C4 Y4 B2 H1 Q0 M0 L0 /LHR 1215   AMS 1440  320 L 0/E\n>");
      } else if (type === "ssr") {
        setFormExpectedCommand("SRVGML/P1");
        setFormTitle("Amadeus Vegetarian Meal Override");
        setFormDescription("Attaches vegetarian meal request (VGML) to the passenger passenger list details, logging status OK.");
        setFormKeywords("veg, meal, vegetarian, dietary, vgml, request meal, food");
        setFormTerminalOutput("SRVGML/P1\n  SSR VGML BA HK1 RECORD COMPLETED FOR SMITH/ANNA MS\n  SERVICE CONFIRMED BY CARRIER ADVISORY\n>");
      } else if (type === "ticket") {
        setFormExpectedCommand("TKTL22OCT/1200");
        setFormTitle("Amadeus Standard Ticket Deadline Limit");
        setFormDescription("Registers a hard-cutoff ticketing time limit for the segment booking to avoid reservation cancellations.");
        setFormKeywords("ticket, deadline, limit, tktl, ticket time limit, tkt limit");
        setFormTerminalOutput("TKTL22OCT/1200\n  TK OK 22OCT/1200 - OK OVERRULED BY CARRIER RULE DESK\n>");
      } else {
        setFormExpectedCommand("NM1SMITH/GEORGE MR");
        setFormTitle("Amadeus Single Passenger Registration");
        setFormDescription("Inputs primary passenger legal passenger names to hold reservations correctly on active bookings.");
        setFormKeywords("name, add name, passenger, smith, passenger registration, george");
        setFormTerminalOutput("NM1SMITH/GEORGE MR\n 1.SMITH/GEORGE MR\n>");
      }
    } else if (sandboxGds === "sabre") {
      if (type === "avail") {
        setFormExpectedCommand("115OCTLHRJFK");
        setFormTitle("Sabre Direct Air Availability");
        setFormDescription("Queries active carrier schedules and pricing-bracket cabin seat counts on the Sabre GDS system.");
        setFormKeywords("availability, sabre, flights, 115oct, seat count, lhr jfk");
        setFormTerminalOutput("115OCTLHRJFK\n15OCT26 LHR-JFK C*BA/VS/AA/UA\nLHR  LONDON                         JFK  NEW YORK\n 1BA 115 F9 A8 C9 Y9 B9 H4   LHR0830   JFK1130 777 0 /E\n 2VS 003 J9 C9 W9 S9 Y9 B9   LHR1230   JFK1545 350 0 /E\n 3AA 141 J9 C9 D9 Y9 B9 H9   LHR1445   JFK1810 777 0 /E\n*");
      } else if (type === "ssr") {
        setFormExpectedCommand("3INFT/1.1");
        setFormTitle("Sabre Infant SSR Booking");
        setFormDescription("Pairs an infant special service request (SSR INFT DB) directly to adult passenger sequence 1.1.");
        setFormKeywords("infant, baby, child, 3inf, register infant SBR");
        setFormTerminalOutput("3INFT/1.1\n  SSR INFT YY RECD CONFIRMED OK FOR PAX 1.1 (GEORGE SMITH)\n*");
      } else if (type === "ticket") {
        setFormExpectedCommand("7T-A22OCT");
        setFormTitle("Sabre Ticket Time Limit Builder");
        setFormDescription("Inserts a formal ticketing status marker to log final payment clearing deadlines in Saber.");
        setFormKeywords("ticket, limit, deadline, sabre ticket limit, 7t-a");
        setFormTerminalOutput("7T-A22OCT\n  7. T-A22OCT26-HOLD SECURED IN QUEUE 40\n*");
      } else {
        setFormExpectedCommand("-SMITH/ANNA MS");
        setFormTitle("Sabre Add Passenger Record");
        setFormDescription("Specifies legal passenger list entries on active Saber bookings.");
        setFormKeywords("name, add smith, sabre name, smith anna");
        setFormTerminalOutput("-SMITH/ANNA MS\n1.1 SMITH/ANNA MS\n*");
      }
    } else { // Galileo
      if (type === "avail") {
        setFormExpectedCommand("A15OCTLHRJFK");
        setFormTitle("Galileo Space Availability Lookup");
        setFormDescription("Provides direct flight seat classes listing indexes dynamically on the Travelport Galileo platform.");
        setFormKeywords("availability, galileo, flights, lhr jfk, a15oct, seats");
        setFormTerminalOutput("A15OCTLHRJFK\nLHR-JFK 15OCT2026      ** TRAVELPORT GALILEO DIRECT SATELLITE **\n 1   BA 115  F9 A9 C9 Y9 B9 M9  0830 LHR 1130 JFK 777 0*E\n 2   VS 003  J9 C9 I9 W9 Y9 B9  1230 LHR 1545 JFK 350 0*E\n>");
      } else if (type === "ssr") {
        setFormExpectedCommand("SI.BA*WCHR");
        setFormTitle("Galileo Wheelchair SSR Integration");
        setFormDescription("Inserts wheelchair assistance requirement commands to high accuracy standards on Galileo bookings.");
        setFormKeywords("wheelchair, wchr, mobility, disabled, wheelchair request, galileo assistance");
        setFormTerminalOutput("SI.BA*WCHR\n  01 SPECIAL SERVICE DETAILS REGISTERED SECURELY - STATUS HK1\n  WCHR ASSISTANCE ASSIGNMENT ACKNOWLEDGED\n>");
      } else if (type === "ticket") {
        setFormExpectedCommand("T.T*22OCT");
        setFormTitle("Galileo Ticketing Arrangement Entry");
        setFormDescription("Coordinates specific Galileo time limits and agency reservation tags.");
        setFormKeywords("ticket, time, deadline, limit, galileo ticket limit, t.t*");
        setFormTerminalOutput("T.T*22OCT\n  T.T*22OCT26 - FINAL ENTRUSTMENT LOGGED IN AGENCY DIRECT FILE\n>");
      } else {
        setFormExpectedCommand("N.SMITH/ANNA MS");
        setFormTitle("Galileo Name Entry");
        setFormDescription("Binds legal passenger names directly inside Galileo GDS active sectors.");
        setFormKeywords("name, add passenger, smith, anna ms, galileo name");
        setFormTerminalOutput("N.SMITH/ANNA MS\n1.1 SMITH/ANNA MS\n>");
      }
    }
    
    appendTerminalLine(`\n[TEMPLATE_LOADED] Loaded template for "${type.toUpperCase()}" target command.`);
  };

  const filteredRules = rules.filter(r => {
    const matchesGds = gdsFilter === "all" || r.gds.toLowerCase() === gdsFilter.toLowerCase();
    const cleanSearch = searchQuery.toLowerCase().trim();
    if (!cleanSearch) return matchesGds;

    return matchesGds && (
      r.title.toLowerCase().includes(cleanSearch) ||
      r.keywords.toLowerCase().includes(cleanSearch) ||
      r.expectedCommand.toLowerCase().includes(cleanSearch) ||
      r.commandDescription.toLowerCase().includes(cleanSearch) ||
      (r.topic && r.topic.toLowerCase().includes(cleanSearch))
    );
  });

  // CRT Themes mapping
  const terminalThemesMap = {
    green: {
      bg: "bg-slate-950 border-emerald-900 shadow-emerald-950/20",
      text: "text-emerald-400 font-mono text-[13px] tracking-wide font-medium",
      input: "bg-transparent text-emerald-300 font-mono text-[13px] border-none outline-none focus:ring-0 w-full placeholder-emerald-900",
      btnActive: "bg-emerald-950 border border-emerald-500 text-emerald-400",
      btnInactive: "bg-slate-900 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-800",
      caret: "caret-emerald-400",
      accent: "text-emerald-500"
    },
    cyan: {
      bg: "bg-slate-950 border-cyan-900 shadow-cyan-950/20",
      text: "text-cyan-400 font-mono text-[13px] tracking-wide font-medium",
      input: "bg-transparent text-cyan-300 font-mono text-[13px] border-none outline-none focus:ring-0 w-full placeholder-cyan-900",
      btnActive: "bg-cyan-950 border border-cyan-500 text-cyan-400",
      btnInactive: "bg-slate-900 border border-slate-800 text-slate-500 hover:text-cyan-400 hover:border-cyan-800",
      caret: "caret-cyan-400",
      accent: "text-cyan-500"
    },
    gold: {
      bg: "bg-stone-950 border-amber-900 shadow-amber-950/20",
      text: "text-amber-500 font-mono text-[13px] tracking-wide font-medium",
      input: "bg-transparent text-amber-400 font-mono text-[13px] border-none outline-none focus:ring-0 w-full placeholder-amber-900",
      btnActive: "bg-amber-950 border border-amber-500 text-amber-500",
      btnInactive: "bg-stone-900 border border-stone-850 text-stone-500 hover:text-amber-500 hover:border-amber-800",
      caret: "caret-amber-500",
      accent: "text-amber-500"
    }
  };

  const themeConfig = terminalThemesMap[crtTheme];

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-12 animate-fade-in">
      {/* Admin Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 lg:p-8 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-lg">
        {/* Abstract design nodes */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl rounded-none pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl rounded-none pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="h-14 w-14 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
            <Settings className="w-8 h-8 text-indigo-400 animate-spin-slow" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-sans font-black tracking-tight text-xl sm:text-2xl lg:text-3xl">GDS CONTROL BACK OFFICE</h1>
            <p className="text-slate-400 text-xs sm:text-sm font-sans font-medium">
              Administrator overrides dashboard. Set exact terminal responses and command rules with real-time effect.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToSimulator}
          className="bg-slate-800 hover:bg-slate-750 text-white hover:text-indigo-300 border border-slate-700 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-sans font-black uppercase tracking-wider flex items-center gap-2 transform active:scale-95 transition-all duration-150 shadow-md cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> RETURN TO SIMULATOR
        </button>
      </div>

      {/* Admin Action Sub-Tabs Selector */}
      <div className="flex border-b border-slate-200 pb-px gap-2">
        <button
          type="button"
          onClick={() => setActiveAdminTab("overrides")}
          className={`px-5 py-3 font-sans font-black text-xs sm:text-sm uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center gap-2 ${
            activeAdminTab === "overrides"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-850"
          }`}
        >
          <Terminal className="w-4 h-4" /> Terminal Overrides
        </button>
        <button
          type="button"
          onClick={() => setActiveAdminTab("routes")}
          className={`px-5 py-3 font-sans font-black text-xs sm:text-sm uppercase tracking-wider border-b-2 cursor-pointer transition flex items-center gap-2 ${
            activeAdminTab === "routes"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-850"
          }`}
        >
          <Settings className="w-4 h-4" /> Flight Route Assignments
        </button>
      </div>

      {activeAdminTab === "overrides" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Grounding Rules list (Lg: span 7) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h2 className="font-sans font-black text-slate-800 tracking-tight text-base sm:text-lg uppercase">
                  Grounding Database ({filteredRules.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={fetchRules}
                className="text-slate-500 hover:text-indigo-600 cursor-pointer p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition duration-150"
                title="Reload DB"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
              {/* Search input */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Filter by title, triggers, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-sans font-medium text-slate-700 placeholder-slate-400 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* GDS Pill Selects */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-250 border-slate-205 flex-wrap gap-1 w-full sm:w-auto shrink-0 justify-center">
                {["all", "amadeus", "sabre", "galileo"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGdsFilter(g)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-150 cursor-pointer ${
                      gdsFilter === g
                        ? "bg-white text-indigo-700 shadow-xs border border-indigo-100"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Overrides Table / Grid */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                <span className="text-sm font-sans font-medium text-slate-500">Communicating with Sandbox DB...</span>
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-220 border-slate-200 rounded-xl bg-slate-50/50">
                <Info className="w-10 h-10 text-slate-350 mx-auto mb-2.5 text-slate-400" />
                <h3 className="font-sans font-black text-slate-700 text-sm sm:text-base">No Overrides Matched</h3>
                <p className="text-slate-500 font-sans text-xs mt-1 max-w-sm mx-auto">
                  Type an expected trigger command and define custom CRT display screen outputs on the right.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 max-h-[700px] overflow-y-auto pr-1">
                {filteredRules.map((rule) => {
                  const gdsUpper = rule.gds.toUpperCase();
                  const gdsStyle = 
                    rule.gds === "amadeus" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    rule.gds === "sabre" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-teal-50 text-teal-700 border-teal-200";

                  return (
                    <div 
                      key={rule.id}
                      className={`p-4 border rounded-xl flex flex-col justify-between hover:border-indigo-400 transition-all duration-200 ${
                        editingId === rule.id ? "bg-indigo-50/40 border-indigo-300 shadow-xs" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        {/* Title & GDS Tag */}
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-sans font-black text-slate-850 text-sm sm:text-base text-slate-800 text-left capitalize truncate">
                            {rule.title}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-black tracking-widest border shrink-0 ${gdsStyle}`}>
                            {gdsUpper}
                          </span>
                        </div>

                        {/* Optional PNR Behavior Badges */}
                        {(rule.pnrRequired || rule.appendPnrLine) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {rule.pnrRequired && (
                              <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[9px] px-1.5 py-0.5 rounded font-sans font-extrabold uppercase tracking-widest">
                                PNR Required
                              </span>
                            )}
                            {rule.appendPnrLine && (
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] px-1.5 py-0.5 rounded font-sans font-extrabold uppercase tracking-widest">
                                Writes PNR Line
                              </span>
                            )}
                          </div>
                        )}

                        {/* Keyword Indicators */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-sans uppercase font-bold text-slate-500">TRGS:</span>
                          <code className="text-[11px] bg-white border border-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded font-mono select-all">
                            {rule.expectedCommand}
                          </code>
                          <span className="text-slate-350 select-none text-slate-300">|</span>
                          <span className="text-[10px] text-slate-500 italic max-w-xs truncate" title="Keywords matching">
                            KW: {rule.keywords}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-normal text-left font-medium mt-1">
                          {rule.commandDescription}
                        </p>
                      </div>

                      {/* Item footer controls */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3 gap-2">
                        <span className="text-[10px] font-sans uppercase text-slate-400 font-bold">
                          Cat: {rule.topic || "Custom Override"}
                        </span>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditRule(rule)}
                            className="bg-white hover:bg-slate-100 text-slate-700 p-2 rounded-lg border border-slate-200 transition active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-sans font-extrabold shadow-xxs"
                            title="Edit this rule details"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-500" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 p-2 rounded-lg border border-slate-200 hover:border-rose-200 transition active:scale-95 cursor-pointer flex items-center gap-1 text-[11px] font-sans font-extrabold shadow-xxs"
                            title="Delete this rule forever"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Form & Preview CRT Sandbox (Lg: span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Active Terminal Admin Simulator Sandbox */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-1">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase text-slate-300 font-sans tracking-wider">
                  Admin Active CRT Terminal Sandbox
                </span>
              </div>
              
              {/* CTR Color selector */}
              <div className="flex gap-1">
                {(["green", "cyan", "gold"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCrtTheme(t)}
                    className={`w-3.5 h-3.5 rounded-full border border-slate-800 ${
                      t === "green" ? "bg-emerald-500" : t === "cyan" ? "bg-cyan-500" : "bg-amber-500"
                    } ${crtTheme === t ? "ring-1 ring-slate-100 scale-110 shadow-md" : "opacity-50"}`}
                    title={`${t} Theme CRT`}
                  />
                ))}
              </div>
            </div>

            {/* Virtual Screen with static scanlines and glow */}
            <div className={`relative ${themeConfig.bg} border-2 rounded-xl p-4 min-h-[190px] max-h-[290px] overflow-y-auto shadow-inner select-all flex flex-col gap-1 transition-all duration-300`}>
              {/* Scanline layer overlay */}
              <div className="absolute inset-0 bg-terminal-grid opacity-5 pointer-events-none rounded-xl" />
              <div className="absolute inset-0 bg-scanlines bg-cover opacity-15 pointer-events-none rounded-xl" />
              
              {/* Static History lines */}
              <div className="flex flex-col gap-1 z-10">
                {terminalHistory.map((line, idx) => (
                  <div key={idx} className={`${themeConfig.text} whitespace-pre-wrap text-left break-words min-h-[1em]`}>
                    {line}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>

            {/* Sandbox Console Input */}
            <form onSubmit={handleTerminalSubmit} className="flex gap-2 items-center">
              <span className={`text-sm font-mono font-bold font-black ${themeConfig.accent}`}>
                {sandboxGds === "amadeus" || sandboxGds === "galileo" ? ">" : "*"}
              </span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder={`Try entering triggers (e.g. "${formExpectedCommand || "SRVGML/P1"}")`}
                className={`flex-1 font-mono text-[13px] bg-slate-950 text-slate-100 rounded-lg border border-slate-800 px-3 py-2 cursor-text outline-none focus:border-indigo-500 transition-colors ${themeConfig.caret}`}
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg p-2.5 transition transform active:scale-95 shrink-0 cursor-pointer shadow-sm"
                title="Send command"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
              </button>
            </form>

            {/* Quick buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[9px] font-sans uppercase font-bold text-slate-500">Draft Templates:</span>
              <button
                type="button"
                onClick={() => applyTemplate("avail")}
                className="bg-slate-800 hover:bg-slate-755 border border-slate-700 hover:border-indigo-800 text-[10px] font-sans font-extrabold text-slate-350 hover:text-indigo-400 px-2 py-1 rounded"
                title="Fill availability command template"
              >
                Availability
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("ssr")}
                className="bg-slate-800 hover:bg-slate-755 border border-slate-700 hover:border-indigo-800 text-[10px] font-sans font-extrabold text-slate-350 hover:text-indigo-400 px-2 py-1 rounded"
                title="Fill SSR command template"
              >
                Meals / SSR
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("ticket")}
                className="bg-slate-800 hover:bg-slate-755 border border-slate-700 hover:border-indigo-800 text-[10px] font-sans font-extrabold text-slate-350 hover:text-indigo-400 px-2 py-1 rounded"
                title="Fill ticketing limit template"
              >
                Ticketing Limit
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("names")}
                className="bg-slate-800 hover:bg-slate-755 border border-slate-700 hover:border-indigo-800 text-[10px] font-sans font-extrabold text-slate-350 hover:text-indigo-400 px-2 py-1 rounded"
                title="Fill basic passenger name template"
              >
                Name Entry
              </button>
            </div>
          </div>

          {/* Configuration Rules form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <span className="font-sans font-black text-slate-800 text-sm tracking-tight uppercase flex items-center gap-1.5">
                <Code className="w-4 h-4 text-indigo-600" />
                {editingId ? `MODIFY RULES: ${formExpectedCommand}` : "SET NEW TERMINAL OVERRIDE"}
              </span>

              {editingId && (
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="text-xs font-sans font-bold text-slate-500 hover:text-rose-600 uppercase cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveRule} className="flex flex-col gap-4 text-left">
              
              {/* Title & GDS System */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-sans font-black text-slate-700 uppercase tracking-tight">Rule Title</span>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Amadeus Seat Assignment Override"
                    className="w-full bg-slate-50 border border-slate-205 border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-sans font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-sans font-black text-slate-700 uppercase tracking-tight">GDS System Target</span>
                  <select
                    value={formGds}
                    onChange={(e) => setFormGds(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-205 border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-sans font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                  >
                    <option value="amadeus">Amadeus (AMADEUS)</option>
                    <option value="sabre">Sabre GDS (SABRE)</option>
                    <option value="galileo">Travelport Galileo (GALILEO)</option>
                  </select>
                </div>
              </div>

              {/* Trigger expectedCommand & Topic Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-sans font-black text-slate-700 uppercase tracking-tight">Expected Command (Trigger code)</span>
                  <input
                    type="text"
                    required
                    value={formExpectedCommand}
                    onChange={(e) => setFormExpectedCommand(e.target.value)}
                    placeholder="e.g. SRVGML/P1"
                    className="w-full bg-slate-50 border border-slate-205 border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono font-bold uppercase text-indigo-700 tracking-wider outline-none focus:ring-1 focus:ring-indigo-505 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-sans font-black text-slate-700 uppercase tracking-tight">Category/Topic</span>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Special Services (SSR)"
                    className="w-full bg-slate-50 border border-slate-205 border-slate-205 border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-sans font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Keywords list */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans font-black text-slate-700 uppercase tracking-tight">Keywords (Comma separated matching terms)</span>
                  <span className="text-[10px] text-slate-400 italic">For Ask Orbs natural speech</span>
                </div>
                <input
                  type="text"
                  required
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="e.g. vegetarian, veg, food request, veg meal, vgml"
                  className="w-full bg-slate-50 border border-slate-205 border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-sans font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Description explanation */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-sans font-black text-slate-700 uppercase tracking-tight">Command/Rule Description (Orb Help Panel Output)</span>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Appends vegetarian meals SSR code to active airline segment records."
                  className="w-full bg-slate-50 border border-slate-205 border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-sans font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Advanced PNR Automation Constraints */}
              <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-200/90 flex flex-col gap-4 mt-2">
                <span className="text-xs font-sans font-black text-indigo-800 uppercase tracking-tight flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-indigo-500" /> Advanced PNR Automation Controls
                </span>

                {/* Constraint 1: PNR Required tickbox */}
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="pnrRequiredCheck"
                    checked={formPnrRequired}
                    onChange={(e) => setFormPnrRequired(e.target.checked)}
                    className="mt-0.5 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="pnrRequiredCheck" className="text-xs font-sans font-bold text-slate-700 cursor-pointer text-left">
                      Only execute if a booking PNR is opened/retrieved
                    </label>
                    <span className="text-[10px] text-slate-450 text-slate-500 font-medium text-left">
                      Forces the terminal GDS interface to reject the command if no active locator is retrieved.
                    </span>
                  </div>
                </div>

                {/* Constraint 2: Append line on the PNR tickbox */}
                <div className="flex items-start gap-2.5 border-t border-slate-200/50 pt-3">
                  <input
                    type="checkbox"
                    id="appendPnrLineCheck"
                    checked={formAppendPnrLine}
                    onChange={(e) => setFormAppendPnrLine(e.target.checked)}
                    className="mt-0.5 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="appendPnrLineCheck" className="text-xs font-sans font-bold text-slate-700 cursor-pointer text-left">
                      This command Appends a direct new line to the active PNR file
                    </label>
                    <span className="text-[10px] text-slate-450 text-slate-500 font-medium text-left">
                      Injects a custom line into the active draft segment records after running.
                    </span>
                  </div>
                </div>

                {/* Template text input conditional field */}
                {formAppendPnrLine && (
                  <div className="flex flex-col gap-3.5 pl-6.5 mt-1 border-l-2 border-indigo-200 ml-2 animate-fadeIn text-left">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-sans font-black text-indigo-700 uppercase tracking-tight">
                        PNR Text Line Template
                      </span>
                      <input
                        type="text"
                        value={formPnrLineTemplate}
                        onChange={(e) => setFormPnrLineTemplate(e.target.value)}
                        placeholder="e.g. SSR {AL} VGML FOR PASSENGER {nm1}"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-sans font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition"
                      />
                      <span className="text-[10px] text-slate-500 leading-normal font-sans italic">
                        Variables: <strong className="text-indigo-600 font-extrabold">{`{AL}`}</strong> = Active airline, <strong className="text-indigo-600 font-extrabold">{`{px}`}</strong> = passenger count, <strong className="text-indigo-600 font-extrabold">{`{nm1}`}</strong> to <strong className="text-indigo-600 font-extrabold">{`{nm9}`}</strong> = named travelers.
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-sans font-black text-indigo-700 uppercase tracking-tight">
                        Line Position Placement Option
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormPnrLinePosition("top")}
                          className={`px-2 py-1.5 text-xs font-sans font-bold border rounded-lg transition text-left flex flex-col justify-between h-auto cursor-pointer ${
                            formPnrLinePosition === "top"
                              ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50"
                          }`}
                        >
                          <span className="block font-bold">Top Line</span>
                          <span className="text-[9px] text-slate-500 leading-tight font-normal">Line 1 (above names)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormPnrLinePosition("middle")}
                          className={`px-2 py-1.5 text-xs font-sans font-bold border rounded-lg transition text-left flex flex-col justify-between h-auto cursor-pointer ${
                            formPnrLinePosition === "middle"
                              ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50"
                          }`}
                        >
                          <span className="block font-bold">Middle</span>
                          <span className="text-[9px] text-slate-500 leading-tight font-normal">Between flights</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormPnrLinePosition("bottom")}
                          className={`px-2 py-1.5 text-xs font-sans font-bold border rounded-lg transition text-left flex flex-col justify-between h-auto cursor-pointer ${
                            formPnrLinePosition === "bottom"
                              ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50"
                          }`}
                        >
                          <span className="block font-bold">Bottom Line</span>
                          <span className="text-[9px] text-slate-500 leading-tight font-normal">End of PNR (Default)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terminal simulated Output */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-sans font-black text-slate-700 uppercase tracking-tight">Terminal CTR Screen Output (Simulated buffer)</span>
                  
                  {/* Copy actively typed terminal buffer */}
                  <button
                    type="button"
                    onClick={() => {
                      if (terminalHistory.length >= 2) {
                        const lastOutput = terminalHistory[terminalHistory.length - 2];
                        if (lastOutput && !lastOutput.startsWith(">") && !lastOutput.startsWith("*") && !lastOutput.includes("Loaded Rule") && !lastOutput.includes("Loaded template")) {
                          setFormTerminalOutput(lastOutput);
                        } else {
                          alert("Draft a custom terminal response by typing in the sandbox terminal first, then press play to generate a simulated console result.");
                        }
                      }
                    }}
                    className="text-[10px] font-sans font-bold text-indigo-600 hover:text-indigo-800 uppercase flex items-center gap-1 cursor-pointer"
                    title="Load the last response simulated in sandbox terminal"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Pull Sandbox Output
                  </button>
                </div>
                <textarea
                  required
                  rows={4}
                  value={formTerminalOutput}
                  onChange={(e) => setFormTerminalOutput(e.target.value)}
                  placeholder={"e.g. SRVGML/P1\n  SSR VGML BA HK1 RECORD COMPLETED SECURELY\n>"}
                  className="w-full bg-slate-50 border border-slate-205 border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-medium text-slate-800 outline-none focus:ring-1 focus:ring-indigo-505 focus:ring-indigo-500 focus:bg-white focus:text-indigo-900 transition leading-relaxed whitespace-pre"
                />
              </div>

              {/* Submit Action Controls */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-sans font-black uppercase text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 tracking-wider transition-all shadow-md active:scale-95 cursor-pointer select-none leading-none border border-indigo-750"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Committing changes...
                  </>
                ) : editingId ? (
                  <>
                    <Save className="w-4 h-4" /> Save Rule Overrule Edits
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Create Core Grounding Overrule Rule
                  </>
                )}
              </button>

            </form>
          </div>

        </div>

      </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in text-left">
          {/* Left panel: Active Route Rules & Group Cities (Span 7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* 1. Destination Routing Rules */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <span className="font-sans font-black text-slate-800 text-sm tracking-tight uppercase flex items-center gap-2">
                  <Play className="w-4 h-4 text-indigo-600 rotate-90 shrink-0" />
                  Airport Destination Rules ({routeConfig.destinationRules?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDestRuleIdx(null);
                    setRouteDest("");
                    setRouteAirlines([{ airline: "", isDirect: true, via: "", allowedOrigins: "" }]);
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-sans font-black uppercase flex items-center gap-1 cursor-pointer transition select-none leading-none"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign Destination
                </button>
              </div>

              {routeIsLoading ? (
                <div className="flex justify-center items-center py-12 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading routing rules...
                </div>
              ) : !routeConfig.destinationRules || routeConfig.destinationRules.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-sans border border-dashed border-slate-200 rounded-xl">
                  No airport final destination rules defined. Create one on the right to start.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {routeConfig.destinationRules.map((rule: any, idx: number) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50 relative group hover:border-slate-300 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-800 text-white font-mono font-black text-[13px] px-2.5 py-1 rounded-md tracking-wider">
                            {rule.destination}
                          </span>
                          <span className="text-xs text-slate-500 font-sans font-semibold">
                            assigned to {rule.airlines?.length || 0} airlines
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => handleEditDestRuleClick(idx)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-150 rounded-lg cursor-pointer transition"
                            title="Edit destination carriers"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDestRule(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-150 rounded-lg cursor-pointer transition"
                            title="Delete destination carrier assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-3">
                        {rule.airlines?.map((air: any, aIdx: number) => (
                          <div key={aIdx} className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-sm text-xs">
                            <div className="flex items-center gap-2 font-sans font-medium text-slate-800">
                              <span className="text-[13px] font-mono font-black border-r border-slate-150 pr-2 mr-1 text-slate-900">
                                {air.airline}
                              </span>
                              {air.isDirect ? (
                                <span className="bg-emerald-50 text-emerald-700 font-sans font-bold px-2 py-0.5 rounded border border-emerald-150 uppercase tracking-wide text-[10px]">
                                  Direct
                                </span>
                              ) : (
                                <span className="bg-indigo-50 text-indigo-700 font-sans font-bold px-2 py-0.5 rounded border border-indigo-150 uppercase tracking-wide text-[10px]">
                                  Via {air.via}
                                </span>
                              )}
                            </div>

                            {air.allowedOrigins && air.allowedOrigins.length > 0 && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-sans mt-0.5 md:mt-0 font-medium">
                                <span className="text-slate-400 uppercase font-bold text-[9px]">Restricted Departures:</span>
                                {air.allowedOrigins.map((orig: string, oIdx: number) => (
                                  <span key={oIdx} className="bg-slate-100 border border-slate-200 rounded px-1.5 font-mono font-bold text-[10px]">
                                    {orig}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Group City Mappings (LON etc) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <span className="font-sans font-black text-slate-800 text-sm tracking-tight uppercase flex items-center gap-2">
                  <Layout className="w-4 h-4 text-indigo-600 shrink-0" />
                  Group City City-Airport Codes Mapping (e.g. LON, NYC)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Current Groups List (Span 7) */}
                <div className="md:col-span-12 lg:col-span-7 flex flex-col gap-3 text-left">
                  <span className="text-xs font-sans font-black text-slate-500 uppercase tracking-tight">Active Group City Codes</span>
                  {Object.keys(routeConfig.groupCities || {}).length === 0 ? (
                    <div className="text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl text-center text-xs">
                      No group airport codes defined.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {Object.entries(routeConfig.groupCities || {}).map(([code, airports]: [string, any]) => (
                        <div key={code} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="bg-indigo-600 text-white font-mono font-black text-xs px-2.5 py-1 rounded-lg">
                              {code}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {airports.map((ap: string) => (
                                <span key={ap} className="bg-white border border-slate-200 rounded px-2 py-0.5 font-mono text-xs font-bold text-slate-705 shadow-sm">
                                  {ap}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroupCity(code)}
                            className="p-1 px-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition cursor-pointer"
                            title="Delete city mapping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Create Mapping Form (Span 5) */}
                <form onSubmit={handleAddGroupCity} className="md:col-span-12 lg:col-span-5 flex flex-col gap-3.5 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm text-xs text-left">
                  <span className="font-sans font-black text-slate-700 uppercase tracking-tight text-xs">Add Group Airport Code</span>
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wide">Group City Code (e.g. LON, NYC)</span>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      value={groupCodeInput}
                      onChange={(e) => setGroupCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. LON"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold uppercase text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-wide">Included Airport Codes (Comma Separated)</span>
                    <input
                      type="text"
                      required
                      value={groupAirportsInput}
                      onChange={(e) => setGroupAirportsInput(e.target.value.toUpperCase())}
                      placeholder="e.g. LHR, LGW, STN"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold uppercase text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-black uppercase tracking-wider text-[10px] py-2 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition shadow-sm leading-none"
                  >
                    <Plus className="w-3.5 h-3.5" /> Bind City Group
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* Right panel: New/Edit Destination Routing Form (Span 5) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sticky top-4 text-left">
              <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                <span className="font-sans font-black text-slate-800 text-sm tracking-tight uppercase flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  {editingDestRuleIdx !== null ? "Edit Destination Carriers" : "Assign Destination Carriers"}
                </span>
                {editingDestRuleIdx !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDestRuleIdx(null);
                      setRouteDest("");
                      setRouteAirlines([{ airline: "", isDirect: true, via: "", allowedOrigins: "" }]);
                    }}
                    className="text-[11px] font-sans font-bold text-slate-400 hover:text-rose-600 uppercase cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveDestRule} className="flex flex-col gap-4 text-left">
                {/* Dest Code */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-sans font-black text-slate-700 uppercase tracking-tight">Final Destination Airport Code (3 Chars)</span>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    disabled={editingDestRuleIdx !== null}
                    value={routeDest}
                    onChange={(e) => setRouteDest(e.target.value.toUpperCase())}
                    placeholder="e.g. BKK"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono font-bold uppercase text-indigo-700 tracking-wider outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white disabled:opacity-50 transition"
                  />
                  <span className="text-[10px] text-slate-400 font-sans leading-relaxed">
                    This maps realistic airline connections for any flights searching for availability with this city/airport as the final destination segment.
                  </span>
                </div>

                {/* Assigned Airlines Rows */}
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-sans font-black text-slate-700 uppercase tracking-tight">Assigned Carriers (Up to 5)</span>
                    <button
                      type="button"
                      disabled={routeAirlines.length >= 5}
                      onClick={handleAddAirlineRow}
                      className="text-xs font-sans font-black text-indigo-600 hover:text-indigo-800 disabled:text-slate-350 uppercase flex items-center gap-1 cursor-pointer select-none"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Airline
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {routeAirlines.map((rowRef, rIdx) => (
                      <div key={rIdx} className="bg-slate-50 p-3 rounded-xl border border-slate-205 border-slate-200 relative flex flex-col gap-2.5 text-xs text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-sans font-black text-slate-500 uppercase tracking-tight text-[10px] bg-slate-200 px-1.5 py-0.5 rounded leading-none">
                            Airline #{rIdx + 1}
                          </span>
                          {routeAirlines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAirlineRow(rIdx)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer transition"
                              title="Remove airline row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Carrier Code and Type */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Airline Code</span>
                            <input
                              type="text"
                              required
                              maxLength={2}
                              value={rowRef.airline}
                              onChange={(e) => handleUpdateAirlineRow(rIdx, { airline: e.target.value.toUpperCase() })}
                              placeholder="e.g. TG"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs font-black uppercase text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 transition"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Routing Type</span>
                            <select
                              value={rowRef.isDirect ? "direct" : "indirect"}
                              onChange={(e) => handleUpdateAirlineRow(rIdx, { 
                                isDirect: e.target.value === "direct",
                                via: e.target.value === "direct" ? "" : rowRef.via 
                              })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-sans text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition"
                            >
                              <option value="direct">Direct Flight</option>
                              <option value="indirect">Transit Stopover</option>
                            </select>
                          </div>
                        </div>

                        {/* Indirect via point */}
                        {!rowRef.isDirect && (
                          <div className="flex flex-col gap-1 animate-fade-in text-left">
                            <span className="text-[10px] text-indigo-750 font-black uppercase">Via Airport (Transit Point e.g. DXB)</span>
                            <input
                              type="text"
                              required
                              maxLength={3}
                              value={rowRef.via}
                              onChange={(e) => handleUpdateAirlineRow(rIdx, { via: e.target.value.toUpperCase() })}
                              placeholder="e.g. DXB"
                              className="w-full bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 font-mono text-xs font-black uppercase text-indigo-900 outline-none focus:ring-1 focus:ring-indigo-500 transition"
                            />
                          </div>
                        )}

                        {/* Restricted origins */}
                        <div className="flex flex-col gap-1 text-left">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Departure Airport Restriction</span>
                          <input
                            type="text"
                            value={rowRef.allowedOrigins}
                            onChange={(e) => handleUpdateAirlineRow(rIdx, { allowedOrigins: e.target.value })}
                            placeholder="Leave empty for all airports"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none font-mono text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500 transition"
                          />
                          <span className="text-[9px] text-slate-400 leading-normal">
                            Only allow departures from these specified airport codes (e.g. LHR, JFK). Leave empty for any.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-black uppercase text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 tracking-wider transition-all shadow-md active:scale-95 cursor-pointer select-none leading-none border border-indigo-750"
                >
                  <Save className="w-4 h-4" />
                  {editingDestRuleIdx !== null ? "Update Destination Overrides" : "Apply Destination Overrides"}
                </button>
              </form>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
