const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 7777;
const VOICES_DIR = '/tmp/voices';
const ENV_FILE = '/home/josudev/Documents/Next/backend/.env';

const manifest = JSON.parse(fs.readFileSync(VOICES_DIR+'/manifest.json','utf8'));
const voices = manifest.filter(function(v){return v.ok;});

const descriptions = {
  chirp3_achird:'Calida y conversacional', chirp3_enceladus:'Profunda y con autoridad',
  chirp3_charon:'Clara y articulada', chirp3_fenrir:'Dinamica y energetica',
  chirp3_iapetus:'Serena y profesional', chirp3_puck:'Amigable y agil',
  chirp3_sadaltager:'Suave y motivadora', chirp3_schedar:'Firme y elegante',
  neural2_f:'Natural y versatil', neural2_g:'Nitida y expresiva',
  studio_f:'Estudio, calidad maxima'
};

function tagClass(id){ return id.startsWith('chirp3')?'tag-hd':id.startsWith('neural2')?'tag-n2':'tag-st'; }
function tagText(id){ return id.startsWith('chirp3')?'Chirp3 Ultra HD':id.startsWith('neural2')?'Neural2 Alta Calidad':'Studio Premium'; }
function gridId(id){ return id.startsWith('chirp3')?'gc':id.startsWith('neural2')?'gn':'gs'; }

var cardsHTML = '';
voices.forEach(function(v){
  cardsHTML += "<div class='card' id='c-"+v.id+"' data-grid='"+gridId(v.id)+"'>" +
    "<button class='pb' id='pb-"+v.id+"' onclick='tp(\""+v.id+"\")'>\u25B6</button>" +
    "<div class='ib'><div class='vn'>"+v.label+"</div>" +
    "<span class='tag "+tagClass(v.id)+"'>"+tagText(v.id)+"</span>" +
    "<div class='vd'>"+(descriptions[v.id]||'Voz masculina')+"</div></div>" +
    "<button class='cb' onclick='sv(\""+v.id+"\",\""+v.name+"\",\""+v.label+"\")'>Elegir</button>" +
    "</div>";
});

var css = "*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:#EEF2FF;min-height:100vh}.hdr{background:linear-gradient(135deg,#1B49AE,#2563EB 55%,#22D3EE);padding:40px 20px 30px;text-align:center}.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 14px;border-radius:99px;margin-bottom:12px}.dot{width:6px;height:6px;border-radius:50%;background:#22D3EE;animation:p 1.5s infinite}@keyframes p{50%{opacity:.4;transform:scale(1.3)}}h1{color:#fff;font-size:26px;font-weight:800}h1+p{color:rgba(255,255,255,.75);font-size:14px;margin-top:6px}.wrap{max-width:820px;margin:0 auto;padding:28px 16px 64px}.info-box{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:14px 18px;margin-bottom:24px;display:flex;gap:10px;font-size:13px;color:#64748B;line-height:1.6;box-shadow:0 2px 8px rgba(0,0,0,.04)}.sl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8;margin:22px 0 8px}.card{background:#fff;border:2px solid #E2E8F0;border-radius:16px;padding:16px 18px;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all .18s;box-shadow:0 2px 6px rgba(0,0,0,.04)}.card:hover{border-color:#93C5FD;transform:translateY(-1px);box-shadow:0 6px 18px rgba(37,99,235,.1)}.card.playing{border-color:#F59E0B;background:#FFFBEB}.card.selected{border-color:#10B981;background:#F0FDF4}.pb{width:48px;height:48px;border-radius:12px;border:none;cursor:pointer;background:#F1F5F9;color:#475569;font-size:18px;transition:all .18s;flex-shrink:0}.pb:hover{background:#2563EB;color:#fff}.card.playing .pb{background:#F59E0B;color:#fff}.ib{flex:1}.vn{font-size:15px;font-weight:700;color:#1E293B;margin-bottom:4px}.tag{font-size:10px;font-weight:700;padding:2px 9px;border-radius:99px;letter-spacing:.04em;display:inline-block}.tag-hd{background:#FEF3C7;color:#92400E}.tag-n2{background:#EFF6FF;color:#1D4ED8}.tag-st{background:#F5F3FF;color:#6D28D9}.vd{font-size:12px;color:#94A3B8;margin-top:4px}.cb{padding:8px 16px;border:2px solid #E2E8F0;border-radius:10px;background:#fff;color:#64748B;font-size:12px;font-weight:600;cursor:pointer;transition:all .18s;white-space:nowrap;flex-shrink:0}.cb:hover{border-color:#2563EB;color:#2563EB}.card.selected .cb{background:#10B981;border-color:#10B981;color:#fff}.wave{display:flex;align-items:center;gap:3px;height:18px;justify-content:center}.wb{width:3px;border-radius:99px;background:#F59E0B;animation:wv .7s ease-in-out infinite alternate}.wb:nth-child(2){animation-delay:.1s}.wb:nth-child(3){animation-delay:.2s}.wb:nth-child(4){animation-delay:.3s}.wb:nth-child(5){animation-delay:.15s}@keyframes wv{from{height:4px;opacity:.4}to{height:17px;opacity:1}}.cta{background:linear-gradient(135deg,#1B49AE,#2563EB);border-radius:20px;padding:26px 24px;text-align:center;margin-top:32px;box-shadow:0 8px 28px rgba(37,99,235,.25)}.cta h3{color:#fff;font-size:18px;font-weight:800;margin-bottom:6px}.cta p{color:rgba(255,255,255,.75);font-size:13px;margin-bottom:16px}#sn{color:#22D3EE;font-weight:800}.conf{padding:12px 28px;background:#fff;color:#1B49AE;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 4px 10px rgba(0,0,0,.1)}.conf:hover{transform:scale(1.02)}.conf:disabled{opacity:.5;cursor:not-allowed;transform:none}.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(90px);background:#1E293B;color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:transform .35s cubic-bezier(.16,1,.3,1);z-index:999}.toast.show{transform:translateX(-50%) translateY(0)}.toast.ok{background:#065F46}.toast.err{background:#7F1D1D}";

var jsCode = "var sel=null,cur=null,pid=null;document.querySelectorAll('.card').forEach(function(c){var g=c.getAttribute('data-grid');if(g)document.getElementById(g).appendChild(c);});function tp(id){if(pid===id){st();return;}st();pid=id;var c=document.getElementById('c-'+id),b=document.getElementById('pb-'+id);c.classList.add('playing');b.innerHTML='<div class=\"wave\"><div class=\"wb\"></div><div class=\"wb\"></div><div class=\"wb\"></div><div class=\"wb\"></div><div class=\"wb\"></div></div>';cur=new Audio('/audio/'+id+'.mp3');cur.play();cur.onended=function(){st();};cur.onerror=function(){st();tk('Error al reproducir','err');};}function st(){if(cur){cur.pause();cur=null;}if(pid){var c2=document.getElementById('c-'+pid);if(c2)c2.classList.remove('playing');var b2=document.getElementById('pb-'+pid);if(b2)b2.innerHTML='\u25B6';pid=null;}}function sv(id,name,label){document.querySelectorAll('.card').forEach(function(c){c.classList.remove('selected');});document.getElementById('c-'+id).classList.add('selected');sel={id:id,name:name,label:label};document.getElementById('sn').textContent=label;document.getElementById('cb').disabled=false;}function apply(){if(!sel)return;var b=document.getElementById('cb');b.textContent='Aplicando...';b.disabled=true;fetch('/set-voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voiceName:sel.name})}).then(function(r){return r.json();}).then(function(d){if(d.ok){tk('\u2705 '+sel.label+' aplicada. Reinicia el backend.','ok');b.textContent='\u2705 Aplicada!';}else{throw new Error(d.error||'Error');}}).catch(function(e){tk('\u274C '+e.message,'err');b.textContent='Aplicar esta voz al Coach';b.disabled=false;});}function tk(m,t){var el=document.getElementById('toast');el.textContent=m;el.className='toast show '+(t||'');setTimeout(function(){el.className='toast';},4500);}";

var html = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>NExt - Comparador de Voces</title><link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' rel='stylesheet'><style>"+css+"</style></head><body><div class='hdr'><div class='badge'><span class='dot'></span>NExt Coach</div><h1>Comparador de Voces</h1><p>Escucha cada opcion y elige la voz ideal para tu coach</p></div><div class='wrap'><div class='info-box'><span style='font-size:20px;flex-shrink:0'>&#128161;</span><p>Pulsa <strong>&#9654;</strong> para escuchar. Cuando encuentres la que te guste haz clic en <strong>Elegir</strong> y luego <strong>Confirmar</strong>. El cambio se aplica automaticamente.</p></div><div class='sl'>Chirp3-HD &mdash; Ultra Alta Calidad (las mas naturales)</div><div id='gc'></div><div class='sl'>Neural2 &mdash; Alta Calidad</div><div id='gn'></div><div class='sl'>Studio &mdash; Estudio Profesional</div><div id='gs'></div><div class='cta'><h3>Confirmar seleccion</h3><p>Elegida: <span id='sn'>ninguna todavia</span></p><button class='conf' id='cb' disabled onclick='apply()'>Aplicar esta voz al Coach &rarr;</button></div></div><div class='toast' id='toast'></div><div id='allcards' style='display:none'>"+cardsHTML+"</div><script>"+jsCode+"<\/script></body></html>";

http.createServer(function(req,res){
  if(req.method==='GET' && req.url==='/'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    return res.end(html);
  }
  if(req.method==='GET' && req.url.indexOf('/audio/')===0){
    var fname = path.basename(req.url);
    var fpath = path.join(VOICES_DIR, fname);
    if(fs.existsSync(fpath)){
      res.writeHead(200,{'Content-Type':'audio/mpeg'});
      return fs.createReadStream(fpath).pipe(res);
    }
    res.writeHead(404); return res.end();
  }
  if(req.method==='POST' && req.url==='/set-voice'){
    var body='';
    req.on('data',function(d){body+=d;});
    req.on('end',function(){
      try{
        var obj=JSON.parse(body);
        var env=fs.readFileSync(ENV_FILE,'utf8');
        env=env.replace(/^GOOGLE_TTS_VOICE=.*/m,'GOOGLE_TTS_VOICE='+obj.voiceName);
        fs.writeFileSync(ENV_FILE,env);
        console.log('Voz actualizada:',obj.voiceName);
        res.writeHead(200,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:true}));
      }catch(e){
        res.writeHead(500,{'Content-Type':'application/json'});
        res.end(JSON.stringify({ok:false,error:e.message}));
      }
    });
    return;
  }
  res.writeHead(404); res.end();
}).listen(PORT,function(){
  console.log('Comparador listo en http://localhost:'+PORT);
});
