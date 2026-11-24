import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgUri } from "react-native-svg";
import { Game, getGamesByDate } from "../lib/nhl";

const C = {
  bg: "#080D13",
  surface: "#111A24",
  surface2: "#182431",
  stroke: "rgba(226,238,248,0.10)",
  text: "#F2F6FA",
  muted: "#8D9BA9",
  red: "#D83D48",
  ice: "#9CC8E8",
  gold: "#E8C88A",
};

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date).replace(".", "").toUpperCase();
}
function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
}
function fullDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "long" }).format(date);
}
function gameTime(game: Game) {
  if (!game.startTimeUTC) return "ВРЕМЯ НЕИЗВЕСТНО";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(game.startTimeUTC));
}
function stateLabel(game: Game) {
  const state = game.gameState.toUpperCase();
  if (state === "LIVE" || state === "CRIT") return "В ИГРЕ";
  if (state === "FINAL" || state === "OFF") return "МАТЧ ЗАВЕРШЁН";
  if (state === "PRE" || state === "FUT") return "ЕЩЁ НЕ НАЧАЛСЯ";
  return "СТАТУС УТОЧНЯЕТСЯ";
}

function TeamCrest({ abbrev, logo, size = 58 }: { abbrev: string; logo?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const source = logo || `https://assets.nhle.com/logos/nhl/svg/${abbrev}_light.svg`;
  return (
    <View style={[styles.crest, { width: size + 18, height: size + 18 }]}>
      {source && !failed ? (
        <SvgUri
          uri={source}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={styles.crestFallback}>{abbrev}</Text>
      )}
    </View>
  );
}

function DateWheel({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 15 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i - 7);
      return d;
    });
  }, []);

  const activeIndex = dates.findIndex((d) => dateKey(d) === selected);

  useEffect(() => {
    if (activeIndex >= 0) {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: Math.max(0, activeIndex * 82 - 123), animated: false }));
    }
  }, [activeIndex]);

  return (
    <View style={styles.wheelWrap}>
      <View style={styles.wheelHeader}>
        <Text style={styles.eyebrow}>КАЛЕНДАРЬ МАТЧЕЙ</Text>
        <Text style={styles.wheelHint}>ЛИСТАЙ В СТОРОНЫ</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={82}
        snapToAlignment="center"
        contentContainerStyle={styles.wheelContent}
      >
        {dates.map((d, i) => {
          const key = dateKey(d);
          const active = key === selected;
          const delta = i - activeIndex;
          return (
            <Pressable key={key} onPress={() => onSelect(key)} style={styles.dateSlot}>
              <View style={[
                styles.dateCard,
                delta < 0 && styles.dateLeft,
                delta > 0 && styles.dateRight,
                active && styles.dateActive,
              ]}>
                <Text style={[styles.dateDay, active && styles.dateActiveText]}>{dayLabel(d)}</Text>
                <Text style={[styles.dateNumber, active && styles.dateActiveText]}>{dateLabel(d)}</Text>
                {active ? <View style={styles.dateIndicator} /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MatchCard({ game, onPress }: { game: Game; onPress: () => void }) {
  const away = game.awayTeam;
  const home = game.homeTeam;
  const final = ["FINAL", "OFF"].includes(game.gameState.toUpperCase());
  const live = ["LIVE", "CRIT"].includes(game.gameState.toUpperCase());
  const known = typeof away.score === "number" && typeof home.score === "number";
  const awayWon = final && known && away.score! > home.score!;
  const homeWon = final && known && home.score! > away.score!;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.matchCard, pressed && styles.cardPressed]}>
      <View style={styles.matchTopline}>
        <View style={[styles.statusDot, live && styles.statusLive, final && styles.statusFinal]} />
        <Text style={[styles.matchStatus, live && styles.liveText]}>{stateLabel(game)}</Text>
        <Text style={styles.matchTime}>{live ? "СЕЙЧАС" : final ? "ИТОГ" : gameTime(game)}</Text>
      </View>
      <View style={styles.matchBody}>
        <View style={[styles.teamSide, awayWon && styles.winnerSide]}>
          <TeamCrest abbrev={away.abbrev} logo={away.logo} />
          <Text numberOfLines={1} style={styles.teamName}>{away.name}</Text>
          <Text style={styles.teamCode}>{away.abbrev}</Text>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={[styles.score, awayWon && styles.winnerScore]}>{known ? away.score : "—"}</Text>
          <View style={styles.scoreDivider} />
          <Text style={[styles.score, homeWon && styles.winnerScore]}>{known ? home.score : "—"}</Text>
        </View>
        <View style={[styles.teamSide, styles.teamRight, homeWon && styles.winnerSide]}>
          <TeamCrest abbrev={home.abbrev} logo={home.logo} />
          <Text numberOfLines={1} style={styles.teamName}>{home.name}</Text>
          <Text style={styles.teamCode}>{home.abbrev}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>{game.venue || "NHL · REGULAR SEASON"}</Text>
        <Text style={styles.detailsLink}>РАЗБОР МАТЧА ↗</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState(dateKey(new Date()));
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setGames(await getGamesByDate(selected));
    } catch {
      setGames([]);
      setError("Не удалось получить расписание. Проверь подключение и попробуй ещё раз.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  const selectedDate = useMemo(() => new Date(`${selected}T12:00:00`), [selected]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ImageBackground source={{ uri: "https://images.pexels.com/photos/6539276/pexels-photo-6539276.jpeg?auto=compress&cs=tinysrgb&w=1200" }} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
      <View style={styles.scrim} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { minHeight: "100%" }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.ice} />}
      >
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brandOverline}>ХОККЕЙНЫЙ ДНЕВНИК</Text>
            <Text style={styles.brand}>НХЛ<Text style={styles.brandDot}>.</Text></Text>
          </View>
          <View style={styles.leagueBadge}>
            <View style={styles.leagueBadgeDot} />
            <Text style={styles.leagueBadgeText}>NHL 26/27</Text>
          </View>
        </View>

        <DateWheel selected={selected} onSelect={setSelected} />

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionKicker}>ВЫБРАННЫЙ ДЕНЬ</Text>
            <Text style={styles.sectionTitle}>{fullDate(selectedDate)}</Text>
          </View>
          <Text style={styles.gamesCount}>{games.length.toString().padStart(2, "0")} ИГР</Text>
        </View>

        {loading ? (
          <View style={styles.messageState}><ActivityIndicator size="large" color={C.ice} /><Text style={styles.messageText}>Загружаем лёд…</Text></View>
        ) : error ? (
          <Pressable style={styles.messageState} onPress={() => load()}><Text style={styles.errorTitle}>НЕ УДАЛОСЬ ОБНОВИТЬ</Text><Text style={styles.messageText}>{error}</Text><Text style={styles.retry}>ПОВТОРИТЬ</Text></Pressable>
        ) : games.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyPuck} />
            <Text style={styles.emptyTitle}>Сегодня без вбрасываний</Text>
            <Text style={styles.emptyText}>На выбранную дату матчей NHL не запланировано. Перелистни календарь, чтобы посмотреть соседние игровые дни.</Text>
          </View>
        ) : (
          <View style={styles.gamesList}>
            {games.map((game) => (
              <MatchCard key={game.id} game={game} onPress={() => router.push(`/game/${game.id}`)} />
            ))}
          </View>
        )}

        <View style={styles.bottomNote}>
          <View style={styles.bottomRule} />
          <Text style={styles.bottomNoteText}>ИГРА. ЦИФРЫ. КОНТЕКСТ.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5,10,16,0.84)" },
  screen: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 38 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  brandOverline: { color: C.muted, fontSize: 9, fontWeight: "800", letterSpacing: 2.5, marginBottom: 3 },
  brand: { color: C.text, fontSize: 35, fontWeight: "900", letterSpacing: -1.8, lineHeight: 39 },
  brandDot: { color: C.red },
  leagueBadge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 30, borderWidth: 1, borderColor: C.stroke, backgroundColor: "rgba(255,255,255,0.025)" },
  leagueBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red },
  leagueBadgeText: { color: "#BCC8D3", fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  wheelWrap: { marginHorizontal: -20, marginBottom: 28 },
  wheelHeader: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  eyebrow: { color: C.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.7 },
  wheelHint: { color: "#5F7182", fontSize: 8, fontWeight: "800", letterSpacing: 1.3 },
  wheelContent: { paddingHorizontal: 20, alignItems: "center", gap: 0 },
  dateSlot: { width: 82, height: 104, alignItems: "center", justifyContent: "center" },
  dateCard: { width: 72, height: 84, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#131D28", borderWidth: 1, borderColor: "rgba(220,235,248,0.08)", transform: [{ perspective: 500 }, { rotateY: "0deg" }], opacity: 0.78 },
  dateLeft: { transform: [{ perspective: 500 }, { rotateY: "18deg" }, { scale: 0.91 }], marginRight: 4 },
  dateRight: { transform: [{ perspective: 500 }, { rotateY: "-18deg" }, { scale: 0.91 }], marginLeft: 4 },
  dateActive: { height: 96, width: 78, borderRadius: 20, backgroundColor: C.red, borderColor: "rgba(255,255,255,0.42)", borderBottomWidth: 4, borderBottomColor: "#F5A1A6", opacity: 1, transform: [{ perspective: 600 }, { rotateX: "-8deg" }, { scale: 1.04 }], shadowColor: C.red, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 10 },
  dateDay: { color: "#8798A9", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 7 },
  dateNumber: { color: "#E1E8EF", fontSize: 17, fontWeight: "800", letterSpacing: -0.4 },
  dateActiveText: { color: "#FFFFFF" },
  dateIndicator: { width: 13, height: 3, borderRadius: 2, backgroundColor: "#FFD7D8", marginTop: 8 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 15 },
  sectionKicker: { color: C.ice, fontSize: 9, fontWeight: "900", letterSpacing: 2, marginBottom: 5 },
  sectionTitle: { color: C.text, fontSize: Math.min(23, width * 0.058), fontWeight: "800", letterSpacing: -0.6, textTransform: "capitalize" },
  gamesCount: { color: C.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, paddingBottom: 4 },
  gamesList: { gap: 12 },
  matchCard: { backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.stroke, overflow: "hidden" },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.992 }] },
  matchTopline: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold, marginRight: 8 },
  statusLive: { backgroundColor: C.red },
  statusFinal: { backgroundColor: "#7B91A3" },
  matchStatus: { color: C.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  liveText: { color: "#FF727A" },
  matchTime: { marginLeft: "auto", color: C.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  matchBody: { minHeight: 142, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8 },
  teamSide: { flex: 1, alignItems: "center", justifyContent: "center", minWidth: 0, borderRadius: 15, paddingVertical: 7 },
  teamRight: {},
  winnerSide: { backgroundColor: "rgba(216,61,72,0.11)" },
  crest: { alignItems: "center", justifyContent: "center", marginBottom: 5 },
  crestFallback: { color: C.text, fontSize: 16, fontWeight: "900" },
  teamName: { color: C.text, fontSize: 11, fontWeight: "800", textAlign: "center", maxWidth: "100%" },
  teamCode: { color: C.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.4, marginTop: 3 },
  scoreBlock: { width: 92, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  score: { color: "#D8E2EB", fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  winnerScore: { color: "#FFFFFF", textShadowColor: C.red, textShadowRadius: 12 },
  scoreDivider: { width: 1, height: 27, backgroundColor: "rgba(255,255,255,0.15)" },
  cardFooter: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: C.stroke, backgroundColor: "rgba(255,255,255,0.018)" },
  cardFooterText: { color: "#728394", fontSize: 9, fontWeight: "700", letterSpacing: 0.5, flex: 1 },
  detailsLink: { color: C.ice, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 },
  messageState: { minHeight: 180, justifyContent: "center", alignItems: "center", padding: 24, gap: 12, backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.stroke },
  messageText: { color: C.muted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  errorTitle: { color: "#FF858C", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  retry: { color: C.ice, fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 6 },
  emptyState: { minHeight: 230, borderRadius: 22, borderWidth: 1, borderColor: C.stroke, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, paddingVertical: 26 },
  emptyPuck: { width: 22, height: 7, borderRadius: 8, backgroundColor: "#7D8C99", marginBottom: 22, shadowColor: "#000", shadowOpacity: 0.8, shadowRadius: 8, elevation: 5 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: "800", marginBottom: 9, textAlign: "center" },
  emptyText: { color: C.muted, fontSize: 12, lineHeight: 19, textAlign: "center" },
  bottomNote: { alignItems: "center", marginTop: 34, gap: 12 },
  bottomRule: { width: 36, height: 2, backgroundColor: C.red, borderRadius: 2 },
  bottomNoteText: { color: "#506171", fontSize: 8, fontWeight: "900", letterSpacing: 2.5 },
});
