import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fonts } from "../theme";
import { formatGameState, formatTimeMsk, getAllTeams, getGamesByDate, type Game, type TeamInfo } from "../lib/nhl";
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

function TeamLogoBg({ teams }: { teams: TeamInfo[] }) {
  const logos = teams.length ? teams : [];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.logoGrid}>
        {logos.concat(logos).slice(0, 48).map((t, i) => (
          <Image key={`${t.abbrev}-${i}`} source={{ uri: t.logo }} style={styles.bgLogo} />
        ))}
      </View>
      <View style={styles.bgOverlay} />
    </View>
  );
}

function MatchCard({ game, onPress }: { game: Game; onPress: () => void }) {
  const scoreKnown = typeof game.awayTeam.score === "number" && typeof game.homeTeam.score === "number";
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.glassSheen} pointerEvents="none" />
      <View style={styles.splitBg} pointerEvents="none">
        <View style={styles.splitHalfLeft}>
          {game.awayTeam.logo ? <Image source={{ uri: game.awayTeam.logo }} style={styles.splitLogo} resizeMode="cover" /> : null}
          <View style={styles.splitTintLeft} />
        </View>
        <View style={styles.splitHalfRight}>
          {game.homeTeam.logo ? <Image source={{ uri: game.homeTeam.logo }} style={styles.splitLogo} resizeMode="cover" /> : null}
          <View style={styles.splitTintRight} />
        </View>
        <View style={styles.splitDivider} />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHead}>
          <Text style={styles.state}>{formatGameState(game.gameState)}</Text>
          <Text style={styles.time}>{formatTimeMsk(game.startTimeUTC)}</Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.teamCol}>
            <Text style={styles.teamAbbrev}>{game.awayTeam.abbrev}</Text>
            <Text style={styles.teamName} numberOfLines={1}>{game.awayTeam.name}</Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.score}>
              {scoreKnown ? `${game.awayTeam.score} : ${game.homeTeam.score}` : "вЂ” : вЂ”"}
            </Text>
          </View>
          <View style={[styles.teamCol, styles.teamColRight]}>
            <Text style={styles.teamAbbrev}>{game.homeTeam.abbrev}</Text>
            <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>{game.homeTeam.name}</Text>
          </View>
        </View>

        <Text style={styles.meta}>{game.venue ?? "РђСЂРµРЅР° СѓС‚РѕС‡РЅСЏРµС‚СЃСЏ"} В· Р±СЂРѕСЃРєРё {game.awayTeam.sog ?? "вЂ”"}:{game.homeTeam.sog ?? "вЂ”"}</Text>
        <Text style={styles.mood}>{gameMood(game)}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState(() => isoDate(new Date()));
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => Array.from({ length: 9 }, (_, i) => addDays(selected, i - 4)), [selected]);

  useEffect(() => {
    getAllTeams().then(setTeams).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const g = await getGamesByDate(selected);
        if (alive) setGames(g);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РјР°С‚С‡Рё");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
  }, [selected]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <TeamLogoBg teams={teams} />
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
        <Text style={styles.title}>{humanDate(selected)}</Text>
        <Text style={styles.lead}>Р›РµРЅС‚Р° РјР°С‚С‡РµР№, С†РёС„СЂС‹ Рё РЅРѕСЂРјР°Р»СЊРЅС‹Р№ СЂР°Р·Р±РѕСЂ вЂ” Р±РµР· РєР°Р·С‘РЅРЅРѕРіРѕ С‚РѕРЅР° Рё РѕРґРёРЅР°РєРѕРІС‹С… С„СЂР°Р·.</Text>

        {loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!loading && !error && games.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>РџР°СѓР·Р° РІ РєР°Р»РµРЅРґР°СЂРµ.</Text>
            <Text style={styles.emptyText}>РќР° СЌС‚Сѓ РґР°С‚Сѓ РёРіСЂ РЅРµС‚. Р›РёРіР° РІР·СЏР»Р° РїРµСЂРµРґС‹С€РєСѓ, Р° РјС‹ вЂ” РєРѕСЂРѕС‚РєСѓСЋ РїР°СѓР·Сѓ РјРµР¶РґСѓ СЃРјРµРЅР°РјРё.</Text>
          </View>
        ) : null}

        {games.map((g) => <MatchCard key={g.id} game={g} onPress={() => router.push(`/game/${g.id}`)} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  logoGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingTop: 40, opacity: 0.14 },
  bgLogo: { width: 72, height: 72, margin: 10 },
  bgOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(7,10,15,0.72)" },
  topBar: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(11,15,20,0.35)" },
  datesRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  dateChip: { minWidth: 72, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" },
  dateChipActive: { backgroundColor: "rgba(214,69,69,0.88)", borderColor: "rgba(255,255,255,0.25)" },
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
  splitDivider: { position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.22)" },
  cardContent: { padding: 14, backgroundColor: "rgba(10,14,20,0.18)" },
  cardHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  state: { color: "#ffe0a3", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  time: { color: "rgba(238,244,251,0.75)", fontSize: 12, fontFamily: fonts.mono },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  teamCol: { flex: 1 },
  teamColRight: { alignItems: "flex-end" },
  teamAbbrev: { color: colors.text, fontSize: 24, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.35)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  teamName: { color: "rgba(238,244,251,0.78)", fontSize: 12, marginTop: 2 },
  teamNameRight: { textAlign: "right" },
  scorePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  score: { color: colors.text, fontSize: 28, fontWeight: "900", minWidth: 88, textAlign: "center", fontFamily: fonts.mono },
  meta: { color: "rgba(238,244,251,0.72)", fontSize: 12, marginTop: 10 },
  mood: { color: "#eef4fb", fontSize: 14, lineHeight: 21, marginTop: 8, fontFamily: fonts.body },
});



