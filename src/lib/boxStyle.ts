import { Game, GameDetails, SkaterLine } from "./nhl";

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function topSkater(lines: SkaterLine[]): SkaterLine | undefined {
  return [...lines].sort((a, b) => b.points - a.points || b.goals - a.goals || b.sog - a.sog)[0];
}

export function gameMood(game: Game): string {
  const seed = game.id;
  const state = (game.gameState || "").toUpperCase();
  if (state === "FUT" || state === "PRE") {
    return pick([
      "Пока тихо, но это обманчиво. Где-то уже точат коньки и заряжают клише про «характер».",
      "Матч ещё не начался, а нервы уже на разминке. Классика.",
      "Предматчевый туман. Скоро кто-то будет героем, а кто-то — поводом для длинного текста.",
    ], seed);
  }
  if (state === "LIVE" || state === "CRIT") {
    return pick([
      "Идёт хоккей. Значит, где-то прямо сейчас кто-то принимает решения, которые потом будет объяснять всю ночь.",
      "Матч живой, пульс тоже. Тут без спокойствия — как и положено.",
      "В эфире всё серьёзно: шайба летает, нервы горят, план на игру иногда делает вид, что он есть.",
    ], seed);
  }
  const a = game.awayTeam.score ?? 0;
  const h = game.homeTeam.score ?? 0;
  const diff = Math.abs(a - h);
  if (diff >= 3) return pick([
    "Тут не матч, а урок. Без лишней романтики, просто кто-то приехал и всё разобрал по полкам.",
    "Разгромный вечер. Один собирал моменты, другой — объяснения.",
  ], seed);
  if (diff === 1) return pick([
    "Тонкая игра, где одна шайба весит как весь сценарий.",
    "Всё решилось на нервах и одной детали. Любимый жанр.",
  ], seed);
  return pick([
    "Рабочий хоккейный вечер: без фейерверков, но со своим характером.",
    "Матч, после которого хочется не итогов, а нормального разбора по эпизодам.",
  ], seed);
}

export function buildGameStory(details: GameDetails): string[] {
  const a = details.awayTeam;
  const h = details.homeTeam;
  const aScore = a.score ?? 0;
  const hScore = h.score ?? 0;
  const state = (details.gameState || "").toUpperCase();
  const lines: string[] = [];

  if (state === "FUT" || state === "PRE") {
    lines.push(`${a.abbrev} едут в гости к ${h.abbrev}. Пока счёта нет, но интригу уже можно почувствовать — она обычно приходит раньше вбрасывания.`);
    lines.push(`Арена: ${details.venue ?? "где-то там, где пахнет льдом и надеждами"}.`);
    return lines;
  }

  const winner = aScore === hScore ? null : aScore > hScore ? a : h;
  const loser = aScore === hScore ? null : aScore > hScore ? h : a;
  const diff = Math.abs(aScore - hScore);

  if (winner && loser) {
    if (diff === 1) {
      lines.push(`${winner.abbrev} забрали этот матч ${Math.max(aScore, hScore)}:${Math.min(aScore, hScore)}. Не красиво, не спокойно, но кто сейчас считает стиль, когда на табло плюс один.`);
    } else if (diff >= 3) {
      lines.push(`${winner.abbrev} устроили ${loser.abbrev} вечер длинных взглядов в пол: ${Math.max(aScore, hScore)}:${Math.min(aScore, hScore)}. Тут сценарий закончился раньше финальной сирены.`);
    } else {
      lines.push(`${winner.abbrev} взяли игру ${Math.max(aScore, hScore)}:${Math.min(aScore, hScore)}. Без чудес, но с ощущением, что свою работу сделали.`);
    }
  } else {
    lines.push(`Ничья на табло — ${aScore}:${hScore}. Иногда хоккей любит оставить вопрос открытым.`);
  }

  const topA = topSkater(details.awaySkaters);
  const topH = topSkater(details.homeSkaters);
  const heroes = [topA ? `${a.abbrev}: ${topA.name} ${topA.goals}+${topA.assists}, ${topA.sog} брос.` : null,
    topH ? `${h.abbrev}: ${topH.name} ${topH.goals}+${topH.assists}, ${topH.sog} брос.` : null].filter(Boolean);
  if (heroes.length) lines.push(`Кто шумел по делу: ${heroes.join(" | ")}.`);
  lines.push(`Броски по воротам: ${a.abbrev} ${a.sog ?? "—"} — ${h.sog ?? "—"} ${h.abbrev}. Цифры сухие, но настроение передают.`);
  return lines;
}
