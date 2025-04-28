const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Controls
const numPointsInput = document.getElementById('numPoints');
const nearestInput = document.getElementById('nearestNeighbors');
const bandCutoffInputs = () => Array.from(document.querySelectorAll('.bandCutoff')).map(i => parseFloat(i.value));
const bandCountInputs  = () => Array.from(document.querySelectorAll('.bandCount')).map(i => parseInt(i.value,10));
const motionToggle = document.getElementById('motionToggle');
const staticLinesToggle = document.getElementById('staticLines');
const rainbowToggle = document.getElementById('rainbowToggle');
const fillToggle = document.getElementById('fillPolygons');
const applyBtn = document.getElementById('applyBtn');

let points = [], velocities = [];
let connections = new Map(), staticConnections = null;
let animationId = null;

window.addEventListener('resize', resizeCanvas);
document.addEventListener('DOMContentLoaded', () => { resizeCanvas(); initialize(); });
applyBtn.addEventListener('click', initialize);

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (points.length) {
        if (!staticLinesToggle.checked) computeConnections();
        if (!animationId) draw();
    }
}

function initialize() {
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    points = []; velocities = []; connections.clear(); staticConnections = null;

    const N = Math.max(1, parseInt(numPointsInput.value,10) || 100);
    const motion = motionToggle.checked;
    for (let i=0; i<N; i++) {
        points.push({ x:Math.random()*canvas.width, y:Math.random()*canvas.height });
        velocities.push({ vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2 });
    }
    computeConnections();
    if (staticLinesToggle.checked) {
        staticConnections = new Map();
        connections.forEach((s,k) => staticConnections.set(k, new Set(s)));
    }
    motion ? animate() : draw();
}

function computeConnections() {
    connections.clear();
    const N = points.length;
    bandRanges = bandCutoffInputs();
    bandCounts = bandCountInputs();
    // prepare map
    for (let i=0; i<N; i++) connections.set(i, new Set());

    // precompute all distances
    const distMat = points.map((p,i) => points.map((q,j) => ({idx:j, dist: Math.hypot(p.x-q.x, p.y-q.y)})));
    // for each point
    for (let i=0; i<N; i++) {
        // nearest neighbors
        const sorted = distMat[i].filter(o=>o.idx!==i).sort((a,b)=>a.dist-b.dist);
        for (let k=0; k< (parseInt(nearestInput.value,10)||3) && k<sorted.length; k++) addConn(i, sorted[k].idx);
        // bands
        bandRanges.unshift(0);
        for (let b=1; b<bandRanges.length; b++) {
            const minD=bandRanges[b-1], maxD=bandRanges[b];
            const candidates = sorted.filter(o=>o.dist>=minD && o.dist<maxD && !connections.get(i).has(o.idx));
            shuffle(candidates);
            for (let c=0; c<bandCounts[b-1] && c<candidates.length; c++) addConn(i, candidates[c].idx);
        }
    }
}

function addConn(a,b) {
    connections.get(a).add(b);
    connections.get(b).add(a);
}

function animate() {
    points.forEach((p,i)=>{
        p.x+=velocities[i].vx; p.y+=velocities[i].vy;
        const buf=3;
        if (p.x<buf||p.x>canvas.width-buf) velocities[i].vx*=-1;
        if (p.y<buf||p.y>canvas.height-buf) velocities[i].vy*=-1;
    });
    if (!staticLinesToggle.checked) { computeConnections(); staticConnections=null; }
    draw();
    animationId = requestAnimationFrame(animate);
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const conns = staticConnections||connections;
    // compute global min/max for gradient
    let allD=[];
    if (rainbowToggle.checked||fillToggle.checked) {
        conns.forEach((s,i)=> s.forEach(j=> { if(i<j) allD.push(Math.hypot(points[i].x-points[j].x, points[i].y-points[j].y)); }));
    }
    const minD=Math.min(...allD)||0, maxD=Math.max(...allD)||1;

    // fill polygons if wanted
    if (fillToggle.checked) fillAllPolygons(conns, minD, maxD);

    // draw lines
    ctx.lineWidth=1;
    const drawn=new Set();
    conns.forEach((s,i)=> s.forEach(j=>{
        const key = i<j?`${i}-${j}`:`${j}-${i}`;
        if (drawn.has(key)) return;
        const p1=points[i], p2=points[j];
        const d = Math.hypot(p1.x-p2.x, p1.y-p2.y);
        ctx.strokeStyle = rainbowToggle.checked
            ? `hsl(${(1 - (d-minD)/(maxD-minD)) * 270}, 100%, 50%)`
            : '#999';
        ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
        drawn.add(key);
    }));

    // draw points
    ctx.fillStyle = '#333';
    points.forEach(p=> { ctx.beginPath(); ctx.arc(p.x,p.y,3,0,2*Math.PI); ctx.fill(); });
}

// find & fill all simple cycles (up to a reasonable size)
function fillAllPolygons(conns, minD, maxD) {
    const cycles = findCycles(conns);
    for (const cycle of cycles) {
        const pts = cycle.map(i=>points[i]);
        // centroid
        const cx = pts.reduce((sum,p)=>sum+p.x,0)/pts.length;
        const cy = pts.reduce((sum,p)=>sum+p.y,0)/pts.length;
        // sort around centroid
        pts.sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx));
        // average boundary hue
        let totalHue=0;
        for (let k=0;k<pts.length;k++){
            const p1=pts[k], p2=pts[(k+1)%pts.length];
            const d= Math.hypot(p1.x-p2.x,p1.y-p2.y);
            const hue = (1 - (d-minD)/(maxD-minD)) * 270;
            totalHue += hue;
        }
        const avgHue = totalHue/pts.length;
        ctx.fillStyle = `hsla(${avgHue},100%,50%,0.3)`;
        ctx.beginPath(); pts.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); ctx.fill();
    }
}

// Basic cycle finding (limited size)
function findCycles(conns) {
    const N=points.length, maxLen=6;
    const cycles=new Set(), path=[];
    function dfs(start, current) {
        path.push(current);
        for (const nxt of conns.get(current)) {
            if (nxt===start && path.length>=3) {
                const sorted = [...path].sort((a,b)=>a-b).join('-');
                cycles.add(sorted+"|"+path.join(','));
            }
            if (!path.includes(nxt) && path.length<maxLen) dfs(start, nxt);
        }
        path.pop();
    }
    for (let i=0;i<N;i++) dfs(i,i);
    // parse stored cycles
    return Array.from(cycles).map(c=>c.split('|')[1].split(',').map(Number));
}

// Fisher–Yates shuffle
function shuffle(arr) { for (let i=arr.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } }