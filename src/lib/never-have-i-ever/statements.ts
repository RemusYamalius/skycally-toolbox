export type NhieCategory = "funny" | "embarrassing" | "travel" | "food" | "dating" | "school-work" | "bold";

export interface NhieStatement {
  text: string;
  category: NhieCategory;
}

export const NHIE_CATEGORIES: { id: NhieCategory; label: string; emoji: string; gradient: string }[] = [
  { id: "funny", label: "Funny", emoji: "😂", gradient: "linear-gradient(135deg,#f59e0b,#f97316)" },
  { id: "embarrassing", label: "Embarrassing", emoji: "🙈", gradient: "linear-gradient(135deg,#ef4444,#ec4899)" },
  { id: "travel", label: "Travel", emoji: "✈️", gradient: "linear-gradient(135deg,#0ea5e9,#06b6d4)" },
  { id: "food", label: "Food", emoji: "🍕", gradient: "linear-gradient(135deg,#84cc16,#22c55e)" },
  { id: "dating", label: "Dating", emoji: "💘", gradient: "linear-gradient(135deg,#f43f5e,#a855f7)" },
  { id: "school-work", label: "School & Work", emoji: "🎓", gradient: "linear-gradient(135deg,#6366f1,#3b82f6)" },
  { id: "bold", label: "Bold", emoji: "🔥", gradient: "linear-gradient(135deg,#a855f7,#6366f1)" },
];

const FUNNY: string[] = [
  "Never have I ever laughed so hard that I made no sound at all.",
  "Never have I ever waved back at someone who was waving at the person behind me.",
  "Never have I ever talked to a pet like it was a coworker.",
  "Never have I ever lost an argument with a self-checkout machine.",
  "Never have I ever practised a conversation in the shower that never happened.",
  "Never have I ever pretended to know a song and mumbled every word.",
  "Never have I ever tripped over absolutely nothing in public.",
  "Never have I ever hidden in another aisle to avoid saying hello to someone.",
  "Never have I ever named an inanimate object in my house.",
  "Never have I ever tried to look busy while doing nothing at all.",
  "Never have I ever pushed a door clearly marked pull with someone watching.",
  "Never have I ever laughed at the worst possible moment.",
  "Never have I ever pretended my phone was ringing to escape a conversation.",
  "Never have I ever danced alone like the room was full of people.",
  "Never have I ever narrated my own life in a documentary voice.",
  "Never have I ever forgotten why I walked into a room three times in a row.",
  "Never have I ever argued with a fictional character out loud.",
  "Never have I ever taken a photo of my own foot by accident and kept it.",
  "Never have I ever tried to blow out a candle in a video call.",
  "Never have I ever put something in the fridge that absolutely did not belong there.",
  "Never have I ever wore two different shoes outside without noticing.",
  "Never have I ever given directions to a place I had never been.",
  "Never have I ever laughed at my own joke before finishing it.",
  "Never have I ever pretended a plant was still alive for weeks.",
  "Never have I ever been beaten at a game by someone much younger than me.",
];

const EMBARRASSING: string[] = [
  "Never have I ever sent a message to the wrong group chat.",
  "Never have I ever called a teacher or a boss by the wrong name.",
  "Never have I ever walked around with something stuck in my teeth all day.",
  "Never have I ever fallen asleep somewhere very public.",
  "Never have I ever replied to a wave that was meant for someone else.",
  "Never have I ever forgotten someone's name while introducing them.",
  "Never have I ever left a voice message I immediately regretted.",
  "Never have I ever ripped clothing at the worst possible moment.",
  "Never have I ever sung out loud with headphones on in a quiet room.",
  "Never have I ever left a video call not realising my camera was still on.",
  "Never have I ever mispronounced a word confidently for years.",
  "Never have I ever tried to sneak out of an event and got caught at the door.",
  "Never have I ever spilled a drink on someone I was trying to impress.",
  "Never have I ever waved at a stranger thinking they were a friend.",
  "Never have I ever gone to the wrong house or the wrong car by mistake.",
  "Never have I ever been caught taking a selfie by someone in the background.",
  "Never have I ever laughed so hard a drink came out of my nose.",
  "Never have I ever forgotten a close friend's birthday completely.",
  "Never have I ever answered a question that nobody asked me.",
  "Never have I ever said goodbye and then walked in the same direction as the person.",
  "Never have I ever accidentally liked a very old photo while scrolling.",
  "Never have I ever tried to whisper and been heard by the whole room.",
  "Never have I ever fallen up a set of stairs.",
  "Never have I ever worn my shirt inside out for an entire day.",
  "Never have I ever told a story and realised halfway that I told it already.",
];

const TRAVEL: string[] = [
  "Never have I ever missed a flight, a train or a bus by minutes.",
  "Never have I ever slept in an airport overnight.",
  "Never have I ever travelled to another country completely alone.",
  "Never have I ever forgotten to pack something essential for a trip.",
  "Never have I ever got lost in a city without any working data.",
  "Never have I ever taken a trip decided less than 24 hours in advance.",
  "Never have I ever swum in the sea at night.",
  "Never have I ever watched a sunrise after staying awake the whole night.",
  "Never have I ever hiked a mountain to the very top.",
  "Never have I ever left my luggage behind somewhere.",
  "Never have I ever booked a place that looked nothing like the pictures.",
  "Never have I ever ridden on the roof or the back of a moving vehicle.",
  "Never have I ever visited a place mainly because of a film or a show.",
  "Never have I ever taken a road trip longer than eight hours.",
  "Never have I ever tried to speak a language I do not know to a local.",
  "Never have I ever camped somewhere with no electricity.",
  "Never have I ever changed my travel plans because of the weather.",
  "Never have I ever fallen asleep and missed my stop.",
  "Never have I ever made a lasting friendship with someone I met on a trip.",
  "Never have I ever visited a place only to take one photo.",
  "Never have I ever gone somewhere and never left the hotel.",
  "Never have I ever driven somewhere with no destination in mind.",
];

const FOOD: string[] = [
  "Never have I ever eaten dessert before the main meal.",
  "Never have I ever burnt something that only needed boiling water.",
  "Never have I ever eaten food that fell on the floor.",
  "Never have I ever pretended to like a meal someone cooked for me.",
  "Never have I ever eaten straight out of the pan to avoid dishes.",
  "Never have I ever finished a whole tub of ice cream alone.",
  "Never have I ever tried a food I could not pronounce.",
  "Never have I ever eaten breakfast food for dinner three days in a row.",
  "Never have I ever put an unusual topping on pizza and loved it.",
  "Never have I ever ordered the same dish at the same place more than ten times.",
  "Never have I ever cooked something and refused to let anyone taste it.",
  "Never have I ever eaten something past its date on purpose.",
  "Never have I ever taken food from someone's plate without asking.",
  "Never have I ever cried while cutting onions and blamed something else.",
  "Never have I ever eaten a meal at 3am.",
  "Never have I ever hidden snacks so nobody else would find them.",
  "Never have I ever pretended a dish was homemade when it was not.",
  "Never have I ever tried to recreate a restaurant meal and failed badly.",
  "Never have I ever drunk the last of something and put the empty container back.",
  "Never have I ever eaten something purely because of how it looked online.",
  "Never have I ever burnt my mouth and kept eating anyway.",
  "Never have I ever gone grocery shopping hungry and regretted every choice.",
];

const DATING: string[] = [
  "Never have I ever rehearsed what to say before sending one message.",
  "Never have I ever been on a date that ended in under an hour.",
  "Never have I ever pretended to share a hobby to impress someone.",
  "Never have I ever asked a friend to call me during a date as an escape plan.",
  "Never have I ever fallen for someone I only knew through a screen.",
  "Never have I ever written a message and deleted it more than five times.",
  "Never have I ever gone on a date with someone a friend chose for me.",
  "Never have I ever forgotten an anniversary or an important date.",
  "Never have I ever said the wrong name at the worst moment.",
  "Never have I ever stayed friends with someone I used to date.",
  "Never have I ever agreed to a date just to be polite.",
  "Never have I ever been caught looking at someone's profile far too late at night.",
  "Never have I ever made a playlist for someone.",
  "Never have I ever been the third wheel on purpose.",
  "Never have I ever changed my route just to walk past someone.",
  "Never have I ever kept a gift from someone long after things ended.",
  "Never have I ever asked someone out and been turned down kindly.",
  "Never have I ever pretended not to see someone I recognised in public.",
  "Never have I ever cooked a meal to impress a date.",
  "Never have I ever had a crush on a friend's sibling.",
  "Never have I ever been set up and actually liked it.",
  "Never have I ever apologised first just to end an argument faster.",
  "Never have I ever laughed at a joke I did not find funny on a date.",
  "Never have I ever kept an old message thread I should have deleted.",
];

const SCHOOL_WORK: string[] = [
  "Never have I ever pretended my internet was broken to leave a meeting.",
  "Never have I ever finished a whole project the night before it was due.",
  "Never have I ever fallen asleep in a class or a meeting.",
  "Never have I ever sent an email without the attachment I mentioned.",
  "Never have I ever nodded along to something I completely did not understand.",
  "Never have I ever taken credit for a group effort a little too quickly.",
  "Never have I ever called in sick when I was perfectly fine.",
  "Never have I ever replied to a message hours later and claimed I just saw it.",
  "Never have I ever forgotten the name of a colleague I see every day.",
  "Never have I ever pretended to take notes while drawing.",
  "Never have I ever muted myself and complained out loud during a call.",
  "Never have I ever arrived somewhere on the wrong day.",
  "Never have I ever used a very serious tone to say something completely useless.",
  "Never have I ever scheduled a meeting that could have been one message.",
  "Never have I ever hidden a mistake and fixed it before anyone noticed.",
  "Never have I ever handed in work I finished in the last ten minutes.",
  "Never have I ever pretended to be busy so nobody would give me a new task.",
  "Never have I ever been the last person to realise a deadline moved.",
  "Never have I ever eaten lunch at my desk to avoid small talk.",
  "Never have I ever forgotten a password so many times I gave up.",
  "Never have I ever answered a question in class without reading anything.",
  "Never have I ever been caught by a teacher or a manager mid-yawn.",
];

const BOLD: string[] = [
  "Never have I ever told a secret I promised to keep.",
  "Never have I ever quit something on the very first day.",
  "Never have I ever confronted someone in front of other people.",
  "Never have I ever kept a grudge for more than a year.",
  "Never have I ever cut someone out of my life with no explanation.",
  "Never have I ever lied about my age.",
  "Never have I ever ended a friendship over something small.",
  "Never have I ever read something I was not supposed to read.",
  "Never have I ever told someone exactly what I thought of them.",
  "Never have I ever left an event without telling anyone.",
  "Never have I ever pretended not to receive a message on purpose.",
  "Never have I ever spent money I really should have saved.",
  "Never have I ever changed my mind about someone in a single conversation.",
  "Never have I ever apologised without meaning a single word.",
  "Never have I ever taken a huge risk that actually worked out.",
  "Never have I ever regretted staying somewhere too long.",
  "Never have I ever kept a talent completely hidden from my friends.",
  "Never have I ever told a lie that grew far bigger than expected.",
  "Never have I ever done something purely because someone said I could not.",
  "Never have I ever admitted I was wrong only after everyone else knew.",
];

const build = (items: string[], category: NhieCategory): NhieStatement[] => items.map((text) => ({ text, category }));

export const NHIE_STATEMENTS: NhieStatement[] = [
  ...build(FUNNY, "funny"),
  ...build(EMBARRASSING, "embarrassing"),
  ...build(TRAVEL, "travel"),
  ...build(FOOD, "food"),
  ...build(DATING, "dating"),
  ...build(SCHOOL_WORK, "school-work"),
  ...build(BOLD, "bold"),
];

export const NHIE_TOTAL = NHIE_STATEMENTS.length;

// Build-time sanity check — mirrors src/lib/big-five/items.ts so any future
// edit that introduces a duplicate or empties a category surfaces immediately.
if (import.meta.env?.DEV) {
  const seen = new Set<string>();
  const dupes: string[] = [];
  const tally: Record<string, number> = {};
  for (const s of NHIE_STATEMENTS) {
    const key = s.text.trim().toLowerCase();
    if (seen.has(key)) dupes.push(s.text);
    seen.add(key);
    tally[s.category] = (tally[s.category] ?? 0) + 1;
  }
  if (dupes.length) console.warn("[never-have-i-ever] duplicate statements:", dupes);
  for (const c of NHIE_CATEGORIES) {
    if (!tally[c.id]) console.warn(`[never-have-i-ever] category "${c.id}" has no statements`);
  }
}
