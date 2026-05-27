import React, { useRef, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

export type ARGuideAvatarRef = {
  setSpeaking: (v: boolean) => void;
  setPointing: (v: boolean) => void;
};

type Props = {
  width?: number;
  height?: number;
};

const AVATAR_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:transparent;overflow:hidden}
  canvas{display:block;width:100%!important;height:100%!important}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
var cv=document.getElementById('c');
var cx=cv.getContext('2d');
var W=window.innerWidth,H=window.innerHeight;
cv.width=W; cv.height=H;

var speaking=false,pointing=false,t=0;

/* particles */
var pts=[];
for(var i=0;i<55;i++){
  pts.push({
    x:Math.random()*W,
    y:Math.random()*H,
    vy:-(0.35+Math.random()*0.7),
    sz:0.8+Math.random()*2.2,
    col:Math.random()>0.5?'rgba(244,208,63,0.75)':'rgba(26,239,255,0.55)'
  });
}

function listen(e){
  try{
    var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(d.type==='speak')speaking=!!d.value;
    if(d.type==='point')pointing=!!d.value;
  }catch(err){}
}
window.addEventListener('message',listen);
document.addEventListener('message',listen);

/* helpers */
function el(ox,oy,rx,ry){cx.beginPath();cx.ellipse(ox,oy,rx,ry,0,0,Math.PI*2);}
function rr(x,y,w,h,r){
  r=Math.min(r,Math.min(w,h)/2);
  cx.beginPath();
  cx.moveTo(x+r,y);cx.lineTo(x+w-r,y);
  cx.arc(x+w-r,y+r,r,-Math.PI/2,0);
  cx.lineTo(x+w,y+h-r);
  cx.arc(x+w-r,y+h-r,r,0,Math.PI/2);
  cx.lineTo(x+r,y+h);
  cx.arc(x+r,y+h-r,r,Math.PI/2,Math.PI);
  cx.lineTo(x,y+r);
  cx.arc(x+r,y+r,r,Math.PI,-Math.PI/2);
  cx.closePath();
}

function drawAvatar(){
  var sc=Math.min(W,H)/270;
  var cxc=W/2, cyc=H*0.60;
  var fy=Math.sin(t*1.1)*5*sc;
  var fr=Math.sin(t*0.65)*0.04;

  cx.save();
  cx.translate(cxc,cyc+fy);
  cx.rotate(fr);
  cx.scale(sc,sc);

  /* shadow */
  cx.save();cx.translate(0,128);cx.scale(1,0.22);
  el(0,0,52,22);cx.fillStyle='rgba(0,0,0,0.20)';cx.fill();
  cx.restore();

  /* LEGS */
  cx.fillStyle='#2C3E50';
  rr(-25,58,22,62,6);cx.fill();
  rr(3,58,22,62,6);cx.fill();
  /* shoes */
  cx.fillStyle='#3E2200';
  rr(-30,116,30,14,4);cx.fill();
  rr(0,116,30,14,4);cx.fill();

  /* MOCHILA WAYUU (draw before body so it sits behind) */
  cx.save();
  cx.translate(-2,-25);
  /* bag body */
  cx.fillStyle='#C0392B';
  rr(-22,-52,44,54,5);cx.fill();
  /* stripes */
  var sc2=['#F4D03F','#27AE60','#9B59B6','#E67E22','#1A5F7A','#F39C12','#F4D03F'];
  sc2.forEach(function(col,i){
    cx.fillStyle=col;
    rr(-21,-50+i*8,42,6,1);cx.fill();
  });
  /* strap */
  cx.strokeStyle='#7B241C';cx.lineWidth=7;cx.lineCap='round';
  cx.beginPath();cx.moveTo(0,2);cx.quadraticCurveTo(28,-18,18,-54);cx.stroke();
  cx.restore();

  /* BODY ruana teal */
  cx.fillStyle='#1A5F7A';
  rr(-34,-82,68,86,10);cx.fill();
  /* poncho side flares */
  cx.fillStyle='#16527E';
  cx.beginPath();cx.moveTo(-34,4);cx.lineTo(-52,58);cx.lineTo(-34,58);cx.closePath();cx.fill();
  cx.beginPath();cx.moveTo(34,4);cx.lineTo(52,58);cx.lineTo(34,58);cx.closePath();cx.fill();
  /* belt */
  cx.fillStyle='#D4AC0D';
  rr(-36,-2,72,11,3);cx.fill();
  /* collar V gold stripe */
  cx.strokeStyle='#F4D03F';cx.lineWidth=4;cx.lineCap='round';
  cx.beginPath();cx.moveTo(-18,-82);cx.lineTo(0,-64);cx.lineTo(18,-82);cx.stroke();

  /* LEFT ARM */
  cx.save();
  cx.translate(-40,-52);
  cx.rotate(pointing?-0.12:0.20);
  cx.fillStyle='#1A5F7A';
  rr(-10,0,20,52,10);cx.fill();
  cx.fillStyle='#C0805A';el(0,57,12,12);cx.fill();
  cx.restore();

  /* RIGHT ARM with map */
  var rRot=pointing?(-0.68+Math.sin(t*3)*0.06):-0.22;
  cx.save();
  cx.translate(40,-52);
  cx.rotate(rRot);
  cx.fillStyle='#1A5F7A';
  rr(-10,0,20,52,10);cx.fill();
  cx.fillStyle='#C0805A';el(0,57,12,12);cx.fill();
  /* MAP scroll */
  cx.save();
  cx.translate(0,68);
  cx.rotate(-rRot+0.38);
  cx.fillStyle='#F9F0D0';rr(-16,-15,32,30,3);cx.fill();
  cx.strokeStyle='#C8A200';cx.lineWidth=1.5;cx.strokeRect(-16,-15,32,30);
  cx.strokeStyle='#1A5F7A';cx.lineWidth=1.5;cx.lineCap='round';
  [[-9,-9,16],[-9,-3,19],[-9,3,13],[-9,9,17]].forEach(function(l){
    cx.beginPath();cx.moveTo(l[0],l[1]);cx.lineTo(l[0]+l[2],l[1]);cx.stroke();
  });
  cx.fillStyle='#E74C3C';el(4,-6,4,4);cx.fill();
  cx.fillStyle='#C0392B';el(4,-6,2.2,2.2);cx.fill();
  cx.restore();
  cx.restore();

  /* NECK */
  cx.fillStyle='#C0805A';rr(-13,-104,26,26,6);cx.fill();

  /* HEAD */
  cx.fillStyle='#C0805A';
  el(0,-132,42,46);cx.fill();
  /* ears */
  cx.fillStyle='#B07040';
  el(-44,-132,12,15);cx.fill();
  el(44,-132,12,15);cx.fill();

  /* eyebrows */
  cx.strokeStyle='#3C1A00';cx.lineWidth=3.5;cx.lineCap='round';
  cx.beginPath();cx.moveTo(-28,-118);cx.quadraticCurveTo(-18,-126,-9,-118);cx.stroke();
  cx.beginPath();cx.moveTo(28,-118);cx.quadraticCurveTo(18,-126,9,-118);cx.stroke();

  /* eye whites */
  cx.fillStyle='#fff';el(-17,-126,11,10);cx.fill();el(17,-126,11,10);cx.fill();
  /* irises */
  cx.fillStyle='#5D3A1A';el(-17,-126,6.5,6.5);cx.fill();el(17,-126,6.5,6.5);cx.fill();
  /* pupils */
  cx.fillStyle='#111';el(-16,-127,3.2,3.2);cx.fill();el(18,-127,3.2,3.2);cx.fill();
  /* highlights */
  cx.fillStyle='#fff';el(-14,-129,2,2);cx.fill();el(20,-129,2,2);cx.fill();

  /* nose */
  cx.fillStyle='#AA7050';el(0,-140,6,5);cx.fill();

  /* cheeks */
  cx.fillStyle='rgba(210,130,90,0.28)';el(-30,-132,12,9);cx.fill();el(30,-132,12,9);cx.fill();

  /* mouth + jaw */
  var jaw=speaking?Math.abs(Math.sin(t*9))*11:2;
  cx.strokeStyle='#6B2D0A';cx.lineWidth=3;cx.lineCap='round';
  cx.beginPath();cx.arc(0,-148+jaw*0.5,15,0.08*Math.PI,0.92*Math.PI);cx.stroke();
  if(jaw>3){
    cx.fillStyle='#FFFAF0';
    rr(-9,-148+jaw*0.5,18,jaw*0.6,2);cx.fill();
  }

  /* SOMBRERO VUELTIAO */
  cx.save();
  cx.translate(0,-182);

  /* brim shadow */
  cx.fillStyle='rgba(0,0,0,0.14)';el(2,4,78,20);cx.fill();

  /* brim base cream */
  cx.fillStyle='#F2EDD0';el(0,0,76,19);cx.fill();

  /* woven vueltiao pattern — alternating black/gold wedges */
  var NW=26;
  for(var wi=0;wi<NW;wi++){
    var ang=(wi/NW)*Math.PI*2;
    cx.save();
    cx.rotate(ang);
    cx.fillStyle=wi%2===0?'rgba(20,20,20,0.88)':'rgba(200,162,0,0.88)';
    cx.beginPath();
    cx.moveTo(9,-3);cx.lineTo(75,-6);cx.lineTo(75,6);cx.lineTo(9,3);
    cx.closePath();cx.fill();
    cx.restore();
  }
  /* centre disc to cover noisy inner point */
  cx.fillStyle='#F2EDD0';el(0,0,11,5);cx.fill();

  /* crown */
  cx.fillStyle='#F2EDD0';
  cx.beginPath();
  cx.moveTo(-28,0);cx.lineTo(-30,-40);
  cx.bezierCurveTo(-30,-58,30,-58,30,-40);
  cx.lineTo(28,0);cx.closePath();cx.fill();

  /* crown vueltiao stripes */
  var CN=18;
  for(var ci=0;ci<CN;ci++){
    var ca=(ci/CN)*Math.PI*2;
    cx.save();cx.rotate(ca);
    cx.fillStyle=ci%2===0?'rgba(20,20,20,0.72)':'rgba(200,162,0,0.72)';
    cx.beginPath();cx.moveTo(0,-1.5);cx.lineTo(28,-3);cx.lineTo(28,3);cx.lineTo(0,1.5);cx.closePath();cx.fill();
    cx.restore();
  }

  /* gold hat band */
  cx.strokeStyle='#E8C000';cx.lineWidth=6;
  cx.beginPath();cx.ellipse(0,-1,30,9,0,0,Math.PI*2);cx.stroke();

  cx.restore(); /* end sombrero */
  cx.restore(); /* end avatar */
}

function loop(){
  requestAnimationFrame(loop);
  t+=0.016;
  cx.clearRect(0,0,W,H);
  /* particles */
  pts.forEach(function(p){
    p.y+=p.vy;p.x+=Math.sin(t*0.5+p.y*0.01)*0.4;
    if(p.y<0)p.y=H;
    cx.beginPath();cx.arc(p.x,p.y,p.sz,0,Math.PI*2);
    cx.fillStyle=p.col;cx.fill();
  });
  drawAvatar();
}
loop();

window.addEventListener('resize',function(){
  W=window.innerWidth;H=window.innerHeight;
  cv.width=W;cv.height=H;
});
</script>
</body>
</html>`;

const ARGuideAvatar3D = forwardRef<ARGuideAvatarRef, Props>(
  ({ width = 150, height = 200 }, ref) => {
    const webviewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      setSpeaking: (v) => {
        webviewRef.current?.injectJavaScript(
          `(function(){var e=new MessageEvent('message',{data:JSON.stringify({type:'speak',value:${v}})});window.dispatchEvent(e);document.dispatchEvent(e);}());true;`
        );
      },
      setPointing: (v) => {
        webviewRef.current?.injectJavaScript(
          `(function(){var e=new MessageEvent('message',{data:JSON.stringify({type:'point',value:${v}})});window.dispatchEvent(e);document.dispatchEvent(e);}());true;`
        );
      },
    }));

    if (Platform.OS === "web") {
      return (
        <View style={[styles.container, { width, height, alignItems: "center", justifyContent: "center" }]}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(26,239,255,0.15)", borderWidth: 2, borderColor: "#1AEFFF", alignItems: "center", justifyContent: "center" }}>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.container, { width, height }]}>
        <WebView
          ref={webviewRef}
          source={{ html: AVATAR_HTML }}
          style={styles.webview}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          backgroundColor="transparent"
          allowsInlineMediaPlayback
          mixedContentMode="always"
        />
      </View>
    );
  }
);

ARGuideAvatar3D.displayName = "ARGuideAvatar3D";

export { ARGuideAvatar3D };

const styles = StyleSheet.create({
  container: { overflow: "hidden", backgroundColor: "transparent" },
  webview: { flex: 1, backgroundColor: "transparent" },
});
