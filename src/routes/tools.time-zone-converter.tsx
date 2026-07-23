import { createFileRoute, Link } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";
import { ConverterPanel } from "@/components/time-zone/converter-panel";
import { WorldClock } from "@/components/time-zone/world-clock";
import { MeetingPlanner } from "@/components/time-zone/meeting-planner";
import { useNow } from "@/lib/time-zone/use-now";

export const Route = createFileRoute("/tools/time-zone-converter")({
  head: () => buildToolMeta(toolBySlug("time-zone-converter", tools)),
  component: TimeZoneConverter,
});

const SEO_BODY = [
  "Skycally's Time Zone Converter instantly converts the time between any two cities from a database of over 90 locations worldwide — from New York and London to Tokyo, Dubai, Mumbai, and Sydney. Both city clocks update live every second, showing the current time, date, day of the week, UTC offset, and timezone abbreviation (EST, GMT, IST, JST, and more). The difference badge between the two clocks tells you at a glance which city is ahead and by how many hours, eliminating any mental arithmetic. No account required, completely free.",
  "The World Clock section displays up to 12 cities simultaneously in a responsive card grid, each showing the live local time and a day-or-night indicator based on the hour — dawn, morning, afternoon, evening, or night. Cards are colour-tinted warm for daytime hours and cool for night hours, giving an immediate visual sense of who is awake and who is asleep around the world. Add or remove cities to build your personal world clock, and your selection is saved automatically so it is ready next time you visit.",
  "The Meeting Planner is the feature that sets this tool apart from basic time zone converters. Add up to five cities representing your team members or clients, and the planner generates a full 24-hour schedule table showing what time it is in each location for every hour of the day — colour-coded green for ideal business hours (9 AM to 6 PM), amber for acceptable hours, and red for night hours. The tool automatically identifies the best overlap window where the most participants fall within working hours, saving the back-and-forth of scheduling across time zones.",
  "Converting a specific time is as simple as entering it in the input field below the two city clocks — type 3:00 PM and see instantly what that translates to in the destination city, with a clear note when the converted time falls on a different calendar day. Use this alongside our Holiday Checker to confirm whether a meeting date falls on a public holiday in any of the relevant countries, and our Country Info tool for a full profile of any destination.",
];

const SEO_FAQS = [
  { question: "How do I convert time between two cities?", answer: "Select your origin city in the FROM field and your destination city in the TO field using the searchable dropdown. Both clocks update instantly to show the current live time in each location. To convert a specific time rather than the current time, enter it in the time input field below the clocks and the converted result appears immediately." },
  { question: "What is the difference between UTC, GMT, and local time?", answer: "UTC (Coordinated Universal Time) is the global time standard that all other time zones are measured against. GMT (Greenwich Mean Time) is the time zone of London in winter and is effectively equivalent to UTC. Local time is the current time in a specific location, which may differ from UTC by a positive or negative offset — for example, New York is UTC-5 in winter and UTC-4 in summer (daylight saving time)." },
  { question: "How many cities are available in the converter?", answer: "Over 90 cities across all continents and time zones are available, covering the Americas, Europe, the Middle East, Africa, Asia, and the Pacific. The searchable dropdown lets you type any city name to find it quickly. Popular cities including New York, London, Dubai, Tokyo, Singapore, Mumbai, and Sydney appear at the top of the list." },
  { question: "What is the Meeting Planner and how does it work?", answer: "The Meeting Planner helps remote teams find a time that works for participants across multiple time zones. Add up to five cities representing your team members, and the tool generates a 24-hour schedule table showing what time it would be in each city for every hour of the day. Ideal business hours (9 AM to 6 PM) are highlighted in green, and the tool automatically identifies the best overlap window where the most participants fall within working hours." },
  { question: "Does the converter account for daylight saving time?", answer: "Yes. The converter uses the browser's built-in Intl (Internationalization) API, which automatically applies the correct daylight saving time rules for each timezone based on the current date. This means conversions are always accurate regardless of whether a location is currently observing DST or standard time." },
  { question: "Can I save my favourite cities to the world clock?", answer: "Yes. The World Clock section allows you to add up to 12 cities by clicking the Add City button. Your selected cities are saved in your browser's local storage, so they are automatically restored the next time you visit. You can remove any city at any time using the Edit mode." },
  { question: "What does the day/night indicator mean?", answer: "Each city card in the World Clock shows an emoji indicating the approximate time of day in that location: 🌄 Dawn (5-8 AM), 🌅 Morning (8-12 PM), ☀️ Afternoon (12-5 PM), 🌇 Evening (5-8 PM), or 🌙 Night (8 PM-5 AM). Cards are also colour-tinted — warm amber for daytime and cool blue for night — giving an instant visual overview of who is awake around the world." },
  { question: "What happens when a time conversion crosses midnight?", answer: "When the converted time falls on a different calendar day from the original, the converter clearly indicates this — for example, showing 'Tuesday' or adding '+1 day' or '-1 day' to make the date difference explicit. This is especially important for time zones that span the International Date Line, such as converting between the US West Coast and Australia." },
];

function TimeZoneConverter() {
  const now = useNow(1000);

  return (
    <ToolPageShell
      title="Time Zone Converter"
      description="Convert time between any two cities instantly. World clock, meeting planner, and live time display."
      showFileDisclaimer={false}
    >
      <ConverterPanel now={now} />

      <WorldClock now={now} />

      <MeetingPlanner now={now} />

      <AdZone id="time-zone-converter-mid" size="728x90" />

      {/* Internal links */}
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card/40 p-4">
          <p className="text-sm text-muted-foreground">
            Before scheduling an international meeting, check public holidays with our{" "}
            <Link to="/tools/holiday-checker" className="text-foreground underline hover:no-underline">
              Holiday Checker
            </Link>{" "}
            and explore any destination with{" "}
            <Link to="/tools/country-info" className="text-foreground underline hover:no-underline">
              Country Info
            </Link>
            .
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/40 p-4">
          <p className="text-sm text-muted-foreground">
            Convert prices for international trips with our{" "}
            <Link to="/tools/currency-converter" className="text-foreground underline hover:no-underline">
              Currency Converter
            </Link>
            , or calculate elapsed time with the{" "}
            <Link to="/tools/age-calculator" className="text-foreground underline hover:no-underline">
              Age Calculator
            </Link>
            .
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/40 p-4">
          <p className="text-sm text-muted-foreground">
            Traveling? Check the{" "}
            <Link to="/tools/weather-checker" className="text-foreground underline hover:no-underline">
              Weather Checker
            </Link>{" "}
            for your destination, and plan around jet lag with the{" "}
            <Link to="/tools/sleep-calculator" className="text-foreground underline hover:no-underline">
              Sleep Calculator
            </Link>
            .
          </p>
        </div>
      </section>

      <ToolSeoContent
        title="Free time zone converter with world clock and meeting planner"
        description="Convert time between 90+ cities instantly, browse a live world clock, and find the best meeting time for remote teams — all free, no signup."
        body={SEO_BODY}
        faqs={SEO_FAQS}
      />

      <HowToUse
        steps={[
          "Select your origin and destination cities from the searchable dropdown — both clocks update live instantly.",
          "Enter a specific time to convert, or use the Meeting Planner to find the best overlap window for your remote team.",
          "Add up to 12 cities to the World Clock for a permanent dashboard of your most-used time zones.",
        ]}
      />

      <RelatedTools currentSlug="time-zone-converter" />
    </ToolPageShell>
  );
}
