import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Lock, 
  Mail, 
  Terminal, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Activity, 
  UserCheck 
} from "lucide-react";
import OrbitDeskLogo from "./OrbitDeskLogo";

interface LoginScreenProps {
  onLoginSuccess: (traineeEmail: string) => void;
  theme?: "light" | "dark";
}

export default function LoginScreen({ onLoginSuccess, theme = "light" }: LoginScreenProps) {
  const isLight = theme === "light";
  const [traineeEmail, setTraineeEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Suggested training credentials for demo / assessment
  const demoEmail = "trainee@orbitdesk.com";
  const demoPasscode = "ORBIT101";

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!traineeEmail.trim()) {
      setError("Please specify your registered Trainee Work Email.");
      return;
    }
    if (!passcode) {
      setError("Passcode is required to synchronize with active GDS server nodes.");
      return;
    }

    setIsLoading(true);

    // Simulate safe API authentication delay
    setTimeout(() => {
      setIsLoading(false);
      // Let's accept both the suggested demo credentials AND any input to keep it super flexible
      onLoginSuccess(traineeEmail);
    }, 800);
  };

  const handleInstantBypass = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess("demo.agent@orbitdesk.travel");
    }, 200);
  };

  return (
    <div className={`w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch animate-fade-in ${
      isLight ? "text-slate-800" : "text-slate-100"
    }`}>
      
      {/* LEFT COLUMN: Salesy / Value Proposition Panel (5 cols) */}
      <div className={`md:col-span-5 rounded-3xl p-6 sm:p-8 flex flex-col justify-between border relative overflow-hidden text-left bg-gradient-to-b ${
        isLight 
          ? "from-slate-900 via-slate-950 to-slate-950 text-white border-slate-800" 
          : "from-slate-950 via-slate-950 to-slate-900 text-white border-slate-800"
      }`}>
        {/* Subtle background cosmic mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-2">
            <OrbitDeskLogo className="w-10 h-10 shrink-0" showText={false} theme="dark" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-cyan-400">OrbitDesk</span>
              <span className="text-[10px] text-slate-450 text-slate-400 font-mono">Trainee Gateway</span>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-[#00f3ff] bg-cyan-400/10 border border-cyan-400/20 inline-block">
              Host Immunity Engaged
            </span>
            <h3 className="text-2xl font-black leading-tight tracking-tight text-white">
              Risk-Free GDS Hands-On Training
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Trainees perform active airline booking flows, cabin space sales, and complex tax pricing in a safe sandbox, without booking costly live debit memos.
            </p>
          </div>

          {/* Core Perks Checklist */}
          <div className="space-y-3.5 pt-6 border-t border-slate-800/80 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-cyan-400/10 text-[#00f3ff] shrink-0">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-200">Autonomous GDS Emulation</p>
                <p className="text-[10px] text-slate-400 font-light leading-normal">Simulated Sabre, Amadeus, and Galileo cryptic host servers active.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-indigo-400/10 text-indigo-400 shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-200">Admin Telemetry Capture</p>
                <p className="text-[10px] text-slate-400 font-light leading-normal">Tracks syntax error ratios, completion metrics, and keystroke logs.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-200">Qualifying Assessments</p>
                <p className="text-[10px] text-slate-400 font-light leading-normal">Unlocks certified competency badges upon assessment completion.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer corporate notice */}
        <p className="text-[9px] text-slate-550 text-slate-500 font-mono pt-8 relative z-10">
          OrbitDesk Terminal Cloud &bull; Version 4.2.1-SECURE
        </p>
      </div>

      {/* RIGHT COLUMN: Interactive Login Form & Testing Bypass (7 cols) */}
      <div className={`md:col-span-7 rounded-3xl p-6 sm:p-8 border shadow-xl flex flex-col justify-between text-left ${
        isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
      }`}>
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Sign In To Proceed
            </h2>
            <p className="text-xs text-slate-500 font-light">
              Trainee authentication is required to record simulator training metrics and assessment points.
            </p>
          </div>

          {/* Quick Info Alerts */}
          <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5 text-[11px] text-amber-700 leading-normal">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Testing Guidelines:</span> Use any email to sign in, or click the <span className="font-bold">Instant Bypass</span> button below to bypass login instantly.
            </div>
          </div>

          <form onSubmit={handleFormLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold text-xs">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1">
              <label htmlFor="traineeEmail" className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-400" /> Trainee Work Email
              </label>
              <input
                type="email"
                id="traineeEmail"
                value={traineeEmail}
                onChange={(e) => setTraineeEmail(e.target.value)}
                placeholder="e.g. anna.smith@orbitdesk.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm font-semibold text-slate-800 bg-white"
              />
            </div>

            {/* Passcode Input */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="passcode" className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Passcode / PIN
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTraineeEmail(demoEmail);
                    setPasscode(demoPasscode);
                  }}
                  className="text-[10px] text-cyan-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Auto-fill Demo Credentials
                </button>
              </div>
              <input
                type="password"
                id="passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="e.g. ORBIT101"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm font-semibold text-slate-800 bg-white"
              />
              <p className="text-[10px] text-slate-400 font-mono">
                Hint: standard sandbox entry code is <span className="font-bold text-slate-600 bg-slate-100 px-1 rounded">ORBIT101</span>
              </p>
            </div>

            {/* Standard Submit Button */}
            <button
              type="submit"
              id="trainee-login-submit-btn"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl font-black bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-widest shadow-md"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                  Securing Connection...
                </span>
              ) : (
                <>
                  Verify Trainee Workstation <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* BYPASS BUTTONS FOR SEAMLESS TESTING */}
        <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between text-[10px] uppercase font-black text-slate-400 tracking-wider">
            <span>QA Testing / Live Demo Bypass</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold font-mono">DEBUG</span>
          </div>

          <button
            type="button"
            id="qa-testing-bypass-btn"
            onClick={handleInstantBypass}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-widest shadow-md hover:shadow-amber-400/20"
          >
            <UserCheck className="w-4 h-4 text-slate-900 shrink-0" />
            Instant Testing Bypass (Login Free)
          </button>
        </div>
      </div>

    </div>
  );
}
