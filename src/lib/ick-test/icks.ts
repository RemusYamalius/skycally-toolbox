export type IckCategory =
  | "appearance"
  | "habits"
  | "texting"
  | "social"
  | "dating"
  | "food"
  | "general";

export interface Ick {
  text: string;
  category: IckCategory;
}

export const CATEGORY_META: { id: IckCategory; label: string; emoji: string; gradient: string }[] = [
  { id: "appearance", label: "Appearance", emoji: "🪞", gradient: "linear-gradient(135deg,#f472b6,#a855f7)" },
  { id: "habits", label: "Habits", emoji: "🚶", gradient: "linear-gradient(135deg,#fbbf24,#f97316)" },
  { id: "texting", label: "Texting", emoji: "📱", gradient: "linear-gradient(135deg,#3b82f6,#06b6d4)" },
  { id: "social", label: "Social", emoji: "👀", gradient: "linear-gradient(135deg,#22c55e,#14b8a6)" },
  { id: "dating", label: "Dating", emoji: "💔", gradient: "linear-gradient(135deg,#ef4444,#ec4899)" },
  { id: "food", label: "Food", emoji: "🍽️", gradient: "linear-gradient(135deg,#84cc16,#22c55e)" },
  { id: "general", label: "General", emoji: "✨", gradient: "linear-gradient(135deg,#8b5cf6,#6366f1)" },
];

const APPEARANCE: string[] = [
  "Wears sunglasses indoors and keeps pushing them up like they're glasses",
  "Runs for the bus with their elbows glued to their sides",
  "Poses for photos with the exact same tilted head every single time",
  "Checks their reflection in every dark window you walk past",
  "Wears a blazer over a hoodie and calls it a look",
  "Has a haircut that only works from one very specific angle",
  "Adjusts their hair after every single sentence",
  "Wears brand new white trainers and walks like the floor is lava",
  "Buttons the top button of a shirt with nothing underneath it",
  "Flexes slightly the moment a camera appears",
  "Wears a watch two sizes too big and keeps sliding it back up",
  "Sits down and immediately fixes the crease in their jeans",
  "Rolls their sleeves up in a very rehearsed three-step move",
  "Owns one hat they never take off, even indoors",
  "Squints in every photo because they refuse to wear their glasses",
  "Wears a suit jacket with the brand sticker still on the sleeve",
  "Takes a full ten seconds to find their good side before a selfie",
  "Keeps a comb in their back pocket and uses it in public",
  "Sprays cologne in front of you like it's a performance",
  "Wears socks with sliders and defends the choice in detail",
  "Has exactly one very obviously plucked eyebrow",
  "Tucks a t-shirt into gym shorts",
  "Walks with one hand permanently in their pocket like a catalogue model",
  "Gets a fake tan two full shades away from their own neck",
  "Wears a scarf indoors in the middle of summer",
  "Keeps checking their teeth in the front camera at the table",
  "Puts their hood up the second one raindrop lands",
  "Changes into sliders at a formal event to save their shoes",
  "Insists on standing on a step in every group photo",
];

const HABITS: string[] = [
  "Narrates the traffic while driving as if it's a live sport",
  "Says \"as I always say\" before something they have never said",
  "Claps when the plane lands",
  "Hums the same stuck song badly for an entire day",
  "Reads every road sign out loud",
  "Taps the table with a pen through an entire conversation",
  "Cracks their knuckles one by one before starting anything",
  "Repeats the last three words you said quietly to themselves",
  "Sighs loudly before answering a completely simple question",
  "Puts the milk back in the fridge with two drops left in it",
  "Lets the alarm go off nine times before moving",
  "Talks to the microwave while waiting for it",
  "Blows their nose like a foghorn in a silent room",
  "Chews gum with their mouth open during a serious talk",
  "Announces out loud every time they go to the toilet",
  "Says \"beep beep\" when squeezing past someone",
  "Watches videos at full volume in public with no headphones",
  "Bites their nails and then inspects them closely",
  "Stretches with a full groan every single time they stand up",
  "Keeps saying \"anyway\" without ever changing the subject",
  "Reorganises your kitchen without asking",
  "Counts money out loud very slowly at the till",
  "Leaves the car indicator on for a full mile",
  "Whistles the same four notes on repeat",
  "Types with two fingers while staring at the keyboard the whole time",
  "Answers \"we'll see\" to absolutely everything",
  "Answers rhetorical questions seriously",
  "Chews ice loudly",
  "Reads over your shoulder and reacts before you finish the line",
];

const TEXTING: string[] = [
  "Leaves you on read then posts a story fifteen seconds later",
  "Sends nine separate messages instead of one",
  "Puts a full stop at the end of every single text",
  "Replies with just \"k\"",
  "Starts every voice note with a two-second silence",
  "Sends a four-minute voice note about nothing at all",
  "Types for a full minute and then sends one word",
  "Uses the crying-laughing emoji after their own boring statement",
  "Replies \"haha\" once, flat, with nothing else",
  "Answers a message from three days ago with no explanation",
  "Uses hashtags in a private chat",
  "Sends screenshots of conversations you weren't part of with no context",
  "Says \"we need to talk\" and then goes offline for six hours",
  "Reacts to your whole paragraph with a thumbs up",
  "Calls instead of texting one short question",
  "Sends the same good morning text with the same three emojis daily",
  "Puts a semicolon in a casual text message",
  "Sends \"u up?\" at 2am and never mentions it again",
  "Corrects your typos instead of answering the question",
  "Types in all lowercase then randomly capitalises one word for emphasis",
  "Sends \"?\" after four minutes of no reply",
  "Forwards chain messages",
  "Sends a link with no explanation of what the link is",
  "Writes \"read the whole thing\" above a wall of text",
  "Sends a meme and then explains the meme",
  "Changes the group chat name for the fifth time today",
  "Uses \"per my last message\" in a friendly conversation",
  "Sends a heart emoji and immediately unsends it",
  "Replies to a joke with \"I don't get it\" and then goes quiet",
];

const SOCIAL: string[] = [
  "Laughs at their own joke before they even finish it",
  "Orders for the whole table without asking anyone",
  "Checks whether people are still listening halfway through their own story",
  "Says \"no offence\" and then says the offensive thing anyway",
  "Argues with a waiter about something the waiter cannot fix",
  "Introduces themselves with their job title first",
  "Uses your name three times in one sentence",
  "Interrupts only to correct which year something happened",
  "Talks about a book they have only read the summary of",
  "Films strangers for content",
  "Takes a speakerphone call on public transport",
  "Mentions the celebrity they met eleven years ago in every conversation",
  "Claims they don't do drama while telling you everyone else's",
  "Explains a joke you already laughed at",
  "Says \"trust me, I'm a people person\"",
  "Only laughs when other people are watching",
  "Reminds you they paid for something two months ago",
  "Misses a high five and insists on trying again",
  "Turns every conversation back into a story about themselves",
  "Whispers to one person in a group of five",
  "Takes twenty minutes to say goodbye and still doesn't leave",
  "Claps to get the group's attention",
  "Sends the group a fifteen-photo dump of only themselves",
  "Pretends to know the song and mumbles the chorus loudly",
  "Says \"I'm just brutally honest\" before being neither",
  "Tries out an accent that absolutely nobody asked for",
  "Brings up their daily step count unprompted",
  "Answers a question that was clearly asked to someone else",
];

const DATING: string[] = [
  "Still ends serious sentences with \"lol\"",
  "Asks what you're thinking every eleven minutes",
  "Splits the bill down to the penny including a tip they didn't leave",
  "Calls their ex crazy within the first hour",
  "Lays out their five-year plan on a first date",
  "Says \"you're not like other people\" as if it's a compliment",
  "Checks their phone under the table and thinks the glow is invisible",
  "Orders a salad and then eats half of yours",
  "Refers to themselves in the third person while flirting",
  "Says \"I don't usually do this\" about something they clearly do often",
  "Winks",
  "Compares you to a character from a show you've never seen",
  "Says \"we'll figure it out\" about literally every plan",
  "Brings up their gym routine before the drinks even arrive",
  "Asks you to rate the date out of ten while the date is happening",
  "Uses pet names before learning your surname",
  "Speaks to the waiter in a completely different voice",
  "Says \"my mum would love you\" on date one",
  "Waits three days to reply on purpose as a tactic",
  "Insists their star sign explains all of their behaviour",
  "Reaches for the bill extremely slowly",
  "Says they're bad at texting while replying to everyone else instantly",
  "Brings a friend along to a first date with no warning",
  "Asks if you're seeing anyone else and goes quiet about their own answer",
  "Sends you a playlist and then asks for detailed feedback on it",
  "Describes themselves as an old soul",
  "Photographs the meal from four angles before anyone is allowed to eat",
  "Says \"let's keep it casual\" and then checks who liked your photos",
];

const FOOD: string[] = [
  "Blows on food dramatically before every single bite",
  "Orders the exact same dish everywhere and calls it research",
  "Chews with the fork still in their mouth",
  "Puts ketchup on everything before tasting any of it",
  "Says \"mmm\" out loud after every mouthful",
  "Cuts pizza with a knife and fork at a very casual place",
  "Eats fries one at a time, extremely slowly",
  "Sends food back for a reason nobody at the table understands",
  "Licks their fingers and then reaches into the shared bowl",
  "Describes what they're eating like they're presenting a cooking show",
  "Only drinks room-temperature water and mentions it every time",
  "Stirs their tea against the mug for a full minute",
  "Steals a chip while insisting they aren't hungry",
  "Says \"I could eat\" while already eating",
  "Asks the waiter what's good and then ignores every suggestion",
  "Puts an ice cube in hot soup",
  "Eats the topping off the pizza and leaves the base behind",
  "Talks about macros while everyone else is ordering dessert",
  "Drinks a smoothie loudly through the straw down to the last bubble",
  "Insists on trying yours instead of just ordering it",
  "Salts the food before tasting it at someone else's house",
  "Refuses to eat anything if two sauces touch",
  "Reheats fish in a shared office microwave",
  "Announces they're doing a cleanse in the middle of dinner",
  "Chews cereal like it's a timed competition",
  "Buys the expensive bread and lets it go stale",
  "Orders a foreign dish in a heavy accent and repeats it twice",
  "Takes the last slice and asks if anyone wanted it while chewing",
];

const GENERAL: string[] = [
  "Walks through a door and just lets it close on the person behind them",
  "Stands far too close to you in a completely empty queue",
  "Presses the lift button that's already lit, repeatedly",
  "Walks very slowly in the middle of a busy pavement",
  "Puts their bag on the free seat on a packed train",
  "Reclines the plane seat fully within the first minute",
  "Never says thank you when someone holds a door open",
  "Talks through the last ten minutes of a film",
  "Takes their shoes off on public transport",
  "Leaves the shopping trolley in the middle of the car park",
  "Cuts the queue and pretends to be confused about it",
  "Stops dead at the top of an escalator",
  "Uses the last of the toilet roll and leaves the empty tube",
  "Honks the horn half a second after the light turns green",
  "Answers a phone call in the cinema",
  "Argues about a two-pound difference for twenty minutes",
  "Watches videos at double speed with the sound on right next to you",
  "Leaves read receipts on and still ignores everyone",
  "Loudly explains museum exhibits incorrectly",
  "Puts their feet on the dashboard of someone else's car",
  "Never returns a borrowed pen and then borrows another one",
  "Takes the aux and plays only their own songs",
  "Complains about the temperature of every single room",
  "Books a table for six and turns up with nine people",
  "Vapes indoors in a cloud you can see from another room",
  "Leaves one square of chocolate in the wrapper and puts it back",
  "Says they never get sick and then coughs directly on you",
  "Drops litter and blames the wind",
  "Puts an empty carton back in the fridge",
];

const build = (items: string[], category: IckCategory): Ick[] => items.map((text) => ({ text, category }));

export const ICKS: Ick[] = [
  ...build(APPEARANCE, "appearance"),
  ...build(HABITS, "habits"),
  ...build(TEXTING, "texting"),
  ...build(SOCIAL, "social"),
  ...build(DATING, "dating"),
  ...build(FOOD, "food"),
  ...build(GENERAL, "general"),
];

export const ICK_TOTAL = ICKS.length;

// Build-time sanity check — mirrors src/lib/never-have-i-ever/statements.ts.
if (import.meta.env?.DEV) {
  const seen = new Set<string>();
  const dupes: string[] = [];
  const tally: Record<string, number> = {};
  for (const s of ICKS) {
    const key = s.text.trim().toLowerCase();
    if (seen.has(key)) dupes.push(s.text);
    seen.add(key);
    tally[s.category] = (tally[s.category] ?? 0) + 1;
  }
  if (dupes.length) console.warn("[ick-test] duplicate icks:", dupes);
  for (const c of CATEGORY_META) {
    if (!tally[c.id]) console.warn(`[ick-test] category "${c.id}" has no icks`);
  }
  if (ICKS.length !== 200) console.warn(`[ick-test] expected 200 icks, found ${ICKS.length}`);
}
