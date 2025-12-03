const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.22 });
reveals.forEach((el) => observer.observe(el));

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

const SUPERFRETE_URL = '/api/superfrete';
const getToken = () => '';
const formatBRL = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const freteForm = document.querySelector('#frete-form');
const freteResult = document.querySelector('#frete-result');
const hoverGallery = document.querySelector('#hover-gallery');
const hoverImages = hoverGallery ? hoverGallery.querySelectorAll('.hover-image') : [];
const hoverPills = hoverGallery ? hoverGallery.querySelectorAll('.hover-pill') : [];
const preReservaDateEl = document.querySelector('#pre-reserva-date');
const topbar = document.querySelector('.topbar');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav-links');
const heroSection = document.querySelector('#hero');

let lastScroll = 0;
let heroVisible = true;

if (heroSection) {
  const heroObserver = new IntersectionObserver(
    ([entry]) => {
      heroVisible = entry.isIntersecting;
      if (heroVisible && topbar) topbar.classList.remove('hidden');
    },
    { threshold: 0.35 }
  );
  heroObserver.observe(heroSection);
}

if (topbar) {
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    const delta = current - lastScroll;
    if (delta > 4) {
      topbar.classList.add('hidden');
    } else if (delta < -6 && heroVisible) {
      topbar.classList.remove('hidden');
    }
    lastScroll = current;
  });
}

if (menuToggle && nav) {
  const closeMenu = () => {
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
  };
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    nav.classList.toggle('open', isOpen);
  });
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeMenu());
  });
}

function setHoverSlide(index) {
  hoverImages.forEach((img, i) => {
    img.classList.toggle('active', i === index);
  });
}

hoverPills.forEach((pill) => {
  const handler = () => {
    const idx = Number(pill.dataset.index);
    setHoverSlide(idx);
  };
  pill.addEventListener('mouseenter', handler);
  pill.addEventListener('focus', handler);
});

async function calcularFrete(event) {
  event.preventDefault();
  const formData = new FormData(freteForm);
  const origin = (formData.get('cep-origem') || '18960031').replace(/\D/g, '');
  const destination = (formData.get('cep-destino') || '').replace(/\D/g, '');
  const peso = Number(formData.get('peso') || 900);
  const altura = Number(formData.get('altura') || 8);
  const largura = Number(formData.get('largura') || 22);
  const comprimento = Number(formData.get('comprimento') || 22);
  const valor = 229;
  const services = (formData.get('services') || '').trim();
  const receipt = false;
  const ownHand = false;
  const token = getToken();

  if (!origin || !destination || String(destination).length < 8) {
    freteResult.innerHTML = '<p class="muted">Informe CEP de origem e CEP de destino válidos.</p>';
    return;
  }
  if (!services) {
    freteResult.innerHTML = '<p class="muted">Informe ao menos um ID de serviço (ex: 1,2,17).</p>';
    return;
  }

  freteResult.innerHTML = '<p class="muted">Consultando fretes na Superfrete...</p>';

  const payload = {
    from: { postal_code: origin },
    to: { postal_code: destination },
    services,
    package: {
      weight: peso / 1000,
      width: largura,
      height: altura,
      length: comprimento,
    },
    insurance_value: valor,
    options: {
      receipt,
      own_hand: ownHand,
    },
  };

  try {
    const response = await fetch(SUPERFRETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    const quotes = Array.isArray(data) ? data : data?.quotes || data?.data || [];

    if (!quotes.length) {
      freteResult.innerHTML = '<p class="muted">Nenhuma opção retornada para esses parâmetros.</p>';
      return;
    }

    const list = quotes.map((option) => {
      const name = option.name || option.service || 'Opção';
      const price = option.price || option.cost || 0;
      const deadline = option.delivery_time || option.deadline || option.deadline_days;
      const min = option.delivery_range?.min;
      const max = option.delivery_range?.max;
      const prazo = deadline || (min || max ? `${min || max} - ${max || min}` : null);
      const company = option.company?.name || '';
      const logo = option.company?.picture;

      return `<div class="quote">
        <div class="quote-left">
          <strong>${name}${company ? ` · ${company}` : ''}</strong>
          <p class="muted">Prazo: ${prazo ? `${prazo} dias úteis` : 'consulte'}</p>
        </div>
        <div class="quote-right">
          ${logo ? `<span class="quote-badge"><img src="${logo}" alt="${company || name}" class="quote-logo">Correios</span>` : ''}
          <span class="quote-price">${formatBRL(price)}</span>
        </div>
      </div>`;
    }).join('');

    freteResult.innerHTML = `<div class="quote-list">${list}</div>`;
  } catch (error) {
    freteResult.innerHTML = `<p class="muted">Não foi possível calcular agora. ${error.message || 'Erro desconhecido'}.</p>`;
  }
}

if (freteForm && freteResult) {
  freteForm.addEventListener('submit', calcularFrete);
}

if (preReservaDateEl) {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  preReservaDateEl.textContent = formatter.format(future);
}

const footerYear = document.querySelector('#footer-year');
if (footerYear) {
  footerYear.textContent = new Date().getFullYear();
}
