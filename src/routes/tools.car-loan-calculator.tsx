import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import LoanCalculatorPage from "@/components/loan-calculator/LoanCalculatorPage";

export const Route = createFileRoute("/tools/car-loan-calculator")({
  head: () => buildToolMeta(toolBySlug("car-loan-calculator", tools)),
  component: () => <LoanCalculatorPage defaultTab="car" slug="car-loan-calculator" />,
});
