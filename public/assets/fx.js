/* ==== افکت‌های سه‌بعدی YASIN AI ADS ==== */
(function(){
"use strict";
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- پس‌زمینه ذرات سه‌بعدی ---------- */
const cv = document.getElementById('bg3d');
if(cv && !reduce){
  const ctx = cv.getContext('2d');
  let W,H,CX,CY,pts=[];
  const N = () => Math.min(90, Math.floor(innerWidth/16));
  function resize(){
    W = cv.width = innerWidth * devicePixelRatio;
    H = cv.height = innerHeight * devicePixelRatio;
    cv.style.width = innerWidth+'px'; cv.style.height = innerHeight+'px';
    CX = W/2; CY = H/2;
    pts = Array.from({length:N()},()=>({
      x:(Math.random()-.5)*W, y:(Math.random()-.5)*H, z:Math.random()*W,
      vx:(Math.random()-.5)*.35, vy:(Math.random()-.5)*.35, vz:(Math.random()-.5)*2.2
    }));
  }
  resize(); addEventListener('resize', resize);
  const COLORS=['#54eaff','#a18aff','#ff5ec4'];
  (function loop(){
    ctx.clearRect(0,0,W,H);
    const fl = W*0.9;
    for(const p of pts){
      p.z += p.vz; p.x += p.vx; p.y += p.vy;
      if(p.z<1) p.z=W; if(p.z>W) p.z=1;
      if(p.x<-W/2)p.x=W/2; if(p.x>W/2)p.x=-W/2;
      if(p.y<-H/2)p.y=H/2; if(p.y>H/2)p.y=-H/2;
      p.sx = CX + (p.x/p.z)*fl; p.sy = CY + (p.y/p.z)*fl;
      const r = Math.max(.4, (1 - p.z/W)*2.6*devicePixelRatio);
      const a = 0.12 + (1 - p.z/W)*0.55;
      ctx.beginPath(); ctx.arc(p.sx,p.sy,r,0,7);
      ctx.fillStyle = COLORS[Math.abs((p.x*7+p.y*13)|0) % 3];
      ctx.globalAlpha = a; ctx.fill();
    }
    ctx.globalAlpha = 1;
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const a=pts[i],b=pts[j];
      const dx=a.sx-b.sx, dy=a.sy-b.sy, d=dx*dx+dy*dy;
      const max=(140*devicePixelRatio)**2;
      if(d<max){
        ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy);
        ctx.strokeStyle='#54eaff'; ctx.globalAlpha=(1-d/max)*0.14; ctx.lineWidth=devicePixelRatio;
        ctx.stroke(); ctx.globalAlpha=1;
      }
    }
    requestAnimationFrame(loop);
  })();
}

/* ---------- اسکرول-رول برای کارت‌ها ---------- */
const cards=[...document.querySelectorAll('.card')].filter(c=>!c.closest('.loginwrap'));
cards.forEach(c=>c.classList.add('reveal'));
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}
  }),{threshold:.08});
  cards.forEach(c=>io.observe(c));
}else cards.forEach(c=>c.classList.add('in'));

/* ---------- تیلت سه‌بعدی کارت‌ها ---------- */
if(matchMedia('(pointer:fine)').matches && !reduce){
  document.querySelectorAll('.card').forEach(card=>{
    let raf=null;
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width, py=(e.clientY-r.top)/r.height;
      card.style.setProperty('--mx',(px*100)+'%');
      card.style.setProperty('--my',(py*100)+'%');
      if(raf)return;
      raf=requestAnimationFrame(()=>{
        raf=null;
        card.style.transform=`rotateX(${(0.5-py)*7}deg) rotateY(${(px-0.5)*7}deg) translateZ(6px)`;
      });
    });
    card.addEventListener('mouseleave',()=>{
      if(raf)cancelAnimationFrame(raf);raf=null;
      card.style.transform='rotateX(0) rotateY(0)';
    });
  });
}

/* ---------- پارالاکس نورها با حرکت موس ---------- */
const glows=document.querySelectorAll('.glow');
if(glows.length && !reduce){
  let gx=0,gy=0,tx=0,ty=0;
  addEventListener('mousemove',e=>{
    tx=(e.clientX/innerWidth-.5)*40; ty=(e.clientY/innerHeight-.5)*40;
  });
  (function par(){
    gx+=(tx-gx)*.05; gy+=(ty-gy)*.05;
    glows.forEach((g,i)=>{
      const f=(i+1)*.6;
      g.style.transform=`translate(${-gx*f}px,${-gy*f}px)`;
    });
    requestAnimationFrame(par);
  })();
}
})();
