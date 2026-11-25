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

@Composable fun DetailScreen(g:Game,onBack:()->Unit){
 val final=g.state.contains("FINAL",true)||g.state=="OFF"
 Column(Modifier.fillMaxSize().background(BG).padding(22.dp)){
  Text("‹  НАЗАД",modifier=Modifier.clickable{onBack()}.padding(vertical=12.dp),fontSize=15.sp,color=Color.White)
  Spacer(Modifier.height(24.dp))
  Text("КАРТОЧКА МАТЧА",color=RED,fontWeight=FontWeight.Bold,letterSpacing=2.sp)
  Spacer(Modifier.height(14.dp))
  Text(g.awayName+" — "+g.homeName,fontSize=23.sp,fontWeight=FontWeight.Bold,color=Color.White)
  Text(if(final)"Итоговый счёт" else if(g.state=="LIVE")"Матч продолжается" else "Матч ещё не начался",fontSize=12.sp,color=MUTED)
  Spacer(Modifier.height(8.dp))
  Text(g.awayScore.toString()+" : "+g.homeScore,fontSize=42.sp,fontWeight=FontWeight.Black,color=Color.White)
  Spacer(Modifier.height(24.dp))
  Text("Подробный разбор",fontSize=18.sp,fontWeight=FontWeight.Bold,color=Color.White)
  Spacer(Modifier.height(8.dp))
  Text("Сейчас доступен только итоговый счёт из официального расписания NHL. Чтобы не придумывать события матча, броски и действия игроков, подробный редакционный разбор появится после подключения игрового отчёта и расширенной статистики.",fontSize=15.sp,lineHeight=23.sp,color=Color(0xFFD4DCE5))
 }
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
