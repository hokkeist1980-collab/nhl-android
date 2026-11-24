export type TeamSide = {
  id: number;
  abbrev: string;
  name: string;
  score?: number;
  sog?: number;
  logo?: string;
  faceoffWinningPctg?: number;
  powerPlayConversion?: string;
  pim?: number;
  hits?: number;
  blocks?: number;
};

export type TeamInfo = {
  id: number;
  abbrev: string;
  name: string;
  logo: string;
};

export type Game = {
  id: number;
  gameDate: string;
  startTimeUTC: string;
  gameState: string;
  gameScheduleState?: string;
  venue?: string;
  awayTeam: TeamSide;
  homeTeam: TeamSide;
};

export type SkaterLine = {
  playerId: number;
  name: string;
  position: string;
  goals: number;
  assists: number;
  points: number;
  sog: number;
  hits: number;
  pim: number;
  toi: string;
};

export type GoalieLine = {
  playerId: number;
  name: string;
  saves: number;
  shotsAgainst: number;
  savePctg?: number;
  toi: string;
  decision?: string;
};

export type GameDetails = {
  id: number;
  gameDate: string;
  startTimeUTC: string;
  gameState: string;
  venue?: string;
  awayTeam: TeamSide;
  homeTeam: TeamSide;
  awaySkaters: SkaterLine[];
  homeSkaters: SkaterLine[];
  awayGoalies: GoalieLine[];
  homeGoalies: GoalieLine[];
  periodDescriptor?: { number?: number; periodType?: string };
};

const BASE = "https://api-web.nhle.com/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json; charset=utf-8",
      "Accept-Charset": "utf-8",
    },
  });
  if (!res.ok) throw new Error(`NHL API ${res.status}`);
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
  return JSON.parse(text) as T;
}

function mapTeam(t: any): TeamSide {
  return {
    id: t?.id,
    abbrev: t?.abbrev ?? "",
    name: t?.name?.default ?? t?.commonName?.default ?? t?.abbrev ?? "Команда",
    score: t?.score,
    sog: t?.sog,
    logo: t?.logo,
    faceoffWinningPctg: t?.faceoffWinningPctg,
    powerPlayConversion: t?.powerPlayConversion,
    pim: t?.pim,
    hits: t?.hits,
    blocks: t?.blocks,
  };
}

export async function getGamesByDate(date: string): Promise<Game[]> {
  const data = await fetchJson<any>(`${BASE}/score/${date}`);
  const games = Array.isArray(data?.games) ? data.games : [];
  return games.map((g: any) => ({
    id: g.id,
    gameDate: g.gameDate ?? date,
    startTimeUTC: g.startTimeUTC,
    gameState: g.gameState,
    gameScheduleState: g.gameScheduleState,
    venue: g?.venue?.default,
    awayTeam: mapTeam(g.awayTeam),
    homeTeam: mapTeam(g.homeTeam),
  }));
}

export async function getAllTeams(): Promise<TeamInfo[]> {
  const data = await fetchJson<any>(`${BASE}/standings/now`);
  const standings = Array.isArray(data?.standings) ? data.standings : [];
  return standings.map((t: any) => ({
    id: t.teamAbbrev?.default ? t.teamId ?? 0 : 0,
    abbrev: t.teamAbbrev?.default ?? "",
    name: t.teamName?.default ?? t.teamCommonName?.default ?? "",
    logo: t.teamLogo ?? "",
  })).filter((t: TeamInfo) => t.abbrev && t.logo);
}

function mapSkater(p: any): SkaterLine {
  return {
    playerId: p.playerId,
    name: p?.name?.default ?? "",
    position: p.position ?? "",
    goals: p.goals ?? 0,
    assists: p.assists ?? 0,
    points: p.points ?? 0,
    sog: p.sog ?? 0,
    hits: p.hits ?? 0,
    pim: p.pim ?? 0,
    toi: p.toi ?? "0:00",
  };
}

function mapGoalie(p: any): GoalieLine {
  return {
    playerId: p.playerId,
    name: p?.name?.default ?? "",
    saves: p.saves ?? 0,
    shotsAgainst: p.shotsAgainst ?? 0,
    savePctg: p.savePctg,
    toi: p.toi ?? "0:00",
    decision: p.decision,
  };
}

export async function getGameDetails(gameId: number): Promise<GameDetails> {
  const d = await fetchJson<any>(`${BASE}/gamecenter/${gameId}/boxscore`);
  const awayStats = d?.playerByGameStats?.awayTeam ?? {};
  const homeStats = d?.playerByGameStats?.homeTeam ?? {};
  return {
    id: d.id,
    gameDate: d.gameDate,
    startTimeUTC: d.startTimeUTC,
    gameState: d.gameState,
    venue: d?.venue?.default,
    periodDescriptor: d?.periodDescriptor,
    awayTeam: mapTeam(d.awayTeam),
    homeTeam: mapTeam(d.homeTeam),
    awaySkaters: (awayStats.forwards ?? []).concat(awayStats.defense ?? []).map(mapSkater),
    homeSkaters: (homeStats.forwards ?? []).concat(homeStats.defense ?? []).map(mapSkater),
    awayGoalies: (awayStats.goalies ?? []).map(mapGoalie),
    homeGoalies: (homeStats.goalies ?? []).map(mapGoalie),
  };
}

export function formatGameState(state: string): string {
  const s = (state || "").toUpperCase();
  if (s === "FUT" || s === "PRE") return "Ещё не начался";
  if (s === "LIVE" || s === "CRIT") return "В эфире, коробку замело";
  if (s === "FINAL" || s === "OFF") return "Финал, всё";
  return state;
}

export function formatTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d) + " МСК";
}
