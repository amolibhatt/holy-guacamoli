export interface SeedQuestion {
  question: string;
  answer: string;
  points: number;
}

export interface SeedCategory {
  name: string;
  rule: string | null;
  questions: SeedQuestion[];
}

export interface SeedBoard {
  name: string;
  description: string;
  colorCode: string;
  categories: SeedCategory[];
}

const BOARD_COLORS = ["red", "orange", "yellow", "green", "cyan", "blue", "violet", "pink"];

export const THEMED_BOARDS: SeedBoard[] = [
  {
    name: "ALPHABET ANARCHY",
    description: "The Word Board",
    colorCode: "violet",
    categories: [
      {
        name: "The Flip-Flop",
        rule: "Reverse spelling for 2nd word",
        questions: [
          { question: "The act of consuming food vs. the hot beverage you drink with your pinky up while judging people.", answer: "Eat / Tea", points: 10 },
          { question: "The state of being overwhelmed by 2026 news cycles vs. the sugary treats you eat to feel better about it.", answer: "Stressed / Desserts", points: 20 },
          { question: "The state of being alive vs. the ultimate state of moral corruption and bad vibes.", answer: "Live / Evil", points: 30 },
          { question: "A component or piece of a whole vs. a high-stakes mechanism used to catch an animal.", answer: "Part / Trap", points: 40 },
          { question: "A sliding box in your desk used for storage vs. the positive result you get for being \"Technically Correct.\"", answer: "Drawer / Reward", points: 50 },
        ],
      },
      {
        name: "Venn Diagram Vibes",
        rule: "3 clues, 1 answer",
        questions: [
          { question: "A video of a celebrity saying something they never said / The part of the pool where you realize you never learned to swim / What you take before a toxic argument", answer: "Deep (Deepfake, Deep end, Deep breath)", points: 10 },
          { question: "What your date does the second you start catching feelings / A pepper so spicy it makes you hallucinate / The mysterious person who wrote that influencer's autobiography", answer: "Ghost (Ghosting, Ghost pepper, Ghostwriter)", points: 20 },
          { question: "A fake company used by billionaires to hide money / The traumatic state after a 14-hour shift / Things you \"walk on\" when avoiding a fight", answer: "Shell (Shell company, Shell-shocked, Eggshells)", points: 30 },
          { question: "Three shots of tequila that make you think you can sing / Money you actually have in your hand / What people call honey when they want to charge $50", answer: "Liquid (Liquid courage, Liquid asset, Liquid gold)", points: 40 },
          { question: "A protective bone structure that keeps your heart from getting squashed / A metal box to block Wi-Fi and tracking signals / An actor famous for screaming in every movie", answer: "Cage (Rib cage, Faraday cage, Nicolas Cage)", points: 50 },
        ],
      },
      {
        name: "The Downward Spiral",
        rule: "Answer contains 'DOWN'",
        questions: [
          { question: "The rhythmic sequence shouted before a rocket leaves for space / The terrifying 5 seconds before a YouTube \"Skip Ad\" button appears.", answer: "Countdown", points: 10 },
          { question: "A total mental collapse after a 14-hour shift / What happens to your 10-year-old car the second you get on the highway.", answer: "Breakdown", points: 20 },
          { question: "The corporate-friendly way to say \"you're all fired,\" usually announced during a meeting that promised \"exciting structural changes.\"", answer: "Downsizing", points: 30 },
          { question: "A technical way to describe a website that has crashed, or the exact state of your productivity after you open Instagram for 'just a minute.'", answer: "Downtime", points: 40 },
          { question: "A high-stakes final battle between a hero and a villain.", answer: "Showdown", points: 50 },
        ],
      },
      {
        name: "Vowel Movement",
        rule: "Swap one vowel for 2 words",
        questions: [
          { question: "An \"A\" makes it a water vessel / An \"O\" makes it a piece of footwear.", answer: "Boat / Boot", points: 10 },
          { question: "An \"I\" makes it a small piece of sharp metal / An \"E\" makes it the tool you use to sign a high-interest loan you'll never pay back.", answer: "Pin / Pen", points: 20 },
          { question: "An \"I\" is a piece of paper telling you exactly how much money you owe; an \"A\" is the round object people throw at each other in sports.", answer: "Bill / Ball", points: 30 },
          { question: "An \"I\" is what a dog does to your face to be friendly / A \"U\" is the magical force you need to actually win this game.", answer: "Lick / Luck", points: 40 },
          { question: "An \"I\" is what you do when you choose the best avocado; an \"A\" is what you do to your suitcase right before a flight you're already late for.", answer: "Pick / Pack", points: 50 },
        ],
      },
      {
        name: "F.U.",
        rule: "Answer starts with 'FU'",
        questions: [
          { question: "The punctuation mark that doubles as a relationship-ender when used at the end of a one-word text.", answer: "Full-stop", points: 10 },
          { question: "In the kitchen, it's a melt-in-your-mouth dessert made of sugar and butter. In conversation, it's the polite way to say another F-word.", answer: "Fudge", points: 20 },
          { question: "A snowy Japanese volcano you'll never actually climb, a retro camera you'll never learn to use properly, and a $5 fruit that is the only apple you'll accept as a snack.", answer: "Fuji", points: 30 },
          { question: "A floral shade of pink so loud it's basically the visual equivalent of a scream.", answer: "Fuchsia", points: 40 },
          { question: "The process of smashing atomic nuclei together, and the culinary excuse for putting Butter Chicken in a taco just to charge you $40 for 'the experience.'", answer: "Fusion", points: 50 },
        ],
      },
    ],
  },
  {
    name: "Jetlagged Atlas",
    description: "The Geography Board",
    colorCode: "cyan",
    categories: [
      {
        name: "Anagrammed Countries",
        rule: "Unscramble the capitalized word",
        questions: [
          { question: "Can't scale the summit? The famous peak of this country also looks great from a PLANE.", answer: "NEPAL", points: 10 },
          { question: "It was worth all the PAINS to travel across the Pyrenees to reach this Mediterranean land of Flamenco and tapas.", answer: "SPAIN", points: 20 },
          { question: "You could line up ANY ROW of postcards from this country and they'd still be filled with fjords and glaciers.", answer: "NORWAY", points: 30 },
          { question: "This Mediterranean giant wears its historical REGALIA with pride, from its Saharan dunes to its Roman ruins.", answer: "ALGERIA", points: 40 },
          { question: "Don't need a precise ESTIMATOR to appreciate the rich marine life of this Southeast Asian nation.", answer: "EAST TIMOR", points: 50 },
        ],
      },
    ],
  },
  {
    name: "LinkedIn Lunacy",
    description: "The Business Board",
    colorCode: "blue",
    categories: [],
  },
  {
    name: "Evolution's Drunk Designs",
    description: "The Animal Board",
    colorCode: "green",
    categories: [
      {
        name: "Feline Overloads",
        rule: null,
        questions: [],
      },
    ],
  },
  {
    name: "Warped Wood",
    description: "The Entertainment Board",
    colorCode: "pink",
    categories: [],
  },
];

export function getColorForIndex(index: number): string {
  return BOARD_COLORS[index % BOARD_COLORS.length];
}
