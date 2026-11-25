package com.nhl.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val BG=Color(0xFF080B10)
private val PANEL=Color(0xFF171D26)
private val MUTED=Color(0xFF9AA6B5)
private val RED=Color(0xFFDA2638)

data class Game(val id:Int,val away:String,val home:String,val awayName:String,val homeName:String,val awayScore:Int,val homeScore:Int,val state:String)

class MainActivity:ComponentActivity(){
 override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState)
  window.statusBarColor=android.graphics.Color.rgb(8,11,16);window.navigationBarColor=android.graphics.Color.rgb(8,11,16)
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
  loading=true;error=false
  try { games=withContext(Dispatchers.IO){fetchGames(date)} } catch(_:Exception){games=emptyList();error=true}
  loading=false
 }
 MaterialTheme(colorScheme=darkColorScheme(background=BG,surface=PANEL,primary=RED,onSurface=Color.White)){
  Surface(Modifier.fillMaxSize(),color=BG){
   if(detail!=null) DetailScreen(detail!!){detail=null}
   else Column(Modifier.fillMaxSize()){
    Column(Modifier.padding(start=20.dp,end=20.dp,top=16.dp,bottom=8.dp)){
     Text("НХЛ",fontSize=30.sp,fontWeight=FontWeight.Black,letterSpacing=2.sp)
     Text("МАТЧИ • РЕЗУЛЬТАТЫ • АНАЛИТИКА",fontSize=10.sp,color=MUTED,letterSpacing=1.5.sp)
    }
    DateCarousel(date){date=it}
    Box(Modifier.weight(1f)){
     Rink(Modifier.fillMaxSize())
     Column(Modifier.fillMaxSize()){
      Row(Modifier.fillMaxWidth().padding(horizontal=20.dp,vertical=14.dp),horizontalArrangement=Arrangement.SpaceBetween){
       Text("МАТЧИ ДНЯ",fontSize=13.sp,fontWeight=FontWeight.Bold,letterSpacing=1.sp)
       Text(games.size.toString()+" ИГР",fontSize=11.sp,color=MUTED)
      }
      when{
       loading->Box(Modifier.fillMaxWidth().weight(1f),Alignment.Center){CircularProgressIndicator(color=RED)}
       error->Column(Modifier.fillMaxWidth().weight(1f),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center){
        Text("Не удалось загрузить расписание NHL.",color=MUTED,textAlign=TextAlign.Center)
        Button(onClick={retry++},colors=ButtonDefaults.buttonColors(containerColor=RED)){Text("Повторить")}
       }
       games.isEmpty()->Box(Modifier.fillMaxWidth().weight(1f),Alignment.Center){Text("На эту дату матчей нет",color=MUTED)}
       else->LazyColumn(contentPadding=PaddingValues(start=16.dp,end=16.dp,bottom=24.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
        items(games,key={it.id}){g->GameCard(g){detail=g}}
       }
      }
     }
    }
   }
  }
 }
}

@Composable fun DateCarousel(selected:LocalDate,onSelect:(LocalDate)->Unit){
 val dates=(-5..9).map{LocalDate.now().plusDays(it.toLong())}
 val list=rememberLazyListState()
 val fling=rememberSnapFlingBehavior(lazyListState=list)
 LazyRow(state=list,flingBehavior=fling,contentPadding=PaddingValues(horizontal=18.dp),horizontalArrangement=Arrangement.spacedBy(10.dp),modifier=Modifier.fillMaxWidth().height(96.dp)){
  items(dates){d->val active=d==selected
   Column(Modifier.width(76.dp).fillMaxHeight().clip(RoundedCornerShape(20.dp)).background(if(active)RED else PANEL).clickable{onSelect(d)}.padding(vertical=12.dp),
    horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center){
    Text(d.format(DateTimeFormatter.ofPattern("EEE",Locale("ru"))).uppercase(Locale("ru")),fontSize=11.sp,color=if(active)Color.White else MUTED,fontWeight=FontWeight.Bold)
    Spacer(Modifier.height(7.dp))
    Text(d.format(DateTimeFormatter.ofPattern("dd.MM")),fontSize=17.sp,color=Color.White,fontWeight=FontWeight.Bold)
   }
  }
 }
}

@Composable fun Rink(modifier:Modifier){
 Canvas(modifier){
  val w=size.width;val h=size.height;val rw=w*.88f;val rh=h*.86f;val l=(w-rw)/2;val t=(h-rh)/2
  drawRect(Color(0xFF0C1118))
  drawRoundRect(Color(0xFF141B24),androidx.compose.ui.geometry.Offset(l,t),androidx.compose.ui.geometry.Size(rw,rh),androidx.compose.ui.geometry.CornerRadius(rw*.16f),style=Stroke(5.dp.toPx(),Color(0xFF293440)))
  listOf(.33f,.5f,.67f).forEachIndexed{i,v->drawLine(if(i==1)RED.copy(alpha=.25f)else Color(0xFF315A83).copy(alpha=.3f),androidx.compose.ui.geometry.Offset(l,t+rh*v),androidx.compose.ui.geometry.Offset(l+rw,t+rh*v),3.dp.toPx())}
  drawCircle(Color(0xFF31516D).copy(alpha=.2f),rw*.2f,androidx.compose.ui.geometry.Offset(w/2,h/2),style=Stroke(3.dp.toPx()))
 }
}

@Composable fun GameCard(g:Game,onClick:()->Unit){
 val final=g.state.contains("FINAL",true)||g.state=="OFF"
 Card(onClick=onClick,modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(22.dp),colors=CardDefaults.cardColors(containerColor=PANEL.copy(alpha=.98f))){
  Column(Modifier.padding(16.dp)){
   Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){
    Text(if(final)"ФИНАЛ" else if(g.state=="LIVE"||g.state=="CRIT")"ИДЁТ МАТЧ" else "ПРЕДСТОИТ",fontSize=10.sp,color=Color(0xFFE8CB91),fontWeight=FontWeight.Bold)
    Text("NHL",fontSize=10.sp,color=MUTED)
   }
   Spacer(Modifier.height(14.dp))
   Row(verticalAlignment=Alignment.CenterVertically){
    Team(g.away,g.awayName,Modifier.weight(1f))
    Text(if(final||g.state=="LIVE"||g.state=="CRIT")g.awayScore.toString()+" : "+g.homeScore else "— : —",fontSize=24.sp,fontWeight=FontWeight.Black)
    Team(g.home,g.homeName,Modifier.weight(1f),true)
   }
  }
 }
}
@Composable fun Team(abbr:String,name:String,modifier:Modifier,right:Boolean=false){
 Column(modifier,horizontalAlignment=if(right)Alignment.End else Alignment.Start){
  Box(Modifier.size(46.dp).clip(CircleShape).background(Color(0xFF293442)),contentAlignment=Alignment.Center){Text(abbr,fontSize=13.sp,fontWeight=FontWeight.Black)}
  Spacer(Modifier.height(7.dp));Text(name,fontSize=12.sp,fontWeight=FontWeight.SemiBold,maxLines=2)
 }
}
@Composable fun DetailScreen(g:Game,onBack:()->Unit){
 Column(Modifier.fillMaxSize().background(BG).padding(20.dp)){
  Text("‹  НАЗАД",modifier=Modifier.clickable{onBack()}.padding(vertical=12.dp),fontSize=16.sp)
  Spacer(Modifier.height(24.dp));Text("РАЗБОР МАТЧА",color=RED,fontWeight=FontWeight.Bold,letterSpacing=2.sp)
  Spacer(Modifier.height(12.dp));Text(g.awayName+" — "+g.homeName,fontSize=23.sp,fontWeight=FontWeight.Bold)
  Text(g.awayScore.toString()+" : "+g.homeScore,fontSize=40.sp,fontWeight=FontWeight.Black)
  Spacer(Modifier.height(18.dp))
  Text(story(g),fontSize=16.sp,lineHeight=25.sp,color=Color(0xFFD4DCE5))
  Spacer(Modifier.height(16.dp));Text("Расширенная статистика матча будет подключена следующим этапом.",fontSize=12.sp,color=MUTED)
 }
}
fun story(g:Game):String{
 val verdict=if(g.awayScore>g.homeScore)g.awayName+" выиграла на выезде." else if(g.homeScore>g.awayScore)g.homeName+" оставила победу дома." else "Команды завершили встречу вничью."
 return "Матч "+g.awayName+" и "+g.homeName+" завершился со счётом "+g.awayScore+":"+g.homeScore+". "+verdict+" Итоговый счёт — только верхний слой истории этой игры. Чтобы понять, за счёт чего сложился результат, важно оценивать темп, качество моментов и работу специальных бригад. Броски сами по себе не всегда отражают реальную опасность у ворот. Большое значение имеют игра вратарей, борьба на пятаке и реализация большинства. Этот краткий редакционный разбор будет дополнен фактическими событиями и расширенной статистикой из NHL API."
}
fun fetchGames(date:LocalDate):List<Game>{
 val c=URL("https://api-web.nhle.com/v1/score/"+date.toString()).openConnection() as HttpURLConnection
 c.connectTimeout=10000;c.readTimeout=10000
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
