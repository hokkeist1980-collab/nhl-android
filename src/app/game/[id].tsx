import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";
import { useLocalSearchParams } from "expo-router";
import { getGameDetails, type GameDetails, type SkaterLine } from "../../lib/nhl";

const C = {
  bg: "#080D13", surface: "#111A24", surface2: "#182431",
  line: "rgba(226,238,248,0.10)", text: "#F2F6FA", muted: "#8D9BA9",
  red: "#D83D48", ice: "#9CC8E8", gold: "#E8C88A",
};

function Crest({ abbrev, logo }: { abbrev: string; logo?: string }) {
  const [failed, setFailed] = useState(false);
  const uri = logo || `https://assets.nhle.com/logos/nhl/svg/${abbrev}_light.svg`;
  return <View style={styles.crest}>{uri && !failed ? <SvgUri uri={uri} width={66} height={66} onError={() => setFailed(true)} /> : <Text style={styles.crestFallback}>{abbrev}</Text>}</View>;
}

function total(players: SkaterLine[], key: "hits" | "pim" | "sog") {
  return players.reduce((n, player) => n + (player[key] || 0), 0);
}

function buildNarrative(d: GameDetails) {
  const a = d.awayTeam, h = d.homeTeam;
  const state = d.gameState.toUpperCase();
  const shotsA = a.sog ?? total(d.awaySkaters, "sog");
  const shotsH = h.sog ?? total(d.homeSkaters, "sog");
  const hitsA = total(d.awaySkaters, "hits"), hitsH = total(d.homeSkaters, "hits");
  const pimA = total(d.awaySkaters, "pim"), pimH = total(d.homeSkaters, "pim");
  const bestA = [...d.awaySkaters].sort((x, y) => y.points - x.points || y.goals - x.goals)[0];
  const bestH = [...d.homeSkaters].sort((x, y) => y.points - x.points || y.goals - x.goals)[0];
  const lines: string[] = [];

  if (["FUT", "PRE"].includes(state)) {
    lines.push(`${a.name} против ${h.name} — встреча ещё впереди, поэтому счёт пока не существует и делать выводы рано.`);
    lines.push(`Игра пройдёт на арене ${d.venue || "хозяев"}; время начала указано по часовому поясу устройства.`);
    lines.push("Перед стартом главные вопросы простые: кто заберёт инициативу, кто лучше распорядится большинством и чья оборона выдержит давление.");
    lines.push("Как только появится протокол, здесь будут цифры матча и разбор того, что действительно произошло на льду.");
    return lines;
  }

  if (["LIVE", "CRIT"].includes(state)) {
    lines.push(`Матч ещё идёт: ${a.abbrev} — ${a.score ?? 0}, ${h.abbrev} — ${h.score ?? 0}. Это промежуточный счёт, не финальный результат.`);
    lines.push(`По броскам сейчас ${shotsA}:${shotsH}; цифра показывает объём атак, но сама по себе не говорит о качестве моментов.`);
    if (bestA) lines.push(`У гостей пока выделяется ${bestA.name}: ${bestA.goals} гола и ${bestA.assists} передачи.`);
    if (bestH) lines.push(`У хозяев самый заметный вклад в протоколе у ${bestH.name}: ${bestH.goals} гола и ${bestH.assists} передачи.`);
    lines.push(`Физическая часть встречи: ${hitsA} хитов у гостей и ${hitsH} у хозяев; штрафное время — ${pimA} и ${pimH} минут.`);
    lines.push("Картина может измениться за одну смену: окончательные оценки оставим до сирены.");
    return lines;
  }

  const tied = (a.score ?? 0) === (h.score ?? 0);
  const winner = (a.score ?? 0) > (h.score ?? 0) ? a : h;
  const loser = winner === a ? h : a;
  lines.push(tied ? `На табло равенство — ${a.score ?? 0}:${h.score ?? 0}. В основное время команды не смогли отделить себя друг от друга.` : `${winner.name} забрали матч у ${loser.name} — ${winner.score}:${loser.score}.`);
  lines.push(`По броскам преимущество ${shotsA > shotsH ? a.abbrev : shotsH > shotsA ? h.abbrev : "ни у кого"}: ${shotsA} против ${shotsH}. Это полезный ориентир по активности, но не готовый ответ на вопрос, кто создавал более опасные моменты.`);
  if (bestA) lines.push(`У гостей главным по очкам стал ${bestA.name}: ${bestA.goals} гола, ${bestA.assists} передачи и ${bestA.points} очков.`);
  if (bestH) lines.push(`У хозяев лидером протокола оказался ${bestH.name}: ${bestH.goals} гола, ${bestH.assists} передачи и ${bestH.points} очков.`);
  lines.push(`В силовой борьбе ${a.abbrev} набрали ${hitsA} хитов, ${h.abbrev} — ${hitsH}; штрафные минуты — ${pimA} и ${pimH} соответственно.`);
  const goalieA = d.awayGoalies[0], goalieH = d.homeGoalies[0];
  if (goalieA) lines.push(`У ворот гостей ${goalieA.name}: ${goalieA.saves} сейвов из ${goalieA.shotsAgainst} бросков.`);
  if (goalieH) lines.push(`У ворот хозяев ${goalieH.name}: ${goalieH.saves} сейвов из ${goalieH.shotsAgainst} бросков.`);
  lines.push("Это разбор по официальному протоколу и доступным цифрам: без подтверждённых данных о голевых моментах не будем придумывать тактические причины результата.");
  return lines.slice(0, 8);
}

function StatRow({ label, away, home }: { label: string; away: string | number; home: string | number }) {
  return <View style={styles.statRow}><Text style={styles.statValue}>{away}</Text><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{home}</Text></View>;
}

function PlayerLine({ player, side }: { player: SkaterLine; side: string }) {
  return <View style={styles.playerLine}><View style={styles.playerMain}><Text style={styles.playerName}>{player.name}</Text><Text style={styles.playerMeta}>{side} · {player.toi} на льду</Text></View><View style={styles.playerPoints}><Text style={styles.pointsNumber}>{player.points}</Text><Text style={styles.pointsLabel}>ОЧКИ</Text></View><Text style={styles.playerGAP}>{player.goals}Г  {player.assists}П</Text></View>;
}

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const gameId = Number(id);
    if (!gameId) { setError("Некорректный номер матча"); setLoading(false); return; }
    getGameDetails(gameId).then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setError("Не удалось получить протокол матча. Попробуй обновить экран позже."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const story = useMemo(() => data ? buildNarrative(data) : [], [data]);
  if (loading) return <View style={styles.center}><ActivityIndicator color={C.ice} size="large" /><Text style={styles.loadingText}>Поднимаем протокол…</Text></View>;
  if (error || !data) return <View style={styles.center}><Text style={styles.errorTitle}>НЕТ ДАННЫХ</Text><Text style={styles.loadingText}>{error || "Матч не найден"}</Text></View>;

  const a = data.awayTeam, h = data.homeTeam;
  const topA = [...data.awaySkaters].sort((x, y) => y.points - x.points || y.goals - x.goals).slice(0, 3);
  const topH = [...data.homeSkaters].sort((x, y) => y.points - x.points || y.goals - x.goals).slice(0, 3);
  const when = data.startTimeUTC ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(new Date(data.startTimeUTC)) : "Время не указано";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>GAME CENTER / {data.id}</Text>
        <View style={styles.scoreHero}>
          <View style={styles.teamHero}><Crest abbrev={a.abbrev} logo={a.logo} /><Text style={styles.teamName}>{a.name}</Text><Text style={styles.teamAbbrev}>{a.abbrev}</Text></View>
          <View style={styles.scoreCenter}><Text style={styles.score}>{a.score ?? "—"} : {h.score ?? "—"}</Text><Text style={styles.status}>{["FINAL","OFF"].includes(data.gameState.toUpperCase()) ? "ФИНАЛ" : ["LIVE","CRIT"].includes(data.gameState.toUpperCase()) ? "ИДЁТ ИГРА" : "ПРЕДСТОИТ"}</Text></View>
          <View style={styles.teamHero}><Crest abbrev={h.abbrev} logo={h.logo} /><Text style={styles.teamName}>{h.name}</Text><Text style={styles.teamAbbrev}>{h.abbrev}</Text></View>
        </View>
        <Text style={styles.metaLine}>{when}  ·  {data.venue || "Арена не указана"}</Text>

        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionIndex}>01</Text><Text style={styles.sectionTitle}>Что произошло</Text></View>
          <View style={styles.storyCard}>{story.map((line, i) => <View key={i} style={styles.storyLine}><View style={styles.storyBullet} /><Text style={styles.storyText}>{line}</Text></View>)}</View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionIndex}>02</Text><Text style={styles.sectionTitle}>Цифры матча</Text></View>
          <View style={styles.statsCard}>
            <View style={styles.statsTeams}><Text style={styles.statsTeam}>{a.abbrev}</Text><Text style={styles.statsCaption}>ПОКАЗАТЕЛЬ</Text><Text style={styles.statsTeam}>{h.abbrev}</Text></View>
            <StatRow label="Броски в створ" away={a.sog ?? total(data.awaySkaters, "sog")} home={h.sog ?? total(data.homeSkaters, "sog")} />
            <StatRow label="Силовые приёмы" away={total(data.awaySkaters, "hits")} home={total(data.homeSkaters, "hits")} />
            <StatRow label="Штрафные минуты" away={total(data.awaySkaters, "pim")} home={total(data.homeSkaters, "pim")} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}><Text style={styles.sectionIndex}>03</Text><Text style={styles.sectionTitle}>Главные по очкам</Text></View>
          <View style={styles.statsCard}>
            <Text style={styles.sideHeading}>{a.abbrev} · ГОСТИ</Text>
            {topA.map((p) => <PlayerLine key={p.playerId} player={p} side={a.abbrev} />)}
            <View style={styles.sideDivider} />
            <Text style={styles.sideHeading}>{h.abbrev} · ХОЗЯЕВА</Text>
            {topH.map((p) => <PlayerLine key={p.playerId} player={p} side={h.abbrev} />)}
          </View>
        </View>
        <Text style={styles.disclaimer}>Статистика и текст формируются по данным протокола NHL. Недоступные показатели не подменяются догадками.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 44 },
  center: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 24, gap: 14 },
  loadingText: { color: C.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  errorTitle: { color: "#FF858C", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  kicker: { color: C.ice, fontSize: 9, fontWeight: "900", letterSpacing: 2.2, marginBottom: 14 },
  scoreHero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 22, paddingVertical: 18, paddingHorizontal: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  teamHero: { flex: 1, alignItems: "center", gap: 5 },
  crest: { width: 78, height: 78, alignItems: "center", justifyContent: "center" },
  crestFallback: { color: C.text, fontSize: 18, fontWeight: "900" },
  teamName: { color: C.text, fontSize: 11, fontWeight: "800", textAlign: "center" },
  teamAbbrev: { color: C.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  scoreCenter: { width: 124, alignItems: "center" },
  score: { color: C.text, fontSize: 29, fontWeight: "900", letterSpacing: -1.2 },
  status: { color: C.gold, fontSize: 8, fontWeight: "900", letterSpacing: 1.8, marginTop: 6 },
  metaLine: { color: C.muted, fontSize: 10, textAlign: "center", marginTop: 12, marginBottom: 27, letterSpacing: 0.3 },
  section: { marginBottom: 24 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionIndex: { color: C.red, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { color: C.text, fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  storyCard: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, gap: 13 },
  storyLine: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  storyBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.red, marginTop: 7 },
  storyText: { flex: 1, color: "#CBD6E0", fontSize: 13, lineHeight: 20 },
  statsCard: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.line, paddingHorizontal: 15, paddingVertical: 14 },
  statsTeams: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 8 },
  statsTeam: { width: 54, color: C.ice, fontSize: 10, fontWeight: "900", textAlign: "center", letterSpacing: 1 },
  statsCaption: { color: C.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1.6 },
  statRow: { minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.line },
  statValue: { width: 54, color: C.text, fontSize: 15, fontWeight: "900", textAlign: "center" },
  statLabel: { flex: 1, color: C.muted, fontSize: 11, textAlign: "center" },
  sideHeading: { color: C.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1.4, marginTop: 5, marginBottom: 4 },
  playerLine: { minHeight: 55, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: C.line, gap: 9 },
  playerMain: { flex: 1 },
  playerName: { color: C.text, fontSize: 12, fontWeight: "800" },
  playerMeta: { color: C.muted, fontSize: 9, marginTop: 3 },
  playerPoints: { alignItems: "center", width: 34 },
  pointsNumber: { color: C.ice, fontSize: 17, fontWeight: "900" },
  pointsLabel: { color: C.muted, fontSize: 6, fontWeight: "900", letterSpacing: 0.8 },
  playerGAP: { color: "#C4D0DB", fontSize: 10, fontWeight: "800", width: 48, textAlign: "right" },
  sideDivider: { height: 1, backgroundColor: C.line, marginVertical: 13 },
  disclaimer: { color: "#647587", fontSize: 9, lineHeight: 15, textAlign: "center", marginTop: 2 },
});
