(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NeatVizEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const f32 = Math.fround;
  const MASK64 = (1n << 64n) - 1n;
  const MULT = 0x2545F4914F6CDD1Dn;
  const FALLBACK = 0x9E3779B97F4A7C15n;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

  class XorShift64Star {
    constructor(seed) { this.state = BigInt(seed) & MASK64; if (!this.state) this.state = 1n; }
    next() {
      let x = this.state;
      x ^= x >> 12n;
      x = (x ^ ((x << 25n) & MASK64)) & MASK64;
      x ^= x >> 27n;
      this.state = x & MASK64;
      return (this.state * MULT) & MASK64;
    }
    range(n) { return n ? Number((this.next() >> 33n) % BigInt(n)) : 0; }
    f24() { return f32(Number(this.next() >> 40n) / 16777216); }
    f53() { return Number(this.next() >> 11n) / 9007199254740992; }
  }

  class Network {
    constructor(genome, meta) {
      this.nodes = genome.n.map(n => ({ id:n[0], type:n[1], bias:f32(n[2]), fn:n[3] || 0 }));
      this.meta = meta;
      this.slot = new Map(this.nodes.map((n, i) => [n.id, i]));
      this.incoming = this.nodes.map(() => []);
      this.edges = [];
      for (const c of genome.c) if (c[3]) {
        const src = this.slot.get(c[0]), dst = this.slot.get(c[1]);
        if (src == null || dst == null) continue;
        const edge = { src, dst, w:f32(c[2]) };
        this.incoming[dst].push(edge); this.edges.push(edge);
      }
      this.order = this.topologicalOrder();
      this.act = new Float32Array(this.nodes.length);
      this.prev = new Float32Array(this.nodes.length);
      this.sensorSlots = Array.from({length:meta.obs_dim}, (_, i) => this.slot.get(i));
      this.biasSlot = this.slot.get(meta.obs_dim);
      this.outputSlots = Array.from({length:meta.n_actions}, (_, i) => this.slot.get(meta.obs_dim + 1 + i));
      this.slope = meta.sigmoid_slope || 4.9;
      this.recurrent = meta.network_type === 1;
      this.steps = Math.max(1, meta.activation_steps || 1);
    }
    topologicalOrder() {
      const indeg = this.incoming.map(es => es.length), placed = new Uint8Array(this.nodes.length), out = [];
      while (out.length < this.nodes.length) {
        let best = -1;
        for (let i=0;i<this.nodes.length;i++) if (!placed[i] && indeg[i] === 0 &&
          (best < 0 || this.nodes[i].id < this.nodes[best].id)) best = i;
        if (best < 0) break;
        placed[best] = 1; out.push(best);
        for (const e of this.edges) if (e.src === best && !placed[e.dst] && indeg[e.dst] > 0) indeg[e.dst]--;
      }
      for (let i=0;i<this.nodes.length;i++) if (!placed[i]) out.push(i);
      return out;
    }
    reset() { this.act.fill(0); this.prev.fill(0); }
    sigmoid(x) { return f32(1 / (1 + Math.exp(-this.slope * f32(x)))); }
    activate(obs) {
      if (!this.recurrent) {
        for (let i=0;i<this.sensorSlots.length;i++) this.act[this.sensorSlots[i]] = f32(obs[i]);
        this.act[this.biasSlot] = 1;
        for (const s of this.order) {
          const n = this.nodes[s]; if (n.type === 0 || n.type === 1) continue;
          let sum = n.bias;
          for (const e of this.incoming[s]) sum += e.w * this.act[e.src];
          this.act[s] = this.sigmoid(sum);
        }
      } else {
        for (let pass=0;pass<this.steps;pass++) {
          for (let i=0;i<this.sensorSlots.length;i++) this.prev[this.sensorSlots[i]] = f32(obs[i]);
          this.prev[this.biasSlot] = 1;
          for (let s=0;s<this.nodes.length;s++) {
            const n=this.nodes[s];
            if (n.type===0 || n.type===1) { this.act[s]=this.prev[s]; continue; }
            let sum=n.bias; for (const e of this.incoming[s]) sum += e.w * this.prev[e.src];
            this.act[s]=this.sigmoid(sum);
          }
          this.prev.set(this.act);
        }
      }
      const out = this.outputSlots.map(s => this.act[s]);
      let action=0; for(let i=1;i<out.length;i++) if(out[i]>out[action]) action=i;
      return { out, action, act:this.act };
    }
  }

  class Flappy {
    constructor(seed) {
      this.rng = new XorShift64Star(BigInt(seed) || FALLBACK); this.tick=0; this.score=0; this.alive=true;
      this.y=f32(256); this.vel=0; this.pipes=[];
      let x=f32(328); for(let i=0;i<8;i++){ this.pipes.push({x,gap:this.gap()}); x=f32(x+220); }
    }
    gap(){ const lo=f32(105), hi=f32(407); return f32(lo + f32(this.rng.f24() * f32(hi-lo))); }
    nextPipe(){ let best=null, bd=1e30; for(const p of this.pipes){const d=f32(p.x+52-86.4); if(d>=-12&&d<bd){bd=d;best=p;}} return best||this.pipes[0]; }
    observe(){ const p=this.nextPipe(), top=f32(p.gap-70), bot=f32(p.gap+70); return [f32(this.y/512),f32(this.vel/600),f32((p.x-86.4)/288),f32(top/512),f32(bot/512)]; }
    step(action){
      for(const p of this.pipes) p.x=f32(p.x-2);
      for(const p of this.pipes) if(f32(p.x+52)<-24){ let mx=this.pipes[0].x; for(const q of this.pipes)if(q.x>mx)mx=q.x; p.x=f32(mx+220); p.gap=this.gap(); }
      if(action) this.vel=f32(-320);
      this.vel=f32(this.vel+f32(1000*f32(1/60))); this.y=f32(this.y+f32(this.vel*f32(1/60)));
      let died=f32(this.y-12)<0||f32(this.y+12)>512;
      for(const p of this.pipes) if(!died){ const overlap=f32(86.4+12)>p.x&&f32(86.4-12)<f32(p.x+52); if(overlap&&(f32(this.y-12)<f32(p.gap-70)||f32(this.y+12)>f32(p.gap+70))) died=true; }
      if(died)this.alive=false; else {const p=this.nextPipe(), edge=f32(p.x+52), prev=f32(edge+2); if(prev>=86.4&&edge<86.4)this.score++;}
      this.tick++; return this.alive;
    }
    render(){ return {y:this.y,vel:this.vel,pipes:this.pipes,world_w:288,world_h:512,bird_x:86.4,bird_r:12,pipe_w:52,gap:140}; }
  }

  class Snake {
    constructor(seed){
      this.w=12;this.h=12;this.cells=144;this.rng=new XorShift64Star(seed||1);this.alive=true;this.score=0;this.hunger=0;
      const start=this.rng.range(144);this.dir=this.rng.range(4);let k=this.rng.range(143),food=-1;
      for(let c=0,seen=0;c<144;c++){if(c===start)continue;if(seen++===k){food=c;break;}}
      this.body=[start];this.occ=new Uint8Array(144);this.occ[start]=1;this.food=food;this.lastDist=this.dist(start,food);
    }
    dist(a,b){return Math.abs(a%12-b%12)+Math.abs(Math.floor(a/12)-Math.floor(b/12));}
    deadly(x,y){return x<0||x>=12||y<0||y>=12||!!this.occ[y*12+x];}
    observe(){
      const head=this.body[0],hx=head%12,hy=Math.floor(head/12),d=this.dir,fx=DX[d],fy=DY[d],rx=-fy,ry=fx,lx=fy,ly=-fx;
      const gx=this.food>=0?this.food%12-hx:0,gy=this.food>=0?Math.floor(this.food/12)-hy:0;
      const out=[this.deadly(hx+fx,hy+fy)?1:0,this.deadly(hx+lx,hy+ly)?1:0,this.deadly(hx+rx,hy+ry)?1:0,
        f32((gx*fx+gy*fy)/12),f32((gx*rx+gy*ry)/12),f32(this.lastDist/24),f32(this.body.length/144)];
      const dirs=[[fx,fy],[fx+rx,fy+ry],[rx,ry],[rx-fx,ry-fy],[-fx,-fy],[-fx-rx,-fy-ry],[-rx,-ry],[fx-rx,fy-ry]];
      for(const [vx,vy] of dirs){let x=hx,y=hy,n=0,wall=0,body=0,food=0,bh=false,fh=false;for(;;){x+=vx;y+=vy;n++;if(x<0||x>=12||y<0||y>=12){wall=f32(1/(1+n));break;}const c=y*12+x;if(!bh&&this.occ[c]){bh=true;body=f32(1/(1+n));}if(!fh&&c===this.food){fh=true;food=f32(1/(1+n));}}out.push(wall,body,food);}
      return out;
    }
    placeFood(){const empty=144-this.body.length;if(empty<=0)return -1;let k=this.rng.range(empty);for(let c=0;c<144;c++)if(!this.occ[c]&&k--===0)return c;return -1;}
    step(action){
      if(action===1)this.dir=(this.dir+3)&3;else if(action===2)this.dir=(this.dir+1)&3;
      const head=this.body[0],x=head%12,y=Math.floor(head/12),nx=x+DX[this.dir],ny=y+DY[this.dir];
      if(nx<0||nx>=12||ny<0||ny>=12){this.alive=false;return false;}const cell=ny*12+nx,grow=cell===this.food,tail=this.body[this.body.length-1];
      if(this.occ[cell]&&!(cell===tail&&!grow)){this.alive=false;return false;}
      if(!grow){this.occ[tail]=0;this.body.pop();}this.body.unshift(cell);this.occ[cell]=1;
      if(grow){this.score++;this.hunger=0;if(this.body.length>=144){this.alive=false;return false;}this.food=this.placeFood();this.lastDist=this.food>=0?this.dist(cell,this.food):0;}
      else{this.hunger++;this.lastDist=this.food>=0?this.dist(cell,this.food):0;if(this.hunger>=144){this.alive=false;return false;}}
      return true;
    }
    render(){return {w:12,h:12,body:this.body,food:this.food,dir:this.dir};}
  }

  function slideLine(v){const tmp=v.filter(Boolean),out=[],sc={v:0};for(let i=0;i<tmp.length;i++){if(i+1<tmp.length&&tmp[i]===tmp[i+1]){const e=tmp[i]+1;out.push(e);sc.v+=1<<e;i++;}else out.push(tmp[i]);}while(out.length<4)out.push(0);return {line:out,score:sc.v,changed:out.some((x,i)=>x!==v[i])};}
  function move2048(board,dir){const b=board.slice();let score=0,changed=false;for(let k=0;k<4;k++){const idx=[];for(let i=0;i<4;i++)idx.push(dir===3?k*4+i:dir===1?k*4+3-i:dir===0?i*4+k:(3-i)*4+k);const r=slideLine(idx.map(j=>b[j]));score+=r.score;changed=changed||r.changed;for(let i=0;i<4;i++)b[idx[i]]=r.line[i];}return {board:b,score,changed};}
  class Game2048 {
    constructor(seed){this.rng=new XorShift64Star(seed||1);this.board=new Array(16).fill(0);this.illegal=0;this.alive=true;this.score=0;this.spawn();this.spawn();this.score=this.maxTile();}
    spawn(){const e=[];for(let i=0;i<16;i++)if(!this.board[i])e.push(i);if(!e.length)return;const c=e[this.rng.range(e.length)];this.board[c]=this.rng.f53()<.9?1:2;}
    maxTile(){const m=Math.max(...this.board);return m?1<<m:0;}
    anyMove(){for(let d=0;d<4;d++)if(move2048(this.board,d).changed)return true;return false;}
    features(){const b=this.board;let empty=0,max=0,pos=0,sum=0;for(let c=0;c<16;c++){if(!b[c])empty++;else sum+=b[c];if(b[c]>max){max=b[c];pos=c;}}let rm=0,cm=0;for(let r=0;r<4;r++){let inc=true,dec=true;for(let c=0;c<3;c++){const a=b[r*4+c],d=b[r*4+c+1];if(a<d)dec=false;if(a>d)inc=false;}if(inc||dec)rm++;}for(let c=0;c<4;c++){let inc=true,dec=true;for(let r=0;r<3;r++){const a=b[r*4+c],d=b[(r+1)*4+c];if(a<d)dec=false;if(a>d)inc=false;}if(inc||dec)cm++;}let merge=0,smooth=0,n=0;for(let r=0;r<4;r++)for(let c=0;c<4;c++){const cur=b[r*4+c];if(c<3){const x=b[r*4+c+1];if(cur&&x){smooth-=Math.abs(cur-x);n++;if(cur===x)merge++;}}if(r<3){const x=b[(r+1)*4+c];if(cur&&x){smooth-=Math.abs(cur-x);n++;if(cur===x)merge++;}}}return [f32(empty/16),f32(max/16),(pos===0||pos===3||pos===12||pos===15)?1:0,f32(rm/4),f32(cm/4),n?f32(smooth/(n*16)):0,f32(merge/24),f32(sum/256)];}
    observe(){return this.board.map(x=>f32(x/16)).concat(this.features());}
    step(action){const r=move2048(this.board,action);this.board=r.board;if(r.changed){this.illegal=0;this.spawn();this.score=Math.max(this.score,this.maxTile());if(!this.anyMove())this.alive=false;}else{this.illegal++;if(this.illegal>=6||!this.anyMove())this.alive=false;}return this.alive;}
    render(){return {n:4,board:this.board};}
  }

  class Pacman {
    constructor(seed){
      this.w=19;this.h=13;this.cells=247;this.rng=new XorShift64Star(seed||1);this.wall=new Uint8Array(247);this.frame=0;this.alive=true;this.score=0;this.genMaze();
      this.pac=this.pickCell(9,11);this.ghost=[];for(let g=0;g<3;g++){let c;do{c=this.pickCell(4,8);}while(c===this.pac||this.ghost.includes(c));this.ghost.push(c);}
      this.pacDir=0;this.gdir=[0,0,0];this.pellet=new Uint8Array(247);let n=0;for(let c=0;c<247;c++){let has=!this.wall[c]&&c!==this.pac&&!this.ghost.includes(c);this.pellet[c]=has?1:0;if(has)n++;}this.left=n;this.pellets0=n;this.hunger=0;this.lastPd=this.nearest()[0];
    }
    inb(x,y){return x>=0&&x<19&&y>=0&&y<13;}
    manh(a,b){return Math.abs(a%19-b%19)+Math.abs(Math.floor(a/19)-Math.floor(b/19));}
    genMaze(){for(let y=0;y<13;y++)for(let x=0;x<19;x++){const border=x===0||x===18||y===0||y===12,pillar=x%2===0&&y%2===0;this.wall[y*19+x]=border||pillar&&this.rng.f53()<.7?1:0;}}
    pickCell(lo,hi){for(let t=0;t<400;t++){const x=1+this.rng.range(17),y=lo+this.rng.range(hi-lo+1),c=y*19+x;if(!this.wall[c])return c;}for(let c=0;c<247;c++)if(!this.wall[c])return c;return 20;}
    nearest(){let best=1<<30,cell=-1;for(let c=0;c<247;c++)if(this.pellet[c]){const d=this.manh(this.pac,c);if(d<best){best=d;cell=c;}}return cell<0?[0,-1]:[best,cell];}
    observe(){
      const px=this.pac%19,py=Math.floor(this.pac/19),out=[];for(let d=0;d<4;d++){const x=px+DX[d],y=py+DY[d];out.push(this.inb(x,y)&&!this.wall[y*19+x]?1:0);}const [pd,pc]=this.nearest();if(pc>=0)out.push(f32((pc%19-px)/19),f32((Math.floor(pc/19)-py)/13),f32(this.manh(this.pac,pc)/32));else out.push(0,0,0);
      const gs=this.ghost.map((c,i)=>({i,c,d:this.manh(this.pac,c)})).sort((a,b)=>a.d-b.d||a.i-b.i);for(let j=0;j<2;j++){const g=gs[j];out.push(f32((g.c%19-px)/19),f32((Math.floor(g.c/19)-py)/13),f32(g.d/32));}out.push(f32(px/19),f32(py/13),this.pellets0?f32(this.left/this.pellets0):0);
      const dirs=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];for(const [vx,vy] of dirs){let x=px,y=py,k=0,w=0,p=0,g=0,ph=false,gh=false;for(;;){x+=vx;y+=vy;k++;if(!this.inb(x,y)){w=f32(1/(1+k));break;}const c=y*19+x;if(this.wall[c]){w=f32(1/(1+k));break;}if(!ph&&this.pellet[c]){ph=true;p=f32(1/(1+k));}if(!gh&&this.ghost.includes(c)){gh=true;g=f32(1/(1+k));}}out.push(w,p,g);}return out;
    }
    moveGhost(g,target,eps){const gp=this.ghost[g],gx=gp%19,gy=Math.floor(gp/19),rev=(this.gdir[g]+2)&3,c=[];for(let d=0;d<4;d++){if(d===rev)continue;const x=gx+DX[d],y=gy+DY[d];if(this.inb(x,y)&&!this.wall[y*19+x])c.push(d);}if(!c.length){const x=gx+DX[rev],y=gy+DY[rev];if(this.inb(x,y)&&!this.wall[y*19+x])c.push(rev);else return;}let pick;if(this.rng.f53()<eps)pick=c[this.rng.range(c.length)];else{pick=c[0];let best=1<<30;for(const d of c){const n=(gy+DY[d])*19+gx+DX[d],dist=this.manh(n,target);if(dist<best){best=dist;pick=d;}}}this.gdir[g]=pick;this.ghost[g]=(gy+DY[pick])*19+gx+DX[pick];}
    step(action){
      const moveGhosts=this.frame%2===0;this.frame++;const old=this.pac,px=old%19,py=Math.floor(old/19),nx=px+DX[action],ny=py+DY[action];if(this.inb(nx,ny)&&!this.wall[ny*19+nx]){this.pac=ny*19+nx;this.pacDir=action;}
      let ate=false;if(this.pellet[this.pac]){this.pellet[this.pac]=0;this.left--;this.score++;this.hunger=0;ate=true;if(this.left<=0){this.alive=false;return false;}}else this.hunger++;
      const prev=this.ghost.slice();if(moveGhosts)for(let g=0;g<3;g++){let target=this.pac;if(g===1){const tx=px+2*DX[this.pacDir],ty=py+2*DY[this.pacDir];if(this.inb(tx,ty))target=ty*19+tx;}this.moveGhost(g,target,[.05,.10,.30][g]);}
      for(let g=0;g<3;g++)if(this.ghost[g]===this.pac||this.ghost[g]===old&&prev[g]===this.pac){this.alive=false;return false;}
      if(ate)this.lastPd=this.nearest()[0];else{this.lastPd=this.nearest()[0];if(this.hunger>=80){this.alive=false;return false;}}return true;
    }
    render(){return {w:19,h:13,wall:this.wall,pellet:this.pellet,pac:this.pac,dir:this.pacDir,ghosts:this.ghost};}
  }

  function createGame(name, seed) {
    if (name === "flappy") return new Flappy(seed);
    if (name === "snake") return new Snake(seed);
    if (name === "2048") return new Game2048(seed);
    if (name === "pacman") return new Pacman(seed);
    throw new Error("Unknown game: " + name);
  }
  const labels = {
    flappy:{title:"Flappy Bird",score:"pipes",actions:["glide","flap"]},
    snake:{title:"Snake",score:"apples",actions:["straight","turn left","turn right"]},
    "2048":{title:"2048",score:"max tile",actions:["up","right","down","left"]},
    pacman:{title:"Pac-Man",score:"pellets",actions:["up","right","down","left"]}
  };
  return { XorShift64Star, Network, createGame, labels, move2048, f32 };
});
