const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const KEYS = ['ecmwf_ifs025','gfs_seamless','icon_seamless','gem_seamless','jma_seamless','meteofrance_seamless','ukmo_seamless','cma_grapes_global'];
function today() { const d = new Date(); return d.toISOString().slice(0,10); }
function times() { const out=[]; const base=new Date(); base.setUTCHours(0,0,0,0); for(let i=0;i<72;i++){const t=new Date(base.getTime()+i*3600000); out.push(t.toISOString().slice(0,13)+':00');} return out; }
function leagueResp(url){ const n=new URL(url).searchParams.get('latitude').split(',').length; const out=[]; const MK=['ecmwf_ifs025','gfs_seamless','icon_seamless','gem_seamless'];
  for(let c=0;c<n;c++){ const hourly={time:times()}; MK.forEach((k,mi)=>{ const T=[],RH=[],AT=[],P=[],SW=[],UV=[]; for(let i=0;i<72;i++){const h=i%24; const di=Math.sin(((h-9)/24)*2*Math.PI); const t=28+c*0.2+5*di+mi*0.4; T.push(+t.toFixed(1)); RH.push(Math.round(70-12*di)); AT.push(+(t+3).toFixed(1)); P.push(1008); SW.push(h>=6&&h<=18?Math.round(900*Math.sin(((h-6)/12)*Math.PI)):0); UV.push(h>=6&&h<=18?+(10*Math.sin(((h-6)/12)*Math.PI)).toFixed(1):0);} hourly['temperature_2m_'+k]=T; hourly['relative_humidity_2m_'+k]=RH; hourly['apparent_temperature_'+k]=AT; hourly['surface_pressure_'+k]=P; hourly['shortwave_radiation_'+k]=SW; hourly['uv_index_'+k]=UV;}); out.push({hourly}); } return out; }
function fcResp(){ const hourly={time:times()};
  KEYS.forEach((k,mi)=>{ const o={t:[],rh:[],dp:[],at:[],pr:[],cl:[],ws:[],wg:[],sw:[],uv:[],cape:[]};
    for(let i=0;i<72;i++){const h=i%24; const di=Math.sin(((h-9)/24)*2*Math.PI); const t=28+5*di+mi*0.3;
      o.t.push(+t.toFixed(1)); o.rh.push(Math.round(70-12*di)); o.dp.push(23); o.at.push(+(t+4).toFixed(1));
      o.pr.push(h>=14&&h<=16&&mi%2===0?+(2+mi).toFixed(1):0); o.cl.push(50); o.ws.push(10); o.wg.push(25+mi);
      o.sw.push(h>=6&&h<=18?Math.round(900*Math.sin(((h-6)/12)*Math.PI)):0); o.uv.push(mi>=5?null:(h>=6&&h<=18?+(10*Math.sin(((h-6)/12)*Math.PI)).toFixed(1):0)); o.cape.push(mi===7?null:1200);}
    hourly['temperature_2m_'+k]=o.t; hourly['relative_humidity_2m_'+k]=o.rh; hourly['dew_point_2m_'+k]=o.dp; hourly['apparent_temperature_'+k]=o.at;
    hourly['precipitation_'+k]=o.pr; hourly['cloud_cover_'+k]=o.cl; hourly['wind_speed_10m_'+k]=o.ws; hourly['wind_gusts_10m_'+k]=o.wg;
    hourly['shortwave_radiation_'+k]=o.sw; hourly['uv_index_'+k]=o.uv; hourly['cape_'+k]=o.cape; });
  const t0=today();
  return { utc_offset_seconds: 25200, hourly, daily: { time:[t0], sunrise:[t0+'T05:45',t0+'T05:45',t0+'T05:46'], sunset:[t0+'T17:30',t0+'T17:29',t0+'T17:29'] } }; }
function aqResp(){ const pm=[],aq=[]; for(let i=0;i<72;i++){pm.push(20+i%10);aq.push(70+i%20);} return { hourly:{time:times(),pm2_5:pm,us_aqi:aq} }; }

async function run(mode){
  const errs=[];
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/',beforeParse(win){
    if(mode==='live') win.fetch=(url)=>{ url=String(url); const body = url.includes('air-quality-api') ? aqResp() : (new URL(url).searchParams.get('latitude').includes(',') ? leagueResp(url) : fcResp()); return Promise.resolve({ok:true,json:()=>Promise.resolve(body)}); };
    if(mode==='aqfail') win.fetch=(url)=>{ url=String(url); if(url.includes('air-quality-api')) return Promise.reject(new Error('x')); const multi=new URL(url).searchParams.get('latitude').includes(','); return Promise.resolve({ok:true,json:()=>Promise.resolve(multi?leagueResp(url):fcResp())}); };
    win.addEventListener('error',e=>{errs.push(e.message);});
  }});
  const w=dom.window,d=w.document; await new Promise(r=>setTimeout(r,400));
  const q=s=>d.querySelector(s), qa=s=>Array.from(d.querySelectorAll(s));
  const res={mode,errs};
  const bad = () => /NaN|undefined|Infinity|null/.test(q('#fcBox').innerHTML.replace(/aria-label="[^"]*"/g,''));
  res.chip = q('#fcBox .chip-status').textContent;
  res.title = q('#fcBox h3').textContent;
  for (let day=0; day<3; day++){
    qa('#fcBox [data-fcday]')[day].click();
    const g={};
    g.pressed = qa('#fcBox [data-fcday]').map(b=>b.getAttribute('aria-pressed')).join(',');
    g.mainDay = qa('#days button').map(b=>b.getAttribute('aria-pressed')).join(',');
    g.res = q('#fcBox .fcres').textContent.slice(0,60);
    g.lead = q('#fcBox .fclead').textContent;
    g.facts = qa('#fcBox .facts > div').map(x=>x.textContent.replace(/\s+/g,' ')).join(' | ');
    g.notes = qa('#fcBox .fcnote').map(x=>x.textContent).join(' // ');
    const svgs=qa('#fcBox svg');
    g.svgs=svgs.length;
    g.hitCols = qa('#fcBox svg')[0].querySelectorAll('.hit').length;
    g.rainSegs = qa('#fcBox svg')[0].querySelectorAll('.seg1').length;
    g.blocks4 = qa('#fcBox .blocks4 > div').map(x=>x.textContent.replace(/\s+/g,' ')).join(' | ');
    g.stripRows = qa('#fcBox svg:last-of-type').length;
    g.bad = bad();
    res['day'+day]=g;
  }
  // chips
  qa('#fcBox [data-fcday]')[1].click();
  res.chips = qa('#fcBox .mchip').length;
  q('#fcBox .mchip').click();
  res.focusPressed = q('#fcBox .mchip').getAttribute('aria-pressed') + ' dimmed=' + qa('#fcBox svg')[0].querySelectorAll('[opacity="0.15"]').length;
  q('#fcBox .mchip').click();
  q('#fcModels').click();
  res.modelRows = qa('#fcBox svg').length + ' svgs; ' + qa('#fcBox svg').map(s=>s.querySelectorAll('circle.dot').length).join(',');
  res.bad2 = bad();
  q('#fcModels').click();
  // tap
  q('#fcBox svg .hit').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  res.tip = q('#fcBox .fctip').textContent;
  // temperature svg labels
  const tsvg=qa('#fcBox svg')[2]; res.tempLabels = Array.from(tsvg.querySelectorAll('text.lab')).map(t=>t.textContent).join(' | ');
  res.strips = Array.from(qa('#fcBox svg').pop().querySelectorAll('text.lab, text.val')).map(t=>t.textContent).join(' / ');
  // switch cities, all 150, three days
  const ids=qa('#lrows tr[data-id]').map(tr=>tr.getAttribute('data-id')); let badCity=[];
  for(const id of ids){ q('#lrows tr[data-id="'+id+'"]').click(); for(let day=0;day<3;day++){ qa('#fcBox [data-fcday]')[day].click(); if(bad()) badCity.push(id+':'+day); } }
  res.cities=ids.length; res.badCity=badCity.slice(0,5); res.errs2=errs.slice(0,3);
  // example rain variety across cities: count wet vs dry headlines on day1
  return res;
}
(async()=>{ for(const m of ['example','live','aqfail']) console.log(JSON.stringify(await run(m),null,1)); })();
