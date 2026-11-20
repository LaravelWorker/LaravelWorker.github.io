/* komiagin.dev — интерактив дизайна «Проводка».
   Всё здесь — прогрессивное улучшение: без JS страница полностью читается,
   при prefers-reduced-motion эффекты отключаются или рисуются одним кадром. */
(function(){
  'use strict';
  var doc=document.documentElement;
  doc.classList.add('js');
  var mm=function(q){ return window.matchMedia ? window.matchMedia(q) : {matches:false}; };
  var slow=mm('(prefers-reduced-motion: reduce)').matches;
  var fine=mm('(pointer: fine)').matches;

  function cssVar(name){ return getComputedStyle(doc).getPropertyValue(name).trim(); }

  /* ================= тема ================= */
  function effectiveTheme(){
    var t=doc.getAttribute('data-theme');
    if(t==='dark'||t==='light') return t;
    return mm('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  var toggle=document.querySelector('.theme-toggle');
  function syncToggle(){
    if(!toggle) return;
    var dark=effectiveTheme()==='dark';
    toggle.setAttribute('aria-pressed',dark?'true':'false');
    toggle.setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');
  }
  syncToggle();
  if(toggle){
    toggle.addEventListener('click',function(){
      var next=effectiveTheme()==='dark'?'light':'dark';
      var apply=function(){
        doc.setAttribute('data-theme',next);
        try{ localStorage.setItem('theme',next); }catch(e){}
        syncToggle(); net.recolor();
      };
      if(document.startViewTransition && !slow){
        // круг новой темы раскрывается от кнопки
        var r=toggle.getBoundingClientRect();
        doc.style.setProperty('--vt-x',(r.left+r.width/2)+'px');
        doc.style.setProperty('--vt-y',(r.top+r.height/2)+'px');
        doc.classList.add('vt-theme');
        var vt=document.startViewTransition(apply);
        vt.finished.then(function(){ doc.classList.remove('vt-theme'); },function(){ doc.classList.remove('vt-theme'); });
      } else apply();
    });
  }
  var schemeMq=mm('(prefers-color-scheme: dark)');
  if(schemeMq.addEventListener) schemeMq.addEventListener('change',function(){ syncToggle(); net.recolor(); });

  /* ================= фон: сеть узлов и транзакции ================= */
  var net=(function(){
    var cv=document.getElementById('bgc'), ctx=cv?cv.getContext('2d'):null;
    var api={recolor:function(){}};
    if(!ctx) return api;
    var W=0,H=0,dpr=1,nodes=[],packets=[],raf=0,D=160,mouse={x:-9999,y:-9999,on:false};
    var col={line:'',node:'',acc:''};
    function recolor(){
      col.line=cssVar('--net-line')||'rgba(0,0,0,.1)';
      col.node=cssVar('--net-node')||'rgba(0,0,0,.3)';
      col.acc=cssVar('--accent')||'#2B33FF';
      if(slow) draw();
    }
    function seed(){
      dpr=Math.min(window.devicePixelRatio||1,2);
      W=window.innerWidth; H=window.innerHeight;
      cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      var n=Math.max(18,Math.min(110,Math.round(W*H/14000)));
      D=W<640?120:160;
      nodes=[];
      for(var i=0;i<n;i++) nodes.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,r:1+Math.random()*1.4});
      packets=[];
      var p=Math.max(6,Math.round(n/4));
      for(var j=0;j<p;j++) packets.push(spawn());
    }
    function near(a){
      var out=[];
      for(var i=0;i<nodes.length;i++){
        var b=nodes[i]; if(b===a) continue;
        var dx=a.x-b.x, dy=a.y-b.y;
        if(dx*dx+dy*dy<D*D) out.push(b);
      }
      return out;
    }
    function spawn(){
      var a=nodes[(Math.random()*nodes.length)|0], nb=near(a);
      var b=nb.length?nb[(Math.random()*nb.length)|0]:nodes[(Math.random()*nodes.length)|0];
      return {a:a,b:b,t:slow?Math.random():0,sp:.006+Math.random()*.01};
    }
    function draw(){
      ctx.clearRect(0,0,W,H);
      var i,j,a,b,dx,dy,d2;
      // рёбра
      ctx.lineWidth=1;
      for(i=0;i<nodes.length;i++){
        a=nodes[i];
        for(j=i+1;j<nodes.length;j++){
          b=nodes[j]; dx=a.x-b.x; dy=a.y-b.y; d2=dx*dx+dy*dy;
          if(d2<D*D){
            ctx.globalAlpha=1-Math.sqrt(d2)/D;
            ctx.strokeStyle=col.line;
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          }
        }
      }
      // связи с курсором
      if(mouse.on){
        ctx.strokeStyle=col.acc;
        for(i=0;i<nodes.length;i++){
          a=nodes[i]; dx=a.x-mouse.x; dy=a.y-mouse.y; d2=dx*dx+dy*dy;
          if(d2<200*200){
            ctx.globalAlpha=(1-Math.sqrt(d2)/200)*.55;
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(mouse.x,mouse.y); ctx.stroke();
          }
        }
      }
      // узлы
      ctx.globalAlpha=1; ctx.fillStyle=col.node;
      for(i=0;i<nodes.length;i++){ a=nodes[i]; ctx.beginPath(); ctx.arc(a.x,a.y,a.r,0,6.283); ctx.fill(); }
      // транзакции: точка с хвостом бежит по ребру
      ctx.fillStyle=col.acc; ctx.strokeStyle=col.acc; ctx.lineWidth=1.6;
      for(i=0;i<packets.length;i++){
        var p=packets[i], x=p.a.x+(p.b.x-p.a.x)*p.t, y=p.a.y+(p.b.y-p.a.y)*p.t;
        var tt=Math.max(0,p.t-.18), tx=p.a.x+(p.b.x-p.a.x)*tt, ty=p.a.y+(p.b.y-p.a.y)*tt;
        var g=ctx.createLinearGradient(tx,ty,x,y);
        g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,col.acc);
        ctx.globalAlpha=.9; ctx.strokeStyle=g;
        ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(x,y); ctx.stroke();
        ctx.globalAlpha=1; ctx.beginPath(); ctx.arc(x,y,2.3,0,6.283); ctx.fill();
      }
      ctx.globalAlpha=1;
    }
    function step(){
      raf=requestAnimationFrame(step);
      for(var i=0;i<nodes.length;i++){
        var a=nodes[i];
        if(mouse.on){
          // узлы слегка тянутся к курсору
          var dx=mouse.x-a.x, dy=mouse.y-a.y, d2=dx*dx+dy*dy;
          if(d2<200*200 && d2>1){ a.vx+=dx/d2*.9; a.vy+=dy/d2*.9; }
        }
        a.vx*=.985; a.vy*=.985;
        if(Math.abs(a.vx)<.04) a.vx+=(Math.random()-.5)*.02;
        if(Math.abs(a.vy)<.04) a.vy+=(Math.random()-.5)*.02;
        a.x+=a.vx; a.y+=a.vy;
        if(a.x<-20) a.x=W+20; if(a.x>W+20) a.x=-20;
        if(a.y<-20) a.y=H+20; if(a.y>H+20) a.y=-20;
      }
      for(var j=0;j<packets.length;j++){
        var p=packets[j]; p.t+=p.sp;
        if(p.t>=1){
          var nb=near(p.b);
          if(nb.length){ p.a=p.b; p.b=nb[(Math.random()*nb.length)|0]; p.t=0; }
          else packets[j]=spawn();
        }
      }
      draw();
    }
    function fade(){
      // сеть ярче на первом экране и затихает при чтении
      var k=1-Math.min(1,window.scrollY/(H*0.9));
      cv.style.opacity=(0.28+0.72*k).toFixed(3);
    }
    recolor(); seed();
    if(slow){ draw(); }
    else{
      raf=requestAnimationFrame(step);
      document.addEventListener('visibilitychange',function(){
        if(document.hidden){ cancelAnimationFrame(raf); raf=0; }
        else if(!raf) raf=requestAnimationFrame(step);
      });
      if(fine){
        window.addEventListener('pointermove',function(e){ mouse.x=e.clientX; mouse.y=e.clientY; mouse.on=true; },{passive:true});
        document.addEventListener('pointerleave',function(){ mouse.on=false; });
      }
    }
    var rz;
    window.addEventListener('resize',function(){ clearTimeout(rz); rz=setTimeout(function(){ seed(); if(slow) draw(); },180); });
    window.addEventListener('scroll',fade,{passive:true}); fade();
    api.recolor=recolor;
    return api;
  })();

  /* ================= имя в шапке: буквы «проявляются» ================= */
  var h1=document.querySelector('.hero h1');
  if(h1 && !slow){
    var label=(h1.innerText||h1.textContent).replace(/\s+/g,' ').trim(), k=0; // innerText учитывает <br> как пробел
    h1.setAttribute('aria-label',label);
    Array.prototype.slice.call(h1.childNodes).forEach(function(n){
      if(n.nodeType!==3) return;
      var frag=document.createDocumentFragment();
      n.textContent.split('').forEach(function(c){
        if(/\s/.test(c)){ frag.appendChild(document.createTextNode(c)); return; }
        var s=document.createElement('span'); s.className='ch'; s.textContent=c;
        s.setAttribute('aria-hidden','true'); s.style.setProperty('--i',k++);
        frag.appendChild(s);
      });
      h1.replaceChild(frag,n);
    });
  }

  /* ================= терминал: демо-лог событий из кейсов ================= */
  var log=document.querySelector('.term-log');
  if(log && !slow){
    // события взяты из реальных кейсов (подписки, мониторинг, «Титло», бэкенд для Bybit); лог — иллюстрация
    var EV=[
      ['payments','ok','webhook payment.succeeded · дубль отклонён'],
      ['billing','ok','subscription.renewed · +30 дней'],
      ['fiscal','ok','receipt.sent · чек по 54-ФЗ'],
      ['tg-bot','ok','notify «Подписка продлена»'],
      ['max-bot','ok','notify «Подписка продлена»'],
      ['monitor','ok','poll · 10 000 устройств · 58 с'],
      ['alert','warn','asic-0427 offline 3 мин → Telegram'],
      ['queue','info','tfidf.analyze · 30 конкурентов · 100%'],
      ['bybit','ok','stop_loss выставлен · BTCUSDT'],
      ['quotes','info','повторный запрос склеен · ответ из кеша'],
      ['llm','info','stream · таймаут → повтор · ок'],
      ['payments','ok','recurrent.charge · без двойного списания']
    ];
    var ei=0, visible=true, clock=Date.now();
    function pad(n){ return (n<10?'0':'')+n; }
    function stamp(ms){ var d=new Date(ms); return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); }
    // стартовые строки из HTML получают «сегодняшнее» время, чтобы лог шёл непрерывно
    var ts=log.querySelectorAll('.t');
    for(var q=0;q<ts.length;q++) ts[q].textContent=stamp(clock-(ts.length-q)*2000);
    function add(){
      if(!visible||document.hidden) return;
      var e=EV[ei++%EV.length];
      clock=Math.max(clock+1000+Math.random()*2000,Date.now());
      var li=document.createElement('li'); li.className='new';
      li.innerHTML='<span class="t"></span><span class="s"></span><span class="e"></span>';
      li.children[0].textContent=stamp(clock);
      li.children[1].textContent=e[0]; li.children[1].className='s';
      var ev=li.children[2]; ev.className='e '+e[1]+' cur';
      log.appendChild(li);
      var prev=log.querySelectorAll('.cur'); for(var i=0;i<prev.length-1;i++) prev[i].classList.remove('cur');
      // печатаем строку по символам
      var txt=e[2], pos=0;
      (function type(){ ev.textContent=txt.slice(0,pos+=2); if(pos<txt.length) setTimeout(type,16); })();
      while(log.scrollHeight>log.clientHeight+2 && log.children.length>3) log.removeChild(log.firstElementChild);
    }
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ visible=es[0].isIntersecting; }).observe(log);
    }
    setInterval(add,1600);
  }

  /* ================= одометры для цифр кейсов ================= */
  var figs=document.querySelectorAll('.fig b');
  if(figs.length && !slow && 'IntersectionObserver' in window){
    var re=/\d{1,3}(?:[  ]\d{3})+|\d+(?:[.,]\d+)?/;
    var io=new IntersectionObserver(function(es){
      es.forEach(function(en){
        if(!en.isIntersecting) return;
        io.unobserve(en.target);
        var el=en.target, src=el.textContent, m=src.match(re);
        if(!m) return;
        var raw=m[0], sep=/[  ]/.test(raw), target=parseFloat(raw.replace(/[  ]/g,'').replace(',','.'));
        if(!(target>=10)) return;
        var pre=src.slice(0,m.index), post=src.slice(m.index+raw.length), t0=performance.now(), dur=1300;
        function fmt(v){
          var s=String(Math.round(v));
          return sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g,' ') : s;
        }
        (function tick(now){
          var p=Math.min(1,(now-t0)/dur), e=1-Math.pow(2,-10*p);
          el.textContent=pre+fmt(target*e)+post;
          if(p<1) requestAnimationFrame(tick); else el.textContent=src;
        })(t0);
      });
    },{threshold:.6});
    figs.forEach(function(f){ io.observe(f); });
  }

  /* ================= подсветка, наклон, магнитные кнопки, курсор ================= */
  if(fine && !slow){
    document.addEventListener('pointermove',function(e){
      var c=e.target.closest && e.target.closest('.item,.card,.case');
      if(c){
        var r=c.getBoundingClientRect();
        c.style.setProperty('--mx',(e.clientX-r.left)+'px');
        c.style.setProperty('--my',(e.clientY-r.top)+'px');
      }
    },{passive:true});

    // чеки чуть наклоняются вслед за курсором
    document.querySelectorAll('.case').forEach(function(c){
      c.addEventListener('pointermove',function(e){
        var r=c.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
        c.style.transform='perspective(1400px) rotateX('+(-y*2.4).toFixed(2)+'deg) rotateY('+(x*3).toFixed(2)+'deg)';
      });
      c.addEventListener('pointerleave',function(){ c.style.transform=''; });
    });

    document.querySelectorAll('.btn').forEach(function(b){
      b.addEventListener('pointermove',function(e){
        var r=b.getBoundingClientRect(), x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
        b.style.transform='translate('+(x*.12).toFixed(1)+'px,'+(y*.22).toFixed(1)+'px)';
      });
      b.addEventListener('pointerleave',function(){ b.style.transform=''; });
    });

    var cur=document.createElement('div'); cur.className='cursor'; cur.setAttribute('aria-hidden','true');
    document.body.appendChild(cur);
    var cx=-100,cy=-100,tx=-100,ty=-100;
    window.addEventListener('pointermove',function(e){
      tx=e.clientX; ty=e.clientY; cur.classList.add('on');
      var hot=e.target.closest && e.target.closest('a,button,summary,.chip');
      cur.classList.toggle('hot',!!hot);
    },{passive:true});
    document.addEventListener('pointerleave',function(){ cur.classList.remove('on'); });
    (function loop(){
      cx+=(tx-cx)*.22; cy+=(ty-cy)*.22;
      cur.style.transform='translate('+cx.toFixed(1)+'px,'+cy.toFixed(1)+'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ================= счётчики стажа ================= */
  function monthsSince(y,m){
    var n=new Date();
    return (n.getFullYear()-y)*12 + (n.getMonth()-m) + 1;
  }
  function plural(n,forms){
    var a=Math.abs(n)%100, b=a%10;
    if(a>10&&a<20) return forms[2];
    if(b>1&&b<5) return forms[1];
    if(b===1) return forms[0];
    return forms[2];
  }
  function longFmt(m){
    var y=Math.floor(m/12), r=m%12, out=y+' '+plural(y,['год','года','лет']);
    if(r) out+=' '+r+' '+plural(r,['месяц','месяца','месяцев']);
    return out;
  }
  var totalM=monthsSince(2020,8), ipM=monthsSince(2022,5);
  var elTotal=document.getElementById('years-total');
  if(elTotal) elTotal.textContent=longFmt(totalM);
  var elIp=document.getElementById('years-ip');
  if(elIp) elIp.textContent=longFmt(ipM);
  var el=document.getElementById('years');
  if(el){
    if(slow){ el.textContent=longFmt(totalM); }
    else{
      var cur2=0;
      el.textContent=longFmt(0);
      var t=setInterval(function(){
        cur2+=2;
        if(cur2>=totalM){ cur2=totalM; clearInterval(t); }
        el.textContent=longFmt(cur2);
      },18);
    }
  }
})();
