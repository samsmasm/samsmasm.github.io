// Checks that every unit (and the toolkit/concepts) can make a puzzle on its own, and the whole HL set together.
// Run: node tests/test_units.js   (build first)
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const logic=html.split('/*LOGIC_START*/')[1].split('/*LOGIC_END*/')[0];
eval(logic+';globalThis.api={buildPuzzle,prepare};');
let bad=0;
for(const f of ['bm_categories.json','econ_categories.json']){
  const bank=JSON.parse(fs.readFileSync(path.join(root,'data',f),'utf8'));api.prepare(bank);
  const groups=[...new Set(bank.meta.topics.map(t=>t.group))];
  const sets={all:bank.meta.topics.map(t=>t.code),hlOnly:bank.meta.topics.filter(t=>t.defaultOn===false).map(t=>t.code)};
  for(const g of groups){sets[g]=bank.meta.topics.filter(t=>t.group===g).map(t=>t.code);const h=bank.meta.topics.filter(t=>t.group===g&&t.defaultOn===false).map(t=>t.code);if(h.length)sets[g+" HL only"]=h;}
  for(const [name,codes] of Object.entries(sets)){
    const on=new Set(codes);let ok=0;
    for(let i=0;i<200;i++){const p=api.buildPuzzle(bank,on,{n:4,per:4,tiers:[1,2,3,4]});if(p&&p.groups.length===4)ok++;}
    // Known thin sets: too few categories alone, so the page shows "not enough categories". Econ Units 3 and 4 have few HL-only categories.
    const thin=name==="Concepts"||(f.startsWith("econ")&&["Toolkit","Unit 3 HL only","Unit 4 HL only"].includes(name));
    console.log(f,name,ok+'/200'+(thin&&ok<200?' (known thin)':''));if(ok<200&&!thin)bad++;
  }
  // The SL setting ticks every topic except HL ones. It must always make a puzzle and never show an HL group.
  const sl=new Set(bank.meta.topics.filter(t=>!/HL$/.test(t.code)).map(t=>t.code));
  let made=0,leaks=0;
  for(let i=0;i<2000;i++){const p=api.buildPuzzle(bank,sl,{n:4,per:4,tiers:[1,2,3,4]});if(p){made++;leaks+=p.groups.filter(g=>g.level!=='SL').length;}}
  console.log(f,'SL setting',made+'/2000 made,',leaks,'HL groups');if(made<2000||leaks)bad++;
  // A class on one unit at SL: report it, because a thin unit shows the "not enough categories" message.
  for(const g of groups.filter(x=>/^Unit/.test(x))){
    const on=new Set(bank.meta.topics.filter(t=>t.group===g&&!/HL$/.test(t.code)).map(t=>t.code));let ok=0;
    for(let i=0;i<200;i++){if(api.buildPuzzle(bank,on,{n:4,per:4,tiers:[1,2,3,4]}))ok++;}
    console.log(f,g,'SL only',ok+'/200');if(ok<200)bad++;
  }
}
process.exit(bad?1:0);
