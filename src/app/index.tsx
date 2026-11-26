import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, Image, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Game, getGamesByDate } from "../lib/nhl";

const C = {
  bg: "#080D13", surface: "#111A24", surface2: "#182431",
  stroke: "rgba(226,238,248,0.10)", text: "#F2F6FA", muted: "#8D9BA9",
  red: "#D83D48", ice: "#9CC8E8", gold: "#E8C88A",
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("ru-RU",{weekday:"short"}).format(date).replace(".","").toUpperCase();
}
function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("ru-RU",{day:"2-digit",month:"2-digit"}).format(date);
}
function fullDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long",weekday:"long"}).format(date);
}
function moscowTime(game: Game) {
  if (!game.startTimeUTC) return "ВРЕМЯ НЕИЗВЕСТНО";
  return new Intl.DateTimeFormat("ru-RU",{timeZone:"Europe/Moscow",hour:"2-digit",minute:"2-digit"}).format(new Date(game.startTimeUTC))+" МСК";
}
function stateLabel(game: Game) {
  const s=(game.gameState||"").toUpperCase();
  if (s==="LIVE"||s==="CRIT") return "В ИГРЕ";
  if (s==="FINAL"||s==="OFF") return "МАТЧ ОКОНЧЕН";
  if (s==="PRE"||s==="FUT") return "ЕЩЁ НЕ НАЧАЛСЯ";
  return "СТАТУС УТОЧНЯЕТСЯ";
}

function DateWheel({selected,onSelect}:{selected:string;onSelect:(key:string)=>void}) {
  const ref=useRef<ScrollView>(null);
  const {width}=useWindowDimensions();
  const dates=useMemo(()=>Array.from({length:15},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i-7);return d;}),[]);
  const active=dates.findIndex(d=>dateKey(d)===selected);
  useEffect(()=>{if(active>=0) requestAnimationFrame(()=>ref.current?.scrollTo({x:Math.max(0,active*82-(width-82)/2),animated:false}));},[active,width]);
  return <View style={styles.wheelWrap}>
    <View style={styles.wheelHeader}><Text style={styles.eyebrow}>КАЛЕНДАРЬ МАТЧЕЙ</Text><Text style={styles.wheelHint}>ЛИСТАЙ В СТОРОНЫ</Text></View>
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={82} snapToAlignment="start"
      contentContainerStyle={[styles.wheelContent,{paddingHorizontal:Math.max(0,(width-82)/2)}]}
      onMomentumScrollEnd={e=>{const i=Math.max(0,Math.min(dates.length-1,Math.round(e.nativeEvent.contentOffset.x/82)));onSelect(dateKey(dates[i]));}}>
      {dates.map((d,i)=>{const key=dateKey(d),isActive=key===selected,delta=i-active;return <Pressable key={key} onPress={()=>onSelect(key)} style={styles.dateSlot}>
        <View style={[styles.dateCard,delta<0&&styles.dateLeft,delta>0&&styles.dateRight,isActive&&styles.dateActive]}>
          <Text style={[styles.dateDay,isActive&&styles.dateActiveText]}>{dayLabel(d)}</Text>
          <Text style={[styles.dateNumber,isActive&&styles.dateActiveText]}>{dateLabel(d)}</Text>
          {isActive?<View style={styles.dateIndicator}/>:null}
        </View>
      </Pressable>;})}
    </ScrollView>
  </View>;
}

function LiveBadge() {
  const opacity=useRef(new Animated.Value(1)).current;
  useEffect(()=>{const a=Animated.loop(Animated.sequence([
    Animated.timing(opacity,{toValue:.45,duration:750,useNativeDriver:true}),
    Animated.timing(opacity,{toValue:1,duration:750,useNativeDriver:true}),
  ]));a.start();return()=>a.stop();},[opacity]);
  return <View style={styles.liveBadge}><Animated.View style={[styles.liveDot,{opacity}]}/><Text style={styles.liveBadgeText}>LIVE</Text></View>;
}

function TeamCrest({id,abbrev,size=62}:{id:number;abbrev:string;size?:number}) {
  const [failed,setFailed]=useState(false);
  const uri=id? `https://assets.nhle.com/logos/nhl/svg/${abbrev}_light.svg` : "";
  return <View style={[styles.crest,{width:size+16,height:size+16}]}>
    {uri&&!failed?<Image source={{uri}} style={{width:size,height:size}} resizeMode="contain" onError={()=>setFailed(true)}/>:<Text style={styles.crestFallback}>{abbrev}</Text>}
  </View>;
}

const TEAM_TINTS:Record<string,string>={VGK:"#8B1E32",EDM:"#123B70",NYR:"#174A86",BOS:"#8A7135",TOR:"#164B91",MTL:"#8B1F35",CHI:"#8B1F35",DET:"#8C1F32",WSH:"#8C1F32",CAR:"#8C1F32",FLA:"#8C1F32",NJD:"#8C1F32",COL:"#7B2638",DAL:"#176044",SEA:"#155B61",LAK:"#4A4D55"};

function MatchCard({game,onPress}:{game:Game;onPress:()=>void}) {
  const a=game.awayTeam,h=game.homeTeam,s=(game.gameState||"").toUpperCase();
  const final=s==="FINAL"||s==="OFF",live=s==="LIVE"||s==="CRIT";
  const known=typeof a.score==="number"&&typeof h.score==="number";
  return <Pressable onPress={onPress} style={({pressed})=>[styles.matchCard,pressed&&styles.cardPressed]}>
    <View style={styles.matchTopline}>
      <Text style={styles.matchTimeCenter}>{moscowTime(game)}</Text>
      {live?<LiveBadge/>:<Text style={[styles.matchStatus,final?styles.finalStatus:styles.futureStatus]}>{stateLabel(game)}</Text>}
    </View>
    <View style={styles.matchBody}>
      <View style={[styles.teamHalf,{backgroundColor:(TEAM_TINTS[a.abbrev]||"#26384E")+"80"}]}>
        <TeamCrest id={a.id} abbrev={a.abbrev} size={66}/>
        <Text numberOfLines={2} style={styles.teamName}>{a.name}</Text><Text style={styles.teamCode}>{a.abbrev}</Text>
      </View>
      <View style={styles.scoreOverlay}><Text style={styles.score}>{known?`${a.score} : ${h.score}`:"— : —"}</Text>{live?<Text style={styles.periodText}>ИДЁТ МАТЧ</Text>:null}</View>
      <View style={[styles.teamHalf,styles.teamHalfRight,{backgroundColor:(TEAM_TINTS[h.abbrev]||"#26384E")+"80"}]}>
        <TeamCrest id={h.id} abbrev={h.abbrev} size={66}/>
        <Text numberOfLines={2} style={styles.teamName}>{h.name}</Text><Text style={styles.teamCode}>{h.abbrev}</Text>
      </View>
    </View>
    <View style={styles.cardFooter}><Text style={styles.cardFooterText}>{game.venue||"NHL · REGULAR SEASON"}</Text><Text style={styles.detailsLink}>РАЗБОР МАТЧА ↗</Text></View>
  </Pressable>;
}

export default function HomeScreen() {
  const router=useRouter();
  const [selected,setSelected]=useState(dateKey(new Date()));
  const [games,setGames]=useState<Game[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState("");
  const load=useCallback(async(showSpinner:boolean)=>{
    if(showSpinner)setLoading(true);
    setError("");
    try {const result=await getGamesByDate(selected);setGames(result);}
    catch(e){setError("Не удалось загрузить расписание NHL. Проверь подключение к интернету и попробуй ещё раз.");}
    finally{setLoading(false);setRefreshing(false);}
  },[selected]);
  useEffect(()=>{load(true);},[load]);
  const onRefresh=useCallback(()=>{setRefreshing(true);load(false);},[load]);
  const liveCount=games.filter(g=>["LIVE","CRIT"].includes((g.gameState||"").toUpperCase())).length;
  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.ice}/>}>
      <View style={styles.header}>
        <View style={styles.brandIcon}><Text style={styles.brandN}>N</Text><Text style={styles.brandHL}>HL</Text></View>
        <View style={styles.brandCopy}><Text style={styles.brandTitle}>НХЛ</Text><Text style={styles.brandSub}>МАТЧИ  ·  РЕЗУЛЬТАТЫ  ·  АНАЛИТИКА</Text></View>
      </View>
      <DateWheel selected={selected} onSelect={setSelected}/>
      <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>МАТЧИ ДНЯ</Text><Text style={styles.sectionDate}>{fullDate(new Date(selected+"T12:00:00"))}</Text></View><Text style={styles.gameCount}>{games.length} ИГР{games.length===1?"А":games.length>1&&games.length<5?"Ы":""}{liveCount>0? " · "+liveCount+" LIVE":""}</Text></View>
      {loading?<View style={styles.stateBox}><ActivityIndicator color={C.ice} size="large"/><Text style={styles.stateText}>Загружаем расписание…</Text></View>:
       error?<View style={styles.stateBox}><Text style={styles.errorTitle}>НЕТ СВЯЗИ</Text><Text style={styles.stateText}>{error}</Text><Pressable onPress={()=>load(true)} style={styles.retryButton}><Text style={styles.retryText}>ПОВТОРИТЬ</Text></Pressable></View>:
       games.length===0?<View style={styles.stateBox}><Text style={styles.emptyTitle}>НА ЭТУ ДАТУ ИГР НЕТ</Text><Text style={styles.stateText}>Выбери другую дату в календаре матчей.</Text></View>:
       <View style={styles.gamesList}>{games.map(g=><MatchCard key={g.id} game={g} onPress={()=>router.push({pathname:"/game/[id]",params:{id:String(g.id)}})}/>)}</View>}
      <Text style={styles.footerNote}>ДАННЫЕ МАТЧЕЙ · NHL OFFICIAL API</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},
 header:{flexDirection:"row",alignItems:"center",paddingHorizontal:22,paddingTop:18,paddingBottom:16,gap:14},
 brandIcon:{width:54,height:54,borderRadius:17,backgroundColor:"#18D927",alignItems:"center",justifyContent:"center",overflow:"hidden"},
 brandN:{position:"absolute",fontSize:29,fontWeight:"900",color:"#07110A",transform:[{rotate:"-28deg"},{translateX:-4},{translateY:-5}]},
 brandHL:{fontSize:18,fontWeight:"900",color:"#07110A",transform:[{rotate:"-28deg"},{translateX:5},{translateY:6}]},
 brandCopy:{flex:1},brandTitle:{fontSize:34,color:C.text,fontWeight:"300",letterSpacing:1},brandSub:{fontSize:9,color:C.muted,letterSpacing:1.6,marginTop:4},
 wheelWrap:{paddingTop:10,paddingBottom:12,backgroundColor:"#0A1017"},
 wheelHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:22,paddingBottom:12},
 eyebrow:{color:C.muted,fontSize:10,fontWeight:"800",letterSpacing:1.7},wheelHint:{color:"#5F6F80",fontSize:8,letterSpacing:1.2},
 wheelContent:{alignItems:"center"},dateSlot:{width:82,alignItems:"center"},
 dateCard:{width:72,height:116,borderRadius:28,backgroundColor:"#17212D",alignItems:"center",justifyContent:"center",gap:12,borderWidth:1,borderColor:"rgba(255,255,255,0.025)"},
 dateLeft:{transform:[{scale:.91}],opacity:.74},dateRight:{transform:[{scale:.91}],opacity:.74},
 dateActive:{backgroundColor:C.red,borderColor:"#F06A74",transform:[{scale:1.08}],shadowColor:C.red,shadowOpacity:.25,shadowRadius:12,elevation:5},
 dateDay:{fontSize:13,color:"#9EADBC",fontWeight:"600",letterSpacing:1},dateNumber:{fontSize:18,color:C.text,fontWeight:"500",fontVariant:["tabular-nums"]},
 dateActiveText:{color:"#FFFFFF"},dateIndicator:{width:16,height:3,borderRadius:3,backgroundColor:"#FFFFFF"},
 sectionHeading:{paddingHorizontal:22,paddingTop:24,paddingBottom:14,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 sectionTitle:{color:C.text,fontSize:18,fontWeight:"700",letterSpacing:1.1},sectionDate:{color:C.muted,fontSize:10,marginTop:5,textTransform:"capitalize"},
 gameCount:{color:C.muted,fontSize:10,letterSpacing:1},
 gamesList:{paddingHorizontal:16,gap:14,paddingBottom:18},
 matchCard:{borderRadius:28,backgroundColor:C.surface,borderWidth:1,borderColor:C.stroke,overflow:"hidden"},
 cardPressed:{opacity:.88,transform:[{scale:.995}]},
 matchTopline:{minHeight:46,flexDirection:"row",alignItems:"center",justifyContent:"center",paddingHorizontal:16,position:"relative"},
 matchTimeCenter:{color:C.muted,fontSize:11,fontWeight:"700",letterSpacing:1.2},
 matchStatus:{position:"absolute",left:18,fontSize:9,fontWeight:"900",letterSpacing:1.2},
 finalStatus:{color:C.gold},futureStatus:{color:C.muted},
 liveBadge:{position:"absolute",right:17,flexDirection:"row",alignItems:"center",gap:6},
 liveDot:{width:7,height:7,borderRadius:4,backgroundColor:"#F04452"},
 liveBadgeText:{color:"#F04452",fontSize:10,fontWeight:"900",letterSpacing:1.2,textShadowColor:"#FFFFFF",textShadowRadius:1},
 matchBody:{flexDirection:"row",minHeight:190,position:"relative"},
 teamHalf:{flex:1,alignItems:"center",justifyContent:"center",paddingVertical:16,paddingHorizontal:6,gap:5},
 teamHalfRight:{},
 crest:{borderRadius:100,backgroundColor:"rgba(20,31,44,0.72)",alignItems:"center",justifyContent:"center"},
 crestFallback:{color:C.text,fontSize:16,fontWeight:"900"},
 teamName:{color:C.text,fontSize:12,fontWeight:"700",textAlign:"center",minHeight:16},
 teamCode:{color:"#B7C4D1",fontSize:9,fontWeight:"800",letterSpacing:1.5},
 scoreOverlay:{position:"absolute",left:"35%",right:"35%",top:0,bottom:0,alignItems:"center",justifyContent:"center",zIndex:2,pointerEvents:"none"},
 score:{color:C.text,fontSize:31,fontWeight:"800",letterSpacing:-1.3,fontVariant:["tabular-nums"],textShadowColor:"#080D13",textShadowRadius:8},
 periodText:{color:C.red,fontSize:8,fontWeight:"900",letterSpacing:1.2,marginTop:5},
 cardFooter:{borderTopWidth:1,borderTopColor:C.stroke,minHeight:38,paddingHorizontal:17,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 cardFooterText:{color:"#718294",fontSize:8,letterSpacing:.8},detailsLink:{color:C.ice,fontSize:8,fontWeight:"800",letterSpacing:1},
 stateBox:{marginHorizontal:18,marginTop:8,marginBottom:30,minHeight:180,borderRadius:24,backgroundColor:C.surface,alignItems:"center",justifyContent:"center",padding:24,gap:12,borderWidth:1,borderColor:C.stroke},
 stateText:{color:C.muted,fontSize:13,lineHeight:20,textAlign:"center"},errorTitle:{color:"#FF858C",fontSize:12,fontWeight:"900",letterSpacing:2},
 emptyTitle:{color:C.text,fontSize:13,fontWeight:"900",letterSpacing:1.3},
 retryButton:{backgroundColor:C.red,borderRadius:20,paddingHorizontal:22,paddingVertical:11,marginTop:4},retryText:{color:"#FFFFFF",fontSize:10,fontWeight:"900",letterSpacing:1},
 footerNote:{color:"#506174",fontSize:8,textAlign:"center",letterSpacing:1.4,paddingTop:8,paddingBottom:28},
});
