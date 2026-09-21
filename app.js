const PH_A="public/photo-a.jpg";
const PH_B="public/photo-b.jpg";
const GRUNGE="public/grunge.jpg";
const LOGO="public/logo.png";
const BRUSH="public/brush.png";
const ORIG="public/original-plate.jpg";

const W=1024, H=1536, M=34;
const WHITE="#f2f2f2", INK_D="#0a080a", INK_L="#fdfafd";
const PRESETS=[["Neon Pink","#e821a0"],["Cyan","#12c8e6"],["Volt","#57d80e"],
  ["Orange","#f2711c"],["Crimson","#e8203c"],["Violet","#9333ea"],["Gold","#e0a010"]];
const LAYOUTS=[
  ["original","Original"],
  ["origTall","Orig · Tall"],
  ["origCompact","Orig · Compact"],
  ["origSplit","Orig · Split"],
  ["origBanner","Orig · Banner"],
  ["origLine","Orig · Line"],
  ["columns","Columns"],["topPhoto","Photo Top"],
  ["bottomPhoto","Photo Bottom"],["hero","Hero"],["spotlight","Spotlight"],["band","Split Band"]
];
const ORIG_FAMILY=["original","origTall","origCompact","origSplit","origBanner","origLine"];
const MONO_ACCENT="#ededed";
let layout="columns";
let mono=true;                  // brand black-and-white is the default
let accent=MONO_ACCENT;
let lastColor="#e821a0";        // remembered for switching back out of mono

const cv=document.getElementById("cv"), ctx=cv.getContext("2d",{willReadFrequently:true});
const imgs={};
let ready=0, needed=6;

const ids=["h1","h2","t1v","t1l","t2v","t2l","phdr","a1v","a1l","a2v","a2l","a3v","a3l","ban",
  "b1v","b1l","b2v","b2l","b3v","b3l","b4v","b4l"];
const el={}; ids.forEach(i=>el[i]=document.getElementById(i));
const ckBorder=document.getElementById("photoBorder");
const ckMirror=document.getElementById("mirror"),
      ckTeam=document.getElementById("showTeam"),
      ckBan=document.getElementById("showBanner");
const v=id=>(el[id].value||"").trim();

/* ---------- colour ---------- */
const hex2rgb=h=>{const n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];};
const lum=h=>{const [r,g,b]=hex2rgb(h);return (0.299*r+0.587*g+0.114*b)/255;};
const inkOn=h=>lum(h)>0.55?INK_D:INK_L;
const rgba=(h,a)=>{const [r,g,b]=hex2rgb(h);return `rgba(${r},${g},${b},${a})`;};
/* Deep, near-black version of the accent — used for the field and panel fills
   so the whole piece sits in the colour family rather than on neutral black. */
const deep=(h,f,a)=>{
  const [r,g,b]=hex2rgb(h);
  const R=Math.round(r*f+4), G=Math.round(g*f+4), B=Math.round(b*f+5);
  return a===undefined?`rgb(${R},${G},${B})`:`rgba(${R},${G},${B},${a})`;
};

/* Tint any image's gold/warm pixels onto the accent hue, so the original
   glow around the players follows the colour scheme. */
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;if(h<0)h+=1;}
  return [h,mx?d/mx:0,mx];}
function hsv2rgb(h,s,v){const i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),tt=v*(1-(1-f)*s);
  let r,g,b;switch(i%6){case 0:r=v;g=tt;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=tt;break;
  case 3:r=p;g=q;b=v;break;case 4:r=tt;g=p;b=q===undefined?v:v;b=v;break;default:r=v;g=p;b=q;}
  return [r*255,g*255,b*255];}
/* The original artwork is magenta; shift that hue band onto the chosen accent. */
function tintMagenta(img,hex){
  const c=document.createElement("canvas");c.width=img.width;c.height=img.height;
  const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(img,0,0);
  const d=x.getImageData(0,0,c.width,c.height),p=d.data;
  const [tr,tg,tb]=hex2rgb(hex); const [th,ts]=rgb2hsv(tr,tg,tb);
  for(let i=0;i<p.length;i+=4){
    const r=p[i],g=p[i+1],b=p[i+2];
    if(Math.max(r,g,b)<30) continue;
    const [hh,s,vv]=rgb2hsv(r,g,b);
    if(s>0.28&&vv>0.12&&hh>=0.80&&hh<=0.97){
      let nh=th+(hh-0.885)*0.55; if(nh<0)nh+=1; else if(nh>=1)nh-=1;
      const [nr,ng,nb]=hsv2rgb(nh,Math.min(1,s*(ts/0.86)),vv);
      p[i]=nr;p[i+1]=ng;p[i+2]=nb;
    }
  }
  x.putImageData(d,0,0);return c;
}
let tinted={}, tintedFor=null;
function grayscale(img){
  const c=document.createElement("canvas"); c.width=img.width; c.height=img.height;
  const x=c.getContext("2d");
  x.filter="grayscale(1) contrast(1.08)";
  x.drawImage(img,0,0);
  return c;
}
function brushTinted(col){
  if(!imgs.brush) return null;
  const c=document.createElement("canvas");
  c.width=imgs.brush.width; c.height=imgs.brush.height;
  const x=c.getContext("2d");
  x.drawImage(imgs.brush,0,0);
  x.globalCompositeOperation="source-in";
  x.fillStyle=col; x.fillRect(0,0,c.width,c.height);
  return c;
}
function ensureTint(){
  if(tintedFor===accent+(mono?"|m":"")) return;
  ["A","B"].forEach(k=>{
    if(!imgs[k]) return;
    if(mono) tinted[k]=grayscale(imgs[k]); else delete tinted[k];
  });
  if(imgs.orig) tinted.orig=tintMagenta(imgs.orig,accent);
  if(imgs.grunge){
    // keep the texture's light and shade, replace its colour with the accent
    const g=imgs.grunge;
    const c=document.createElement("canvas"); c.width=g.width; c.height=g.height;
    const x=c.getContext("2d");
    x.drawImage(g,0,0);
    x.globalCompositeOperation="color";
    x.fillStyle=accent; x.fillRect(0,0,c.width,c.height);
    x.globalCompositeOperation="source-over";
    tinted.grunge=c;
  }
  if(imgs.brush){
    const c=document.createElement("canvas"); c.width=imgs.brush.width; c.height=imgs.brush.height;
    const x=c.getContext("2d");
    x.drawImage(imgs.brush,0,0);
    x.globalCompositeOperation="source-in"; x.fillStyle=accent;
    x.fillRect(0,0,c.width,c.height);
    tinted.brush=c;
  }
  tintedFor=accent+(mono?"|m":"");
}

/* ---------- type ---------- */
function sizeForCap(t,w,cap){
  if(!t) return 0;
  ctx.font=w+" 100px Oswald,'Arial Narrow',Arial,sans-serif";
  const m=ctx.measureText(t.replace(/[^A-Za-z0-9]/g,"H")||"H");
  return 100*(cap/(m.actualBoundingBoxAscent||72));
}
function setF(t,w,cap){const s=sizeForCap(t,w,cap);
  ctx.font=w+" "+s+"px Oswald,'Arial Narrow',Arial,sans-serif";return s;}
function txt(t,weight,cap,x,baseline,color,tracking,align){
  if(!t) return 0;
  setF(t,weight,cap); ctx.fillStyle=color; ctx.textBaseline="alphabetic";
  const tr=tracking||0, ch=[...t];
  let wd=0; ch.forEach(c=>wd+=ctx.measureText(c).width+tr); wd-=tr;
  let sx = align==="center" ? x-wd/2 : align==="right" ? x-wd : x;
  ch.forEach(c=>{ctx.fillText(c,sx,baseline);sx+=ctx.measureText(c).width+tr;});
  return wd;
}
function measW(s,weight,cap,tracking){
  if(!s) return 0;
  setF(s,weight,cap);
  const tr=tracking||0;
  let w=0; [...s].forEach(c=>w+=ctx.measureText(c).width+tr);
  return w-tr;
}
/* Ratio (<=1) a string must shrink by to fit maxW at this cap. */
function fitRatio(s,weight,cap,maxW,tracking){
  if(!s) return 1;
  const w=measW(s,weight,cap,tracking||0);
  return (w>maxW && w>0) ? maxW/w : 1;
}
/* Draw text, shrinking it (and its tracking) until it fits maxW. */
function txtFit(s,weight,cap,maxW,x,baseline,color,tracking,align){
  if(!s) return;
  let c=cap, tr=tracking||0;
  const w=measW(s,weight,c,tr);
  if(w>maxW && w>0){ const k=maxW/w; c*=k; tr*=k; }
  txt(s,weight,c,x,baseline,color,tr,align);
}
function pairW(val,lab,bigCap,smallCap,gap){
  const sB=setF(val,700,bigCap), wB=val?ctx.measureText(val).width:0;
  const sS=setF(lab,700,smallCap), wS=lab?ctx.measureText(lab).width:0;
  return {wB,wS,sB,sS,total:wB+((val&&lab)?gap:0)+wS};
}
function drawPair(val,lab,cx,bigCap,bigBase,smallCap,smallBase,gap,maxW,col){
  if(maxW){
    const m0=pairW(val,lab,bigCap,smallCap,gap);
    if(m0.total>maxW && m0.total>0){
      const k=maxW/m0.total;
      bigCap*=k; smallCap*=k; gap*=k;
    }
  }
  const m=pairW(val,lab,bigCap,smallCap,gap);
  let x=cx-m.total/2; ctx.fillStyle=col||WHITE;
  if(val){ctx.font="700 "+m.sB+"px Oswald,'Arial Narrow',Arial,sans-serif";
    ctx.fillText(val,x,bigBase); x+=m.wB+gap;}
  if(lab){ctx.font="700 "+m.sS+"px Oswald,'Arial Narrow',Arial,sans-serif";
    ctx.fillText(lab,x,smallBase);}
}
function grain(x,y,w,h,amt){
  x=Math.max(0,x|0);y=Math.max(0,y|0);w=Math.min(W-x,w|0);h=Math.min(H-y,h|0);
  if(w<=0||h<=0)return;
  const im=ctx.getImageData(x,y,w,h), d=im.data;
  for(let i=0;i<d.length;i+=4){
    if(d[i]>120&&Math.random()<amt){d[i]*=.25;d[i+1]*=.25;d[i+2]*=.25;}
  }
  ctx.putImageData(im,x,y);
}

/* ---------- photo frame ---------- */
function photoFrame(img,x,y,w,h){
  if(!img) return;
  w=Math.round(w); h=Math.round(h);
  const bordered=ckBorder.checked;
  const off=document.createElement("canvas"); off.width=w; off.height=h;
  const o=off.getContext("2d");
  const ir=img.width/img.height, fr=w/h;
  let dw,dh;
  if(ir>fr){dh=h;dw=h*ir;} else {dw=w;dh=w/ir;}
  o.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
  // bottom fade so type can sit near the edge
  const gr=o.createLinearGradient(0,h*0.66,0,h);
  gr.addColorStop(0,deep(accent,0.07,0)); gr.addColorStop(1,deep(accent,0.07,0.74));
  o.fillStyle=gr; o.fillRect(0,h*0.66,w,h*0.34);
  if(!bordered){
    // dissolve the rectangle edges so the shot sits in the art, not in a box
    o.globalCompositeOperation="destination-out";
    const fx=Math.min(70,w*0.16), fy=Math.min(80,h*0.14);
    const edge=(x0,y0,x1,y1,ww,hh)=>{
      const g2=o.createLinearGradient(x0,y0,x1,y1);
      g2.addColorStop(0,"rgba(0,0,0,1)"); g2.addColorStop(0.55,"rgba(0,0,0,0.35)");
      g2.addColorStop(1,"rgba(0,0,0,0)");
      o.fillStyle=g2; o.fillRect(Math.min(x0,x1),Math.min(y0,y1),ww,hh);
    };
    edge(0,0,fx,0,fx,h);
    edge(w,0,w-fx,0,fx,h);
    edge(0,0,0,fy,w,fy);
    edge(0,h,0,h-fy,w,fy);
    o.globalCompositeOperation="source-over";
  }
  ctx.drawImage(off,x,y);
  if(bordered){
    ctx.strokeStyle=accent; ctx.lineWidth=3;
    ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);
  }
}

/* ---------- background ---------- */
function background(){
  ctx.fillStyle=deep(accent,0.085); ctx.fillRect(0,0,W,H);
  // soft pool of colour behind the middle of the frame
  const rg=ctx.createRadialGradient(W*0.5,H*0.42,60,W*0.5,H*0.42,W*0.85);
  rg.addColorStop(0,rgba(accent,0.16));
  rg.addColorStop(0.55,rgba(accent,0.05));
  rg.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
  const gTex=tinted.grunge||imgs.grunge;
  if(gTex){
    ctx.save(); ctx.globalAlpha=.62;
    const s=Math.max(W/gTex.width,1);
    for(let y=0;y<H;y+=gTex.height*s) ctx.drawImage(gTex,0,y,W,gTex.height*s);
    ctx.restore();
  }
  ctx.save(); ctx.globalAlpha=.8;
  const seeded=(n)=>{let t=n*9301+49297;return ((t%233280)/233280);};
  for(let i=0;i<110;i++){
    const r1=seeded(i*3+1), r2=seeded(i*7+5), r3=seeded(i*11+3);
    const edge = r1<.5 ? r1*170 : W-r1*170;
    const y=r2*H, len=40+r3*190, th=1+r3*5;
    ctx.save(); ctx.translate(edge,y); ctx.rotate(-0.42);
    ctx.fillStyle=rgba(accent,.28+r3*.6);
    ctx.fillRect(0,0,len,th);
    ctx.restore();
  }
  for(let i=0;i<170;i++){
    const r1=seeded(i*5+9), r2=seeded(i*13+2), r3=seeded(i*17+6);
    const x = r1<.5 ? r1*220 : W-r1*220;
    ctx.fillStyle=rgba(accent,.3+r3*.6);
    ctx.beginPath(); ctx.arc(x,r2*H,1+r3*4,0,7); ctx.fill();
  }
  ctx.restore();
}

/* ---------- header / footer ---------- */
function header(side){
  // side = where the logo block sits; the headline takes the opposite top corner
  const logo=imgs.logo;
  const logoH=198;
  const logoW = logo ? logoH*(logo.width/logo.height) : 300;
  const left = side==="left";

  const lx = left ? M : W-M-logoW;
  if(logo) ctx.drawImage(logo,lx,30,logoW,logoH);

  // wordmark tucked under the mark
  const wx = left ? M+4 : W-M-4;
  const wAlign = left ? "left" : "right";
  txtFit("TEAM FRANCISCO",600,19,logoW-6,wx,30+logoH+42,WHITE,7,wAlign);
  const bw=100;
  ctx.fillStyle=accent;
  ctx.fillRect(left ? M : W-M-bw, 30+logoH+58, bw, 4);

  // headline fills the opposite corner
  const hAlign = left ? "right" : "left";
  const hx = left ? W-M : M;
  const hMax = W-2*M-logoW-34;
  txtFit(v("h1"),700,46,hMax,hx,132,WHITE,2,hAlign);
  txtFit(v("h2"),700,46,hMax,hx,196,accent,2,hAlign);

  return 30+logoH+82;
}
function footer(){
  const y=H-92;
  ctx.strokeStyle=accent; ctx.lineWidth=3;
  ctx.strokeRect(M+1.5,y+1.5,W-2*M-3,70-3);
  const logo=imgs.logo;
  if(logo){const h=34,w=h*(logo.width/logo.height);ctx.drawImage(logo,M+22,y+18,w,h);}
  txtFit("TEAM FRANCISCO",700,20,340,W/2,y+44,WHITE,6,"center");
  txtFit("PLAY HARD  ·  PLAY TOGETHER",600,13,250,W-M-24,y+43,accent,4,"right");
}

/* ---------- stat sections ---------- */
const hiT=document.getElementById("hiT"), hiC=document.getElementById("hiC");
/* Per-box styling so one container can be picked out in its own colour. */
function boxStyle(name){
  if(hiT.value===name){
    const c=hiC.value, ink=inkOn(c);
    return {fill:c, line:c, val:ink, lab:ink, on:true};
  }
  return {fill:deep(accent,0.055,0.94), line:accent, val:WHITE, lab:accent, on:false};
}
function panel(x,y,w,h,hdr,st){
  st=st||boxStyle(null);
  ctx.fillStyle=st.fill; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=st.line; ctx.lineWidth=3; ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);
  if(hdr){
    const hh=Math.min(38,h*0.3);
    ctx.fillStyle=st.on?deep(accent,0.055,0.94):accent; ctx.fillRect(x,y,w,hh);
    txtFit(hdr,600,Math.min(20,hh*0.52),w-26,x+w/2,y+hh*0.70,
           st.on?st.fill:inkOn(accent),4,"center");
    return y+hh;
  }
  return y;
}
const cellsOf=(arr)=>arr.filter(p=>v(p[0])||v(p[1]));
const RATE=[["a1v","a1l"],["a2v","a2l"],["a3v","a3l"]];
const CNT=[["b1v","b1l"],["b2v","b2l"],["b3v","b3l"],["b4v","b4l"]];

let SC=1;                  // vertical stretch applied to the stat stack
let GX=0;                  // extra breathing room between sections
const S=n=>Math.round(n*SC);

/* One type size for the whole stack, derived from the rate row and then
   checked against the team box so both read as the same set of numbers.
   Panel heights are built FROM this size, so boxes hug their contents. */
let BT={cap:70,lab:20};
let ST={cap:70,lab:20};
const PAD_V=44;            // even breathing room above/below the numbers
const HDR_H=38;

function baseType(w){
  const cR=cellsOf(RATE), nR=cR.length||3, seg=w/nR;
  let lab=Math.max(14,Math.min(22,w*0.033));
  let cap=Math.max(18,Math.min(seg*0.46,96));
  let kv=1,kl=1;
  cR.forEach(p=>{
    kv=Math.min(kv,fitRatio(v(p[0]),700,cap,seg-20,0));
    kl=Math.min(kl,fitRatio(v(p[1]),700,lab,seg-14,1.6));
  });
  cap*=kv; lab*=kl;
  if(ckTeam.checked){
    const half=w/2;
    const kv2=Math.min(fitRatio(v("t1v"),700,cap,half-34,0),
                       fitRatio(v("t2v"),700,cap,half-34,0));
    const kl2=Math.min(fitRatio(v("t1l"),700,lab,half-24,2.5),
                       fitRatio(v("t2l"),700,lab,half-24,2.5));
    cap*=kv2; lab*=kl2;
  }
  return {cap,lab};
}

const ALL_SECTIONS=["team","hdr","rate","ban","cnt"];
function sectionH(name,w){
  const b=BT, box=Math.round(b.cap+b.lab+PAD_V);
  if(name==="team") return ckTeam.checked ? HDR_H+box : 0;
  if(name==="hdr")  return HDR_H;
  if(name==="rate") return cellsOf(RATE).length ? box : 0;
  if(name==="ban")  return (ckBan.checked && v("ban")) ? 74 : 0;
  if(name==="cnt"){
    const n=cellsOf(CNT).length; if(!n) return 0;
    const rowH=Math.round(b.cap+PAD_V-4);   // 20px above and below the figure
    return w<430 ? Math.ceil(n/2)*rowH+12 : rowH;
  }
  return 0;
}
function sectionCount(w,list){
  return (list||ALL_SECTIONS).map(n=>sectionH(n,w)).filter(p=>p>0).length;
}
function statsHeight(w,list){
  const parts=(list||ALL_SECTIONS).map(n=>sectionH(n,w)).filter(p=>p>0);
  return parts.reduce((a,b)=>a+b,0)+12*(parts.length-1);
}
/* Fit the stack to the space it is given: a little stretch, then spend the
   rest on gaps between boxes rather than inflating the boxes. */
function fit(w,avail,maxStretch,maxExtraGap,list){
  GX=0; SC=1;
  BT=baseType(w);
  const nat=statsHeight(w,list);
  if(!nat){ return {nat:0,left:avail}; }
  SC=Math.max(1,Math.min(maxStretch||1.25, avail/nat));
  let used=nat*SC;
  const n=sectionCount(w,list);
  const gapRoom=(maxExtraGap===undefined?26:maxExtraGap);
  if(gapRoom && n>1 && avail>used){
    GX=Math.min(gapRoom,(avail-used)/(n-1));
    used+=GX*(n-1);
  }
  ST={cap:BT.cap*SC, lab:BT.lab*SC};
  return {nat:used,left:Math.max(0,avail-used)};
}

function drawTeam(x,y,w){
  const h=S(sectionH("team",w)), hh=S(HDR_H), st=boxStyle("team");
  ctx.fillStyle=st.fill; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=st.line; ctx.lineWidth=3; ctx.strokeRect(x+1.5,y+1.5,w-3,h-3);
  ctx.fillStyle=st.on?deep(accent,0.055,0.94):accent; ctx.fillRect(x,y,w,hh);
  txtFit("T E A M   R E S U L T S",600,Math.min(19,hh*0.50),w-26,x+w/2,y+hh*0.70,
         st.on?st.fill:inkOn(accent),4,"center");
  const top=y+hh, mid=x+w/2;
  ctx.fillStyle=st.on?st.val:accent; ctx.fillRect(mid-1,top+10,2,y+h-top-20);
  const cA=x+w/4, cB=x+w*0.75;
  txt(v("t1v"),700,ST.cap,cA,y+h-ST.lab-S(26),st.val,0,"center");
  txt(v("t2v"),700,ST.cap,cB,y+h-ST.lab-S(26),st.val,0,"center");
  txt(v("t1l"),700,ST.lab,cA,y+h-S(18),st.lab,2.5,"center");
  txt(v("t2l"),700,ST.lab,cB,y+h-S(18),st.lab,2.5,"center");
  if(!st.on) grain(x+5,top+5,w-10,Math.max(10,h-hh-26),.05);
  return h;
}
function drawHdr(x,y,w){
  const h=S(HDR_H), st=boxStyle("hdr");
  ctx.fillStyle=st.on?st.fill:accent; ctx.fillRect(x,y,w,h);
  txtFit(v("phdr"),600,Math.min(22,h*0.52),w-28,x+w/2,y+h*0.70,
         inkOn(st.on?st.fill:accent),4,"center");
  return h;
}
function drawRate(x,y,w){
  const c=cellsOf(RATE); if(!c.length) return 0;
  const h=S(sectionH("rate",w)), st=boxStyle("rate");
  panel(x,y,w,h,null,st);
  const seg=w/c.length;
  for(let i=1;i<c.length;i++){
    ctx.fillStyle=st.on?st.val:accent; ctx.fillRect(x+seg*i-1,y+S(16),2,h-S(32));
  }
  c.forEach((p,i)=>{
    const cx=x+seg*i+seg/2;
    txt(v(p[0]),700,ST.cap,cx,y+h-ST.lab-S(26),st.val,0,"center");
    txt(v(p[1]),700,ST.lab,cx,y+h-S(18),st.lab,1.6,"center");
  });
  if(!st.on) grain(x+5,y+12,w-10,Math.max(10,h-ST.lab-30),.05);
  return h;
}
function drawBan(x,y,w){
  const s=v("ban"); if(!s||!ckBan.checked) return 0;
  const h=S(74), st=boxStyle("ban");
  const art = st.on ? brushTinted(st.fill) : tinted.brush;
  if(art) ctx.drawImage(art,x-12,y,w+24,h);
  ctx.save(); ctx.translate(x+w/2-4,y+h*0.70); ctx.transform(1,0,-.16,1,0,0);
  txtFit(s,700,Math.min(w*0.115,h*0.60),w-70,0,0,inkOn(st.on?st.fill:accent),2,"center");
  ctx.restore();
  return h;
}
function drawCnt(x,y,w){
  const c=cellsOf(CNT); if(!c.length) return 0;
  const st=boxStyle("cnt"), h=S(sectionH("cnt",w));
  if(w<430){
    const rows=Math.ceil(c.length/2), rh=(h-S(10))/rows;
    panel(x,y,w,h,null,st);
    ctx.fillStyle=st.on?st.val:accent; ctx.fillRect(x+w/2-1,y+10,2,h-20);
    for(let r=1;r<rows;r++){
      ctx.fillStyle=st.on?rgba("#ffffff",.3):rgba(accent,.45);
      ctx.fillRect(x+18,y+S(5)+r*rh,w-36,1);
    }
    let cap=ST.cap, k=1;
    c.forEach(p=>{
      const m=pairW(v(p[0]),v(p[1]),cap,cap*0.54,7);
      if(m.total>w/2-24 && m.total>0) k=Math.min(k,(w/2-24)/m.total);
    });
    cap*=k;
    c.forEach((p,i)=>{
      const r=(i/2)|0, col=i%2;
      const cx=x+w/4+col*w/2, base=y+S(5)+r*rh+rh*0.74;
      drawPair(v(p[0]),v(p[1]),cx,cap,base,cap*0.54,base-cap*0.10,7*k,0,st.val);
    });
    if(!st.on) grain(x+5,y+6,w-10,h-12,.05);
    return h;
  }
  const seg=w/c.length;
  panel(x,y,w,h,null,st);
  for(let i=1;i<c.length;i++){
    ctx.fillStyle=st.on?st.val:accent; ctx.fillRect(x+seg*i-1,y+S(14),2,h-S(28));
  }
  let cap=ST.cap, k=1;
  c.forEach(p=>{
    const m=pairW(v(p[0]),v(p[1]),cap,cap*0.53,6);
    if(m.total>seg-18 && m.total>0) k=Math.min(k,(seg-18)/m.total);
  });
  cap*=k;
  c.forEach((p,i)=>{
    const cx=x+seg*i+seg/2;
    drawPair(v(p[0]),v(p[1]),cx,cap,y+h-S(20),cap*0.53,y+h-S(20)-cap*0.09,6*k,0,st.val);
  });
  if(!st.on) grain(x+5,y+10,w-10,h-20,.05);
  return h;
}
function drawStats(x,y,w,list){
  let cy=y;
  const step=(h)=>{ if(h>0) cy+=h+S(12)+GX; };
  (list||ALL_SECTIONS).forEach(n=>{
    if(n==="team"){ if(ckTeam.checked) step(drawTeam(x,cy,w)); }
    else if(n==="hdr")  step(drawHdr(x,cy,w));
    else if(n==="rate") step(drawRate(x,cy,w));
    else if(n==="ban")  step(drawBan(x,cy,w));
    else if(n==="cnt")  step(drawCnt(x,cy,w));
  });
  return cy-y;
}
/* ---------- layouts ---------- */
function render(){
  if(ready<needed) return;
  ensureTint();
  ctx.clearRect(0,0,W,H);
  background();
  const mir=ckMirror.checked;
  // never recoloured; only converted wholesale in black-and-white mode
  const A=tinted.A||imgs.A, B=tinted.B||imgs.B;

  if(ORIG_FAMILY.indexOf(layout)>=0){
    const plate=tinted.orig||imgs.orig;
    if(plate) ctx.drawImage(plate,0,0,W,H);
    ctx.save();                       // pull the whole field toward the accent
    ctx.globalCompositeOperation="color";
    ctx.globalAlpha=.34;
    ctx.fillStyle=accent; ctx.fillRect(0,0,W,H);
    ctx.restore();

    const L0=35, W0=601, TOP=748, AVAIL=600;

    if(layout==="original"){
      const f=fit(W0,AVAIL,1.3,0,ALL_SECTIONS);
      drawStats(L0,TOP+f.left/2,W0,ALL_SECTIONS);
    }
    else if(layout==="origTall"){
      // same sections, stretched to own the whole open area
      const f=fit(W0,AVAIL,1.75,18,ALL_SECTIONS);
      drawStats(L0,TOP+f.left/2,W0,ALL_SECTIONS);
    }
    else if(layout==="origCompact"){
      // no banner, sits low so more of the photo reads above it
      const list=["team","hdr","rate","cnt"];
      const f=fit(W0,AVAIL*0.78,1.2,10,list);
      drawStats(L0,TOP+AVAIL-f.nat,W0,list);
    }
    else if(layout==="origSplit"){
      // team up top, player block anchored at the bottom, photo showing between
      const tList=["team"], pList=["hdr","rate","ban","cnt"];
      if(ckTeam.checked){
        const ft=fit(W0,140,1.1,0,tList);
        drawStats(L0,TOP,W0,tList);
      }
      const usedTop=ckTeam.checked?S(126)+26:0;
      const fp=fit(W0,AVAIL-usedTop-24,1.3,12,pList);
      drawStats(L0,TOP+AVAIL-fp.nat,W0,pList);
    }
    else if(layout==="origBanner"){
      // banner leads, no team box
      const list=["ban","hdr","rate","cnt"];
      const f=fit(W0,AVAIL,1.4,14,list);
      drawStats(L0,TOP+f.left/2,W0,list);
    }
    else if(layout==="origLine"){
      // just the headline numbers, large, lots of photo left visible
      const list=["hdr","rate","ban"];
      const f=fit(W0,AVAIL*0.62,1.9,16,list);
      drawStats(L0,TOP+(AVAIL-f.nat)/2,W0,list);
    }
    return;
  }

  const side = mir ? "right" : "left";
  const hTop = header(side);
  const bodyTop=hTop, bodyBot=H-110, bodyH=bodyBot-bodyTop;
  const innerW=W-2*M, GAP=16;

  if(layout==="columns"){
    const sw=Math.round(innerW*0.445), pw=innerW-sw-GAP;
    const sx = mir ? M+pw+GAP : M;
    const px = mir ? M : M+sw+GAP;
    const ah=Math.round(bodyH*0.545), bh=bodyH-ah-GAP;
    photoFrame(A,px,bodyTop,pw,ah);
    photoFrame(B,px,bodyTop+ah+GAP,pw,bh);
    const f=fit(sw,bodyH,1.16,30);
    drawStats(sx,bodyTop+f.left/2,sw);
  }
  else if(layout==="topPhoto"||layout==="bottomPhoto"){
    // give the stats exactly what they need, hand the rest to the photos
    SC=1;
    const nat=statsHeight(innerW);
    let ph=bodyH-nat-GAP;
    ph=Math.max(Math.round(bodyH*0.34),Math.min(Math.round(bodyH*0.56),ph));
    const availS=bodyH-ph-GAP;
    const wA=Math.round((innerW-GAP)*0.56), wB=innerW-GAP-wA;
    const py = layout==="topPhoto" ? bodyTop : bodyBot-ph;
    const sy = layout==="topPhoto" ? bodyTop+ph+GAP : bodyTop;
    const xA = mir ? M+wB+GAP : M, xB = mir ? M : M+wA+GAP;
    photoFrame(A,xA,py,wA,ph);
    photoFrame(B,xB,py,wB,ph);
    const f=fit(innerW,availS,1.9);
    drawStats(M,sy+f.left/2,innerW);
  }
  else if(layout==="hero"){
    SC=1;
    const nat=statsHeight(innerW);
    let ph=bodyH-nat-GAP;
    ph=Math.max(Math.round(bodyH*0.36),Math.min(Math.round(bodyH*0.58),ph));
    const availS=bodyH-ph-GAP;
    photoFrame(A,M,bodyTop,innerW,ph);
    const iw=Math.round(innerW*0.30), ih=Math.round(ph*0.62);
    const ix = mir ? M+14 : M+innerW-iw-14;
    photoFrame(B,ix,bodyTop+ph-ih-14,iw,ih);
    const f=fit(innerW,availS,1.9);
    drawStats(M,bodyTop+ph+GAP+f.left/2,innerW);
  }
  else if(layout==="spotlight"){
    photoFrame(A,M,bodyTop,innerW,bodyH);
    ctx.fillStyle=deep(accent,0.09,0.52); ctx.fillRect(M,bodyTop,innerW,bodyH);
    const iw=Math.round(innerW*0.26), ih=Math.round(iw*1.45);
    const ix = mir ? M+18 : M+innerW-iw-18;
    photoFrame(B,ix,bodyTop+18,iw,ih);
    const sw=Math.round(innerW*0.66);
    const sx = mir ? M+innerW-sw-20 : M+20;
    const top=bodyTop+ih+30, availS=bodyBot-20-top;
    const f=fit(sw,availS,1.35,24);
    drawStats(sx,top+f.left/2,sw);
  }
  else if(layout==="band"){
    const sw=Math.round(innerW*0.58), bw=innerW-sw-GAP;
    SC=1;
    const nat=statsHeight(sw);
    let ph=bodyH-nat-GAP;
    ph=Math.max(Math.round(bodyH*0.24),Math.min(Math.round(bodyH*0.44),ph));
    const rest=bodyH-ph-GAP;
    photoFrame(A,M,bodyTop,innerW,ph);
    const sx = mir ? M+bw+GAP : M;
    const bx = mir ? M : M+sw+GAP;
    photoFrame(B,bx,bodyTop+ph+GAP,bw,rest);
    const f=fit(sw,rest,1.3,24);
    drawStats(sx,bodyTop+ph+GAP+f.left/2,sw);
  }
  footer();
}

/* ---------- controls ---------- */
/* Some layouts have nothing to flip or frame — grey those controls out. */
function syncControls(){
  const hasPhotos = ORIG_FAMILY.indexOf(layout)<0;
  [[ckMirror,hasPhotos],[ckBorder,hasPhotos]].forEach(([c,enabled])=>{
    c.disabled=!enabled;
    const lab=c.closest(".ck");
    if(lab) lab.classList.toggle("off",!enabled);
  });
}
const layWrap=document.getElementById("lay");
LAYOUTS.forEach(([id,label])=>{
  const b=document.createElement("button");
  b.className="lb"+(id===layout?" on":""); b.textContent=label; b.dataset.id=id;
  b.addEventListener("click",()=>{layout=id;
    [...layWrap.children].forEach(c=>c.classList.toggle("on",c.dataset.id===layout));
    syncControls(); render();});
  layWrap.appendChild(b);
});
const swWrap=document.getElementById("sw"), accIn=document.getElementById("acc");
PRESETS.forEach(([n,hx])=>{
  const b=document.createElement("button");
  b.className="sw"+(hx===accent?" on":""); b.style.background=hx; b.title=n; b.dataset.hex=hx;
  b.addEventListener("click",()=>{mono=false;accent=hx;lastColor=hx;accIn.value=hx;mark();tintedFor=null;render();});
  swWrap.appendChild(b);
});
const monoBtn=document.getElementById("monoBtn");
const mark=()=>{
  [...swWrap.children].forEach(b=>
    b.classList.toggle("on",!mono && b.dataset.hex.toLowerCase()===accent.toLowerCase()));
  monoBtn.classList.toggle("on",mono);
};
monoBtn.addEventListener("click",()=>{
  mono=!mono;
  if(mono){ lastColor=accent; accent=MONO_ACCENT; }
  else { accent=lastColor; accIn.value=lastColor; }
  mark(); tintedFor=null; render();
});
accIn.addEventListener("input",()=>{mono=false;accent=accIn.value;lastColor=accent;mark();tintedFor=null;render();});
mark();

[["d1","f1","A"],["d2","f2","B"]].forEach(([dId,fId,key])=>{
  const drop=document.getElementById(dId), file=document.getElementById(fId);
  drop.addEventListener("click",()=>file.click());
  file.addEventListener("change",()=>{
    const f=file.files&&file.files[0]; if(!f) return;
    const url=URL.createObjectURL(f), im=new Image();
    im.onload=()=>{imgs[key]=im;tintedFor=null;drop.classList.add("has");
      drop.textContent="Swapped";URL.revokeObjectURL(url);render();};
    im.src=url;
  });
});

ids.forEach(i=>el[i].addEventListener("input",render));
[ckMirror,ckTeam,ckBan,ckBorder,hiT].forEach(c=>c.addEventListener("change",render));
hiC.addEventListener("input",render);
document.getElementById("clr").addEventListener("click",()=>{
  ["t1v","t2v","a1v","a2v","a3v","ban","b1v","b2v","b3v","b4v"].forEach(i=>el[i].value="");
  render();});
/* ---------- drawer ---------- */
const tabs=document.getElementById("tabs"), drawer=document.getElementById("drawer");
[...tabs.querySelectorAll(".tab[data-p]")].forEach(b=>{
  b.addEventListener("click",()=>{
    drawer.classList.remove("min");
    document.getElementById("chev").innerHTML='<path d="M6 15l6-6 6 6"/>';
    [...tabs.querySelectorAll(".tab[data-p]")].forEach(o=>o.classList.toggle("on",o===b));
    [...document.querySelectorAll(".pane")].forEach(p=>
      p.classList.toggle("on",p.id===b.dataset.p));
  });
});
document.getElementById("toggle").addEventListener("click",()=>{
  const min=drawer.classList.toggle("min");
  document.getElementById("chev").innerHTML = min
    ? '<path d="M6 9l6 6 6-6"/>' : '<path d="M6 15l6-6 6 6"/>';
});

document.getElementById("dl").addEventListener("click",async()=>{
  const note=document.getElementById("note");
  const say=(m)=>{ if(note) note.textContent=m; };
  const blob=await new Promise(r=>cv.toBlob(r,"image/png"));
  if(!blob){ say("Couldn't build the image — try again."); return; }
  const name="team-francisco-weekend.png";

  // Inside the Claude artifact host, saving goes through its download bridge.
  if(typeof claude!=="undefined" && claude && claude.use){
    try{
      const dls=await claude.use("downloads");
      if(dls){ await dls.save({filename:name,data:blob}); say("Saved."); return; }
    }catch(err){
      if(err && err.code==="declined"){ say("Save cancelled."); return; }
    }
  }

  // Standard browser download — the path used when self-hosted.
  try{
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    say("Downloaded.");
  }catch(e){
    say("Couldn't download — press and hold the poster to save it.");
  }
});

/* ---------- boot ---------- */
[["A",PH_A],["B",PH_B],["grunge",GRUNGE],["logo",LOGO],["brush",BRUSH],["orig",ORIG]].forEach(([k,src])=>{
  const im=new Image();
  im.onload=()=>{imgs[k]=im;ready++;tintedFor=null;render();};
  im.onerror=()=>{ready++;render();};
  im.src=src;
});
syncControls();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>render());
