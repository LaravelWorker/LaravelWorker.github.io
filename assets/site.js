(function(){
  'use strict';
  var slow=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- цифровой дождь --- */
  var rcv=document.getElementById('rainc'),
      rctx=rcv?rcv.getContext('2d'):null,
      drops=[], rraf=null, last=0, FS=16,
      GLY='ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';

  function rseed(){
    if(!rcv) return;
    var dpr=Math.min(window.devicePixelRatio||1,2),
        w=window.innerWidth, h=window.innerHeight;
    rcv.width=w*dpr; rcv.height=h*dpr;
    rcv.style.width=w+'px'; rcv.style.height=h+'px';
    rctx.setTransform(dpr,0,0,dpr,0,0);
    rctx.fillStyle='#020604'; rctx.fillRect(0,0,w,h);
    var cols=Math.ceil(w/FS);
    drops=[];
    for(var i=0;i<cols;i++) drops.push({y:Math.random()*-40, sp:0.55+Math.random()*0.85});
  }

  function rframe(ts){
    rraf=requestAnimationFrame(rframe);
    if(ts-last<45) return;
    last=ts;
    rdraw();
  }

  /* один кадр дождя; в режиме reduced-motion рисуется только он, без цикла */
  function rdraw(){
    var w=window.innerWidth, h=window.innerHeight, rows=h/FS;
    rctx.fillStyle='rgba(2,6,4,0.085)';
    rctx.fillRect(0,0,w,h);
    rctx.font='600 '+FS+'px "JetBrains Mono", monospace';
    rctx.textBaseline='top';
    for(var i=0;i<drops.length;i++){
      var d=drops[i], x=i*FS, y=d.y*FS;
      if(y>-FS && y<h){
        rctx.shadowColor='rgba(0,255,106,.75)'; rctx.shadowBlur=9;
        rctx.fillStyle='#D8FFE8';
        rctx.fillText(GLY.charAt((Math.random()*GLY.length)|0),x,y);
        rctx.shadowBlur=0;
        rctx.fillStyle='rgba(0,255,106,.72)';
        rctx.fillText(GLY.charAt((Math.random()*GLY.length)|0),x,y-FS);
      }
      d.y+=d.sp;
      if(d.y>rows+Math.random()*30){ d.y=-Math.random()*20; d.sp=0.55+Math.random()*0.85; }
    }
  }

  if(rctx){
    rseed();
    if(slow){ rdraw(); }
    else{ rraf=requestAnimationFrame(rframe); }
    var rz;
    window.addEventListener('resize',function(){
      clearTimeout(rz);
      rz=setTimeout(function(){ rseed(); if(slow) rdraw(); },180);
    });
  }

  /* --- счётчик стажа --- */
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
  if(!el) return;
  var fmt=longFmt;
  if(slow){ el.textContent=fmt(totalM); return; }
  var target=totalM, cur=0;
  el.textContent=fmt(0);
  var t=setInterval(function(){
    cur+=2;
    if(cur>=target){ cur=target; clearInterval(t); }
    el.textContent=fmt(cur);
  },18);
})();
