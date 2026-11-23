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
  const a = details.awayTeam;
  const h = details.homeTeam;
  const aScore = a.score ?? 0;
  const hScore = h.score ?? 0;
  const state = (details.gameState || "").toUpperCase();
  const lines: string[] = [];
  const awayHits = sum(details.awaySkaters, "hits");
  const homeHits = sum(details.homeSkaters, "hits");
  const awayPim = sum(details.awaySkaters, "pim");
  const homePim = sum(details.homeSkaters, "pim");
  const awaySog = a.sog ?? sum(details.awaySkaters, "sog");
  const homeSog = h.sog ?? sum(details.homeSkaters, "sog");
  const topA = topSkater(details.awaySkaters);
  const topH = topSkater(details.homeSkaters);
  const totalGoals = aScore + hScore;

  if (state === "FUT" || state === "PRE") {
    lines.push(`${a.name} (${a.abbrev}) приезжают к ${h.name} (${h.abbrev}) — вывеска понятная, а вот сценарий пока спрятан.`);
    lines.push(`Старт назначен на ${details.startTimeUTC ? new Date(details.startTimeUTC).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "уточняемое время"} по Москве.`);
    lines.push(`Арена встречи: ${details.venue ?? "данные по площадке пока не подтянулись"}.`);
    lines.push(`Для гостей ключевой вопрос — как быстро они войдут в темп на чужом льду и не отдадут первую инициативу.`);
    lines.push(`Хозяевам важно не превращать первые смены в разведку, иначе соперник быстро почувствует свободу.`);
    lines.push(`До вбрасывания любая статистика — только фон, но именно из таких матчей потом вырастают большие серии.`);
    lines.push(`Если игра откроется рано, смотреть будет весело; если затянется, цена первого гола вырастет в разы.`);
    lines.push(`В таких встречах обычно выигрывает тот, кто меньше спорит с эпизодами и лучше работает на добиваниях.`);
    lines.push(`Отдельный интерес — вратарская дуэль: один спокойный сейв в нужный момент иногда меняет весь вечер.`);
    lines.push(`Гостям полезно проверять пятак и второй темп, а не надеяться только на чистый вход в зону.`);
    lines.push(`Хозяева, в свою очередь, будут искать преимущество через давление и контроль нейтральной зоны.`);
    lines.push(`Матч ещё не начался, но интрига уже есть: характер этой вывески обычно раскрывается быстро.`);
    lines.push(`После сирены всё сведётся к простым вещам — скорость, дисциплина и готовность терпеть неудобный хоккей.`);
    lines.push(`Пока же берём паузу, но держим внимание: такие игры редко бывают пустыми.`);
    lines.push(`Как только шайба пойдёт в игру, статистика начнёт говорить громче любых ожиданий.`);
    return lines.slice(0, 16);
  }

  const winner = aScore === hScore ? null : aScore > hScore ? a : h;
  const loser = aScore === hScore ? null : aScore > hScore ? h : a;
  const diff = Math.abs(aScore - hScore);
  const shotsLeader = awaySog === homeSog ? "по броскам команды шли ноздря в ноздрю" : awaySog > homeSog ? `по броскам активнее были ${a.abbrev} (${awaySog}:${homeSog})` : `по броскам больше нагружали ${h.abbrev} (${homeSog}:${awaySog})`;

  if (winner && loser) {
    lines.push(`Финальный счёт ${a.abbrev} ${aScore}:${hScore} ${h.abbrev}, и этот результат вполне объясняет ход вечера.`);
    if (diff >= 3) lines.push(`${winner.abbrev} не просто забрали очки — они методично разложили матч на удобные для себя отрезки.`);
    else if (diff === 1) lines.push(`${winner.abbrev} дожали встречу на тонкой грани, где каждый выезд из зоны имел значение.`);
    else lines.push(`${winner.abbrev} выглядели собраннее в ключевые моменты и заслуженно увезли победу.`);
  } else {
    lines.push(`На табло ${aScore}:${hScore}, и по делу: команды долго не давали друг другу уйти в комфорт.`);
  }

  lines.push(`По объёму работы ${shotsLeader}, хотя качество моментов важнее голого количества.`);
  lines.push(`Силовой фон: ${a.abbrev} нанесли ${awayHits} хитов, ${h.abbrev} ответили ${homeHits} — игра не была ватной.`);
  lines.push(`Штрафной тонус тоже сказался: ${a.abbrev} набрали ${awayPim} минут, ${h.abbrev} — ${homePim}.`);
  if (topA) lines.push(`У гостей заметнее всех был ${topA.name}: ${topA.goals} голов, ${topA.assists} передач, ${topA.sog} бросков, ${topA.hits} силовых, время на льду ${topA.toi}.`);
  if (topH) lines.push(`У хозяев выделялся ${topH.name}: ${topH.goals} голов, ${topH.assists} передач, ${topH.sog} бросков, ${topH.hits} силовых, TOI ${topH.toi}.`);
  lines.push(`Вратарская история у ${a.abbrev}: ${goalieSummary(details, "away")}`);
  lines.push(`Вратарская история у ${h.abbrev}: ${goalieSummary(details, "home")}`);
  if (totalGoals >= 7) lines.push(`Матч получился открытым: при ${totalGoals} шайбах оборона регулярно превращалась в обсуждаемую тему.`);
  else if (totalGoals <= 3) lines.push(`Шайб было немного (${totalGoals}), поэтому цена каждой потери и каждого отскока резко росла.`);
  else lines.push(`По голам (${totalGoals}) игра держалась в рабочем диапазоне, но напряжение не проседало.`);
  if (awaySog - homeSog >= 10) lines.push(`${a.abbrev} заметно больше бросали, и это давление рано или поздно должно было сказаться.`);
  else if (homeSog - awaySog >= 10) lines.push(`${h.abbrev} чаще доставляли шайбу к воротам, заставляя гостей долго жить в обороне.`);
  else lines.push(`Разрыв по броскам был умеренным, так что исход во многом решался реализацией и мелкими ошибками.`);
  if (diff === 1) lines.push(`При разнице в одну шайбу особенно бросались в глаза детали: выигранное вбрасывание, неудачная смена, лишний отскок.`);
  if (diff >= 3) lines.push(`При таком разрыве уже не спасают отдельные всплески — нужна была целая перестройка игры, а её не случилось.`);
  lines.push(`В сумме это был матч не про одну цифру, а про сочетание темпа, дисциплины и вратарской устойчивости.`);
  lines.push(`Для ${a.abbrev} этот вечер полезно разбирать по эпизодам входа в зону и работе на пятаке, а не только по счёту.`);
  lines.push(`Для ${h.abbrev} выводы тоже лежат в деталях: где терялась позиция, где не хватило свежести, где упустили второй шанс.`);
  lines.push(`Итоговая картина получилась объёмной: здесь есть и тактика, и характер, и пара цифр, которые лучше любой громкой фразы.`);
  return lines.slice(0, 18);
}
