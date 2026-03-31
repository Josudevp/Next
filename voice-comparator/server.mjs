import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 7777;
const VOICES_DIR = '/tmp/voices';
const ENV_FILE = '/home/josudev/Documents/Next/backend/.env';

const HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NExt — Comparador de Voces</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:#F0F4FF;min-height:100vh}
.hdr{background:linear-gradient(135deg,#1B49AE,#2563EB 55%,#22D3EE);padding:44px 24px 34px;text-align:center;position:relative;overflow:hidden}
.hdr::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 75% 25%,rgba(34,211,238,.15),transparent 55%)}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 14px;border-radius:99px;margin-bottom:14px;position:relative}
.dot{width:6px;height:6px;border-radius:50%;background:#22D3EE;animation:p 1.5s infinite}@keyframes p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
.hdr h1{color:#fff;font-size:clamp(20px,4vw,30px);font-weight:800;letter-spacing:-.5px;position:relative}.hdr p{color:rgba(255,255,255,.75);font-size:14px;margin-top:8px;position:relative}
.wrap{max-width:820px;margin:0 auto;padding:28px 16px 70px}
.info{background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:14px 18px;margin-bottom:22px;display:flex;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.info p{font-size:13px;color:#64748B;line-height:1.6}.info strong{color:#1E293B}
.sl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8;margin:22px 0 8px 2px}
.grid{display:grid;gap:10px}
.card{background:#fff;border:2px solid #E2E8F0;border-radius:18px;padding:16px 18px;display:flex;align-items:center;gap:14px;transition:all .2s;box-shadow:0 2px 6px rgba(0,0,0,.04)}
.card:hover{border-color:#93C5FD;transform:translateY(-1px);box-shadow:0 6px 18px rgba(37,99,235,.1)}
.card.playing{border-color:#F59E0B;background:#FFFBEB}.card.selected{border-color:#10B981;background:#F0FDF4;box-shadow:0 0 0 4px rgba(16,185,129,.08)}
.play-btn{width:48px;height:48px;border-radius:13px;border:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#F1F5F9;color:#64748B;font-size:19px;transition:all .2s}
.play-btn:hover{background:#2563EB;color:#fff;transform:scale(1.05)}.card.playing .play-btn{background:#F59E0B;color:#fff}
.ib{flex:1;min-width:0}.vn{font-size:15px;font-weight:700;color:#1E293B}.vm{display:flex;gap:6px;margin-top:3px}.vd{font-size:12px;color:#94A3B8;margin-top:2px}
.tag{font-size:10px;font-weight:700;padding:2px 9px;border-radius:99px;letter-spacing:.04em}
.tag-hd{background:#FEF3C7;color:#92400E}.tag-n2{background:#EFF6FF;color:#1D4ED8}.tag-st{background:#F5F3FF;color:#6D28D9}
.cb{padding:8px 16px;border:2px solid #E2E8F0;border-radius:11px;background:#fff;color:#64748B;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0}
.cb:hover{border-color:#2563EB;color:#2563EB}.card.selected .cb{background:#10B981;border-color:#10B981;color:#fff}
.wave{display:flex;align-items:center;gap:3px;height:18px}.wb{width:3px;border-radius:99px;background:#F59E0B;animation:w .7s ease-in-out infinite alternate}
.wb:nth-child(2){animation-delay:.1s}.wb:nth-child(3){animation-delay:.2s}.wb:nth-child(4){animation-delay:.3s}.wb:nth-child(5){animation-delay:.15s}
@keyframes w{from{height:4px;opacity:.4}to{height:17px;opacity:1}}
.cta{background:linear-gradient(135deg,#1B49AE,#2563EB);border-radius:22px;padding:26px 28px;text-align:center;margin-top:32px;box-shadow:0 8px 28px rgba(37,99,235,.25)}
.cta h3{color:#fff;font-size:19px;font-weight:800;margin-bottom:6px}.cta p{color:rgba(255,255,255,.72);font-size:13px;margin-bottom:18px}
#sn{color:#22D3EE;font-weight:800}
.conf{padding:12px 30px;background:#fff;color:#1B49AE;border:none;border-radius:13px;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 4px 10px rgba(0,0,0,.1)}
.conf:hover{transform:scale(1.02)}.conf:disabled{opacity:.5;cursor:not-allowed;transform:none}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(90px);background:#1E293B;color:#fff;padding:12px 22px;border-radius:12px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:transform .35s cubic-bezier(.16,1,.3,1);z-index:999}
.toast.show{transform:translateX(-50%) translateY(0)}.toast.ok{background:#065F46}.toast.err{background:#7F1D1D}
</style></head><body>
<div class="hdr"><div class="badge"><span class="dot"></span>NExt Coach</div><h1>🎙 Comparador de Voces IA</h1><p>Escucha cada opci&oacute;n y elige la voz ideal para tu coach</p></div>
<div class="wrap">
<div class="info"><span style="font-size:20px;flex-shrink:0">💡</span><p>Pulsa <strong>&#9654;</strong> para escuchar. Cuando encuentres la que te guste haz clic en <strong>&ldquo;Elegir&rdquo;</strong> y luego en <strong>Confirmar</strong>. El cambio se aplica autom&aacute;ticamente.</p></div>
<div class="sl">&#11088; Chirp3-HD &mdash; Ultra Alta Calidad</div>
<div class="grid" id="g-chirp3"></div>
<div class="sl">&#128293; Neural2 &mdash; Alta Calidad</div>
<div class="grid" id="g-neural2"></div>
<div class="sl">&#127897; Studio &mdash; Estudio Profesional</div>
<div class="grid" id="g-studio"></div>
<div class="cta"><h3>Confirmar selecci&oacute;n</h3><p>Elegida: <span id="sn">ninguna todav&iacute;a</span></p><button class="conf" id="cb" disabled onclick="apply()">Aplicar esta voz al Coach &rarr;</button></div>
</div>
<div class="toast" id="toast"></div>
<script>
const voices=__VOICES__;
const desc={Achird:'C&aacute;lida y conversacional',Enceladus:'Profunda y con autoridad',Charon:'Clara y articulada',Fenrir:'Din&aacute;mica y energ&eacute;tica',Iapetus:'Serena y profesional',Puck:'Amigable y &aacute;gil',Sadaltager:'Suave y motivadora',Schedar:'Firme y elegante','Neural2-F':'Natural y vers&aacute;til','Neural2-G':'N&iacute;tida y expresiva','Studio-F':'Estudio, calidad m&aacute;xima'};
let sel=null,cur=null,pid=null;
function buildCard(v){
const g=v.id.startsWith('chirp3')?'g-chirp3':v.id.startsWith('neural2')?'g-neural2':'g-studio';
const tc=v.tag.includes('Ultra')?'tag-hd':v.tag.includes('Alta')?'tag-n2':'tag-st';
const tt=v.tag.replace(/[\u2B50\uD83D\uDD25\uD83C\uDF99\uFE0F] /g,'');
const sn=v.label.split(' ')[0];
const d=desc[sn]||'Voz masculina en espa&ntilde;ol';
const el=document.createElement('div');
el.className='card';el.id='c-'+v.id;
el.innerHTML='<button class="play-btn" id="pb-'+v.id+'" onclick="tp(\''+v.id+'\')">&#9654;</button><div class="ib"><div class="vn">'+v.label+'</div><div class="vm"><span class="tag '+tc+'">'+tt+'</span></div><div class="vd">'+d+'</div></div><button class="cb" onclick="sv(\''+v.id+'\',\''+v.name+'\',\''+v.label+'\')">Elegir</button>';
document.getElementById(g).appendChild(el);}
function tp(id){if(pid===id){st();return;}st();pid=id;const c=document.getElementById('c-'+id),b=document.getElementById('pb-'+id);c.classList.add('playing');b.innerHTML='<div class="wave"><div class="wb"></div><div class="wb"></div><div class="wb"></div><div class="wb"></div><div class="wb"></div></div>';cur=new Audio('/audio/'+id+'.mp3');cur.play();cur.onended=()=>st();cur.onerror=()=>{st();tk('Error al reproducir','err');};}
function st(){if(cur){cur.pause();cur=null;}if(pid){document.getElementById('c-'+pid)?.classList.remove('playing');const b=document.getElementById('pb-'+pid);if(b)b.textContent='\u25B6';pid=null;}}
function sv(id,name,label){document.querySelectorAll('.card').forEach(c=>c.classList.remove('selected'));document.getElementById('c-'+id).classList.add('selected');sel={id,name,label};document.getElementById('sn').textContent=label;document.getElementById('cb').disabled=false;}
async function apply(){if(!sel)return;const b=document.getElementById('cb');b.textContent='Aplicando...';b.disabled=true;try{const r=await fetch('/set-voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voiceName:sel.name})});const d=await r.json();if(d.ok){tk('\u2705 "'+sel.label+'" aplicada correctamente. El backend recargara solo.','ok');b.textContent='\u2705 \u00a1Aplicada!';}else throw new Error(d.error);}catch(e){tk('\u274C '+e.message,'err');b.textContent='Aplicar esta voz al Coach \u2192';b.disabled=false;}}
function tk(m,t){const el=document.getElementById('toast');el.textContent=m;el.className='toast show '+(t||'');setTimeout(()=>el.className='toast',4500);}
voices.filter(v=>v.ok).forEach(buildCard);
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const manifest = JSON.parse(fs.readFileSync(VOICES_DIR + '/manifest.json', 'utf8'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML.replace('__VOICES__', JSON.stringify(manifest)));
  }
  if (req.method === 'GET' && req.url.startsWith('/audio/')) {
    const f = path.join(VOICES_DIR, path.basename(req.url));
    if (fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'audio/mpeg' }); return fs.createReadStream(f).pipe(res); }
    res.writeHead(404); return res.end();
  }
  if (req.method === 'POST' && req.url === '/set-voice') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { voiceName } = JSON.parse(body);
        let env = fs.readFileSync(ENV_FILE, 'utf8');
        env = env.replace(/^GOOGLE_TTS_VOICE=.*/m, `GOOGLE_TTS_VOICE=${voiceName}`);
        fs.writeFileSync(ENV_FILE, env);
        console.log('✅ Voz actualizada →', voiceName);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  res.writeHead(404); res.end();
});

server.listen(PORT, () => console.log('\n\uD83C\uDF99\uFE0F  Comparador listo \u2192 http://localhost:' + PORT + '\n'));
