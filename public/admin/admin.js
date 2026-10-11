/**
 * MOTOR YEREVAN - Admin Dashboard Logic
 */

let currentPixels = [];
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initTabs();
  initModal();
  initTypeSelector();
  initSearchAndFilters();
  initSettingsForm();
});

/* ==========================================================================
   AUTHENTICATION
   ========================================================================== */
function initAuth() {
  const authScreen = document.getElementById('authScreen');
  const adminApp = document.getElementById('adminApp');
  const authForm = document.getElementById('authForm');
  const pinInput = document.getElementById('pinInput');
  const logoutBtn = document.getElementById('logoutBtn');

  const token = localStorage.getItem('motor_admin_token');
  if (token === 'motor_admin_authorized') {
    authScreen.style.display = 'none';
    adminApp.style.display = 'grid';
    loadPixels();
    loadEventSettings();
  } else {
    authScreen.style.display = 'flex';
    adminApp.style.display = 'none';
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = pinInput.value.trim();

    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('motor_admin_token', data.token);
        authScreen.style.display = 'none';
        adminApp.style.display = 'grid';
        loadPixels();
        loadEventSettings();
        showToast('Добро пожаловать в админ-панель MOTOR YEREVAN');
      } else {
        alert(data.message || 'Неверный PIN код');
      }
    } catch (err) {
      alert('Ошибка соединения с сервером');
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('motor_admin_token');
      window.location.reload();
    });
  }
}

/* ==========================================================================
   TABS NAVIGATION
   ========================================================================== */
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(tab.getAttribute('data-tab'));
      if (targetPane) targetPane.classList.add('active');

      if (tab.getAttribute('data-tab') === 'previewTab') {
        renderInjectionPreview();
      }
    });
  });

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadPixels();
      loadEventSettings();
      showToast('Данные обновлены');
    });
  }
}

/* ==========================================================================
   PIXELS MANAGEMENT (CRUD)
   ========================================================================== */
async function loadPixels() {
  try {
    const res = await fetch('/api/pixels');
    const data = await res.json();
    if (data.success) {
      currentPixels = data.pixels;
      renderPixels();
      updateStats();
    }
  } catch (err) {
    console.error('Error fetching pixels:', err);
    showToast('Не удалось загрузить пиксели', true);
  }
}

function updateStats() {
  const total = currentPixels.length;
  const active = currentPixels.filter(p => p.active).length;
  const disabled = total - active;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statActive').textContent = active;
  document.getElementById('statDisabled').textContent = disabled;
  document.getElementById('navPixelCount').textContent = total;
}

function renderPixels() {
  const container = document.getElementById('pixelsContainer');
  const searchTerm = (document.getElementById('searchPixels').value || '').toLowerCase().trim();

  let filtered = currentPixels.filter(p => {
    // Search match
    const matchName = (p.name || '').toLowerCase().includes(searchTerm);
    const matchId = (p.trackingId || '').toLowerCase().includes(searchTerm);
    const matchType = (p.type || '').toLowerCase().includes(searchTerm);
    if (!matchName && !matchId && !matchType) return false;

    // Filter pill match
    if (activeFilter === 'active') return p.active;
    if (activeFilter === 'disabled') return !p.active;
    if (activeFilter === 'google') return p.type.includes('google');
    if (activeFilter === 'meta') return p.type.includes('meta');
    if (activeFilter === 'yandex') return p.type.includes('yandex');

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-md); border: 1px dashed var(--border-light);">
        <p style="font-size: 1.1rem; margin-bottom: 12px; color: #fff;">Пиксели не найдены</p>
        <p style="font-size: 0.9rem; margin-bottom: 20px;">Нажмите кнопку "+ Добавить пиксель", чтобы внедрить новый код отслеживания.</p>
        <button class="btn btn-primary" onclick="openAddModal()">+ ДОБАВИТЬ ПЕРВЫЙ ПИКСЕЛЬ</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const badgeClass = getBadgeClass(p.type);
    const typeLabel = getTypeLabel(p.type);

    return `
      <div class="pixel-card ${p.active ? 'is-active' : 'is-disabled'}" data-id="${p.id}">
        <div class="pc-top">
          <div class="pc-badge-wrap">
            <span class="type-badge ${badgeClass}">${typeLabel}</span>
            <span class="placement-badge">&lt;${p.placement || 'head'}&gt;</span>
          </div>
          <label class="toggle-switch" title="Включить / Выключить">
            <input type="checkbox" ${p.active ? 'checked' : ''} onchange="togglePixel('${p.id}')">
            <span class="slider"></span>
          </label>
        </div>

        <h4 class="pc-title">${escapeHtml(p.name)}</h4>
        
        ${p.trackingId ? `<div class="pc-id">ID: <code>${escapeHtml(p.trackingId)}</code></div>` : ''}

        ${p.notes ? `<p class="pc-notes">${escapeHtml(p.notes)}</p>` : '<p class="pc-notes" style="font-style:italic;">Без примечания</p>'}

        <div class="pc-code-preview">${escapeHtml(p.code)}</div>

        <div class="pc-actions">
          <span class="pc-status-label ${p.active ? 'online' : 'offline'}">
            ${p.active ? '🟢 Активен на сайте' : '⚪ Отключен'}
          </span>
          <div class="pc-btn-group">
            <button class="btn-icon" onclick="editPixel('${p.id}')" title="Редактировать">
              ✏️ Изменить
            </button>
            <button class="btn-icon delete-btn" onclick="deletePixel('${p.id}')" title="Удалить">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getBadgeClass(type) {
  switch (type) {
    case 'meta_pixel': return 'badge-meta';
    case 'google_analytics': return 'badge-ga';
    case 'google_tag_manager': return 'badge-gtm';
    case 'yandex_metrika': return 'badge-ya';
    case 'tiktok_pixel': return 'badge-tt';
    default: return 'badge-custom';
  }
}

function getTypeLabel(type) {
  switch (type) {
    case 'meta_pixel': return 'Meta Pixel';
    case 'google_analytics': return 'GA4 (gtag)';
    case 'google_tag_manager': return 'GTM';
    case 'yandex_metrika': return 'Yandex Метрика';
    case 'tiktok_pixel': return 'TikTok Pixel';
    default: return 'Custom Script';
  }
}

/* ==========================================================================
   MODAL & PIXEL FORM (ADD & EDIT)
   ========================================================================== */
function initModal() {
  const modal = document.getElementById('pixelModal');
  const openBtn = document.getElementById('openAddModalBtn');
  const quickAddCard = document.getElementById('cardQuickAdd');
  const closeBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  const form = document.getElementById('pixelForm');

  window.openAddModal = () => {
    form.reset();
    document.getElementById('editPixelId').value = '';
    document.getElementById('modalTitle').textContent = 'ДОБАВИТЬ ПИКСЕЛЬ / СКРИПТ';
    document.querySelector('input[name="pixelType"][value="meta_pixel"]').checked = true;
    updateTypePreset('meta_pixel');
    modal.classList.add('open');
  };

  openBtn.addEventListener('click', window.openAddModal);
  if (quickAddCard) quickAddCard.addEventListener('click', window.openAddModal);

  function closeModal() {
    modal.classList.remove('open');
  }

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Handle Form Submission (Add or Update)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('editPixelId').value;
    const type = document.querySelector('input[name="pixelType"]:checked').value;
    const name = document.getElementById('pixelName').value.trim();
    const trackingId = document.getElementById('trackingId').value.trim();
    const placement = document.getElementById('pixelPlacement').value;
    const active = document.getElementById('pixelActive').value === 'true';
    const code = document.getElementById('pixelCode').value.trim();
    const notes = document.getElementById('pixelNotes').value.trim();

    if (!name) {
      alert('Укажите название пикселя');
      return;
    }
    if (!code && !trackingId) {
      alert('Укажите код скрипта или ID');
      return;
    }

    const payload = { name, type, trackingId, placement, active, code, notes };

    try {
      let res;
      if (id) {
        // Update existing
        res = await fetch(`/api/pixels/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new
        res = await fetch('/api/pixels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const result = await res.json();
      if (result.success) {
        showToast(id ? 'Пиксель успешно обновлен' : 'Пиксель успешно добавлен (+)');
        closeModal();
        loadPixels();
      } else {
        alert(result.message || 'Ошибка сохранения');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка сервера при сохранении');
    }
  });

  // Regenerate Code Button
  document.getElementById('regenerateCodeBtn').addEventListener('click', () => {
    const type = document.querySelector('input[name="pixelType"]:checked').value;
    const id = document.getElementById('trackingId').value.trim();
    if (!id) {
      alert('Сначала введите ID пикселя');
      return;
    }
    document.getElementById('pixelCode').value = generateSnippetClient(type, id);
    showToast('Код сгенерирован автоматически');
  });
}

function initTypeSelector() {
  const radioInputs = document.querySelectorAll('input[name="pixelType"]');
  const trackingIdInput = document.getElementById('trackingId');

  radioInputs.forEach(input => {
    input.addEventListener('change', () => {
      updateTypePreset(input.value);
    });
  });

  trackingIdInput.addEventListener('input', () => {
    const type = document.querySelector('input[name="pixelType"]:checked').value;
    const id = trackingIdInput.value.trim();
    if (type !== 'custom' && id) {
      document.getElementById('pixelCode').value = generateSnippetClient(type, id);
    }
  });
}

function updateTypePreset(type) {
  const trackingGroup = document.getElementById('trackingIdGroup');
  const trackingLabel = document.getElementById('trackingIdLabel');
  const trackingHelp = document.getElementById('trackingIdHelp');
  const trackingInput = document.getElementById('trackingId');
  const codeArea = document.getElementById('pixelCode');

  if (type === 'custom') {
    trackingGroup.style.display = 'none';
    trackingInput.required = false;
    codeArea.placeholder = '<!-- Вставьте произвольный HTML / JavaScript / Pixel код сюда -->\n<script>\n  // ваш код\n</script>';
  } else {
    trackingGroup.style.display = 'block';
    trackingInput.required = true;

    switch (type) {
      case 'meta_pixel':
        trackingLabel.textContent = 'Meta Pixel ID (Facebook)';
        trackingInput.placeholder = 'Например: 123456789012345';
        trackingHelp.textContent = 'Введите числовой Pixel ID из Meta Events Manager';
        break;
      case 'google_analytics':
        trackingLabel.textContent = 'GA4 Measurement ID';
        trackingInput.placeholder = 'Например: G-XXXXXXXXXX';
        trackingHelp.textContent = 'Идентификатор потока данных из Google Analytics (начинается с G-)';
        break;
      case 'google_tag_manager':
        trackingLabel.textContent = 'Google Tag Manager Container ID';
        trackingInput.placeholder = 'Например: GTM-XXXXXXX';
        trackingHelp.textContent = 'Идентификатор контейнера GTM';
        break;
      case 'yandex_metrika':
        trackingLabel.textContent = 'Номер счетчика Яндекс Метрики';
        trackingInput.placeholder = 'Например: 98765432';
        trackingHelp.textContent = 'Номер счетчика из кабинета Метрики';
        break;
      case 'tiktok_pixel':
        trackingLabel.textContent = 'TikTok Pixel ID';
        trackingInput.placeholder = 'Например: C1234567890ABCDEF';
        trackingHelp.textContent = 'Pixel ID из TikTok Ads Manager';
        break;
    }

    if (trackingInput.value.trim()) {
      codeArea.value = generateSnippetClient(type, trackingInput.value.trim());
    }
  }
}

function generateSnippetClient(type, id) {
  switch (type) {
    case 'google_analytics':
      return `<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${id}');\n</script>`;
    case 'meta_pixel':
      return `<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '${id}');\nfbq('track', 'PageView');\n</script>\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"\n/></noscript>\n<!-- End Meta Pixel Code -->`;
    case 'google_tag_manager':
      return `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','${id}');</script>\n<!-- End Google Tag Manager -->`;
    case 'yandex_metrika':
      return `<!-- Yandex.Metrika counter -->\n<script type="text/javascript" >\n   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};\n   m[i].l=1*new Date();\n   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}\n   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})\n   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");\n\n   ym(${id}, "init", {\n        clickmap:true,\n        trackLinks:true,\n        accurateTrackBounce:true,\n        webvisor:true\n   });\n</script>\n<noscript><div><img src="https://mc.yandex.ru/watch/${id}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>\n<!-- /Yandex.Metrika counter -->`;
    case 'tiktok_pixel':
      return `<!-- TikTok Pixel Code -->\n<script>\n!function (w, d, t) {\n  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};\n  ttq.load('${id}');\n  ttq.page();\n}(window, document, 'ttq');\n</script>\n<!-- End TikTok Pixel Code -->`;
    default:
      return '';
  }
}

// Global actions
window.togglePixel = async (id) => {
  try {
    const res = await fetch(`/api/pixels/${id}/toggle`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      loadPixels();
    }
  } catch (err) {
    showToast('Ошибка при переключении пикселя', true);
  }
};

window.editPixel = (id) => {
  const pixel = currentPixels.find(p => p.id === id);
  if (!pixel) return;

  const modal = document.getElementById('pixelModal');
  document.getElementById('editPixelId').value = pixel.id;
  document.getElementById('modalTitle').textContent = 'РЕДАКТИРОВАТЬ ПИКСЕЛЬ';
  document.getElementById('pixelName').value = pixel.name || '';
  document.getElementById('trackingId').value = pixel.trackingId || '';
  document.getElementById('pixelPlacement').value = pixel.placement || 'head';
  document.getElementById('pixelActive').value = pixel.active ? 'true' : 'false';
  document.getElementById('pixelCode').value = pixel.code || '';
  document.getElementById('pixelNotes').value = pixel.notes || '';

  const radio = document.querySelector(`input[name="pixelType"][value="${pixel.type}"]`);
  if (radio) {
    radio.checked = true;
    updateTypePreset(pixel.type);
  } else {
    document.querySelector('input[name="pixelType"][value="custom"]').checked = true;
    updateTypePreset('custom');
  }

  modal.classList.add('open');
};

window.deletePixel = async (id) => {
  const pixel = currentPixels.find(p => p.id === id);
  if (!confirm(`Удалить пиксель "${pixel ? pixel.name : id}"?`)) return;

  try {
    const res = await fetch(`/api/pixels/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Пиксель удален');
      loadPixels();
    } else {
      alert(data.message || 'Ошибка при удалении');
    }
  } catch (err) {
    showToast('Ошибка при удалении', true);
  }
};

/* ==========================================================================
   SEARCH & FILTERS
   ========================================================================== */
function initSearchAndFilters() {
  const searchInput = document.getElementById('searchPixels');
  const filterPills = document.querySelectorAll('.filter-pill');

  searchInput.addEventListener('input', () => {
    renderPixels();
  });

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.getAttribute('data-filter');
      renderPixels();
    });
  });
}

/* ==========================================================================
   EVENT SETTINGS TAB
   ========================================================================== */
async function loadEventSettings() {
  try {
    const res = await fetch('/api/event');
    const json = await res.json();
    if (json.success && json.data) {
      const { event, venue } = json.data;
      if (event) {
        if (event.title) document.getElementById('eventTitle').value = event.title;
        if (event.dateFormatted) document.getElementById('eventDate').value = `${event.dateFormatted} // ${event.dayOfWeek} ${event.time}`;
        if (event.ticketPartners) {
          const frisson = event.ticketPartners.find(p => p.id === 'frisson');
          const esora = event.ticketPartners.find(p => p.id === 'esora');
          const show4me = event.ticketPartners.find(p => p.id === 'show4me');
          if (frisson) document.getElementById('linkFrisson').value = frisson.url;
          if (esora) document.getElementById('linkEsora').value = esora.url;
          if (show4me) document.getElementById('linkShow4me').value = show4me.url;
        }
      }
      if (venue && venue.address) {
        document.getElementById('venueAddress').value = venue.address;
      }
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

function initSettingsForm() {
  const form = document.getElementById('eventSettingsForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('eventTitle').value.trim();
    const dateFormatted = document.getElementById('eventDate').value.trim();
    const address = document.getElementById('venueAddress').value.trim();
    const linkFrisson = document.getElementById('linkFrisson').value.trim();
    const linkEsora = document.getElementById('linkEsora').value.trim();
    const linkShow4me = document.getElementById('linkShow4me').value.trim();

    try {
      const getRes = await fetch('/api/event');
      const getJson = await getRes.json();
      const current = getJson.data || {};

      current.event = current.event || {};
      current.event.title = title;
      current.event.dateFormatted = dateFormatted;

      current.event.ticketPartners = [
        { id: 'frisson', name: 'Frisson', url: linkFrisson, badge: 'Официальный партнер', priceFrom: 'от 4 000 AMD' },
        { id: 'esora', name: 'Esora', url: linkEsora, badge: 'Быстрая покупка', priceFrom: 'от 4 000 AMD' },
        { id: 'show4me', name: 'Show4me', url: linkShow4me, badge: 'Международные карты', priceFrom: 'от 4 000 AMD' }
      ];

      current.venue = current.venue || {};
      current.venue.address = address;

      const updateRes = await fetch('/api/event', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current)
      });
      const updateJson = await updateRes.json();

      if (updateJson.success) {
        showToast('Параметры сохранены');
      }
    } catch (err) {
      alert('Ошибка при сохранении настроек');
    }
  });
}

/* ==========================================================================
   INSPECTION PREVIEW
   ========================================================================== */
function renderInjectionPreview() {
  const activePixels = currentPixels.filter(p => p.active);
  const headPixels = activePixels.filter(p => p.placement !== 'body');
  const bodyPixels = activePixels.filter(p => p.placement === 'body');

  const headCode = headPixels.length > 0 
    ? headPixels.map(p => `<!-- [PIXEL: ${p.name} (${p.type})] -->\n${p.code}`).join('\n\n')
    : '<!-- Нет активных скриптов для <head> -->';

  const bodyCode = bodyPixels.length > 0
    ? bodyPixels.map(p => `<!-- [PIXEL: ${p.name} (${p.type})] -->\n${p.code}`).join('\n\n')
    : '<!-- Нет активных скриптов для <body> -->';

  document.getElementById('injectedHeadCode').textContent = headCode;
  document.getElementById('injectedBodyCode').textContent = bodyCode;

  document.getElementById('copyHeadCodeBtn').onclick = () => {
    navigator.clipboard.writeText(headCode);
    showToast('Код <head> скопирован');
  };
  document.getElementById('copyBodyCodeBtn').onclick = () => {
    navigator.clipboard.writeText(bodyCode);
    showToast('Код <body> скопирован');
  };
}

/* ==========================================================================
   HELPERS & TOAST
   ========================================================================== */
function showToast(msg, isError = false) {
  const container = document.getElementById('adminToastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'admin-toast';
  if (isError) toast.style.borderColor = 'var(--accent-red)';
  toast.textContent = msg;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
