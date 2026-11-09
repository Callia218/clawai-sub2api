// A stable logical viewport keeps model-generated CSS/canvas artwork consistent
// across gallery columns. The outer iframe scales the entire measured document.
export const PELICAN_BASE_WIDTH = 800
export const PELICAN_BASE_HEIGHT = 600
export const PELICAN_MAX_SIZE = 8192

export function buildPelicanDocument(html: string, channel: string): string {
  const bridge = `<script>(function(){
    function memoryStorage(){var m={};return {getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}}}
    ['localStorage','sessionStorage'].forEach(function(name){try{window[name].getItem('__probe__')}catch(e){try{Object.defineProperty(window,name,{value:memoryStorage(),configurable:true})}catch(_){}}});
    var channel=${JSON.stringify(channel)}, queued=false, last='', updates=0;
    function measure(){
      queued=false;if(!document.body)return;
      var root=document.documentElement,body=document.body;
      var w=Math.max(${PELICAN_BASE_WIDTH},root.scrollWidth,body.scrollWidth),h=Math.max(${PELICAN_BASE_HEIGHT},root.scrollHeight,body.scrollHeight);
      // Centered fixed-width artwork can overflow on the negative side too.
      Array.prototype.forEach.call(body.children,function(el){if(el.tagName==='SCRIPT'||el.tagName==='STYLE')return;var r=el.getBoundingClientRect();if(r.width&&r.height){w=Math.max(w,r.width,r.right-Math.min(0,r.left));h=Math.max(h,r.height,r.bottom-Math.min(0,r.top));}});
      w=Math.min(${PELICAN_MAX_SIZE},Math.ceil(w));h=Math.min(${PELICAN_MAX_SIZE},Math.ceil(h));
      var next=w+':'+h;
      if(next!==last&&updates<12){last=next;updates++;parent.postMessage({type:'pelican:dimensions',channel:channel,width:w,height:h},'*');}
    }
    function schedule(){if(!queued){queued=true;requestAnimationFrame(measure)}}
    function start(){
      var style=document.createElement('style');style.textContent='html,body{overflow:hidden!important;box-sizing:border-box!important}html{margin:0!important}body{margin:0!important}';document.head.appendChild(style);
      var resize=new ResizeObserver(schedule);resize.observe(document.documentElement);resize.observe(document.body);
      new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
      document.addEventListener('load',schedule,true);window.addEventListener('resize',schedule);
      if(document.fonts)document.fonts.ready.then(schedule);
      schedule();setTimeout(schedule,200);setTimeout(schedule,1000);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  })();` + '<' + '/script>'
  // Install the policy before ANY model content, including malformed documents
  // with scripts before <head>. The iframe retains an opaque sandbox origin.
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">`
  return '<!doctype html><html><head>' + policy + bridge + '</head><body>' + html + '</body></html>'
}
