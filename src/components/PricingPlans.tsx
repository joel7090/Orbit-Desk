import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Check, 
  ChevronDown, 
  HelpCircle, 
  Mail, 
  Phone, 
  Building, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Zap,
  DollarSign,
  TrendingUp,
  Award,
  BookOpen
} from "lucide-react";

interface PricingPlansProps {
  theme?: "light" | "dark";
}

export default function PricingPlans({ theme = "light" }: PricingPlansProps) {
  const isLight = theme === "light";

  // Interactive user count state
  const [traineeCount, setTraineeCount] = useState<number>(12);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    workEmail: "",
    companyName: "",
    selectedGds: "amadeus",
    userGroupSize: "10-50",
    message: ""
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FAQ states
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);

  // Core Math for custom pricing calculator
  const calculatePricingDetails = (count: number) => {
    let basePricePerUser = 49; // monthly standard
    if (count >= 101) {
      basePricePerUser = 19;
    } else if (count >= 51) {
      basePricePerUser = 24;
    } else if (count >= 21) {
      basePricePerUser = 29;
    } else if (count >= 6) {
      basePricePerUser = 39;
    }

    // Annual discount is 20%
    const cycleDiscountFactor = billingCycle === "annual" ? 0.8 : 1.0;
    const finalPrice = Math.round(basePricePerUser * cycleDiscountFactor);
    const totalMonthly = count * finalPrice;
    const totalAnnual = totalMonthly * 12;
    const originalPrice = basePricePerUser * count;
    const rawSavings = originalPrice * count * (billingCycle === "annual" ? 0.2 : 0);

    return {
      pricePerUser: finalPrice,
      totalMonthly,
      totalAnnual,
      originalPricePerUser: basePricePerUser,
      savingsAmount: billingCycle === "annual" ? Math.round(originalPrice * 0.2 * count) : 0,
      tierName: count <= 5 ? "Starter Group" : count <= 20 ? "Professional Team" : count <= 100 ? "Agency Scale" : "Airline Enterprise"
    };
  };

  const calc = calculatePricingDetails(traineeCount);

  // Submit Handler for contact form
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API request
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSubmitted(true);
    }, 900);
  };

  const handleResetForm = () => {
    setFormData({
      fullName: "",
      workEmail: "",
      companyName: "",
      selectedGds: "amadeus",
      userGroupSize: "10-50",
      message: ""
    });
    setFormSubmitted(false);
  };

  const faqData = [
    {
      id: 1,
      q: "Does our live GDS sandbox require active subscription credentials from Amadeus or Sabre?",
      a: "Absolutely not. OrbitDesk features our proprietary autonomous emulator engine, compiled with deep syntax schemas for active parsing. You gain full sandbox immunity without contracting expensive developers, API gateways, or triggering high-liability test records on production host inventories."
    },
    {
      id: 2,
      q: "What training metrics and scores does the Admin Telemetry Back Office track?",
      a: "Our diagnostic reports monitor exact typing cadence, syntax accuracy, error-to-success ratios, total completion runtimes, and GDS specific workflow flows. Admins can create custom overruling command rules to simulate specialized travel agency inventories instantly."
    },
    {
      id: 3,
      q: "Can we downgrade, upgrade, or alter the workstation counts dynamically?",
      a: "Yes. Our pro-rata billing dashboard allows managers to scale training workstations seamlessly as batches of new recruits complete their qualifying courses or enter seasonal rotations."
    },
    {
      id: 4,
      q: "Are custom agency layouts and legacy terminal custom rules persistent?",
      a: "Yes. Custom GDS behaviors and command responses created in the Admin panel persist securely in Cloud Back Office databases, ensuring high-fidelity, customized simulation workflows across all agent workstations."
    }
  ];

  return (
    <div className={`space-y-16 animate-fade-in ${
      isLight ? "text-slate-800" : "text-slate-100"
    }`}>
      
      {/* 1. HERO HEADER (SALESY & ELITE) */}
      <div className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-cyan-500/5 border-cyan-500/20 text-cyan-600 text-xs font-black uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-spin" /> OrbitDesk Elite Enterprise Training
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-slate-900">
          Supercharge Trainee <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">GDS Competency</span> With Zero Host Risk
        </h1>

        <p className={`text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto ${isLight ? "text-slate-600" : "text-slate-300"}`}>
          Stop practicing on high-liability airline records. OrbitDesk delivers safe, immersive, interactive terminal emulations paired with comprehensive manager telemetry dashboards.
        </p>

        {/* Annual / Monthly Toggle */}
        <div className="flex justify-center pt-2">
          <div className="bg-slate-100 border border-slate-200 p-1 rounded-2xl flex items-center shadow-inner">
            <button
              type="button"
              id="billing-cycle-monthly"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                billingCycle === "monthly" 
                  ? "bg-white text-slate-900 shadow-md font-bold" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Monthly Base
            </button>
            <button
              type="button"
              id="billing-cycle-annual"
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === "annual" 
                  ? "bg-cyan-500 text-white shadow-md font-bold" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Annual Saver <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black shrink-0">SAVE 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC WORKSTATION PLAN CALCULATOR */}
      <section id="interactive-pricing-calculator" className={`p-6 md:p-8 rounded-3xl border shadow-xl ${
        isLight ? "bg-white border-slate-200/80" : "bg-slate-950/80 border-slate-800"
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Slider Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-black tracking-widest text-cyan-600 uppercase">Interactive Seat Planner</span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">How many trainees are you scaling?</h2>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Drag the interactive meter to align correct workstation licenses with active class size requirements.
              </p>
            </div>

            {/* Slider Input widget */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Trainee Workstations</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="calculator-trainee-input"
                    value={traineeCount}
                    onChange={(e) => setTraineeCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                    className="w-20 px-2 py-1 text-center font-bold text-slate-800 rounded-lg border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm"
                  />
                  <span className="text-xs text-slate-400 font-mono">seats</span>
                </div>
              </div>

              <div className="relative">
                <input
                  type="range"
                  id="calculator-trainee-slider"
                  min="1"
                  max="150"
                  value={traineeCount}
                  onChange={(e) => setTraineeCount(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                />
                
                {/* Visual Scale Helpers */}
                <div className="flex justify-between text-[10px] text-slate-400 font-bold pt-1 uppercase">
                  <span>1 Seat</span>
                  <span>15 Team</span>
                  <span>50 Scale</span>
                  <span>100 Enterprise</span>
                  <span>150 Max</span>
                </div>
              </div>
            </div>

            {/* Volume Tier Perks based on selection */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
              isLight ? "bg-slate-50 border-slate-100" : "bg-slate-900/30 border-slate-800"
            }`}>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Award className="w-5 h-5 shrink-0" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase text-indigo-600 shrink-0 tracking-wider">
                  Tier Highlight: {calc.tierName}
                </p>
                <p className="text-xs text-slate-500 leading-normal font-light">
                  {traineeCount <= 5 ? (
                    "Perfect for solo travel instructors or boutique startup desks requiring high-fidelity Amadeus parsing instantly."
                  ) : traineeCount <= 20 ? (
                    "Unlock custom admin rules, allowing you to intercept trainee keystrokes and force specific sandbox outputs dynamically."
                  ) : traineeCount <= 100 ? (
                    "Enterprise rate applied. Get customized GDS layouts, dedicated SLA backing, and master progress exports for audit cycles."
                  ) : (
                    "Comprehensive host API synchronization, unlimited custom mock inventory sets, and private cloud options."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 relative overflow-hidden border border-slate-800 shadow-lg text-left">
              
              {/* Background ambient neon flare */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-6">
                <div>
                  <span className="px-2 py-0.5 text-[9px] font-black tracking-widest text-[#00f3ff] bg-cyan-500/10 rounded-md uppercase">
                    ESTIMATED CONTRACT
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black font-mono text-cyan-400">${calc.pricePerUser}</span>
                    <span className="text-xs text-slate-400 font-mono">/ user / mo</span>
                  </div>
                  {billingCycle === "annual" && (
                    <p className="text-[10px] text-emerald-400 font-bold mt-1">
                      Billed Annually &bull; Saving ${calc.savingsAmount} every year
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Trainees</span>
                    <span className="text-slate-200 font-bold">{traineeCount} Workstations</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Run-rate</span>
                    <span className="text-slate-200 font-bold">${calc.totalMonthly.toLocaleString()} / mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Annual Billing</span>
                    <span className="text-cyan-400 font-black">${calc.totalAnnual.toLocaleString()} / yr</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <a
                    href="#rfp-contact-form"
                    className="w-full py-3 px-4 rounded-xl font-bold bg-[#00f3ff] text-slate-950 hover:bg-cyan-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs uppercase tracking-widest"
                  >
                    Lock In This Plan <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-[9px] text-slate-400 text-center font-light">
                    Guaranteed Sandbox Immunity &bull; Cancel or alter seats any time
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. SALESY PLAN CARDS Grid */}
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 font-mono">Fixed Flat rates</span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Structured GDS Training Tiers</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Choose the specific tier fitting your corporate structure, with fixed features scaling alongside.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* Card 1: Agent Solo */}
          <div className={`p-6 sm:p-8 rounded-2xl border flex flex-col justify-between text-left transition-all hover:translate-y-[-2px] ${
            isLight ? "bg-white border-slate-200" : "bg-slate-950/40 border-slate-800"
          }`}>
            <div className="space-y-6">
              <div>
                <span className="text-xs font-black uppercase text-indigo-500 tracking-wider">AGENT SOLO</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Individual Trainee</h3>
                <p className="text-xs text-slate-500 mt-2 font-light leading-relaxed">
                  Perfect for individual agents preparing for institutional certification or Amadeus qualify exams.
                </p>
              </div>

              <div className="flex items-baseline gap-1 py-1 border-y border-slate-100 my-4">
                <span className="text-2xl font-bold text-slate-800 font-mono">
                  ${billingCycle === "annual" ? "39" : "49"}
                </span>
                <span className="text-xs text-slate-500">/ workstation / mo</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Full GDS Simulator (Amadeus, Sabre, Galileo)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 10+ Interactive Class-A Assessments
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Gold Foil Qualification Credentials
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Personal Progress Sync Dashboard
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <a 
                href="#rfp-contact-form" 
                className={`w-full py-2.5 px-4 rounded-xl text-center text-xs font-bold block bg-slate-900 text-white hover:bg-slate-800 transition-all uppercase tracking-wider`}
              >
                Start Training Solo
              </a>
            </div>
          </div>

          {/* Card 2: Professional Team (Most Popular Highlighted) */}
          <div className="p-6 sm:p-8 rounded-2xl border-2 border-cyan-500 flex flex-col justify-between text-left relative transition-all hover:translate-y-[-2px] bg-white shadow-xl">
            <div className="absolute top-0 right-1/2 translate-x-1/2 translate-y-[-50%] bg-cyan-500 text-slate-950 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
              Most Popular Solution
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-black uppercase text-cyan-600 tracking-wider">TEAM PRO</span>
                <h3 className="text-xl font-black text-[#0c4a6e] mt-1">Boutique Agency</h3>
                <p className="text-xs text-slate-600 mt-2 font-light leading-relaxed">
                  Best for boutique travel agents or tour operators keeping desk latency high and GDS liability low.
                </p>
              </div>

              <div className="flex items-baseline gap-1 py-1 border-y border-slate-200 my-4">
                <span className="text-3xl font-black text-cyan-600 font-mono">
                  ${billingCycle === "annual" ? "29" : "39"}
                </span>
                <span className="text-xs text-slate-600 font-bold">/ user / mo</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> <strong className="font-bold">Everything inside Solo Plan</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Admin Back Office Intercept Dashboard
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Custom Command Overruling & Response rules
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Interactive Score telemetry reports
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Priority Support queue
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <a 
                href="#rfp-contact-form" 
                className="w-full py-2.5 px-4 rounded-xl text-center text-xs font-black block bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md hover:shadow-cyan-400/20 transition-all uppercase tracking-wider"
              >
                Secure Pro Seats
              </a>
            </div>
          </div>

          {/* Card 3: Airline & Agency Enterprise */}
          <div className={`p-6 sm:p-8 rounded-2xl border flex flex-col justify-between text-left transition-all hover:translate-y-[-2px] ${
            isLight ? "bg-white border-slate-200" : "bg-slate-950/40 border-slate-800"
          }`}>
            <div className="space-y-6">
              <div>
                <span className="text-xs font-black uppercase text-indigo-500 tracking-wider">ENTERPRISE</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Host & Airline Scope</h3>
                <p className="text-xs text-slate-500 mt-2 font-light leading-relaxed">
                  Engineered optimized for major consolidators, national carrier groups, and accredited tourism colleges.
                </p>
              </div>

              <div className="flex items-baseline gap-1 py-1 border-y border-slate-100 my-4">
                <span className="text-2xl font-bold text-slate-800 font-mono">Custom Quote</span>
                <span className="text-xs text-slate-500">&bull; Enterprise scale discounts</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> <strong className="font-bold">Unlimited workspaces & agents</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Custom Air/Hotel Mock inventory grids
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Private cloud database isolation options
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Automated PNR payload webhook notifications
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Dedicated Account Manager & custom SLA
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <a 
                href="#rfp-contact-form" 
                className="w-full py-2.5 px-4 rounded-xl text-center text-xs font-bold block bg-slate-900 text-white hover:bg-slate-800 transition-all uppercase tracking-wider"
              >
                Inquire Enterprise
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* 4. PROMINENT RFP / CONTACT SALES FORM */}
      <section id="rfp-contact-form" className="max-w-4xl mx-auto scroll-mt-24">
        <div className={`p-6 md:p-10 rounded-3xl border shadow-xl relative overflow-hidden text-left ${
          isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
        }`}>
          {/* Subtle design visuals */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 to-indigo-500" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 relative z-10">
            
            {/* Sales Text Left (5 cols) */}
            <div className="md:col-span-5 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-black tracking-widest text-cyan-600 uppercase font-mono">
                  Guaranteed Response within 6 hours
                </span>
                
                <h3 className="text-2xl font-black text-[#0c4a6e] tracking-tight leading-tight">
                  Reach out for Custom Workstation Quotes
                </h3>
                
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  OrbitDesk transforms standard travel training models. Get an instant, tailored pilot environment set up for your trainee intake batch.
                </p>
              </div>

              {/* Informative corporate contact list */}
              <div className="space-y-3 pt-6 border-t border-slate-100">
                <div id="contact-telephony" className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <Phone className="w-3.5 h-3.5 text-cyan-500 shrink-0" /> +1 (800) 555-0199
                </div>
                <div id="contact-email" className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> training@orbitdesk.com
                </div>
                <div id="contact-hq" className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <Building className="w-3.5 h-3.5 text-cyan-500 shrink-0" /> Enterprise Suite HQ, NYC
                </div>
              </div>

              {/* Trust Badge */}
              <div className={`p-3 rounded-xl border flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider ${
                isLight ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" : "bg-emerald-900/10 border-emerald-900/35 text-emerald-400"
              }`}>
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" /> GDPR compliant data storage & privacy sync
              </div>
            </div>

            {/* Interactive Form Right (7 cols) */}
            <div className="md:col-span-7">
              <AnimatePresence mode="wait">
                {!formSubmitted ? (
                  <motion.form 
                    key="pricing-contact-form"
                    onSubmit={handleContactSubmit}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name input */}
                      <div className="space-y-1">
                        <label htmlFor="fullName" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="fullName"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Captain Archer"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Work Email input */}
                      <div className="space-y-1">
                        <label htmlFor="workEmail" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Corporate Work Email
                        </label>
                        <input
                          type="email"
                          id="workEmail"
                          required
                          value={formData.workEmail}
                          onChange={(e) => setFormData(prev => ({ ...prev, workEmail: e.target.value }))}
                          placeholder="archer@starfleet.travel"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Company Name input */}
                      <div className="space-y-1">
                        <label htmlFor="companyName" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Agency / Carrier Name
                        </label>
                        <input
                          type="text"
                          id="companyName"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                          placeholder="Starfleet Travel Dept"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm font-semibold text-slate-800"
                        />
                      </div>

                      {/* Expected GDS Selection input */}
                      <div className="space-y-1">
                        <label htmlFor="selectedGds" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Focal GDS Simulator
                        </label>
                        <select
                          id="selectedGds"
                          value={formData.selectedGds}
                          onChange={(e) => setFormData(prev => ({ ...prev, selectedGds: e.target.value }))}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm font-bold text-slate-700 bg-white"
                        >
                          <option value="amadeus">Amadeus Altea / Cryptic</option>
                          <option value="sabre">Sabre Red Workspace</option>
                          <option value="galileo">Travelport Galileo Desktop</option>
                          <option value="multi">All Three (Hybrid Platform)</option>
                        </select>
                      </div>
                    </div>

                    {/* Workstations estimation dropdown */}
                    <div className="space-y-1">
                      <label htmlFor="userGroupSize" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        Estimated Training Workstations Needed
                      </label>
                      <select
                        id="userGroupSize"
                        value={formData.userGroupSize}
                        onChange={(e) => setFormData(prev => ({ ...prev, userGroupSize: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm font-bold text-slate-700 bg-white"
                      >
                        <option value="1-9">Solo to 9 users (Small Group)</option>
                        <option value="10-50">10 to 50 active trainees (Fast-growing desk)</option>
                        <option value="51-200">51 to 200 workstations (Major consolidator)</option>
                        <option value="200+">200+ corporate seats (Carrier training hubs)</option>
                      </select>
                    </div>

                    {/* Inquiry Textbox input */}
                    <div className="space-y-1">
                      <label htmlFor="message" className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        Tell us about your Trainee intake goals
                      </label>
                      <textarea
                        id="message"
                        rows={3}
                        value={formData.message}
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="We have a class of 18 students starting Sabre certification in July. We need to override custom validation and monitor testing logs..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 shadow-sm font-semibold text-slate-800"
                      />
                    </div>

                    {/* Submit Button with interactive indicator */}
                    <button
                      type="submit"
                      id="pricing-form-submit-btn"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-widest shadow-md"
                    >
                      {isSubmitting ? (
                        <>
                          <Zap className="w-3.5 h-3.5 animate-bounce text-cyan-500" /> Connecting to Enterprise Sales Hub...
                        </>
                      ) : (
                        <>
                          Request Demo Sandbox Environment <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="pricing-submit-completed"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full flex flex-col justify-center items-center text-center p-6 space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-black text-2xl border border-cyan-500/25">
                      ✓
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-slate-800 tracking-tight">RFP Proposal Registered Successfully!</h4>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Thank you, <strong className="font-bold text-slate-800">{formData.fullName}</strong>. One of our Senior Air GDS Training Architects is spinning up a customized test sandbox workspace for <span className="text-indigo-600 font-bold">{formData.companyName}</span> right now.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 text-left space-y-2 text-[11px] text-slate-600 max-w-md border border-slate-100 font-mono">
                      <div><span className="text-slate-450 text-slate-400">EMAIL TARGET:</span> {formData.workEmail}</div>
                      <div><span className="text-slate-450 text-slate-400">EXPECTED SIM:</span> {formData.selectedGds.toUpperCase()}</div>
                      <div><span className="text-slate-450 text-slate-400">ESTIMATED SEATS:</span> {formData.userGroupSize} workstations</div>
                    </div>

                    <button
                      type="button"
                      id="reset-rfp-form-btn"
                      onClick={handleResetForm}
                      className="px-4 py-2 rounded-xl text-xs font-black uppercase text-indigo-500 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Submit Another Query
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE COLLAPSIBLE FAQ ACCORDION */}
      <section id="pricing-faq-accordion" className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <HelpCircle className="w-8 h-8 mx-auto text-cyan-600" />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise & Pricing FAQ</h2>
          <p className="text-xs text-slate-500">
            Have questions about sandboxed workstations, active GDS compliance, or diagnostics logs?
          </p>
        </div>

        <div className="space-y-3 text-left">
          {faqData.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div 
                key={faq.id}
                className={`rounded-2xl border transition-all ${
                  isOpen 
                    ? "bg-slate-100/50 border-slate-300/80 shadow-sm" 
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <button
                  type="button"
                  id={`faq-toggle-${faq.id}`}
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between p-5 text-xs font-black uppercase tracking-wider text-slate-800 cursor-pointer select-none"
                >
                  <span className="hover:text-cyan-600 transition-colors pr-4">{faq.q}</span>
                  <div className={`p-1 rounded-lg shrink-0 transition-all ${isOpen ? "bg-slate-200 text-slate-800 rotate-180" : "bg-slate-50 text-slate-400"}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-600 font-light border-t ${
                        isLight ? "border-slate-100" : "border-slate-800"
                      }`}>
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
