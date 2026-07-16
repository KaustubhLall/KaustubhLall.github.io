(async function(){
  "use strict";
  const tag=document.getElementById("history"),response=await fetch(tag.dataset.src);
  if(!response.ok)throw new Error(`history request failed (${response.status})`);
  if(typeof DecompressionStream!=="function")throw new Error("this browser cannot decompress the evolution history");
  const D=JSON.parse(await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).text());
  const M=D.meta,G=D.gens,E=NeatVizEngine,$=id=>document.getElementById(id),label=E.labels[M.game];
  let gi=G.length-1,selected=null,selectedId=null,game=null,net=null,tick=0,playing=false,last=0,acc=0,obs=[],result=null,layout=null,currentFps=60,maxFrames=0;
  const maps=G.map(g=>new Map(g.sp.map(s=>[s.id,s]))),totals=G.map(g=>Math.max(1,g.sp.reduce((n,s)=>n+s.sz,0)));
  const ids=[...new Set(G.flatMap(g=>g.sp.map(s=>s.id)))],lifeById=new Map();
  const speciesMass=new Map();
  G.forEach(g=>g.sp.forEach(s=>speciesMass.set(s.id,(speciesMass.get(s.id)||0)+s.sz)));
  const persistentIds=[...speciesMass].sort((a,b)=>b[1]-a[1]).slice(0,18).map(x=>x[0]);
  G.forEach((g,i)=>g.sp.forEach(s=>{const x=lifeById.get(s.id)||{first:i,last:i,count:0};x.last=i;x.count++;lifeById.set(s.id,x);}));
  const hue=id=>{const x=(id*2654435761)>>>0;return `hsl(${x%360} 66% 58%)`;};

  function schema(){
    if(M.game==="flappy")return [{name:"Flight state",color:"#61d4d1",items:["height","vertical velocity","distance to next pipe","gap top","gap bottom"]}];
    if(M.game==="snake"){
      const groups=[{name:"Immediate plan",color:"#61d4d1",items:["danger ahead","danger left","danger right","food forward","food right","food distance","body length"]}];
      const dirs=["ahead","ahead-right","right","back-right","behind","back-left","left","ahead-left"];
      groups.push({name:"Egocentric rays",color:"#b99cff",items:dirs.flatMap(d=>[`${d}: wall`,`${d}: body`,`${d}: food`])});return groups;
    }
    if(M.game==="2048")return [
      {name:"Board cells",color:"#61d4d1",items:Array.from({length:16},(_,i)=>`tile r${Math.floor(i/4)+1} c${i%4+1}`)},
      {name:"Board strategy",color:"#f7bd58",items:["empty cells","largest tile","largest in corner","monotone rows","monotone columns","smoothness","mergeable pairs","board fill"]}
    ];
    const dirs=["north","north-east","east","south-east","south","south-west","west","north-west"];
    return [
      {name:"Local plan",color:"#61d4d1",items:["open north","open east","open south","open west","pellet dx","pellet dy","pellet distance","ghost 1 dx","ghost 1 dy","ghost 1 distance","ghost 2 dx","ghost 2 dy","ghost 2 distance","pac x","pac y","pellets left"]},
      {name:"Sight lines",color:"#b99cff",items:dirs.flatMap(d=>[`${d}: wall`,`${d}: pellet`,`${d}: ghost`])}
    ];
  }
  const groups=schema(),featureNames=groups.flatMap(g=>g.items),featureColors=groups.flatMap(g=>g.items.map(()=>g.color));

  function metrics(s){
    if(s._vm)return s._vm;
    const nodes=s.net.n,enabled=s.net.c.filter(c=>c[3]),type=new Map(nodes.map(n=>[n[0],n[1]])),depth=new Map();
    nodes.forEach(n=>{if(n[1]===0||n[1]===1)depth.set(n[0],0);});
    for(let pass=0;pass<nodes.length;pass++){let changed=false;for(const c of enabled)if(depth.has(c[0])){const d=depth.get(c[0])+1;if(d>(depth.get(c[1])??-1)){depth.set(c[1],d);changed=true;}}if(!changed)break;}
    const outs=nodes.filter(n=>n[1]===3),maxDepth=Math.max(1,...outs.map(n=>depth.get(n[0])||1));
    return s._vm={hidden:nodes.filter(n=>n[1]===2).length,connections:enabled.length,depth:maxDepth};
  }
  const refs=[];G.forEach((g,i)=>g.sp.forEach(s=>refs.push({gi:i,s,m:metrics(s)})));
  const pick=fn=>refs.reduce((a,b)=>fn(b)>fn(a)?b:a,refs[0]);
  const shortcuts=[
    ["Best game score",pick(r=>r.s.sc),r=>`${r.s.sc} ${label.score}`],
    ["Longest average run",pick(r=>r.s.et||0),r=>`${(r.s.et||0).toLocaleString()} steps`],
    ["Highest fitness",pick(r=>r.s.bf),r=>fmt(r.s.bf)],
    ["Deepest network",pick(r=>r.m.depth),r=>`${r.m.depth} layers`],
    ["Most hidden neurons",pick(r=>r.m.hidden),r=>`${r.m.hidden} hidden`]
  ];
  const glyphs=["♜","◷","ϟ","▱","⌘"];
  $("highlights").innerHTML=shortcuts.map(([name,r,val],i)=>`<button class="jump" data-jump="${i}"><i class="glyph" aria-hidden="true">${glyphs[i]}</i><small>${name}</small><strong>${val(r)}</strong><span>gen ${G[r.gi].g} · species ${r.s.id} · replay it&nbsp; ▸</span></button>`).join("");
  shortcuts.forEach(([,r],i)=>$("highlights").querySelector(`[data-jump="${i}"]`).onclick=()=>jump(r));
  $("title").textContent=`${label.title}: see every decision`;
  document.title=`${label.title} evolution - neat-playground`;
  $("metaBadge").textContent=`${G.length} generations · ${ids.length.toLocaleString()} species · ${refs.length.toLocaleString()} replayable champions`;
  $("gen").max=G.length-1;$("scoreName").textContent=label.score;

  function fit(canvas){const r=canvas.getBoundingClientRect(),d=devicePixelRatio||1,w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const c=canvas.getContext("2d");c.setTransform(d,0,0,d,0,0);return {c,w:r.width,h:r.height};}
  function colorShade(hex,amount){const n=parseInt(hex.slice(1),16),r=Math.max(0,Math.min(255,(n>>16)+amount)),g=Math.max(0,Math.min(255,((n>>8)&255)+amount)),b=Math.max(0,Math.min(255,(n&255)+amount));return `rgb(${r},${g},${b})`;}
  function grid(c,w,h,p=24){c.strokeStyle="#20293a";c.lineWidth=1;for(let i=0;i<5;i++){const y=p+(h-2*p)*i/4;c.beginPath();c.moveTo(p,y);c.lineTo(w-p,y);c.stroke();}}
  function smoothTrace(c,points,move=true){if(!points.length)return;if(move)c.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;c.quadraticCurveTo(a[0],a[1],mx,my);}const z=points[points.length-1];c.lineTo(z[0],z[1]);}
  function drawMuller(){
    const {c,w,h}=fit($("muller")),p=20,base=new Array(G.length).fill(0),focus=[],plotIds=[...persistentIds];c.clearRect(0,0,w,h);grid(c,w,h,p);
    if(selectedId!=null&&!plotIds.includes(selectedId))plotIds.push(selectedId);
    const bands=[{id:null,values:G.map((g,x)=>Math.max(0,1-plotIds.reduce((n,id)=>n+(maps[x].get(id)?.sz||0)/totals[x],0)))}].concat(plotIds.map(id=>({id,values:G.map((g,x)=>(maps[x].get(id)?.sz||0)/totals[x])})));
    for(const band of bands){const top=band.values.map((v,x)=>base[x]+v);if(band.id===selectedId)for(let x=0;x<G.length;x++)focus[x]=band.values[x]?base[x]+band.values[x]/2:null;const upper=top.map((v,x)=>[p+(w-2*p)*(G.length===1?0:x/(G.length-1)),h-p-(h-2*p)*v]),lower=base.map((v,x)=>[p+(w-2*p)*(G.length===1?0:x/(G.length-1)),h-p-(h-2*p)*v]).reverse();c.beginPath();smoothTrace(c,upper);c.lineTo(lower[0][0],lower[0][1]);smoothTrace(c,lower,false);c.closePath();c.fillStyle=band.id==null?"#243542":hue(band.id);c.globalAlpha=band.id===selectedId?.95:band.id==null?.82:.68;c.fill();c.globalAlpha=1;base.splice(0,base.length,...top);}
    if(selectedId!=null){c.strokeStyle="#fff";c.lineWidth=2.5;c.beginPath();let on=false;focus.forEach((v,x)=>{if(v==null){on=false;return;}const px=p+(w-2*p)*x/(G.length-1),py=h-p-(h-2*p)*v;if(!on){c.moveTo(px,py);on=true;}else c.lineTo(px,py);});c.stroke();}
    const x=p+(w-2*p)*(G.length===1?0:gi/(G.length-1));c.strokeStyle="#f7bd58";c.lineWidth=2;c.beginPath();c.moveTo(x,p);c.lineTo(x,h-p);c.stroke();
  }
  function drawCurves(){
    const {c,w,h}=fit($("curves")),p=25;c.clearRect(0,0,w,h);grid(c,w,h,p);const train=G.map(g=>g.bs),held=G.map(g=>g.tm<0?null:g.tm);
    const normalize=arr=>{const vals=arr.filter(Number.isFinite),lo=Math.min(0,...vals),hi=Math.max(1,...vals),span=hi-lo||1;return arr.map(v=>Number.isFinite(v)?(v-lo)/span:null);};
    const line=(arr,color,dashed,bridge=false)=>{c.strokeStyle=color;c.lineWidth=2.2;c.setLineDash(dashed?[6,5]:[]);c.beginPath();let run=[];const flush=()=>{if(run.length){smoothTrace(c,run);run=[];}};arr.forEach((v,i)=>{if(!Number.isFinite(v)){if(!bridge)flush();return;}run.push([p+(w-2*p)*i/(G.length-1),h-p-(h-2*p)*v]);});flush();c.stroke();c.setLineDash([]);};line(normalize(train),"#a8db48",false);line(normalize(held),"#38d5df",true,true);
    c.font="10px ui-monospace,monospace";c.fillStyle="#a8db48";c.fillText(`best ${fmt(train[gi])}`,p,h-7);c.fillStyle="#38d5df";c.fillText(`held-out ${Number.isFinite(held[gi])?fmt(held[gi]):"—"}`,p+94,h-7);const x=p+(w-2*p)*gi/(G.length-1);c.strokeStyle="#ffffff99";c.lineWidth=1;c.beginPath();c.moveTo(x,p);c.lineTo(x,h-p);c.stroke();
  }
  function drawShare(){const host=$("share"),g=G[gi],sp=[...g.sp].sort((a,b)=>b.sz-a.sz);host.innerHTML="";for(const s of sp){const b=document.createElement("button");b.style.width=`${100*s.sz/totals[gi]}%`;b.style.background=hue(s.id);b.className=s.id===selectedId?"active":"";b.title=`Species ${s.id}: ${s.sz} genomes, score ${s.sc}, ${s.et||0} avg steps`;if(s.sz/totals[gi]>.075)b.innerHTML=`<span>${s.id}</span>`;b.onclick=()=>loadSpecies(s);host.appendChild(b);}}
  function sortedSpecies(){const mode=$("speciesSort").value,m={score:s=>s.sc,duration:s=>s.et||0,fitness:s=>s.bf,size:s=>s.sz,complexity:s=>metrics(s).connections};return [...G[gi].sp].sort((a,b)=>m[mode](b)-m[mode](a)||b.bf-a.bf);}
  function renderSpecies(){const host=$("species"),sp=sortedSpecies();$("speciesCount").textContent=`${sp.length} species`;host.innerHTML="";for(const s of sp){const vm=metrics(s),b=document.createElement("button");b.className="sp"+(s.id===selectedId?" active":"");b.innerHTML=`<i class="dot" style="background:${hue(s.id)}"></i><span><b>Species ${s.id}</b><small>${s.sz} genomes · score ${s.sc} · avg ${s.et||0} steps</small><small>${vm.hidden} hidden · depth ${vm.depth} · ${vm.connections} connections</small></span>`;b.onclick=()=>loadSpecies(s);host.appendChild(b);}}
  function renderGeneration(){
    const g=G[gi];$("gen").value=gi;$("genLabel").textContent=`Generation ${g.g}`;$("genStats").textContent=`${g.ns} species · best fitness ${fmt(g.bf)} · held-out ${g.tm<0?"not tested":g.tm}`;
    let s=selectedId!=null?maps[gi].get(selectedId):null;if(!s)s=sortedSpecies()[0];loadSpecies(s,true);
  }
  function loadSpecies(s,keepCourse=false){
    selected=s;selectedId=s.id;const old=keepCourse?Number($("course").value)||0:0,g=G[gi];$("course").innerHTML=g.seeds.map((x,i)=>`<option value="${i}">original course ${i+1} / ${g.seeds.length}</option>`).join("");$("course").value=Math.min(old,g.seeds.length-1);
    const life=lifeById.get(s.id);$("focusTrail").textContent=`species ${s.id} · generations ${G[life.first].g}–${G[life.last].g} · present ${life.count} times`;
    restart();renderSpecies();drawShare();drawMuller();drawCurves();
  }
  function jump(ref){gi=ref.gi;selectedId=ref.s.id;renderGeneration();document.querySelector(".replay-grid").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});}

  function networkLayout(){
    const depth=new Array(net.nodes.length).fill(0);for(const s of net.order){const n=net.nodes[s];if(n.type===0||n.type===1)continue;let d=1;for(const e of net.incoming[s])d=Math.max(d,depth[e.src]+1);depth[s]=d;}
    let max=Math.max(1,...net.outputSlots.map(s=>depth[s]));net.outputSlots.forEach(s=>depth[s]=max);const by=new Map();net.nodes.forEach((n,i)=>{const d=n.type===3?max:depth[i];if(!by.has(d))by.set(d,[]);by.get(d).push(i);});return {depth,max,by};
  }
  function restart(){
    playing=false;$("play").textContent="Play";const ci=Number($("course").value)||0,seed=G[gi].seeds[ci];game=E.createGame(M.game,seed);net=new E.Network(selected.net,M);net.reset();layout=networkLayout();tick=0;obs=game.observe();result=net.activate(obs);maxFrames=1000;
    const vm=metrics(selected);$("selection").textContent=`gen ${G[gi].g} · species ${selected.id} · course ${ci+1}`;$("depth").textContent=vm.depth;$("hidden").textContent=vm.hidden;$("expectedTicks").textContent=`${selected.et||0} steps`;$("identity").innerHTML=`seed <code>${seed}</code><br>${selected.net.n.length} total nodes · ${vm.connections} active connections<br>training score ${selected.sc} · fitness ${fmt(selected.bf)}`;const scrubEl=$("frameScrub");if(scrubEl)scrubEl.max=maxFrames;updateFrameInfo();renderReplay();
  }
  function updateFrameInfo(){const info=$("frameInfo");if(info)info.textContent=`${tick} / ${maxFrames}`;}
  function oneStep(){if(!game||!game.alive){playing=false;$("play").textContent="Play";return;}game.step(result.action);tick++;maxFrames=Math.max(maxFrames,tick);if(game.alive){obs=game.observe();result=net.activate(obs);}else{playing=false;$("play").textContent="Play";}renderReplay();}
  function scrubToFrame(f){tick=Math.max(0,Math.min(f,maxFrames));if(tick===0){restart();}else{for(let i=0;i<tick&&game.alive;i++){game.step(result.action);if(game.alive){obs=game.observe();result=net.activate(obs);}}renderReplay();}updateFrameInfo();}
  function renderReplay(){drawGame();drawNetwork();renderDecision();renderFeatures();$("tick").textContent=tick.toLocaleString();$("score").textContent=game?game.score:0;$("action").textContent=result?label.actions[result.action]:"—";$("gameStatus").textContent=game?.alive?"decision ready":"episode complete";$("narrative").textContent=narrative();}
  function renderDecision(){if(!result)return;const min=Math.min(...result.out),max=Math.max(...result.out),span=max-min||1;$("decision").innerHTML=result.out.map((v,i)=>`<div class="out ${i===result.action?"win":""}"><span>${label.actions[i]}</span><span class="meter"><i style="width:${8+92*(v-min)/span}%"></i></span><span>${v.toFixed(3)}</span></div>`).join("");}
  function renderFeatures(){let offset=0;$("features").innerHTML=groups.map(g=>{const rows=g.items.map((name,j)=>{const i=offset+j,v=obs[i]||0,p=Math.min(100,Math.abs(v)*100),isNeg=v<0,absV=Math.abs(v);return `<div class="feature"><span class="fname">${name}</span><span class="meter"><i class="${isNeg?"neg":""}" style="width:${p}%"></i><i class="center" style="opacity:${Math.max(0,Math.min(1,absV*2))}"></i></span><span class="fval">${v.toFixed(3)}</span></div>`;}).join("");offset+=g.items.length;return `<section class="feature-group"><h3 style="color:${g.color}">${g.name}</h3>${rows}</section>`;}).join("");}
  function narrative(){
    if(!obs.length)return "";
    if(M.game==="flappy")return `The bird is ${Math.round(obs[0]*100)}% down the screen, moving ${obs[1]<0?"up":"down"}. The next pipe is ${Math.max(0,obs[2]).toFixed(2)} screen-widths away; ${label.actions[result.action]} has the strongest output.`;
    if(M.game==="snake"){const danger=["ahead","left","right"].filter((_,i)=>obs[i]>.5);return `${danger.length?`Collision risk ${danger.join(" and ")}.`:"The three immediate moves are open."} Food is ${obs[3]>=0?"ahead":"behind"} and ${obs[4]>=0?"right":"left"}; the network chooses ${label.actions[result.action]}.`;}
    if(M.game==="2048"){const f=obs.slice(16);return `${Math.round(f[0]*16)} empty cells; largest tile about ${1<<Math.max(0,Math.round(f[1]*16))}; ${f[2]>.5?"the maximum is anchored in a corner":"the maximum is away from a corner"}. The strongest slide is ${label.actions[result.action]}.`;}
    const open=["north","east","south","west"].filter((_,i)=>obs[i]>.5);return `${open.length?`Open: ${open.join(", ")}.`:"No adjacent opening."} Nearest pellet is ${Math.round(obs[6]*32)} Manhattan cells away; nearest ghost is ${Math.round(obs[9]*32)} away. The network chooses ${label.actions[result.action]}.`;
  }

  function drawGame(){const {c,w,h}=fit($("game"));c.clearRect(0,0,w,h);c.fillStyle="#090d13";c.fillRect(0,0,w,h);if(!game)return;const s=game.render();if(M.game==="flappy")drawFlappy(c,w,h,s);else if(M.game==="snake")drawSnake(c,w,h,s);else if(M.game==="2048")draw2048(c,w,h,s);else drawPacman(c,w,h,s);}
  function drawFlappy(c,w,h,s){
    const sx=w/288,sy=h/512,px=Math.max(2,Math.round(Math.min(sx,sy)*2)),sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,"#071525");sky.addColorStop(.68,"#0b2438");sky.addColorStop(1,"#102c35");c.fillStyle=sky;c.fillRect(0,0,w,h);
    for(let i=0;i<42;i++){const x=((i*73+19)%997)/997*w,y=((i*151+37)%613)/613*h*.62,r=i%7===0?1.5:1;c.fillStyle=i%9===0?"#ef6aa8":"#bcd8e7";c.globalAlpha=.25+(i%5)*.1;c.fillRect(Math.round(x),Math.round(y),r,r);}c.globalAlpha=1;
    const ground=h*.88;c.fillStyle="#081a27";for(let i=0;i<18;i++){const bw=w/(14+(i%4)),bh=h*(.07+(i%5)*.012),x=(i*w/17)-20;c.fillRect(x,ground-bh,bw,bh);c.fillStyle="#f0ae2c";for(let wy=ground-bh+8;wy<ground-5;wy+=10)for(let wx=x+6;wx<x+bw-3;wx+=9)if(((wx+wy+i)|0)%3===0)c.fillRect(wx,wy,2,4);c.fillStyle="#081a27";}
    c.fillStyle="#326f2e";c.fillRect(0,ground,w,h-ground);c.fillStyle="#78ba3d";c.fillRect(0,ground,w,9);for(let x=0;x<w;x+=18){c.fillStyle=(x/18)%2?"#3d812f":"#55a338";c.fillRect(x,ground+9,18,12);c.fillStyle="#1f5928";c.fillRect(x,ground+21,18,h-ground-21);}
    let next=s.pipes[0],bd=1e9;for(const p of s.pipes){const d=p.x+52-86.4;if(d>=-12&&d<bd){bd=d;next=p;}}
    const pipe=(x,y0,y1,flip,hot)=>{const pw=52*sx,grad=c.createLinearGradient(x,0,x+pw,0);grad.addColorStop(0,"#315f22");grad.addColorStop(.22,hot?"#a8dc63":"#73ad4a");grad.addColorStop(.55,hot?"#79bd43":"#548f35");grad.addColorStop(.82,"#2d661f");grad.addColorStop(1,"#173d19");c.fillStyle=grad;c.fillRect(x,y0,pw,y1-y0);c.strokeStyle="#122f16";c.lineWidth=2;c.strokeRect(x,y0,pw,y1-y0);const rimY=flip?y0:y1-18*sy;c.fillStyle=grad;c.fillRect(x-7*sx,rimY,pw+14*sx,18*sy);c.strokeRect(x-7*sx,rimY,pw+14*sx,18*sy);c.fillStyle="#d9f69b55";c.fillRect(x+8*sx,y0+2,pw*.12,Math.max(0,y1-y0-4));};
    for(const p of s.pipes){const x=p.x*sx,top=(p.gap-70)*sy,bot=(p.gap+70)*sy;pipe(x,0,top,false,p===next);pipe(x,bot,ground,true,p===next);}
    const bx=86.4*sx,by=s.y*sy,nx=next.x*sx,top=(next.gap-70)*sy,bot=(next.gap+70)*sy,visibleX=Math.min(w-28,Math.max(28,nx));c.strokeStyle="#39d9e4";c.lineWidth=1.5;c.setLineDash([6,5]);c.beginPath();c.moveTo(bx,by);c.lineTo(visibleX,by);c.moveTo(visibleX,top);c.lineTo(visibleX,bot);c.stroke();c.setLineDash([]);
    const dot=(x,y)=>{c.fillStyle="#a56af4";c.shadowColor="#a56af4";c.shadowBlur=8;c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();c.shadowBlur=0;};if(nx<w){dot(nx+52*sx+10,top);dot(nx+52*sx+10,bot);}c.fillStyle="#aeeaf0";c.font=`${Math.max(9,11*Math.min(sx,sy))}px ui-monospace,monospace`;c.fillText(`distance ${Math.max(0,Math.round(next.x-86.4))} px`,Math.min(w-155,bx+48),by-10);if(nx<w){c.fillText(`gap top ${Math.round(next.gap-70)}`,nx+52*sx+18,top+4);c.fillText(`gap bottom ${Math.round(next.gap+70)}`,nx+52*sx+18,bot+4);}
    const sc=Math.max(1.5,Math.min(sx,sy)*1.45);c.save();c.translate(Math.round(bx-14*sc),Math.round(by-10*sc));c.imageSmoothingEnabled=false;c.fillStyle="#182238";c.fillRect(2*sc,7*sc,4*sc,7*sc);c.fillStyle="#ffd447";c.fillRect(5*sc,3*sc,13*sc,13*sc);c.fillStyle="#ffea73";c.fillRect(8*sc,2*sc,7*sc,4*sc);c.fillStyle="#fff";c.fillRect(14*sc,4*sc,6*sc,7*sc);c.fillStyle="#17202c";c.fillRect(17*sc,5*sc,2*sc,3*sc);c.fillStyle="#f06b32";c.fillRect(18*sc,10*sc,7*sc,3*sc);c.fillStyle="#d08d23";c.fillRect(7*sc,14*sc,9*sc,3*sc);c.restore();if(result.action===1){c.strokeStyle="#70e1a6";c.lineWidth=2;c.beginPath();c.arc(bx,by,18*sc,0,Math.PI*2);c.stroke();}
  }
  function drawSnake(c,w,h,s){
    const z=Math.min(w/s.w,h/s.h)*.94,ox=(w-z*s.w)/2,oy=(h-z*s.h)/2,bg=c.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,w*.72);bg.addColorStop(0,"#0b2430");bg.addColorStop(1,"#02090f");c.fillStyle=bg;c.fillRect(0,0,w,h);c.strokeStyle="#123244";c.lineWidth=1;for(let y=0;y<=s.h;y++){c.beginPath();c.moveTo(ox,oy+y*z);c.lineTo(ox+s.w*z,oy+y*z);c.stroke();}for(let x=0;x<=s.w;x++){c.beginPath();c.moveTo(ox+x*z,oy);c.lineTo(ox+x*z,oy+s.h*z);c.stroke();}c.strokeStyle="#26a9b855";c.lineWidth=2;c.strokeRect(ox,oy,s.w*z,s.h*z);const head=s.body[0],hx=head%s.w,hy=Math.floor(head/s.w),d=s.dir,DX=[0,1,0,-1],DY=[-1,0,1,0],fx=DX[d],fy=DY[d],rx=-fy,ry=fx,dirs=[[fx,fy],[fx+rx,fy+ry],[rx,ry],[rx-fx,ry-fy],[-fx,-fy],[-fx-rx,-fy-ry],[-rx,-ry],[fx-rx,fy-ry]];
    dirs.forEach(([vx,vy],r)=>{const base=7+r*3,wall=obs[base],steps=wall?Math.max(1,1/wall-1):20,ex=ox+(hx+.5+vx*steps)*z,ey=oy+(hy+.5+vy*steps)*z;c.strokeStyle="#b99cff66";c.lineWidth=1.5;c.beginPath();c.moveTo(ox+(hx+.5)*z,oy+(hy+.5)*z);c.lineTo(ex,ey);c.stroke();[[1,"#ff7184"],[2,"#70e1a6"]].forEach(([q,col])=>{const v=obs[base+q];if(v){const k=1/v-1;c.fillStyle=col;c.beginPath();c.arc(ox+(hx+.5+vx*k)*z,oy+(hy+.5+vy*k)*z,4,0,Math.PI*2);c.fill();}});});
    const immediate=[[fx,fy],[fy,-fx],[-fy,fx]];immediate.forEach(([vx,vy],i)=>{const x=hx+vx,y=hy+vy;if(x>=0&&x<12&&y>=0&&y<12){c.strokeStyle=obs[i]>.5?"#ff5270":"#38d5df";c.shadowColor=c.strokeStyle;c.shadowBlur=8;c.lineWidth=2.5;c.strokeRect(ox+x*z+4,oy+y*z+4,z-8,z-8);c.shadowBlur=0;}});s.body.slice().reverse().forEach((cell,i)=>{const x=cell%s.w,y=Math.floor(cell/s.w),isHead=i===s.body.length-1,pad=isHead?2.5:4;c.fillStyle=isHead?"#8ff5a5":`hsl(${145+i*2} 68% ${40+Math.min(18,i*1.5)}%)`;c.shadowColor=isHead?"#70e1a6":"#249969";c.shadowBlur=isHead?14:6;c.beginPath();c.roundRect(ox+x*z+pad,oy+y*z+pad,z-2*pad,z-2*pad,z*.22);c.fill();c.shadowBlur=0;if(isHead){c.fillStyle="#071017";const ex=ox+(x+.5+rx*.18)*z,ey=oy+(y+.5+ry*.18)*z;c.beginPath();c.arc(ex+fx*z*.17,ey+fy*z*.17,2.4,0,Math.PI*2);c.arc(ex-rx*z*.32+fx*z*.17,ey-ry*z*.32+fy*z*.17,2.4,0,Math.PI*2);c.fill();}});if(s.food>=0){const x=s.food%s.w,y=Math.floor(s.food/s.w),cx=ox+(x+.5)*z,cy=oy+(y+.5)*z;c.fillStyle="#ff5576";c.shadowColor="#ff5576";c.shadowBlur=18;c.beginPath();c.arc(cx,cy,z*.25,0,Math.PI*2);c.fill();c.shadowBlur=0;c.strokeStyle="#87d45c";c.lineWidth=2;c.beginPath();c.moveTo(cx,cy-z*.22);c.quadraticCurveTo(cx+z*.12,cy-z*.38,cx+z*.2,cy-z*.3);c.stroke();}}
  function draw2048(c,w,h,s){
    const bg=c.createRadialGradient(w*.5,h*.45,0,w*.5,h*.5,w*.75);bg.addColorStop(0,"#142331");bg.addColorStop(1,"#030a10");c.fillStyle=bg;c.fillRect(0,0,w,h);const z=Math.min(w,h)*.205,g=z*.055,ox=(w-4*z)/2,oy=(h-4*z)/2,cols=["#101c29","#e7e2d7","#d9d7c3","#eeb66a","#ee8f50","#e66945","#d84a3e","#d8b648","#cda23b","#bc8730","#a96ad1","#745de3"];
    c.shadowColor="#000";c.shadowBlur=24;c.fillStyle="#263747";c.beginPath();c.roundRect(ox-g,oy-g,4*z+2*g,4*z+2*g,12);c.fill();c.shadowBlur=0;c.strokeStyle="#3b586e";c.lineWidth=2;c.stroke();s.board.forEach((e,i)=>{const x=ox+(i%4)*z,y=oy+Math.floor(i/4)*z,heat=Math.min(1,obs[i]*5),grad=c.createLinearGradient(x,y,x+z,y+z),base=cols[Math.min(e,cols.length-1)];grad.addColorStop(0,base);grad.addColorStop(1,e?colorShade(base,-22):"#0b1520");c.fillStyle=grad;c.shadowColor=e?base:"transparent";c.shadowBlur=e?10+e*2:0;c.beginPath();c.roundRect(x+g,y+g,z-2*g,z-2*g,8);c.fill();c.shadowBlur=0;c.strokeStyle=`rgba(56,213,223,${.18+heat*.72})`;c.lineWidth=1.5+heat*2;c.stroke();if(e){c.fillStyle=e<3?"#403d39":"#fff";c.font=`900 ${Math.max(17,z*(e>8?.2:.27))}px system-ui`;c.textAlign="center";c.textBaseline="middle";c.fillText(String(1<<e),x+z/2,y+z/2);c.fillStyle="#ffffff33";c.fillRect(x+g+7,y+g+6,z-2*g-14,2);}});c.fillStyle="#ffb72c";c.shadowColor="#ffb72c";c.shadowBlur=12;c.font=`900 ${Math.max(36,z*.46)}px system-ui`;c.textAlign="center";c.fillText(["↑","→","↓","←"][result.action],w-44,52);c.shadowBlur=0;}
  function drawPacman(c,w,h,s){
    const z=Math.min(w/s.w,h/s.h)*.94,ox=(w-z*s.w)/2,oy=(h-z*s.h)/2,px=s.pac%s.w,py=Math.floor(s.pac/s.w),dirs=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]],bg=c.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,w*.75);bg.addColorStop(0,"#071323");bg.addColorStop(1,"#01060b");c.fillStyle=bg;c.fillRect(0,0,w,h);for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const q=y*s.w+x;if(s.wall[q]){c.fillStyle="#10235e";c.fillRect(ox+x*z,oy+y*z,z,z);c.strokeStyle="#3569ec";c.lineWidth=1.2;c.strokeRect(ox+x*z+1,oy+y*z+1,z-2,z-2);}else if(s.pellet[q]){c.fillStyle="#f4dfae";c.shadowColor="#f4dfae";c.shadowBlur=5;c.beginPath();c.arc(ox+(x+.5)*z,oy+(y+.5)*z,Math.max(1.3,z*.075),0,Math.PI*2);c.fill();c.shadowBlur=0;}}
    dirs.forEach(([vx,vy],r)=>{const v=obs[16+r*3],steps=v?Math.max(1,1/v-1):20;c.strokeStyle="#b99cff55";c.beginPath();c.moveTo(ox+(px+.5)*z,oy+(py+.5)*z);c.lineTo(ox+(px+.5+vx*steps)*z,oy+(py+.5+vy*steps)*z);c.stroke();[[1,"#f7bd58"],[2,"#ff7184"]].forEach(([q,col])=>{const d=obs[16+r*3+q];if(d){const k=1/d-1;c.fillStyle=col;c.beginPath();c.arc(ox+(px+.5+vx*k)*z,oy+(py+.5+vy*k)*z,4,0,Math.PI*2);c.fill();}});});
    const vec=(dx,dy,col)=>{c.strokeStyle=col;c.lineWidth=2.2;c.setLineDash([5,4]);c.beginPath();c.moveTo(ox+(px+.5)*z,oy+(py+.5)*z);c.lineTo(ox+(px+.5+dx)*z,oy+(py+.5+dy)*z);c.stroke();c.setLineDash([]);};vec(obs[4]*19,obs[5]*13,"#ffb72cbb");vec(obs[7]*19,obs[8]*13,"#ef4d70aa");["#ff5267","#46dff1","#ff8be0"].forEach((col,i)=>{const q=s.ghosts[i],gx=ox+(q%s.w+.5)*z,gy=oy+(Math.floor(q/s.w)+.5)*z;c.fillStyle=col;c.shadowColor=col;c.shadowBlur=10;c.beginPath();c.arc(gx,gy-z*.06,z*.32,Math.PI,0);c.lineTo(gx+z*.32,gy+z*.28);c.lineTo(gx+z*.16,gy+z*.18);c.lineTo(gx,gy+z*.3);c.lineTo(gx-z*.16,gy+z*.18);c.lineTo(gx-z*.32,gy+z*.28);c.closePath();c.fill();c.shadowBlur=0;c.fillStyle="#fff";c.beginPath();c.arc(gx-z*.11,gy-z*.05,z*.09,0,Math.PI*2);c.arc(gx+z*.11,gy-z*.05,z*.09,0,Math.PI*2);c.fill();c.fillStyle="#102033";c.beginPath();c.arc(gx-z*.09,gy-z*.04,z*.04,0,Math.PI*2);c.arc(gx+z*.13,gy-z*.04,z*.04,0,Math.PI*2);c.fill();});const cx=ox+(px+.5)*z,cy=oy+(py+.5)*z,ang=[-Math.PI/2,0,Math.PI/2,Math.PI][s.dir],mouth=.28*Math.PI;c.fillStyle="#ffd534";c.shadowColor="#ffd534";c.shadowBlur=12;c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,z*.37,ang+mouth,ang-mouth+Math.PI*2);c.closePath();c.fill();c.shadowBlur=0;}
  function drawNetwork(){
    const {c,w,h}=fit($("network"));c.clearRect(0,0,w,h);if(!net)return;const pos=new Map(),max=layout.max;
    for(const [d,arr] of layout.by){const x=d===0?Math.min(155,w*.24):d===max?w-105:155+(w-270)*d/max;arr.sort((a,b)=>net.nodes[a].id-net.nodes[b].id).forEach((s,i)=>pos.set(s,[x,22+(i+1)*(h-62)/(arr.length+1)]));if(d>0){c.fillStyle="#657d8e";c.font="9px ui-monospace,monospace";c.fillText(d===max?"OUTPUT":`LAYER ${d}`,x-24,14);}}
    for(const e of net.edges){const a=pos.get(e.src),b=pos.get(e.dst);if(!a||!b)continue;const active=Math.abs(net.act[e.src]||0),alpha=.04+.5*Math.min(1,Math.abs(e.w)/4)*(.25+.75*active);c.strokeStyle=e.w>=0?`rgba(97,212,209,${alpha})`:`rgba(255,113,132,${alpha})`;c.lineWidth=.5+Math.min(2.5,Math.abs(e.w)/3);c.beginPath();c.moveTo(...a);c.bezierCurveTo((a[0]+b[0])/2,a[1],(a[0]+b[0])/2,b[1],...b);c.stroke();}
    net.nodes.forEach((n,i)=>{const p=pos.get(i),a=net.act[i]||0,isOut=n.type===3,win=isOut&&net.outputSlots[result.action]===i,r=n.type===0?5.5:n.type===1?6:isOut?10:7;c.fillStyle=n.type===0?(featureColors[n.id]||"#61d4d1"):n.type===1?"#ffb72c":`rgb(${Math.round(35+205*a)},${Math.round(55+160*a)},${Math.round(78+110*a)})`;c.strokeStyle=win?"#46e390":isOut?"#c8d6df":a>.65?"#ffb72c":"#597083";c.lineWidth=win?3:1.2;c.shadowColor=win?"#46e390":a>.65?"#ffb72c":"transparent";c.shadowBlur=win?16:a>.65?9:0;c.beginPath();c.arc(p[0],p[1],r,0,Math.PI*2);c.fill();c.stroke();c.shadowBlur=0;if(n.type===0){c.fillStyle="#aebfcb";c.font="9px ui-monospace,monospace";c.textAlign="right";c.fillText(featureNames[n.id]||`input ${n.id}`,p[0]-10,p[1]+3);}if(isOut){c.fillStyle=win?"#65efa3":"#cbd5e4";c.font=`${win?"800 ":""}12px ui-monospace,monospace`;c.textAlign="left";const oi=net.outputSlots.indexOf(i);c.fillText(`${label.actions[oi]} ${result.out[oi].toFixed(3)}`,p[0]+16,p[1]+4);}});
    const legend=[["#38d5df","positive weight"],["#ef4d70","negative weight"],["#ffb72c","neuron firing"]];c.font="9px ui-monospace,monospace";c.textAlign="left";legend.forEach((q,i)=>{const x=18+i*128;c.fillStyle=q[0];c.shadowColor=q[0];c.shadowBlur=7;c.beginPath();c.arc(x,h-14,4,0,Math.PI*2);c.fill();c.shadowBlur=0;c.fillStyle="#8fa5b4";c.fillText(q[1],x+9,h-11);});
  }
  function fmt(x){if(!Number.isFinite(x))return "—";if(Math.abs(x)>=1000)return x.toFixed(0);if(Math.abs(x)>=10)return x.toFixed(1);return x.toFixed(3);}
  function setGeneration(i){gi=Math.max(0,Math.min(G.length-1,i));if(!maps[gi].has(selectedId))selectedId=null;renderGeneration();}
  $("gen").oninput=e=>setGeneration(Number(e.target.value));$("muller").onclick=e=>{const r=e.currentTarget.getBoundingClientRect();setGeneration(Math.round((e.clientX-r.left)/r.width*(G.length-1)));};$("speciesSort").onchange=renderSpecies;$("restart").onclick=restart;$("step").onclick=oneStep;$("course").onchange=restart;$("play").onclick=()=>{playing=!playing;$("play").textContent=playing?"Pause":"Play";last=performance.now();};
  document.querySelectorAll(".speed-btn").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".speed-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");currentFps=60*Number(btn.dataset.speed);});
  document.querySelectorAll(".fps-btn").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".fps-btn").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".speed-btn").forEach(b=>b.classList.remove("active"));btn.classList.add("active");currentFps=Number(btn.dataset.fps);});
  const scrubEl=$("frameScrub");if(scrubEl)scrubEl.oninput=e=>scrubToFrame(Number(e.target.value));
  function loop(now){if(playing&&game?.alive){acc+=(now-last)/1000*currentFps;last=now;let n=0;while(acc>=1&&n++<120){oneStep();acc--;}}else last=now;const scrubEl=$("frameScrub");if(scrubEl)scrubEl.value=tick;requestAnimationFrame(loop);}window.addEventListener("resize",()=>{drawMuller();drawCurves();renderReplay();});
  renderGeneration();requestAnimationFrame(loop);
})().catch(error=>{console.error(error);document.querySelector("main").innerHTML=`<section class="panel empty"><h1>Could not load this history</h1><p>${String(error.message||error)}</p><p>Serve <code>docs/viz</code> over HTTP so the compressed history can be loaded.</p></section>`;});
