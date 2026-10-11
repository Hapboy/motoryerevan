const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to data files
const DATA_DIR = path.join(__dirname, 'data');
const PIXELS_FILE = path.join(DATA_DIR, 'pixels.json');
const EVENT_FILE = path.join(DATA_DIR, 'event.json');
const ADMIN_PIN = process.env.ADMIN_PIN || 'admin';

// Helper functions for reading/writing JSON
function readJSON(file, defaultData = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return defaultData;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets except index.html (which is dynamically served with injected pixels)
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// API: Verify Admin PIN
app.post('/api/admin/verify-pin', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) {
    return res.json({ success: true, token: 'motor_admin_authorized' });
  }
  return res.status(401).json({ success: false, message: 'Неверный пароль администратора' });
});

// API: Get Pixels
app.get('/api/pixels', (req, res) => {
  const pixels = readJSON(PIXELS_FILE, []);
  res.json({ success: true, pixels });
});

// API: Add Pixel
app.post('/api/pixels', (req, res) => {
  const { name, type, trackingId, placement, code, active, notes } = req.body;
  
  if (!name || (!code && !trackingId)) {
    return res.status(400).json({ success: false, message: 'Укажите название и код или ID пикселя' });
  }

  const pixels = readJSON(PIXELS_FILE, []);
  const newId = 'pix_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Generate code if template type and only trackingId was passed
  let finalCode = code;
  if (!finalCode && trackingId) {
    finalCode = generatePixelSnippet(type, trackingId);
  }

  const newPixel = {
    id: newId,
    name: name.trim(),
    type: type || 'custom',
    trackingId: trackingId ? trackingId.trim() : '',
    placement: placement === 'body' ? 'body' : 'head',
    active: active !== undefined ? Boolean(active) : true,
    code: finalCode,
    notes: notes ? notes.trim() : '',
    createdAt: new Date().toISOString()
  };

  pixels.unshift(newPixel);
  writeJSON(PIXELS_FILE, pixels);

  res.status(201).json({ success: true, pixel: newPixel, message: 'Пиксель успешно добавлен' });
});

// API: Update Pixel
app.put('/api/pixels/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, trackingId, placement, code, active, notes } = req.body;

  const pixels = readJSON(PIXELS_FILE, []);
  const index = pixels.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Пиксель не найден' });
  }

  let finalCode = code;
  if (!finalCode && trackingId) {
    finalCode = generatePixelSnippet(type, trackingId);
  }

  pixels[index] = {
    ...pixels[index],
    name: name !== undefined ? name.trim() : pixels[index].name,
    type: type !== undefined ? type : pixels[index].type,
    trackingId: trackingId !== undefined ? trackingId.trim() : pixels[index].trackingId,
    placement: placement !== undefined ? (placement === 'body' ? 'body' : 'head') : pixels[index].placement,
    active: active !== undefined ? Boolean(active) : pixels[index].active,
    code: finalCode !== undefined ? finalCode : pixels[index].code,
    notes: notes !== undefined ? notes.trim() : pixels[index].notes,
    updatedAt: new Date().toISOString()
  };

  writeJSON(PIXELS_FILE, pixels);
  res.json({ success: true, pixel: pixels[index], message: 'Пиксель обновлен' });
});

// API: Toggle Pixel Active Status
app.patch('/api/pixels/:id/toggle', (req, res) => {
  const { id } = req.params;
  const pixels = readJSON(PIXELS_FILE, []);
  const pixel = pixels.find(p => p.id === id);

  if (!pixel) {
    return res.status(404).json({ success: false, message: 'Пиксель не найден' });
  }

  pixel.active = !pixel.active;
  pixel.updatedAt = new Date().toISOString();

  writeJSON(PIXELS_FILE, pixels);
  res.json({ success: true, active: pixel.active, message: `Пиксель ${pixel.active ? 'включен' : 'выключен'}` });
});

// API: Delete Pixel
app.delete('/api/pixels/:id', (req, res) => {
  const { id } = req.params;
  let pixels = readJSON(PIXELS_FILE, []);
  const initialLength = pixels.length;
  pixels = pixels.filter(p => p.id !== id);

  if (pixels.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Пиксель не найден' });
  }

  writeJSON(PIXELS_FILE, pixels);
  res.json({ success: true, message: 'Пиксель успешно удален' });
});

// API: Get Event & Venue Data
app.get('/api/event', (req, res) => {
  const eventData = readJSON(EVENT_FILE, {});
  res.json({ success: true, data: eventData });
});

// API: Update Event & Venue Data
app.put('/api/event', (req, res) => {
  const incoming = req.body;
  const current = readJSON(EVENT_FILE, {});
  const updated = { ...current, ...incoming };
  writeJSON(EVENT_FILE, updated);
  res.json({ success: true, data: updated, message: 'Данные мероприятия и локации сохранены' });
});

// Helper: Generate snippet based on type & ID
function generatePixelSnippet(type, id) {
  switch (type) {
    case 'google_analytics':
      return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`;

    case 'google_tag_manager':
      return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>
<!-- End Google Tag Manager -->`;

    case 'meta_pixel':
      return `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`;

    case 'yandex_metrika':
      return `<!-- Yandex.Metrika counter -->
<script type="text/javascript" >
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(${id}, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true,
        webvisor:true
   });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${id}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->`;

    case 'tiktok_pixel':
      return `<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${id}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->`;

    default:
      return id;
  }
}

// Main route: Serve index.html with dynamically injected pixels
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Landing page template not found.');
  }

  let html = fs.readFileSync(indexPath, 'utf-8');

  // Read active pixels
  const pixels = readJSON(PIXELS_FILE, []);
  const activePixels = pixels.filter(p => p.active);

  const headInjections = [];
  const bodyInjections = [];

  activePixels.forEach(pix => {
    const comment = `\n<!-- [PIXEL: ${pix.name} (${pix.type})] -->\n`;
    if (pix.placement === 'body') {
      bodyInjections.push(comment + pix.code);
    } else {
      headInjections.push(comment + pix.code);
    }
  });

  // Inject into </head>
  if (headInjections.length > 0) {
    const injectionStr = headInjections.join('\n') + '\n</head>';
    html = html.replace('</head>', injectionStr);
  }

  // Inject into </body>
  if (bodyInjections.length > 0) {
    const injectionStr = bodyInjections.join('\n') + '\n</body>';
    html = html.replace('</body>', injectionStr);
  }

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  MOTOR YEREVAN Server running!`);
  console.log(`  Landing page: http://localhost:${PORT}`);
  console.log(`  Admin Panel:  http://localhost:${PORT}/admin`);
  console.log(`  Admin PIN:    ${ADMIN_PIN}`);
  console.log(`===============================================`);
});
