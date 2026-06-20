import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Copy, Download, Check } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { RelatedTools } from "@/components/related-tools";
import ToolSeoContent from "@/components/tool-seo-content";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { tools } from "@/lib/tools";
import { toolBySlug } from "@/lib/seo";

import {
  calcCarLoan,
  calcExtraPaymentSavings,
  calcLoan,
  calcMortgage,
  formatCurrency,
  rowsToCsv,
} from "./amortization";
import type { AmortRow, CurrencyCode, LoanTab } from "./types";
import { CURRENCIES, RTL_CURRENCIES } from "./types";

/* ------------------------- i18n strings ------------------------- */

const STRINGS = {
  tabs: {
    personal: "Personal Loan",
    emi: "EMI Calculator",
    mortgage: "Mortgage",
    car: "Car Loan",
  },
  inputs: {
    loanAmount: "Loan Amount",
    vehiclePrice: "Vehicle Price",
    interestRate: "Annual Interest Rate",
    loanTerm: "Loan Term",
    downPayment: "Down Payment",
    tradeIn: "Trade-in Value",
    salesTax: "Sales Tax",
    propertyTax: "Property Tax (yearly)",
    insurance: "Home Insurance (yearly)",
    pmi: "PMI rate (% of loan/yr)",
    currency: "Currency",
    months: "Months",
    years: "Years",
    advanced: "Advanced options",
    frequency: "Payment Frequency",
    monthly: "Monthly",
    biweekly: "Bi-weekly",
    weekly: "Weekly",
  },
  results: {
    monthlyPayment: "Monthly Payment",
    totalInterest: "Total Interest",
    totalCost: "Total Cost",
    piti: "Total Monthly (PITI)",
    copy: "Copy summary",
    copied: "Copied!",
  },
  amortization: {
    title: "Full Payment Schedule",
    month: "Month",
    payment: "Payment",
    principal: "Principal",
    interest: "Interest",
    balance: "Remaining Balance",
    download: "Download CSV",
    showAll: "Show all payments",
    showLess: "Show fewer",
  },
  insight: {
    label: "Extra monthly payment",
    headline: "💡 Pay extra and save",
    prefix: "If you pay an extra",
    middle: "per month, you save",
    inInterest: "in interest and pay off",
    suffix: "months early.",
    none: "Enter an extra amount to see how much interest you'd save.",
  },
  errors: {
    invalid: "Please enter valid amount, rate and term.",
    highRate: "Unusually high interest rate.",
  },
  disclaimer:
    "Results are estimates for informational purposes only. Consult a financial advisor for personalised advice.",
  charts: {
    breakdown: "Cost Breakdown",
    overTime: "Balance & Interest Over Time",
    principal: "Principal",
    interest: "Interest",
    balance: "Remaining Balance",
    cumInterest: "Cumulative Interest",
  },
};

/* ------------------------- Tab metadata ------------------------- */

const TAB_META: Record<LoanTab, { label: string; icon: string; accent: string; example: TabState }> = {
  personal: {
    label: STRINGS.tabs.personal,
    icon: "💳",
    accent: "#06b6d4",
    example: {
      amount: 10000,
      rate: 8.5,
      months: 36,
      currency: "USD",
      frequency: "monthly",
      extra: 0,
      downPayment: 0,
      tradeIn: 0,
      salesTax: 0,
      propertyTax: 0,
      insurance: 0,
      pmiRate: 0.5,
    },
  },
  emi: {
    label: STRINGS.tabs.emi,
    icon: "📱",
    accent: "#7c3aed",
    example: {
      amount: 5000,
      rate: 12,
      months: 24,
      currency: "USD",
      frequency: "monthly",
      extra: 0,
      downPayment: 0,
      tradeIn: 0,
      salesTax: 0,
      propertyTax: 0,
      insurance: 0,
      pmiRate: 0.5,
    },
  },
  mortgage: {
    label: STRINGS.tabs.mortgage,
    icon: "🏠",
    accent: "#10b981",
    example: {
      amount: 300000,
      rate: 6.5,
      months: 360,
      currency: "USD",
      frequency: "monthly",
      extra: 0,
      downPayment: 60000,
      tradeIn: 0,
      salesTax: 0,
      propertyTax: 3600,
      insurance: 1200,
      pmiRate: 0.5,
    },
  },
  car: {
    label: STRINGS.tabs.car,
    icon: "🚗",
    accent: "#f59e0b",
    example: {
      amount: 25000,
      rate: 5.9,
      months: 60,
      currency: "USD",
      frequency: "monthly",
      extra: 0,
      downPayment: 3000,
      tradeIn: 0,
      salesTax: 7,
      propertyTax: 0,
      insurance: 0,
      pmiRate: 0,
    },
  },
};

/* ------------------------- SEO content ------------------------- */

const SEO_CONTENT: Record<
  LoanTab,
  { title: string; description: string; body: string[]; faqs: { question: string; answer: string }[] }
> = {
  personal: {
    title: "Free Loan Calculator — Monthly Payment, Total Interest & Amortization",
    description:
      "Calculate your monthly loan payment, total interest and full amortization schedule instantly. Supports personal loans, mortgages, car loans and EMI. Free, no signup.",
    body: [
      "A loan calculator helps you understand the true cost of borrowing before you sign any agreement. Enter the loan amount, annual interest rate and repayment term — Skycally's calculator instantly shows your monthly payment, the total interest you'll pay over the life of the loan, and the complete amortization schedule month by month.",
      "The monthly payment formula (also called PMT or EMI) is: M = P × r(1+r)^n / ((1+r)^n − 1), where P is the principal, r is the monthly interest rate (annual rate ÷ 12), and n is the number of months. This formula ensures each payment covers the month's interest first, then reduces the principal — which is why early payments in a long loan are mostly interest.",
      "Use the 'Extra Payment' feature to see how much interest you save by paying more each month. Even $50–$100 extra per month on a long-term loan can save thousands in interest and cut years off the repayment period — a feature most online calculators don't show you.",
    ],
    faqs: [
      {
        question: "How is the monthly loan payment calculated?",
        answer:
          "Using the standard PMT formula: M = P × r(1+r)^n / ((1+r)^n − 1), where P = principal, r = monthly interest rate (annual rate ÷ 12), and n = number of months. If the interest rate is 0%, the payment is simply the principal divided by the number of months.",
      },
      {
        question: "What is an amortization schedule?",
        answer:
          "A month-by-month breakdown showing how much of each payment goes toward interest and how much reduces the principal balance. In early payments, most of the payment is interest. Over time, the interest portion shrinks and the principal portion grows.",
      },
      {
        question: "How can I reduce the total interest I pay?",
        answer:
          "Three ways: 1) Negotiate a lower interest rate, 2) Shorten the loan term, 3) Make extra payments toward the principal each month. The 'Extra Payment' calculator above shows exactly how much you save with each extra dollar paid.",
      },
      {
        question: "What is a good interest rate for a personal loan?",
        answer:
          "Personal loan rates typically range from 5% to 36% depending on your credit score, income, and lender. A rate below 10% is generally considered good. Compare multiple lenders before accepting any offer.",
      },
      {
        question: "What is the difference between APR and interest rate?",
        answer:
          "The interest rate is the cost of borrowing the principal. APR (Annual Percentage Rate) includes the interest rate plus fees (origination fee, closing costs, etc.), making it the true annual cost of the loan. Always compare APRs when shopping for loans.",
      },
      {
        question: "Does this calculator store my financial data?",
        answer:
          "No. All calculations run locally in your browser using JavaScript. Your loan amount, rate, and other inputs are saved only in your browser's localStorage for convenience and never transmitted to any server.",
      },
      {
        question: "Can I download the amortization table?",
        answer:
          "Yes. Click 'Download CSV' under the payment schedule to download the full amortization table as a spreadsheet you can open in Excel, Google Sheets, or any CSV viewer.",
      },
      {
        question: "What currencies are supported?",
        answer:
          "USD, EUR, GBP, MAD, SAR, AED, INR, BRL, CAD and AUD. Select your currency from the dropdown — the symbol updates instantly and all outputs are formatted according to each currency's conventions.",
      },
    ],
  },
  emi: {
    title: "Free EMI Calculator — Equated Monthly Installment for Any Loan",
    description:
      "Calculate EMI (Equated Monthly Installment) for personal loans, home loans, and car loans instantly. See total interest, total payment and full repayment schedule. Free.",
    body: [
      "EMI stands for Equated Monthly Installment — the fixed monthly amount you pay to repay a loan within an agreed time period. Each EMI payment covers part of the principal and part of the interest, calculated so that the loan is fully paid off by the last payment. The EMI formula is identical to the standard PMT formula used globally, making this calculator equally useful worldwide.",
      "EMI calculators are most commonly used in South Asia (India, Pakistan, Sri Lanka) and the Middle East for home loans, personal loans, vehicle loans, and mobile phone purchase plans. The three variables that determine your EMI are the principal (P), the annual interest rate (R), and the number of monthly installments (N). Changing any one of these significantly affects the others.",
      "When planning a loan, use this calculator to work backwards: if you can afford a maximum monthly EMI of $500, adjust the principal and term until the calculated EMI fits your budget. The amortization table shows you exactly when the loan will be paid off and how much interest you'll pay in total.",
    ],
    faqs: [
      {
        question: "What is EMI?",
        answer:
          "EMI (Equated Monthly Installment) is a fixed monthly payment made to a lender to repay a loan. Each payment covers a portion of the loan principal and the interest accrued for that month, calculated so the loan is fully repaid by the final payment.",
      },
      {
        question: "What is the EMI formula?",
        answer:
          "EMI = P × r × (1+r)^n / ((1+r)^n − 1), where P = principal loan amount, r = monthly interest rate (annual rate ÷ 12 ÷ 100), and n = number of monthly installments. This is also known as the PMT (payment) formula in Excel.",
      },
      {
        question: "How can I reduce my EMI?",
        answer:
          "Three ways: 1) Reduce the loan amount by making a larger down payment, 2) Negotiate a lower interest rate (improve your credit score), 3) Increase the loan tenure — but note that a longer tenure means more total interest paid.",
      },
      {
        question: "Is a lower EMI always better?",
        answer:
          "Not necessarily. A lower EMI often comes from a longer loan tenure, which means you pay more total interest. A higher EMI over a shorter period costs less overall. Use this calculator to compare total interest paid across different tenure options.",
      },
      {
        question: "What is the difference between flat rate and reducing balance EMI?",
        answer:
          "Flat rate interest is calculated on the original principal throughout the tenure. Reducing balance interest is calculated on the outstanding principal each month, which decreases as you repay. Reducing balance is more favourable to the borrower and is the method used in this calculator.",
      },
      {
        question: "Can I prepay my EMI loan?",
        answer:
          "Most loans allow prepayment, but some charge a prepayment penalty. Use the 'Extra Payment' feature to see how making lump-sum or regular extra payments reduces the total interest and loan tenure.",
      },
      {
        question: "How many EMIs will I pay?",
        answer:
          "The number of EMIs equals the loan tenure in months. A 3-year loan = 36 EMIs, a 5-year loan = 60 EMIs, a 20-year home loan = 240 EMIs. The amortization schedule shows every single payment.",
      },
      {
        question: "Does the EMI change over time?",
        answer:
          "For fixed-rate loans, no — the EMI stays constant throughout the tenure. For floating-rate loans, the EMI (or the tenure) changes when the interest rate changes.",
      },
    ],
  },
  mortgage: {
    title: "Free Mortgage Calculator — Monthly Payment with Tax, Insurance & PMI",
    description:
      "Calculate your monthly mortgage payment including principal, interest, property tax, home insurance and PMI. Full amortization schedule. Free, instant, no signup.",
    body: [
      "A mortgage calculator helps you estimate your full monthly housing cost before you make an offer on a home. Beyond the principal and interest payment, homeowners typically pay property tax, home insurance, and — if their down payment is less than 20% — Private Mortgage Insurance (PMI). Skycally's mortgage calculator combines all four into a single monthly total (PITI: Principal, Interest, Tax, Insurance).",
      "The amortization chart shows a critical insight most buyers miss: in the early years of a 30-year mortgage, the majority of each payment goes to interest rather than building equity. At a 6.5% rate on a $300,000 loan, the first payment is $1,896 — but only $271 of that reduces the balance. This is why making even one extra principal payment per year can save tens of thousands of dollars and cut years off the loan.",
      "When comparing mortgage offers, look beyond the interest rate to the APR, which includes origination fees and points. A loan with a slightly lower rate but high fees may cost more over the full term than one with a slightly higher rate and no fees — especially if you plan to sell or refinance within 7–10 years.",
    ],
    faqs: [
      {
        question: "What does PITI mean?",
        answer:
          "PITI stands for Principal, Interest, Taxes, and Insurance — the four components of a full monthly mortgage payment. Lenders use PITI to calculate your debt-to-income ratio when approving your loan.",
      },
      {
        question: "What is PMI and when do I need it?",
        answer:
          "Private Mortgage Insurance is required when your down payment is less than 20% of the home's purchase price. It protects the lender if you default. PMI typically costs 0.5%–1.5% of the loan amount annually and can be cancelled once your equity reaches 20%.",
      },
      {
        question: "How much down payment do I need?",
        answer:
          "Conventional loans typically require 5–20%. FHA loans allow as low as 3.5%. VA and USDA loans may allow 0% down. A larger down payment reduces your monthly payment, eliminates PMI, and means you borrow less total.",
      },
      {
        question: "Should I choose a 15-year or 30-year mortgage?",
        answer:
          "A 15-year mortgage has higher monthly payments but you pay far less interest overall. A 30-year mortgage has lower monthly payments, giving more cash flow flexibility, but costs significantly more in interest over the life of the loan. Use this calculator to compare both scenarios.",
      },
      {
        question: "What is a good mortgage interest rate?",
        answer:
          "Mortgage rates change daily based on economic conditions. Historically, rates below 4% are very low, 4–6% is moderate, and above 7% is high by recent standards. Check current rates from multiple lenders on the same day for accurate comparison.",
      },
      {
        question: "How does extra payment reduce my mortgage?",
        answer:
          "Extra principal payments reduce the balance faster, which reduces the interest charged next month, which means more of future regular payments go to principal — a compounding snowball effect. Even $100/month extra on a $300,000 30-year mortgage can save over $30,000 in interest.",
      },
      {
        question: "What is the difference between fixed and variable rate mortgages?",
        answer:
          "A fixed-rate mortgage has the same interest rate for the entire loan term. A variable (adjustable) rate mortgage (ARM) starts with a lower rate that changes periodically based on a market index. This calculator assumes a fixed rate.",
      },
      {
        question: "Is my mortgage data sent to a server?",
        answer: "No. All calculations run in your browser. Nothing is uploaded or stored anywhere outside your device.",
      },
    ],
  },
  car: {
    title: "Free Car Loan Calculator — Monthly Payment with Tax & Trade-In",
    description:
      "Calculate your car loan monthly payment including sales tax, down payment and trade-in value. See total interest and full amortization. Free, instant, no signup.",
    body: [
      "A car loan calculator helps you estimate your actual monthly payment before visiting a dealership. Unlike a simple loan calculator, a car loan must account for sales tax on the vehicle price, your down payment, and the trade-in value of your current vehicle — all of which reduce (or increase) the amount you actually need to finance.",
      "Dealerships often focus the conversation on the monthly payment rather than the total cost, which can obscure how much you're actually paying. This calculator shows both: the monthly payment AND the total amount paid over the life of the loan, including all interest. A $350/month payment sounds affordable, but over 72 months it may mean paying $5,000–$8,000 in interest alone.",
      "When shopping for a car loan, compare offers from your bank or credit union before going to the dealership — dealer financing is often more expensive. A difference of even 1–2% in interest rate on a $25,000 loan over 5 years can save over $1,300. Use this calculator to compare offers side by side.",
    ],
    faqs: [
      {
        question: "How is a car loan calculated?",
        answer:
          "The financed amount = (vehicle price + sales tax) − down payment − trade-in value. The monthly payment is then calculated from this financed amount, the interest rate, and the loan term using the standard PMT formula.",
      },
      {
        question: "What is a typical car loan interest rate?",
        answer:
          "Auto loan rates vary by credit score and lender. For excellent credit (750+), rates of 4–6% are common. For good credit (700–749), expect 6–9%. For fair credit (650–699), 10–15%. For poor credit, rates can exceed 20%.",
      },
      {
        question: "How long should a car loan be?",
        answer:
          "48–60 months is common. Loans of 72 or 84 months lower the monthly payment but increase total interest paid significantly — and you may owe more than the car is worth (being 'underwater') for most of the loan.",
      },
      {
        question: "What is trade-in value?",
        answer:
          "The amount a dealership offers for your current car in exchange for a reduction in the price of your new car. Trade-in value reduces the amount you need to finance.",
      },
      {
        question: "How does sales tax affect my car loan?",
        answer:
          "In most regions, sales tax is applied to the vehicle purchase price before calculating the financed amount. This means you typically finance the tax amount along with the vehicle price, increasing both the loan amount and the total interest paid.",
      },
      {
        question: "Should I put money down on a car?",
        answer:
          "Yes, if possible. A larger down payment means you borrow less, pay less interest, and are less likely to go 'underwater' on the loan. A down payment of 10–20% of the vehicle price is generally recommended.",
      },
      {
        question: "Can I pay off a car loan early?",
        answer:
          "Most auto loans allow early payoff without penalty. Use the 'Extra Payment' feature to see how much interest you save by paying extra each month or making a lump-sum payment.",
      },
      {
        question: "Is the calculator free to use?",
        answer:
          "Completely free. No account, no signup, no data sent anywhere. All calculations run in your browser and inputs are saved locally for your convenience.",
      },
    ],
  },
};

/* ------------------------- State shape ------------------------- */

type Frequency = "monthly" | "biweekly" | "weekly";

interface TabState {
  amount: number;
  rate: number;
  months: number;
  currency: CurrencyCode;
  frequency: Frequency;
  extra: number;
  // mortgage / car
  downPayment: number;
  tradeIn: number;
  salesTax: number;
  propertyTax: number;
  insurance: number;
  pmiRate: number;
}

function loadState(tab: LoanTab): TabState {
  if (typeof window === "undefined") return TAB_META[tab].example;
  try {
    const raw = localStorage.getItem(`lc:state:${tab}`);
    if (!raw) return { ...TAB_META[tab].example };
    const parsed = JSON.parse(raw);
    return { ...TAB_META[tab].example, ...parsed };
  } catch {
    return { ...TAB_META[tab].example };
  }
}

function saveState(tab: LoanTab, s: TabState) {
  try {
    localStorage.setItem(`lc:state:${tab}`, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

/* ------------------------- Component ------------------------- */

export default function LoanCalculatorPage({ defaultTab, slug }: { defaultTab: LoanTab; slug: string }) {
  const tool = toolBySlug(slug, tools);
  const [tab, setTab] = useState<LoanTab>(defaultTab);
  const [state, setState] = useState<TabState>(() => loadState(defaultTab));
  const [termUnit, setTermUnit] = useState<"months" | "years">(() => {
    if (typeof window === "undefined") return "months";
    return (localStorage.getItem("lc:termUnit") as "months" | "years") || "months";
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isFirstMount = useRef(true);

  // On tab switch: reload that tab's state.
  useEffect(() => {
    setState(loadState(tab));
    setShowAllRows(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("lc:tab", tab);
    }
  }, [tab]);

  // Persist state changes.
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    saveState(tab, state);
  }, [tab, state]);

  // Persist currency globally too.
  useEffect(() => {
    try {
      localStorage.setItem("lc:currency", state.currency);
      localStorage.setItem("lc:termUnit", termUnit);
    } catch {
      /* noop */
    }
  }, [state.currency, termUnit]);

  const accent = TAB_META[tab].accent;
  const isRTL = RTL_CURRENCIES.includes(state.currency);

  /* ------- compute ------- */
  const principalForCalc = useMemo(() => {
    if (tab === "mortgage") return Math.max(0, state.amount - state.downPayment);
    return Math.max(0, state.amount);
  }, [tab, state.amount, state.downPayment]);

  const baseInvalid =
    state.amount <= 0 || state.months <= 0 || state.rate < 0 || !isFinite(state.amount) || !isFinite(state.rate);

  const result = useMemo(() => {
    if (baseInvalid) return null;
    if (tab === "mortgage") {
      const downPct = state.amount > 0 ? state.downPayment / state.amount : 0;
      return calcMortgage({
        principal: principalForCalc,
        annualRatePct: state.rate,
        months: state.months,
        downPayment: state.downPayment,
        propertyTaxYearly: state.propertyTax,
        insuranceYearly: state.insurance,
        pmiRatePct: state.pmiRate,
        applyPmi: downPct < 0.2 && state.pmiRate > 0,
      });
    }
    if (tab === "car") {
      return calcCarLoan({
        vehiclePrice: state.amount,
        annualRatePct: state.rate,
        months: state.months,
        downPayment: state.downPayment,
        tradeIn: state.tradeIn,
        salesTaxPct: state.salesTax,
      });
    }
    return calcLoan(principalForCalc, state.rate, state.months);
  }, [tab, state, principalForCalc, baseInvalid]);

  const savings = useMemo(() => {
    if (!result) return null;
    return calcExtraPaymentSavings(result.principal, state.rate, state.months, state.extra);
  }, [result, state.rate, state.months, state.extra]);

  /* ------- frequency-adjusted display ------- */
  const freqDivisor = state.frequency === "weekly" ? 4.333 : state.frequency === "biweekly" ? 2.1667 : 1;
  const periodicPayment = result ? result.monthlyPayment / freqDivisor : 0;
  const freqLabel = state.frequency === "weekly" ? "/wk" : state.frequency === "biweekly" ? "/2wk" : "/mo";

  /* ------- chart data ------- */
  const pieData = result
    ? [
        { name: STRINGS.charts.principal, value: result.principal },
        { name: STRINGS.charts.interest, value: result.totalInterest },
      ]
    : [];

  const areaData = useMemo(() => {
    if (!result || result.schedule.length === 0) return [];
    const sched = result.schedule;
    const useYears = sched.length >= 24;
    if (useYears) {
      const yearly: { label: string; balance: number; interest: number }[] = [];
      const yrs = Math.ceil(sched.length / 12);
      for (let y = 1; y <= yrs; y++) {
        const idx = Math.min(y * 12, sched.length) - 1;
        yearly.push({
          label: `Y${y}`,
          balance: sched[idx].balance,
          interest: sched[idx].cumulativeInterest,
        });
      }
      return yearly;
    }
    return sched.map((r) => ({
      label: `M${r.month}`,
      balance: r.balance,
      interest: r.cumulativeInterest,
    }));
  }, [result]);

  /* ------- handlers ------- */
  const update = (patch: Partial<TabState>) => setState((s) => ({ ...s, ...patch }));

  const termInUnit = termUnit === "years" ? state.months / 12 : state.months;

  const setTerm = (val: number) => {
    const months = termUnit === "years" ? Math.round(val * 12) : Math.round(val);
    update({ months: Math.max(1, Math.min(360, months)) });
  };

  const copySummary = async () => {
    if (!result) return;
    const lines = [
      `Loan: ${formatCurrency(state.amount, state.currency)} at ${state.rate}% for ${state.months} months`,
      `Monthly payment: ${formatCurrency(result.monthlyPayment, state.currency)}`,
      `Total interest: ${formatCurrency(result.totalInterest, state.currency)}`,
      `Total cost: ${formatCurrency(result.totalCost, state.currency)}`,
      `Calculated at skycally.com/tools/loan-calculator`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const downloadCsv = () => {
    if (!result) return;
    const csv = rowsToCsv(result.schedule);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab}-amortization.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ------- amortization rows to render ------- */
  const visibleRows: { row: AmortRow; ellipsis?: boolean }[] = useMemo(() => {
    if (!result) return [];
    const all = result.schedule;
    if (showAllRows || all.length <= 8) {
      // cap at 200 to avoid performance issues; user can download full CSV.
      const cap = 200;
      if (all.length > cap) {
        return [...all.slice(0, cap).map((row) => ({ row }))];
      }
      return all.map((row) => ({ row }));
    }
    return [
      ...all.slice(0, 3).map((row) => ({ row })),
      { row: all[3], ellipsis: true },
      ...all.slice(-3).map((row) => ({ row })),
    ];
  }, [result, showAllRows]);

  const seo = SEO_CONTENT[tab];
  const mortgage =
    tab === "mortgage" && result && "totalMonthly" in result
      ? (result as unknown as {
          totalMonthly: number;
          monthlyTax: number;
          monthlyInsurance: number;
          monthlyPmi: number;
        })
      : null;

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      {/* ------- Tabs ------- */}
      <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Loan type">
        {(Object.keys(TAB_META) as LoanTab[]).map((t) => {
          const meta = TAB_META[t];
          const active = tab === t;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: active ? meta.accent : "var(--border)",
                background: active ? `color-mix(in oklab, ${meta.accent} 15%, transparent)` : "var(--card)",
                color: active ? meta.accent : "var(--foreground)",
              }}
            >
              <span aria-hidden>{meta.icon}</span>
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* ------- Inputs ------- */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          {/* Currency */}
          <div>
            <label className="block text-sm font-medium mb-2">{STRINGS.inputs.currency}</label>
            <select
              value={state.currency}
              onChange={(e) => update({ currency: e.target.value as CurrencyCode })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {tab === "car" ? STRINGS.inputs.vehiclePrice : STRINGS.inputs.loanAmount}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {CURRENCIES.find((c) => c.code === state.currency)?.symbol}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={state.amount || ""}
                onChange={(e) => update({ amount: parseFloat(e.target.value) || 0 })}
                className="pl-10 text-lg"
              />
            </div>
            <div className="mt-3">
              <Slider
                value={[Math.min(state.amount, 1000000)]}
                min={500}
                max={1000000}
                step={500}
                onValueChange={(v) => update({ amount: v[0] })}
              />
            </div>
          </div>

          {/* Mortgage / Car extras (down payment etc.) */}
          {(tab === "mortgage" || tab === "car") && (
            <div>
              <label className="block text-sm font-medium mb-2">{STRINGS.inputs.downPayment}</label>
              <Input
                type="number"
                min={0}
                value={state.downPayment || ""}
                onChange={(e) => update({ downPayment: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          {tab === "car" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">{STRINGS.inputs.tradeIn}</label>
                <Input
                  type="number"
                  min={0}
                  value={state.tradeIn || ""}
                  onChange={(e) => update({ tradeIn: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{STRINGS.inputs.salesTax} (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  step={0.1}
                  value={state.salesTax || ""}
                  onChange={(e) => update({ salesTax: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </>
          )}

          {tab === "mortgage" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">{STRINGS.inputs.propertyTax}</label>
                <Input
                  type="number"
                  min={0}
                  value={state.propertyTax || ""}
                  onChange={(e) => update({ propertyTax: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{STRINGS.inputs.insurance}</label>
                <Input
                  type="number"
                  min={0}
                  value={state.insurance || ""}
                  onChange={(e) => update({ insurance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{STRINGS.inputs.pmi}</label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={state.pmiRate || ""}
                  onChange={(e) => update({ pmiRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </>
          )}

          {/* Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{STRINGS.inputs.interestRate}</label>
              <span className="text-sm font-mono">{state.rate.toFixed(2)}%</span>
            </div>
            <Input
              type="number"
              min={0}
              max={50}
              step={0.1}
              value={state.rate || ""}
              onChange={(e) => update({ rate: Math.max(0, parseFloat(e.target.value) || 0) })}
            />
            <div className="mt-3">
              <Slider
                value={[Math.min(state.rate, 30)]}
                min={0}
                max={30}
                step={0.1}
                onValueChange={(v) => update({ rate: v[0] })}
              />
            </div>
            {state.rate > 30 && (
              <p className="mt-2 text-xs" style={{ color: "var(--orange-brand, #f97316)" }}>
                ⚠ {STRINGS.errors.highRate}
              </p>
            )}
          </div>

          {/* Term */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{STRINGS.inputs.loanTerm}</label>
              <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setTermUnit("months")}
                  className="px-2 py-1"
                  style={{
                    background: termUnit === "months" ? "var(--secondary)" : "transparent",
                    color: "var(--foreground)",
                  }}
                >
                  {STRINGS.inputs.months}
                </button>
                <button
                  type="button"
                  onClick={() => setTermUnit("years")}
                  className="px-2 py-1"
                  style={{
                    background: termUnit === "years" ? "var(--secondary)" : "transparent",
                    color: "var(--foreground)",
                  }}
                >
                  {STRINGS.inputs.years}
                </button>
              </div>
            </div>
            <Input
              type="number"
              min={1}
              max={termUnit === "years" ? 30 : 360}
              step={termUnit === "years" ? 0.5 : 1}
              value={termInUnit}
              onChange={(e) => setTerm(parseFloat(e.target.value) || 0)}
            />
            <div className="mt-3">
              <Slider
                value={[state.months]}
                min={1}
                max={360}
                step={1}
                onValueChange={(v) => update({ months: v[0] })}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {state.months} months
              {state.months >= 12 ? ` (${(state.months / 12).toFixed(state.months % 12 === 0 ? 0 : 1)} years)` : ""}
            </p>
          </div>

          {/* Advanced */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              {STRINGS.inputs.advanced}
            </button>
            {showAdvanced && (
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2">{STRINGS.inputs.frequency}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["monthly", "biweekly", "weekly"] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => update({ frequency: f })}
                      className="rounded-md border px-3 py-1.5 text-sm"
                      style={{
                        borderColor: state.frequency === f ? accent : "var(--border)",
                        background:
                          state.frequency === f ? `color-mix(in oklab, ${accent} 15%, transparent)` : "transparent",
                      }}
                    >
                      {STRINGS.inputs[f]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {baseInvalid && (
            <p className="text-sm" style={{ color: "var(--destructive, #ef4444)" }}>
              {STRINGS.errors.invalid}
            </p>
          )}
        </div>

        {/* ------- Results ------- */}
        <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
          {/* Hero cards */}
          <div className={`grid gap-4 ${mortgage ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"}`}>
            <ResultCard
              label={STRINGS.results.monthlyPayment}
              value={result ? formatCurrency(periodicPayment, state.currency) : "—"}
              hint={freqLabel}
              accent={accent}
              big
            />
            <ResultCard
              label={STRINGS.results.totalInterest}
              value={result ? formatCurrency(result.totalInterest, state.currency) : "—"}
              accent="#f97316"
            />
            <ResultCard
              label={STRINGS.results.totalCost}
              value={result ? formatCurrency(result.totalCost, state.currency) : "—"}
              muted
            />
            {mortgage && (
              <ResultCard
                label={STRINGS.results.piti}
                value={formatCurrency(mortgage.totalMonthly, state.currency)}
                accent="#10b981"
              />
            )}
          </div>

          {/* Copy */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copySummary} disabled={!result}>
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? STRINGS.results.copied : STRINGS.results.copy}
            </Button>
          </div>

          {/* Mortgage breakdown */}
          {mortgage && (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Mini label="P + I" v={formatCurrency(result!.monthlyPayment, state.currency)} />
              <Mini label="Tax" v={formatCurrency(mortgage.monthlyTax, state.currency)} />
              <Mini label="Insurance" v={formatCurrency(mortgage.monthlyInsurance, state.currency)} />
              <Mini label="PMI" v={formatCurrency(mortgage.monthlyPmi, state.currency)} />
            </div>
          )}

          {/* Charts */}
          {result && result.principal > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-sm font-medium mb-3">{STRINGS.charts.breakdown}</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        <Cell fill="#06b6d4" />
                        <Cell fill="#f97316" />
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v, state.currency)}
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--foreground)",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-sm font-medium mb-3">{STRINGS.charts.overTime}</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                      />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v, state.currency)}
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          color: "var(--foreground)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        name={STRINGS.charts.balance}
                        stroke="#06b6d4"
                        fill="url(#balGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="interest"
                        name={STRINGS.charts.cumInterest}
                        stroke="#f97316"
                        fill="url(#intGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Extra payment insight */}
          {result && (
            <div
              className="rounded-2xl border p-4"
              style={{
                borderColor: accent,
                background: `color-mix(in oklab, ${accent} 8%, transparent)`,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="text-sm font-medium" style={{ color: accent }}>
                  {STRINGS.insight.headline}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">{STRINGS.insight.label}</label>
                  <Input
                    type="number"
                    min={0}
                    value={state.extra || ""}
                    onChange={(e) => update({ extra: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-28"
                  />
                </div>
              </div>
              <p className="mt-3 text-sm">
                {savings && savings.interestSaved > 0 ? (
                  <>
                    {STRINGS.insight.prefix} <strong>{formatCurrency(state.extra, state.currency)}</strong>{" "}
                    {STRINGS.insight.middle}{" "}
                    <strong style={{ color: accent }}>{formatCurrency(savings.interestSaved, state.currency)}</strong>{" "}
                    {STRINGS.insight.inInterest} <strong>{savings.monthsSaved}</strong> {STRINGS.insight.suffix}
                  </>
                ) : (
                  <span className="text-muted-foreground">{STRINGS.insight.none}</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ------- Amortization table ------- */}
      {result && result.schedule.length > 0 && (
        <section className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setTableOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="font-medium">📋 {STRINGS.amortization.title}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${tableOpen ? "rotate-180" : ""}`} />
          </button>
          {tableOpen && (
            <div>
              <div className="flex items-center justify-between gap-2 px-4 pb-3 flex-wrap">
                <div className="text-xs text-muted-foreground">{result.schedule.length} payments total</div>
                <div className="flex gap-2">
                  {result.schedule.length > 8 && (
                    <Button variant="outline" size="sm" onClick={() => setShowAllRows((v) => !v)}>
                      {showAllRows ? STRINGS.amortization.showLess : STRINGS.amortization.showAll}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={downloadCsv}>
                    <Download className="w-4 h-4 mr-1.5" />
                    {STRINGS.amortization.download}
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto" dir={isRTL ? "rtl" : "ltr"}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-secondary">
                    <tr>
                      <th className="px-3 py-2 text-left sticky left-0 bg-secondary z-10" style={{ minWidth: 70 }}>
                        {STRINGS.amortization.month}
                      </th>
                      <th className={`px-3 py-2 ${isRTL ? "text-left" : "text-right"}`}>
                        {STRINGS.amortization.payment}
                      </th>
                      <th className={`px-3 py-2 ${isRTL ? "text-left" : "text-right"}`}>
                        {STRINGS.amortization.principal}
                      </th>
                      <th className={`px-3 py-2 ${isRTL ? "text-left" : "text-right"}`}>
                        {STRINGS.amortization.interest}
                      </th>
                      <th className={`px-3 py-2 ${isRTL ? "text-left" : "text-right"}`}>
                        {STRINGS.amortization.balance}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((item, idx) =>
                      item.ellipsis ? (
                        <tr key={`ell-${idx}`} className="border-t border-border">
                          <td colSpan={5} className="px-3 py-2 text-center text-muted-foreground">
                            ⋯
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={item.row.month}
                          className="border-t border-border"
                          style={{
                            background:
                              item.row.month % 2 === 0
                                ? "color-mix(in oklab, var(--muted) 30%, transparent)"
                                : "transparent",
                          }}
                        >
                          <td
                            className="px-3 py-2 sticky left-0 z-10"
                            style={{
                              background:
                                item.row.month % 2 === 0
                                  ? "color-mix(in oklab, var(--muted) 60%, var(--card))"
                                  : "var(--card)",
                            }}
                          >
                            {item.row.month}
                          </td>
                          <td className={`px-3 py-2 font-mono ${isRTL ? "text-left" : "text-right"}`}>
                            {formatCurrency(item.row.payment, state.currency)}
                          </td>
                          <td className={`px-3 py-2 font-mono ${isRTL ? "text-left" : "text-right"}`}>
                            {formatCurrency(item.row.principal, state.currency)}
                          </td>
                          <td className={`px-3 py-2 font-mono ${isRTL ? "text-left" : "text-right"}`}>
                            {formatCurrency(item.row.interest, state.currency)}
                          </td>
                          <td className={`px-3 py-2 font-mono ${isRTL ? "text-left" : "text-right"}`}>
                            {formatCurrency(item.row.balance, state.currency)}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              {showAllRows && result.schedule.length > 200 && (
                <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
                  Showing first 200 of {result.schedule.length} rows. Download the CSV for the full schedule.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <p className="mt-6 text-xs text-muted-foreground italic">{STRINGS.disclaimer}</p>

      <HowToUse
        steps={[
          "Pick the loan type that matches your situation",
          "Enter the loan amount, interest rate and term",
          "See your monthly payment, total interest and full schedule instantly",
        ]}
      />

      <ToolSeoContent title={seo.title} description={seo.description} body={seo.body} faqs={seo.faqs} />

      <RelatedTools currentSlug={slug} />
    </ToolPageShell>
  );
}

/* ------------------------- Small components ------------------------- */

function ResultCard({
  label,
  value,
  hint,
  accent,
  muted,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  muted?: boolean;
  big?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      style={
        accent && !muted
          ? {
              borderColor: accent,
              background: `linear-gradient(135deg, color-mix(in oklab, ${accent} 12%, transparent), var(--card))`,
            }
          : undefined
      }
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`font-display font-bold mt-1 leading-tight break-all ${big ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}
        style={{ color: muted ? "var(--muted-foreground)" : accent || "var(--foreground)" }}
      >
        {value}
        {hint && <span className="text-xs font-normal ml-1 opacity-70">{hint}</span>}
      </div>
    </div>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-medium">{v}</div>
    </div>
  );
}
