import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { colors, fonts } from "../../theme";
import { formatGameState, formatTimeMsk, getGameDetails, type GameDetails } from "../../lib/nhl";
import { buildGameStory } from "../../lib/boxStyle";

function StatRow({ label, away, home }: { label: string; away: string | number; home: string | number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statValue}>{away}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{home}</Text>
    </View>
  );
}

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const gameId = Number(id);
    if (!gameId) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await getGameDetails(gameId);
        if (alive) setData(d);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Не удалось загрузить матч");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (error || !data) return <View style={styles.center}><Text style={styles.error}>{error ?? "Нет данных"}</Text></View>;

  const story = buildGameStory(data);
  const awayTop = [...data.awaySkaters].sort((a, b) => b.points - a.points || b.goals - a.goals).slice(0, 3);
  const homeTop = [...data.homeSkaters].sort((a, b) => b.points - a.points || b.goals - a.goals).slice(0, 3);

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>{formatGameState(data.gameState)} · {formatTimeMsk(data.startTimeUTC)}</Text>
      <Text style={styles.title}>{data.awayTeam.abbrev} {data.awayTeam.score ?? "—"} : {data.homeTeam.score ?? "—"} {data.homeTeam.abbrev}</Text>
      <Text style={styles.sub}>{data.awayTeam.name} @ {data.homeTeam.name} · {data.venue ?? "Арена уточняется"}</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Как это выглядело</Text>
        {story.map((line, i) => <Text key={i} style={styles.story}>{line}</Text>)}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Быстрая сводка</Text>
        <StatRow label="Броски" away={data.awayTeam.sog ?? "—"} home={data.homeTeam.sog ?? "—"} />
        <StatRow label="Счёт" away={data.awayTeam.score ?? "—"} home={data.homeTeam.score ?? "—"} />
        <StatRow label="Силовые" away={data.awaySkaters.reduce((s, p) => s + p.hits, 0)} home={data.homeSkaters.reduce((s, p) => s + p.hits, 0)} />
        <StatRow label="Штраф, мин" away={data.awaySkaters.reduce((s, p) => s + p.pim, 0)} home={data.homeSkaters.reduce((s, p) => s + p.pim, 0)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Кто тащил у {data.awayTeam.abbrev}</Text>
        {awayTop.map((p) => <Text key={p.playerId} style={styles.player}>{p.name} — {p.goals} Г + {p.assists} П, {p.sog} брос., {p.toi}</Text>)}
        {data.awayGoalies.map((g) => <Text key={g.playerId} style={styles.playerMuted}>{g.name} — {g.saves}/{g.shotsAgainst} сейвов{g.decision ? `, ${g.decision}` : ""}</Text>)}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Кто тащил у {data.homeTeam.abbrev}</Text>
        {homeTop.map((p) => <Text key={p.playerId} style={styles.player}>{p.name} — {p.goals} Г + {p.assists} П, {p.sog} брос., {p.toi}</Text>)}
        {homeGoalies(data).map((g) => <Text key={g.playerId} style={styles.playerMuted}>{g.name} — {g.saves}/{g.shotsAgainst} сейвов{g.decision ? `, ${g.decision}` : ""}</Text>)}
      </View>
    </ScrollView>
  );
}

function homeGoalies(data: GameDetails) { return data.homeGoalies; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 16 },
  error: { color: colors.loss },
  kicker: { color: colors.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.1, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 34, fontWeight: "900", marginTop: 8, fontFamily: fonts.mono },
  sub: { color: colors.muted, fontSize: 13, marginTop: 6, marginBottom: 14 },
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12 },
  section: { color: colors.text, fontSize: 14, fontWeight: "800", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.6 },
  story: { color: "#d9e5f2", fontSize: 15, lineHeight: 23, marginBottom: 8, fontFamily: fonts.body },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  statValue: { color: colors.text, fontSize: 16, fontWeight: "800", width: 60, textAlign: "center", fontFamily: fonts.mono },
  statLabel: { color: colors.muted, fontSize: 13, flex: 1, textAlign: "center" },
  player: { color: colors.text, fontSize: 14, lineHeight: 21, marginBottom: 6 },
  playerMuted: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 2 },
});
