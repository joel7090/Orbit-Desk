import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal as TerminalIcon, 
  Send, 
  Sparkles, 
  RefreshCw, 
  CornerDownLeft,
  Info,
  Home,
  Layers,
  Sparkle,
  Database,
  Clipboard,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  History,
  Copy,
  ExternalLink,
  Award,
  Maximize2,
  Minimize2,
  Type,
  Settings,
  CreditCard,
  LogOut,
  User,
  Lock
} from "lucide-react";
import { GDSSystem, GDSCommandStep, GDSResponse } from "./types";
import { GDS_SYSTEM_INFO } from "./data";
import OrbitDeskLogo from "./components/OrbitDeskLogo";
import GdsLandingPage from "./components/GdsLandingPage";
import AdminBackOffice from "./components/AdminBackOffice";
import AmadeusAssessment from "./components/AmadeusAssessment";
import PricingPlans from "./components/PricingPlans";
import LoginScreen from "./components/LoginScreen";
import WelcomeDialog from "./components/WelcomeDialog";
import SchedulesExplorer from "./components/SchedulesExplorer";
import { 
  GdsSession, 
  createEmptySession, 
  executeCrypticCommand, 
  DEFAULT_PRACTICE_PNRS,
  formatTicketingLine,
  formatAmadeusSegment,
  formatSabreSegment,
  formatGalileoSegment,
  cleanupPnrDuplication,
  renderGdsPnrBuffer,
  setGlobalRouteRules,
  insertLineBelowLastNumberedLine
} from "./lib/gdsEngine";

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
    name: "#1D3F52"
  }
} as const;

export default function App() {
  // GDS selected target
  const [selectedGds, setSelectedGds] = useState<GDSSystem>("amadeus");

  // Stateful distribution emulator session context
  const [gdsSession, setGdsSession] = useState<GdsSession>(createEmptySession);
  const [savedPnrs, setSavedPnrs] = useState<Record<string, any>>(() => DEFAULT_PRACTICE_PNRS);

  // Active workspace tab view: 'hub' (Landing/Home platform) | 'simulator' (Interactive Sandbox GDS screen) | 'assessment' (Amadeus competency testing) | 'pricing' (Plans & Pricing page)
  const [activeTab, setActiveTab] = useState<"hub" | "simulator" | "admin" | "assessment" | "pricing">("hub");

  // Trainee Authentication States for sandbox & assessment access
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [traineeEmail, setTraineeEmail] = useState<string>("");

  // Track if a welcome/introductory dialog is active: 'simulator' | 'assessment' | null
  const [welcomeDialogType, setWelcomeDialogType] = useState<"simulator" | "assessment" | null>(null);

  // Monitor tab changes and authentication to trigger the welcome dialogs
  useEffect(() => {
    if (isLoggedIn && (activeTab === "simulator" || activeTab === "assessment")) {
      try {
        const isDismissed = localStorage.getItem(`orbitdesk_dismiss_welcome_${activeTab}`);
        if (isDismissed !== "true") {
          setWelcomeDialogType(activeTab);
        } else {
          setWelcomeDialogType(null);
        }
      } catch (err) {
        setWelcomeDialogType(activeTab);
      }
    } else {
      setWelcomeDialogType(null);
    }
  }, [activeTab, isLoggedIn]);

  // Client-side list of custom admin overrule rules of GDS terminal displays
  const [adminRules, setAdminRules] = useState<any[]>([]);
  const [routeRules, setRouteRules] = useState<any>(null);

  const fetchAdminRules = async () => {
    try {
      const response = await fetch("/api/model-memory");
      if (response.ok) {
        const data = await response.json();
        setAdminRules(data);
      }
    } catch (error) {
      console.error("Error loading admin rules in main sandbox:", error);
    }
  };

  const fetchRouteRules = async () => {
    try {
      const response = await fetch("/api/route-rules");
      if (response.ok) {
        const data = await response.json();
        setRouteRules(data);
        setGlobalRouteRules(data);
      }
    } catch (error) {
      console.error("Error loading dynamic route rules in main app:", error);
    }
  };

  const findAdminRuleMatch = (commandText: string) => {
    const rawClean = commandText.trim();
    const inputUpper = rawClean.toUpperCase();
    const strippedUpper = inputUpper.replace(/^[>*#?!/]+\s*/, "").trim();
    const inputNoSpace = inputUpper.replace(/\s+/g, "");
    const strippedNoSpace = strippedUpper.replace(/\s+/g, "");

    let overrulingMatch: any = null;
    let capturedFreeText = "";

    for (const r of adminRules) {
      if (r.gds.toLowerCase() !== selectedGds.toLowerCase()) continue;
      
      const expectedUpper = (r.expectedCommand || "").trim().toUpperCase();
      const expectedNoSpace = expectedUpper.replace(/\s+/g, "");
      
      // Match 1: Same command or stripped command matches
      if (
        expectedUpper === inputUpper || 
        expectedUpper === strippedUpper || 
        expectedNoSpace === inputNoSpace || 
        expectedNoSpace === strippedNoSpace
      ) {
        overrulingMatch = r;
        break;
      }
      
      // Match 2: If contains {FREE TEXT} placeholder or asterisk wildcard
      const placeholderRegex = /\{FREE\s+TEXT\}|\{FREE_TEXT\}|\{TEXT\}|\[FREE\s+TEXT\]|\[FREE_TEXT\]|\*/gi;
      if (placeholderRegex.test(expectedUpper)) {
        const segments = expectedUpper.split(placeholderRegex);
        const escapedSegments = segments.map((seg: string) => seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regexStr = "^" + escapedSegments.join("(.*)") + "$";
        const regex = new RegExp(regexStr);
        const match = inputUpper.match(regex) || strippedUpper.match(regex);
        if (match) {
          overrulingMatch = r;
          capturedFreeText = match.slice(1).join(" ").trim().toUpperCase();
          break;
        }
        
        // Prefix match fallback, e.g. if expected is "SI {FREE TEXT}" and input starts with "SI"
        if (segments[0] && segments[0].trim().length > 1) {
          const prefixNoSpace = segments[0].replace(/\s+/g, "");
          if (inputNoSpace.startsWith(prefixNoSpace) || strippedNoSpace.startsWith(prefixNoSpace)) {
            overrulingMatch = r;
            const rawPrefixLen = segments[0].length;
            capturedFreeText = rawClean.substring(rawPrefixLen).trim().toUpperCase();
            break;
          }
        }
      }
      
      // Match 3: Keyword checks
      const kwList = r.keywords ? r.keywords.split(",").map((k: string) => k.trim().toUpperCase()).filter(Boolean) : [];
      let foundKw = false;
      for (const kw of kwList) {
        if (inputUpper === kw || strippedUpper === kw || inputUpper.includes(kw) || strippedUpper.includes(kw)) {
          overrulingMatch = r;
          foundKw = true;
          break;
        }
      }
      if (foundKw) break;
    }

    return { overrulingMatch, capturedFreeText };
  };

  useEffect(() => {
    fetchAdminRules();
    fetchRouteRules();
  }, []);

  // Local persistent history of successfully run GDS command queries with individual command codes
  const [searchHistory, setSearchHistory] = useState<{
    id: string;
    timestamp: string;
    query: string;
    gds: GDSSystem;
    commands: { command: string; description: string }[];
  }[]>(() => {
    try {
      const saved = localStorage.getItem("gds_search_command_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string>("");

  const handleCopyToClipboard = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(""), 1600);
        })
        .catch(() => {
          fallbackCopyText(text, id);
        });
    } else {
      fallbackCopyText(text, id);
    }
  };

  const fallbackCopyText = (text: string, id: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 1600);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  // Custom interactive search query text
  const [aiPromptInput, setAiPromptInput] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isSandboxActive, setIsSandboxActive] = useState<boolean>(false);
  const [currentExplanation, setCurrentExplanation] = useState<string>(
    "Ask Orbs below to type Amadeus commands on the screen for booking seats, checking flight availability, adding passenger records, and more!"
  );

  // Track active steps returned in the latest request for interactive command highlighting
  const [activeSteps, setActiveSteps] = useState<GDSCommandStep[]>([]);

  // Terminal screen lines
  const [shownLines, setShownLines] = useState<string[]>([]);

  // Command typing simulator states
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Keep a reference to the active simulation run ID to clear stale typing loops on new trials
  const activeRunIdRef = useRef<number>(0);

  // Monitor Theme state: "blue" | "black" | "slate"
  const [monitorTheme, setMonitorTheme] = useState<"blue" | "black" | "slate">("blue");

  // Confirm clear state for history log (to bypass iframe window.confirm block)
  const [confirmClearHistory, setConfirmClearHistory] = useState<boolean>(false);

  // Terminal font size scaling (percentage, default 100%)
  const [terminalTextScale, setTerminalTextScale] = useState<number>(100);

  // Immersive Full Screen state toggles
  const [isTerminalFullscreen, setIsTerminalFullscreen] = useState<boolean>(false);

  // Focus terminal and capture Esc key for exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTerminalFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isTerminalFullscreen || activeTab === "simulator") {
      setTimeout(() => {
        const activeRef = isTerminalFullscreen ? terminalInputRefFull : terminalInputRefNormal;
        if (activeRef.current) {
          activeRef.current.focus();
        }
      }, 100);
    }
  }, [isTerminalFullscreen, activeTab]);

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  
  // Custom interactive terminal direct inputs
  const terminalInputRefNormal = useRef<HTMLInputElement>(null);
  const terminalInputRefFull = useRef<HTMLInputElement>(null);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalCaretIndex, setTerminalCaretIndex] = useState(0);
  const [isTerminalInputFocused, setIsTerminalInputFocused] = useState(false);

  const handleTerminalClick = () => {
    const activeRef = isTerminalFullscreen ? terminalInputRefFull : terminalInputRefNormal;
    if (activeRef.current) {
      activeRef.current.focus();
    }
  };

  const updateTerminalCaret = (target: HTMLInputElement) => {
    setTerminalCaretIndex(target.selectionStart ?? 0);
  };

  // Scroll the terminal view to the bottom without shifting the rest of the browser window
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [shownLines, isTyping, terminalInput, isTerminalInputFocused]);

  // Handle immediate switching of GDS System
  const handleGdsSwitch = (gds: GDSSystem) => {
    activeRunIdRef.current++;
    setSelectedGds(gds);
    const info = GDS_SYSTEM_INFO[gds];
    setShownLines([]);
    setActiveSteps([]);
    setIsSandboxActive(false);
    setTerminalInput("");
    setTerminalCaretIndex(0);
    setGdsSession(createEmptySession());
  };

  // Run sequence of GDS commands instantly inside the GDS simulator screen
  const animateGdsCommandRun = async (commandSteps: GDSCommandStep[], index: number = 0, preventHighlight: boolean = false) => {
    const currentRunId = activeRunIdRef.current;

    if (index >= commandSteps.length) {
      if (currentRunId === activeRunIdRef.current) {
        setIsTyping(false);
      }
      return;
    }

    if (currentRunId !== activeRunIdRef.current) {
      return;
    }

    setIsTyping(true);
    const activeStep = commandSteps[index];
    if (!activeStep) {
      if (currentRunId === activeRunIdRef.current) {
        setIsTyping(false);
      }
      return;
    }

    const commandText = activeStep.command || "";
    const promptChar = GDS_SYSTEM_INFO[selectedGds].promptChar;

    const { overrulingMatch, capturedFreeText } = findAdminRuleMatch(commandText);

    const stepToUse = overrulingMatch ? {
      ...activeStep,
      terminalOutput: overrulingMatch.terminalOutput,
      appendPnrLine: !!overrulingMatch.appendPnrLine,
      pnrLineTemplate: overrulingMatch.pnrLineTemplate,
      pnrLinePosition: overrulingMatch.pnrLinePosition,
      commandDescription: overrulingMatch.commandDescription,
    } : activeStep;

    let finalTerminalOutput = stepToUse.terminalOutput || "";
    let finalPnrLineTemplate = stepToUse.pnrLineTemplate || "";

    if (overrulingMatch && capturedFreeText) {
      const phRegex = /\{FREE\s+TEXT\}|\{FREE_TEXT\}|\{TEXT\}|\[FREE\s+TEXT\]|\[FREE_TEXT\]/gi;
      finalTerminalOutput = finalTerminalOutput.replace(phRegex, capturedFreeText);
      finalPnrLineTemplate = finalPnrLineTemplate.replace(phRegex, capturedFreeText);
    }

    return new Promise<void>((resolve) => {
      const finishStep = () => {
        if (currentRunId !== activeRunIdRef.current) {
          resolve();
          return;
        }

        let rawOutputLines = finalTerminalOutput.split("\n");

        let customPnrAppendedLine = "";
        let addedInline = false;
        if (stepToUse.appendPnrLine && finalPnrLineTemplate) {
          const airline = gdsSession?.segments && gdsSession.segments.length > 0
            ? gdsSession.segments[0].airline.toUpperCase()
            : (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.segments && savedPnrs[gdsSession.activeLocator].segments.length > 0)
              ? savedPnrs[gdsSession.activeLocator].segments[0].airline.toUpperCase()
              : "BA";
              
          const passengerCount = gdsSession?.names && gdsSession.names.length > 0
            ? gdsSession.names.length
            : (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.names
              ? savedPnrs[gdsSession.activeLocator].names.length
              : 1);
           
          const names = gdsSession?.names && gdsSession.names.length > 0
            ? gdsSession.names
            : (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.names
              ? savedPnrs[gdsSession.activeLocator].names
              : ["SMITH/ANNA MS", "SMITH/GEORGE MR"]);

          let compiledLine = finalPnrLineTemplate;
          compiledLine = compiledLine.replace(/\{AL\}|\[AL\]|\[AL\}/gi, airline);
          compiledLine = compiledLine.replace(/\{px\}|\[px\]|\[px\}/gi, String(passengerCount));
          
          for (let i = 1; i <= 9; i++) {
            const tagCurly = new RegExp(`\\{nm${i}\\}`, "gi");
            const tagSquare = new RegExp(`\\[nm${i}\\]`, "gi");
            const tagMixed = new RegExp(`\\[nm${i}\\}`, "gi");
            const val = names[i - 1] || `SMITH/ANNA MS`;
            compiledLine = compiledLine.replace(tagCurly, val).replace(tagSquare, val).replace(tagMixed, val);
          }
          customPnrAppendedLine = compiledLine.toUpperCase();
          const linePosition = stepToUse.pnrLinePosition || "bottom";
          
          const prefixedLine = linePosition === "top" 
            ? `[POS_TOP]${customPnrAppendedLine}` 
            : linePosition === "middle" 
              ? `[POS_MID]${customPnrAppendedLine}` 
              : customPnrAppendedLine;

          // Synchronize GDS emulator state with the newly appended PNR layout line
          setGdsSession(prev => {
            const currentExtra = prev.extraLines || [];
            return {
              ...prev,
              extraLines: [...currentExtra, prefixedLine]
            };
          });

          const targetLocator = gdsSession?.activeLocator || "BA123A";
          if (targetLocator) {
            setSavedPnrs(prev => {
              const existing = prev[targetLocator] || {};
              const existingExtra = existing.extraLines || [];
              return {
                ...prev,
                [targetLocator]: {
                  ...existing,
                  extraLines: [...existingExtra, prefixedLine]
                }
              };
            });
          }
          
          if (linePosition === "bottom") {
            const inlineModified = insertLineBelowLastNumberedLine(rawOutputLines, customPnrAppendedLine, selectedGds);
            if (inlineModified) {
              rawOutputLines = inlineModified;
              addedInline = true;
            }
          }

          if (!addedInline) {
            const tempSession: GdsSession = {
              availability: gdsSession?.availability || [],
              segments: gdsSession?.segments || (targetLocator && savedPnrs[targetLocator]?.segments) || [],
              names: gdsSession?.names || (targetLocator && savedPnrs[targetLocator]?.names) || [],
              phones: gdsSession?.phones || (targetLocator && savedPnrs[targetLocator]?.phones) || [],
              ticketing: gdsSession?.ticketing || (targetLocator && savedPnrs[targetLocator]?.ticketing) || null,
              receivedFrom: gdsSession?.receivedFrom || (targetLocator && savedPnrs[targetLocator]?.receivedFrom) || null,
              activeLocator: targetLocator,
              extraLines: [...(gdsSession?.extraLines || []), prefixedLine]
            };

            const pnrLines = ["", ...renderGdsPnrBuffer(selectedGds, tempSession), ""];
            rawOutputLines.push(...pnrLines);
          }
        }

        const firstLineClean = rawOutputLines[0]?.trim().toUpperCase() || "";
        const cmdClean = commandText.trim().toUpperCase();
        
        // Check if first output line duplicates the typed command (or with >/* preceding)
        const hasDuplicateCommand = 
          firstLineClean === cmdClean || 
          firstLineClean === `${promptChar}${cmdClean}` ||
          firstLineClean.startsWith(">") && firstLineClean.substring(1).trim() === cmdClean ||
          firstLineClean.startsWith("*") && firstLineClean.substring(1).trim() === cmdClean;

        const formattedOutputSlice = hasDuplicateCommand 
          ? rawOutputLines.slice(1) 
          : rawOutputLines;
        
        let finalOutputSlice = [...formattedOutputSlice];
        if (customPnrAppendedLine && !preventHighlight) {
          const searchPattern = customPnrAppendedLine.toUpperCase();
          finalOutputSlice = finalOutputSlice.map(l => {
            if (l.toUpperCase().includes(searchPattern) && !l.startsWith("__HIGHLIGHT_ORB_GREEN__")) {
              return `__HIGHLIGHT_ORB_GREEN__${l}`;
            }
            return l;
          });
        }
        
        setShownLines(prev => {
          const cleanedBuffer = [...prev];
          // Pop out previous trailing prompt cursor if it matches
          const activePromptChar = promptChar + " ";
          if (cleanedBuffer[cleanedBuffer.length - 1] === activePromptChar || cleanedBuffer[cleanedBuffer.length - 1] === promptChar) {
            cleanedBuffer.pop();
          }
          const cleanedPrev = cleanupPnrDuplication(cleanedBuffer, formattedOutputSlice);
          const highlightPrefix = preventHighlight ? "" : "__HIGHLIGHT_ORB_YELLOW__";
          return [
            ...cleanedPrev,
            `${highlightPrefix}${promptChar}${commandText}`,
            ...finalOutputSlice
          ];
        });
        
        // Handle secondary sequential steps if returned by AI
        if (index + 1 < commandSteps.length) {
          // Brief 150ms pause between whole steps for human readers to follow command lines loading
          setTimeout(() => {
            if (currentRunId !== activeRunIdRef.current) {
               resolve();
               return;
            }
            animateGdsCommandRun(commandSteps, index + 1, preventHighlight).then(resolve);
          }, 150);
        } else {
          if (currentRunId === activeRunIdRef.current) {
            setIsTyping(false);
          }
          resolve();
        }
      };

      finishStep();
    });
  };

  // Submit search query to the AI API route
  const handleAskFormSubmit = async (queryText: string) => {
    if (!queryText.trim() || isAiLoading) return;

    activeRunIdRef.current++;
    setIsAiLoading(true);

    const promptChar = GDS_SYSTEM_INFO[selectedGds].promptChar;
    const isPnrOpen = !!(gdsSession && gdsSession.activeLocator);
    const firstLineClean = shownLines[0]
      ? shownLines[0].replace(/^__HIGHLIGHT_ORB_YELLOW__/, "").replace(/^__HIGHLIGHT_ORB_GREEN__/, "").trim()
      : "";
    const hasWorkspaceContent = isPnrOpen || !!(gdsSession && (gdsSession.names.length > 0 || gdsSession.segments.length > 0)) || (shownLines.length > 1 && firstLineClean !== promptChar.trim());

    // Only start with a clean slate if there is no active reservation or workspace content loaded in the emulator workspace
    if (!hasWorkspaceContent) {
      setShownLines([]);
    }

    try {
      let activeAirline = "BA";
      if (gdsSession?.segments && gdsSession.segments.length > 0) {
        activeAirline = gdsSession.segments[0].airline.toUpperCase();
      } else if (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.segments && savedPnrs[gdsSession.activeLocator].segments.length > 0) {
        activeAirline = savedPnrs[gdsSession.activeLocator].segments[0].airline.toUpperCase();
      }

      const response = await fetch("/api/gds/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gds: selectedGds,
          prompt: queryText,
          activeAirline: activeAirline,
          activeLocator: gdsSession?.activeLocator || null
        })
      });

      if (!response.ok) {
        throw new Error(`Mainframe link returned operational error code: ${response.status}`);
      }

      const parsedData: GDSResponse | any = await response.json();
      setIsSandboxActive(!!parsedData.isSandbox);

      // Verify PNR requirements of matched conversational rule
      if (parsedData.pnrRequired && !gdsSession?.activeLocator) {
        setIsAiLoading(false);
        setCurrentExplanation(`[REJECTED] The command requires an active open PNR record locator.`);
        setShownLines(prev => [
          ...prev,
          `>>> TRANSACTION REJECTED: COMMAND SECURE AUTHORIZATION FAILURE`,
          `>>> REASON: NO ACTIVE PNR OR BOOKING LOCATOR RETRIEVED IN CURRENT WORKSPACE SESSION.`,
          `>>> PLEASE OPEN A BOOKING FILE VIA RETRIEVAL CODE FIRST (E.G. RTZ5X9LV OR *Z5X9LV).`,
          ""
        ]);
        return;
      }

      if (parsedData && parsedData.steps) {
        const activeLocKey = gdsSession?.activeLocator || "4RSZLV";
        const rawSteps = parsedData.steps || [];

        // Robust client-side layout cleaner: substitute any bracketed elements, placeholder templates, or undefined leakages
        const sanitizedSteps: GDSCommandStep[] = rawSteps.map((step: any) => {
          let command = (step.command || step.cmd || step.commandText || "").trim();
          let commandDescription = step.commandDescription || step.description || step.command_description || step.cmdDescription || "";
          let terminalOutput = step.terminalOutput || step.output || step.terminal_output || step.response || "";
          const isHighlighted = !!(step.isHighlighted || step.highlighted || step.highlight);

          const substitutePlaceholders = (text: string) => {
            if (!text) return "";
            return text
              .replace(/\[LOCATOR\]|<LOCATOR>|\[LOCATOR_ID\]|\[RECORD LOCATOR\]|<LOCATOR_ID>|\[PNR\]|PNR_LOCATOR/gi, activeLocKey)
              .replace(/UNDEFINED/gi, activeLocKey)
              .replace(/\[PASSENGER_NAME\]|\[LASTNAME\]\/\[FIRSTNAME\]/gi, "SMITH/ANNA MS")
              .replace(/\[DATE\]/gi, "15OCT")
              .replace(/\[ORIGIN\]|\[DESTINATION\]/gi, "LHR")
              .replace(/\[FLIGHT_NUMBER\]/gi, "BA 115");
          };

          command = substitutePlaceholders(command).toUpperCase();

          // Filter out full English sentence prompts if returned as commands due to low model strictness
          // Use a higher threshold of 75 characters so that long GDS commands (e.g. frequent flyer, infant details) aren't prematurely converted to retrieval commands
          const words = command.split(/\s+/);
          const isEnglishPhrase = words.some(w => ["HOW", "TO", "DO", "BOOK", "CHECK", "SELECT", "ADD", "RESERVE", "ENTER", "NAME", "MEAL", "WET", "WCHR"].includes(w)) && words.length > 2;
          if (isEnglishPhrase || command.length > 75) {
            if (command.includes("MEAL") || command.includes("VGML")) {
              command = "SRVGML/P1";
            } else if (command.includes("LOCATOR") || command.includes("RL") || command.includes("VENDOR")) {
              command = "RL";
            } else if (command.includes("SEAT") || command.includes("ST/")) {
              command = "ST/12A";
            } else {
              command = selectedGds === "amadeus" ? `RT${activeLocKey}` : `*${activeLocKey}`;
            }
          }

          // Clean duplicate CLI tags
          if (command.startsWith("> ") || command.startsWith("* ")) {
            command = command.substring(2);
          } else if (command.startsWith(">") || (command.startsWith("*") && command.length > 7)) {
            command = command.substring(1);
          }

          terminalOutput = substitutePlaceholders(terminalOutput);

          return {
            command,
            commandDescription,
            terminalOutput,
            isHighlighted
          };
        });

        // Detect if any command is retrieving a PNR, and save it in the active session
        let detectedLocator: string | null = null;
        for (const step of sanitizedSteps) {
          const cmd = step.command.toUpperCase().trim();
          if (selectedGds === "amadeus") {
            if (cmd.startsWith("RT")) {
              const loc = cmd.replace("RT", "").replace(/\s+/g, "").trim();
              if (loc.length === 6 && /^[A-Z0-9]{6}$/.test(loc)) {
                detectedLocator = loc;
                break;
              }
            }
          } else { // sabre or galileo
            if (cmd.startsWith("*")) {
              const loc = cmd.replace("*", "").replace(/\s+/g, "").trim();
              if (loc.length === 6 && /^[A-Z0-9]{6}$/.test(loc) && loc !== "ALL") {
                detectedLocator = loc;
                break;
              }
            }
          }
        }

        if (detectedLocator) {
          setGdsSession(prev => ({
            ...prev,
            activeLocator: detectedLocator
          }));
        }

        setCurrentExplanation(parsedData.explanation || "No explanation provided.");

        // Always skip any leading retrieval display step (RT/ * retrieval) so the system types the correct entry first
        let stepsToAnimate = sanitizedSteps;
        if (stepsToAnimate.length > 1) {
          const firstCmd = stepsToAnimate[0].command.toUpperCase().trim();
          const startsWithRetrieval = firstCmd.startsWith("RT") || firstCmd.startsWith("*");
          if (startsWithRetrieval) {
            stepsToAnimate = stepsToAnimate.slice(1);
          }
        }

        setActiveSteps(stepsToAnimate);
        
        // Wipe print line buffer clean if NOT running inside an active GDS workspace session with content
        if (!hasWorkspaceContent) {
          setShownLines([]);
        }

        // Record commands in history for future copy paste
        const newHistoryItem = {
          id: Date.now().toString() + "-" + Math.floor(Math.random() * 1000),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          query: queryText,
          gds: selectedGds,
          commands: stepsToAnimate.map(s => ({
            command: s.command || "",
            description: s.commandDescription || ""
          }))
        };
        
        setSearchHistory(prev => {
          const updated = [newHistoryItem, ...prev];
          try {
            localStorage.setItem("gds_search_command_history", JSON.stringify(updated));
          } catch (e) {
            console.error("Local storage error", e);
          }
          return updated;
        });

        // Automatically expand the history box when a search finishes to make commands immediately copyable
        setIsHistoryExpanded(true);

        await animateGdsCommandRun(stepsToAnimate);
      } else {
        throw new Error("Terminal structures empty or invalid response from GDS Copilot.");
      }
    } catch (err: any) {
      console.error(err);
      setActiveSteps([]);
      const msg = err?.message || "Verify your API configuration and keys.";
      setShownLines([
        `>>> SYSTEM ERROR CODE 505: HOST TIMEOUT`,
        `>>> MESSAGE: ${msg.toUpperCase()}`,
        `>>> PLEASE COMPOSE YOUR REQUEST AGAIN.`
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRunSchedulesCommand = (cmd: string) => {
    if (!cmd) return;
    
    const promptChar = GDS_SYSTEM_INFO[selectedGds].promptChar;
    
    // Append the command to shownLines
    setShownLines(prev => {
      return [...prev, `${promptChar}${cmd}`];
    });

    // Try executing via the stateful cryptic console emulator first
    const emuResult = executeCrypticCommand(
      selectedGds,
      cmd,
      gdsSession,
      setGdsSession,
      savedPnrs,
      setSavedPnrs
    );

    if (emuResult.recognized) {
      setIsSandboxActive(emuResult.isSandbox);
      if (emuResult.explanation) {
        setCurrentExplanation(emuResult.explanation);
      }
      if (emuResult.updateTerminalLines) {
        setShownLines(prev => emuResult.updateTerminalLines!(prev));
      } else {
        setShownLines(prev => {
          const cleanedPrev = cleanupPnrDuplication(prev, emuResult.output);
          return [...cleanedPrev, ...emuResult.output];
        });
      }
      
      // Add command to history so they can copy-paste it
      const newHistoryItem = {
        id: Math.random().toString(36).substring(2, 9).toUpperCase(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        query: `Flight Schedule Lookup: ${cmd}`,
        gds: selectedGds,
        commands: [{ command: cmd, description: emuResult.explanation || "GDS cryptic command executed." }]
      };
      
      setSearchHistory(prev => {
        const updated = [newHistoryItem, ...prev];
        localStorage.setItem("gds_search_command_history", JSON.stringify(updated));
        return updated;
      });
      
      // Auto-scroll terminal
      if (terminalContainerRef.current) {
        setTimeout(() => {
          if (terminalContainerRef.current) {
            terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
          }
        }, 50);
      }
      return;
    }

    // If emulator didn't recognize it, put it in the terminal input and focus!
    setTerminalInput(cmd);
    setTerminalCaretIndex(cmd.length);
    if (terminalContainerRef.current) {
      terminalContainerRef.current.focus();
    }
  };

  const handleTerminalSubmit = async () => {
    const rawInput = terminalInput.trim();
    if (!rawInput) return;

    const promptChar = GDS_SYSTEM_INFO[selectedGds].promptChar;
    
    // Append the command that user just typed to shownLines
    setShownLines(prev => {
      return [...prev, `${promptChar}${rawInput}`];
    });

    const commandToSubmit = terminalInput;
    setTerminalInput("");
    setTerminalCaretIndex(0);

    const { overrulingMatch, capturedFreeText } = findAdminRuleMatch(commandToSubmit);

    if (overrulingMatch) {
      setIsSandboxActive(true);
      
      // 1. Check PNR Required constraint
      if (overrulingMatch.pnrRequired && !gdsSession?.activeLocator) {
        setCurrentExplanation(`[REJECTED] The GDS command '${overrulingMatch.expectedCommand}' requires an open GNR/PNR record locator.`);
        setShownLines(prev => [
          ...prev,
          `>>> TRANSACTION REJECTED: COMMAND SECURE AUTHORIZATION FAILURE`,
          `>>> REASON: NO ACTIVE PNR OR BOOKING LOCATOR RETRIEVED IN CURRENT WORKSPACE SESSION.`,
          `>>> PLEASE OPEN A BOOKING FILE VIA RETRIEVAL CODE FIRST (E.G. RTZ5X9LV OR *Z5X9LV).`,
          ""
        ]);
        return;
      }

      // Compile free text templates for overruled rules
      const phRegex = /\{FREE\s+TEXT\}|\{FREE_TEXT\}|\{TEXT\}|\[FREE\s+TEXT\]|\[FREE_TEXT\]/gi;
      let finalDescription = overrulingMatch.commandDescription;
      let finalTerminalOutput = overrulingMatch.terminalOutput;
      let finalPnrLineTemplate = overrulingMatch.pnrLineTemplate || "";

      if (capturedFreeText) {
        finalDescription = finalDescription.replace(phRegex, capturedFreeText);
        finalTerminalOutput = finalTerminalOutput.replace(phRegex, capturedFreeText);
        finalPnrLineTemplate = finalPnrLineTemplate.replace(phRegex, capturedFreeText);
      }

      setCurrentExplanation(`[ADMIN OVERRULE ACTIVE] ${finalDescription}`);
      let lines = [...finalTerminalOutput.split("\n")];

      // 2. Check Append line on the PNR
      if (overrulingMatch.appendPnrLine && finalPnrLineTemplate) {
        const airline = gdsSession?.segments && gdsSession.segments.length > 0
          ? gdsSession.segments[0].airline.toUpperCase()
          : (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.segments && savedPnrs[gdsSession.activeLocator].segments.length > 0)
            ? savedPnrs[gdsSession.activeLocator].segments[0].airline.toUpperCase()
            : "BA";
            
        const passengerCount = gdsSession?.names && gdsSession.names.length > 0
          ? gdsSession.names.length
          : (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.names
            ? savedPnrs[gdsSession.activeLocator].names.length
            : 1);
         
        const names = gdsSession?.names && gdsSession.names.length > 0
          ? gdsSession.names
          : (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.names
            ? savedPnrs[gdsSession.activeLocator].names
            : ["SMITH/ANNA MS", "SMITH/GEORGE MR"]);

        let compiledLine = finalPnrLineTemplate;
        compiledLine = compiledLine.replace(/\{AL\}|\[AL\]|\[AL\}/gi, airline);
        compiledLine = compiledLine.replace(/\{px\}|\[px\]|\[px\}/gi, String(passengerCount));
        
        for (let i = 1; i <= 9; i++) {
          const tagCurly = new RegExp(`\\{nm${i}\\}`, "gi");
          const tagSquare = new RegExp(`\\[nm${i}\\]`, "gi");
          const tagMixed = new RegExp(`\\[nm${i}\\}`, "gi");
          const val = names[i - 1] || `SMITH/ANNA MS`;
          compiledLine = compiledLine.replace(tagCurly, val).replace(tagSquare, val).replace(tagMixed, val);
        }
        const customPnrAppendedLine = compiledLine.toUpperCase();
        const linePosition = overrulingMatch.pnrLinePosition || "bottom";
        const prefixedLine = linePosition === "top" 
          ? `[POS_TOP]${customPnrAppendedLine}` 
          : linePosition === "middle" 
            ? `[POS_MID]${customPnrAppendedLine}` 
            : customPnrAppendedLine;
        
        setGdsSession(prev => {
          const currentExtra = prev.extraLines || [];
          return {
            ...prev,
            extraLines: [...currentExtra, prefixedLine]
          };
        });

        const targetLocator = gdsSession?.activeLocator;
        if (targetLocator) {
          setSavedPnrs(prev => {
            const existing = prev[targetLocator] || {};
            const existingExtra = existing.extraLines || [];
            return {
              ...prev,
              [targetLocator]: {
                ...existing,
                extraLines: [...existingExtra, prefixedLine]
              }
            };
          });
        }

        // Dynamically compute and append the updated PNR layout to the terminal response so the user immediately sees the appended line and its line number
        let addedInline = false;
        if (linePosition === "bottom") {
          const inlineModified = insertLineBelowLastNumberedLine(lines, customPnrAppendedLine, selectedGds);
          if (inlineModified) {
            lines = inlineModified;
            addedInline = true;
          }
        }

        if (!addedInline) {
          const tempSession: GdsSession = {
            availability: gdsSession?.availability || [],
            segments: gdsSession?.segments || (targetLocator && savedPnrs[targetLocator]?.segments) || [],
            names: gdsSession?.names || (targetLocator && savedPnrs[targetLocator]?.names) || [],
            phones: gdsSession?.phones || (targetLocator && savedPnrs[targetLocator]?.phones) || [],
            ticketing: gdsSession?.ticketing || (targetLocator && savedPnrs[targetLocator]?.ticketing) || null,
            receivedFrom: gdsSession?.receivedFrom || (targetLocator && savedPnrs[targetLocator]?.receivedFrom) || null,
            activeLocator: targetLocator || gdsSession?.activeLocator || "BA123A",
            extraLines: [...(gdsSession?.extraLines || []), prefixedLine]
          };

          const pnrLines = ["", ...renderGdsPnrBuffer(selectedGds, tempSession), ""];
          lines.push(...pnrLines);
        }
      }

      setShownLines(prev => {
        const cleanedPrev = cleanupPnrDuplication(prev, lines);
        return [...cleanedPrev, ...lines];
      });
      return;
    }

    // Try executing via the stateful cryptic console emulator first
    const emuResult = executeCrypticCommand(
      selectedGds,
      commandToSubmit,
      gdsSession,
      setGdsSession,
      savedPnrs,
      setSavedPnrs
    );

    if (emuResult.recognized) {
      setIsSandboxActive(emuResult.isSandbox);
      if (emuResult.explanation) {
        setCurrentExplanation(emuResult.explanation);
      }
      if (emuResult.updateTerminalLines) {
        setShownLines(prev => emuResult.updateTerminalLines!(prev));
      } else {
        setShownLines(prev => {
          const cleanedPrev = cleanupPnrDuplication(prev, emuResult.output);
          return [...cleanedPrev, ...emuResult.output];
        });
      }
      return;
    }

    setIsAiLoading(true);

    try {
      let activeAirline = "BA";
      if (gdsSession?.segments && gdsSession.segments.length > 0) {
        activeAirline = gdsSession.segments[0].airline.toUpperCase();
      } else if (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.segments && savedPnrs[gdsSession.activeLocator].segments.length > 0) {
        activeAirline = savedPnrs[gdsSession.activeLocator].segments[0].airline.toUpperCase();
      }

      const response = await fetch("/api/gds/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gds: selectedGds,
          prompt: commandToSubmit,
          activeAirline: activeAirline,
          activeLocator: gdsSession?.activeLocator || null
        })
      });

      if (!response.ok) {
        throw new Error(`Mainframe link returned operational error code: ${response.status}`);
      }

      const parsedData: GDSResponse = await response.json();
      setIsSandboxActive(!!parsedData.isSandbox);

      if (parsedData && parsedData.steps && parsedData.steps.length > 0) {
        let detectedLocator: string | null = null;
        for (const step of parsedData.steps) {
          const cmd = (step.command || "").toUpperCase().trim();
          if (selectedGds === "amadeus") {
            if (cmd.startsWith("RT")) {
              const loc = cmd.replace("RT", "").replace(/\s+/g, "").trim();
              if (loc.length === 6 && /^[A-Z0-9]{6}$/.test(loc)) {
                detectedLocator = loc;
                break;
              }
            }
          } else { // sabre or galileo
            if (cmd.startsWith("*")) {
              const loc = cmd.replace("*", "").replace(/\s+/g, "").trim();
              if (loc.length === 6 && /^[A-Z0-9]{6}$/.test(loc) && loc !== "ALL") {
                detectedLocator = loc;
                break;
              }
            }
          }
        }

        if (detectedLocator) {
          setGdsSession(prev => ({
            ...prev,
            activeLocator: detectedLocator
          }));
        }

        let outputsToPrint: string[] = [];
        parsedData.steps.forEach((step: any) => {
          const out = step.terminalOutput || step.output || step.terminal_output || step.response || "";
          if (out) {
            outputsToPrint.push(...out.split("\n"));
          }
        });

        const shouldAppendPnrLine = !!(parsedData.appendPnrLine || parsedData.steps?.some((s: any) => s.appendPnrLine));
        const pnrLineTemplate = parsedData.pnrLineTemplate || parsedData.steps?.find((s: any) => s.appendPnrLine)?.pnrLineTemplate;
        const pnrLinePosition = parsedData.pnrLinePosition || parsedData.steps?.find((s: any) => s.appendPnrLine)?.pnrLinePosition || "bottom";

        if (shouldAppendPnrLine && pnrLineTemplate) {
          const airline = gdsSession?.segments && gdsSession.segments.length > 0
            ? gdsSession.segments[0].airline.toUpperCase()
            : (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.segments && savedPnrs[gdsSession.activeLocator].segments.length > 0)
              ? savedPnrs[gdsSession.activeLocator].segments[0].airline.toUpperCase()
              : "BA";
              
          const passengerCount = gdsSession?.names && gdsSession.names.length > 0
            ? gdsSession.names.length
            : (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.names
              ? savedPnrs[gdsSession.activeLocator].names.length
              : 1);
           
          const names = gdsSession?.names && gdsSession.names.length > 0
            ? gdsSession.names
            : (gdsSession?.activeLocator && savedPnrs[gdsSession.activeLocator]?.names
              ? savedPnrs[gdsSession.activeLocator].names
              : ["SMITH/ANNA MS", "SMITH/GEORGE MR"]);

          let compiledLine = pnrLineTemplate;
          compiledLine = compiledLine.replace(/\{AL\}|\[AL\]|\[AL\}/gi, airline);
          compiledLine = compiledLine.replace(/\{px\}|\[px\]|\[px\}/gi, String(passengerCount));
          
          for (let i = 1; i <= 9; i++) {
            const tagCurly = new RegExp(`\\{nm${i}\\}`, "gi");
            const tagSquare = new RegExp(`\\[nm${i}\\]`, "gi");
            const tagMixed = new RegExp(`\\[nm${i}\\}`, "gi");
            const val = names[i - 1] || `SMITH/ANNA MS`;
            compiledLine = compiledLine.replace(tagCurly, val).replace(tagSquare, val).replace(tagMixed, val);
          }
          const customPnrAppendedLine = compiledLine.toUpperCase();
          const prefixedLine = pnrLinePosition === "top" 
            ? `[POS_TOP]${customPnrAppendedLine}` 
            : pnrLinePosition === "middle" 
              ? `[POS_MID]${customPnrAppendedLine}` 
              : customPnrAppendedLine;
          
          setGdsSession(prev => {
            const nextLocator = detectedLocator || prev.activeLocator;
            const currentExtra = prev.extraLines || [];
            return {
              ...prev,
              activeLocator: nextLocator,
              extraLines: [...currentExtra, prefixedLine]
            };
          });

          const targetLocator = detectedLocator || gdsSession?.activeLocator;
          if (targetLocator) {
            setSavedPnrs(prev => {
              const existing = prev[targetLocator] || {};
              const existingExtra = existing.extraLines || [];
              return {
                ...prev,
                [targetLocator]: {
                  ...existing,
                  extraLines: [...existingExtra, prefixedLine]
                }
              };
            });
          }

          // Render the GDS PNR buffer to append to outputsToPrint
          let addedInline = false;
          if (pnrLinePosition === "bottom") {
            const inlineModified = insertLineBelowLastNumberedLine(outputsToPrint, customPnrAppendedLine, selectedGds);
            if (inlineModified) {
              outputsToPrint = inlineModified;
              addedInline = true;
            }
          }

          if (!addedInline) {
            const tempSession: GdsSession = {
              availability: gdsSession?.availability || [],
              segments: gdsSession?.segments || (targetLocator && savedPnrs[targetLocator]?.segments) || [],
              names: gdsSession?.names || (targetLocator && savedPnrs[targetLocator]?.names) || [],
              phones: gdsSession?.phones || (targetLocator && savedPnrs[targetLocator]?.phones) || [],
              ticketing: gdsSession?.ticketing || (targetLocator && savedPnrs[targetLocator]?.ticketing) || null,
              receivedFrom: gdsSession?.receivedFrom || (targetLocator && savedPnrs[targetLocator]?.receivedFrom) || null,
              activeLocator: targetLocator || gdsSession?.activeLocator || "BA123A",
              extraLines: [...(gdsSession?.extraLines || []), prefixedLine]
            };

            const pnrLines = ["", ...renderGdsPnrBuffer(selectedGds, tempSession), ""];
            outputsToPrint.push(...pnrLines);
          }
        }

        if (parsedData.explanation) {
          setCurrentExplanation(parsedData.explanation);
        }

        if (outputsToPrint.length > 0) {
          // Filter duplicate echoes at the beginning of the printed output
          const firstOutLine = outputsToPrint[0]?.trim().toUpperCase() || "";
          const cmdClean = commandToSubmit.trim().toUpperCase();
          if (
            firstOutLine === cmdClean || 
            firstOutLine === `${promptChar}${cmdClean}` ||
            (firstOutLine.startsWith(">") && firstOutLine.substring(1).trim() === cmdClean) ||
            (firstOutLine.startsWith("*") && firstOutLine.substring(1).trim() === cmdClean)
          ) {
            outputsToPrint.shift();
          }

          setShownLines(prev => {
            const cleanedPrev = cleanupPnrDuplication(prev, outputsToPrint);
            return [...cleanedPrev, ...outputsToPrint, ""];
          });
        } else {
          setShownLines(prev => [...prev, `NO MAIN COMMUNICATIONS REGISTERED`, ""]);
        }
      } else {
        throw new Error("Terminal response structures mismatch.");
      }
    } catch (err: any) {
      console.error(err);
      const randomLocator = Math.random().toString(36).substring(2, 8).toUpperCase();
      const upperInput = commandToSubmit.toUpperCase();
      let mockResp = "";
      if (selectedGds === "amadeus") {
        if (upperInput.startsWith("AN")) {
          mockResp = `** AMADEUS AVAILABILITY - AN ** LHR LONDON.GB / JFK NEW YORK.US\n 1   LH 400  C9 D9 Y9 M9 /LHR 1005   JFK 1255  74H 0/E\n 2   BA 117  F9 A9 J9 Y9 /LHR 0835   JFK 1130  777 0/E\n>`;
        } else if (upperInput.startsWith("SS")) {
          mockResp = ` 1  BA 117 Y 15OCT LHRJFK HK1   0835 1130   *EF*\n>`;
        } else if (upperInput.startsWith("NM")) {
          mockResp = ` 1 SMITH/ANNA MS\n>`;
        } else if (upperInput === "ER") {
          mockResp = `RP/LONBA2460/LONBA2460            27MAY26/0830Z   ${randomLocator}\n 1.SMITH/ANNA MS\n 2  BA 117 Y 15OCT LHRJFK HK1   0835 1130\nPNR KEY - ${randomLocator}\n>`;
        } else {
          mockResp = `ENTRY OK - PROCEED WITH ${upperInput}\n TRANSACTION COMPLETED`;
        }
      } else if (selectedGds === "sabre") {
        if (upperInput.startsWith("1")) {
          mockResp = `15OCT LHR-JFK C*BA/VS/AA/LH\n 1BA 117 F9 C9 Y9 B9   LHR0830   JFK1130 777 0 /E\n 2VS  03 J9 C9 Y9 B9   LHR1230   JFK1545 350 0 /E\n*`;
        } else if (upperInput.startsWith("0")) {
          mockResp = `01Y1 - SEAT SOLD SEGMENT COMMITTED\n 1 BA 117Y 15OCT LHRJFK SS1   0830  1130\n*`;
        } else if (upperInput === "ER") {
          mockResp = `ER RE-DISPLAY COMPLETE\nSABRE RECORD LOCATOR - ${randomLocator}\n1.1 SMITH/ANNA MS\n1 BA 117Y 15OCT LHRJFK SS1  0830 1135\n*`;
        } else {
          mockResp = `SABRE CORE PARSER OK - ${upperInput}\nENTRY REGISTERED`;
        }
      } else {
        if (upperInput.startsWith("A")) {
          mockResp = `LHR-JFK 15OCT      ** TRAVELPORT GALILEO SATELLITE ENTRY **\n 1   BA 117  F9 A9 C9 Y9  0830 LHR 1130 JFK 777 0*E\n>`;
        } else if (upperInput.startsWith("N")) {
          mockResp = ` 1  BA 117 Y 15OCT LHRJFK*HS1   0830 1130  E*\n>`;
        } else if (upperInput === "ER") {
          mockResp = `GW86XP/1D LON   SYSTEM GDS   27MAY26 08:30Z\nRECORD LOCATOR - ${randomLocator}\n>`;
        } else {
          mockResp = `GALILEO MAIN LINK LOGICAL CONFIRMATION: ${upperInput}`;
        }
      }
      
      const lines = mockResp.split("\n");
      setShownLines(prev => [...prev, ...lines, ""]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Quick preset trigger
  const handleQuickDemoClick = (demoText: string) => {
    setAiPromptInput(demoText);
    handleAskFormSubmit(demoText);
  };

  // Reset current screen state
  const handleResetScreen = () => {
    activeRunIdRef.current++;
    setShownLines([]);
    setAiPromptInput("");
    setActiveSteps([]);
    setIsSandboxActive(false);
    setCurrentExplanation("Ask Orbs to see Amadeus commands typed and outputs simulated in real time below!");
  };

  // Quick dynamic retrieval for premium practice PNR locators
  const handleRetrievePracticePnr = (loc: string) => {
    activeRunIdRef.current++;
    setIsTyping(false);
    
    const cmd = selectedGds === "amadeus" ? `RT${loc}` : `*${loc}`;
    
    setTerminalInput("");
    setTerminalCaretIndex(0);
    
    const emuResult = executeCrypticCommand(
      selectedGds,
      cmd,
      gdsSession,
      setGdsSession,
      savedPnrs,
      setSavedPnrs
    );

    setIsSandboxActive(emuResult.isSandbox);
    if (emuResult.explanation) {
      setCurrentExplanation(emuResult.explanation);
    }
    const promptChar = GDS_SYSTEM_INFO[selectedGds].promptChar;
    setShownLines(prev => {
      const cleaned = cleanupPnrDuplication(prev, emuResult.output);
      return [...cleaned, `${promptChar}${cmd}`, ...emuResult.output];
    });
  };

  // Replay typing sequence for the active entries 
  const handleRepeatEntry = async () => {
    if (activeSteps.length === 0 || isTyping || isAiLoading) return;
    activeRunIdRef.current++;
    setShownLines([]);
    await animateGdsCommandRun(activeSteps);
  };

  // Launch simulator with prompt parameter from Landing Showcase or Hero
  const handleLaunchSimulatorFromLanding = (customPrompt?: string, gdsSystem?: GDSSystem) => {
    activeRunIdRef.current++;
    setActiveTab("simulator");
    if (gdsSystem) {
      setSelectedGds(gdsSystem);
      const info = GDS_SYSTEM_INFO[gdsSystem];
      setShownLines([]);
      setActiveSteps([]);
      setIsSandboxActive(false);
      
      if (customPrompt) {
        setAiPromptInput(customPrompt);
        setTimeout(() => {
          handleAskFormSubmit(customPrompt);
        }, 150);
      }
    } else if (customPrompt) {
      setAiPromptInput(customPrompt);
      handleAskFormSubmit(customPrompt);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-cyan-200 selection:text-slate-950">
      
      {/* Header spanning the full page width naturally with centered beautiful container inside */}
      <header className="w-full bg-white border-b border-slate-200 py-4 shadow-sm sticky top-0 z-[100]">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <OrbitDeskLogo className="w-14 h-14" showText={true} theme="light" />

          {/* Tab Selection Navigation Segmented Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Platform View Tab Toggles */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 font-sans animate-fade-in shadow-inner">
              <button
                type="button"
                id="platform-tab-hub"
                onClick={() => setActiveTab("hub")}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "hub"
                    ? "bg-white border border-slate-200 text-cyan-600 shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
                }`}
              >
                <Home className="w-3.5 h-3.5" /> HUB
              </button>
              <button
                type="button"
                id="platform-tab-simulator"
                onClick={() => setActiveTab("simulator")}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "simulator"
                    ? "bg-white border border-slate-200 text-cyan-600 shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" /> SANDBOX
              </button>
              <button
                type="button"
                id="platform-tab-assessment"
                onClick={() => setActiveTab("assessment")}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "assessment"
                    ? "bg-white border border-slate-200 text-indigo-600 shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
                }`}
              >
                <Award className="w-3.5 h-3.5 text-indigo-500" /> ASSESSMENT <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded-sm">BETA</span>
              </button>
              <button
                type="button"
                id="platform-tab-pricing"
                onClick={() => setActiveTab("pricing")}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold uppercase transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "pricing"
                    ? "bg-white border border-slate-200 text-cyan-600 shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-cyan-500" /> PLANS & PRICING
              </button>
            </div>

            {isLoggedIn ? (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 py-1.5 px-3.5 rounded-xl font-sans text-xs shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-slate-550 text-slate-500 font-medium">Trainee:</span>
                <span className="font-bold text-slate-700 truncate max-w-[150px]" title={traineeEmail}>
                  {traineeEmail}
                </span>
                <button
                  type="button"
                  id="platform-logout-btn"
                  onClick={() => {
                    setIsLoggedIn(false);
                    setTraineeEmail("");
                    if (activeTab === "simulator" || activeTab === "assessment") {
                      setActiveTab("hub");
                    }
                  }}
                  className="ml-2 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                  title="Sign Out Workstation"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-amber-700 bg-amber-500/5 rounded-xl border border-amber-500/20 font-bold shadow-sm">
                <Lock className="w-3.5 h-3.5 text-amber-500" /> Guest Mode
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Expansive Content Body spanning a gorgeous responsive maximum width */}
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-8 flex-1">

        {/* Conditional Workspace Rendering */}
        {!isLoggedIn && (activeTab === "simulator" || activeTab === "assessment") ? (
          <LoginScreen 
            onLoginSuccess={(email) => {
              setIsLoggedIn(true);
              setTraineeEmail(email);
            }} 
          />
        ) : activeTab === "hub" ? (
          <GdsLandingPage onLaunchSimulator={handleLaunchSimulatorFromLanding} onNavigateToTab={setActiveTab} />
        ) : activeTab === "admin" ? (
          <AdminBackOffice 
            onBackToSimulator={() => setActiveTab("simulator")} 
            onRefreshGlobalRules={fetchAdminRules} 
            onRefreshRouteRules={fetchRouteRules} 
          />
        ) : activeTab === "assessment" ? (
          <AmadeusAssessment />
        ) : activeTab === "pricing" ? (
          <PricingPlans />
        ) : isTerminalFullscreen ? (
          // ==============================
          // IMMERSIVE FULL SCREEN WORKSPACE VIEW (HAS ASK ORBS SIDEBAR)
          // ==============================
          <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col h-screen overflow-hidden p-4 md:p-6 text-slate-200">
            {/* Modern Console Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-850 pb-3 mb-4 shrink-0">
              {/* Left Logo / Status */}
              <div className="flex items-center gap-3">
                <OrbitDeskLogo className="w-10 h-10 animate-fade-in" showText={false} theme="dark" />
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-widest text-slate-100 flex items-center gap-2">
                    ORBITDESK SIMULATOR
                    <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                    LIVE {selectedGds.toUpperCase()} CONNECTION • IMMERSIVE FULL VIEW
                  </span>
                </div>
              </div>

              {/* Center - GDS Platform Selector inside Full Screen Header */}
              <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl items-center gap-1 font-sans text-xs">
                {(["amadeus", "galileo", "sabre"] as const).map((gds) => {
                  const isActive = selectedGds === gds;
                  const activeColorClasses = 
                    gds === "amadeus" 
                      ? "text-slate-950 bg-cyan-400 border-cyan-300 shadow-sm" 
                      : gds === "sabre" 
                      ? "text-slate-950 bg-sky-300 border-sky-200 shadow-sm" 
                      : "text-slate-950 bg-indigo-300 border-indigo-200 shadow-sm";

                  return (
                    <button
                      key={gds}
                      type="button"
                      onClick={() => handleGdsSwitch(gds)}
                      className={`px-4 py-1.5 text-xs rounded-lg font-black uppercase transition-all duration-300 cursor-pointer ${
                        isActive 
                          ? `${activeColorClasses} border` 
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-850"
                      }`}
                    >
                      {gds}
                    </button>
                  );
                })}
              </div>

              {/* Right controls - Themes + Exit Button */}
              <div className="flex items-center gap-3">
                {/* Mini Theme Pickers */}
                <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-sans">
                  {(["blue", "black", "slate"] as const).map((themeKey) => {
                    const active = monitorTheme === themeKey;
                    const cfg = THEMES_CONFIG[themeKey];
                    return (
                      <button
                        key={themeKey}
                        onClick={() => setMonitorTheme(themeKey)}
                        className={`w-3.5 h-3.5 rounded-full border cursor-pointer border-slate-700 ${cfg.dotBg} ${active ? "ring-2 ring-cyan-400 scale-110 shadow" : "opacity-55 hover:opacity-100"}`}
                        title={`${cfg.name} Theme`}
                      />
                    );
                  })}
                </div>

                {/* Text Size Control */}
                <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 font-sans">
                  <Type className="w-3.5 h-3.5 text-cyan-400" />
                  <button
                    type="button"
                    disabled={terminalTextScale <= 80}
                    onClick={() => setTerminalTextScale(prev => Math.max(80, prev - 20))}
                    className="p-0.5 px-2 bg-slate-800 border border-slate-750 hover:border-slate-500 disabled:opacity-40 disabled:hover:border-slate-750 text-[10px] font-black rounded cursor-pointer transition-all active:scale-95 text-white select-none"
                    title="Decrease Text Size"
                  >
                    A-
                  </button>
                  <span className="text-[10px] font-black font-sans w-10 text-center text-cyan-400">
                    {terminalTextScale}%
                  </span>
                  <button
                    type="button"
                    disabled={terminalTextScale >= 220}
                    onClick={() => setTerminalTextScale(prev => Math.min(220, prev + 20))}
                    className="p-0.5 px-2 bg-slate-800 border border-slate-750 hover:border-slate-500 disabled:opacity-40 disabled:hover:border-slate-750 text-[10px] font-black rounded cursor-pointer transition-all active:scale-95 text-white select-none"
                    title="Increase Text Size"
                  >
                    A+
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTerminalFullscreen(false)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs font-sans uppercase rounded-lg border border-rose-600 cursor-pointer shadow p-2.5 transition-all hover:scale-105 active:scale-95"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  Exit Full Screen
                </button>
              </div>
            </div>            {/* Main Workspace Frame */}
            <div className="flex-grow flex flex-col lg:flex-row gap-5 overflow-hidden min-h-0">
               {/* Left Column: CRT SIMULATOR SCREEN + COMMAND EXTRAS */}
              <div className="lg:w-7/12 xl:w-8/12 flex flex-col gap-3 min-h-0 h-full">
                {/* Simulated CRT Screen Element */}
                <div 
                  ref={terminalContainerRef}
                  onClick={handleTerminalClick}
                  style={{ 
                    backgroundColor: THEMES_CONFIG[monitorTheme].bg,
                    fontSize: `${(16 * terminalTextScale) / 100}px`
                  }}
                  className={`flex-1 min-h-0 rounded-2xl p-5 md:p-8 font-mono font-bold tracking-wide leading-relaxed overflow-y-auto relative crt-monitor-glow shadow-inner border cursor-text select-text ${THEMES_CONFIG[monitorTheme].borderClass}`}
                >
                  {/* Ambient Scanline overlay filters */}
                  <div className="absolute inset-0 pointer-events-none crt-scanlines z-0 opacity-45"></div>
 
                  {/* Font phosphor wrapper */}
                  <div className={`relative z-10 space-y-1 break-all tracking-wider ${THEMES_CONFIG[monitorTheme].textClass}`}>
                    {/* Prior print lines */}
                    {shownLines.map((line, idx) => {
                      let displayLine = line;
                      let highlightClass = "";
                      
                      if (line.startsWith("__HIGHLIGHT_ORB_YELLOW__")) {
                        displayLine = line.replace("__HIGHLIGHT_ORB_YELLOW__", "");
                        highlightClass = "text-yellow-300 font-extrabold bg-yellow-500/15 px-2 py-0.5 my-0.5 rounded border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.15)]";
                      } else if (line.startsWith("__HIGHLIGHT_ORB_GREEN__")) {
                        displayLine = line.replace("__HIGHLIGHT_ORB_GREEN__", "");
                        highlightClass = "text-emerald-400 font-extrabold bg-emerald-500/15 px-2 py-0.5 my-0.5 rounded border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]";
                      }

                      return (
                        <div 
                          key={idx} 
                          className={`whitespace-pre-wrap min-h-[1.5em] transition-all duration-300 ${highlightClass}`}
                        >
                          {displayLine}
                        </div>
                      );
                    })}

                    {/* Interactive caret-tracking cursor prompt line */}
                    {!isTyping && (
                      <div className="whitespace-pre-wrap min-h-[1.5em] text-white font-bold flex items-center relative gap-1.5 w-full">
                        <span className="shrink-0 text-white select-none">{GDS_SYSTEM_INFO[selectedGds].promptChar}</span>
                        
                        <div className="flex-1 flex items-center tracking-widest min-h-[1.5em] select-none z-10">
                          {isAiLoading && terminalInput === "" ? (
                            <span className="inline-block w-2 h-[1.2em] bg-cyan-400 text-cyan-400 terminal-cursor animate-pulse" style={{ verticalAlign: "middle" }}></span>
                          ) : (
                            (() => {
                              const chars = terminalInput.split("");
                              const elements = [];
                              for (let i = 0; i <= chars.length; i++) {
                                const isCursorHere = i === terminalCaretIndex;
                                const char = chars[i];
                                if (i === chars.length) {
                                  if (isCursorHere && !isAiLoading) {
                                    elements.push(
                                      <span 
                                        key={i} 
                                        className={`inline-block bg-cyan-400 text-[#000080] font-black w-[0.6em] text-center ${isTerminalInputFocused ? "terminal-cursor" : "opacity-65"} select-none`}
                                        style={{ minHeight: "1.5em", lineHeight: "1" }}
                                      >
                                        &nbsp;
                                      </span>
                                    );
                                  }
                                } else {
                                  if (isCursorHere && !isAiLoading) {
                                    elements.push(
                                      <span 
                                        key={i} 
                                        className={`inline-block bg-cyan-400 text-[#000080] font-black w-[0.6em] text-center select-none ${isTerminalInputFocused ? "" : "opacity-80"}`}
                                        style={{ minHeight: "1.5em", lineHeight: "1" }}
                                      >
                                        {char.toUpperCase()}
                                      </span>
                                    );
                                  } else {
                                    elements.push(
                                      <span key={i} className="text-white font-bold">
                                        {char.toUpperCase()}
                                      </span>
                                    );
                                  }
                                }
                              }
                              return elements;
                            })()
                          )}
                        </div>

                        <input
                          ref={terminalInputRefFull}
                          type="text"
                          value={terminalInput}
                          onChange={(e) => {
                            setTerminalInput(e.target.value);
                            updateTerminalCaret(e.target);
                          }}
                          onSelect={(e) => {
                            updateTerminalCaret(e.currentTarget);
                          }}
                          onKeyUp={(e) => {
                            updateTerminalCaret(e.currentTarget);
                          }}
                          onClick={(e) => {
                            updateTerminalCaret(e.currentTarget);
                          }}
                          onFocus={() => setIsTerminalInputFocused(true)}
                          onBlur={() => setIsTerminalInputFocused(false)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleTerminalSubmit();
                            }
                          }}
                          disabled={isAiLoading}
                          className="absolute left-6 right-0 top-0 bottom-0 bg-transparent border-none text-transparent caret-transparent focus:outline-none focus:ring-0 font-mono text-base uppercase p-0 h-auto z-20 select-text cursor-text"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Under-Terminal Screen Utils Block */}
                <div className="flex items-center justify-between gap-3 px-1 text-xs text-slate-400 font-sans shrink-0">
                  <div className="flex items-center gap-2 font-bold text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    <span>Host connected & synchronized</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {activeSteps.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRepeatEntry}
                        disabled={isTyping || isAiLoading}
                        className="hover:text-yellow-400 text-slate-300 disabled:opacity-30 transition cursor-pointer flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-yellow-500" /> REPEAT ENTRY
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleResetScreen}
                      className="hover:text-cyan-400 text-slate-300 transition cursor-pointer flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> CLEAR SCREEN
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: ASK ORBS PANEL + ANALYSIS (SCROLLABLE SIDE PANEL) */}
              <div className="lg:w-5/12 xl:w-4/12 flex flex-col gap-4 min-h-0 h-full overflow-y-auto pr-1 pb-4">
                {/* Practice PNRs Quick Selector Desk in Full Screen */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col gap-3.5 shadow-lg shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                      <Database className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-sans">
                        PRACTICE PNR SELECTOR
                      </h3>
                      <p className="text-[10px] text-slate-400 font-sans font-medium">Load pre-configured test reservations into GDS</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-2 rounded-lg border border-slate-850">
                      <label htmlFor="pnr-select-fs" className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 select-none">
                        Quick Load:
                      </label>
                      <select
                        id="pnr-select-fs"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleRetrievePracticePnr(e.target.value);
                            e.target.value = ""; // Reset dropdown selection after loading
                          }
                        }}
                        className="w-full bg-transparent border-none text-xs font-bold text-cyan-400 focus:outline-none cursor-pointer p-0.5"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">-- Choose Practice PNR --</option>
                        {Object.keys(DEFAULT_PRACTICE_PNRS).map(loc => {
                          const pnr = DEFAULT_PRACTICE_PNRS[loc];
                          const airlineName = pnr.segments[0].airline === "BA" ? "British Airways" :
                                pnr.segments[0].airline === "LH" ? "Lufthansa" :
                                pnr.segments[0].airline === "TG" ? "Thai Airways" :
                                pnr.segments[0].airline === "SQ" ? "Singapore Airlines" :
                                pnr.segments[0].airline === "UA" ? "United Airlines" : "Emirates";
                          return (
                            <option key={loc} value={loc} className="bg-slate-900 text-slate-200">
                              {loc} - {pnr.segments[0].origin}→{pnr.segments[0].destination} ({airlineName})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ask Orbs Interactive Console Desk */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col gap-3.5 shadow-lg shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 opacity-20 blur" />
                      <div className="relative w-9 h-9 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center overflow-hidden">
                        <div className="w-5 h-4.5 rounded bg-slate-900 border border-cyan-500/50 flex flex-col justify-between p-0.5 shadow-inner relative">
                          <div className="flex justify-around items-center w-full mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-sm bg-cyan-400 shadow-[0_0_4px_rgba(8,145,178,0.9)]"></div>
                            <div className="w-1.5 h-1.5 rounded-sm bg-cyan-400 shadow-[0_0_4px_rgba(8,145,178,0.9)]"></div>
                          </div>
                          <div className="w-3.5 h-0.5 mx-auto bg-cyan-400/80 mb-0.5 rounded"></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 font-sans flex items-center gap-1.5">
                        Ask Orbs
                        <span className="text-[9px] font-black bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded px-1.5 tracking-widest uppercase py-0.5 animate-pulse">
                          Pilot
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-sans">Interactive GDS Command Copilot & Translation Desk</p>
                    </div>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskFormSubmit(aiPromptInput);
                    }} 
                    className="flex flex-col gap-3"
                  >
                    <textarea
                      value={aiPromptInput}
                      onChange={(e) => setAiPromptInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (aiPromptInput.trim() && !isAiLoading) {
                            handleAskFormSubmit(aiPromptInput);
                          }
                        }
                      }}
                      placeholder="e.g., London to Bangkok return"
                      className="w-full min-h-[95px] bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none rounded-lg px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 font-sans resize-y"
                      disabled={isAiLoading}
                      rows={3}
                    />
                    
                    <button
                      type="submit"
                      disabled={isAiLoading || !aiPromptInput.trim()}
                      className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-850 disabled:text-slate-550 text-slate-950 px-5 py-2.5 rounded-lg font-sans text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                    >
                      {isAiLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                          TYPING SYSTEM CODES...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> ASK ORBS CO-PILOT
                        </>
                      )}
                    </button>
                  </form>

                  {/* Training presets compact list */}
                  <div className="border-t border-slate-850 pt-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">💡 Presets:</span>
                    <div className="flex flex-col gap-1.5">
                      {[
                        "how do you book seats",
                        "how to check availability to Bangkok on 26th September",
                        "creating passenger name records (PNR)"
                      ].map((demo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleQuickDemoClick(demo)}
                          className="bg-slate-950 hover:bg-slate-850 text-left text-slate-350 hover:text-cyan-400 transition text-[11px] px-3 py-2 rounded border border-slate-850 cursor-pointer font-semibold block text-ellipsis overflow-hidden whitespace-nowrap"
                        >
                          {demo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Analysis description if populated */}
                {currentExplanation && currentExplanation.trim() !== "" && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 text-xs text-slate-350 leading-relaxed font-sans flex flex-col gap-3 shadow-md">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-800 pb-2 mb-1 shrink-0">
                      <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="uppercase tracking-wider font-sans">Explanation Breakdown</span>
                    </div>
                    <p className="text-[13px] leading-relaxed font-medium text-slate-200">
                      {currentExplanation}
                    </p>

                    {/* Inline Step Sequence in Full Screen Side-Panel */}
                    {activeSteps.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-850 flex flex-col gap-3">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          Command Pipeline breakdown:
                        </span>
                        <div className="flex flex-col gap-2.5">
                          {activeSteps.map((step, idx) => {
                            const isCoreTarget = step.isHighlighted;
                            return (
                              <div 
                                key={idx}
                                className={`p-3 rounded border flex flex-col gap-1.5 transition-all ${
                                  isCoreTarget 
                                    ? "bg-amber-500/10 border-amber-650 border-amber-600/50 text-amber-250 shadow-inner" 
                                    : "bg-slate-950 border-slate-850 text-slate-300"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] uppercase font-bold tracking-tight text-slate-400">
                                    Step {idx + 1}
                                  </span>
                                  {isCoreTarget && (
                                    <span className="text-[9px] font-black bg-amber-400 text-slate-950 rounded px-1 uppercase scale-95 py-0.5">
                                      Target
                                    </span>
                                  )}
                                </div>
                                <code className={`px-2 py-1 rounded font-mono font-bold text-xs tracking-wider inline-block self-start ${
                                  isCoreTarget ? "bg-amber-400 text-slate-950" : "bg-slate-900 border border-slate-800 text-cyan-400"
                                }`}>
                                  {step.command}
                                </code>
                                <p className="text-[11px] leading-normal font-normal text-slate-400">
                                  {step.commandDescription}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* SECTION 1: Simulated Retro CRT GDS Screen Panel FIRST */}
            <div className="flex flex-col gap-3">
              
              {/* Dynamic GDS Switcher right inside the Terminal Page - Elevated Visibility */}
              <div id="gds-terminal-switcher" className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-100 border border-cyan-200 text-cyan-600 animate-pulse shadow-inner">
                    <TerminalIcon className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base sm:text-lg font-sans font-black uppercase tracking-widest text-slate-805 text-slate-800">
                      Select GDS Environment:
                    </span>
                    <span className="text-xs text-slate-500 font-sans tracking-wide">
                      Each terminal speaks a completely unique shorthand command language & syntax dialect
                    </span>
                  </div>
                </div>
                
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 items-center gap-2 font-sans text-xs shadow-inner">
                  {(["amadeus", "galileo", "sabre"] as const).map((gds) => {
                    const isActive = selectedGds === gds;
                    
                    // High impact active classes
                    const activeColorClasses = 
                      gds === "amadeus" 
                        ? "text-slate-950 bg-cyan-400 border-cyan-300 shadow-sm scale-105" 
                        : gds === "sabre" 
                        ? "text-slate-950 bg-sky-300 border-sky-200 shadow-sm scale-105" 
                        : "text-slate-950 bg-indigo-300 border-indigo-200 shadow-sm scale-105";
                    
                    return (
                      <button
                        key={gds}
                        type="button"
                        onClick={() => handleGdsSwitch(gds)}
                        className={`px-5 py-2.5 text-xs sm:text-sm rounded-lg font-black uppercase transition-all duration-300 cursor-pointer ${
                          isActive 
                            ? `${activeColorClasses} border` 
                            : "text-slate-550 text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                        }`}
                        title={`Select ${gds.toUpperCase()} database network`}
                      >
                        <span className="flex items-center gap-2 tracking-widest font-black">
                          {isActive && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
                            </span>
                          )}
                          {gds}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
          
          {/* Bezel Title & Screen Controls with Elevated Styling & Visibility */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1 mt-3">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className={`absolute w-3.5 h-3.5 rounded-full inline-block animate-ping ${
                  selectedGds === "amadeus" ? "bg-cyan-500/60" : selectedGds === "sabre" ? "bg-sky-500/60" : "bg-indigo-500/60"
                }`}></span>
                <span className={`relative w-2.5 h-2.5 rounded-full inline-block ${
                  selectedGds === "amadeus" ? "bg-cyan-600" : selectedGds === "sabre" ? "bg-sky-600" : "bg-indigo-600"
                }`}></span>
              </div>
              <h2 className={`text-sm sm:text-base tracking-widest font-black flex items-center gap-2 ${
                selectedGds === "amadeus" 
                  ? "text-cyan-705 text-cyan-600" 
                  : selectedGds === "sabre" 
                  ? "text-sky-600" 
                  : "text-indigo-600"
              } font-sans`}>
                {selectedGds === "amadeus" ? "AMADEUS GDS TERMINAL" : `${GDS_SYSTEM_INFO[selectedGds].fullName.toUpperCase()} TERMINAL`}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-200">
                ONLINE
              </span>
            </div>

            {/* Speed & Phosphor controls side by side */}
            <div className="flex flex-wrap items-center gap-4">
 
              {/* Monitor Theme style pickers */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-705 text-slate-700 font-sans uppercase tracking-wider font-extrabold animate-fade-in">Monitor Theme:</span>
                <div className="flex items-center gap-2">
                  {(["blue", "black", "slate"] as const).map((themeKey) => {
                    const active = monitorTheme === themeKey;
                    const cfg = THEMES_CONFIG[themeKey];
                    return (
                      <button
                        key={themeKey}
                        onClick={() => setMonitorTheme(themeKey)}
                        className={`w-5 h-5 rounded-full border cursor-pointer border-slate-300 ${cfg.dotBg} ${active ? "ring-2 ring-cyan-500 scale-125 shadow-md" : "opacity-60 hover:opacity-100"}`}
                        title={`${cfg.name} Theme`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Text Size Accessibility Controller */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-750 text-slate-700 font-sans uppercase tracking-wider font-extrabold flex items-center gap-1.5 whitespace-nowrap">
                  <Type className="w-4 h-4 text-cyan-600 animate-fade-in" /> Text Size:
                </span>
                <div className="flex items-center gap-1.5 font-sans">
                  <button
                    type="button"
                    disabled={terminalTextScale <= 80}
                    onClick={() => setTerminalTextScale(prev => Math.max(80, prev - 20))}
                    className="p-1 px-2.5 bg-white border border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:hover:border-slate-300 text-xs font-bold rounded cursor-pointer transition-all active:scale-95 text-slate-700 select-none"
                    title="Decrease Text Size"
                  >
                    A-
                  </button>
                  <span className="text-xs font-bold font-sans w-12 text-center text-slate-600 select-none">
                    {terminalTextScale}%
                  </span>
                  <button
                    type="button"
                    disabled={terminalTextScale >= 220}
                    onClick={() => setTerminalTextScale(prev => Math.min(220, prev + 20))}
                    className="p-1 px-2.5 bg-white border border-slate-300 hover:border-slate-400 disabled:opacity-40 disabled:hover:border-slate-300 text-xs font-bold rounded cursor-pointer transition-all active:scale-95 text-slate-700 select-none"
                    title="Increase Text Size"
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Full screen toggle button */}
              <button
                type="button"
                onClick={() => setIsTerminalFullscreen(true)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-sans font-black text-xs px-5 py-3 rounded-xl border border-slate-950 cursor-pointer shadow transition-all hover:scale-105 active:scale-95 duration-200 uppercase tracking-widest"
                title="Enter Immersive Full Screen view"
              >
                <Maximize2 className="w-4 h-4 text-cyan-400" />
                <span>FULLSCREEN</span>
              </button>
            </div>
          </div>
 
          {/* Genuine CRT Screen view */}
          <div 
            ref={terminalContainerRef}
            onClick={handleTerminalClick}
            style={{ 
              backgroundColor: THEMES_CONFIG[monitorTheme].bg,
              fontSize: `${(18 * terminalTextScale) / 100}px`
            }}
            className={`rounded-2xl p-6 md:p-10 font-mono font-bold tracking-wide leading-relaxed overflow-y-auto h-[540px] md:h-[620px] relative crt-monitor-glow shadow-inner border cursor-text select-text ${THEMES_CONFIG[monitorTheme].borderClass}`}
          >
            
            {/* Ambient Scanline overlay filters */}
            <div className="absolute inset-0 pointer-events-none crt-scanlines z-0 opacity-45"></div>

            {/* Font phosphor wrapper */}
            <div className={`relative z-10 space-y-1.5 break-all tracking-wider ${THEMES_CONFIG[monitorTheme].textClass}`}>
              
              {/* Prior print lines */}
              {shownLines.map((line, idx) => {
                let displayLine = line;
                let highlightClass = "";
                
                if (line.startsWith("__HIGHLIGHT_ORB_YELLOW__")) {
                  displayLine = line.replace("__HIGHLIGHT_ORB_YELLOW__", "");
                  highlightClass = "text-yellow-300 font-extrabold bg-yellow-500/15 px-2.5 py-1 my-1 rounded-lg border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
                } else if (line.startsWith("__HIGHLIGHT_ORB_GREEN__")) {
                  displayLine = line.replace("__HIGHLIGHT_ORB_GREEN__", "");
                  highlightClass = "text-emerald-400 font-extrabold bg-emerald-500/15 px-2.5 py-1 my-1 rounded-lg border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                }

                return (
                  <div 
                    key={idx} 
                    className={`whitespace-pre-wrap min-h-[1.5em] transition-all duration-300 ${highlightClass}`}
                  >
                    {displayLine}
                  </div>
                );
              })}

              {/* Interactive caret-tracking cursor prompt line when not typewriter simulating */}
              {!isTyping && (
                <div className="whitespace-pre-wrap min-h-[1.5em] text-white font-bold flex items-center relative gap-1.5 w-full">
                  <span className="shrink-0 text-white select-none">{GDS_SYSTEM_INFO[selectedGds].promptChar}</span>
                  
                  {/* Overlapping custom layout for block cursor */}
                  <div className="flex-1 flex items-center tracking-widest min-h-[1.5em] select-none z-10">
                    {isAiLoading && terminalInput === "" ? (
                      <span className="inline-block w-2.5 h-[1.2em] bg-cyan-400 text-cyan-400 terminal-cursor animate-pulse" style={{ verticalAlign: "middle" }}></span>
                    ) : (
                      (() => {
                        const chars = terminalInput.split("");
                        const elements = [];
                        for (let i = 0; i <= chars.length; i++) {
                          const isCursorHere = i === terminalCaretIndex;
                          const char = chars[i];
                          if (i === chars.length) {
                            if (isCursorHere && !isAiLoading) {
                              elements.push(
                                <span 
                                  key={i} 
                                  className={`inline-block bg-cyan-400 text-[#000080] font-black w-[0.6em] text-center ${isTerminalInputFocused ? "terminal-cursor" : "opacity-65"} select-none`}
                                  style={{ minHeight: "1.5em", lineHeight: "1" }}
                                >
                                  &nbsp;
                                </span>
                              );
                            }
                          } else {
                            if (isCursorHere && !isAiLoading) {
                              elements.push(
                                <span 
                                  key={i} 
                                  className={`inline-block bg-cyan-400 text-[#000080] font-black w-[0.6em] text-center select-none ${isTerminalInputFocused ? "" : "opacity-80"}`}
                                  style={{ minHeight: "1.5em", lineHeight: "1" }}
                                >
                                  {char.toUpperCase()}
                                </span>
                              );
                            } else {
                              elements.push(
                                <span key={i} className="text-white font-bold">
                                  {char.toUpperCase()}
                                </span>
                              );
                            }
                          }
                        }
                        return elements;
                      })()
                    )}
                  </div>

                  {/* Absolute invisible overlay for input capturing */}
                  <input
                    ref={terminalInputRefNormal}
                    type="text"
                    value={terminalInput}
                    onChange={(e) => {
                      setTerminalInput(e.target.value);
                      updateTerminalCaret(e.target);
                    }}
                    onSelect={(e) => {
                      updateTerminalCaret(e.currentTarget);
                    }}
                    onKeyUp={(e) => {
                      updateTerminalCaret(e.currentTarget);
                    }}
                    onClick={(e) => {
                      updateTerminalCaret(e.currentTarget);
                    }}
                    onFocus={() => setIsTerminalInputFocused(true)}
                    onBlur={() => setIsTerminalInputFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleTerminalSubmit();
                      }
                    }}
                    disabled={isAiLoading}
                    className="absolute left-6 right-0 top-0 bottom-0 bg-transparent border-none text-transparent caret-transparent focus:outline-none focus:ring-0 font-mono text-base uppercase p-0 h-auto z-20 select-text cursor-text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

          </div>

          {/* Screen utilities info footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-sm text-slate-500 font-sans mt-2 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              <span>Host connected & synchronized</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-5">
              {activeSteps.length > 0 && (
                <button
                  type="button"
                  onClick={handleRepeatEntry}
                  disabled={isTyping || isAiLoading}
                  className="hover:text-yellow-600 disabled:opacity-40 text-slate-600 transition cursor-pointer flex items-center gap-2 font-extrabold uppercase tracking-wider text-xs sm:text-sm font-sans disabled:cursor-not-allowed"
                  title="Replay/Repeat current typing sequence"
                >
                  <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin-slow" /> REPEAT ENTRY
                </button>
              )}

              <button
                type="button"
                onClick={handleResetScreen}
                className="hover:text-cyan-600 text-slate-600 transition cursor-pointer flex items-center gap-2 font-extrabold uppercase tracking-wider text-xs sm:text-sm font-sans"
                title="Clear current screen output"
              >
                <RefreshCw className="w-4 h-4" /> CLEAR SCREEN
              </button>
            </div>
          </div>

        </div>

        {/* Practice PNRs Hub */}
        <div className="bg-white border-2 border-slate-200 p-6 md:p-8 rounded-2xl flex flex-col gap-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Database className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-black uppercase tracking-wider text-slate-800 font-display flex items-center gap-2">
                  Sandbox Practice PNRs
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-700 font-sans border border-indigo-200 uppercase tracking-widest scale-95">
                    Live Database
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Pre-configured reservation files containing complete outbound & return flights (7 to 14 nights return duration) for GDS commands testing.
                </p>
              </div>
            </div>

            {/* Quick dropdown loader */}
            <div className="flex items-center gap-2 font-sans">
              <label htmlFor="pnr-select" className="text-xs font-extrabold text-slate-500 uppercase tracking-wider shrink-0">
                Quick Retrieve:
              </label>
              <select
                id="pnr-select"
                onChange={(e) => {
                  if (e.target.value) {
                    handleRetrievePracticePnr(e.target.value);
                    e.target.value = ""; // Reset dropdown selection after loading
                  }
                }}
                className="bg-slate-50 border-2 border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Choose Practice PNR --</option>
                {Object.keys(DEFAULT_PRACTICE_PNRS).map(loc => {
                  const pnr = DEFAULT_PRACTICE_PNRS[loc];
                  const airlineName = pnr.segments[0].airline === "BA" ? "British Airways" :
                        pnr.segments[0].airline === "LH" ? "Lufthansa" :
                        pnr.segments[0].airline === "TG" ? "Thai Airways" :
                        pnr.segments[0].airline === "SQ" ? "Singapore Airlines" :
                        pnr.segments[0].airline === "UA" ? "United Airlines" : "Emirates";
                  return (
                    <option key={loc} value={loc}>
                      {loc} - {pnr.segments[0].origin}→{pnr.segments[0].destination} ({airlineName})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(DEFAULT_PRACTICE_PNRS).map((loc) => {
              const pnr = DEFAULT_PRACTICE_PNRS[loc];
              const segOut = pnr.segments[0];
              const segRet = pnr.segments[pnr.segments.length - 1];
              
              // Airline logo styling map
              const airlineDetails = 
                segOut.airline === "BA" ? { name: "British Airways", text: "text-blue-600 bg-blue-50 border-blue-200" } :
                segOut.airline === "LH" ? { name: "Lufthansa", text: "text-amber-600 bg-amber-50 border-amber-200" } :
                segOut.airline === "TG" ? { name: "Thai Airways", text: "text-purple-600 bg-purple-50 border-purple-200" } :
                segOut.airline === "SQ" ? { name: "Singapore Airlines", text: "text-yellow-700 bg-yellow-50 border-yellow-200" } :
                segOut.airline === "UA" ? { name: "United Airlines", text: "text-sky-600 bg-sky-50 border-sky-100" } :
                { name: "Emirates", text: "text-red-600 bg-red-50 border-red-200" };

              // Determine command based on currently active GDS Tab
              const retrieveCommand = selectedGds === "amadeus" ? `RT${loc}` : `*${loc}`;

              return (
                <div 
                  key={loc} 
                  className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between hover:border-indigo-400 hover:shadow-xs transition-all duration-350 relative group"
                >
                  <div>
                    {/* Header: Locator + Copy Command */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-slate-800 text-base uppercase tracking-wider">{loc}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase border ${airlineDetails.text}`}>
                          {segOut.airline}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-slate-200/80 px-2.5 py-0.5 rounded font-mono font-semibold text-slate-700 select-all shrink-0">
                          {retrieveCommand}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyToClipboard(retrieveCommand, `pnr-cmd-${loc}`)}
                          className="p-1 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded transition shrink-0 cursor-pointer"
                          title="Copy retrieve command"
                        >
                          {copiedId === `pnr-cmd-${loc}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Routing Details */}
                    <div className="border-t border-slate-100 pt-2.5 pb-2">
                      <div className="flex items-center justify-between text-[11px] font-black text-indigo-700 uppercase tracking-widest font-sans mb-1">
                        <span>{airlineDetails.name}</span>
                        <span className="text-slate-500 text-[10px]">{pnr.durationText || "10 Nights Return"}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs py-1 font-semibold text-slate-700">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-slate-800 tracking-wider">{segOut.origin} → {segOut.destination}</span>
                          <span className="text-[10px] text-slate-400 font-sans font-medium">Outbound: {segOut.date} | {segOut.flightNo}</span>
                        </div>
                        <div className="text-right flex flex-col">
                          <span className="font-mono text-xs font-black text-slate-800 tracking-wider">{segRet.origin} → {segRet.destination}</span>
                          <span className="text-[10px] text-slate-400 font-sans font-medium">Return: {segRet.date} | {segRet.flightNo}</span>
                        </div>
                      </div>
                    </div>

                    {/* Passenger List */}
                    <div className="bg-slate-200/30 rounded-lg p-2 text-[10px] font-mono text-slate-600 mb-3.5 border border-slate-200/20">
                      <div className="text-[9px] font-bold font-sans uppercase text-slate-400 mb-0.5 tracking-wider">Passengers:</div>
                      {pnr.names.map((name: string, i: number) => (
                        <div key={i} className="flex items-center gap-1 font-bold">
                          <span className="text-slate-400">{i+1}.</span> {name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Retrieval Action */}
                  <button
                    type="button"
                    onClick={() => handleRetrievePracticePnr(loc)}
                    className="w-full text-center py-2 bg-indigo-600 hover:bg-slate-800 text-white font-sans font-black text-[11px] uppercase rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer shadow-xs"
                  >
                    <TerminalIcon className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Retrieve in terminal</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedules Explorer Section */}
        <SchedulesExplorer 
          selectedGds={selectedGds} 
          onExecuteCommand={handleRunSchedulesCommand} 
        />

        {/* SECTION 2: GDS Copilot Query Input box (NOW UNDER THE TERMINAL & SCALE HIGHER) */}
        <div className="bg-white border-2 border-slate-200 p-6 md:p-8 rounded-2xl flex flex-col gap-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-2">
            {/* Orbs Avatar Sphere (Terminal Travel Robot Mascot) */}
            <div className="relative shrink-0">
              {/* Outer Pulsing Glow Rings */}
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 opacity-20 blur animate-pulse" />
              {/* Rotating detailed border overlay */}
              <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-[spin_8s_linear_infinite]" />
              {/* Inner Solid Avatar Container */}
              <div className="relative w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                {/* Custom Retro Travel Robot Face */}
                <div className="w-7 h-6 rounded bg-slate-100 border border-cyan-500/50 flex flex-col justify-between p-1 shadow-inner relative">
                  {/* Glowing Pixel Dot Eyes */}
                  <div className="flex justify-around items-center w-full mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-sm bg-cyan-600 shadow-[0_0_6px_rgba(8,145,178,0.9)] animate-pulse"></div>
                    <div className="w-1.5 h-1.5 rounded-sm bg-cyan-600 shadow-[0_0_6px_rgba(8,145,178,0.9)] animate-pulse"></div>
                  </div>
                  {/* Subtle Mouth Line / Digital Wave */}
                  <div className="w-4 h-0.5 mx-auto bg-cyan-600/80 mb-0.5 rounded animate-pulse"></div>
                  {/* Scanline pattern overlay (Robot screen) */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent opacity-85 pointer-events-none"></div>
                </div>
                {/* Robot Antenna Tip */}
                <div className="absolute top-1.5 w-1 h-1 bg-cyan-600 rounded-full animate-ping"></div>
              </div>
            </div>

            <div>
              <h2 className="text-lg md:text-xl font-black uppercase tracking-wider text-slate-800 font-display flex items-center gap-2">
                Ask Orbs
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-cyan-100 text-cyan-700 font-sans border border-cyan-200 uppercase tracking-widest scale-95 origin-left">
                  TRAINING PILOT
                </span>
              </h2>
              <p className="text-sm text-slate-500 font-sans mt-0.5 leading-snug">Orbs • Interactive GDS Command Copilot & Translation Desk</p>
            </div>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAskFormSubmit(aiPromptInput);
            }} 
            className="flex flex-col md:flex-row gap-4 items-stretch"
          >
            <textarea
              value={aiPromptInput}
              onChange={(e) => setAiPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (aiPromptInput.trim() && !isAiLoading) {
                    handleAskFormSubmit(aiPromptInput);
                  }
                }
              }}
              placeholder="e.g., how to book 2 seats in Business class on line 1"
              className="flex-1 min-h-[110px] bg-slate-50 border-2 border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 focus:outline-none rounded-xl px-5 py-4 text-base md:text-lg text-slate-850 placeholder:text-slate-400 font-sans transition-all shadow-inner font-semibold resize-y"
              disabled={isAiLoading}
              rows={3}
            />
            
            <button
              type="submit"
              disabled={isAiLoading || !aiPromptInput.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 hover:shadow-cyan-500/30 shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-slate-950 px-10 py-5 md:py-0 rounded-xl font-sans text-sm md:text-base font-black flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              {isAiLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
                  Typing...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> ASK ORBS
                </>
              )}
            </button>
          </form>

          {/* Quick templates for simple user triggers */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-800 font-sans font-black flex items-center gap-1.5 shrink-0">
              💡 Training Presets:
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                "how do you book seats",
                "how to check availability to Bangkok on 26th September",
                "creating passenger name records (PNR)"
              ].map((demo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickDemoClick(demo)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-cyan-600 transition text-sm px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer font-bold active:scale-95 shadow-sm"
                >
                  {demo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: Detailed human Analysis breakdown (BELOW THE QUERY FORM BOX) */}
        {currentExplanation && currentExplanation.trim() !== "" && (
          <div className="bg-white rounded-xl p-5 md:p-8 border border-slate-200 text-sm text-slate-700 leading-relaxed font-sans flex flex-col gap-3 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-3">
              <div className="flex items-center gap-2 text-cyan-600 font-display font-bold text-base md:text-lg">
                <Info className="w-5 h-5 text-cyan-600 shrink-0" />
                <span className="uppercase font-sans tracking-wider flex items-center gap-1.5 animate-fade-in">Analysis breakdown & Explanation</span>
              </div>
              
              {isSandboxActive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-850 text-emerald-800 border border-emerald-250 border-emerald-200 font-sans tracking-tight shrink-0 self-start sm:self-auto shadow-sm">
                  ⚡ HIGH-PERFORMANCE LOCAL SANDBOX ACTIVE
                </span>
              )}
            </div>
            <p className="pl-1 text-slate-800 text-sm sm:text-base md:text-lg leading-relaxed mb-3 font-semibold animate-fade-in">
              {currentExplanation}
            </p>

            {/* Interactive Step Timeline with Core Target Command Highlighting */}
            {activeSteps.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col gap-4">
                <span className="text-xs sm:text-sm font-sans uppercase tracking-widest text-slate-500 font-black animate-fade-in">
                  Interactive Command Sequence Breakdown:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans animate-fade-in">
                  {activeSteps.map((step, idx) => {
                    const isCoreTarget = step.isHighlighted || (
                      // Fallback client-side highlight logic
                      idx > 0 && (
                        step.command.includes("VGML") ||
                        step.command.includes("WCHR") ||
                        step.command.includes("WCHRA") ||
                        step.command.includes("ST/") ||
                        step.command.includes("S.S") ||
                        step.command.includes("4G") ||
                        step.command.includes("FXP") ||
                        step.command.includes("FQ") ||
                        step.command.includes("WP") ||
                        step.command.includes("TKTL") ||
                        step.command.includes("TKXL") ||
                        (step.command.includes("TK") && !step.command.includes("TKOK"))
                      )
                    );

                    return (
                      <div 
                        key={idx}
                        className={`p-5 rounded-xl border transition-all duration-300 flex flex-col gap-3 ${
                          isCoreTarget 
                            ? "bg-amber-500/5 border-amber-300 text-amber-900 shadow-md ring-1 ring-amber-400/20" 
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <span className={`text-xs sm:text-sm font-sans uppercase font-black tracking-wider ${isCoreTarget ? "text-amber-700" : "text-sky-600"}`}>
                            Step {idx + 1}: {idx === 0 && activeSteps.length > 1 ? "PNR Retrieve (Verification)" : "Requested Action Execution"}
                          </span>
                          {isCoreTarget && (
                            <span className="inline-flex items-center text-[10px] md:text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 rounded px-2.5 py-1 font-sans uppercase tracking-tight shadow-sm">
                              🎯 TARGET CODE
                          </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <code className={`px-3 py-2 rounded-lg font-mono font-black text-sm sm:text-base md:text-lg tracking-wider ${
                            isCoreTarget 
                              ? "bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300/45" 
                              : "bg-slate-100 text-cyan-700 border border-slate-200"
                          }`}>
                            {step.command}
                          </code>
                        </div>
                        
                        <p className={`text-xs sm:text-sm leading-normal font-medium ${isCoreTarget ? "text-amber-950/80" : "text-slate-600"}`}>
                          {step.commandDescription}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: GDS Command Clipboard & History Log Archive */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm font-sans overflow-hidden">
          {/* Collapsible Header bar */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsHistoryExpanded(!isHistoryExpanded);
              }
            }}
            className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-slate-50/60 transition-colors duration-200 cursor-pointer select-none text-left animate-fade-in focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-cyan-600 shrink-0" />
              <div>
                <span className="text-sm md:text-base font-black uppercase tracking-wider text-slate-800 flex items-center gap-2.5">
                  Command History Clipboard
                  <span className="bg-slate-100 text-cyan-700 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-sans font-black shadow-sm">
                    {searchHistory.length}
                  </span>
                </span>
                <p className="text-xs text-slate-500 mt-1 font-medium normal-case">
                  Copy individual GDS commands separately for live system execution
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {searchHistory.length > 0 && (
                confirmClearHistory ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchHistory([]);
                        localStorage.removeItem("gds_search_command_history");
                        setConfirmClearHistory(false);
                      }}
                      className="px-2.5 py-1.5 text-xs font-sans uppercase bg-red-600 text-white font-black hover:bg-red-700 transition rounded-xl flex items-center gap-1 active:scale-95 cursor-pointer shadow-sm border border-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Confirm Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearHistory(false)}
                      className="px-2.5 py-1.5 text-xs font-sans uppercase bg-white hover:bg-slate-100 text-slate-600 font-bold transition rounded-xl active:scale-95 cursor-pointer shadow-sm border border-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmClearHistory(true);
                    }}
                    className="px-3 py-1.5 text-xs font-sans uppercase bg-slate-50 border border-slate-200 hover:text-red-600 text-slate-600 transition rounded-xl hover:border-red-200 flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Clear Log
                  </button>
                )
              )}
              {isHistoryExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500" />
              )}
            </div>
          </div>

          {/* Collapsible content log */}
          {isHistoryExpanded && (
            <div className="border-t border-slate-100 p-5 md:p-7 space-y-5 max-h-[460px] overflow-y-auto bg-slate-50/20">
              {searchHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-sans text-sm flex flex-col items-center justify-center gap-2.5">
                  <Clipboard className="w-10 h-10 text-slate-400 animate-pulse" />
                  <span className="font-bold">No recorded searches cataloged yet.</span>
                  <span className="text-xs text-slate-500 max-w-sm leading-normal">
                    Enter any travel booking, check or request query via Orbs above to automatically construct copyable GDS parameters.
                  </span>
                </div>
              ) : (
                <div className="space-y-6 divide-y divide-slate-100">
                  {searchHistory.map((item, index) => (
                    <div key={item.id} className="pt-5 first:pt-0 space-y-3">
                      <div className="flex wrap items-center justify-between gap-3 text-xs md:text-sm">
                        <div className="flex items-center gap-2">
                           <span className={`px-2.5 py-1 rounded text-[10px] sm:text-xs font-sans font-black uppercase tracking-widest ${
                            item.gds === "amadeus" 
                              ? "text-cyan-700 bg-cyan-100/50 border border-cyan-200" 
                              : item.gds === "sabre"
                              ? "text-sky-700 bg-sky-100/50 border border-sky-200"
                              : "text-indigo-700 bg-indigo-100/50 border border-indigo-200"
                          }`}>
                            {item.gds}
                          </span>
                          <span className="text-slate-800 font-bold text-sm sm:text-base">"{item.query}"</span>
                        </div>
                        <span className="text-slate-500 font-sans text-xs">{item.timestamp}</span>
                      </div>

                      {/* Small inline list of individual command elements for copy pasting */}
                      <div className="pl-3 border-l ms-1 border-slate-250 border-slate-200 space-y-3">
                        {item.commands.map((cmdDetails, cmdIdx) => {
                          const copyId = `${item.id}-${cmdIdx}`;
                          const isCopied = copiedId === copyId;
                          
                          return (
                            <div 
                              key={cmdIdx} 
                              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition duration-150 shadow-sm"
                            >
                              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                <span className="font-mono text-sm sm:text-base md:text-lg font-black text-cyan-600 tracking-wider break-all text-left">
                                  {cmdDetails.command}
                                </span>
                                <span className="text-xs sm:text-sm text-slate-600 leading-normal text-left font-medium">
                                  {cmdDetails.description}
                                </span>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => handleCopyToClipboard(cmdDetails.command, copyId)}
                                className={`self-start sm:self-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-sans font-black uppercase cursor-pointer transition-all duration-200 flex items-center gap-1.5 shrink-0 select-none ${
                                  isCopied
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-250 border-emerald-200 shadow-sm"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-cyan-700 border border-slate-200 shadow-sm"
                                }`}
                                title="Copy this specific command code to clipboard"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-4 h-4" /> Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" /> Copy Code
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </>
        )}

        {/* Elegant Back Office Universal Footer Link */}
        {activeTab === "hub" && (
          <footer className="w-full border-t border-slate-200 mt-12 pt-6 pb-2 text-center flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs text-slate-400">
            <div>
              © 2026 Orbit Desk Operations Platform Suite. All rights reserved.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("admin");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-slate-350 hover:text-slate-500 font-sans text-[11px] underline transition-all bg-transparent border-none p-0 cursor-pointer"
              >
                Admin Back Office
              </button>
            </div>
          </footer>
        )}

      </div>

      <WelcomeDialog 
        isOpen={welcomeDialogType !== null}
        onClose={() => setWelcomeDialogType(null)}
        userEmail={traineeEmail}
        type={welcomeDialogType || "simulator"}
      />

    </div>
  );
}
