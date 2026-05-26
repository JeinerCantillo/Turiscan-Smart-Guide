import React, { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
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
<script>
var s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
s.onload=init;
document.head.appendChild(s);

function init(){
  var W=window.innerWidth,H=window.innerHeight;
  var renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setSize(W,H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(42,W/H,0.1,100);
  camera.position.set(0,0.8,3.8);
  camera.lookAt(0,0.7,0);

  /* ---- LIGHTS ---- */
  scene.add(new THREE.AmbientLight(0x4488aa,0.5));
  var sun=new THREE.DirectionalLight(0xfff5e0,1.1);
  sun.position.set(2,5,3);
  sun.castShadow=true;
  scene.add(sun);
  var tealPt=new THREE.PointLight(0x1A5F7A,2.0,12);
  tealPt.position.set(-2,2,2);
  scene.add(tealPt);
  var goldPt=new THREE.PointLight(0xF4D03F,1.2,10);
  goldPt.position.set(2.5,1.5,1.5);
  scene.add(goldPt);
  scene.add(new THREE.HemisphereLight(0x1A5F7A,0x8B5E3C,0.4));

  /* ---- MATERIALS ---- */
  var skinM  =new THREE.MeshPhongMaterial({color:0xC0805A,shininess:50});
  var tealM  =new THREE.MeshPhongMaterial({color:0x1A5F7A,shininess:70});
  var goldM  =new THREE.MeshPhongMaterial({color:0xE8C000,shininess:100});
  var creamM =new THREE.MeshPhongMaterial({color:0xF2EDD0,shininess:20});
  var blackM =new THREE.MeshPhongMaterial({color:0x111111,shininess:10});
  var eyeM   =new THREE.MeshPhongMaterial({color:0x1E0A00,shininess:150});
  var whiteM =new THREE.MeshPhongMaterial({color:0xFFFFFF,shininess:120});
  var darkM  =new THREE.MeshPhongMaterial({color:0x1E2D3D,shininess:40});
  var brownM =new THREE.MeshPhongMaterial({color:0x4A2800,shininess:60});
  var mapPaperM=new THREE.MeshPhongMaterial({color:0xF9F0D0,shininess:20});

  var G=new THREE.Group();
  scene.add(G);

  /* ---- LEGS ---- */
  var legG=new THREE.CylinderGeometry(0.10,0.10,0.52,16);
  var lLeg=new THREE.Mesh(legG,darkM); lLeg.position.set(-0.13,-0.26,0); lLeg.castShadow=true; G.add(lLeg);
  var rLeg=new THREE.Mesh(legG,darkM); rLeg.position.set( 0.13,-0.26,0); rLeg.castShadow=true; G.add(rLeg);
  var shoeG=new THREE.BoxGeometry(0.15,0.09,0.22);
  var lShoe=new THREE.Mesh(shoeG,brownM); lShoe.position.set(-0.13,-0.55,0.03); G.add(lShoe);
  var rShoe=new THREE.Mesh(shoeG,brownM); rShoe.position.set( 0.13,-0.55,0.03); G.add(rShoe);

  /* ---- BODY ---- */
  var bodyG=new THREE.CylinderGeometry(0.27,0.30,0.60,24);
  var body=new THREE.Mesh(bodyG,tealM); body.position.y=0.30; body.castShadow=true; G.add(body);

  /* belt */
  var beltG=new THREE.CylinderGeometry(0.28,0.28,0.06,24);
  var belt=new THREE.Mesh(beltG,goldM); belt.position.y=0.02; G.add(belt);

  /* collar / ruana line */
  var colG=new THREE.TorusGeometry(0.14,0.035,8,24);
  var col=new THREE.Mesh(colG,goldM); col.position.y=0.60; col.rotation.x=Math.PI/2; G.add(col);

  /* ---- MOCHILA WAYUU (back bag) ---- */
  var bagGroup=new THREE.Group(); bagGroup.position.set(0,0.28,-0.33); G.add(bagGroup);
  var bagBodyG=new THREE.BoxGeometry(0.26,0.30,0.10);
  var bagBody=new THREE.Mesh(bagBodyG,new THREE.MeshPhongMaterial({color:0xC0392B,shininess:20}));
  bagGroup.add(bagBody);
  var stripeColors=[0xF4D03F,0x27AE60,0x9B59B6,0xE67E22,0xF4D03F];
  stripeColors.forEach(function(c,i){
    var sg=new THREE.BoxGeometry(0.26,0.038,0.005);
    var sm=new THREE.Mesh(sg,new THREE.MeshPhongMaterial({color:c}));
    sm.position.set(0,0.12-i*0.058,0.052);
    bagGroup.add(sm);
  });
  /* strap */
  var strapG=new THREE.BoxGeometry(0.04,0.48,0.04);
  var strap=new THREE.Mesh(strapG,new THREE.MeshPhongMaterial({color:0x8B0000}));
  strap.position.set(0,0.36,0.10); G.add(strap);

  /* ---- LEFT ARM ---- */
  var armG=new THREE.CapsuleGeometry(0.075,0.30,8,12);
  var lArm=new THREE.Mesh(armG,tealM);
  lArm.position.set(-0.37,0.28,0); lArm.rotation.z=0.25; lArm.castShadow=true; G.add(lArm);
  var lHandG=new THREE.SphereGeometry(0.075,12,12);
  var lHand=new THREE.Mesh(lHandG,skinM);
  lHand.position.set(-0.44,0.04,0); G.add(lHand);

  /* ---- RIGHT ARM + MAP ---- */
  var rArmGroup=new THREE.Group();
  rArmGroup.position.set(0.37,0.32,0); G.add(rArmGroup);
  var rArmM=new THREE.Mesh(armG,tealM);
  rArmM.rotation.z=-0.35; rArmM.rotation.x=0.2; rArmM.castShadow=true; rArmGroup.add(rArmM);
  var rHandG=new THREE.SphereGeometry(0.075,12,12);
  var rHand=new THREE.Mesh(rHandG,skinM);
  rHand.position.set(0.13,-0.20,0.10); rArmGroup.add(rHand);
  /* Map scroll */
  var mapGroup=new THREE.Group();
  mapGroup.position.set(0.17,-0.16,0.18);
  mapGroup.rotation.set(0.1,-0.4,0.25);
  rArmGroup.add(mapGroup);
  var mapBgG=new THREE.BoxGeometry(0.24,0.19,0.015);
  var mapBg=new THREE.Mesh(mapBgG,mapPaperM); mapGroup.add(mapBg);
  var mapBorderG=new THREE.BoxGeometry(0.24,0.19,0.005);
  var mapBorder=new THREE.Mesh(mapBorderG,new THREE.MeshPhongMaterial({color:0xD4AC0D}));
  mapBorder.position.z=0.01; mapGroup.add(mapBorder);
  /* map lines */
  [[0,0.06],[0,0.00],[0,-0.06],[-0.07,0.03],[0.06,-0.03]].forEach(function(pos){
    var lg=new THREE.BoxGeometry(0.12+Math.random()*0.06,0.008,0.004);
    var lm=new THREE.Mesh(lg,new THREE.MeshPhongMaterial({color:0x1A5F7A}));
    lm.position.set(pos[0],pos[1],0.012); mapGroup.add(lm);
  });
  /* map pin */
  var pinG=new THREE.SphereGeometry(0.018,8,8);
  var pin=new THREE.Mesh(pinG,new THREE.MeshPhongMaterial({color:0xE74C3C,shininess:100}));
  pin.position.set(0.04,0.04,0.02); mapGroup.add(pin);

  /* ---- NECK ---- */
  var neckG=new THREE.CylinderGeometry(0.10,0.12,0.18,16);
  var neck=new THREE.Mesh(neckG,skinM); neck.position.y=0.70; G.add(neck);

  /* ---- HEAD ---- */
  var headG=new THREE.SphereGeometry(0.30,32,32);
  var head=new THREE.Mesh(headG,skinM); head.position.y=1.12; head.castShadow=true; G.add(head);

  /* eyebrows */
  var browG=new THREE.BoxGeometry(0.10,0.025,0.025);
  var browM=new THREE.MeshPhongMaterial({color:0x2C1200});
  var lBrow=new THREE.Mesh(browG,browM); lBrow.position.set(-0.10,1.23,0.28); lBrow.rotation.z= 0.15; G.add(lBrow);
  var rBrow=new THREE.Mesh(browG,browM); rBrow.position.set( 0.10,1.23,0.28); rBrow.rotation.z=-0.15; G.add(rBrow);

  /* eye whites */
  var ewG=new THREE.SphereGeometry(0.065,16,16);
  var lEW=new THREE.Mesh(ewG,whiteM); lEW.position.set(-0.10,1.14,0.26); G.add(lEW);
  var rEW=new THREE.Mesh(ewG,whiteM); rEW.position.set( 0.10,1.14,0.26); G.add(rEW);
  /* irises */
  var irG=new THREE.SphereGeometry(0.042,16,16);
  var lIr=new THREE.Mesh(irG,new THREE.MeshPhongMaterial({color:0x3D1C00,shininess:200}));
  lIr.position.set(-0.10,1.14,0.30); G.add(lIr);
  var rIr=new THREE.Mesh(irG,new THREE.MeshPhongMaterial({color:0x3D1C00,shininess:200}));
  rIr.position.set( 0.10,1.14,0.30); G.add(rIr);
  /* pupils */
  var pupG=new THREE.SphereGeometry(0.022,8,8);
  var lPup=new THREE.Mesh(pupG,eyeM); lPup.position.set(-0.10,1.14,0.335); G.add(lPup);
  var rPup=new THREE.Mesh(pupG,eyeM); rPup.position.set( 0.10,1.14,0.335); G.add(rPup);
  /* highlights */
  var hlG=new THREE.SphereGeometry(0.010,6,6);
  var hlM=new THREE.MeshPhongMaterial({color:0xFFFFFF,shininess:200,emissive:0xFFFFFF});
  var lHL=new THREE.Mesh(hlG,hlM); lHL.position.set(-0.093,1.15,0.345); G.add(lHL);
  var rHL=new THREE.Mesh(hlG,hlM); rHL.position.set( 0.107,1.15,0.345); G.add(rHL);

  /* nose */
  var noseG=new THREE.SphereGeometry(0.03,10,10);
  var nose=new THREE.Mesh(noseG,new THREE.MeshPhongMaterial({color:0xAA7050,shininess:30}));
  nose.position.set(0,1.05,0.30); G.add(nose);

  /* smile (lower jaw) */
  var smileG=new THREE.TorusGeometry(0.085,0.016,8,18,Math.PI);
  var smileM=new THREE.MeshPhongMaterial({color:0x6B2D0A,shininess:40});
  var smile=new THREE.Mesh(smileG,smileM);
  smile.position.set(0,0.975,0.285); smile.rotation.z=Math.PI; G.add(smile);

  /* teeth */
  var teethG=new THREE.BoxGeometry(0.10,0.022,0.018);
  var teethM=new THREE.MeshPhongMaterial({color:0xFFFAF0,shininess:80});
  var teeth=new THREE.Mesh(teethG,teethM);
  teeth.position.set(0,0.978,0.294); G.add(teeth);

  /* ears */
  var earG=new THREE.SphereGeometry(0.055,12,12);
  var lEar=new THREE.Mesh(earG,skinM); lEar.position.set(-0.30,1.12,0); G.add(lEar);
  var rEar=new THREE.Mesh(earG,skinM); rEar.position.set( 0.30,1.12,0); G.add(rEar);

  /* ---- SOMBRERO VUELTIAO ---- */
  var hatGroup=new THREE.Group(); hatGroup.position.y=1.36; G.add(hatGroup);
  /* crown */
  var crownG=new THREE.CylinderGeometry(0.23,0.27,0.30,32);
  var crown=new THREE.Mesh(crownG,creamM); crown.position.y=0.18; hatGroup.add(crown);
  /* brim - flat disk */
  var brimG=new THREE.CylinderGeometry(0.60,0.60,0.038,40);
  var brim=new THREE.Mesh(brimG,creamM); hatGroup.add(brim);
  /* vueltiao woven pattern on brim */
  var NUM_WEDGES=16;
  for(var wi=0;wi<NUM_WEDGES;wi++){
    var ang=(wi/NUM_WEDGES)*Math.PI*2;
    var isBlack=wi%2===0;
    var wColor=isBlack?0x111111:0xC8A200;
    var wG=new THREE.BoxGeometry(0.042,0.044,0.56);
    var wM=new THREE.MeshPhongMaterial({color:wColor,shininess:30});
    var w=new THREE.Mesh(wG,wM);
    w.position.set(Math.cos(ang)*0.30,0,Math.sin(ang)*0.30);
    w.rotation.y=-ang; hatGroup.add(w);
    /* inner crown stripe */
    var cwG=new THREE.BoxGeometry(0.038,0.31,0.040);
    var cw=new THREE.Mesh(cwG,new THREE.MeshPhongMaterial({color:isBlack?0x111111:0xD4AA00}));
    cw.position.set(Math.cos(ang)*0.21,0.18,Math.sin(ang)*0.21);
    cw.rotation.y=-ang; hatGroup.add(cw);
  }
  /* hat band gold */
  var hbandG=new THREE.TorusGeometry(0.255,0.038,8,32);
  var hband=new THREE.Mesh(hbandG,goldM); hband.position.y=0.04; hband.rotation.x=Math.PI/2; hatGroup.add(hband);

  /* ---- PARTICLES ---- */
  var pCount=80;
  var pGeo=new THREE.BufferGeometry();
  var pPos=new Float32Array(pCount*3);
  var pCol=new Float32Array(pCount*3);
  for(var pi=0;pi<pCount;pi++){
    pPos[pi*3]  =(Math.random()-0.5)*5;
    pPos[pi*3+1]= Math.random()*5-0.5;
    pPos[pi*3+2]=(Math.random()-0.5)*4;
    var isG=Math.random()>0.5;
    pCol[pi*3]  =isG?0.95:0.10;
    pCol[pi*3+1]=isG?0.87:0.37;
    pCol[pi*3+2]=isG?0.15:0.48;
  }
  pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
  pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
  var pMat=new THREE.PointsMaterial({size:0.055,vertexColors:true,transparent:true,opacity:0.85});
  var particles=new THREE.Points(pGeo,pMat);
  scene.add(particles);

  /* ---- STATE ---- */
  var speaking=false, pointing=false, time=0;

  function onMsg(e){
    try{
      var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
      if(d.type==='speak') speaking=!!d.value;
      if(d.type==='point') pointing=!!d.value;
    }catch(err){}
  }
  window.addEventListener('message',onMsg);
  document.addEventListener('message',onMsg);

  /* ---- LOOP ---- */
  function animate(){
    requestAnimationFrame(animate);
    time+=0.016;

    /* idle float */
    G.position.y=Math.sin(time*1.1)*0.055;
    G.rotation.y=Math.sin(time*0.65)*0.10;

    /* speaking animation */
    if(speaking){
      head.position.y=1.12+Math.sin(time*9)*0.022;
      smile.scale.y=1+Math.sin(time*9)*0.35;
      teeth.position.y=0.978+Math.sin(time*9)*0.008;
    } else {
      head.position.y=1.12;
      smile.scale.y=1;
      teeth.position.y=0.978;
    }

    /* pointing animation */
    if(pointing){
      rArmGroup.rotation.x=0.55+Math.sin(time*3)*0.06;
      rArmGroup.rotation.z=-0.55;
    } else {
      rArmGroup.rotation.x*=0.9;
      rArmGroup.rotation.z*=0.9;
    }

    /* teal light pulsing */
    tealPt.intensity=1.8+Math.sin(time*2.5)*0.4;

    /* particles rise */
    var pa=particles.geometry.attributes.position.array;
    for(var i=1;i<pa.length;i+=3){
      pa[i]+=0.006;
      if(pa[i]>4.5) pa[i]=-0.5;
    }
    particles.geometry.attributes.position.needsUpdate=true;
    particles.rotation.y+=0.003;

    renderer.render(scene,camera);
  }
  animate();

  window.addEventListener('resize',function(){
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
  });
}
</script>
</body>
</html>`;

const ARGuideAvatar3D = forwardRef<ARGuideAvatarRef, Props>(
  ({ width = 150, height = 200 }, ref) => {
    const webviewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      setSpeaking: (v) => {
        webviewRef.current?.injectJavaScript(
          `window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'speak',value:${v}})}));true;`
        );
      },
      setPointing: (v) => {
        webviewRef.current?.injectJavaScript(
          `window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'point',value:${v}})}));true;`
        );
      },
    }));

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
        />
      </View>
    );
  }
);

ARGuideAvatar3D.displayName = "ARGuideAvatar3D";
export { ARGuideAvatar3D };

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
  webview: { flex: 1, backgroundColor: "transparent" },
});
