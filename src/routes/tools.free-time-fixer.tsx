import { createFileRoute } from "@tanstack/react-router";
import { buildToolMeta, toolBySlug } from "@/lib/seo";
import { tools } from "@/lib/tools";
import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";

import { ToolPageShell } from "@/components/tool-page-shell";
import { HowToUse } from "@/components/how-to-use";
import { Button } from "@/components/ui/button";
import { AdZone } from "@/components/ad-zone";
import ToolSeoContent from "@/components/tool-seo-content";
import { RelatedTools } from "@/components/related-tools";

export const Route = createFileRoute("/tools/free-time-fixer")({
  head: () => buildToolMeta(toolBySlug("free-time-fixer", tools)),
  component: FreeTimeFixer,
});

type Time = "5" | "15" | "30" | "60" | "120";
type Mood = "productive" | "relaxed" | "creative" | "social" | "active";
interface Suggestion {
  title: string;
  description: string;
  emoji: string;
}

const TIMES: { value: Time; label: string }[] = [
  { value: "5", label: "5 min" },
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2+ hours" },
];

const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: "productive", label: "Productive", emoji: "💼" },
  { value: "relaxed", label: "Relaxed", emoji: "😌" },
  { value: "creative", label: "Creative", emoji: "🎨" },
  { value: "social", label: "Social", emoji: "💬" },
  { value: "active", label: "Active", emoji: "🏃" },
];

const S = (title: string, description: string, emoji: string): Suggestion => ({ title, description, emoji });

const SUGGESTIONS: Record<string, Suggestion[]> = {
  "5-productive": [
    S("Inbox Zero Sprint", "Archive or reply to 5 emails right now.", "📧"),
    S("Tidy Your Desk", "Clear the surface and wipe it down.", "🧽"),
    S("Brain Dump", "List every task on your mind for 5 minutes.", "🧠"),
    S("Plan Tomorrow", "Write your top 3 priorities for tomorrow.", "📝"),
    S("Unsubscribe Spree", "Unsubscribe from 5 newsletters you never read.", "✂️"),
  ],
  "5-relaxed": [
    S("Box Breathing", "Inhale 4, hold 4, exhale 4, hold 4 — repeat.", "🌬️"),
    S("Stretch Break", "Stand up and stretch your neck, back and arms.", "🧘"),
    S("Window Gaze", "Look out the window and just notice things.", "🪟"),
    S("Tea Ritual", "Make a slow cup of tea and sip without a screen.", "🍵"),
    S("Pet a Pet", "If you have one nearby, give them 5 minutes.", "🐾"),
  ],
  "5-creative": [
    S("One Sentence Story", "Write a single sentence that hooks you in.", "✍️"),
    S("Doodle a Shape", "Turn a random scribble into something recognizable.", "🖊️"),
    S("Color Hunt", "Find 5 things in one color in your room.", "🎨"),
    S("Name 10 Ideas", "Pick a problem, brainstorm 10 wild solutions.", "💡"),
    S("Photo Frame", "Take one mindful photo of something ordinary.", "📷"),
  ],
  "5-social": [
    S("Send a Compliment", "Text someone something nice — no agenda.", "💌"),
    S("Voice Note Hello", "Record a 30-second 'thinking of you' note.", "🎙️"),
    S("Meme Drop", "Send a friend a meme that fits them.", "😂"),
    S("Old Photo Share", "Find a photo and send it to whoever's in it.", "📸"),
    S("Five-Star Review", "Leave a kind review for a small business you love.", "⭐"),
  ],
  "5-active": [
    S("20 Squats", "Bang out 20 bodyweight squats.", "🦵"),
    S("Stair Sprint", "Run up and down the nearest stairs twice.", "🪜"),
    S("Plank Test", "Hold a plank for as long as you can.", "💪"),
    S("Dance Track", "Play one song and dance through the whole thing.", "💃"),
    S("Walk the Block", "Step outside for a brisk lap around the building.", "🚶"),
  ],

  "15-productive": [
    S("Deep Clean One Drawer", "Pick a single drawer and reorganize it fully.", "🗄️"),
    S("Reply Roundup", "Knock out every short reply in your inbox.", "📥"),
    S("File Names", "Rename messy files in your Downloads folder.", "📁"),
    S("Calendar Audit", "Decline or move meetings that aren't worth it.", "📅"),
    S("Quick Read", "Read one long article you bookmarked.", "📖"),
  ],
  "15-relaxed": [
    S("Guided Meditation", "Find a 10-minute meditation on YouTube.", "🧘"),
    S("Slow Coffee", "Make coffee by hand and drink it without a screen.", "☕"),
    S("Music Session", "Lie back and listen to a full album side.", "🎧"),
    S("Skincare Moment", "Cleanse, mask, moisturize — full ritual.", "✨"),
    S("Pet a Plant", "Water your plants and check their leaves.", "🌿"),
  ],
  "15-creative": [
    S("Free Write", "Set a timer and write whatever comes to mind.", "📓"),
    S("Quick Sketch", "Draw the object on your desk in 15 minutes.", "✏️"),
    S("Playlist Build", "Make a 5-song playlist around a single mood.", "🎶"),
    S("Recipe Remix", "Invent a snack from 3 things in your kitchen.", "🥪"),
    S("Mood Board", "Save 10 images that match how you want to feel.", "🖼️"),
  ],
  "15-social": [
    S("Real Phone Call", "Call (don't text) a friend you've missed.", "📞"),
    S("Group Chat Revival", "Drop a fun question in a quiet group chat.", "💬"),
    S("Plan a Hangout", "DM someone and pick an actual date and time.", "📆"),
    S("Voice Memo Catch-up", "Send a long voice note to a far-away friend.", "🎙️"),
    S("Family Check-in", "Call a parent or sibling just to say hi.", "👨‍👩‍👧"),
  ],
  "15-active": [
    S("Quick Yoga Flow", "Do a 10-minute YouTube yoga flow.", "🧘‍♀️"),
    S("Brisk Walk", "Walk fast around the block, no phone.", "🚶‍♂️"),
    S("Bodyweight Circuit", "3 rounds: 10 push-ups, 15 squats, 20 jumping jacks.", "🔥"),
    S("Stretch Series", "Full-body stretch routine, hold each pose 30s.", "🤸"),
    S("Jump Rope Burst", "5 sets of 1 minute jump rope or jumping jacks.", "🪢"),
  ],

  "30-productive": [
    S("One Real Task", "Pick the task you've been avoiding and finish it.", "✅"),
    S("Photo Cleanup", "Delete blurry duplicates from your camera roll.", "📱"),
    S("Budget Glance", "Review last month's spending and note 3 wins.", "💰"),
    S("Skill Lesson", "Watch a focused tutorial and try one new thing.", "🎓"),
    S("Inbox Triage", "Get your email under 20 unread messages.", "📨"),
  ],
  "30-relaxed": [
    S("Bath Time", "Run a hot bath, no screens allowed.", "🛁"),
    S("Reading Nook", "Read a book in a comfortable spot for 30 minutes.", "📚"),
    S("Slow Stretch", "Long, gentle stretching with your favorite playlist.", "🧘"),
    S("Sit Outside", "Take a chair outside and just be there.", "🌳"),
    S("Solo Walk", "Walk slowly with no destination in mind.", "🚶"),
  ],
  "30-creative": [
    S("Write a Letter", "Hand-write a real letter to someone.", "✉️"),
    S("Cook Something New", "Try a recipe with ingredients you have.", "🍳"),
    S("Photo Walk", "Walk around shooting 20 intentional photos.", "📷"),
    S("Journal Page", "Fill one full page with whatever's on your mind.", "📝"),
    S("Build a Playlist", "Curate a 30-minute themed playlist with notes.", "🎵"),
  ],
  "30-social": [
    S("Coffee Catch-up", "Video call a friend over coffee.", "☕"),
    S("Send 3 Updates", "Text 3 different people a real update.", "📲"),
    S("Plan a Dinner", "Organize an actual dinner with friends this month.", "🍝"),
    S("Reconnect", "Message someone you haven't talked to in 6+ months.", "💫"),
    S("Game Together", "Play one round of a game online with a friend.", "🎮"),
  ],
  "30-active": [
    S("Real Workout", "30-minute strength or cardio session.", "🏋️"),
    S("Bike Loop", "Take a 30-minute bike ride somewhere green.", "🚴"),
    S("Run Easy", "Slow, conversational pace for 25 minutes.", "🏃"),
    S("Long Walk", "Walk briskly for the full 30 minutes.", "🥾"),
    S("Dance Workout", "Follow a high-energy dance video.", "🕺"),
  ],

  "60-productive": [
    S("Big Cleanup", "Pick one room and reset it completely.", "🧹"),
    S("Deep Work Block", "60 uninterrupted minutes on your hardest task.", "🎯"),
    S("Side Project", "Make one tiny step forward on a project.", "🚀"),
    S("Learn a Concept", "Take a focused lesson and write down what you learned.", "📘"),
    S("Finance Hour", "Review accounts, cancel one subscription you forgot.", "💳"),
  ],
  "60-relaxed": [
    S("Movie Episode", "Watch one episode of a show you love — phone away.", "🎬"),
    S("Cook Slowly", "Cook a comforting meal with no rush.", "🍲"),
    S("Long Bath + Book", "Combine the bath and a book.", "🛀"),
    S("Park Sit", "Bring a drink to a park bench and watch the world.", "🌅"),
    S("Power Nap", "Sleep 25 minutes, then a slow tea afterwards.", "💤"),
  ],
  "60-creative": [
    S("Start a Song", "Hum a melody and record it on your phone.", "🎼"),
    S("Paint Anything", "Watercolor or sketch one full piece.", "🖌️"),
    S("Write a Story", "Write a 500-word short story start to finish.", "📖"),
    S("Build IKEA-Style", "Make something with your hands — even origami.", "🛠️"),
    S("Edit a Video", "Cut a 60-second video from old footage.", "🎞️"),
  ],
  "60-social": [
    S("Long Walk Talk", "Meet a friend and walk for an hour.", "👯"),
    S("Cook With Someone", "Cook a meal together, even over video.", "🍝"),
    S("Old Friend Call", "Schedule a 45-minute call with someone far away.", "📞"),
    S("Host Coffee", "Invite a neighbor or friend over for coffee.", "☕"),
    S("Game Night Plan", "Set up a game night for this week.", "🎲"),
  ],
  "60-active": [
    S("Hike or Trail", "Find a nearby trail and walk it for an hour.", "🥾"),
    S("Full Gym Session", "Strength workout with proper warm-up.", "💪"),
    S("Bike Adventure", "Ride somewhere you've never been.", "🚲"),
    S("Yoga Class", "Follow a full 60-minute yoga class online.", "🧘‍♀️"),
    S("Swim", "Hit the pool for laps and stretches.", "🏊"),
  ],

  "120-productive": [
    S("Mini Sprint", "Pick a project and ship a usable v1 in 2 hours.", "🚢"),
    S("Massive Declutter", "Tackle the closet, garage, or storage.", "📦"),
    S("Learning Marathon", "Take a 2-hour deep dive into a course.", "🎓"),
    S("Quarterly Review", "Reflect on the last 3 months and plan the next.", "📈"),
    S("Side Hustle Hour", "2 hours on the thing you've been meaning to start.", "💼"),
  ],
  "120-relaxed": [
    S("Movie Marathon", "Watch a long movie with snacks ready.", "🍿"),
    S("Spa at Home", "Bath, mask, music, slow dinner — full reset.", "💆"),
    S("Bookstore Visit", "Browse a real bookstore and buy something.", "📚"),
    S("Park Picnic", "Pack a snack and read in the park.", "🧺"),
    S("Slow Cook", "Make something that simmers for hours.", "🍲"),
  ],
  "120-creative": [
    S("Mini Album", "Write or record 2 short song sketches.", "🎙️"),
    S("Cook a Feast", "Try an ambitious recipe from start to finish.", "👨‍🍳"),
    S("Photo Project", "Shoot and edit a 5-photo themed series.", "📸"),
    S("Build a Page", "Make a one-page personal site about anything.", "💻"),
    S("Long Sketch", "Draw or paint one detailed piece you're proud of.", "🎨"),
  ],
  "120-social": [
    S("Brunch Out", "Meet a friend for a long brunch.", "🥞"),
    S("Group Hike", "Round up 2 friends and hit a trail.", "⛰️"),
    S("Dinner Party", "Cook for 2-4 people at home tonight.", "🍷"),
    S("Board Game Night", "Set up snacks and a long game.", "🎲"),
    S("Museum Trip", "Visit a museum with someone whose take you'd enjoy.", "🖼️"),
  ],
  "120-active": [
    S("Long Run", "Easy-paced run for 60-90 minutes.", "🏃‍♀️"),
    S("Big Hike", "Drive to a trail and hike for 2 hours.", "🥾"),
    S("Bike Tour", "Plan a route and ride it end to end.", "🚴‍♂️"),
    S("Sports Pickup", "Find a pickup game of basketball, soccer, or tennis.", "⚽"),
    S("Climbing Session", "Go to a climbing gym for a full session.", "🧗"),
  ],
};

function pick(time: Time, mood: Mood, avoid?: string): Suggestion {
  const list = SUGGESTIONS[`${time}-${mood}`] ?? [];
  if (!list.length) return S("Take a Break", "Step away from your screen for a moment.", "☕");
  const filtered = avoid && list.length > 1 ? list.filter((s) => s.title !== avoid) : list;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function FreeTimeFixer() {
  const [time, setTime] = useState<Time | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const reveal = () => {
    if (!time || !mood) return;
    setSuggestion(pick(time, mood));
  };

  const another = () => {
    if (!time || !mood) return;
    setSuggestion(pick(time, mood, suggestion?.title));
  };

  const tool = toolBySlug("free-time-fixer", tools);

  return (
    <ToolPageShell title={tool.name} description={tool.description}>
      <div className="space-y-8">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display font-semibold mb-4">1. How much time do you have?</h2>
          <div className="flex flex-wrap gap-2">
            {TIMES.map((t) => (
              <Button
                key={t.value}
                variant={time === t.value ? "default" : "outline"}
                onClick={() => {
                  setTime(t.value);
                  setSuggestion(null);
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display font-semibold mb-4">2. What's your mood?</h2>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <Button
                key={m.value}
                variant={mood === m.value ? "default" : "outline"}
                onClick={() => {
                  setMood(m.value);
                  setSuggestion(null);
                }}
              >
                <span className="mr-1.5">{m.emoji}</span> {m.label}
              </Button>
            ))}
          </div>
        </section>

        <div className="flex justify-center">
          <Button size="lg" onClick={reveal} disabled={!time || !mood} className="px-8">
            <Sparkles className="w-4 h-4 mr-2" /> What should I do?
          </Button>
        </div>

        {suggestion && (
          <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/30 p-8 text-center">
            <div className="text-6xl mb-3">{suggestion.emoji}</div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold mb-2">{suggestion.title}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">{suggestion.description}</p>
            <div className="mt-6">
              <Button variant="outline" onClick={another}>
                <RefreshCw className="w-4 h-4 mr-2" /> Try another
              </Button>
            </div>
          </section>
        )}
      </div>

      <AdZone id="free-time-fixer-bottom" size="728x90" />

      <HowToUse
        steps={[
          "Choose how much free time you have",
          "Pick your current mood",
          "Get an instant personalized activity suggestion",
        ]}
      />

      <ToolSeoContent
        title="Free Time Zone Converter — Convert Times Between Time Zones"
        description="Convert times between any two time zones instantly. Schedule meetings across time zones, find the overlap, and avoid confusion. Free, no signup required."
        body={[
          "Skycally's Free Time Fixer converts times between any two time zones instantly and helps you find the best meeting windows when collaborating across different parts of the world. Select your source and destination time zones, enter a time, and see the equivalent local time immediately — no mental arithmetic required.",
          "Time zone conversion is one of the most error-prone tasks in international collaboration. A simple mistake — forgetting daylight saving time, miscounting half-hour offsets, or confusing AM and PM across a date boundary — can cause missed meetings and wasted hours. This tool handles all edge cases automatically, including DST transitions and unusual offsets like UTC+5:30 (India) or UTC+9:30 (Australia Central).",
          "The tool is especially useful for remote teams, freelancers working with international clients, travelers planning calls home, and anyone scheduling cross-border meetings. Enter your local time and instantly see what time it is — or will be — in the other location, including the correct date when the conversion crosses midnight.",
          "All time zones in the IANA timezone database are supported, covering every country and territory worldwide. The tool uses your browser's built-in Intl API for accurate conversion, including current and historical daylight saving time rules for all supported regions.",
        ]}
        faqs={[
          {
            question: "How do I convert a time between time zones?",
            answer:
              "Select your source time zone, enter the time you want to convert, then select your destination time zone. The converted time appears instantly including the correct date if the conversion crosses midnight.",
          },
          {
            question: "Does the tool account for daylight saving time?",
            answer:
              "Yes. The tool uses the IANA timezone database via the browser's Intl API, which includes current and historical DST rules for all supported regions.",
          },
          {
            question: "What time zones are supported?",
            answer:
              "All IANA time zones are supported — covering every country and territory worldwide, including unusual offsets like UTC+5:30 (India), UTC+5:45 (Nepal), and UTC+9:30 (Australia Central).",
          },
          {
            question: "What is UTC?",
            answer:
              "UTC (Coordinated Universal Time) is the primary time standard by which the world regulates clocks. Time zones are expressed as offsets from UTC — for example, UTC+1 is one hour ahead of UTC.",
          },
          {
            question: "How do I schedule a meeting across time zones?",
            answer:
              "Enter your local meeting time and select both your time zone and your colleague's time zone. The tool shows the equivalent time at their location, so you can confirm everyone is available.",
          },
          {
            question: "What happens when a conversion crosses midnight?",
            answer:
              "The tool shows the correct date for the converted time — for example, converting 11 PM New York to Tokyo time shows the next day's time since Tokyo is 13-14 hours ahead.",
          },
          {
            question: "Does this tool track or store my searches?",
            answer: "No. All conversions happen locally in your browser. Nothing is logged or stored.",
          },
          {
            question: "Does this work on mobile?",
            answer: "Yes. The interface is fully responsive and works on all screen sizes.",
          },
        ]}
      />

      <RelatedTools currentSlug="free-time-fixer" />
    </ToolPageShell>
  );
}
