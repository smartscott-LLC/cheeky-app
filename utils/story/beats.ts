// Story Mode: The Chase to the Coat Check
// 5-beat narrative RPG onboarding. Each beat has a scene, character dialogue,
// choices with score values, and a learning goal.

import { ASSETS } from '@/utils/assets';

export interface StoryChoice {
  id: string;
  text: string;
  score: number;
  response: string; // character's reaction to this choice
}

export interface StoryBeat {
  number: number;
  title: string;
  location: string;
  character: string; // character slug
  characterName: string;
  dialogue: string; // what the character says to open the beat
  narrative: string; // scene description
  choices: StoryChoice[];
  learningGoal: string;
}

export const STORY_BEATS: StoryBeat[] = [
  // ── Beat 1: The Street ──────────────────────────────────────────
  {
    number: 1,
    title: 'The Street',
    location: 'Outside the club',
    character: 'brutus',
    characterName: 'Brutus',
    narrative:
      'The bass thumps through the brick wall. A neon sign flickers — "CLUB CHEEKY — MEMBERS ONLY." A mountain of a man in a velvet rope stands at the door, arms crossed, watching you approach.',
    dialogue:
      "Evening. You look like you're looking for something. Or someone. This ain't a meat market — it's a club. You wanna come in, you follow the rules. First rule: everybody checks their ego at the door. Second rule: what happens on the floor stays on the floor. You good with that?",
    choices: [
      {
        id: 'respect',
        text: '"Sounds fair. I\'m here to meet real people."',
        score: 20,
        response:
          "Good answer. I like you already. Head on in — the Silver floor's straight ahead. DJ's spinning, crowd's warm. Don't prove me wrong."
      },
      {
        id: 'cocky',
        text: '"Rules? I\'m a VIP everywhere I go."',
        score: 5,
        response:
          "Yeah, I hear that ten times a night. Here's the thing — in this club, you earn VIP. Walk through, keep your head straight, and maybe you'll get there."
      },
      {
        id: 'curious',
        text: '"What kind of club is this exactly?"',
        score: 15,
        response:
          "The kind where you show who you are — not who you're pretending to be. Floors go up from here. Each one shows you a little more. Start on Silver, work your way up. Or don't. Some people never leave the first floor and have the time of their lives."
      }
    ],
    learningGoal: 'Here\'s what the Club is — a real place with real rules.'
  },

  // ── Beat 2: Silver Floor ─────────────────────────────────────────
  {
    number: 2,
    title: 'The Silver Floor',
    location: 'The Lobby / Dance Floor',
    character: 'dj',
    characterName: 'D34D_B34T',
    narrative:
      'The doors swing open. Blue and silver lights pulse across a packed room. In the corner booth, a figure in headphones nods to a beat only they can hear. A turntable glows between stacks of vinyl. This is the heart of the club — where everyone starts.',
    dialogue:
      "Yo! Fresh face on the floor. Love it. I'm D34D_B34T — I keep this room alive. You feel that bass? That's the club breathing. Here's how it works: every hour, the Dance Floor opens. Three tokens gets you in. You pick someone, they pick you — instant match, one song to vibe. No swiping, no endless profiles. Just a moment. You in?",
    choices: [
      {
        id: 'join_event',
        text: '"Sounds amazing — I want to try the Dance Floor."',
        score: 20,
        response:
          "That's the spirit! First event's on me — well, not literally, tokens keep the lights on. But you'll see. The grid lights up, you pick someone who catches your eye, and if they pick you back — boom. Magic. Check the events board, floor's open every hour."
      },
      {
        id: 'learn_tokens',
        text: '"Tell me about these tokens first."',
        score: 15,
        response:
          "Right — tokens are how the club runs. You got 25 just for walking through that door (verified members, baby). Events cost tokens — Dance Floor's 3, Speed Dating's 5. You earn more by being here, referring friends, or grabbing a pack at the store. Never spend your last token — you wanna always have one for the next event."
      },
      {
        id: 'look_around',
        text: '"I want to look around first, get the vibe."',
        score: 10,
        response:
          "Respect. Take your time. Silver floor's always open — chat with folks, check the board, feel the room. When you're ready, the Dance Floor's waiting. Oh, and if you see someone in gold — that means they've earned their way up. Don't be shy, say hi."
      }
    ],
    learningGoal: 'How tokens + events work — the club economy.'
  },

  // ── Beat 3: Gold Floor ───────────────────────────────────────────
  {
    number: 3,
    title: 'The Gold Floor',
    location: 'Gold floor room',
    character: 'bartender',
    characterName: 'Roxy',
    narrative:
      'A spiral staircase leads up to a warmer room. Gold light reflects off brass fixtures. Behind a curved bar, a woman with sharp eyes and a knowing smile polishes a glass. The Gold floor hums with quieter energy — conversations, not chaos.',
    dialogue:
      "Well, well — look who made it up the stairs. I'm Roxy. I read people. It's my job. You want to know who's worth your time? Watch how they treat the people around them. Up here, we show interest the old-fashioned way — gifts. See something you like? Send a drink, a rose, a wink. Costs tokens, but it says more than a thousand messages. What's your move?",
    choices: [
      {
        id: 'send_gift',
        text: '"Show me how gifts work — I want to send one."',
        score: 20,
        response:
          "Now we're talking. Head to the Gift Store — pick something that says what you can't. A cocktail, a charm, a cheeky note. They'll know exactly who sent it. Trust me, a well-placed gift opens doors a message never will. Just don't go overboard — genuine > flashy."
      },
      {
        id: 'ask_advice',
        text: '"How do you know if someone\'s genuinely interested?"',
        score: 15,
        response:
          "Good question. Look for the little things — do they remember your name? Do they ask you questions back? Up here, people have already proven they're serious (Gold costs real money). So if someone's talking to you on this floor, they're not playing games. My advice? Be the person you'd want to meet."
      },
      {
        id: 'skip_to_next',
        text: '"I want to see what\'s higher up."',
        score: 10,
        response:
          "Ambitious. I like it. Platinum's above us — Trixie's territory. And Diamond's at the top — that's Valentina's world. Each floor shows you more of what the club is. But don't rush — the best connections happen when you're not chasing the next thing."
      }
    ],
    learningGoal: 'Gifts show interest; buy with tokens.'
  },

  // ── Beat 4: Platinum/Diamond Gauntlet ────────────────────────────
  {
    number: 4,
    title: 'The Gauntlet',
    location: 'Platinum & Diamond floors',
    character: 'trixie',
    characterName: 'Trixie',
    narrative:
      'Two floors rise above the Gold. The first shimmers with platinum light — low seats, deep conversations. Above it, a velvet rope guards a diamond-lit lounge. A woman with a sharp bob and sharper smile leans against the rail, watching you climb.',
    dialogue:
      "Made it past Roxy, huh? She's tough but fair. I'm Trixie — I work the Platinum room. Up here, the stakes are higher. People have proven they're serious. But the real question is — are you ready for what you'll find at the top? Valentina's floor is... different. The Coat Check is up there. And once you see it, you won't want to leave. Quick test: what matters most to you?",
    choices: [
      {
        id: 'connection',
        text: '"Real connection. Someone who actually sees me."',
        score: 20,
        response:
          "That's the right answer. Up here, that's what everyone's looking for — they just have different ways of saying it. Valentina will show you the rest. Go on — the top floor's waiting."
      },
      {
        id: 'adventure',
        text: '"The thrill of something new and unexpected."',
        score: 15,
        response:
          "Then you're in the right place. This club is built for that — every floor's a different world, every event's a new chance. But the real adventure? That's finding someone who wants to explore it with you. Head up — the Coat Check's got something special."
      },
      {
        id: 'myself',
        text: '"Honestly? Figuring out what I want."',
        score: 15,
        response:
          "Most honest answer I've heard all night. Nobody has it figured out — they just pretend they do. The club's a good place to find out. Take your time, talk to people, try things. Valentina's waiting when you're ready. The top floor's not going anywhere."
      }
    ],
    learningGoal: 'The higher floors reveal more — about others and yourself.'
  },

  // ── Beat 5: Rooftop Finale ───────────────────────────────────────
  {
    number: 5,
    title: 'The Rooftop',
    location: 'Coat Check / Rooftop',
    character: 'hostess',
    characterName: 'Valentina',
    narrative:
      'The final staircase opens to the sky. Stars scatter across a velvet night. In the center of the rooftop, a figure stands by a glowing counter — coats, memories, and secrets hang in the air. This is the Coat Check. And the person behind it is waiting for you.',
    dialogue:
      "You made it. I'm Valentina. I run the top floor — the Coat Check. This is where the club keeps what matters. Every coat tells a story. Every gem has a memory. And every person who reaches this floor... leaves something behind. You've climbed through the whole club tonight. You've met Brutus, D34D_B34T, Roxy, Trixie. Now it's your turn to choose — what do you leave here, and what do you take with you?",
    choices: [
      {
        id: 'open_heart',
        text: '"I leave my doubts. I take the chance."',
        score: 25,
        response:
          "Beautiful. The Coat Check will hold your doubts — you can pick them up anytime, but most people never come back for them. You've earned your place here. Welcome to the club — really welcome."
      },
      {
        id: 'stay_mysterious',
        text: '"I leave a question. I take the mystery."',
        score: 15,
        response:
          "Intriguing. Some mysteries are worth keeping. The club will reveal itself to you in time — floor by floor, event by event, person by person. Keep asking questions. That's how you find the good stuff."
      },
      {
        id: 'start_fresh',
        text: '"I leave my old self. I take a new beginning."',
        score: 20,
        response:
          "That's what this place is for. A fresh start, real connections, no baggage. The Coat Check holds your old coat — and you get to pick a new one. Someone who fits who you're becoming. Come — let me show you."
      }
    ],
    learningGoal: 'The dream date is here; you unlock the Coat Check.'
  }
];

// Score thresholds for reward tiers
export const TIER_THRESHOLDS = [
  { tier: 'diamond', minScore: 85 },
  { tier: 'platinum', minScore: 65 },
  { tier: 'gold', minScore: 45 },
  { tier: 'silver', minScore: 0 }
] as const;

export function getTierForScore(score: number): string {
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.minScore) return t.tier;
  }
  return 'silver';
}

// Persona definitions
export interface Persona {
  slug: string;
  name: string;
  variant: string;
  gender: 'female' | 'male';
  imagePath: string;
  description: string;
}

export const PERSONAS: Persona[] = [
  {
    slug: 'sasha-blonde-thai',
    name: 'Sasha',
    variant: 'Blonde Thai',
    gender: 'female',
    imagePath: ASSETS.coatCheck.sashaBlondeThai,
    description: 'Warm and radiant — she sees the best in everyone.'
  },
  {
    slug: 'sasha-the-keeper',
    name: 'Sasha',
    variant: 'The Keeper',
    gender: 'female',
    imagePath: ASSETS.coatCheck.sashaTheKeeper,
    description: 'Steady and wise — nothing gets past her watch.'
  },
  {
    slug: 'sasha-black-hair-edgy',
    name: 'Sasha',
    variant: 'Black Hair Edgy',
    gender: 'female',
    imagePath: ASSETS.coatCheck.sashaBlackHairEdgy,
    description: 'Sharp and bold — she tells it like it is.'
  },
  {
    slug: 'jax-default',
    name: 'Jax',
    variant: 'Default',
    gender: 'male',
    imagePath: ASSETS.coatCheck.jaxDefault,
    description: 'Calm and grounded — he keeps the vault steady.'
  },
  {
    slug: 'jax-vaultkeeper',
    name: 'Jax',
    variant: 'The Vaultkeeper',
    gender: 'male',
    imagePath: ASSETS.coatCheck.jaxVaultkeeper,
    description: 'Quiet and strong — your secrets are safe with him.'
  },
  {
    slug: 'jax-slicked-back',
    name: 'Jax',
    variant: 'Slicked Back',
    gender: 'male',
    imagePath: ASSETS.coatCheck.jaxSlickedBack,
    description: 'Smooth and confident — he knows the room.'
  }
];