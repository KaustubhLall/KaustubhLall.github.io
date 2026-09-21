import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const exact = (a, b, name) => check(JSON.stringify(a) === JSON.stringify(b), `${name}: mismatch`);
const finite = (v, name) => check(typeof v === 'number' && Number.isFinite(v), `${name}: finite number required`);
const integer = (v, name) => check(Number.isSafeInteger(v), `${name}: safe integer required`);
const array = (v, n, name) => check(Array.isArray(v) && v.length === n, `${name}: expected ${n} entries`);
const keys = (v, names, name) => { check(v && typeof v === 'object' && !Array.isArray(v), `${name}: object required`); exact(Object.keys(v).sort(), [...names].sort(), `${name} fields`); };
const hash = text => createHash('sha256').update(text).digest('hex');

// Reject unsafe JSON numbers, including uint64 seeds, rather than silently replaying a rounded seed.
export function parseRecord(text) {
  return JSON.parse(text, (key, value) => {
    if (typeof value === 'number') {
      finite(value, key);
      check(!Number.isInteger(value) || Number.isSafeInteger(value), `${key}: unsafe JSON integer; encode seed as a decimal string`);
    }
    return value;
  });
}

export function parseGenome(text) {
  const lines = text.trim().split(/\r?\n/); let p = 0;
  const fields = (label, count) => { const a = (lines[p++] || '').trim().split(/\s+/); check(a[0] === label && a.length === count + 1, `genome ${label}: invalid header`); return a.slice(1).map(Number); };
  exact(fields('NEAT_GENOME', 1), [1], 'genome version');
  const [obs_dim] = fields('obs_dim', 1), [input_count] = fields('input_count', 1), [output_count] = fields('output_count', 1);
  check(/^generation \d+ fitness \S+ score \S+$/.test(lines[p++] || ''), 'genome generation header');
  const readRows = (label, width) => { const [n] = fields(label, 1); integer(n, label); check(n > 0 && n <= lines.length, `${label}: invalid count`); return Array.from({length:n}, () => { const row=(lines[p++] || '').trim().split(/\s+/).map(Number); array(row,width,label); row.forEach(v=>finite(v,label)); return row; }); };
  const n = readRows('nodes', 4), rows = readRows('conns', 5);
  check(p === lines.length, 'genome trailing content');
  return {n, c:rows.map(r=>r.slice(1)), obs_dim,input_count,output_count};
}

export function parseConfig(text) {
  const values = {};
  for (const raw of text.split(/\r?\n/)) { const line=raw.split('#')[0].trim(); if (!line) continue; const m=line.match(/^([a-z_0-9]+)\s*=\s*(.*?)\s*$/i); check(m, 'unsupported config line'); values[m[1]]=m[2]; }
  for (const k of ['game','obs_mode','network_type','activation_steps','sigmoid_slope']) check(values[k] !== undefined, `config missing ${k}`);
  check(!values.cppn_mode || values.cppn_mode === '0', 'HyperNEAT unsupported');
  check(values.network_type === 'feedforward', 'unsupported network_type (only feedforward validated)');
  const activation_steps=Number(values.activation_steps), sigmoid_slope=Math.fround(Number(values.sigmoid_slope));
  check(activation_steps === 1, 'unsupported activation_steps'); finite(sigmoid_slope,'sigmoid_slope'); check(sigmoid_slope > 0,'sigmoid_slope must be positive');
  const dimensions={};
  for(const k of ['input_count','output_count']) if(values[k]!==undefined){dimensions[k]=Number(values[k]);integer(dimensions[k],`config ${k}`);check(dimensions[k]>0,`config ${k}: positive required`);}
  return {game:values.game,obs_mode:values.obs_mode,network_type:0,activation_steps,sigmoid_slope,...dimensions};
}

export function auditReplay({record, genomeText, configText, engine}) {
  const r = typeof record === 'string' ? parseRecord(record) : record;
  keys(r,['game','score_label','seed','meta','obs_labels','action_labels','nodes','conns','act_order','frames','ticks','final_score'],'record');
  const specs={flappy:[5,2,'features'],snake:[31,3,'hybrid'],'2048':[24,4,'both'],pacman:[40,4,'hybrid']};
  check(Object.hasOwn(specs,r.game),'unsupported game');
  const [obs_dim,n_actions,mode]=specs[r.game], cfg=parseConfig(configText), g=parseGenome(genomeText);
  exact(cfg.game,r.game,'config game'); exact(cfg.obs_mode,mode,'config obs_mode');
  exact([g.obs_dim,g.input_count,g.output_count],[obs_dim,obs_dim+1,n_actions],'genome dimensions');
  if(cfg.input_count!==undefined)exact(cfg.input_count,g.input_count,'config input_count');
  if(cfg.output_count!==undefined)exact(cfg.output_count,g.output_count,'config output_count');
  const seed = typeof r.seed === 'number' ? (integer(r.seed,'seed'),String(r.seed)) : r.seed;
  check(typeof seed === 'string' && /^(0|[1-9]\d*)$/.test(seed),'seed must be unsigned decimal integer');
  check(BigInt(seed) <= (1n<<64n)-1n,'seed exceeds uint64');
  array(r.obs_labels,obs_dim,'obs_labels'); check(r.obs_labels.every(x=>typeof x==='string'),'obs_labels strings');
  exact(r.action_labels,engine.labels[r.game].actions,'action_labels'); exact(r.score_label,engine.labels[r.game].score,'score_label');
  array(r.nodes,g.n.length,'nodes'); array(r.conns,g.c.length,'conns');
  const ids=new Set();
  g.n.forEach(([id,type,bias,fn],i)=>{integer(id,'node id'); check(id>=0 && !ids.has(id),'duplicate/negative node id'); ids.add(id); check([0,1,2,3].includes(type),'node type'); check(fn===0,'unsupported activation function'); finite(Math.fround(bias),'float32 bias'); keys(r.nodes[i],['id','type'],'node'); exact(r.nodes[i],{id,type},`node ${i}`);});
  for(let id=0;id<obs_dim+1+n_actions;id++){const node=g.n.find(n=>n[0]===id); check(node && node[1]===(id<obs_dim?0:id===obs_dim?1:3),'sensor/bias/output mapping');}
  check(g.n.filter(n=>n[1]===0).length===obs_dim && g.n.filter(n=>n[1]===1).length===1 && g.n.filter(n=>n[1]===3).length===n_actions,'node type counts');
  const max={observations:0,activations:0,connectionWeights:0,flappyPositionVelocity:0,flappyPipes:0};
  const near=(a,b,tol,name,category)=>{finite(a,name);finite(b,name);const d=Math.abs(a-b);if(category)max[category]=Math.max(max[category],d);check(d<=tol,`${name}: deviation ${d} exceeds ${tol}`);};
  g.c.forEach(([src,dst,w,en],i)=>{ check(ids.has(src)&&ids.has(dst),'connection endpoint'); check(en===0||en===1,'connection enabled'); finite(Math.fround(w),'float32 weight'); keys(r.conns[i],['in','out','w','en'],'connection'); const c=r.conns[i]; exact([src,dst,en],[c.in,c.out,c.en],`connection ${i}`);near(Math.fround(w),c.w,.0000501,`connection ${i} weight`,'connectionWeights');});
  array(r.act_order,g.n.length,'act_order'); exact([...r.act_order].sort((a,b)=>a-b),[...ids].sort((a,b)=>a-b),'activation ids');
  integer(r.ticks,'ticks');check(r.ticks>0,'empty record');array(r.frames,r.ticks,'frames');integer(r.final_score,'final_score');
  const net=new engine.Network(g,{...cfg,obs_dim,n_actions}), game=engine.createGame(r.game,seed); net.reset();
  // Reject cycles and edges into sensors; browser fallback order is not a validated C contract.
  const position=new Map(net.order.map((slot,i)=>[slot,i]));
  for(const e of net.edges)check(position.get(e.src)<position.get(e.dst) && net.nodes[e.dst].type>=2,'unsupported cyclic/sensor connection');
  const initial=game.render(); const meta=r.game==='flappy'?Object.fromEntries(['world_w','world_h','bird_x','bird_r','pipe_w','gap'].map(k=>[k,initial[k]])):r.game==='2048'?{n:4}:r.game==='snake'?{w:12,h:12}:{w:19,h:13,wall:Array.from(initial.wall).join('')};
  exact(r.meta,meta,'game meta');
  for(let t=0;t<r.ticks;t++){
    const f=r.frames[t];keys(f,['t','score','action','obs','act','state'],`frame ${t}`);exact(f.t,t,`tick ${t}`);integer(f.score,'score');integer(f.action,'action');check(f.action>=0&&f.action<n_actions,'action range');
    array(f.obs,obs_dim,'observations');array(f.act,g.n.length,'activations');check(game.alive,`frame ${t} follows browser terminal state`);
    const obs=game.observe(), result=net.activate(obs);array(obs,obs_dim,'engine observations');
    obs.forEach((v,i)=>near(v,f.obs[i],.0000501,`tick ${t} obs ${i}`,'observations'));
    r.act_order.forEach((id,i)=>near(result.act[net.slot.get(id)],f.act[i],.0005001,`tick ${t} activation ${id}`,'activations'));
    exact(result.action,f.action,`tick ${t} action`);exact(game.score,f.score,`tick ${t} score`);
    const s=game.render();
    if(r.game==='flappy') {keys(f.state,['y','vel','pipes'],'flappy state');for(const k of ['y','vel'])near(s[k],f.state[k],.0501,`tick ${t} ${k}`,'flappyPositionVelocity');array(f.state.pipes,s.pipes.length,'pipes');s.pipes.forEach((p,i)=>{array(f.state.pipes[i],2,'pipe');[p.x,p.gap].forEach((v,j)=>near(v,f.state.pipes[i][j],.5001,`tick ${t} pipe ${i}/${j}`,'flappyPipes'));});}
    else {const state=r.game==='snake'?{food:s.food,dir:s.dir,body:s.body}:r.game==='2048'?{board:s.board}:{pac:s.pac,dir:s.dir,ghosts:s.ghosts,pellets:Array.from(s.pellet).join('')};keys(f.state,Object.keys(state),'state');for(const k of Object.keys(state))exact(f.state[k],state[k],`tick ${t} state ${k}`);}
    game.step(result.action);
  }
  exact(game.score,r.final_score,'post-final-step final_score');
  return {status:'PASS',game:r.game,seed,ticks:r.ticks,final_score:r.final_score,config:cfg,maxDeviations:max,genomeSha256:hash(genomeText),configSha256:hash(configText),scope:'Deterministic recorded pre-step observations, actions, scores, activations, render state and post-final-step score only',limitations:['No recorded final state or terminal flag; no native provenance or model-quality claim','Record omits node biases/functions and full precision weights; genome agreement is limited to fields present in record','Config is supplied explicitly but record has no configuration identity','Observation label text is unchecked; only string type and dimension are validated']};
}

export function auditFiles(recordPath,genomePath,configPath,enginePath) {
  const engine=createRequire(import.meta.url)(path.resolve(enginePath));
  const result=auditReplay({record:fs.readFileSync(recordPath,'utf8'),genomeText:fs.readFileSync(genomePath,'utf8'),configText:fs.readFileSync(configPath,'utf8'),engine});
  return {...result,recordSha256:hash(fs.readFileSync(recordPath)),engineSha256:hash(fs.readFileSync(enginePath))};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{check(process.argv.length===6,'usage: node scripts/audit-neat-replay-parity.mjs RECORD GENOME CONFIG ENGINE');console.log(JSON.stringify(auditFiles(...process.argv.slice(2)),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
