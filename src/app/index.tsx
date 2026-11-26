import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fonts } from "../theme";
import { formatGameState, formatTimeLocal, getGamesByDate, type Game } from "../lib/nhl";
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

function RinkBackground() {
  return (
    <View style={styles.rinkBackdrop} pointerEvents="none">
      <View style={styles.rinkOuter}>
        <View style={styles.rinkCenterLine} />
        <View style={styles.rinkBlueLineTop} />
        <View style={styles.rinkBlueLineBottom} />
        <View style={styles.rinkCenterCircle} />
        <View style={[styles.rinkFaceoff, styles.rinkFaceoffTL]} />
        <View style={[styles.rinkFaceoff, styles.rinkFaceoffTR]} />
        <View style={[styles.rinkFaceoff, styles.rinkFaceoffBL]} />
        <View style={[styles.rinkFaceoff, styles.rinkFaceoffBR]} />
        <View style={styles.rinkGoalTop} />
        <View style={styles.rinkGoalBottom} />
      </View>
      <View style={styles.rinkShade} />
    </View>
  );
}

function isWinner(game: Game, side: "away" | "home"): boolean {
  const state = (game.gameState || "").toUpperCase();
  if (!["FINAL", "OFF"].includes(state)) return false;
  const away = game.awayTeam.score;
  const home = game.homeTeam.score;
  if (typeof away !== "number" || typeof home !== "number" || away === home) return false;
  return side === "away" ? away > home : home > away;
}

function MatchCard({ game, onPress }: { game: Game; onPress: () => void }) {
  const scoreKnown = typeof game.awayTeam.score === "number" && typeof game.homeTeam.score === "number";
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.glassSheen} pointerEvents="none" />
      <View style={styles.splitBg} pointerEvents="none">
        <View style={styles.splitHalfLeft}>
          {game.awayTeam.logo ? <Image source={{ uri: game.awayTeam.logo }} style={styles.splitLogo} resizeMode="cover" /> : null}
          <View style={[styles.splitTintLeft, isWinner(game, "away") && styles.winnerTint]} />
        </View>
        <View style={styles.splitHalfRight}>
          {game.homeTeam.logo ? <Image source={{ uri: game.homeTeam.logo }} style={styles.splitLogo} resizeMode="cover" /> : null}
          <View style={[styles.splitTintRight, isWinner(game, "home") && styles.winnerTint]} />
        </View>
        <View style={styles.splitDivider} />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHead}>
          <Text style={styles.state}>{formatGameState(game.gameState)}</Text>
          <Text style={styles.time}>{formatTimeLocal(game.startTimeUTC)}</Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.teamCol}>
            {game.awayTeam.logo ? <Image source={{ uri: game.awayTeam.logo }} style={styles.teamLogo} /> : null}
            <Text style={styles.teamAbbrev}>{game.awayTeam.abbrev}</Text>
            <Text style={styles.teamName} numberOfLines={1}>{game.awayTeam.name}</Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.score}>
              {scoreKnown ? `${game.awayTeam.score} : ${game.homeTeam.score}` : "- : -"}
            </Text>
          </View>
          <View style={[styles.teamCol, styles.teamColRight]}>
            {game.homeTeam.logo ? <Image source={{ uri: game.homeTeam.logo }} style={styles.teamLogo} /> : null}
            <Text style={styles.teamAbbrev}>{game.homeTeam.abbrev}</Text>
            <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>{game.homeTeam.name}</Text>
          </View>
        </View>

        <Text style={styles.meta}>{game.venue ?? "Арена уточняется"} · броски {game.awayTeam.sog ?? "-"}:{game.homeTeam.sog ?? "-"}</Text>
        <Text style={styles.mood}>{gameMood(game)}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [selected, setSelected] = useState(() => isoDate(new Date()));
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(  const today = useMemo(() => isoDate(new Date()), []);
  const dates = useMemo(() => Array.from({ length: 91 }, (_, i) => addDays(today, i - 45)), [today]);
  const dateScroll = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, dates.indexOf(selected));
  const dateStep = 84;
  const dateSidePadding = Math.max(0, (screenWidth - 76) / 2);

  useEffect(() => {
    const index = dates.indexOf(selected);
    if (index >= 0) {
      requestAnimationFrame(() => dateScroll.current?.scrollTo({ x: index * dateStep, animated: true }));
    }
  }, [selected, dates]);ected]);

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
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <RinkBackground />
      <View style={styles.topBar}>
        <ScrollView
          ref={dateScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.datesRow, { paddingHorizontal: dateSidePadding }]}
          snapToInterval={dateStep}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          onMomentumScrollEnd={(event) => {
            const index = Math.max(0, Math.min(dates.length - 1, Math.round(event.nativeEvent.contentOffset.x / dateStep)));
            if (dates[index] && dates[index] !== selected) setSelected(dates[index]);
          }}
        >
          {dates.map((d, index) => {
            const active = d === selected;
            const distance = Math.abs(index - selectedIndex);
            const dt = new Date(`${d}T12:00:00`);
            const day = dt.toLocaleDateString("ru-RU", { weekday: "short" });
            const num = dt.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
            const depthScale = distance === 0 ? 1.08 : distance === 1 ? 0.96 : distance === 2 ? 0.86 : 0.78;
            const depthOpacity = distance === 0 ? 1 : distance === 1 ? 0.82 : distance === 2 ? 0.58 : 0.38;
            return (
              <Pressable
                key={d}
                onPress={() => setSelected(d)}
                style={[
                  styles.dateChip,
                  { width: 76, marginRight: 8, opacity: depthOpacity, transform: [{ scale: depthScale }] },
                  active && styles.dateChipActive,
                ]}
              >
                <Text style={[styles.dateDay, active && styles.dateTextActive]}>{day}</Text>
                <Text style={[styles.dateNum, active && styles.dateTextActive]}>{num}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{humanDate(selected)}</Text>
        <Text style={styles.lead}>Лента матчей, цифры и нормальный разбор - без казённого тона и одинаковых фраз.</Text>

        {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && !error && games.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Пауза в календаре.</Text>
            <Text style={styles.emptyText}>На эту дату игр нет. Лига взяла передышку, а мы - короткую паузу между сменами.</Text>
          </View>
        ) : null}

        {games.map((g) => <MatchCard key={g.id} game={g} onPress={() => router.push(`/game/${g.id}`)} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  rinkBackdrop: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", opacity: 0.42 },
  rinkOuter: { width: "88%", height: "78%", borderRadius: 110, borderWidth: 5, borderColor: "rgba(195,218,235,0.22)", backgroundColor: "rgba(205,225,239,0.10)", overflow: "hidden" },
  rinkCenterLine: { position: "absolute", top: "49.5%", left: 0, right: 0, height: 5, backgroundColor: "rgba(211,62,72,0.28)" },
  rinkBlueLineTop: { position: "absolute", top: "29%", left: 0, right: 0, height: 4, backgroundColor: "rgba(70,135,190,0.28)" },
  rinkBlueLineBottom: { position: "absolute", top: "68%", left: 0, right: 0, height: 4, backgroundColor: "rgba(70,135,190,0.28)" },
  rinkCenterCircle: { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 4, borderColor: "rgba(70,135,190,0.24)", alignSelf: "center", top: "42%" },
  rinkFaceoff: { position: "absolute", width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: "rgba(211,62,72,0.22)" },
  rinkFaceoffTL: { top: "10%", left: "12%" },
  rinkFaceoffTR: { top: "10%", right: "12%" },
  rinkFaceoffBL: { bottom: "10%", left: "12%" },
  rinkFaceoffBR: { bottom: "10%", right: "12%" },
  rinkGoalTop: { position: "absolute", top: 0, alignSelf: "center", width: 60, height: 28, borderWidth: 3, borderColor: "rgba(211,62,72,0.24)", borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  rinkGoalBottom: { position: "absolute", bottom: 0, alignSelf: "center", width: 60, height: 28, borderWidth: 3, borderColor: "rgba(211,62,72,0.24)", borderBottomWidth: 0, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  rinkShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(7,10,15,0.72)" },
  topBar: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(11,15,20,0.35)" },
  datesRow: { paddingVertical: 14, alignItems: "center" },
  dateChip: { height: 72, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(30,39,53,0.88)", alignItems: "center", justifyContent: "center" },
  dateChipPrev: {},
  dateChipNext: {},
  dateChipActive: { backgroundColor: "rgba(190,39,49,0.96)", borderColor: "rgba(255,255,255,0.58)", borderBottomWidth: 3, borderBottomColor: "#ffb0b0", shadowColor: "#f04452", shadowOpacity: 0.48, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  dateDay: { color: colors.muted, fontSize: 11, textTransform: "uppercase", fontWeight: "700" },
  dateNum: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: 2 },
  dateTextActive: { color: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 32, fontWeight: "900", marginTop: 6, textTransform: "capitalize" },
  lead: { color: "rgba(238,244,251,0.72)", fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 14, fontFamily: fonts.body },
  error: { color: colors.loss, marginTop: 16 },
  empty: { marginTop: 24, padding: 18, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  emptyText: { color: colors.muted, marginTop: 8, lineHeight: 21, fontFamily: fonts.body },
  card: { borderRadius: 22, marginBottom: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.08)" },
  glassSheen: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(255,255,255,0.05)" },
  splitBg: { ...StyleSheet.absoluteFill, flexDirection: "row" },
  splitHalfLeft: { flex: 1, overflow: "hidden" },
  splitHalfRight: { flex: 1, overflow: "hidden" },
  splitLogo: { width: "180%", height: "180%", position: "absolute", left: "-40%", top: "-40%", opacity: 0.22 },
  splitTintLeft: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(30,50,80,0.28)" },
  splitTintRight: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(70,30,30,0.22)" },
  winnerTint: { backgroundColor: "rgba(190,24,36,0.76)", borderColor: "rgba(255,92,100,0.85)", borderWidth: 1, shadowColor: "#ff2638", shadowOpacity: 0.9, shadowRadius: 18, elevation: 12 },
  splitDivider: { position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.22)" },
  cardContent: { padding: 14, backgroundColor: "rgba(10,14,20,0.18)" },
  cardHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  state: { color: "#ffe0a3", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  time: { color: "rgba(238,244,251,0.75)", fontSize: 12, fontFamily: fonts.mono },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  teamCol: { flex: 1, alignItems: "center" },
  teamColRight: { alignItems: "center" },
  teamLogo: { width: 44, height: 44, marginBottom: 4 },
  teamAbbrev: { color: colors.text, fontSize: 22, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  teamName: { color: "rgba(238,244,251,0.78)", fontSize: 12, marginTop: 2, textAlign: "center" },
  teamNameRight: { textAlign: "center" },
  scorePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  score: { color: colors.text, fontSize: 28, fontWeight: "900", minWidth: 88, textAlign: "center", fontFamily: fonts.mono },
  meta: { color: "rgba(238,244,251,0.72)", fontSize: 12, marginTop: 10 },
  mood: { color: "#eef4fb", fontSize: 14, lineHeight: 21, marginTop: 8, fontFamily: fonts.body },
});
