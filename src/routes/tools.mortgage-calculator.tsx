import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import LoanCalculatorPage from "@/components/loan-calculator/LoanCalculatorPage";

export const Route = createFileRoute("/tools/mortgage-calculator")({
  head: () => buildToolMeta(toolBySlug("mortgage-calculator", tools)),
  component: () => <LoanCalculatorPage defaultTab="mortgage" slug="mortgage-calculator" />,
});
