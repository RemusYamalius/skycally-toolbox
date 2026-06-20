import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import LoanCalculatorPage from "@/components/loan-calculator/LoanCalculatorPage";

export const Route = createFileRoute("/tools/emi-calculator")({
  head: () => buildToolMeta(toolBySlug("emi-calculator", tools)),
  component: () => <LoanCalculatorPage defaultTab="emi" slug="emi-calculator" />,
});
