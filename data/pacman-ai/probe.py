import sys,json,ast,runpy,pathlib
import numpy as np
from game.game_state import GameState
from ai.environments.sumtree import SumTree
base=pathlib.Path.cwd(); result={'python':sys.version,'numpy':np.__version__,'checks':[],'observations':{}}
def check(name,fn):
 try:
  observed,passed=fn();result['checks'].append({'name':name,'passed':bool(passed),'observed':observed})
 except Exception as e:result['checks'].append({'name':name,'passed':False,'exception':type(e).__name__+': '+str(e)})
def state():return GameState(str(base/'mazes/1.txt'),3,0)
def reset():
 s=state();before=[len(s.pellets),len(s.ghosts)];s.pacman.score=5;s.remove_pellet(s.pellets[0]);s.reset();after=[len(s.pellets),len(s.ghosts)]
 return {'before':before,'after':after,'score':s.pacman.score,'lives':s.pacman.lives},before==after and s.pacman.score==0 and s.pacman.lives==3
def encoding():
 s=state();shapes=[list(s.get_encoding().shape),list(s.get_encoding_ql().shape)];return shapes,shapes==[[s.board_height*s.board_width],[s.board_height,s.board_width,1]]
def pellet():
 s=state();p=s.pellets[0];before=float(s.get_encoding_ql()[p.y,p.x,0]);s.remove_pellet(p);after=float(s.get_encoding_ql()[p.y,p.x,0]);return {'before':before,'after':after},after!=1

def terminal():
 s=state();initial=s.is_game_over();s.pacman.lives=0;loss=s.is_game_over();s=state();s.pellets.clear();win=s.is_game_over();return {'initial':initial,'loss':loss,'win':win},not initial and loss and win

def occupancy():
 t=SumTree(3);before=len(t);t.add(1.,'first');t.add(2.,'second');return {'emptyLength':before,'twoEntryLength':len(t),'total':float(t.total())},before==0 and len(t)==2 and t.total()==3

def overwrite():
 t=SumTree(2);t.add(1.,'first');t.add(1.,'second');t.add(1.,'third');return {'length':len(t),'data':t.data.tolist(),'total':float(t.total())},len(t)==2 and t.data.tolist()==['third','second'] and t.total()==2

def empty():
 t=SumTree(2)
 try:
  idx,priority,data=t.get(.5);return {'returned':[int(idx),float(priority),data]},False
 except ValueError as e:return {'rejected':str(e)},True
for name,fn in [('reset_replaces_episode',reset),('encoding_dimensions',encoding),('removed_pellet_encoding',pellet),('terminal_loss_and_win',terminal),('sumtree_occupancy',occupancy),('sumtree_overwrite',overwrite),('sumtree_empty_sampling',empty)]:check(name,fn)
for maze in ['1','2','3']:
 s=GameState(str(base/'mazes'/f'{maze}.txt'),3,0);result['observations']['maze'+maze]={'height':s.board_height,'width':s.board_width,'pellets':len(s.pellets),'ghosts':len(s.ghosts)}
s=GameState(str(base/'tiny.txt'),3,0);tiny={'initialCounts':[len(s.pellets),len(s.ghosts)],'resetCounts':[]}
for i in range(2):
 try:s.reset();error=None
 except Exception as e:error=type(e).__name__+': '+str(e)
 tiny['resetCounts'].append({'counts':[len(s.pellets),len(s.ghosts)],'error':error})
s=GameState(str(base/'tiny.txt'),3,0);tiny['qlBefore']=float(s.get_encoding_ql()[1,2,0]);s.remove_pellet(s.pellets[0]);tiny['qlAfter']=float(s.get_encoding_ql()[1,2,0])
try:tiny['flatShape']=list(s.get_encoding().shape)
except Exception as e:tiny['flatError']=type(e).__name__+': '+str(e)
result['tinyFixture']=tiny
# Source AST only: no execution/import of either training CLI.
tree=ast.parse((base/'ai/deepQL.py').read_text(encoding='utf8'))
result['cliStatic']={'topLevelLoops':sum(isinstance(n,(ast.For,ast.While)) for n in tree.body),'mainGuard':any(isinstance(n,ast.If) and ast.unparse(n.test)=="__name__ == '__main__'" for n in tree.body),'topLevelImports':[ast.unparse(n) for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom))],'functions':[n.name for n in tree.body if isinstance(n,ast.FunctionDef)]}
if (base/'tests/test_game_state.py').exists():
 ns=runpy.run_path(str(base/'tests/test_game_state.py'));passed=[]
 for name,fn in ns.items():
  if name.startswith('test_'):fn();passed.append(name)
 result['existingGameStateTests']={'passed':len(passed),'total':4,'names':passed}
print(json.dumps(result,indent=2))
