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
  5: {
    babyDev:
      "The neural tube is closing and a primitive heart tube begins to form, starting its very first, faint contractions.",
    momChanges:
      "Fatigue and breast tenderness often begin around now. Your sense of smell may become noticeably sharper.",
    tip: "Book your first prenatal appointment if you haven't already — it's usually scheduled around week 8.",
  },
  6: {
    babyDev:
      "The heart is beating and can sometimes be seen on an early ultrasound. Tiny buds that will become arms and legs appear.",
    momChanges:
      "Morning sickness may start for some. A missed period is often the first clear sign that prompts a pregnancy test.",
    tip: "Try small, bland snacks like crackers first thing in the morning if nausea hits.",
  },
  7: {
    babyDev:
      "The brain and face are developing quickly. Tiny paddle-like hands are forming, and the embryo curls into a C-shape.",
    momChanges:
      "Nausea and fatigue often peak around this week. Frequent urination may also begin as your uterus grows.",
    tip: "Rest when you can — fatigue is your body's way of telling you to slow down.",
  },
  8: {
    babyDev:
      "All major organs have begun forming. Tiny fingers and toes are developing. The heart is beating at 150-170 bpm.",
    momChanges:
      "Morning sickness often peaks around this week. Fatigue, breast tenderness, and frequent urination are common.",
    tip: "Eat small, frequent meals to manage nausea. Ginger tea and crackers can help.",
  },
  9: {
    babyDev:
      "The embryo is officially called a fetus from this week. Fingers and toes are visible, and eyelids are forming.",
    momChanges: "Your uterus is growing and your waistband may feel snug. Hormone-driven mood swings are common.",
    tip: "Choose loose, comfortable clothing as your waistline starts to change.",
  },
  10: {
    babyDev:
      "Vital organs are formed and starting to function. Fingernails begin to develop and the small tail-like structure disappears.",
    momChanges:
      "Visible veins may appear as blood volume increases. For some, morning sickness starts to ease slightly.",
    tip: "Keep taking your prenatal vitamin daily, even if nausea makes food unappealing.",
  },
  11: {
    babyDev:
      "Baby can hiccup and starts making small, spontaneous movements. Early tooth buds are forming under the gums.",
    momChanges: "Energy levels may start improving for some. Bloating and a snug waistband are still common.",
    tip: "Gentle walks or prenatal yoga can help with energy and mood.",
  },
  12: {
    babyDev: "Your baby has fully formed fingers, toes, and nails. The digestive system is practicing contractions.",
    momChanges: "For many women, nausea begins to ease. Your uterus is now about the size of a grapefruit.",
    tip: "The risk of miscarriage drops significantly after week 12. Many parents choose to share their news now.",
    milestone: "✨ End of first trimester!",
  },
  13: {
    babyDev: "Vocal cords are forming and tiny fingerprints are developing. Baby can now make a small fist.",
    momChanges: "Welcome to the second trimester — energy often improves and a small bump may start to show.",
    tip: "A great week to start researching maternity clothes and sharing your news if you'd like to.",
  },
  14: {
    babyDev:
      "Baby can squint, frown, and grimace. Fine, soft hair called lanugo covers the body, and the kidneys are producing urine.",
    momChanges: "Nausea eases for many women around now, and appetite often picks back up.",
    tip: "Increase your calcium and vitamin D intake to support your baby's developing bones.",
  },
  15: {
    babyDev:
      "Baby can sense light through closed eyelids. Bones are hardening and baby practices breathing movements using amniotic fluid.",
    momChanges: "Many women notice a healthy glow to their skin around now. Mild nasal congestion is common.",
    tip: "Keep up a gentle exercise routine and stay well hydrated as your body works harder.",
  },
  16: {
    babyDev:
      "Baby can make sucking motions and may begin to hear sounds. The skeleton is hardening from cartilage to bone.",
    momChanges: "You may start to feel a small baby bump. Some women feel the first flutters of movement (quickening).",
    tip: "This is a good week for the anatomy scan (usually scheduled between weeks 18-22).",
  },
  17: {
    babyDev:
      "Baby is growing quickly and body fat is starting to develop. The umbilical cord is thickening and getting stronger.",
    momChanges:
      "Round ligament pain — quick, stretching twinges on the sides of the belly — may start as the uterus grows.",
    tip: "Wear supportive, low-heeled shoes as your centre of gravity starts to shift.",
  },
  18: {
    babyDev:
      "Baby's ears are now in their final position and may begin picking up muffled sounds from outside the womb.",
    momChanges: "Some women feel the first flutters of movement (quickening) this week. Mild dizziness can occur.",
    tip: "Confirm your anatomy scan appointment for weeks 18-22 if you haven't already.",
  },
  19: {
    babyDev:
      "A protective waxy coating called vernix caseosa starts covering baby's skin, and sensory areas of the brain are developing fast.",
    momChanges: "A dark line down the belly (linea nigra) may appear, and mild backache can begin as your bump grows.",
    tip: "Moisturise your belly and skin regularly to help with itchiness as it stretches.",
  },
  20: {
    babyDev: "Baby is swallowing amniotic fluid and the digestive system is developing. You're halfway there!",
    momChanges:
      "Most women can now feel baby's movements clearly. Back pain may begin as your centre of gravity shifts.",
    tip: "Sleep on your left side to improve blood flow to the baby and reduce swelling.",
    milestone: "🎊 Halfway point!",
  },
  21: {
    babyDev:
      "Baby's movements are becoming stronger and easier to feel. The digestive system is starting to absorb small amounts of sugar from swallowed amniotic fluid.",
    momChanges:
      "Stretch marks may start to appear as the belly grows. Increased vaginal discharge is common and normal.",
    tip: "Talk or read to your baby — hearing is developing and they may respond to your voice.",
  },
  22: {
    babyDev:
      "Baby's senses continue developing, eyebrows and eyelids are fully formed, and grip strength is increasing.",
    momChanges: "Braxton Hicks practice contractions may begin. Leg cramps, especially at night, are common.",
    tip: "Stretch your calves before bed to help prevent nighttime leg cramps.",
  },
  23: {
    babyDev:
      "Baby's skin is becoming less translucent as fat builds underneath, and the brain is rapidly developing sensory processing.",
    momChanges:
      "Mild swelling in the feet and ankles may start. Some skin itchiness is common as it continues to stretch.",
    tip: "Elevate your feet when resting to help reduce swelling in your ankles.",
  },
  24: {
    babyDev:
      "Baby's lungs are developing surfactant, which will help them breathe after birth. Fingerprints are forming.",
    momChanges: "Braxton Hicks contractions (practice contractions) may begin. Stretch marks may appear.",
    tip: "Stay hydrated and moisturise your skin. Start researching childbirth classes.",
  },
  25: {
    babyDev:
      "Baby is developing more fat under the skin, filling out and looking less wrinkled. Tiny capillaries forming under the skin give it a pinkish tone.",
    momChanges: "Backache may increase as the bump grows, and haemorrhoids can become more noticeable.",
    tip: "Wear compression socks if you're on your feet a lot to help with swelling.",
  },
  26: {
    babyDev:
      "Baby's eyes are starting to open. Lungs are developing further, and regular sleep-wake cycles are forming.",
    momChanges: "Routine screening around now often includes a blood pressure check and glucose test.",
    tip: "Ask your provider about your glucose screening test if it hasn't been scheduled yet.",
  },
  27: {
    babyDev:
      "This marks the end of the second trimester. Baby can recognise your voice and may respond to sounds from outside the womb.",
    momChanges:
      "Shortness of breath may begin as the uterus expands upward, and leg swelling can become more noticeable.",
    tip: "Practice good posture and use a pregnancy pillow to help with sleep comfort.",
  },
  28: {
    babyDev: "Baby can open and close their eyes and may respond to light. Brain development is rapid.",
    momChanges: "Third trimester begins. Heartburn and shortness of breath become more common.",
    tip: "Schedule your glucose screening test (gestational diabetes) and Rh factor blood test.",
    milestone: "🌟 Third trimester begins!",
  },
  29: {
    babyDev:
      "Baby's muscles and lungs continue maturing, and the head is growing to accommodate a rapidly developing brain.",
    momChanges: "Frequent urination often returns as the uterus presses on the bladder, and sleep can become trickier.",
    tip: "Start thinking about a birth plan and discuss your preferences with your healthcare provider.",
  },
  30: {
    babyDev:
      "Baby's eyesight continues developing, though still blurry at birth. Amniotic fluid volume is near its peak around now.",
    momChanges: "Fatigue may return, and prenatal visits typically become more frequent from this point on.",
    tip: "Rest with your feet up when you can, and keep your prenatal appointments regular.",
  },
  31: {
    babyDev:
      "Baby's brain is developing rapidly, coordinating movement and processing information. Baby practices swallowing and can regulate body temperature better.",
    momChanges: "Shortness of breath and heartburn are common, and finding a comfortable sleep position can be harder.",
    tip: "Practice relaxation techniques like deep breathing to help with sleep and stress.",
  },
  32: {
    babyDev: "Baby is practising breathing movements. Most babies are in a head-down position by now.",
    momChanges: "You may feel pressure in your pelvis. Swelling in hands and feet is common.",
    tip: "Start preparing your hospital bag. Install the car seat and research newborn care.",
  },
  33: {
    babyDev:
      "Baby's bones are hardening — except the skull, which stays soft and flexible to help with delivery. The immune system is developing with antibodies from you.",
    momChanges: "Pelvic pressure tends to increase, and Braxton Hicks contractions may become more frequent.",
    tip: "Consider starting a hospital bag checklist so you're not rushing later.",
  },
  34: {
    babyDev: "Baby's central nervous system continues maturing, and the lungs are nearly fully developed.",
    momChanges: "A burst of nesting instinct is common around now, alongside increased fatigue.",
    tip: "Take it easy and prioritise rest — your body is doing a lot of work right now.",
  },
  35: {
    babyDev:
      "There's little room left to move, so kicks may feel different — more like rolls and pushes than sharp jabs. Kidneys are fully developed.",
    momChanges: "More frequent bathroom trips are common as baby drops lower, and sleep can be harder to come by.",
    tip: "Finalise your hospital bag and pack the essentials for you and baby.",
  },
  36: {
    babyDev:
      "Baby is considered 'early term' from this week. Fat layers are filling in, giving them a rounder appearance.",
    momChanges: "Baby may 'drop' lower into your pelvis (lightening). Breathing becomes easier but pressure increases.",
    tip: "Weekly appointments begin. Pack your hospital bag if you haven't already.",
    milestone: "⭐ Almost there!",
  },
  37: {
    babyDev:
      "Baby is now considered 'early term'. Grip strength keeps improving and baby continues gaining weight steadily.",
    momChanges:
      "Braxton Hicks contractions may become more frequent and intense as your cervix starts to prepare for labour.",
    tip: "Learn the signs of labour so you know what to watch for in the coming weeks.",
  },
  38: {
    babyDev:
      "Baby's organs are fully mature and ready for life outside the womb. Much of the vernix and lanugo has shed by now.",
    momChanges: "Pelvic pressure tends to increase, and some women notice the loss of the mucus plug around now.",
    tip: "Rest as much as possible and keep your phone charged in case labour starts.",
  },
  39: {
    babyDev:
      "Baby is considered full term. Small amounts of weight and fat are still being added to help with temperature regulation after birth.",
    momChanges: "Watch for signs of labour. Both nesting energy and exhaustion are common at this stage.",
    tip: "Stay close to home and keep your healthcare provider's number handy.",
  },
  40: {
    babyDev: "Baby is fully developed and ready for the world. Average weight is 3.4 kg and length is 51 cm.",
    momChanges:
      "You may be feeling very uncomfortable. Watch for signs of labour: regular contractions, water breaking.",
    tip: "Stay calm — only 5% of babies arrive on their exact due date. Trust the process.",
    milestone: "🍼 Due date week!",
  },
};

export function nearestDataWeek<T>(map: Record<number, T>, week: number): { key: number; value: T } | null {
  const keys = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b);
  let best: number | null = null;
  for (const k of keys) {
    if (k <= week) best = k;
  }
  if (best === null) return null;
  return { key: best, value: map[best] };
}
