package com.nhl.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.coroutines.delay
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs

private val BG=Color(0xFF080B10)
private val PANEL=Color(0xFF171D26)
private val MUTED=Color(0xFF9AA6B5)
private val RED=Color(0xFFE3263D)
private val GOLD=Color(0xFFE8CB91)

data class Game(val id:Int,val away:String,val home:String,val awayName:String,val homeName:String,val awayScore:Int,val homeScore:Int,val state:String)

class MainActivity:ComponentActivity(){
 override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState)
  window.statusBarColor=android.graphics.Color.rgb(8,11,16)
  window.navigationBarColor=android.graphics.Color.rgb(8,11,16)
  setContent { NHLApp() }
 }
}

@Composable fun NHLApp(){
 var date by remember { mutableStateOf(LocalDate.now()) }
 var games by remember { mutableStateOf<List<Game>>(emptyList()) }
 var loading by remember { mutableStateOf(true) }
 var error by remember { mutableStateOf(false) }
 var detail by remember { mutableStateOf<Game?>(null) }
 var retry by remember { mutableIntStateOf(0) }
 LaunchedEffect(date,retry){
  // Wait until the user finishes the 3D date-wheel swipe before requesting the NHL API.
  delay(350)
  loading=true
  error=false
  var loaded: List<Game>? = null
  var lastError: Exception? = null
  for(attempt in 0..2){
   try {
    loaded=withContext(Dispatchers.IO){fetchGames(date)}
    lastError=null
    break
   } catch(e:Exception){
    lastError=e
    if(attempt<2) delay(650L*(attempt+1))
   }
  }
  if(loaded!=null){games=loaded;error=false}
  else {games=emptyList();error=true}
  loading=false
 }
 MaterialTheme(colorScheme=darkColorScheme(background=BG,surface=PANEL,primary=RED,onSurface=Color.White)){
  Surface(Modifier.fillMaxSize(),color=BG){
   if(detail!=null) DetailScreen(detail!!){detail=null}
   else Column(Modifier.fillMaxSize()){
    Column(Modifier.padding(start=22.dp,end=22.dp,top=12.dp,bottom=10.dp)){
     Row(verticalAlignment=Alignment.CenterVertically){
      Box(Modifier.size(42.dp).clip(RoundedCornerShape(12.dp)).background(Brush.linearGradient(listOf(RED,Color(0xFF741421)))),contentAlignment=Alignment.Center){
       Text("Н",fontSize=27.sp,fontWeight=FontWeight.Black,color=Color.White)
      }
      Spacer(Modifier.width(12.dp))
      Column {
       Text("НХЛ",fontSize=29.sp,fontWeight=FontWeight.Black,letterSpacing=2.sp,lineHeight=31.sp)
       Text("МАТЧИ  •  РЕЗУЛЬТАТЫ  •  АНАЛИТИКА",fontSize=9.sp,color=MUTED,letterSpacing=1.15.sp)
      }
     }
    }
    DateCarousel(date){date=it}
    Row(Modifier.fillMaxWidth().padding(start=22.dp,end=22.dp,top=18.dp,bottom=8.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.SpaceBetween){
     Text("МАТЧИ ДНЯ",fontSize=14.sp,fontWeight=FontWeight.Bold,letterSpacing=1.2.sp)
     Text(games.size.toString()+" ИГР",fontSize=11.sp,color=MUTED,letterSpacing=1.sp)
    }
    Box(Modifier.weight(1f)){
     Rink(Modifier.fillMaxSize())
     when{
      loading->Box(Modifier.fillMaxSize(),Alignment.Center){CircularProgressIndicator(color=RED)}
      error->Column(Modifier.fillMaxSize(),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center){
       Text("Не удалось загрузить расписание NHL",color=MUTED,textAlign=TextAlign.Center)
       Spacer(Modifier.height(12.dp))
       Button(onClick={retry++},colors=ButtonDefaults.buttonColors(containerColor=RED)){Text("Повторить")}
      }
      games.isEmpty()->Box(Modifier.fillMaxSize(),Alignment.Center){Text("На эту дату матчей нет",color=MUTED)}
      else->LazyColumn(contentPadding=PaddingValues(start=16.dp,end=16.dp,top=8.dp,bottom=28.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
       items(games,key={it.id}){g->GameCard(g){detail=g}}
      }
     }
    }
   }
  }
 }
}

@Composable fun DateCarousel(selected:LocalDate,onSelect:(LocalDate)->Unit){
 val dates=remember { (-30..30).map{LocalDate.now().plusDays(it.toLong())} }
 val selectedIndex=dates.indexOf(selected).coerceAtLeast(0)
 val list= rememberLazyListState(initialFirstVisibleItemIndex=selectedIndex)
 val fling=rememberSnapFlingBehavior(lazyListState=list)
 LaunchedEffect(selected){list.animateScrollToItem(dates.indexOf(selected).coerceAtLeast(0))}
 LaunchedEffect(list){
  snapshotFlow {
   val info=list.layoutInfo
   val center=(info.viewportStartOffset+info.viewportEndOffset)/2
   info.visibleItemsInfo.minByOrNull{abs((it.offset+it.size/2)-center)}?.index
  }.filterNotNull().distinctUntilChanged().collect{idx->dates.getOrNull(idx)?.let(onSelect)}
 }
 BoxWithConstraints(Modifier.fillMaxWidth().height(108.dp)){
  val side=(maxWidth-78.dp)/2
  LazyRow(state=list,flingBehavior=fling,contentPadding=PaddingValues(horizontal=side),horizontalArrangement=Arrangement.spacedBy(10.dp),modifier=Modifier.fillMaxSize(),verticalAlignment=Alignment.CenterVertically){
   itemsIndexed(dates){index,d->
    val distance=index-selectedIndex
    val active=d==selected
    val rotation= (distance*11f).coerceIn(-48f,48f)
    val scale=1f-(abs(distance).coerceAtMost(4)*.055f)
    Column(Modifier.width(78.dp).height(if(active)96.dp else 84.dp)
      .graphicsLayer{rotationY=rotation;scaleX=scale;scaleY=scale;cameraDistance=18* density}
      .shadow(if(active)14.dp else 2.dp,RoundedCornerShape(19.dp),ambientColor=if(active)RED.copy(alpha=.45f)else Color.Transparent,spotColor=if(active)RED.copy(alpha=.35f)else Color.Transparent)
      .clip(RoundedCornerShape(19.dp))
      .background(if(active)Brush.verticalGradient(listOf(Color(0xFFF04455),Color(0xFF941B2A))) else Brush.verticalGradient(listOf(Color(0xFF202936),Color(0xFF141A23))))
      .clickable{onSelect(d)}
      .padding(vertical=12.dp),
      horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center){
      Text(d.format(DateTimeFormatter.ofPattern("EEE",Locale("ru"))).uppercase(Locale("ru")),fontSize=11.sp,color=if(active)Color.White else MUTED,fontWeight=FontWeight.Bold)
      Spacer(Modifier.height(7.dp))
      Text(d.format(DateTimeFormatter.ofPattern("dd.MM")),fontSize=18.sp,color=Color.White,fontWeight=FontWeight.Bold)
     }
   }
  }
 }
}

@Composable fun Rink(modifier:Modifier){
 Canvas(modifier){
  val w=size.width;val h=size.height;val rw=w*.91f;val rh=h*.92f;val l=(w-rw)/2;val t=(h-rh)/2
  drawRect(Color(0xFF0B1017))
  drawRoundRect(Color(0xFF18232F),androidx.compose.ui.geometry.Offset(l,t),androidx.compose.ui.geometry.Size(rw,rh),androidx.compose.ui.geometry.CornerRadius(rw*.15f))
  drawRoundRect(Color(0xFF344252),androidx.compose.ui.geometry.Offset(l,t),androidx.compose.ui.geometry.Size(rw,rh),androidx.compose.ui.geometry.CornerRadius(rw*.15f),style=Stroke(width=5.dp.toPx()))
  listOf(.25f,.5f,.75f).forEachIndexed{i,v->drawLine(if(i==1)RED.copy(alpha=.24f)else Color(0xFF315A83).copy(alpha=.28f),androidx.compose.ui.geometry.Offset(l,t+rh*v),androidx.compose.ui.geometry.Offset(l+rw,t+rh*v),3.dp.toPx())}
  drawCircle(Color(0xFF31516D).copy(alpha=.22f),rw*.19f,androidx.compose.ui.geometry.Offset(w/2,h/2),style=Stroke(3.dp.toPx()))
  listOf(.13f,.87f).forEach{y->listOf(.25f,.75f).forEach{x->drawCircle(RED.copy(alpha=.12f),rw*.105f,androidx.compose.ui.geometry.Offset(l+rw*x,t+rh*y),style=Stroke(3.dp.toPx()))}}
 }
}

@Composable fun GameCard(g:Game,onClick:()->Unit){
 val final=g.state.contains("FINAL",true)||g.state=="OFF"
 val live=g.state=="LIVE"||g.state=="CRIT"
 val hasScore=final||live||g.state=="OFF"
 val awayWon=final&&g.awayScore>g.homeScore
 val homeWon=final&&g.homeScore>g.awayScore
 val context= LocalContext.current
 val imageLoader= remember { ImageLoader.Builder(context).components{add(SvgDecoder.Factory())}.build() }
 Card(onClick=onClick,modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(23.dp),colors=CardDefaults.cardColors(containerColor=Color(0xF219202A))){
  Column(Modifier.padding(horizontal=18.dp,vertical=14.dp)){
   Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){
    Row(verticalAlignment=Alignment.CenterVertically){
     if(live) Box(Modifier.size(7.dp).clip(CircleShape).background(RED))
     Text(when{live->"В ПРЯМОМ ЭФИРЕ";final->"ФИНАЛ";else->"ПРЕДСТОИТ"},modifier=Modifier.padding(start=if(live)6.dp else 0.dp),fontSize=10.sp,color=if(live)RED else GOLD,fontWeight=FontWeight.Bold,letterSpacing=.8.sp)
    }
    Text("NHL",fontSize=10.sp,color=MUTED,letterSpacing=1.sp)
   }
   Spacer(Modifier.height(12.dp))
   Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){
    TeamLogo(g.away,g.awayName,Modifier.weight(1f),imageLoader,awayWon,false)
    Column(horizontalAlignment=Alignment.CenterHorizontally,modifier=Modifier.width(94.dp)){
     Text(if(hasScore)"${g.awayScore} : ${g.homeScore}" else "— : —",fontSize=25.sp,fontWeight=FontWeight.Black,letterSpacing=1.sp,color=Color.White)
     if(live)Text(g.state,fontSize=9.sp,color=RED)
    }
    TeamLogo(g.home,g.homeName,Modifier.weight(1f),imageLoader,homeWon,true)
   }
  }
 }
}

@Composable fun TeamLogo(abbr:String,name:String,modifier:Modifier,imageLoader:ImageLoader,winner:Boolean,right:Boolean){
 Column(modifier,horizontalAlignment=if(right)Alignment.End else Alignment.Start){
  Box(Modifier.size(58.dp).shadow(if(winner)16.dp else 0.dp,CircleShape,ambientColor=if(winner)RED.copy(alpha=.75f)else Color.Transparent,spotColor=if(winner)RED.copy(alpha=.65f)else Color.Transparent).clip(CircleShape).background(if(winner)Color(0xFF70202C)else Color(0xFF253140)),contentAlignment=Alignment.Center){
   AsyncImage(model="https://assets.nhle.com/logos/nhl/svg/${abbr}_light.svg",imageLoader=imageLoader,contentDescription=name,modifier=Modifier.fillMaxSize().padding(7.dp))
  }
  Spacer(Modifier.height(5.dp))
  Text(name,fontSize=11.sp,fontWeight=FontWeight.SemiBold,color=Color(0xFFE2E6EC),maxLines=1)
 }
}


data class MatchReport(
 val paragraphs:List<String>,
 val scorers:List<String>,
 val awayShots:Int?,
 val homeShots:Int?,
 val statsAvailable:Boolean
)

@Composable fun DetailScreen(g:Game,onBack:()->Unit){
 val context= LocalContext.current
 var report by remember(g.id){mutableStateOf<MatchReport?>(null)}
 var loading by remember(g.id){mutableStateOf(true)}
 var failed by remember(g.id){mutableStateOf(false)}
 var retryReport by remember(g.id){mutableIntStateOf(0)}
 LaunchedEffect(g.id,retryReport){
  loading=true;failed=false
  try { report=withContext(Dispatchers.IO){fetchMatchReport(g)} }
  catch(_:Exception){failed=true}
  loading=false
 }
 Column(Modifier.fillMaxSize().background(BG)){
  Text("‹  НАЗАД",modifier=Modifier.clickable{onBack()}.padding(start=22.dp,top=20.dp,bottom=14.dp),fontSize=15.sp,color=Color.White)
  LazyColumn(contentPadding=PaddingValues(start=22.dp,end=22.dp,bottom=32.dp)){
   item {
    Spacer(Modifier.height(20.dp))
    Text("КАРТОЧКА МАТЧА",color=RED,fontWeight=FontWeight.Bold,letterSpacing=2.sp)
    Spacer(Modifier.height(14.dp))
    Text(g.awayName+" — "+g.homeName,fontSize=25.sp,fontWeight=FontWeight.Bold,color=Color.White)
    Text(if(g.state.contains("FINAL",true)||g.state=="OFF")"Итоговый счёт" else if(g.state=="LIVE"||g.state=="CRIT")"Матч продолжается" else "Матч ещё не начался",fontSize=13.sp,color=MUTED)
    Spacer(Modifier.height(8.dp))
    Text(g.awayScore.toString()+" : "+g.homeScore,fontSize=46.sp,fontWeight=FontWeight.Black,color=Color.White)
    Spacer(Modifier.height(25.dp))
    Text("РАЗБОР МАТЧА",fontSize=18.sp,fontWeight=FontWeight.Bold,color=Color.White)
    Spacer(Modifier.height(10.dp))
   }
   when{
    loading->item { Row(verticalAlignment=Alignment.CenterVertically){CircularProgressIndicator(color=RED,modifier=Modifier.size(20.dp),strokeWidth=2.dp);Spacer(Modifier.width(12.dp));Text("Собираем факты из игрового отчёта NHL…",color=MUTED,fontSize=13.sp)} }
    failed||report==null->item {
     Text("Не удалось получить игровой отчёт NHL. Проверь подключение и попробуй ещё раз.",fontSize=14.sp,lineHeight=21.sp,color=MUTED)
     Spacer(Modifier.height(10.dp))
     Button(onClick={retryReport++},colors=ButtonDefaults.buttonColors(containerColor=RED)){Text("Обновить отчёт")}
    }
    else->{
     val r=report!!
     if(r.awayShots!=null&&r.homeShots!=null)item {
      Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(PANEL).padding(16.dp),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){
       Column {Text("БРОСКИ В СТВОР",fontSize=10.sp,color=MUTED,letterSpacing=1.sp);Text("${r.awayShots}  —  ${r.homeShots}",fontSize=22.sp,fontWeight=FontWeight.Bold,color=Color.White)}
       Text("ГОСТИ       ХОЗЯЕВА",fontSize=9.sp,color=MUTED)
      }
      Spacer(Modifier.height(18.dp))
     }
     if(r.scorers.isNotEmpty())item {
      Text("ГОЛЫ",fontSize=11.sp,color=GOLD,fontWeight=FontWeight.Bold,letterSpacing=1.5.sp)
      Spacer(Modifier.height(8.dp))
      r.scorers.forEach { line -> Text(line,fontSize=13.sp,lineHeight=19.sp,color=Color(0xFFE2E6EC),modifier=Modifier.padding(bottom=5.dp)) }
      Spacer(Modifier.height(14.dp))
     }
     items(r.paragraphs.size){i->
      Text(r.paragraphs[i],fontSize=15.sp,lineHeight=23.sp,color=Color(0xFFD4DCE5))
      Spacer(Modifier.height(11.dp))
     }
     if(!r.statsAvailable)item {
      Text("В официальном фиде для этого матча доступна не вся расширенная статистика; обзор построен только на подтверждённых событиях и счёте.",fontSize=12.sp,lineHeight=18.sp,color=MUTED)
     }
    }
   }
  }
 }
}

fun fetchMatchReport(g:Game):MatchReport{
 fun get(url:String):JSONObject{
  val c=URL(url).openConnection() as HttpURLConnection
  c.connectTimeout=12000;c.readTimeout=12000
  try{return JSONObject(c.inputStream.bufferedReader().use{it.readText()})}finally{c.disconnect()}
 }
 val landing=get("https://api-web.nhle.com/v1/gamecenter/${g.id}/landing")
 val box=try{get("https://api-web.nhle.com/v1/gamecenter/${g.id}/boxscore")}catch(_:Exception){JSONObject()}
 val away=landing.optJSONObject("awayTeam")?:JSONObject()
 val home=landing.optJSONObject("homeTeam")?:JSONObject()
 val awayShots=if(away.has("sog"))away.optInt("sog") else null
 val homeShots=if(home.has("sog"))home.optInt("sog") else null
 val scoring=landing.optJSONArray("scoring")
 val scorers=mutableListOf<String>()
 var goalCount=0
 if(scoring!=null) for(i in 0 until scoring.length()){
  val period=scoring.optJSONObject(i)?:continue
  val p=period.optJSONObject("periodDescriptor")?.optInt("number")?:i+1
  val goals=period.optJSONArray("goals")?:continue
  for(j in 0 until goals.length()){
   val goal=goals.optJSONObject(j)?:continue
   goalCount++
   val name=goal.optJSONObject("name")?.optString("default")?.takeIf{!it.isNullOrBlank()}?:goal.optString("name","Автор гола")
   val team=goal.optJSONObject("teamAbbrev")?.optString("default")?:goal.optString("teamAbbrev","")
   val time=goal.optString("timeInPeriod","")
   val strength=when(goal.optString("strength")){"PPG"->"в большинстве";"SHG"->"в меньшинстве";else->"в равных составах"}
   val assists=goal.optJSONArray("assists")
   val assistNames=mutableListOf<String>()
   if(assists!=null)for(k in 0 until assists.length()){
    val a=assists.optJSONObject(k)?:continue
    val n=a.optJSONObject("name")?.optString("default")?:a.optString("name","")
    if(n.isNotBlank())assistNames.add(n)
   }
   scorers.add("${p}-й период, ${time}: ${team} — ${name} (${strength})" + (if(assistNames.isNotEmpty()) " · пас: "+assistNames.joinToString(", ") else ""))
  }
 }
 val paragraphs=mutableListOf<String>()
 val winner=when{g.awayScore>g.homeScore->g.awayName;g.homeScore>g.awayScore->g.homeName;else->"команды"}
 paragraphs.add("Финальная сирена зафиксировала ${g.awayScore}: ${g.homeScore} в матче ${g.awayName} и ${g.homeName}. Победу забрала команда ${winner}"+if(g.awayScore==g.homeScore)" — встреча завершилась вничью по основному счёту." else ".")
 if(awayShots!=null&&homeShots!=null){
  val shotLeader=if(awayShots>homeShots)g.awayName else if(homeShots>awayShots)g.homeName else "обе команды"
  paragraphs.add("По броскам в створ картина такая: ${awayShots} у ${g.awayName} против ${homeShots} у ${g.homeName}. Чаще проверяла вратаря команда ${shotLeader}.")
 }
 if(goalCount>0){
  paragraphs.add("В официальном игровом фиде отмечено ${goalCount} заброшенных шайб. Ниже — хронология голов с периодами, временем и авторами: это позволяет восстановить рисунок счёта без догадок о незафиксированных эпизодах.")
  val last=scorers.last()
  paragraphs.add("Последнее зафиксированное взятие ворот: ${last}. Именно этот эпизод завершает список голов в доступном отчёте.")
 }else{
  paragraphs.add("Публичный игровой фид пока не отдал подробную разбивку голов. Поэтому не приписываем игрокам авторство шайб и не выдумываем ключевые моменты.")
 }
 val stars=landing.optJSONObject("summary")?.optJSONArray("threeStars")
 if(stars!=null&&stars.length()>0){
  val names=(0 until stars.length()).mapNotNull{idx->stars.optJSONObject(idx)?.optJSONObject("name")?.optString("default")?.takeIf{it.isNotBlank()}}
  if(names.isNotEmpty())paragraphs.add("Официальная тройка звёзд матча: ${names.joinToString(", ")}. Это выбор, опубликованный в сводке NHL.")
 }
 if(paragraphs.size<5){
  paragraphs.add("Счёт и подтверждённые игровые события — основа этого обзора. Для полноценной оценки выступления команд важно учитывать не только результат, но и качество моментов, игру спецбригад и работу вратарей.")
 }
 if(paragraphs.size<5)paragraphs.add("В следующих обновлениях расширим материал показателями игроков, временем на льду, силовыми приёмами и деталями большинства — при условии, что эти данные присутствуют в официальном протоколе.")
 val stats=box.optJSONObject("playerByGameStats")!=null
 return MatchReport(paragraphs.take(7),scorers,awayShots,homeShots,stats)
}

fun fetchGames(date:LocalDate):List<Game>{
 val c=URL("https://api-web.nhle.com/v1/score/"+date.toString()).openConnection() as HttpURLConnection
 c.connectTimeout=12000;c.readTimeout=12000
 try{
  val root=JSONObject(c.inputStream.bufferedReader().use{it.readText()})
  val a=root.optJSONArray("games")?:return emptyList()
  return (0 until a.length()).mapNotNull{i->
   val o=a.optJSONObject(i)?:return@mapNotNull null
   val away=o.optJSONObject("awayTeam")?:JSONObject();val home=o.optJSONObject("homeTeam")?:JSONObject()
   val an=away.optJSONObject("commonName")?.optString("default")?:away.optString("abbrev","Гости")
   val hn=home.optJSONObject("commonName")?.optString("default")?:home.optString("abbrev","Хозяева")
   Game(o.optInt("id"),away.optString("abbrev","AWY"),home.optString("abbrev","HME"),an,hn,away.optInt("score"),home.optInt("score"),o.optString("gameState","FUT"))
  }
 }finally{c.disconnect()}
}
