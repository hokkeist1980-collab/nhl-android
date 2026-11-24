import { Game, GameDetails, SkaterLine } from "./nhl";

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function topSkater(lines: SkaterLine[]): SkaterLine | undefined {
  return [...lines].sort((a, b) => b.points - a.points || b.goals - a.goals || b.sog - a.sog)[0];
}

function sum(lines: SkaterLine[], key: keyof SkaterLine): number {
  return lines.reduce((s, p) => s + (Number(p[key]) || 0), 0);
}

function goalieSummary(details: GameDetails, side: "away" | "home"): string {
  const g = side === "away" ? details.awayGoalies[0] : details.homeGoalies[0];
  if (!g) return "Вратарская линия без яркой цифры, но без вратаря тут всё равно никуда.";
  const pct = typeof g.savePctg === "number" ? `${(g.savePctg * 100).toFixed(1)}%` : "—";
  return `${g.name}: ${g.saves}/${g.shotsAgainst} сейвов, ${pct}, время ${g.toi}${g.decision ? `, решение ${g.decision}` : ""}.`;
}

export function gameMood(game: Game): string {
  const seed = game.id;
  const state = (game.gameState || "").toUpperCase();
  if (state === "FUT" || state === "PRE") {
    return pick([
      "Пока счёт чистый, но воздух уже густой — такие матчи редко проходят спокойно.",
      "Разминка закончится, и тогда красивые планы начнут сталкиваться с чужими клюшками.",
      "Предматчевая пауза: на бумаге всё аккуратно, на льду обычно иначе.",
    ], seed);
  }
  if (state === "LIVE" || state === "CRIT") {
    return pick([
      "Игра идёт прямо сейчас, и каждая смена уже похожа на маленький сюжет.",
      "Матч в разгаре: тут любое владение может быстро превратиться в проблему.",
      "Живой хоккей, живые нервы — идеальная смесь для неожиданного поворота.",
    ], seed);
  }
  const a = game.awayTeam.score ?? 0;
  const h = game.homeTeam.score ?? 0;
  const diff = Math.abs(a - h);
  if (diff >= 3) return pick([
    "Здесь дистанция на табло уже сама рассказывает, кому вечер удался больше.",
    "Счёт получился разговорчивый: одна команда давила, другая долго искала ответы.",
  ], seed);
  if (diff === 1) return pick([
    "Одна шайба разницы — и этого хватает, чтобы матч запомнился надолго.",
    "Плотный результат, где цена ошибки была особенно высокой.",
  ], seed);
  return pick([
    "Ровный по ощущениям матч, где детали mattered больше громких моментов.",
    "Не фейерверк, но по хоккейной напряжёнке всё на месте.",
  ], seed);
}

export function buildGameStory(details: GameDetails): string[] {
  const away = details.awayTeam;
  const home = details.homeTeam;
  const awayScore = away.score ?? 0;
  const homeScore = home.score ?? 0;
  const state = (details.gameState || "").toUpperCase();
  const shotsAway = away.sog ?? sum(details.awaySkaters, "sog");
  const shotsHome = home.sog ?? sum(details.homeSkaters, "sog");
  const hitsAway = sum(details.awaySkaters, "hits");
  const hitsHome = sum(details.homeSkaters, "hits");
  const pimAway = sum(details.awaySkaters, "pim");
  const pimHome = sum(details.homeSkaters, "pim");
  const leaderAway = topSkater(details.awaySkaters);
  const leaderHome = topSkater(details.homeSkaters);
  const lines: string[] = [];
  const localStart = details.startTimeUTC
    ? new Date(details.startTimeUTC).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })
    : "время уточняется";

  if (state === "FUT" || state === "PRE") {
    lines.push(`${away.name} приезжают к ${home.name}: матч ещё впереди, поэтому никаких выводов по счёту пока нет.`);
    lines.push(`Начало — ${localStart} по местному времени устройства, арена — ${details.venue ?? "площадка уточняется"}.`);
    lines.push("Главная интрига — кто первым навяжет свой темп и заставит соперника чаще играть без шайбы.");
    lines.push("Стоит следить за специальными бригадами и работой на пятаке: именно такие детали часто решают равные встречи.");
    lines.push("После стартового вбрасывания цифры обновятся, и предварительные ожидания можно будет сверить с тем, что происходит на льду.");
    return lines;
  }

  if (state === "LIVE" || state === "CRIT") {
    lines.push(`Игра продолжается: ${away.abbrev} — ${awayScore}, ${home.abbrev} — ${homeScore}. Это промежуточная картина, не итог матча.`);
    lines.push(`По броскам сейчас ${shotsAway}:${shotsHome}; важно смотреть не только на количество, но и на качество моментов.`);
    if (leaderAway) lines.push(`У гостей уже заметен ${leaderAway.name}: ${leaderAway.goals} голов и ${leaderAway.assists} передач.`);
    if (leaderHome) lines.push(`У хозяев в протоколе выделяется ${leaderHome.name}: ${leaderHome.goals} голов и ${leaderHome.assists} передач.`);
    lines.push(`Силовая работа: ${away.abbrev} — ${hitsAway} хитов, ${home.abbrev} — ${hitsHome}; штрафное время — ${pimAway} и ${pimHome} минут соответственно.`);
    lines.push("Пока рано подводить черту: следующая смена или удаление способны полностью поменять рисунок встречи.");
    return lines.slice(0, 8);
  }

  const tied = awayScore === homeScore;
  const winner = tied ? null : awayScore > homeScore ? away : home;
  const loser = tied ? null : awayScore > homeScore ? home : away;
  const goalDiff = Math.abs(awayScore - homeScore);
  const periodType = details.periodDescriptor?.periodType?.toUpperCase();
  const finish = periodType === "OT" ? "в овертайме" : periodType === "SO" ? "в серии буллитов" : "в основное время";
  lines.push(tied
    ? `Матч завершился со счётом ${awayScore}:${homeScore} — победителя не выявили.`
    : `${winner!.abbrev} обыграли ${loser!.abbrev} со счётом ${winner!.score}:${loser!.score} ${finish}.`);
  lines.push(`По броскам команды завершили встречу с показателем ${shotsAway}:${shotsHome}; это показывает объём атакующей работы, но не заменяет качество моментов.`);
  if (leaderAway) lines.push(`У гостей самым результативным стал ${leaderAway.name}: ${leaderAway.goals} голов, ${leaderAway.assists} передач и ${leaderAway.points} очков.`);
  if (leaderHome) lines.push(`У хозяев больше всего очков набрал ${leaderHome.name}: ${leaderHome.goals} голов, ${leaderHome.assists} передач и ${leaderHome.points} очков.`);
  lines.push(`В силовой борьбе ${away.abbrev} записали на свой счёт ${hitsAway} хитов, ${home.abbrev} — ${hitsHome}; штрафное время составило ${pimAway} и ${pimHome} минут.`);
  lines.push(`Вратарь гостей: ${goalieSummary(details, "away")}`);
  lines.push(`Вратарь хозяев: ${goalieSummary(details, "home")}`);
  if (goalDiff === 1) lines.push("Разница в одну шайбу подчёркивает цену каждого удаления, отскока и выигранного единоборства.");
  else if (goalDiff >= 3) lines.push("Разрыв в несколько шайб говорит о заметном преимуществе победителя на табло, хотя отдельные игровые эпизоды всё равно требуют разбора.");
  else lines.push("Счёт получился плотным: решающими стали конкретные реализации и эпизоды, а не одна отдельная цифра.");
  return lines.slice(0, 9);
}
