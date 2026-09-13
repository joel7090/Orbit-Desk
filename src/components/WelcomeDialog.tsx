import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Terminal, 
  Award, 
  HelpCircle, 
  CheckCircle, 
  Lock, 
  ShieldCheck, 
  ChevronRight, 
  Zap,
  Check,
  FileText
} from "lucide-react";

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  type: "simulator" | "assessment";
  theme?: "light" | "dark";
}

export default function WelcomeDialog({ isOpen, onClose, userEmail, type, theme = "light" }: WelcomeDialogProps) {
  const isLight = theme === "light";
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Read stored preference
  useEffect(() => {
    if (isOpen) {
      setDontShowAgain(false);
    }
  }, [isOpen, type]);

  const handleAccept = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(`orbitdesk_dismiss_welcome_${type}`, "true");
      } catch (err) {
        console.error("Local storage access failed", err);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const isSim = type === "simulator";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        {/* Backdrop overlay with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} // Allow clicking backdrop to dismiss as well
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`relative max-w-lg w-full rounded-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden text-left z-10 ${
            isLight 
              ? "bg-white border-slate-200 text-slate-800"
              : "bg-slate-950 border-slate-800 text-slate-100"
          }`}
        >
          {/* Header decorative accent line */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${isSim ? "from-cyan-400 to-indigo-500" : "from-indigo-500 to-violet-600"}`} />

          <div className="p-6 sm:p-8 space-y-6">
            {/* Header section with Icon */}
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 border ${
                isSim 
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-500" 
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-500"
              }`}>
                {isSim ? (
                  <Terminal className="w-6 h-6 animate-pulse" />
                ) : (
                  <Award className="w-6 h-6 text-indigo-500" />
                )}
              </div>

              <div className="space-y-1">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isSim ? "text-cyan-600" : "text-indigo-600"}`}>
                  OrbitDesk Workstation Gate
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                  Welcome back, <span className="text-indigo-600">{userEmail.split("@")[0]}</span>!
                </h3>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider truncate max-w-[280px]" title={userEmail}>
                  STATION MESH SYNCED &bull; {userEmail}
                </p>
              </div>
            </div>

            {/* Explanation Body */}
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-3 ${
              isLight ? "bg-slate-50/70 border-slate-100" : "bg-slate-900/30 border-slate-800/80"
            }`}>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> 
                {isSim ? "About Interactive Simulator" : "About Competency Assessment"}
              </h4>

              {isSim ? (
                <div className="space-y-2 text-slate-600 font-light">
                  <p>
                    You are entering the **Interactive OrbitDesk GDS Sandbox Terminal**. This environment simulates full cryptic host command lines for <strong className="font-semibold text-slate-800">Amadeus, Sabre, and Galileo</strong>.
                  </p>
                  <p>
                    You can check real-time flight schedules, request seat maps, create comprehensive traveler profiles (PNRs), and calculate ticketing fares dynamically.
                  </p>
                  <p className="text-[11px] text-indigo-600 font-normal">
                    ✓ <strong className="font-bold">Zero Host Risk:</strong> You are protected by our sandbox engine. No live airline transactions will ever be booked, and no debit memos can be issued.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-slate-600 font-light">
                  <p>
                    You are entering the **Amadeus Competency Assessment Module**. This is a structured evaluation simulator designed to measure your GDS efficiency.
                  </p>
                  <p>
                    The assessment will guide you through consecutive live booking challenges. It actively evaluates your command syntax, typing accuracy, error ratios, and workflow execution times.
                  </p>
                  <p className="text-[11px] text-indigo-600 font-normal">
                    ✓ <strong className="font-bold">Qualified Credentials:</strong> Completing all scenario tests logs a master scorecard in our Admin Back Office and earns you an OrbitDesk Readiness Certificate.
                  </p>
                </div>
              )}
            </div>

            {/* Do not show again checkbox */}
            <div className="flex items-center gap-2.5 pt-1">
              <label className="relative flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="dont-show-welcome-again"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0 ${
                  dontShowAgain 
                    ? "bg-indigo-600 border-indigo-600 text-white" 
                    : "border-slate-300 hover:border-slate-450 bg-white"
                }`}>
                  {dontShowAgain && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="ml-2 text-[11px] font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wide">
                  Do not show this introduction again
                </span>
              </label>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                id="welcome-dialog-accept-btn"
                onClick={handleAccept}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer text-xs uppercase tracking-wider shadow-md ${
                  isSim 
                    ? "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-cyan-400/10" 
                    : "bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-400/10"
                }`}
              >
                {isSim ? "Enter Sandbox Terminal" : "Start Qualification Exam"}
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
