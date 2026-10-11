/**
 * MOTOR YEREVAN - Broadwick Live Interactive Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initCopyAddress();
  initPartnerClickTracking();
  initSmoothScroll();
});

/**
 * Live Countdown Timer to Event Target Date
 */
function initCountdown() {
  const timerElement = document.getElementById('countdownTimer');
  if (!timerElement) return;

  const targetDateStr = timerElement.getAttribute('data-target') || '2026-10-24T17:00:00+04:00';
  const targetDate = new Date(targetDateStr).getTime();

  const daysEl = document.getElementById('cdDays');
  const hoursEl = document.getElementById('cdHours');
  const minutesEl = document.getElementById('cdMinutes');
  const secondsEl = document.getElementById('cdSeconds');

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minutesEl) minutesEl.textContent = '00';
      if (secondsEl) secondsEl.textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

/**
 * One-click copy venue address to clipboard
 */
function initCopyAddress() {
  const addressText = document.getElementById('venueAddressText');
  const copyBtn = document.getElementById('copyAddressBtn');
  const copyHeroBtn = document.getElementById('copyAddressHeroBtn');
  const copyBtnText = document.getElementById('copyBtnText');

  const addrString = addressText ? addressText.textContent.trim() : '28 Marksi poxoc, Yerevan 0018, Armenia';

  async function performCopy(btnEl, customTextEl) {
    try {
      await navigator.clipboard.writeText(addrString);
      if (customTextEl) customTextEl.textContent = 'COPIED!';
      showToast('Address copied: ' + addrString);

      setTimeout(() => {
        if (customTextEl) customTextEl.textContent = 'COPY ADDRESS';
      }, 2500);
    } catch (err) {
      fallbackCopyText(addrString);
    }
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => performCopy(copyBtn, copyBtnText));
  }
  if (copyHeroBtn) {
    const heroBtnSpan = copyHeroBtn.querySelector('span');
    copyHeroBtn.addEventListener('click', () => performCopy(copyHeroBtn, heroBtnSpan));
  }
}

function fallbackCopyText(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Address copied: ' + text);
  } catch (err) {
    showToast('Failed to copy address');
  }
  document.body.removeChild(textArea);
}

/**
 * Click Tracking for Ticket Partners
 */
function initPartnerClickTracking() {
  const partnerButtons = document.querySelectorAll('[data-partner]');
  partnerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const partnerName = btn.getAttribute('data-partner');
      console.log(`[Tracking] Ticket partner click: ${partnerName}`);

      // Push to dataLayer if GA4 / GTM active
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'ticket_partner_click',
          partner: partnerName,
          event_name: 'ISHOME Live in Yerevan 24 oct'
        });
      }

      // Meta Pixel trackCustom if fbq active
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', 'TicketPartnerClick', {
          partner: partnerName,
          content_name: 'ISHOME Live in Yerevan 24 oct'
        });
      }
    });
  });
}

/**
 * Smooth anchor scrolling
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

/**
 * Toast Notification Popup
 */
function showToast(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}
