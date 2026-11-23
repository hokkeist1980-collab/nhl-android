import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fonts } from "../theme";
import { formatGameState, formatTimeMsk, getGamesByDate, type Game } from "../lib/nhl";
import { gameMood } from "../lib/boxStyle";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return isoDate(d);
}

function humanDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "short" }).format(d);
}

export default function HomeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState(() => isoDate(new Date()));
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => Array.from({ length: 9 }, (_, i) => addDays(selected, i - 4)), [selected]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const g = await getGamesByDate(selected);
        if (alive) setGames(g);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Не удалось загрузить матчи");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
  }, [selected]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.topBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
          {dates.map((d) => {
            const active = d === selected;
            const dt = new Date(`${d}T12:00:00`);
            const day = dt.toLocaleDateString("ru-RU", { weekday: "short" });
            const num = dt.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
            return (
              <Pressable key={d} onPress={() => setSelected(d)} style={[styles.dateChip, active && styles.dateChipActive]}>
                <Text style={[styles.dateDay, active && styles.dateTextActive]}>{day}</Text>
                <Text style={[styles.dateNum, active && styles.dateTextActive]}>{num}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>НХЛ / ТЕКСТОВАЯ СВОДКА</Text>
        <Text style={styles.title}>{humanDate(selected)}</Text>
        <Text style={styles.lead}>
          Матчи, цифры и немного здравого смысла. Без пафоса, но с характером — как будто коробку уже чуть-чуть замело.
        </Text>

        {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && !error && games.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Тишина в лиге.</Text>
            <Text style={styles.emptyText}>На эту дату матчей нет. Даже шайбе иногда нужен выходной.</Text>
          </View>
        ) : null}

        {games.map((g) => {
          const scoreKnown = typeof g.awayTeam.score === "number" && typeof g.homeTeam.score === "number";
          return (
            <Pressable key={g.id} style={styles.card} onPress={() => router.push(`/game/${g.id}`)}>
              <View style={styles.cardHead}>
                <Text style={styles.state}>{formatGameState(g.gameState)}</Text>
                <Text style={styles.time}>{formatTimeMsk(g.startTimeUTC)}</Text>
              </View>

              <View style={styles.scoreRow}>
                <View style={styles.teamCol}>
                  <Text style={styles.teamAbbrev}>{g.awayTeam.abbrev}</Text>
                  <Text style={styles.teamName} numberOfLines={1}>{g.awayTeam.name}</Text>
                </View>
                <Text style={styles.score}>
                  {scoreKnown ? `${g.awayTeam.score} : ${g.homeTeam.score}` : "— : —"}
                </Text>
                <View style={[styles.teamCol, styles.teamColRight]}>
                  <Text style={styles.teamAbbrev}>{g.homeTeam.abbrev}</Text>
                  <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>{g.homeTeam.name}</Text>
                </View>
              </View>

              <Text style={styles.meta}>{g.venue ?? "Арена уточняется"} · броски {g.awayTeam.sog ?? "—"}:{g.homeTeam.sog ?? "—"}</Text>
              <Text style={styles.mood}>{gameMood(g)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, backgroundColor: colors.bg },
  datesRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  dateChip: { minWidth: 72, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, alignItems: "center" },
  dateChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dateDay: { color: colors.muted, fontSize: 11, textTransform: "uppercase", fontWeight: "700" },
  dateNum: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: 2 },
  dateTextActive: { color: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  kicker: { color: colors.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", marginTop: 6, textTransform: "capitalize" },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 14, fontFamily: fonts.body },
  error: { color: colors.loss, marginTop: 16 },
  empty: { marginTop: 24, padding: 18, borderRadius: 16, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  emptyText: { color: colors.muted, marginTop: 8, lineHeight: 21, fontFamily: fonts.body },
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  state: { color: colors.live, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  time: { color: colors.muted, fontSize: 12, fontFamily: fonts.mono },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  teamCol: { flex: 1 },
  teamColRight: { alignItems: "flex-end" },
  teamAbbrev: { color: colors.text, fontSize: 22, fontWeight: "900" },
  teamName: { color: colors.muted, fontSize: 12, marginTop: 2 },
  teamNameRight: { textAlign: "right" },
  score: { color: colors.text, fontSize: 28, fontWeight: "900", minWidth: 96, textAlign: "center", fontFamily: fonts.mono },
  meta: { color: colors.muted, fontSize: 12, marginTop: 10 },
  mood: { color: "#d9e5f2", fontSize: 14, lineHeight: 21, marginTop: 8, fontFamily: fonts.body },
});
