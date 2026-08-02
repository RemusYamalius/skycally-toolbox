export type FlagCategory =
  | "communication"
  | "respect"
  | "emotional"
  | "effort"
  | "social"
  | "conflict";

export interface Behavior {
  text: string;
  category: FlagCategory;
}

export const CATEGORY_META: {
  id: FlagCategory;
  label: string;
  emoji: string;
  gradient: string;
}[] = [
  { id: "communication", label: "Communication", emoji: "💬", gradient: "linear-gradient(135deg,#3b82f6,#06b6d4)" },
  { id: "respect", label: "Respect", emoji: "🤝", gradient: "linear-gradient(135deg,#8b5cf6,#6366f1)" },
  { id: "emotional", label: "Emotional", emoji: "🫀", gradient: "linear-gradient(135deg,#ec4899,#f43f5e)" },
  { id: "effort", label: "Effort", emoji: "🎁", gradient: "linear-gradient(135deg,#f59e0b,#f97316)" },
  { id: "social", label: "Social Life", emoji: "🧑‍🤝‍🧑", gradient: "linear-gradient(135deg,#22c55e,#14b8a6)" },
  { id: "conflict", label: "Conflict", emoji: "⚡", gradient: "linear-gradient(135deg,#ef4444,#b91c1c)" },
];

const COMMUNICATION: string[] = [
  "Tells you plainly when something you did upset them instead of going quiet",
  "Goes silent for two days after a small disagreement",
  "Answers \"nothing\" when they're obviously bothered by something",
  "Says \"I need a bit of time, I'll come back to this tonight\" and actually does",
  "Reads your message, ignores it, then posts a story straight after",
  "Asks follow-up questions about the thing you were nervous about",
  "Brings up something you said months ago to win an argument",
  "Tells you their plans for the weekend without being asked",
  "Makes you guess what mood they're in every morning",
  "Says \"we'll talk about it later\" and then never mentions it again",
  "Repeats back what you said to check they understood it correctly",
  "Talks over you every time you start a sentence",
  "Sends a long paragraph explaining their feelings instead of shutting down",
  "Answers serious questions with a joke every single time",
  "Tells you when they need space instead of just disappearing",
  "Corrects the small details of your story while you're telling it",
  "Checks in during the day just to see how your thing went",
  "Uses sarcasm as their only way of expressing frustration",
  "Says \"I don't want to argue over text, can we call?\"",
  "Gives you the silent treatment as a punishment",
  "Admits when they don't know how to talk about something yet",
  "Talks about you in a mocking voice when retelling your words",
  "Remembers a small worry you mentioned once and asks about it",
  "Interrupts a serious conversation to scroll their phone",
  "Says exactly what they want instead of dropping hints for a week",
  "Sighs loudly instead of saying what's wrong",
  "Tells you honestly when they're not free rather than inventing an excuse",
  "Changes their story about where they were",
  "Apologises specifically for what they did, not with a vague \"sorry you feel that way\"",
  "Threatens to end things every time a conversation gets hard",
  "Tells you good news first, before telling anyone else",
  "Reads your messages out loud to their friends for laughs",
  "Asks how you'd like to be supported instead of assuming",
  "Answers every complaint with \"you're too sensitive\"",
];

const RESPECT: string[] = [
  "Remembers a boundary you set once and never tests it again",
  "Goes through your phone while you're asleep",
  "Introduces you by name and role to everyone in the room",
  "Makes jokes about your body in front of other people",
  "Defends you when someone talks down to you",
  "Tells you what you're allowed to wear",
  "Says thank you for small everyday things you do",
  "Comments on how much you eat",
  "Respects a \"no\" the first time without negotiating",
  "Reads your messages over your shoulder and asks who that is",
  "Speaks kindly to waiters, drivers and cleaners",
  "Talks badly about all their exes without exception",
  "Keeps things you told them in confidence to themselves",
  "Mocks your hobby in front of your friends",
  "Asks before sharing a photo of you online",
  "Shows up an hour late and never explains why",
  "Takes your career seriously and asks about your work",
  "Rolls their eyes when you speak",
  "Learns how to pronounce your family's names properly",
  "Uses your insecurities as material in arguments",
  "Knocks before opening a closed door",
  "Compares you to their ex out loud",
  "Says your name warmly rather than a nickname you asked them to drop",
  "Reads your journal or diary",
  "Waits for you to finish talking before replying",
  "Makes decisions about your shared plans without telling you",
  "Treats your parents with genuine courtesy",
  "Makes fun of your accent or the way you say words",
  "Respects that you have private friendships",
  "Tells you what you're allowed to post",
  "Cleans up their own mess without being asked",
  "Laughs when you say something hurt you",
  "Says \"that's your call\" about things that are genuinely yours to decide",
];

const EMOTIONAL: string[] = [
  "Sits with you while you cry without trying to fix it",
  "Makes you feel like your feelings are an inconvenience",
  "Says \"that makes sense\" before offering their own view",
  "Withdraws affection when you disagree with them",
  "Owns up to a bad mood instead of taking it out on you",
  "Says they'd be nothing without you, constantly and heavily",
  "Notices you've gone quiet and gently asks why",
  "Calls you dramatic when you're upset",
  "Talks openly about their own therapy or self-work",
  "Tells you nobody else would put up with you",
  "Celebrates your wins without making it about themselves",
  "Rewrites what happened until you doubt your own memory",
  "Admits when they're jealous instead of acting on it silently",
  "Punishes you for days after a mistake",
  "Says \"I love you\" without needing it back immediately",
  "Makes you responsible for managing all their moods",
  "Handles your bad days without keeping score",
  "Gets cold and distant whenever you succeed at something",
  "Tells you they're proud of you and means it",
  "Uses your past mistakes as a permanent argument card",
  "Comforts you the way you asked for, not the way they prefer",
  "Cries during arguments to stop you raising an issue",
  "Says \"I was wrong\" without adding a \"but\"",
  "Makes you feel guilty for spending money on yourself",
  "Checks in after a hard day at your job",
  "Threatens self-harm to stop you leaving a conversation",
  "Lets you be in a bad mood without demanding you cheer up",
  "Compares your problems to theirs to prove yours are smaller",
  "Notices when you're overwhelmed and quietly takes something off your plate",
  "Says \"you're overreacting\" as a reflex",
  "Talks about their fears with you rather than hiding them",
  "Makes you audition for their affection every week",
  "Sends a message just to say they were thinking about you",
];

const EFFORT: string[] = [
  "Plans a date around something you mentioned liking once",
  "Only makes plans when they're bored and nothing else is on",
  "Learns your coffee order without being told twice",
  "Cancels last minute more often than they show up",
  "Splits the mental load of chores without being asked",
  "Expects you to organise every single plan",
  "Drives across town to pick you up in bad weather",
  "Says \"we should do that\" about everything and books nothing",
  "Texts good morning consistently, not just when they want something",
  "Forgets your birthday two years running",
  "Fixes the thing you mentioned was annoying you at home",
  "Only calls after midnight",
  "Saves you the last slice without making a speech about it",
  "Makes you pay for everything and calls it \"balance\"",
  "Turns up to your family events on time and dressed for it",
  "Disappears for a week and comes back like nothing happened",
  "Reads the book you recommended and talks to you about it",
  "Won't put your name in their calendar",
  "Books time off work for something that matters to you",
  "Treats your effort as the baseline and their own as heroic",
  "Learns the basics of your hobby just to share it with you",
  "Only shows effort right after an argument, then stops again",
  "Remembers the anniversary of something painful for you and checks in",
  "Leaves you waiting outside in the rain because they lost track of time",
  "Cooks for you when you've had a long week",
  "Never asks a single question about your day",
  "Keeps their promises about small things, not just big ones",
  "Makes plans with you and cancels for a better offer",
  "Puts your name on the guest list without you asking",
  "Uses \"I'm just bad at texting\" as a permanent excuse",
  "Handles their share of admin, bills and appointments",
  "Waits for you to solve every problem in the relationship",
  "Shows up to the hospital appointment you were dreading",
  "Says they'd help and then does it slowly enough that you do it yourself",
];

const SOCIAL: string[] = [
  "Encourages you to see your friends without you",
  "Sulks every time you make plans without them",
  "Gets on with your friends and remembers their names",
  "Tries to convince you your best friend is bad for you",
  "Is exactly the same person around their friends as with you",
  "Flirts with other people right in front of you",
  "Posts about you happily but doesn't need to prove anything",
  "Refuses to tell anyone you're together",
  "Keeps their own friendships and hobbies alive",
  "Wants to know your location at all times",
  "Invites you into their world without pressuring you",
  "Gets angry when you reply to a friend's message during dinner",
  "Says nice things about you when you're not in the room",
  "Makes every group hangout about themselves",
  "Respects that you're close with an ex-colleague or old friend",
  "Interrogates you about who you talked to at work",
  "Is happy to spend an evening apart without drama",
  "Makes you delete people from your social media",
  "Includes you in family plans naturally",
  "Talks about you as \"my one\" to friends and \"just someone\" to strangers",
  "Encourages your friendships that they aren't part of",
  "Reads your group chats without asking",
  "Handles you having a night out without a single check-up call",
  "Turns cold when you get attention from anyone",
  "Backs you up in front of their family when it matters",
  "Tells their friends private details about your relationship",
  "Never makes you choose between them and your people",
  "Compares your friendship group unfavourably to theirs",
  "Is happy to sit quietly with you in a group and not perform",
  "Accuses you of cheating with no reason at all",
  "Notices when a friendship of yours is draining you and says so kindly",
  "Only introduces you to people once things are official on their terms",
  "Keeps a mental list of everyone you've ever mentioned",
];

const CONFLICT: string[] = [
  "Argues about the issue instead of attacking who you are",
  "Brings up ten unrelated things during one disagreement",
  "Suggests a break in the argument before things get ugly",
  "Slams doors and throws things when angry",
  "Comes back after cooling down and finishes the conversation",
  "Storms out and leaves you on the street",
  "Says \"I understand why that upset you\" even when they disagree",
  "Raises their voice until you stop speaking",
  "Never brings your family into an argument",
  "Calls you names in the heat of the moment",
  "Apologises without needing to be chased for it",
  "Keeps a running scoreboard of who was right",
  "Accepts an apology without dragging it out for a week",
  "Blocks you mid-argument and unblocks you the next day",
  "Says \"how do we fix this?\" instead of \"you always do this\"",
  "Turns every disagreement into a threat to break up",
  "Admits their part even when yours was bigger",
  "Drives dangerously when angry with you",
  "Lets you finish your point without cutting in",
  "Tells mutual friends their version before speaking to you",
  "Agrees on a rule for arguments and sticks to it",
  "Uses money as leverage during a fight",
  "Doesn't punish you with silence after making up",
  "Brings up your therapy or diagnosis as an insult",
  "Says \"I'd rather be kind than right\" and acts like it",
  "Refuses to ever say sorry on principle",
  "Checks whether you feel resolved before moving on",
  "Escalates to shouting within thirty seconds",
  "Takes accountability the next day if they were unfair",
  "Makes you apologise for their behaviour",
  "Asks what you need from them after a fight",
  "Blames alcohol every single time they cross a line",
  "Talks about patterns calmly rather than blowing up each time",
];

const build = (items: string[], category: FlagCategory): Behavior[] =>
  items.map((text) => ({ text, category }));

export const BEHAVIORS: Behavior[] = [
  ...build(COMMUNICATION, "communication"),
  ...build(RESPECT, "respect"),
  ...build(EMOTIONAL, "emotional"),
  ...build(EFFORT, "effort"),
  ...build(SOCIAL, "social"),
  ...build(CONFLICT, "conflict"),
];

export const BEHAVIOR_TOTAL = BEHAVIORS.length;

// Build-time sanity check — mirrors src/lib/ick-test/icks.ts.
if (import.meta.env?.DEV) {
  const seen = new Set<string>();
  const dupes: string[] = [];
  const tally: Record<string, number> = {};
  for (const b of BEHAVIORS) {
    const key = b.text.trim().toLowerCase();
    if (seen.has(key)) dupes.push(b.text);
    seen.add(key);
    tally[b.category] = (tally[b.category] ?? 0) + 1;
  }
  if (dupes.length) console.warn("[red-flag-green-flag] duplicates:", dupes);
  for (const c of CATEGORY_META) {
    if (!tally[c.id]) console.warn(`[red-flag-green-flag] category "${c.id}" has no behaviors`);
  }
  if (BEHAVIORS.length !== 200)
    console.warn(`[red-flag-green-flag] expected 200 behaviors, found ${BEHAVIORS.length}`);
}
