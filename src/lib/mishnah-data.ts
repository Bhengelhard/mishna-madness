export type Masechta = {
  name: string;
  seder: string;
  chapters: number;
  totalMishnayos: number;
};

export type Seder = {
  name: string;
  masechtos: string[];
};

export const SEDARIM: Seder[] = [
  {
    name: "Zeraim",
    masechtos: [
      "Brachos",
      "Peah",
      "Demai",
      "Kilayim",
      "Sheviis",
      "Terumos",
      "Maaseros",
      "Maaser Sheni",
      "Challah",
      "Orlah",
      "Bikkurim",
    ],
  },
  {
    name: "Moed",
    masechtos: [
      "Shabbos",
      "Eruvin",
      "Pesachim",
      "Shekalim",
      "Yoma",
      "Sukkah",
      "Beitzah",
      "Rosh Hashanah",
      "Taanis",
      "Megillah",
      "Moed Katan",
      "Chagigah",
    ],
  },
  {
    name: "Nashim",
    masechtos: [
      "Yevamos",
      "Kesubos",
      "Nedarim",
      "Nazir",
      "Sotah",
      "Gittin",
      "Kiddushin",
    ],
  },
  {
    name: "Nezikin",
    masechtos: [
      "Bava Kamma",
      "Bava Metzia",
      "Bava Basra",
      "Sanhedrin",
      "Makkos",
      "Shevuos",
      "Eduyos",
      "Avodah Zarah",
      "Avos",
      "Horayos",
    ],
  },
  {
    name: "Kodashim",
    masechtos: [
      "Zevachim",
      "Menachos",
      "Chullin",
      "Bechoros",
      "Arachin",
      "Temurah",
      "Kerisos",
      "Meilah",
      "Tamid",
      "Middos",
      "Kinnim",
    ],
  },
  {
    name: "Taharos",
    masechtos: [
      "Keilim",
      "Ohalos",
      "Negaim",
      "Parah",
      "Taharos",
      "Mikvaos",
      "Niddah",
      "Machshirin",
      "Zavim",
      "Tevul Yom",
      "Yadayim",
      "Uktzin",
    ],
  },
];

export const MASECHTOS: Masechta[] = [
  // Zeraim
  { name: "Brachos", seder: "Zeraim", chapters: 9, totalMishnayos: 57 },
  { name: "Peah", seder: "Zeraim", chapters: 8, totalMishnayos: 69 },
  { name: "Demai", seder: "Zeraim", chapters: 7, totalMishnayos: 53 },
  { name: "Kilayim", seder: "Zeraim", chapters: 9, totalMishnayos: 77 },
  { name: "Sheviis", seder: "Zeraim", chapters: 10, totalMishnayos: 73 },
  { name: "Terumos", seder: "Zeraim", chapters: 11, totalMishnayos: 96 },
  { name: "Maaseros", seder: "Zeraim", chapters: 5, totalMishnayos: 42 },
  { name: "Maaser Sheni", seder: "Zeraim", chapters: 5, totalMishnayos: 53 },
  { name: "Challah", seder: "Zeraim", chapters: 4, totalMishnayos: 38 },
  { name: "Orlah", seder: "Zeraim", chapters: 3, totalMishnayos: 33 },
  { name: "Bikkurim", seder: "Zeraim", chapters: 4, totalMishnayos: 29 },

  // Moed
  { name: "Shabbos", seder: "Moed", chapters: 24, totalMishnayos: 138 },
  { name: "Eruvin", seder: "Moed", chapters: 10, totalMishnayos: 92 },
  { name: "Pesachim", seder: "Moed", chapters: 10, totalMishnayos: 93 },
  { name: "Shekalim", seder: "Moed", chapters: 8, totalMishnayos: 51 },
  { name: "Yoma", seder: "Moed", chapters: 8, totalMishnayos: 61 },
  { name: "Sukkah", seder: "Moed", chapters: 5, totalMishnayos: 47 },
  { name: "Beitzah", seder: "Moed", chapters: 5, totalMishnayos: 36 },
  { name: "Rosh Hashanah", seder: "Moed", chapters: 4, totalMishnayos: 35 },
  { name: "Taanis", seder: "Moed", chapters: 4, totalMishnayos: 30 },
  { name: "Megillah", seder: "Moed", chapters: 4, totalMishnayos: 33 },
  { name: "Moed Katan", seder: "Moed", chapters: 3, totalMishnayos: 24 },
  { name: "Chagigah", seder: "Moed", chapters: 3, totalMishnayos: 22 },

  // Nashim
  { name: "Yevamos", seder: "Nashim", chapters: 16, totalMishnayos: 122 },
  { name: "Kesubos", seder: "Nashim", chapters: 13, totalMishnayos: 112 },
  { name: "Nedarim", seder: "Nashim", chapters: 11, totalMishnayos: 81 },
  { name: "Nazir", seder: "Nashim", chapters: 9, totalMishnayos: 64 },
  { name: "Sotah", seder: "Nashim", chapters: 9, totalMishnayos: 72 },
  { name: "Gittin", seder: "Nashim", chapters: 9, totalMishnayos: 73 },
  { name: "Kiddushin", seder: "Nashim", chapters: 4, totalMishnayos: 44 },

  // Nezikin
  { name: "Bava Kamma", seder: "Nezikin", chapters: 10, totalMishnayos: 72 },
  { name: "Bava Metzia", seder: "Nezikin", chapters: 10, totalMishnayos: 83 },
  { name: "Bava Basra", seder: "Nezikin", chapters: 10, totalMishnayos: 82 },
  { name: "Sanhedrin", seder: "Nezikin", chapters: 11, totalMishnayos: 89 },
  { name: "Makkos", seder: "Nezikin", chapters: 3, totalMishnayos: 22 },
  { name: "Shevuos", seder: "Nezikin", chapters: 8, totalMishnayos: 53 },
  { name: "Eduyos", seder: "Nezikin", chapters: 8, totalMishnayos: 57 },
  { name: "Avodah Zarah", seder: "Nezikin", chapters: 5, totalMishnayos: 49 },
  { name: "Avos", seder: "Nezikin", chapters: 6, totalMishnayos: 79 },
  { name: "Horayos", seder: "Nezikin", chapters: 3, totalMishnayos: 19 },

  // Kodashim
  { name: "Zevachim", seder: "Kodashim", chapters: 14, totalMishnayos: 101 },
  { name: "Menachos", seder: "Kodashim", chapters: 13, totalMishnayos: 95 },
  { name: "Chullin", seder: "Kodashim", chapters: 12, totalMishnayos: 103 },
  { name: "Bechoros", seder: "Kodashim", chapters: 9, totalMishnayos: 68 },
  { name: "Arachin", seder: "Kodashim", chapters: 9, totalMishnayos: 54 },
  { name: "Temurah", seder: "Kodashim", chapters: 7, totalMishnayos: 38 },
  { name: "Kerisos", seder: "Kodashim", chapters: 6, totalMishnayos: 38 },
  { name: "Meilah", seder: "Kodashim", chapters: 6, totalMishnayos: 25 },
  { name: "Tamid", seder: "Kodashim", chapters: 7, totalMishnayos: 33 },
  { name: "Middos", seder: "Kodashim", chapters: 5, totalMishnayos: 34 },
  { name: "Kinnim", seder: "Kodashim", chapters: 3, totalMishnayos: 15 },

  // Taharos
  { name: "Keilim", seder: "Taharos", chapters: 30, totalMishnayos: 189 },
  { name: "Ohalos", seder: "Taharos", chapters: 18, totalMishnayos: 128 },
  { name: "Negaim", seder: "Taharos", chapters: 14, totalMishnayos: 107 },
  { name: "Parah", seder: "Taharos", chapters: 12, totalMishnayos: 88 },
  { name: "Taharos", seder: "Taharos", chapters: 10, totalMishnayos: 85 },
  { name: "Mikvaos", seder: "Taharos", chapters: 10, totalMishnayos: 63 },
  { name: "Niddah", seder: "Taharos", chapters: 10, totalMishnayos: 72 },
  { name: "Machshirin", seder: "Taharos", chapters: 6, totalMishnayos: 40 },
  { name: "Zavim", seder: "Taharos", chapters: 5, totalMishnayos: 29 },
  { name: "Tevul Yom", seder: "Taharos", chapters: 4, totalMishnayos: 20 },
  { name: "Yadayim", seder: "Taharos", chapters: 4, totalMishnayos: 22 },
  { name: "Uktzin", seder: "Taharos", chapters: 3, totalMishnayos: 20 },
];

export const SEDER_NAMES: string[] = SEDARIM.map((s) => s.name);

export function getMasechta(name: string): Masechta | undefined {
  return MASECHTOS.find((m) => m.name === name);
}

export function getSederForMasechta(name: string): string | undefined {
  return MASECHTOS.find((m) => m.name === name)?.seder;
}

export function getMasechtosBySeder(seder: string): Masechta[] {
  return MASECHTOS.filter((m) => m.seder === seder);
}
