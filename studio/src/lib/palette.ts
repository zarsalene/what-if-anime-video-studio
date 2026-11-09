// Colour recipe (from the study): the world is nearly grey. Colour is spent ONLY
// on things the story needs you to notice. Characters are the darkest thing in every frame.

export const INK = "#0B0B0D"; // the characters — darkest thing on screen
export const EYE = "#F4F1EA"; // eye white, slightly warm
export const BLUSH = "#E8A3A8";

// Moods. Rooms sit at mid-grey even in daytime.
export const NIGHT = { // loop / failure at night: blue-grey
  skyTop: "#1C2230", skyBottom: "#323A4C", wall: "#3A4150", floor: "#262B36",
  lamp: "#E8C48A", accent: "#7E8798", rim: "#C9D3E3",
};
export const LOW = { // loop / failure in daytime: warm grey, desaturated
  skyTop: "#5E6168", skyBottom: "#7D7F84", wall: "#6E6C6A", floor: "#4A4846",
  lamp: "#E6C48E", accent: "#8F8B84", rim: "#E9E4DA",
};
export const DUSK = { // turning point, clumsy try
  skyTop: "#463F55", skyBottom: "#9A7470", wall: "#5A5360", floor: "#35303C",
  lamp: "#EDB97A", accent: "#B08E8A", rim: "#F2D6BE",
};
export const WARM = { // payoff indoors: golden
  skyTop: "#8FAFC6", skyBottom: "#F0CC9E", wall: "#BFAE96", floor: "#8A7863",
  lamp: "#FFDDA6", accent: "#E59A5B", rim: "#FFF1DC",
};
export const BRIGHT = { // payoff outdoors: colour returns — green hill, blue sky
  skyTop: "#5E9BD1", skyBottom: "#BFE0F2", wall: "#9CC27A", floor: "#6FA052",
  lamp: "#FFF4D6", accent: "#F2B45A", rim: "#FFFFFF",
};
export const SUNSET = { // payoff at sunset: warm pink
  skyTop: "#6D5B8E", skyBottom: "#F2A88E", wall: "#A47C86", floor: "#5E4652",
  lamp: "#FFC99A", accent: "#F28E7A", rim: "#FFE3D2",
};

export type Mood = typeof NIGHT;
export const MOODS = { night: NIGHT, low: LOW, dusk: DUSK, warm: WARM, bright: BRIGHT, sunset: SUNSET };
export type MoodName = keyof typeof MOODS;

// Story colours — used sparingly, only on objects that matter.
export const STORY = {
  bad: "#C7473D", // red X's, notification badges, anger glow, shouting
  good: "#6FA36B", // green checks, growth
  calm: "#6E9BD1", // calm/blue glow
  timer: "#F08A3C", // timer ring, alarms
  paper: "#EDE6D8",
  paperInk: "#2A2622",
};

// Text colour = who is speaking (from the study).
export const VOICE = {
  say: "#F4F1EA", // said out loud — white
  think: "#F2A04A", // inner voice / excuse — orange
  shout: "#E5574B", // shouting / anger — red
  care: "#9CC8F0", // calm, caring voice (a parent) — light blue
  advice: "#F5D45E", // the advice that changes everything — yellow
};
export type Voice = keyof typeof VOICE;
