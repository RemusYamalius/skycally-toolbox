export interface BabySize {
  fruit: string;
  emoji: string;
  length: string;
  weight: string;
}

export const BABY_SIZES: Record<number, BabySize> = {
  4: { fruit: "Poppy seed", emoji: "🌱", length: "0.1 cm", weight: "<1 g" },
  5: { fruit: "Sesame seed", emoji: "🌿", length: "0.2 cm", weight: "<1 g" },
  6: { fruit: "Lentil", emoji: "🫘", length: "0.6 cm", weight: "<1 g" },
  7: { fruit: "Blueberry", emoji: "🫐", length: "1.0 cm", weight: "1 g" },
  8: { fruit: "Raspberry", emoji: "🫐", length: "1.6 cm", weight: "1 g" },
  9: { fruit: "Cherry", emoji: "🍒", length: "2.3 cm", weight: "2 g" },
  10: { fruit: "Strawberry", emoji: "🍓", length: "3.1 cm", weight: "4 g" },
  11: { fruit: "Lime", emoji: "🍋", length: "4.1 cm", weight: "7 g" },
  12: { fruit: "Plum", emoji: "🍑", length: "5.4 cm", weight: "14 g" },
  13: { fruit: "Peach", emoji: "🍑", length: "7.4 cm", weight: "23 g" },
  14: { fruit: "Lemon", emoji: "🍋", length: "8.7 cm", weight: "43 g" },
  15: { fruit: "Apple", emoji: "🍎", length: "10.1 cm", weight: "70 g" },
  16: { fruit: "Avocado", emoji: "🥑", length: "11.6 cm", weight: "100 g" },
  17: { fruit: "Pear", emoji: "🍐", length: "13 cm", weight: "140 g" },
  18: { fruit: "Bell pepper", emoji: "🫑", length: "14.2 cm", weight: "190 g" },
  19: { fruit: "Mango", emoji: "🥭", length: "15.3 cm", weight: "240 g" },
  20: { fruit: "Banana", emoji: "🍌", length: "16.4 cm", weight: "300 g" },
  21: { fruit: "Carrot", emoji: "🥕", length: "26.7 cm", weight: "360 g" },
  22: { fruit: "Papaya", emoji: "🍈", length: "27.8 cm", weight: "430 g" },
  23: { fruit: "Grapefruit", emoji: "🍊", length: "28.9 cm", weight: "500 g" },
  24: { fruit: "Corn", emoji: "🌽", length: "30 cm", weight: "600 g" },
  25: { fruit: "Cauliflower", emoji: "🥦", length: "34.6 cm", weight: "660 g" },
  26: { fruit: "Scallion", emoji: "🧅", length: "35.6 cm", weight: "760 g" },
  27: { fruit: "Cabbage", emoji: "🥬", length: "36.6 cm", weight: "875 g" },
  28: { fruit: "Eggplant", emoji: "🍆", length: "37.6 cm", weight: "1 kg" },
  29: { fruit: "Butternut squash", emoji: "🎃", length: "38.6 cm", weight: "1.15 kg" },
  30: { fruit: "Cabbage", emoji: "🥬", length: "39.9 cm", weight: "1.3 kg" },
  31: { fruit: "Coconut", emoji: "🥥", length: "41.1 cm", weight: "1.5 kg" },
  32: { fruit: "Jicama", emoji: "🧅", length: "42.4 cm", weight: "1.7 kg" },
  33: { fruit: "Pineapple", emoji: "🍍", length: "43.7 cm", weight: "1.9 kg" },
  34: { fruit: "Cantaloupe", emoji: "🍈", length: "45 cm", weight: "2.1 kg" },
  35: { fruit: "Honeydew melon", emoji: "🍈", length: "46.2 cm", weight: "2.4 kg" },
  36: { fruit: "Romaine lettuce", emoji: "🥬", length: "47.4 cm", weight: "2.6 kg" },
  37: { fruit: "Swiss chard", emoji: "🥬", length: "48.6 cm", weight: "2.9 kg" },
  38: { fruit: "Leek", emoji: "🧅", length: "49.8 cm", weight: "3.1 kg" },
  39: { fruit: "Watermelon", emoji: "🍉", length: "50.7 cm", weight: "3.3 kg" },
  40: { fruit: "Pumpkin", emoji: "🎃", length: "51.2 cm", weight: "3.5 kg" },
};

export interface WeeklyInfo {
  babyDev: string;
  momChanges: string;
  tip: string;
  milestone?: string;
}

export const WEEKLY_DATA: Record<number, WeeklyInfo> = {
  4: {
    babyDev:
      "The embryo implants in the uterine wall. The neural tube — which becomes the brain and spinal cord — begins forming.",
    momChanges:
      "You may notice a missed period. Some women experience light spotting (implantation bleeding) and mild cramping.",
    tip: "Start prenatal vitamins with folic acid if you haven't already. Avoid alcohol, smoking, and raw fish.",
    milestone: "🎉 Pregnancy confirmed!",
  },
  8: {
    babyDev:
      "All major organs have begun forming. Tiny fingers and toes are developing. The heart is beating at 150-170 bpm.",
    momChanges:
      "Morning sickness often peaks around this week. Fatigue, breast tenderness, and frequent urination are common.",
    tip: "Eat small, frequent meals to manage nausea. Ginger tea and crackers can help.",
  },
  12: {
    babyDev:
      "Your baby has fully formed fingers, toes, and nails. The digestive system is practicing contractions.",
    momChanges:
      "For many women, nausea begins to ease. Your uterus is now about the size of a grapefruit.",
    tip: "The risk of miscarriage drops significantly after week 12. Many parents choose to share their news now.",
    milestone: "✨ End of first trimester!",
  },
  16: {
    babyDev:
      "Baby can make sucking motions and may begin to hear sounds. The skeleton is hardening from cartilage to bone.",
    momChanges:
      "You may start to feel a small baby bump. Some women feel the first flutters of movement (quickening).",
    tip: "This is a good week for the anatomy scan (usually scheduled between weeks 18-22).",
  },
  20: {
    babyDev:
      "Baby is swallowing amniotic fluid and the digestive system is developing. You're halfway there!",
    momChanges:
      "Most women can now feel baby's movements clearly. Back pain may begin as your centre of gravity shifts.",
    tip: "Sleep on your left side to improve blood flow to the baby and reduce swelling.",
    milestone: "🎊 Halfway point!",
  },
  24: {
    babyDev:
      "Baby's lungs are developing surfactant, which will help them breathe after birth. Fingerprints are forming.",
    momChanges:
      "Braxton Hicks contractions (practice contractions) may begin. Stretch marks may appear.",
    tip: "Stay hydrated and moisturise your skin. Start researching childbirth classes.",
  },
  28: {
    babyDev:
      "Baby can open and close their eyes and may respond to light. Brain development is rapid.",
    momChanges:
      "Third trimester begins. Heartburn and shortness of breath become more common.",
    tip: "Schedule your glucose screening test (gestational diabetes) and Rh factor blood test.",
    milestone: "🌟 Third trimester begins!",
  },
  32: {
    babyDev:
      "Baby is practising breathing movements. Most babies are in a head-down position by now.",
    momChanges:
      "You may feel pressure in your pelvis. Swelling in hands and feet is common.",
    tip: "Start preparing your hospital bag. Install the car seat and research newborn care.",
  },
  36: {
    babyDev:
      "Baby is considered 'early term' from this week. Fat layers are filling in, giving them a rounder appearance.",
    momChanges:
      "Baby may 'drop' lower into your pelvis (lightening). Breathing becomes easier but pressure increases.",
    tip: "Weekly appointments begin. Pack your hospital bag if you haven't already.",
    milestone: "⭐ Almost there!",
  },
  40: {
    babyDev:
      "Baby is fully developed and ready for the world. Average weight is 3.4 kg and length is 51 cm.",
    momChanges:
      "You may be feeling very uncomfortable. Watch for signs of labour: regular contractions, water breaking.",
    tip: "Stay calm — only 5% of babies arrive on their exact due date. Trust the process.",
    milestone: "🍼 Due date week!",
  },
};

export function nearestDataWeek<T>(map: Record<number, T>, week: number): { key: number; value: T } | null {
  const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
  let best: number | null = null;
  for (const k of keys) {
    if (k <= week) best = k;
  }
  if (best === null) return null;
  return { key: best, value: map[best] };
}
