import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

function TeamCrest({ abbrev, size = 58 }: { abbrev: string; logo?: string; size?: number }) {
  return (
    <View style={[styles.crest, { width: size + 18, height: size + 18 }]}>
      <Text style={styles.crestFallback}>{abbrev}</Text>
    </View>
  );
}

function DateWheel({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
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
        onMomentumScrollEnd={(event) => {
          const raw = Math.round((event.nativeEvent.contentOffset.x + width / 2 - 61) / 82);
          const index = Math.max(0, Math.min(dates.length - 1, raw));
          onSelect(dateKey(dates[index]));
        }}
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

function LiveBadge() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.liveDot, { opacity }]} />
      <Text style={styles.liveBadgeText}>LIVE</Text>
    </View>
  );
}

function moscowTime(game: Game) {
  if (!game.startTimeUTC) return "ВРЕМЯ НЕИЗВЕСТНО";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" }).format(new Date(game.startTimeUTC)) + " МСК";
}
const TEAM_TINTS: Record<string, string> = {
  VGK: "#8B1E32", EDM: "#123B70", NYR: "#174A86", BOS: "#8A7135",
  TOR: "#164B91", MTL: "#8B1F35", CHI: "#8B1F35", DET: "#8C1F32",
  WSH: "#8C1F32", CAR: "#8C1F32", FLA: "#8C1F32", NJD: "#8C1F32",
  COL: "#7B2638", DAL: "#176044", SEA: "#155B61", LAK: "#4A4D55",
};
function MatchCard({ game, onPress }: { game: Game; onPress: () => void }) {
  const away = game.awayTeam;
  const home = game.homeTeam;
  const state = game.gameState.toUpperCase();
  const final = ["FINAL", "OFF"].includes(state);
  const live = ["LIVE", "CRIT"].includes(state);
  const known = typeof away.score === "number" && typeof home.score === "number";
  const scoreText = known ? `${away.score} : ${home.score}` : "— : —";
  const awayTint = TEAM_TINTS[away.abbrev] || "#26384E";
  const homeTint = TEAM_TINTS[home.abbrev] || "#26384E";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.matchCard, pressed && styles.cardPressed]}>
      <View style={styles.matchTopline}>
        <Text style={styles.matchTimeCenter}>{moscowTime(game)}</Text>
        {live ? <LiveBadge /> : (
          <Text style={[styles.matchStatus, final ? styles.finalStatus : styles.futureStatus]}>
            {final ? "МАТЧ ОКОНЧЕН" : stateLabel(game)}
          </Text>
        )}
      </View>
      <View style={styles.matchBody}>
        <View style={[styles.teamHalf, { backgroundColor: awayTint + "80" }]}>
          <TeamCrest abbrev={away.abbrev} logo={away.logo} size={70} />
          <Text numberOfLines={2} style={styles.teamName}>{away.name}</Text>
          <Text style={styles.teamCode}>{away.abbrev}</Text>
        </View>
        <View style={styles.scoreOverlay}>
          <Text style={[styles.score, styles.scoreLarge]}>{scoreText}</Text>
          {live ? <Text style={styles.periodText}>ИДЁТ МАТЧ</Text> : null}
        </View>
        <View style={[styles.teamHalf, styles.teamHalfRight, { backgroundColor: homeTint + "80" }]}>
          <TeamCrest abbrev={home.abbrev} logo={home.logo} size={70} />
          <Text numberOfLines={2} style={styles.teamName}>{home.name}</Text>
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

