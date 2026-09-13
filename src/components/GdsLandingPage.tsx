import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Play, 
  Check, 
  ShieldCheck, 
  Globe, 
  Zap, 
  FileCheck, 
  Layers, 
  Clock, 
  ThumbsUp,
  User,
  Star,
  Quote,
  Flame,
  Award,
  BookOpen,
  RefreshCw,
  Search,
  MoveUpRight,
  Info
} from "lucide-react";

type SimulatorPhase = "LOGO" | "DASHBOARD" | "TERMINAL" | "CTA";

function OrbitDeskVideoSimulator() {
  const [phase, setPhase] = useState<SimulatorPhase>("LOGO");
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  // States for virtual keyboard typing inside the terminal
  const [terminalText1, setTerminalText1] = useState("");
  const [terminalText2, setTerminalText2] = useState("");
  const [showResults1, setShowResults1] = useState(false);
  const [showResults2, setShowResults2] = useState(false);

  // States for virtual mouse cursor positions (%)
  const [cursorX, setCursorX] = useState(85);
  const [cursorY, setCursorY] = useState(85);
  const [cursorClicked, setCursorClicked] = useState(false);
  const [dashboardClicked, setDashboardClicked] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    let active = true;
    let progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 1;
      });
    }, 115); // 115ms * 100 = 11500ms (11.5s total loop)

    const runSequence = async () => {
      while (active) {
        // --- PHASE 1: LOGO ---
        setPhase("LOGO");
        setProgress(0);
        setTerminalText1("");
        setTerminalText2("");
        setShowResults1(false);
        setShowResults2(false);
        setCursorClicked(false);
        setDashboardClicked(false);
        setCursorX(85);
        setCursorY(85);

        await new Promise((r) => setTimeout(r, 600));
        if (!active) break;
        // Animate cursor to center over Logo
        setCursorX(50);
        setCursorY(48);
        await new Promise((r) => setTimeout(r, 800));
        if (!active) break;
        setCursorClicked(true);
        await new Promise((r) => setTimeout(r, 300));
        if (!active) break;
        setCursorClicked(false);
        await new Promise((r) => setTimeout(r, 600));
        if (!active) break;

        // --- PHASE 2: DASHBOARD ---
        setPhase("DASHBOARD");
        setCursorX(85);
        setCursorY(85);
        await new Promise((r) => setTimeout(r, 600));
        if (!active) break;
        // Move cursor to click Sabre GDS Workspace Card
        setCursorX(50);
        setCursorY(58);
        await new Promise((r) => setTimeout(r, 800));
        if (!active) break;
        setCursorClicked(true);
        setDashboardClicked(true);
        await new Promise((r) => setTimeout(r, 300));
        if (!active) break;
        setCursorClicked(false);
        await new Promise((r) => setTimeout(r, 600));
        if (!active) break;

        // --- PHASE 3: TERMINAL ---
        setPhase("TERMINAL");
        setCursorX(90);
        setCursorY(90);
        await new Promise((r) => setTimeout(r, 400));
        if (!active) break;

        // Type command 1 character by character
        const cmd1 = ">A29JANLHRDXB/EK";
        for (let i = 0; i <= cmd1.length; i++) {
          await new Promise((r) => setTimeout(r, 55));
          if (!active) break;
          setTerminalText1(cmd1.slice(0, i));
        }
        await new Promise((r) => setTimeout(r, 400));
        if (!active) break;
        setShowResults1(true);
        await new Promise((r) => setTimeout(r, 1100));
        if (!active) break;

        // Type command 2 character by character
        const cmd2 = ">A29JANDXBLHR";
        for (let i = 0; i <= cmd2.length; i++) {
          await new Promise((r) => setTimeout(r, 55));
          if (!active) break;
          setTerminalText2(cmd2.slice(0, i));
        }
        await new Promise((r) => setTimeout(r, 400));
        if (!active) break;
        setShowResults2(true);
        await new Promise((r) => setTimeout(r, 1800));
        if (!active) break;

        // --- PHASE 4: CTA ---
        setPhase("CTA");
        await new Promise((r) => setTimeout(r, 2200));
      }
    };

    runSequence();

    return () => {
      active = false;
      clearInterval(progressTimer);
    };
  }, [isPlaying]);

  const handleReset = () => {
    setPhase("LOGO");
    setProgress(0);
    setTerminalText1("");
    setTerminalText2("");
    setShowResults1(false);
    setShowResults2(false);
    setCursorClicked(false);
    setDashboardClicked(false);
    setCursorX(85);
    setCursorY(85);
    setIsPlaying(false);
    setTimeout(() => {
      setIsPlaying(true);
    }, 50);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#1e293b] select-none text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Simulation Screen Container */}
      <div className="relative flex-1 w-full bg-slate-900/40">
        <AnimatePresence mode="wait">
          {phase === "LOGO" && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(6,182,212,0.1) 1px, transparent 1px)",
                backgroundSize: "24px 24px"
              }}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative w-20 h-20 rounded-full bg-slate-900/50 border-2 border-cyan-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)]">
                  <div className="w-10 h-10 rounded-full border-4 border-cyan-400 flex items-center justify-center relative animate-[pulse_2s_infinite]">
                    <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-[spin_8s_linear_infinite]"></div>
                  <div className="absolute -inset-1.5 rounded-full border border-dashed border-cyan-400/10 animate-[spin_12s_linear_infinite]"></div>
                </div>

                <div className="text-center space-y-1">
                  <h3 className="font-sans font-black tracking-[0.2em] text-white text-xl sm:text-2xl uppercase leading-none">
                    ORBIT DESK
                  </h3>
                  <p className="font-mono text-[10px] text-cyan-400/80 tracking-widest uppercase">
                    GDS SIMULATOR
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "DASHBOARD" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col bg-slate-950 p-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-cyan-500/30 border border-cyan-400/50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                  </div>
                  <span className="font-sans font-black tracking-wider text-xs text-slate-100">ORBIT GDS</span>
                </div>
                <div className="flex gap-3 text-[9px] font-bold text-slate-400">
                  <span className="text-cyan-400 border-b-2 border-cyan-400 pb-0.5">HUB</span>
                  <span>SANDBOX</span>
                </div>
              </div>

              <div className="text-center space-y-1 mb-3">
                <h4 className="font-sans font-black text-xs sm:text-sm tracking-wide text-white uppercase leading-none">
                  MASTER AMADEUS, SABRE & GALILEO
                </h4>
                <p className="font-sans font-extrabold text-[9px] text-slate-500 uppercase tracking-widest animate-pulse">
                  Select a workspace to start practicing:
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 max-w-[500px] mx-auto w-full mt-1.5">
                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-center select-none scale-95 opacity-55">
                  <div className="w-7 h-7 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/20 font-black text-xs flex items-center justify-center mx-auto mb-1">
                    AN
                  </div>
                  <span className="font-bold text-[9px] text-slate-200 block">Amadeus</span>
                </div>

                <div className={`rounded-lg p-2.5 text-center transition-all duration-300 ${
                  dashboardClicked 
                    ? "bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] scale-100" 
                    : "bg-slate-900 border-cyan-500/30 border animate-[pulse_2.5s_infinite] scale-[0.98]"
                }`}>
                  <div className={`w-8 h-8 rounded-lg text-white font-black text-xs flex items-center justify-center mx-auto mb-1.5 transition-colors duration-300 ${
                    dashboardClicked ? "bg-cyan-500" : "bg-cyan-600"
                  }`}>
                    SB
                  </div>
                  <span className="font-extrabold text-[10px] text-slate-200 block">Sabre GDS</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block mt-0.5"></span>
                </div>

                <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-center select-none scale-95 opacity-55">
                  <div className="w-7 h-7 rounded bg-green-950 text-green-400 border border-green-800/20 font-black text-xs flex items-center justify-center mx-auto mb-1">
                    SF
                  </div>
                  <span className="font-bold text-[9px] text-slate-200 block">Sabre Pro</span>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "TERMINAL" && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-[#05171d] flex flex-col p-4 font-mono text-left"
            >
              <div className="flex items-center justify-between border-b border-cyan-950 pb-1.5 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 opacity-80"></span>
                  <span className="w-2 h-2 rounded-full bg-yellow-400 opacity-80"></span>
                  <span className="w-2 h-2 rounded-full bg-green-400 opacity-80"></span>
                  <span className="text-[9px] text-cyan-500/80 ml-1">sabregds:///terminal-1</span>
                </div>
                <div className="font-semibold text-cyan-400/60 text-[8px] tracking-wider">SECURE CONNECTION</div>
              </div>

              <div className="flex-1 overflow-hidden space-y-3.5 leading-relaxed text-[10px] sm:text-xs text-cyan-100">
                <div className="space-y-1">
                  <div className="flex items-center text-cyan-300 font-bold">
                    <span>{terminalText1}</span>
                    {phase === "TERMINAL" && terminalText1.length < 16 && !showResults1 && (
                      <span className="w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-0.5"></span>
                    )}
                  </div>
                  
                  {showResults1 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-cyan-400/90 pl-2 space-y-0.5"
                    >
                      <pre className="font-mono text-[9px] sm:text-[11px] leading-tight">
                        {`1  EK002  29JAN LHRDXB HS1   1415 #1800  77W E 0 M
2  EK004  29JAN LHRDXB HS1   2040 #0830  388 E 0 M`}
                      </pre>
                    </motion.div>
                  )}
                </div>

                {showResults1 && (
                  <div className="space-y-1">
                    <div className="flex items-center text-cyan-300 font-bold">
                      <span>{terminalText2}</span>
                      {phase === "TERMINAL" && terminalText1.length >= 16 && terminalText2.length < 13 && !showResults2 && (
                        <span className="w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-0.5"></span>
                      )}
                    </div>
                    
                    {showResults2 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-cyan-400/90 pl-2 space-y-0.5"
                      >
                        <pre className="font-mono text-[9px] sm:text-[11px] leading-tight text-cyan-300">
                          {`1  EK001  03FEB DXBLHR HS1   0745 #1225  380 E 0 M`}
                        </pre>
                        
                        <div className="mt-3 bg-cyan-950/40 border border-cyan-800/40 rounded p-2 max-w-[280px]">
                          <div className="text-[9px] text-cyan-500 font-bold uppercase tracking-wide">✓ Task Verified Secure</div>
                          <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Scorecard Verified: 100% Passed
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {phase === "CTA" && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#0a1a1f] to-slate-950 p-6 text-center"
            >
              <div className="space-y-4 max-w-[320px]">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mx-auto animate-bounce">
                  <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center animate-pulse">
                    <span className="font-extrabold text-white text-xs">🚀</span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <h4 className="font-sans font-black text-sm tracking-wide text-white uppercase">
                    Orbit Desk GDS Simulator
                  </h4>
                  <p className="text-[11px] text-slate-300 font-medium font-sans leading-normal">
                    Practice with zero environment risk, build flawless skills, and claim your free trial.
                  </p>
                </div>

                <div className="pt-2">
                  <a href="#demo-form" className="inline-block bg-cyan-550 hover:bg-cyan-500 text-slate-950 font-sans text-[10px] font-black tracking-widest px-4 py-2 rounded-full uppercase shadow-[0_0_20px_rgba(6,182,212,0.3)] select-none">
                    Claim Free Team Trial &rarr;
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(phase === "LOGO" || phase === "DASHBOARD") && (
          <motion.div
            style={{
              position: "absolute",
              left: `${cursorX}%`,
              top: `${cursorY}%`,
              zIndex: 99,
              pointerEvents: "none"
            }}
            animate={{ left: `${cursorX}%`, top: `${cursorY}%` }}
            transition={{ type: "tween", duration: 0.7, ease: "easeInOut" }}
            className="drop-shadow-md select-none pointer-events-none"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 3L10.07 21L13.14 13.14L21 10.07L3 3Z"
                fill={cursorClicked ? "#22d3ee" : "white"}
                stroke="#020617"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            {cursorClicked && (
              <motion.div
                initial={{ scale: 0, opacity: 0.9 }}
                animate={{ scale: 3.5, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute top-0 left-0 w-4 h-4 rounded-full border border-cyan-400 bg-cyan-400/30 -translate-x-1.5 -translate-y-1.5"
              />
            )}
          </motion.div>
        )}
      </div>

      <div className="h-10 px-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400 select-none z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-5 h-5 flex items-center justify-center rounded border border-slate-800 hover:border-cyan-500/50 hover:text-white transition cursor-pointer"
            title={isPlaying ? "Pause Preview" : "Play Preview"}
          >
            {isPlaying ? (
              <div className="flex gap-0.5">
                <span className="w-0.5 h-2 bg-slate-200"></span>
                <span className="w-0.5 h-2 bg-slate-200"></span>
              </div>
            ) : (
              <span className="text-[7px] text-slate-200">&#9658;</span>
            )}
          </button>
          <button 
            type="button"
            onClick={handleReset}
            className="w-5 h-5 flex items-center justify-center rounded border border-slate-800 hover:border-cyan-500/50 hover:text-white transition cursor-pointer"
            title="Replay Video"
          >
            <span className="text-[10px] text-slate-200">&#x21BB;</span>
          </button>
          
          <span className="text-[8px] sm:text-[9px] text-[#22d3ee] font-black uppercase tracking-wider bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-950">
            {phase} WORKSPACE PREVIEW
          </span>
        </div>

        <div className="flex items-center gap-2 text-right">
          <span className="text-[8.5px] font-bold text-slate-400 uppercase hidden sm:inline">AUTOMATED LIVE WALKTHROUGH</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-0.5 bg-cyan-500 transition-all duration-100 shrink-0" style={{ width: `${progress}%` }} />
    </div>
  );
}

interface GdsLandingPageProps {
  onLaunchSimulator: (customPrompt?: string, gdsSystem?: "amadeus" | "sabre" | "galileo") => void;
  onNavigateToTab?: (tab: "hub" | "simulator" | "admin" | "assessment" | "pricing") => void;
  theme?: "light" | "dark";
}

export default function GdsLandingPage({ onLaunchSimulator, onNavigateToTab, theme = "light" }: GdsLandingPageProps) {
  const isLight = theme === "light";
  const [demoStep, setDemoStep] = useState<"idle" | "submitting" | "success">("idle");
  const [agencyName, setAgencyName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [isIndividualTrainee, setIsIndividualTrainee] = useState(false);

  // Cookie Consent States
  const [cookieChoice, setCookieChoice] = useState<"accepted" | "rejected" | "customized" | null>(() => {
    try {
      const saved = localStorage.getItem("orbitdesk_cookie_consent");
      return (saved as any) || null;
    } catch {
      return null;
    }
  });

  const [cookiePreferences, setCookiePreferences] = useState({
    essential: true,
    analytics: true,
    functional: true
  });

  const [isCookieDetailsOpen, setIsCookieDetailsOpen] = useState(false);

  const handleSaveCookieConsent = (acceptAll: boolean) => {
    try {
      if (acceptAll) {
        localStorage.setItem("orbitdesk_cookie_consent", "accepted");
        setCookieChoice("accepted");
      } else {
        localStorage.setItem("orbitdesk_cookie_consent", "rejected");
        setCookieChoice("rejected");
      }
    } catch {
      setCookieChoice("accepted");
    }
  };

  // Slide Deck Index state for the interactive Showcase
  const [activeIndex, setActiveIndex] = useState(0);

  // GDS selected target for the comparative Translation Studio
  const [selectedBrand, setSelectedBrand] = useState<"amadeus" | "sabre" | "galileo">("amadeus");
  const [activeWorkflow, setActiveWorkflow] = useState<"availability" | "sell" | "pnr" | "pricing" | "exchange">("availability");

  // Dynamic parameters for the side-by-side live compiler preview (to REALLY WOW the clients)
  const [liveRoute, setLiveRoute] = useState("LHRJFK");
  const [liveDate, setLiveDate] = useState("15OCT");
  const [liveName, setLiveName] = useState("SMITH/ANNA");
  const [liveClass, setLiveClass] = useState("Y");
  const [livePaxCount, setLivePaxCount] = useState("1");
  const [liveSegment, setLiveSegment] = useState("1");

  // Elegant subtle micro haptic feedback sound or action indicator
  const playTapSound = () => {
    // Elegant micro-interaction feedback
  };

  // Custom User Testimonial Slider
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const testimonials = [
    {
      quote: "Orbit Desk completely changed how we train our junior agents. Instead of boring classroom manuals, they got hands-on practice immediately. Onboarding went from 12 weeks to just 15 days!",
      author: "Sarah Jenkins",
      role: "Director of Operations, Global Air Travel",
      rating: 5,
      avatar: "👩‍✈️"
    },
    {
      quote: "No more airline penalty fees! Our trainees now test complicated ticket reissues and fare pricing rules inside this safe sandbox before logging live bookings. It is an absolute lifesaver.",
      author: "Marcus Vance",
      role: "Senior Training Lead, JetSetters Group",
      rating: 5,
      avatar: "👨‍💻"
    }
  ];

  // System profiles
  const brands = [
    {
      id: "amadeus",
      name: "Amadeus",
      origin: "Global Leader (Europe/Asia)",
      brief: "The dominant GDS system globally, used by over 450+ network carriers.",
      style: "Keyword-centric, strict spacing & alphabetical codes.",
      syntaxTip: "Uses prefix 'AN' for Availability, 'SS' to lock space coordinates.",
      color: "cyan",
      borderColor: "border-cyan-500/25",
      textColor: "text-cyan-400",
      bgClass: "bg-cyan-950/30",
      accentGlow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]"
    },
    {
      id: "sabre",
      name: "Sabre GDS",
      origin: "Americas Heavyweight",
      brief: "Pioneered by American Airlines. Deeply integrated in travel retail.",
      style: "Heavy use of modifier characters (-, *, ¤) & numerical commands.",
      syntaxTip: "Uses prefix '1' for Availability, '0' to assign segments.",
      color: "sky",
      borderColor: "border-sky-500/25",
      textColor: "text-sky-400",
      bgClass: "bg-sky-950/30",
      accentGlow: "shadow-[0_0_20px_rgba(56,189,248,0.15)]"
    },
    {
      id: "galileo",
      name: "Travelport Galileo",
      origin: "UK & Africa Specialist",
      brief: "Extremely popular structural system, known for speed and punctuation formats.",
      style: "Punctuation-heavy layout utilizing slashes & dots extensively.",
      syntaxTip: "Uses prefix 'A' for Availability, 'N' to grab seat inventory.",
      color: "indigo",
      borderColor: "border-indigo-500/25",
      textColor: "text-indigo-400",
      bgClass: "bg-indigo-950/30",
      accentGlow: "shadow-[0_0_20px_rgba(99,102,241,0.15)]"
    }
  ];

  // Translation comparisons dictionary (re-computed based on live client custom inputs)
  const normDate = (liveDate || "15OCT").trim().toUpperCase() || "15OCT";
  const normRoute = (liveRoute || "LHRJFK").trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "LHRJFK";
  const normName = (liveName || "SMITH/ANNA").trim().toUpperCase() || "SMITH/ANNA";
  const normClass = (liveClass || "Y").trim().toUpperCase() || "Y";
  const normPax = (livePaxCount || "1").trim() || "1";
  const normSeg = (liveSegment || "1").trim() || "1";

  // Split routing details safely with smart fallbacks
  let originCode = "LHR";
  let destCode = "JFK";
  if (normRoute.length >= 3) {
    originCode = normRoute.slice(0, 3);
  }
  if (normRoute.length >= 6) {
    destCode = normRoute.slice(3, 6);
  } else if (normRoute.length > 3) {
    destCode = normRoute.slice(3);
  }

  const translations = {
    availability: {
      title: "Query Flight Availability Neutral",
      description: `Ask the system to check return seat inventory on ${normDate} from ${originCode} to ${destCode}.`,
      commands: {
        amadeus: {
          cmd: `AN${normDate}${normRoute}`,
          tip: `AN = Availability Neutral, ${normDate} = Date, ${normRoute} = Airport pairs`,
          terminal: [
            `> AN${normDate}${normRoute}`,
            `${originCode} METROPOLIS / ${destCode} PORT INTL   ${normDate}26`,
            ` 1   LH 400  C9 Y9 / ${originCode} 1005   ${destCode} 1255  74H D 0`,
            ` 2   BA 117  F9 C9 / ${originCode} 0835   ${destCode} 1130  777 L 0`
          ]
        },
        sabre: {
          cmd: `1${normDate}${normRoute}`,
          tip: `1 = Air Availability prefix, ${normDate} = Date, ${normRoute} = Destination pairs`,
          terminal: [
            `* 1${normDate}${normRoute}`,
            `${normDate}26 ${originCode}-${destCode} C*BA/LH`,
            ` 1 LH 400 C9 Y9 ${originCode} 1005 ${destCode} 1255 74H 0/E`,
            ` 2 BA 117 F9 C9 ${originCode} 0835 ${destCode} 1130 777 0/E`
          ]
        },
        galileo: {
          cmd: `A${normDate}${normRoute}`,
          tip: `A = Availability prefix, ${normDate} = Date, ${normRoute} = Route coordinates`,
          terminal: [
            `> A${normDate}${normRoute}`,
            `${originCode}-${destCode} ${normDate}      * TRAVELPORT GALILEO SATELLITE *`,
            ` 1   BA 117 F9 C9 Y9  0830 ${originCode} 1130 ${destCode} 777 0*E`,
            ` 2   LH 400 C9 Y9 H9  1005 ${originCode} 1255 ${destCode} 74H 0*E`
          ]
        }
      },
      promptPreset: `how to check availability to ${destCode} on ${normDate}`
    },
    sell: {
      title: "Sell Flight Segment Seats",
      description: `Directly secure and lock (sell) ${normPax} passenger seat(s) on Segment #${normSeg} in Class ${normClass}.`,
      commands: {
        amadeus: {
          cmd: `SS${normSeg}${normClass}${normPax}`,
          tip: `SS = Sell Status, segment ${normSeg}, ${normClass} class, ${normPax} passenger`,
          terminal: [
            `> SS${normSeg}${normClass}${normPax}`,
            ` 1  BA 117 ${normClass} ${normDate} ${originCode}${destCode} HK${normPax}   0835 1130`,
            `  * AP DEPARTURE REGISTERED: HK${normPax} CONFIRMED *`
          ]
        },
        sabre: {
          cmd: `0${normPax}${normClass}${normSeg}`,
          tip: `0 = Sell identifier, ${normPax} passenger, ${normClass} class, segment ${normSeg}`,
          terminal: [
            `* 0${normPax}${normClass}${normSeg}`,
            ` 1 BA 117${normClass} ${normDate} ${originCode}${destCode} SS${normPax}   0830 1130`,
            `  * SABRE MAIN FRAME: SEAT SOLD ACTIVE FOR HS${normPax} *`
          ]
        },
        galileo: {
          cmd: `N${normPax}${normClass}${normSeg}`,
          tip: `N = Need seat, ${normPax} seat, ${normClass} class, segment index ${normSeg}`,
          terminal: [
            `> N${normPax}${normClass}${normSeg}`,
            ` 1  BA 117 ${normClass} ${normDate} ${originCode}${destCode}*HS${normPax}   0830 1130`,
            `  * TRAVELPORT RECORD RESERVED FOR HS${normPax} *`
          ]
        }
      },
      promptPreset: `how to sell segment ${normSeg}${normClass}${normPax}`
    },
    pnr: {
      title: "Passenger Name Record Entry",
      description: `Log traveler ${normName} under standard high-fidelity GDS names directories.`,
      commands: {
        amadeus: {
          cmd: `NM${normPax}${normName} MS`,
          tip: `NM = Name field indicator, ${normPax} passenger, ${normName} = Surname/Given name, MS = Title`,
          terminal: [
            `> NM${normPax}${normName} MS`,
            `  1 ${normName} MS (ADT)`,
            `  * PASSENGER PROFILE MEMORIZED IN TERMINAL FOR ${normPax} ADULTS *`
          ]
        },
        sabre: {
          cmd: `-${normName} MS`,
          tip: `Hyphen (-) begins Sabre names record entry, Lastname/Firstname formatting`,
          terminal: [
            `* -${normName} MS`,
            ` 1.1 ${normName} MS`,
            `  * SABRE RECURSIVE CONTACT FIELD STORAGE ALLOCATED *`
          ]
        },
        galileo: {
          cmd: `N.${normName} MS`,
          tip: `N. = Name prefix for Galileo, Lastname/Firstname and title designation`,
          terminal: [
            `> N.${normName} MS`,
            ` 01 ${normName} MS`,
            `  * GALILEO SECTOR PASSENGER RECORD SAVED *`
          ]
        }
      },
      promptPreset: `how to create a passenger name record (PNR) for ${normName}`
    },
    pricing: {
      title: "Best-Buy Pricing System Audit",
      description: `Verify the cheapest flight fare and tax balances specifically configured for Cabin Class ${normClass}.`,
      commands: {
        amadeus: {
          cmd: "FXP",
          tip: "FXP = Fare pricing command best buy class update check",
          terminal: [
            "> FXP",
            `  01 BA 117${normClass} ${normDate} ${originCode}${destCode} F-AED3050.00`,
            `  TAXES: AED 400.00 YQ / TOTAL: AED 3450.00 FOR CLASS ${normClass}`,
            "  FARE QUOTE LOGGED SECURELY IN CURRENT ACCOUNT"
          ]
        },
        sabre: {
          cmd: "WP",
          tip: "WP = What Price Sabre ticketing simulation, retrieves cheapest rate",
          terminal: [
            "* WP",
            `  BASE: USD 830.00 / CLASS ${normClass} / TAX: USD 110.00`,
            "  GRAND TOTAL FARE: USD 940.00",
            "  SABRE TICKETING PRICE RECORDED"
          ]
        },
        galileo: {
          cmd: "FQ",
          tip: "FQ = Fare Quote, Travelport best available pricing matrix audit",
          terminal: [
            "> FQ",
            `  FARES STORED - 01 / BA 117${normClass} ${normDate}`,
            `  TOTAL GBP 720.00 INCL TAXES & EXTRA FEES FOR CLASS ${normClass}`
          ]
        }
      },
      promptPreset: "pricing flights using FXP best buy"
    },
    exchange: {
      title: "Itinerary Exchanges / Reissues",
      description: `Evaluate ticket reissues, flight adjustments, and premium tax recalculations on route ${originCode} - ${destCode}.`,
      commands: {
        amadeus: {
          cmd: "FXQ",
          tip: "FXQ = Automated exchange analysis command in Amadeus",
          terminal: [
            "> FXQ",
            `  ** OVERVIEW FARE RECALCULATION ENGINE FOR ${normName} **`,
            `  ROUTE CHECK: ${originCode} TO ${destCode}`,
            "  ORIGINAL FARE AED 3455.00 / ADJ OUTSTANDING SUCCESS"
          ]
        },
        sabre: {
          cmd: "WFR/",
          tip: "WFR/ = What Fare Reissue Sabre transactional exchange module",
          terminal: [
            "* WFR/",
            `  REISSUE CALCULATION RECORD SET ON DATE ${normDate}`,
            "  ADDITIONAL TAX BALANCE DUE: USD 120.00",
            "  EXCHANGE FEE COMPLIED SUCCESSFULLY"
          ]
        },
        galileo: {
          cmd: "EXCH",
          tip: "EXCH = Enter interactive Galileo Ticket Exchange recalculation worksheet",
          terminal: [
            "> EXCH",
            `  -- COMPUTE EXCHANGE BALANCE SHEET FOR ${originCode} --`,
            "  DIFFERENCE IN TICKET ROUTING: GBP 150.05",
            `  PENALTY FEE RECORDED: GBP 50.00 TOTAL COLLECT LHR`
          ]
        }
      },
      promptPreset: "exchanging ticket reissue"
    }
  };

  // Human GDS scenarios (The interactive sliding cards)
  const slides = [
    {
      id: "pnr",
      stepNumber: "STAGE 01",
      title: "Passenger File Building",
      tagline: "Stop studying complex rulebooks. Start building real traveler profiles.",
      description: "Trainees craft dynamic passenger records (PNRs). The simulator monitors legal naming structures, agency contact lines, and critical ticketing deadlines so your teams gain instant muscle memory.",
      promptPreset: "how to create a passenger name record (PNR) for John Smith",
      badge: "Passenger Profile",
      colorTheme: "from-cyan-500/20 to-teal-500/10",
      accentGlow: "rgba(6,182,212,0.15)",
      humanInsight: "Why it matters: Typing a name wrong on a real booking can lock tickets or cause massive delays. This sandbox builds perfect habit patterns."
    },
    {
      id: "sell",
      stepNumber: "STAGE 02",
      title: "Secure High-Demand Seats",
      tagline: "Lock in live airline seating inventory with ultimate confidence.",
      description: "Your team practices reserving flight segments, assigning target cabin coordinates (First, Business, or Economy), and linking multiple connection corridors. Perfect for preparing for rapid-response booking requests.",
      promptPreset: "how to sell segment 1Y1",
      badge: "Flight Booking",
      colorTheme: "from-indigo-500/20 to-sky-500/10",
      accentGlow: "rgba(99,102,241,0.15)",
      humanInsight: "Why it matters: Selecting the wrong class code results in dynamic fare penalties. Practicing here makes the process second nature."
    },
    {
      id: "pricing",
      stepNumber: "STAGE 03",
      title: "Best-Buy Pricing System",
      tagline: "Instantly audit airfares, taxes, and best rates like a pro.",
      description: "Compute flight quote balances in real-time. Check passenger tax breakdowns, check custom corporate discounts, and compare routing airfares in seconds. Master the commands that save your clients thousands of dollars.",
      promptPreset: "pricing flights using FXP best buy",
      badge: "Fare Pricing",
      colorTheme: "from-sky-500/20 to-indigo-500/10",
      accentGlow: "rgba(56,189,248,0.15)",
      humanInsight: "Why it matters: Finding the best rate for your travelers is the difference between a happy customer and losing them to a competitor."
    },
    {
      id: "exchanges",
      stepNumber: "STAGE 04",
      title: "Historic Ticket Exchanges",
      tagline: "Conquer complex calculation math risk-free.",
      description: "Reissue modified date segments, evaluate carrier cancellation fees, audit previous tickets, and calculate exact additional collections. Empower your agents to handle difficult travel changes seamlessly and calmly.",
      promptPreset: "exchanging ticket reissue",
      badge: "Reissues & Exchanges",
      colorTheme: "from-cyan-500/20 to-indigo-500/10",
      accentGlow: "rgba(6,182,212,0.15)",
      humanInsight: "Why it matters: Exchanges represent the hardest GDS tasks. Mastery in this department elevates junior agents to seasoned power-users."
    }
  ];

  const handleNextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedName = isIndividualTrainee ? "Independent Learner" : agencyName;
    if (!emailAddress.trim() || !resolvedName.trim()) return;
    if (isIndividualTrainee) {
      setAgencyName("Independent Learner");
    }
    setDemoStep("submitting");
    setTimeout(() => {
      setDemoStep("success");
    }, 1200);
  };

  const activeTranslation = translations[activeWorkflow];
  const brandDetails = brands.find(b => b.id === selectedBrand) || brands[0];

  return (
    <div className="w-full space-y-24 text-slate-800 font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* HERO SECTION: Highly Cinematic, Modern Split Layout */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-50/40 via-white to-sky-50/30 border border-slate-200 p-8 md:p-12 lg:p-16 shadow-sm">
        
        {/* Glowing backdrop blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-200/40 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-200/35 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(0,0,0,0.01)_1.5px,transparent_1.5px)] bg-[size:50px_50px] pointer-events-none opacity-35"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center relative z-10">
          
          {/* Column 1: Copywriting and Bullet point values - Left Aligned for Editorial Prestige */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Animated Trust Label */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-100 border border-cyan-200 text-sm text-cyan-805 text-cyan-800 font-extrabold tracking-wider uppercase shadow-sm"
            >
              <Sparkles className="w-4.5 h-4.5 text-cyan-600 animate-spin-slow" />
              <span>SIMPLE TRAVEL BOOKING SANDBOX</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-4xl sm:text-6xl md:text-7xl font-sans font-black text-slate-800 leading-[1.05] tracking-tight uppercase"
            >
              Master <span className="text-cyan-600">Amadeus</span>, <span className="text-sky-600">Sabre</span> & <span className="text-indigo-600">Galileo</span>.
            </motion.h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-light">
              We believe amazing travel teams are capable of extraordinary things when backed by the right support. Orbit Desk replaces rigid, dry manuals with high-fidelity, interactive sandboxes—offering that little bit of warm, intelligent guidance your people need to unlock their full potential, build deep confidence, and truly excel in the world of travel.
            </p>

            {/* Premium Mini-feature grid for detail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-3 text-sm sm:text-base font-bold text-slate-700">
                <span className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-750 font-black shrink-0">✓</span>
                <span>Safe Practice Playground</span>
              </div>
              <div className="flex items-center gap-3 text-sm sm:text-base font-bold text-slate-700">
                <span className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-750 font-black shrink-0">✓</span>
                <span>Helpful Hints & Mistakes Guide</span>
              </div>
              <div className="flex items-center gap-3 text-sm sm:text-base font-bold text-slate-700">
                <span className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-750 font-black shrink-0">✓</span>
                <span>Practice real booking commands</span>
              </div>
              <div className="flex items-center gap-3 text-sm sm:text-base font-bold text-slate-700">
                <span className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-750 font-black shrink-0">✓</span>
                <span>Lifetime GDS Reference Companion</span>
              </div>
            </div>

            <div className="pt-2">
              <a 
                href="#demo-form" 
                className="inline-flex items-center gap-2 text-sm sm:text-base text-slate-600 hover:text-cyan-600 font-sans font-black tracking-wide transition underline decoration-cyan-500/40"
              >
                Claim a free team training trial &rarr;
              </a>
            </div>
          </div>

          {/* Column 2: Elegant GDS Launch Deck */}
          <div className="lg:col-span-12 xl:col-span-5 lg:order-last flex flex-col gap-4">
            <span className="text-xs sm:text-sm font-sans font-black tracking-widest text-slate-500 uppercase text-left">
              Select a workspace to start practicing:
            </span>

            {/* Amadeus Card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onLaunchSimulator(undefined, "amadeus")}
              className="group cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:border-cyan-300 hover:shadow-cyan-150 shadow-cyan-100/30 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center font-mono font-black text-sm shrink-0 group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-500 transition-colors duration-200">
                  AN
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base text-slate-800">Amadeus</span>
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                  </div>
                  <span className="text-sm text-slate-500 block leading-snug">The standard system used by international airlines</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center group-hover:text-cyan-600 group-hover:bg-cyan-50/50 group-hover:border-cyan-200 transition-colors duration-200 shrink-0">
                <ArrowRight className="w-4.5 h-4.5" />
              </div>
            </motion.div>

            {/* Sabre Card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onLaunchSimulator(undefined, "sabre")}
              className="group cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:border-sky-300 hover:shadow-sky-150 shadow-sky-100/30 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center font-mono font-black text-sm shrink-0 group-hover:bg-sky-500 group-hover:text-white group-hover:border-sky-500 transition-colors duration-200">
                  1_
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base text-slate-800">Sabre GDS</span>
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                  </div>
                  <span className="text-sm text-slate-500 block leading-snug font-light">Most popular system used across the Americas</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 text-slate-405 text-slate-400 flex items-center justify-center group-hover:text-sky-600 group-hover:bg-sky-50/50 group-hover:border-sky-200 transition-colors duration-200 shrink-0">
                <ArrowRight className="w-4.5 h-4.5" />
              </div>
            </motion.div>

            {/* Galileo Card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onLaunchSimulator(undefined, "galileo")}
              className="group cursor-pointer rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:border-indigo-200 hover:shadow-indigo-150 shadow-indigo-100/30 hover:shadow-md transition-all duration-300 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-mono font-black text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors duration-200">
                  A_
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base text-slate-800">Travelport Galileo</span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  </div>
                  <span className="text-sm text-slate-500 block leading-snug font-light">Fast system used by thousands of travel agents</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 text-slate-405 text-slate-400 flex items-center justify-center group-hover:text-indigo-600 group-hover:bg-indigo-50/50 group-hover:border-indigo-200 transition-colors duration-200 shrink-0">
                <ArrowRight className="w-4.5 h-4.5" />
              </div>
            </motion.div>
          </div>
          
        </div>

        {/* Live Active Systems Overview Row at bottom */}
        <div className="flex items-center justify-center flex-wrap gap-6 md:gap-12 pt-6 text-xs sm:text-sm text-slate-500 font-sans uppercase font-bold tracking-wider relative z-10 border-t border-slate-200 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-2 hover:text-cyan-600 transition cursor-default">
            <span className="w-2 h-2 bg-cyan-500 animate-pulse rounded-full"></span>
            <span>AMADEUS ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 hover:text-sky-600 transition cursor-default">
            <span className="w-2 h-2 bg-sky-500 animate-pulse rounded-full"></span>
            <span>SABRE CORES CONNECTED</span>
          </div>
          <div className="flex items-center gap-2 hover:text-indigo-600 transition cursor-default">
            <span className="w-2 h-2 bg-indigo-500 animate-pulse rounded-full"></span>
            <span>GALILEO GDS ONLINE</span>
          </div>
        </div>
      </section>

      {/* NEW INTERACTIVE FEATURE: THE GDS COMMAND TRANSLATION STUDIO - MASSIVE WOW FACTOR */}
      <section className="space-y-12 relative">
        <div className="absolute top-1/4 left-10 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center space-y-4">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-sans font-black tracking-widest ${
            isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-slate-900 border-slate-800 text-slate-350"
          }`}>
            <BookOpen className="w-4.5 h-4.5 text-cyan-400" /> HOW TO TALK TO THE SYSTEMS
          </div>
          <h2 className={`text-4xl md:text-5xl lg:text-6xl font-sans font-black tracking-tight leading-none uppercase ${isLight ? "text-slate-800" : "text-white"}`}>
            Compare Booking Systems <span className="text-sky-600">Side-by-Side</span>
          </h2>
          <p className={`text-lg md:text-xl max-w-3xl mx-auto font-light leading-relaxed ${isLight ? "text-slate-600" : "text-slate-350"}`}>
            Select a simple task below and see how easy it is to switch between Amadeus, Sabre, and Galileo. See the difference instantly!
          </p>
        </div>

        {/* Translation Widget Layout */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1600px] mx-auto rounded-3xl p-6 md:p-8 border relative z-10 shadow-2xl transition-all duration-300 ${
          isLight ? "bg-slate-55 bg-slate-100/90 border-slate-200/90 shadow-lg text-slate-850" : "bg-slate-950/40 border-slate-800 text-slate-100"
        }`}>
          
          {/* Left Side: Tasks navigation list */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <span className={`text-xs sm:text-sm font-sans tracking-wider uppercase font-extrabold px-2 mb-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Select a standard travel task:
            </span>

            {[
              { id: "availability", title: "1. Check flight availability", icon: Search },
              { id: "sell", title: "2. Sell flight seat/space", icon: MoveUpRight },
              { id: "pnr", title: "3. Create traveler profile", icon: FileCheck },
              { id: "pricing", title: "4. Price tickets correctly", icon: Zap },
              { id: "exchange", title: "5. Exchange/reissue tickets", icon: RefreshCw }
            ].map((workflow) => {
              const isActive = activeWorkflow === workflow.id;
              const IconComp = workflow.icon;
              return (
                <button
                  key={workflow.id}
                  onClick={() => setActiveWorkflow(workflow.id as any)}
                  className={`w-full text-left px-5 py-4.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 ${
                    isActive 
                      ? isLight
                        ? "bg-cyan-500 border-cyan-500 text-white shadow-sm font-black text-base"
                        : "bg-gradient-to-r from-slate-900 to-slate-950 border-cyan-500/40 text-cyan-400 shadow-md font-black text-base" 
                      : isLight
                      ? "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200/40 font-bold text-sm sm:text-base"
                      : "bg-slate-950/40 border-slate-900/50 text-slate-400 hover:text-slate-202 hover:bg-slate-900/10 font-bold text-sm sm:text-base"
                  }`}
                >
                  <span className="flex items-center gap-3 font-black uppercase font-sans">
                    <IconComp className={`w-4.5 h-4.5 ${isActive ? (isLight ? "text-white" : "text-cyan-400") : "text-slate-500"}`} />
                    {workflow.title}
                  </span>
                  {isActive && <span className={`w-2 h-2 rounded-full ${isLight ? "bg-white" : "bg-cyan-400"} animate-ping`} />}
                </button>
              );
            })}

            <div className={`mt-4 p-5 rounded-2xl border text-sm space-y-2.5 font-light ${
              isLight ? "bg-slate-200/50 border-slate-250 text-slate-650 text-slate-600 font-sans" : "bg-gradient-to-br from-slate-900/60 to-slate-950 border-slate-850 text-slate-400"
            }`}>
              <div className={`flex items-center gap-2 font-black uppercase text-sm ${isLight ? "text-slate-800" : "text-white"}`}>
                <Info className={`w-5 h-5 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
                <span>How booking codes differ</span>
              </div>
              <p className="leading-relaxed">
                Each system uses slightly different shorthand commands. For example, some prefer slashes and asterisks, while others look for simple codes. Orbit Desk helps your staff feel comfortable with all three so they can work with any client.
              </p>
            </div>
          </div>

          {/* Right Side: High-fidelity comparator console screen */}
          <div className={`lg:col-span-8 flex flex-col justify-between gap-6 p-5 md:p-8 rounded-2xl border transition-all duration-300 ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/40 border-slate-850"
          }`}>
            <div className="space-y-4">
              
              {/* Heading */}
              <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b ${isLight ? "border-slate-150" : "border-slate-800"}`}>
                <div>
                  <span className={`text-xs sm:text-sm font-sans font-black uppercase tracking-wider ${isLight ? "text-cyan-600" : "text-cyan-400"}`}>
                    workflow active: {activeWorkflow.toUpperCase()}
                  </span>
                  <h3 className={`text-2xl md:text-3xl font-sans font-black uppercase mt-0.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                    {activeTranslation.title}
                  </h3>
                </div>
                <p className={`text-sm sm:text-base max-w-sm text-left lg:text-right font-light ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {activeTranslation.description}
                </p>
              </div>

              {/* Three Tab GDS Brand Selector inside Studio */}
              <div className={`flex p-1.5 rounded-xl border items-center justify-between max-w-md mx-auto sm:mx-0 ${
                isLight ? "bg-slate-100 border-slate-200 shadow-inner" : "bg-slate-950 border-slate-850"
              }`}>
                {brands.map((b) => {
                  const isActive = selectedBrand === b.id;
                  let selectedColors = isLight 
                    ? "text-white bg-cyan-600 border-cyan-500 shadow-sm text-sm"
                    : "text-cyan-400 bg-cyan-950/80 border-cyan-500/25 text-sm";
                  if (b.id === "sabre") selectedColors = isLight
                    ? "text-white bg-sky-500 border-sky-400 shadow-sm text-sm"
                    : "text-sky-400 bg-sky-950/80 border-sky-500/25 text-sm";
                  if (b.id === "galileo") selectedColors = isLight
                    ? "text-white bg-indigo-500 border-indigo-400 shadow-sm text-sm"
                    : "text-indigo-400 bg-indigo-950/80 border-indigo-500/25 text-sm";

                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBrand(b.id as any)}
                      className={`flex-1 text-center py-2.5 rounded-lg text-sm font-black uppercase transition-all duration-300 cursor-pointer ${
                        isActive 
                          ? `${selectedColors} border font-black` 
                          : isLight
                          ? "text-slate-600 hover:text-slate-900 hover:bg-white text-xs sm:text-sm font-bold"
                          : "text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-bold"
                      }`}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>

              {/* Console Details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-2">
                
                {/* Specs column with LIVE PARAMETER ADJUSTMENTS & CUSTOM PREMIUM BOARDING PASS */}
                <div className="md:col-span-12 lg:col-span-12 xl:col-span-5 space-y-4 text-left">
                  
                  {/* Dynamic control dials */}
                  <div className={`p-4 rounded-xl border space-y-3.5 ${
                    isLight ? "bg-slate-50 border-slate-205 border-slate-200" : "bg-slate-900 border-slate-800"
                  }`}>
                    <div className="flex items-center gap-2 pb-1.5 border-b border-dashed border-slate-200 dark:border-slate-800">
                      <Sparkles className="w-4 h-4 text-cyan-500 animate-pulse animate-spin-slow" />
                      <span className={`text-xs uppercase font-black tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                        Interactive Parameters (Tune Live)
                      </span>
                    </div>

                    {activeWorkflow === "availability" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Route Pair</label>
                          <input 
                            type="text" 
                            maxLength={6}
                            value={liveRoute}
                            onChange={(e) => {
                              setLiveRoute(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                              playTapSound();
                            }}
                            className={`w-full text-xs font-mono p-2.5 rounded-lg border font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-950 text-white border-slate-800"}`}
                            placeholder="LHRJFK"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Date Tag</label>
                          <input 
                            type="text" 
                            maxLength={5}
                            value={liveDate}
                            onChange={(e) => {
                              setLiveDate(e.target.value.toUpperCase());
                              playTapSound();
                            }}
                            className={`w-full text-xs font-mono p-2.5 rounded-lg border font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-950 text-white border-slate-800"}`}
                            placeholder="15OCT"
                          />
                        </div>
                      </div>
                    )}

                    {activeWorkflow === "sell" && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold text-center ${isLight ? "text-slate-500" : "text-slate-400"}`}>Segment</label>
                          <input 
                            type="text" 
                            maxLength={1}
                            value={liveSegment}
                            onChange={(e) => {
                              setLiveSegment(e.target.value.replace(/[^1-9]/g, ""));
                              playTapSound();
                            }}
                            className={`w-full text-xs font-mono p-2.5 rounded-lg text-center border font-black focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-950 text-white border-slate-800"}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold text-center ${isLight ? "text-slate-500" : "text-slate-400"}`}>Class</label>
                          <input 
                            type="text" 
                            maxLength={1}
                            value={liveClass}
                            onChange={(e) => {
                              setLiveClass(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
                              playTapSound();
                            }}
                            className={`w-full text-xs font-mono p-2.5 rounded-lg text-center border font-black uppercase focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-950 text-white border-slate-800"}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold text-center ${isLight ? "text-slate-500" : "text-slate-400"}`}>Passengers</label>
                          <input 
                            type="text" 
                            maxLength={1}
                            value={livePaxCount}
                            onChange={(e) => {
                              setLivePaxCount(e.target.value.replace(/[^1-9]/g, ""));
                              playTapSound();
                            }}
                            className={`w-full text-xs font-mono p-2.5 rounded-lg text-center border font-black focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-950 text-white border-slate-800"}`}
                          />
                        </div>
                      </div>
                    )}

                    {activeWorkflow === "pnr" && (
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-8 space-y-1">
                          <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>passenger name</label>
                          <input 
                            type="text" 
                            maxLength={16}
                            value={liveName}
                            onChange={(e) => {
                              setLiveName(e.target.value.toUpperCase());
                              playTapSound();
                            }}
                            className={`w-full text-xs font-mono p-2.5 rounded-lg border font-black uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-950 text-white border-slate-800"}`}
                            placeholder="SMITH/ANNA"
                          />
                        </div>
                        <div className="col-span-4 space-y-1">
                          <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold text-center ${isLight ? "text-slate-500" : "text-slate-400"}`}>Count</label>
                          <input 
                            type="text" 
                            maxLength={1}
                            value={livePaxCount}
                            onChange={(e) => {
                              setLivePaxCount(e.target.value.replace(/[^1-9]/g, ""));
                              playTapSound();
                            }}
                            className={`w-full text-xs font-mono p-2.5 rounded-lg text-center border font-black focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-950 text-white border-slate-800"}`}
                          />
                        </div>
                      </div>
                    )}

                    {activeWorkflow === "pricing" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Fare Class</label>
                          <input 
                            type="text" 
                            maxLength={1}
                            value={liveClass}
                            onChange={(e) => {
                              setLiveClass(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
                              playTapSound();
                            }}
                            className={`w-full text-xs font-mono p-2.5 rounded-lg border font-black uppercase focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-950 text-white border-slate-800"}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Route Code</label>
                          <input 
                            type="text" 
                            maxLength={6}
                            value={liveRoute}
                            onChange={(e) => {
                              setLiveRoute(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                              playTapSound();
                            }}
                            className={`w-full text-xs font-mono p-2.5 rounded-lg border font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-cyan-500 ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-950 text-white border-slate-800"}`}
                          />
                        </div>
                      </div>
                    )}

                    {activeWorkflow === "exchange" && (
                      <div className="space-y-1.5 text-left">
                        <label className={`text-[10px] font-mono uppercase tracking-wider block font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}>Ticket Selected</label>
                        <div className={`p-2 rounded-lg border text-[11px] font-bold ${isLight ? "bg-white border-slate-200 text-slate-600" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
                          🎫 EXCHANGE RECORD FOR: {normName} on {normDate} ({originCode} &rarr; {destCode})
                        </div>
                      </div>
                    )}

                  </div>

                  {/* HIGH-FIDELITY TICKETING INTERFACE CARD - ULTIMATE CLIENT WOW FACTOR! */}
                  <div className={`rounded-xl border shadow-md relative overflow-hidden text-left p-4 space-y-3 transition-all duration-300 ${
                    isLight 
                      ? "bg-gradient-to-tr from-cyan-500 to-sky-600 border-cyan-400 text-white" 
                      : "bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 border-slate-800 text-slate-100 shadow-2xl"
                  }`}>
                    {/* Atmospheric styling blobs inside ticket */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyan-400/20 rounded-full blur-xl pointer-events-none"></div>

                    {/* Outer receipt cut decoration style */}
                    <div className="absolute top-1/2 -left-2 w-3 h-6 rounded-r-full bg-white dark:bg-[#0c142c] border-r dark:border-slate-800/60 -translate-y-1/2"></div>
                    <div className="absolute top-1/2 -right-2 w-3 h-6 rounded-l-full bg-white dark:bg-[#0c142c] border-l dark:border-slate-800/60 -translate-y-1/2"></div>

                    {/* Receipt Header */}
                    <div className="flex items-center justify-between border-b border-white/20 pb-2 text-[9px] font-mono tracking-widest uppercase text-white/90">
                      <span className="font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping inline-block"></span>
                        ORBIT BOARDING PASS
                      </span>
                      <span className="bg-white/20 px-2 py-0.5 rounded font-black text-cyan-50">
                        {selectedBrand.toUpperCase()} SYSTEM
                      </span>
                    </div>

                    {/* Traveler Details */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] uppercase font-mono tracking-wider opacity-80 block">Global Passenger</span>
                          <span className="text-sm font-black uppercase font-sans tracking-wide">
                            {normName} MS
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] uppercase font-mono tracking-wider opacity-80 block">Class / Seat</span>
                          <span className="text-xs font-mono font-extrabold bg-white/20 px-1.5 py-0.5 rounded">
                            {normClass} - SEAT 17A
                          </span>
                        </div>
                      </div>

                      {/* Flight Coordinates and Route Drawing */}
                      <div className="flex justify-between items-center py-1">
                        <div className="text-left">
                          <span className="text-lg font-black font-mono tracking-wider block">{originCode}</span>
                          <span className="text-[8px] uppercase opacity-80 block text-ellipsis overflow-hidden max-w-[65px]">DEPARTURE</span>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center px-2 relative">
                          <div className="w-full border-t border-dashed border-white/40 absolute top-1/2 left-0 -translate-y-1/2"></div>
                          <div className="relative bg-cyan-600 dark:bg-slate-900 border border-white/20 px-1.5 py-0.5 rounded text-[10px] z-10 flex items-center justify-center shadow-sm">
                            <span className="animate-pulse">✈</span>
                          </div>
                          <span className="text-[7.5px] uppercase tracking-widest opacity-70 mt-5 block font-mono">NON-STOP PASS</span>
                        </div>

                        <div className="text-right">
                          <span className="text-lg font-black font-mono tracking-wider block">{destCode}</span>
                          <span className="text-[8px] uppercase opacity-80 block text-ellipsis overflow-hidden max-w-[65px]">DESTINATION</span>
                        </div>
                      </div>

                      {/* Footer Segment on Boarding Pass */}
                      <div className="grid grid-cols-2 gap-2 border-t border-white/20 pt-2 text-xs">
                        <div>
                          <span className="text-[8px] uppercase opacity-80 font-mono block">Departure Date</span>
                          <span className="font-extrabold">{normDate} 2026</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] uppercase opacity-80 font-mono block">Sim Status</span>
                          <span className="font-black px-2 py-0.5 rounded text-[9px] bg-emerald-500/30 text-emerald-100 border border-emerald-400/35 uppercase tracking-widest select-none">
                            ✓ CONFIRMED
                          </span>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>

                {/* Simulated Console Screen */}
                <div className="md:col-span-12 lg:col-span-12 xl:col-span-7">
                  <div className="bg-[#000080] border border-cyan-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden min-h-[220px] flex flex-col justify-between">
                    <div className="absolute inset-0 pointer-events-none crt-scanlines opacity-10"></div>
                    
                    <div className="space-y-4">
                      {/* Top ribbon */}
                      <div className="flex justify-between items-center border-b border-cyan-800 pb-2 text-xs font-mono text-cyan-400">
                        <span className="uppercase font-extrabold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full animate-ping ${
                            selectedBrand === "amadeus" ? "bg-cyan-400" : selectedBrand === "sabre" ? "bg-sky-400" : "bg-indigo-400"
                          }`} />
                          {brandDetails.name.toUpperCase()} MAINFRAME ACTIVE
                        </span>
                        <span>0 TRANSMISSION ERRORS</span>
                      </div>

                      {/* Code Terminal rows */}
                      <div className="font-mono text-sm sm:text-base tracking-wider leading-relaxed space-y-2 text-slate-100">
                        {activeTranslation.commands[selectedBrand].terminal.map((line, idx) => (
                          <div 
                            key={idx}
                            className={line.startsWith(">") || line.startsWith("*") 
                              ? "text-white font-black brightness-125 flex items-center gap-2" 
                              : "text-cyan-305 text-cyan-300 pl-4 opacity-90 font-medium"
                            }
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom tracer */}
                    <div className="pt-3.5 border-t border-cyan-800 flex justify-between items-center text-xs sm:text-sm font-mono text-cyan-400 mt-2">
                      <span>COMPILED MAINFRAME DIRECTIVE</span>
                      <span className={`px-2.5 py-1 rounded font-black border text-xs sm:text-sm md:text-base ${isLight ? "text-slate-800 bg-slate-100 border-slate-205 border-slate-200" : "text-white bg-slate-950 border-slate-800"}`}>
                        {activeTranslation.commands[selectedBrand].cmd}
                      </span>
                    </div>

                  </div>
                </div>

              </div>

            </div>

            {/* Test drive action bar built directly to launch simulator */}
            <div className={`p-5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 font-sans transition-all ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-850"
            }`}>
              <div className="text-left">
                <p className={`text-sm sm:text-base font-black uppercase flex items-center gap-2 ${isLight ? "text-slate-800" : "text-white"}`}>
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block animate-pulse" />
                  Try This Exact GDS Command Set
                </p>
                <p className={`text-xs sm:text-sm mt-1 font-light leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Ready to test? This boots the simulator, sets the brand to <strong className={isLight ? "text-slate-900 font-bold" : "text-white font-extrabold"}>{brandDetails.name}</strong>, and logs instructions.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05, x: 3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onLaunchSimulator(activeTranslation.promptPreset, selectedBrand)}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs sm:text-sm px-6 py-3.5 rounded-lg transition duration-200 cursor-pointer flex items-center gap-2 shadow-md select-none w-full sm:w-auto justify-center font-sans"
              >
                <Play className="w-4 h-4 fill-slate-950 text-slate-950" /> Test-Drive on Terminal
              </motion.button>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 2: THE IMMERSIVE SLIDING DECK */}
      <section className="space-y-12 relative">
        <div className="absolute top-1/2 left-0 right-0 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center space-y-4">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-sans font-black tracking-widest uppercase ${
            isLight ? "bg-cyan-100 border-cyan-200 text-cyan-700" : "bg-cyan-950 border-cyan-500/20 text-cyan-300"
          }`}>
            <Flame className="w-4.5 h-4.5 animate-pulse text-yellow-500" /> Interactive Masterclass
          </div>
          <h2 className={`text-4xl md:text-5xl lg:text-6xl font-sans font-black tracking-tight leading-none uppercase ${isLight ? "text-slate-800" : "text-white"}`}>
            Slick Interactive <span className="text-cyan-600">Practice Workflows</span>
          </h2>
          <p className={`text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed ${isLight ? "text-slate-600" : "text-slate-350"}`}>
            Slide through these high-impact real world scenarios. Test-drive each one instantly to see why operational managers prefer Orbit Desk.
          </p>
        </div>

        {/* Dynamic Card Slider */}
        <div className="relative max-w-[1600px] mx-auto px-1 md:px-8">
          
          {/* Main Card */}
          <div className={`border rounded-3xl p-6 md:p-12 shadow-sm relative overflow-hidden min-h-[480px] flex flex-col justify-between ${
            isLight ? "bg-gradient-to-br from-cyan-50/20 via-white to-sky-50/25 border-slate-200" : "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 shadow-2xl"
          }`}>
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-b ${slides[activeIndex].colorTheme} rounded-full blur-3xl pointer-events-none opacity-40 transition-colors duration-500`}></div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={activeIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center text-left"
              >
                
                {/* Left Side: Descriptive info */}
                <div className="lg:col-span-6 space-y-6 relative z-10">
                  <div className="space-y-1.5">
                    <span className={`text-xs sm:text-sm font-sans font-black tracking-widest uppercase border px-3 py-1 rounded-md ${
                      isLight ? "bg-cyan-55 bg-cyan-100/60 border-cyan-200 text-cyan-705 text-cyan-700" : "bg-cyan-500/5 border-cyan-500/10 text-cyan-400"
                    }`}>
                      {slides[activeIndex].stepNumber} • {slides[activeIndex].badge}
                    </span>
                    <h3 className={`text-3xl md:text-5xl font-sans font-black leading-tight uppercase pt-2.5 ${isLight ? "text-slate-800" : "text-white"}`}>
                      {slides[activeIndex].title}
                    </h3>
                  </div>

                  <p className={`text-2xl md:text-3xl font-extrabold leading-snug italic tracking-tight ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    "{slides[activeIndex].tagline}"
                  </p>

                  <p className={`text-base md:text-lg leading-relaxed font-light ${isLight ? "text-slate-600 opacity-90" : "text-slate-350"}`}>
                    {slides[activeIndex].description}
                  </p>

                  <div className={`p-5 rounded-xl border space-y-2 ${
                    isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-950/60 border-slate-850/60"
                  }`}>
                    <p className={`text-sm sm:text-base font-black ${isLight ? "text-slate-900" : "text-slate-300"}`}>💡 Professional Tip</p>
                    <p className={`text-sm sm:text-base leading-relaxed font-light ${isLight ? "text-slate-650 text-slate-600" : "text-slate-400"}`}>{slides[activeIndex].humanInsight}</p>
                  </div>

                  <div className="pt-2">
                    <motion.button
                      key={slides[activeIndex].id}
                      whileHover={{ scale: 1.05, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onLaunchSimulator(slides[activeIndex].promptPreset)}
                      className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs sm:text-sm px-6 py-4 rounded-xl transition duration-205 cursor-pointer flex items-center gap-2.5 shadow-lg select-none"
                    >
                      <Play className="w-4 h-4 fill-slate-950 text-slate-950" /> Test-Drive This Stage Now
                    </motion.button>
                  </div>
                </div>

                {/* Right Side: Retro CRT Console simulation */}
                <div className={`lg:col-span-6 relative z-10 p-4 rounded-2xl border transition-all duration-300 ${
                  isLight ? "bg-white border-slate-205 border-slate-200" : "bg-slate-950/40 border-slate-850"
                }`}>
                  <div className="bg-[#000080] border border-cyan-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden crt-monitor-glow min-h-[300px] flex flex-col justify-between">
                    <div className="absolute inset-0 pointer-events-none crt-scanlines opacity-15"></div>

                    <div className="space-y-4">
                      
                      {/* Top bar */}
                      <div className="flex justify-between items-center border-b border-cyan-800 pb-2.5">
                        <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-black flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                          MULTIFUNCTION SANDBOX WORKSPACE
                        </span>
                        <span className="text-xs text-cyan-400 font-mono tracking-widest">OK STATUS</span>
                      </div>

                      {/* Code layout matches brand translation matrix */}
                      <div className="space-y-2.5 font-mono text-cyan-300 text-sm sm:text-base tracking-wider leading-relaxed">
                        <div className="text-white font-extrabold brightness-125">
                          &gt; {translations[slides[activeIndex].id === "exchanges" ? "exchange" : slides[activeIndex].id as any]?.commands.amadeus.cmd}
                        </div>
                        <div className="pl-3 opacity-95">
                          {translations[slides[activeIndex].id === "exchanges" ? "exchange" : slides[activeIndex].id as any]?.commands.amadeus.terminal[1]}
                        </div>
                        <div className="pl-3 opacity-95">
                          {translations[slides[activeIndex].id === "exchanges" ? "exchange" : slides[activeIndex].id as any]?.commands.amadeus.terminal[2]}
                        </div>
                        <div className="text-white font-extrabold brightness-125 mt-3">
                          * {translations[slides[activeIndex].id === "exchanges" ? "exchange" : slides[activeIndex].id as any]?.commands.sabre.cmd}
                        </div>
                        <div className="pl-3 opacity-95 text-cyan-300 font-medium">
                          {translations[slides[activeIndex].id === "exchanges" ? "exchange" : slides[activeIndex].id as any]?.commands.sabre.terminal[1]}
                        </div>
                      </div>

                    </div>

                    {/* Bottom active tracer */}
                    <div className="pt-4 border-t border-cyan-800 flex justify-between items-center text-xs sm:text-sm font-mono text-cyan-400">
                      <span>MULTI GDS LIVE REVIEWS</span>
                      <span>AMADEUS • SABRE • GALILEO</span>
                    </div>

                  </div>
                </div>

              </motion.div>
            </AnimatePresence>

          </div>

          {/* Interactive Navigation Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4 px-2">
            
            {/* Quick Segment Indicator Pills */}
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`px-4.5 py-2 rounded-full text-xs sm:text-sm font-black tracking-wide transition-all duration-300 cursor-pointer ${
                    activeIndex === idx 
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
                      : isLight
                      ? "bg-slate-200/80 border border-slate-300 text-slate-600 hover:text-slate-900"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-202"
                  }`}
                  aria-label={`Show slide of ${slide.badge}`}
                >
                  {slide.badge}
                </button>
              ))}
            </div>

            {/* Previous / Next Arrow triggers */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePrevSlide}
                className={`p-3.5 rounded-full border transition-all cursor-pointer active:scale-95 ${
                  isLight 
                    ? "border-slate-205 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-350 shadow-sm" 
                    : "border-slate-800 bg-slate-950/80 text-slate-404 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
                title="Go to previous scenario"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNextSlide}
                className={`p-3.5 rounded-full border transition-all cursor-pointer active:scale-95 ${
                  isLight 
                    ? "border-slate-205 bg-white text-slate-600 hover:text-slate-905 hover:border-slate-350 shadow-sm" 
                    : "border-slate-800 bg-slate-950/80 text-slate-404 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
                title="Go to next scenario"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 3: THE HIGH-IMPACT HUMAN CONVERSION GRID */}
      <section className="space-y-12 max-w-[1600px] mx-auto">
        <div className="text-center space-y-4">
          <span className={`text-xs sm:text-sm font-extrabold tracking-widest uppercase font-sans ${isLight ? "text-cyan-600" : "text-cyan-400"}`}>STARK COMPARISONS</span>
          <h2 className={`text-4xl md:text-5xl lg:text-6xl font-sans font-black uppercase tracking-tight text-center ${isLight ? "text-slate-800" : "text-white"}`}>
            How Orbit Desk <span className="text-cyan-600">Helps Your Team</span>
          </h2>
          <p className={`text-base md:text-lg max-w-2xl mx-auto font-light text-center ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            Learning from a slide deck isn't the same as doing it yourself. Here is how we help your teams learn naturally and confidently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch font-sans">
          
          {/* Column A: Traditional (Dull, Boring, Harder) */}
          <div className={`p-8 rounded-3xl space-y-6 relative overflow-hidden transition-all duration-350 border ${
            isLight ? "bg-slate-100/70 border-slate-200 text-slate-700" : "bg-slate-950/40 border-slate-800 text-slate-300"
          }`}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400"></div>
            <div className={`flex items-center gap-2 font-black uppercase tracking-wider text-xs ${
              isLight ? "text-slate-800" : "text-slate-100"
            }`}>
              <span className="text-sm">😴</span>
              OLD SCHOOL CLASSROOM METHODS (SLOW & DUSTY)
            </div>
            
            <div className="space-y-6">
              {[
                { label: "Boring Written Manuals", val: "Trainees sit alone for weeks reading long PDFs, trying to memorize booking codes they have never used." },
                { label: "Constant Interruptions", val: "Experienced senior staff have to stop their own work constantly to answer repeat shortcut questions." },
                { label: "Fear of Making Mistakes", val: "Without safe practice, trainees feel highly stressed and worry about making costly booking errors on live client files." }
              ].map((item, idx) => (
                <div key={idx} className={`space-y-1 text-left border-b pb-4 last:border-0 last:pb-0 ${isLight ? "border-slate-200/60" : "border-slate-800/80"}`}>
                  <h4 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                    <span className="text-red-500 font-extrabold">✕</span> {item.label}
                  </h4>
                  <p className={`text-xs sm:text-sm font-light leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>{item.val}</p>
                </div>
              ))}
            </div>
            
            <div className="pt-2 text-center">
              <span className={`inline-block text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded ${
                isLight ? "bg-slate-200/60 text-slate-700" : "bg-slate-900/60 text-slate-300"
              }`}>
                Estimated Onboarding Time: 12 Weeks of manuals
              </span>
            </div>
          </div>

          {/* Column B: Orbit Desk (Vibrantly Positive, Delightful, and Fast) */}
          <div className={`p-8 sm:p-10 rounded-3xl space-y-8 relative overflow-hidden shadow-2xl transition-all duration-300 border-2 ${
            isLight 
              ? "bg-gradient-to-br from-cyan-50 via-teal-50/15 to-emerald-50/25 border-cyan-400 shadow-cyan-100" 
              : "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.15)]"
          }`}>
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-cyan-400 to-emerald-400 animate-pulse"></div>
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 text-cyan-600 dark:text-cyan-400 font-black uppercase tracking-widest text-xs sm:text-sm">
                <span className={`w-3 h-3 rounded-full bg-cyan-400 inline-block animate-ping`}></span>
                <span>⚡ THE ORBIT DESK WAY (FAST, ACTIVE & EASY!)</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {[
                { label: "Active Learning by Doing", val: "Your team practices typing live bookings inside a safe, welcoming playground where it is 100% okay to make mistakes." },
                { label: "Friendly Companion Help Instantly", val: "If a trainee gets stuck, a helpful chat companion pops up to offer clear and encouraging hints." },
                { label: "Deep Confidence From Day One", val: "By building muscle memory safely, trainees are excited, happy, and fully ready to serve clients in days." }
              ].map((item, idx) => (
                <div key={idx} className={`space-y-1.5 text-left border-b pb-4 last:border-0 last:pb-0 ${isLight ? "border-cyan-200/50" : "border-slate-800"}`}>
                  <h4 className={`text-base sm:text-lg font-sans font-black uppercase tracking-wide flex items-center gap-2.5 ${isLight ? "text-slate-900 font-bold" : "text-white animate-pulse-slow"}`}>
                    <Check className={`w-5 h-5 text-emerald-500 shrink-0 font-black`} /> {item.label}
                  </h4>
                  <p className={`text-sm sm:text-base font-semibold leading-relaxed ${isLight ? "text-slate-700 font-medium" : "text-slate-300 font-medium"}`}>{item.val}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <span className="inline-block text-xs sm:text-sm font-sans font-black uppercase tracking-wider px-5 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-md shadow-emerald-500/30">
                🚀 Ready for live desk booking in exactly 15 Days!
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* SPECIAL BRAND FOCUS 1: THE TRAINEE EXCELLING SPOTLIGHT */}
      <section className="max-w-[1600px] mx-auto relative px-1 space-y-4">
        <div className="text-left space-y-2">
          <span className={`text-xs sm:text-sm font-extrabold tracking-widest uppercase font-sans ${isLight ? "text-cyan-600" : "text-cyan-400"}`}>TEAM EXPANSION</span>
          <h2 className={`text-3xl md:text-5xl font-sans font-black uppercase tracking-tight ${isLight ? "text-slate-800" : "text-white"}`}>
            Grow Your Trainee Talent Faster
          </h2>
        </div>

        <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
          isLight ? "bg-white border-slate-200/90 shadow-lg text-slate-800" : "bg-slate-950/80 border-slate-900 text-slate-100"
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 items-center">
            
            {/* Left: Professional High-Fidelity Image with Overlay Badges */}
            <div className="md:col-span-6 p-6 md:p-8 lg:p-10 flex flex-col justify-center">
              <div className="relative h-72 md:h-[360px] w-full rounded-tl-[3.5rem] rounded-br-[3.5rem] rounded-tr-2xl rounded-bl-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850/60 group shadow-lg hover:shadow-2xl transition-all duration-350">
                <img 
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800" 
                  alt="Aviation consultant trainee sitting at a PC desk with her trainer standing behind her looking happy as they look at the GDS monitor" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/15 to-transparent"></div>
                
                {/* Floating Screen Detail representation of the GDS system on the PC monitor */}
                <div className="absolute top-4 right-4 p-3.5 rounded-xl bg-black/95 border border-cyan-500/40 shadow-2xl font-mono text-[11px] text-cyan-400 scale-90 sm:scale-100 origin-top-right select-none max-w-[200px] pointer-events-none z-10 transition-all duration-300">
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 border-b border-cyan-500/25 pb-1 mb-1.5 uppercase font-black tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>GDS WORKSPACE</span>
                  </div>
                  <div className="text-cyan-400 font-black">&gt; AN15OCTLHRJFK</div>
                  <div className="text-cyan-300 font-semibold text-[10px]">1BA 117 F9 Y9 B9</div>
                  <div className="text-cyan-400 font-black mt-1">&gt; SS1Y1*PD</div>
                  <div className="text-emerald-400 font-black text-center mt-2 border border-emerald-500/30 bg-emerald-950/45 py-0.5 rounded text-[9px] uppercase tracking-widest">
                    * CONFIRMED *
                  </div>
                </div>

                {/* Overlay Badge for Amadeus session simulation */}
                <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-xl bg-slate-950/95 backdrop-blur-md border border-cyan-500/30 font-mono text-[11px] text-cyan-400 space-y-1.5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
                    <span className="font-extrabold text-[9px] text-slate-300 uppercase tracking-widest">AMADEUS TRAINING ACTIVE</span>
                    <span className="animate-pulse text-cyan-400 text-xs font-black">● SEATS RESERVED</span>
                  </div>
                  <div className="opacity-90 font-medium text-slate-350">"First segment mapped flawlessly!"</div>
                </div>
              </div>
            </div>

            {/* Right: Team Empowerment Copywriting */}
            <div className="md:col-span-6 p-6 md:p-10 lg:p-12 space-y-6 text-left">
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                isLight ? "bg-cyan-100/70 text-cyan-800 border border-cyan-100" : "bg-cyan-950/60 text-cyan-400 border border-cyan-900"
              }`}>
                <Zap className="w-4 h-4 text-cyan-500" />
                Fast Active Onboarding
              </div>
              
              <h3 className={`text-2xl md:text-3xl lg:text-4xl font-sans font-black uppercase tracking-tight leading-tight ${
                isLight ? "text-slate-800" : "text-white"
              }`}>
                Supercharge Muscle Memory
              </h3>

              <div className={`text-sm sm:text-base font-light space-y-4 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-350"}`}>
                <p>
                  For junior agents, standard green screens are intimidating, silent, and easily prone to dynamic airline booking errors. Memorizing codes from classic manuals takes weeks and crushes active enthusiasm.
                </p>
                <p>
                  Orbit Desk guides trainees through flight checking, cabin seat locking, and live-price calculation formats organically. By practicing inside our interactive simulator, they make typing mistakes here—not on active, high-liability airline records.
                </p>
              </div>

              {/* Supportive Bullet Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-200/50 dark:border-slate-800">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5 text-xs font-black">✓</span>
                  <div>
                    <h5 className={`font-black text-sm uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>Zero Classroom Boredom</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-light mt-1">Ditch standard manuals for intuitive, hands-on terminal command-line muscle memory.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5 text-xs font-black">✓</span>
                  <div>
                    <h5 className={`font-black text-sm uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>Intelligent Assistance</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-light mt-1">Contextual tips dynamically point out missing parameters real-time when trainees get stuck.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SPECIAL BRAND FOCUS 2: THE EXPERIENCED VETERAN CAREER-LIFETIME SAFETY NET */}
      <section className="max-w-[1600px] mx-auto relative px-1 space-y-4">
        <div className="text-left md:text-right space-y-2">
          <span className={`text-xs sm:text-sm font-extrabold tracking-widest uppercase font-sans ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>LIFETIME CAREER UTILITY</span>
          <h2 className={`text-3xl md:text-5xl font-sans font-black uppercase tracking-tight ${isLight ? "text-slate-800" : "text-white"}`}>
            A Professional Safety Net for Veterans
          </h2>
        </div>

        <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
          isLight ? "bg-gradient-to-br from-white to-emerald-50/10 border-slate-200/90 shadow-lg text-slate-800" : "bg-slate-950/80 border-slate-900 text-slate-100"
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 items-center">
            
            {/* Left: Copywriting text - staggered layout */}
            <div className="md:col-span-6 p-6 md:p-10 lg:p-12 space-y-6 text-left md:order-first">
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                isLight ? "bg-emerald-100/70 text-emerald-800 border border-emerald-100" : "bg-emerald-950/60 text-emerald-400 border border-emerald-900"
              }`}>
                <Award className="w-4 h-4 text-emerald-500" />
                Continuous Career Resource
              </div>
              
              <h3 className={`text-2xl md:text-3xl lg:text-4xl font-sans font-black uppercase tracking-tight leading-tight ${
                isLight ? "text-slate-800" : "text-white"
              }`}>
                Built for Your Entire Career
              </h3>

              <div className={`text-sm sm:text-base font-light space-y-4 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-350"}`}>
                <p>
                  Orbit Desk is not just an onboarding workbook or a temporary simulator—it is a live, high-fidelity reference environment built to stand by agents for their entire corporate travel careers.
                </p>
                <p>
                  Even senior specialists with 15+ years of active desk experience encounter rare passenger split queues, complex group reservations, or strange historical ticket exchange math. Instead of guessing on a resident system or risking expensive airline debit penalties, experienced staff keep Orbit Desk open in a second tab to safely draft and test layouts first.
                </p>
              </div>

              {/* Supportive Bullet Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-200/50 dark:border-slate-800">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5 text-xs font-black">✓</span>
                  <div>
                    <h5 className={`font-black text-sm uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>Rare Entry Sandbox</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-light mt-1">Safely verify intricate formatting layout entries and qualifiers risk-free before execution.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5 text-xs font-black">✓</span>
                  <div>
                    <h5 className={`font-black text-sm uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>Dialect Translation</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-light mt-1">Map Sabre, Amadeus, and Galileo formats side-by-side when switching agency clients.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Interactive, high-fidelity Orbit Desk video simulator walkthrough */}
            <div className="md:col-span-6 md:order-last p-4 md:p-6 lg:p-8 flex flex-col justify-center">
              <div className="relative h-80 md:h-[420px] w-full rounded-tr-[3.5rem] rounded-bl-[3.5rem] rounded-tl-2xl rounded-br-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl hover:shadow-[0_0_50px_rgba(6,182,212,0.15)] transition-all duration-350 z-10">
                <OrbitDeskVideoSimulator />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: REASSURING SOCIAL PROOF (Speaking to Humans) */}
      <section className={`border p-8 md:p-14 max-w-[1600px] mx-auto space-y-8 rounded-3xl transition-colors duration-300 ${
        isLight ? "bg-slate-50 border-slate-201 border-slate-200" : "bg-slate-900/10 border-slate-900"
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left">
          
          <div className="md:col-span-5 space-y-4">
            <div className={`inline-flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider ${isLight ? "text-cyan-600" : "text-cyan-400"}`}>
              <Star className="w-4.5 h-4.5 fill-cyan-400 text-cyan-400" /> Our Clients' Reviews
            </div>
            <h3 className={`text-3xl md:text-4xl lg:text-5xl font-sans font-black uppercase tracking-tight leading-tight ${isLight ? "text-slate-800" : "text-white"}`}>
              Operational Leaders <span className="text-cyan-600">Love Us</span>
            </h3>
            <p className={`text-base md:text-lg font-light leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Read how real-world aviation agency directors and support desk managers scale their training capacity cleanly.
            </p>
          </div>

          <div className={`md:col-span-7 p-6 md:p-10 rounded-2xl relative overflow-hidden border ${
            isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-slate-950/70 border-slate-850"
          }`}>
            <Quote className="absolute top-4 right-4 w-12 h-12 text-slate-200/10 pointer-events-none" />
            
            <div className="space-y-4">
              <p className={`text-lg sm:text-xl md:text-2xl leading-relaxed font-light italic ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                "{testimonials[activeTestimonial].quote}"
              </p>

              <div className={`flex items-center justify-between pt-4 border-t ${isLight ? "border-slate-100" : "border-slate-900"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl">{testimonials[activeTestimonial].avatar}</span>
                  <div>
                    <h5 className={`text-sm sm:text-base font-black uppercase ${isLight ? "text-slate-800 font-extrabold" : "text-white"}`}>
                      {testimonials[activeTestimonial].author}
                    </h5>
                    <p className={`text-xs sm:text-sm ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      {testimonials[activeTestimonial].role}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {testimonials.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTestimonial(idx)}
                      className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                        activeTestimonial === idx 
                          ? isLight 
                            ? "bg-cyan-500 w-6" 
                            : "bg-cyan-400 w-6" 
                          : isLight 
                          ? "bg-slate-200 hover:bg-slate-300"
                          : "bg-slate-800 hover:bg-slate-700"
                      }`}
                      aria-label="Toggle testimonial slide"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 5: SIGN UP FORM & BUSINESS ENGAGEMENT LINK */}
      <section 
        id="demo-form" 
        className={`rounded-3xl p-6 md:p-12 text-left max-w-[1600px] mx-auto shadow-2xl relative overflow-hidden border transition-all duration-300 ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border-slate-800"
        }`}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.06),transparent_60%)] pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* Left Column: Inspiring Image of Happy Trainees/Consultants Mastering Booking */}
          <div className="md:col-span-5 space-y-4">
            <div className="relative h-64 md:h-[380px] rounded-2xl overflow-hidden border dark:border-slate-800 shadow-md group">
              <img 
                src="/src/assets/images/regenerated_image_1780051448599.png" 
                alt="Happy travel agency team high-fiving and smiling together" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top scale-100 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent"></div>
              
              <div className="absolute bottom-4 left-4 right-4 animate-pulse">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white font-sans text-xs font-black tracking-wider px-2 py-0.5 rounded uppercase mb-2">
                  ✓ EXCELLENT TEAM
                </span>
                <p className="text-white text-sm sm:text-base font-bold leading-normal">
                  "Learning these systems used to feel like rocket science. Now our teams are picking it up with real smiles and confidence!"
                </p>
                <p className="text-slate-300 text-xs mt-1 font-bold">
                  — Support Staff Manager
                </p>
              </div>
            </div>
            
            <p className={`text-sm text-center italic font-bold ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Watch your new hires shine and build a great career in travel.
            </p>
          </div>

          {/* Right Column: The Simple Form & Beautiful Copywriting */}
          <div className="md:col-span-7 space-y-6">
            <div className="space-y-3">
              <span className={`text-xs sm:text-sm font-black tracking-widest uppercase font-sans ${isLight ? "text-cyan-600" : "text-cyan-400"}`}>TRY IT FOR FREE</span>
              <h2 className={`text-3xl md:text-4xl lg:text-5xl font-sans font-black uppercase tracking-tight leading-tight ${isLight ? "text-slate-800" : "text-white"}`}>
                Try Orbit Desk <span className="text-cyan-600">With Your Team</span>
              </h2>
              <p className={`text-base sm:text-lg leading-relaxed font-light ${isLight ? "text-slate-600 font-sans" : "text-slate-350"}`}>
                Ready to see how fast your teams can learn booking systems side-by-side? Enter your details below, and we will send you your custom trial link to share with them immediately.
              </p>
            </div>

            {/* Input Form Card */}
            <div className={`p-6 sm:p-8 rounded-2xl text-left shadow-lg border ${
              isLight ? "bg-white border-slate-200" : "bg-slate-900/40 backdrop-blur-md border-slate-800/80"
            }`}>
              {demoStep === "idle" && (
                <form onSubmit={handleDemoSubmit} className="space-y-5">
                  
                  <div className="space-y-2">
                    <label className={`text-xs sm:text-sm font-black uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-300"}`}>Your Travel Agency Name</label>
                    <input 
                      type="text" 
                      required={!isIndividualTrainee}
                      disabled={isIndividualTrainee}
                      value={isIndividualTrainee ? "Independent Trainee" : agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g. Flight Network Ltd"
                      className={`w-full focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/25 rounded-xl px-4 py-4 text-sm placeholder:text-slate-450 placeholder:text-slate-400 font-sans shadow-inner border transition-all ${
                        isIndividualTrainee
                          ? (isLight ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-60" : "bg-slate-900 border-slate-800/80 text-slate-500 cursor-not-allowed opacity-60")
                          : (isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-slate-950 border-slate-800 text-white")
                      }`}
                    />
                  </div>

                  {/* Tick Box to bypass Agency Name for Independent Learners */}
                  <div className="flex items-start gap-2.5 pt-1 pb-2">
                    <input 
                      type="checkbox" 
                      id="individual-learner-checkbox"
                      checked={isIndividualTrainee}
                      onChange={(e) => {
                        setIsIndividualTrainee(e.target.checked);
                        if (e.target.checked) {
                          setAgencyName("");
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-550 cursor-pointer"
                    />
                    <label htmlFor="individual-learner-checkbox" className={`text-xs font-semibold cursor-pointer leading-normal select-none ${isLight ? "text-slate-600 hover:text-slate-800" : "text-slate-400 hover:text-slate-200"}`}>
                      I am looking to train to get involved in the industry (No travel agency affiliation)
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-xs sm:text-sm font-black uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-300"}`}>Work Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="e.g. team@flightnetwork.com"
                      className={`w-full focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/25 rounded-xl px-4 py-4 text-sm placeholder:text-slate-455 placeholder:text-slate-400 font-sans shadow-inner border transition-all ${
                        isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-slate-950 border-slate-800 text-white"
                      }`}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm sm:text-base py-4.5 rounded-xl transition-all duration-300 cursor-pointer shadow-xl hover:shadow-cyan-400/25 uppercase tracking-widest select-none text-center"
                  >
                    Send Me the Free Trial Link
                  </motion.button>

                  {onNavigateToTab && (
                    <div className="text-center pt-3 border-t border-slate-100 dark:border-slate-800">
                      <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        Scaling structured training cycles?{" "}
                        <button
                          type="button"
                          id="cta-navigate-pricing"
                          onClick={() => onNavigateToTab("pricing")}
                          className="text-cyan-500 hover:text-cyan-600 font-bold underline transition-all cursor-pointer bg-transparent border-none p-0 inline"
                        >
                          View Workstation Plans & Pricing &rarr;
                        </button>
                      </p>
                    </div>
                  )}

                </form>
              )}

              {demoStep === "submitting" && (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-semibold tracking-wide">Setting up your team trial account...</p>
                </div>
              )}

              {demoStep === "success" && (
                <div className={`p-6 rounded-xl border text-left space-y-4 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-teal-500/20"
                }`}>
                  <div className={`flex items-center gap-3 border-b pb-3 ${isLight ? "text-emerald-600 border-slate-200" : "text-teal-400 border-slate-900"}`}>
                    <ShieldCheck className="w-6 h-6 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider">Trial Link Ready!</span>
                  </div>
                  
                  <div className={`text-xs sm:text-sm leading-relaxed space-y-2 font-light ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                    <p>Great! We have registered <strong className={isLight ? "text-slate-900 font-bold" : "text-white"}>{agencyName}</strong> and set up your team playground.</p>
                    <p>We just emailed the starter instructions and custom training link directly to <strong className={isLight ? "text-slate-900 font-bold" : "text-white"}>{emailAddress}</strong>.</p>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setDemoStep("idle");
                        setEmailAddress("");
                        setAgencyName("");
                        setIsIndividualTrainee(false);
                      }}
                      className={`text-xs underline cursor-pointer ${isLight ? "text-slate-500 hover:text-slate-800" : "text-slate-500 hover:text-slate-300"}`}
                    >
                      Send another request
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Security indicators */}
        <div className="flex justify-center flex-wrap gap-6 pt-6 text-xs text-slate-500 border-t border-slate-200/50 dark:border-slate-900">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-cyan-400" /> Secure Agency Protection
          </span>
          <span className="flex items-center gap-2">
            <Award className="w-4.5 h-4.5 text-cyan-400" /> Easy & Friendly Safe Exercises
          </span>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`border-t pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-505 text-slate-500 text-left ${
        isLight ? "border-slate-200" : "border-slate-900"
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Orbit Desk Operations Platform Suite</span>
        </div>
        <div>
          <p>© 2026 Orbit Desk Inc. Next-generation flight routing, GDS sandboxes & simulation environments.</p>
        </div>
      </footer>

      {/* Cookie Consent Backdrop Blur Overlay & Card */}
      <AnimatePresence>
        {!cookieChoice && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 left-6 md:left-auto z-50 md:max-w-md w-auto"
          >
            <div className={`p-5 sm:p-6 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.22)] border backdrop-blur-md transition-all ${
              isLight 
                ? "bg-white/95 border-slate-200 text-slate-800"
                : "bg-slate-950/95 border-slate-800 text-slate-100"
            }`}>
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                  <ShieldCheck className="w-6 h-6 shrink-0" />
                </div>
                
                <div className="flex-1 space-y-1.5 text-left">
                  <h4 className="text-sm font-black uppercase tracking-wider text-cyan-500">Cookie & GDPR Consent</h4>
                  <p className={`text-xs leading-relaxed font-light ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                    OrbitDesk utilizes subtle sandbox preference markers to maintain cryptic compiler sessions, track test performance scores, and optimize screen responsiveness.
                  </p>
                </div>
              </div>

              <AnimatePresence>
                {isCookieDetailsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-4 pt-4 border-t space-y-3 text-left overflow-hidden ${isLight ? "border-slate-150 border-slate-100" : "border-slate-900"}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manage Sandbox Policies</p>
                    
                    {/* Category 1: Strictly Necessary */}
                    <div className={`flex items-start justify-between p-2.5 rounded-xl border ${isLight ? "bg-slate-50/50 border-slate-100" : "bg-slate-900/30 border-slate-800/80"}`}>
                      <div className="space-y-0.5 max-w-[80%]">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>Essential GDS Sync</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-200/80 text-slate-700 dark:bg-slate-900 dark:text-slate-400 uppercase tracking-widest">Required</span>
                        </div>
                        <p className="text-[10px] text-slate-450 text-slate-500 leading-normal font-light">Coordinates live booking segments, mock airline inventory grids, and back-office assessments dynamically.</p>
                      </div>
                      <div className="shrink-0 pt-0.5">
                        <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider">Always On</span>
                      </div>
                    </div>

                    {/* Category 2: Performance Telemetry */}
                    <div className={`flex items-start justify-between p-2.5 rounded-xl border ${isLight ? "bg-slate-50/50 border-slate-100" : "bg-slate-900/30 border-slate-805 border-slate-800"}`}>
                      <div className="space-y-0.5 max-w-[80%]">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>Latency & Diagnostic Metrics</span>
                        </div>
                        <p className="text-[10px] text-slate-450 text-slate-500 leading-normal font-light">Supports capturing training runtimes, keystroke accuracy patterns, and simulation score graphs to provide granular assessment reporting.</p>
                      </div>
                      <div className="shrink-0 pt-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={cookiePreferences.analytics} 
                            onChange={(e) => setCookiePreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                            className="sr-only peer" 
                          />
                          <div className={`w-8 h-4 rounded-full transition-all peer-focus:outline-none relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 ${
                            isLight ? "bg-slate-200 peer-checked:bg-cyan-500" : "bg-slate-800 peer-checked:bg-cyan-500"
                          }`}></div>
                        </label>
                      </div>
                    </div>

                    {/* Category 3: Sandbox Customization */}
                    <div className={`flex items-start justify-between p-2.5 rounded-xl border ${isLight ? "bg-slate-50/50 border-slate-100" : "bg-slate-900/30 border-slate-800"}`}>
                      <div className="space-y-0.5 max-w-[80%]">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>Experience Preferences</span>
                        </div>
                        <p className="text-[10px] text-slate-450 text-slate-500 leading-normal font-light">Remembers active layouts, sidebar scales, route presets, and theme custom parameters between tests.</p>
                      </div>
                      <div className="shrink-0 pt-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={cookiePreferences.functional} 
                            onChange={(e) => setCookiePreferences(prev => ({ ...prev, functional: e.target.checked }))}
                            className="sr-only peer" 
                          />
                          <div className={`w-8 h-4 rounded-full transition-all peer-focus:outline-none relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 ${
                            isLight ? "bg-slate-200 peer-checked:bg-cyan-500" : "bg-slate-800 peer-checked:bg-cyan-500"
                          }`}></div>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5 flex flex-wrap gap-2 justify-end text-[11px] font-black uppercase tracking-wider">
                <button
                  onClick={() => setIsCookieDetailsOpen(!isCookieDetailsOpen)}
                  className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                    isLight 
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" 
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  {isCookieDetailsOpen ? "Hide Settings" : "Preferences"}
                </button>

                <button
                  onClick={() => handleSaveCookieConsent(false)}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                    isLight 
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Decline Optional
                </button>

                <button
                  onClick={() => handleSaveCookieConsent(true)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-sm hover:shadow-cyan-400/25 transition-all cursor-pointer"
                >
                  Accept All
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
