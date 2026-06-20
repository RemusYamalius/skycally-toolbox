import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import LoanCalculatorPage from "@/components/loan-calculator/LoanCalculatorPage";

export const Route = createFileRoute("/tools/loan-calculator")({
  head: () => buildToolMeta(toolBySlug("loan-calculator", tools)),
  component: () => <LoanCalculatorPage defaultTab="personal" slug="loan-calculator" />,
});
