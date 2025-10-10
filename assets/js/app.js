/* ====== MoTech - app.js (Firestore comments + étoiles) ====== */

document.addEventListener('DOMContentLoaded', () => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const enc = (s)=>encodeURIComponent(s);

  /* Footer year */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* Smooth scroll */
  $$('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id=a.getAttribute('href'); const el=id && id!=='#' ? $(id) : null;
      if (!el) return;
      e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  /* Tous les boutons « Prendre RDV » → scroll + coche l’option RDV */
  function flagRDV(){
    const toggle = $('#cr-want-rdv'); if(toggle){ toggle.checked = true; toggle.dispatchEvent(new Event('change')); }
    $('#contact-rdv')?.scrollIntoView({behavior:'smooth', block:'start'});
  }
  $$('.prendre-rdv').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.preventDefault(); flagRDV(); });
  });

  /* ===== Modale service ===== */
  (function(){
    const modal   = $('#service-modal'); if(!modal) return;
    const titleEl = $('#sm-title'),  descEl = $('#sm-desc');
    const iconEl  = $('#sm-icon'),   bulletsEl = $('#sm-bullets');
    const exTEl   = $('#sm-ex-title'), exDEl = $('#sm-ex-desc');

    function open(d){
      iconEl.textContent = d.icon || '💡';
      titleEl.textContent = d.title || 'Service';
      descEl.textContent  = d.desc  || '';
      bulletsEl.innerHTML = (d.bullets||[]).map(b=>`<li>${b}</li>`).join('');
      exTEl.textContent   = d.exTitle || '';
      exDEl.textContent   = d.exDesc  || '';
      modal.hidden=false; document.body.style.overflow='hidden';
    }
    function close(){ modal.hidden=true; document.body.style.overflow=''; }
    modal.addEventListener('click', (e)=>{
      if (e.target.closest('[data-close]') || e.target.classList.contains('modal-backdrop')) close();
    });
    $$('#services [data-service]').forEach(card=>{
      const data = {
        title: card.getAttribute('data-title'),
        icon:  card.getAttribute('data-icon'),
        desc:  card.getAttribute('data-desc'),
        bullets: (card.getAttribute('data-bullets')||'').split('|').filter(Boolean),
        exTitle: card.getAttribute('data-ex-title'),
        exDesc:  card.getAttribute('data-ex-desc'),
      };
      const openIt = (e)=>{ e.preventDefault(); open(data); };
      card.addEventListener('click', openIt);
      card.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ openIt(e);} });
    });
  })();

  /* ===== Contact + RDV (mailto) ===== */
  (function(){
    const form = $('#contact-rdv-form'); if(!form) return;
    const status = $('.form-status', form);

    const want = $('#cr-want-rdv');
    const rdvFields = $('#cr-rdv-fields');
    want?.addEventListener('change', ()=>{ rdvFields.hidden = !want.checked; });

    const dateI = $('#cr-date'), timeI = $('#cr-time');
    const slots = $('#cr-slots'), hint = $('#cr-slots-hint');
    const OPEN=11, CLOSE=21, STEP=30;
    (function setMin(){
      if (!dateI) return;
      const now=new Date(), min=new Date(); if(now.getHours()>=CLOSE) min.setDate(min.getDate()+1);
      dateI.min=min.toISOString().slice(0,10);
    })();
    function isWeekday(d){ const day=d.getDay(); return day>=1&&day<=5; }
    function fmt(h,m){ return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
    function buildSlots(dateStr){
      if(!slots) return; slots.innerHTML=''; if(hint) hint.hidden=true; if(!dateStr) return;
      const d=new Date(dateStr+'T00:00:00'); if(!isWeekday(d)){ hint.hidden=false; hint.textContent='Sélectionnez un jour ouvré (lun-ven).'; return; }
      for(let h=OPEN; h<CLOSE; h++){ for(let m=0; m<60; m+=STEP){
        const t=fmt(h,m); const b=document.createElement('button');
        b.type='button'; b.className='slot'; b.textContent=t; b.setAttribute('aria-pressed','false');
        b.addEventListener('click', ()=>{ slots.querySelectorAll('.slot[aria-pressed="true"]').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed','true'); timeI.value=t; timeI.focus(); });
        slots.appendChild(b);
      }}}
    dateI?.addEventListener('change', ()=> buildSlots(dateI.value));

    function openEmail(to, subject, body){
      const mailtoURL = `mailto:${to}?subject=${enc(subject)}&body=${enc(body)}`;
      window.location.href = mailtoURL;
    }

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = $('#cr-name')?.value.trim() || '';
      const email= $('#cr-email')?.value.trim() || '';
      const msg  = $('#cr-message')?.value.trim() || '';
      const okEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!name||!okEmail||!msg){ status.textContent='Champs invalides.'; return; }

      const to = 'contact.workings@gmail.com';
      let subject = `Contact MoTech — ${name}`;
      let body = `Contact :

Nom : ${name}
Email : ${email}

Message :
${msg}`;

      if ($('#cr-want-rdv')?.checked){
        const date = ($('#cr-date')?.value||'').trim();
        const time = ($('#cr-time')?.value||'').trim();
        if (!date || !time){ status.textContent='Choisissez la date/heure du RDV.'; return; }
        subject = 'Demande de rendez-vous';
        body = `Demande de rendez-vous :

Nom : ${name}
Email : ${email}
Date : ${date}
Heure : ${time}

Notes :
${msg}`;
      }

      status.textContent='Ouverture de votre client mail…';
      openEmail(to, subject, body);
    });
  })();

  /* ===== Avis & commentaires (Firestore) ===== */
  (function(){
    // Init Firebase
    if (!window.FIREBASE_CONFIG) { console.error('Firebase config manquante'); return; }
    if (!window.firebase?.apps?.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    const db = firebase.firestore();
    const ref = db.collection('comments');

    const list    = $('#comments-list');
    const form    = $('#comment-form');
    const status  = $('#c-status');
    const starsUI = $$('#rating-stars .star');
    const avgEl   = $('#rating-avg');
    const countEl = $('#rating-count');

    let currentRating = 0;

    function paintStars(n){
      starsUI.forEach(s=>{
        const v = Number(s.dataset.value||0);
        s.classList.toggle('active', v <= n);
      });
    }
    starsUI.forEach(s=>{
      s.addEventListener('click', ()=>{
        currentRating = Number(s.dataset.value||0);
        paintStars(currentRating);
      });
    });

    function render(items){
      list.innerHTML = items.map(c=>`
        <div class="comment">
          <div class="who">${(c.name||'Anonyme')} ${c.company?`• <span class="meta">${c.company}</span>`:''}</div>
          <div class="meta">${c.createdAt ? c.createdAt.toDate().toLocaleString() : ''}</div>
          <div class="stars-display">${'★'.repeat(c.rating||0)}${'☆'.repeat(5-(c.rating||0))}</div>
          <p>${(c.text||'').replace(/</g,'&lt;')}</p>
        </div>
      `).join('') || '<p class="muted">Aucun commentaire pour le moment.</p>';
    }
    function refreshStats(items){
      const count = items.length;
      if(!count){ avgEl.textContent='–'; countEl.textContent='0'; return; }
      const sum = items.reduce((a,c)=>a + (c.rating||0), 0);
      const avg = (sum / count).toFixed(1);
      avgEl.textContent = avg;
      countEl.textContent = String(count);
    }

    // Live update (partagé mondialement)
    ref.orderBy('createdAt', 'desc').onSnapshot(snap=>{
      const items = snap.docs.map(d=>d.data());
      render(items);
      refreshStats(items);
    });

    // Soumission avis = note sélectionnée + commentaire
    form?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = $('#c-name')?.value.trim() || 'Anonyme';
      const company = $('#c-company')?.value.trim() || '';
      const text = $('#c-text')?.value.trim() || '';
      if (!currentRating || !text){ status.textContent='Sélectionne une note et écris un commentaire.'; return; }

      status.textContent='Publication…';
      try{
        await ref.add({
          name, company, text,
          rating: currentRating,
          userAgent: navigator.userAgent,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        form.reset();
        currentRating = 0; paintStars(0);
        status.textContent='Merci pour votre avis !';
        setTimeout(()=>status.textContent='', 1500);
      }catch(err){
        console.error(err);
        status.textContent='Erreur de publication.';
      }
    });
  })();

  /* === Burger & FAB === */
  ;(function(){
    const btn = document.getElementById('burger');
    const mm  = document.getElementById('mobile-menu');
    if(btn && mm){
      const panel = mm.querySelector('.mobile-panel');
      const open = ()=>{ mm.hidden=false; btn.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; (panel.querySelector('a,button')||panel).focus(); }
      const close= ()=>{ mm.hidden=true; btn.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
      btn.addEventListener('click', ()=>{ (mm.hidden?open:close)(); });
      mm.addEventListener('click', (e)=>{ if(e.target.closest('[data-close]') || e.target.classList.contains('mobile-backdrop')) close(); });
      mm.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click', ()=>close()));
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && !mm.hidden) close(); });
    }
    const fab = document.getElementById('fabMenu');
    if(fab && mm){
      const panel = mm.querySelector('.mobile-panel');
      const open = ()=>{ mm.hidden=false; fab.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; (panel.querySelector('a,button')||panel).focus(); }
      const close= ()=>{ mm.hidden=true; fab.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
      fab.addEventListener('click', ()=>{ (mm.hidden?open:close)(); });
      mm.addEventListener('click', (e)=>{ if(e.target.closest('[data-close]') || e.target.classList.contains('mobile-backdrop')) close(); });
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && !mm.hidden) close(); });
    }
  })();

  /* ==================== MODALE SERVICE ==================== */
  (function(){
    const modal   = document.getElementById('service-modal'); if(!modal) return;
    const titleEl = document.getElementById('sm-title');
    const descEl  = document.getElementById('sm-desc');
    const iconEl  = document.getElementById('sm-icon');
    const bulletsEl = document.getElementById('sm-bullets');
    const exTEl   = document.getElementById('sm-ex-title');
    const exDEl   = document.getElementById('sm-ex-desc');

    function open(d){
      iconEl.textContent = d.icon || '💡';
      titleEl.textContent = d.title || 'Service';
      descEl.textContent  = d.desc  || '';
      bulletsEl.innerHTML = (d.bullets||[]).map(b=>`<li>${b}</li>`).join('');
      exTEl.textContent   = d.exTitle || '';
      exDEl.textContent   = d.exDesc  || '';
      modal.hidden=false; document.body.style.overflow='hidden';
    }
    function close(){ modal.hidden=true; document.body.style.overflow=''; }

    modal.addEventListener('click', (e)=>{
      if (e.target.closest('[data-close]') || e.target.classList.contains('modal-backdrop')) close();
    });
    modal.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click', ()=>close()));

    document.querySelectorAll('#services [data-service]').forEach(card=>{
      const data = {
        title: card.getAttribute('data-title'),
        icon:  card.getAttribute('data-icon'),
        desc:  card.getAttribute('data-desc'),
        bullets: (card.getAttribute('data-bullets')||'').split('|').filter(Boolean),
        exTitle: card.getAttribute('data-ex-title'),
        exDesc:  card.getAttribute('data-ex-desc'),
      };
      const openIt = (e)=>{ e.preventDefault(); open(data); };
      card.addEventListener('click', openIt);
      card.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ openIt(e);} });
    });
  })();

});

/* ===== MENU BURGER (auto-montage + logique) ===== */
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const siteHeader = document.querySelector('header');
    if(!siteHeader) return;

    // 1) Bouton burger (créé si absent)
    let burger = document.getElementById('menu-toggle');
    if(!burger){
      burger = document.createElement('button');
      burger.id = 'menu-toggle';
      burger.type = 'button';
      burger.setAttribute('aria-label','Ouvrir le menu');
      burger.innerHTML = '☰';
      // on place le bouton à la fin du header (à côté du CTA)
      siteHeader.appendChild(burger);
    }

    // 2) Construire le drawer + overlay si absents
    let overlay = document.querySelector('.mobile-overlay');
    let drawer  = document.querySelector('.mobile-drawer');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'mobile-overlay';
      document.body.appendChild(overlay);
    }
    if(!drawer){
      drawer = document.createElement('aside');
      drawer.className = 'mobile-drawer';
      drawer.setAttribute('role','dialog');
      drawer.setAttribute('aria-modal','true');

      // Récupère les liens existants du header
      const desktopLinks = Array.from(document.querySelectorAll('header nav a'));
      const nav = document.createElement('nav');
      if(desktopLinks.length){
        desktopLinks.forEach(a=>{
          const link = document.createElement('a');
          link.href = a.getAttribute('href') || '#';
          link.textContent = a.textContent.trim();
          nav.appendChild(link);
        });
      }else{
        // fallback si nav introuvable
        ['#home|Accueil','#services|Services','#about|À propos','#contact-rdv|Prendre RDV'].forEach(s=>{
          const [h,t] = s.split('|');
          const link = document.createElement('a'); link.href=h; link.textContent=t; nav.appendChild(link);
        });
      }

      // Titre + bouton fermer
      const head = document.createElement('header');
      const title = document.createElement('div');
      title.style.fontWeight='800'; title.style.fontSize='18px';
      title.textContent = 'Menu';
      const closeBtn = document.createElement('button');
      closeBtn.type='button';
      closeBtn.className='btn-close';
      closeBtn.textContent='✕';
      closeBtn.style.fontSize='20px';
      closeBtn.style.background='none';
      closeBtn.style.border='none';
      closeBtn.style.cursor='pointer';
      head.appendChild(title); head.appendChild(closeBtn);

      // CTA principal
      const cta = document.createElement('a');
      cta.href = '#contact-rdv';
      cta.className = 'cta';
      cta.textContent = 'Prendre RDV';

      drawer.appendChild(head);
      drawer.appendChild(nav);
      drawer.appendChild(cta);
      document.body.appendChild(drawer);

      // Fermeture
      const close = () => { document.body.classList.remove('mobile-open'); burger.setAttribute('aria-expanded','false'); };
      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', close);
      nav.querySelectorAll('a').forEach(a=>a.addEventListener('click', close));
      cta.addEventListener('click', close);
      window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });

      // Ouverture
      const open = () => { document.body.classList.add('mobile-open'); burger.setAttribute('aria-expanded','true'); };
      burger.addEventListener('click', ()=>{
        if(document.body.classList.contains('mobile-open')) {
          document.body.classList.remove('mobile-open');
          burger.setAttribute('aria-expanded','false');
        }else{
          open();
        }
      });
    }
  });
})();

/* ===== MENU BURGER (auto-montage + logique) ===== */
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const siteHeader = document.querySelector('header');
    if(!siteHeader) return;

    // 1) Bouton burger (créé si absent)
    let burger = document.getElementById('menu-toggle');
    if(!burger){
      burger = document.createElement('button');
      burger.id = 'menu-toggle';
      burger.type = 'button';
      burger.setAttribute('aria-label','Ouvrir le menu');
      burger.innerHTML = '☰';
      // on place le bouton à la fin du header (à côté du CTA)
      siteHeader.appendChild(burger);
    }

    // 2) Construire le drawer + overlay si absents
    let overlay = document.querySelector('.mobile-overlay');
    let drawer  = document.querySelector('.mobile-drawer');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'mobile-overlay';
      document.body.appendChild(overlay);
    }
    if(!drawer){
      drawer = document.createElement('aside');
      drawer.className = 'mobile-drawer';
      drawer.setAttribute('role','dialog');
      drawer.setAttribute('aria-modal','true');

      // Récupère les liens existants du header
      const desktopLinks = Array.from(document.querySelectorAll('header nav a'));
      const nav = document.createElement('nav');
      if(desktopLinks.length){
        desktopLinks.forEach(a=>{
          const link = document.createElement('a');
          link.href = a.getAttribute('href') || '#';
          link.textContent = a.textContent.trim();
          nav.appendChild(link);
        });
      }else{
        // fallback si nav introuvable
        ['#home|Accueil','#services|Services','#about|À propos','#contact-rdv|Prendre RDV'].forEach(s=>{
          const [h,t] = s.split('|');
          const link = document.createElement('a'); link.href=h; link.textContent=t; nav.appendChild(link);
        });
      }

      // Titre + bouton fermer
      const head = document.createElement('header');
      const title = document.createElement('div');
      title.style.fontWeight='800'; title.style.fontSize='18px';
      title.textContent = 'Menu';
      const closeBtn = document.createElement('button');
      closeBtn.type='button';
      closeBtn.className='btn-close';
      closeBtn.textContent='✕';
      closeBtn.style.fontSize='20px';
      closeBtn.style.background='none';
      closeBtn.style.border='none';
      closeBtn.style.cursor='pointer';
      head.appendChild(title); head.appendChild(closeBtn);

      // CTA principal
      const cta = document.createElement('a');
      cta.href = '#contact-rdv';
      cta.className = 'cta';
      cta.textContent = 'Prendre RDV';

      drawer.appendChild(head);
      drawer.appendChild(nav);
      drawer.appendChild(cta);
      document.body.appendChild(drawer);

      // Fermeture
      const close = () => { document.body.classList.remove('mobile-open'); burger.setAttribute('aria-expanded','false'); };
      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', close);
      nav.querySelectorAll('a').forEach(a=>a.addEventListener('click', close));
      cta.addEventListener('click', close);
      window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });

      // Ouverture
      const open = () => { document.body.classList.add('mobile-open'); burger.setAttribute('aria-expanded','true'); };
      burger.addEventListener('click', ()=>{
        if(document.body.classList.contains('mobile-open')) {
          document.body.classList.remove('mobile-open');
          burger.setAttribute('aria-expanded','false');
        }else{
          open();
        }
      });
    }
  });
})();

/* ===== FIX MOBILE BURGER — position + événements ===== */
(function(){
  const ensureBurgerReady = () => {
    // Supprimer doublons si jamais (#menu-toggle multiples)
    const toggles = Array.from(document.querySelectorAll('#menu-toggle'));
    if (toggles.length > 1) {
      toggles.slice(1).forEach(n => n.remove());
    }
    let burger = document.getElementById('menu-toggle');
    if (!burger) {
      // créer si absent
      burger = document.createElement('button');
      burger.id = 'menu-toggle';
      burger.type = 'button';
      burger.setAttribute('aria-label','Ouvrir le menu');
      burger.textContent = '☰';
      burger.style.display = 'none'; // sera visible via CSS mobile
      document.body.appendChild(burger);
    } else {
      // s'assurer qu'il est bien dans <body> (pas perdu en bas de page)
      if (burger.parentElement !== document.body) {
        document.body.appendChild(burger);
      }
    }

    // Overlay + Drawer
    let overlay = document.querySelector('.mobile-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mobile-overlay';
      document.body.appendChild(overlay);
    }
    let drawer = document.querySelector('.mobile-drawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.className = 'mobile-drawer';
      drawer.setAttribute('role','dialog');
      drawer.setAttribute('aria-modal','true');

      const head = document.createElement('header');
      const title = document.createElement('div');
      title.textContent = 'Menu';
      title.style.fontWeight='800'; title.style.fontSize='18px';
      const closeBtn = document.createElement('button');
      closeBtn.type='button'; closeBtn.textContent='✕';
      closeBtn.style.cssText='font-size:20px;background:none;border:none;cursor:pointer;';
      head.appendChild(title); head.appendChild(closeBtn);

      const nav = document.createElement('nav');
      const desktopLinks = Array.from(document.querySelectorAll('header nav a'));
      if (desktopLinks.length) {
        desktopLinks.forEach(a => {
          const link = document.createElement('a');
          link.href = a.getAttribute('href') || '#';
          link.textContent = a.textContent.trim();
          nav.appendChild(link);
        });
      } else {
        ['#home|Accueil','#services|Services','#about|À propos','#contact-rdv|Prendre RDV'].forEach(s=>{
          const [h,t]=s.split('|'); const a=document.createElement('a'); a.href=h; a.textContent=t; nav.appendChild(a);
        });
      }
      const cta = document.createElement('a');
      cta.href='#contact-rdv'; cta.className='cta'; cta.textContent='Prendre RDV';

      drawer.appendChild(head); drawer.appendChild(nav); drawer.appendChild(cta);
      document.body.appendChild(drawer);

      const close = ()=>{ document.body.classList.remove('mobile-open'); burger.setAttribute('aria-expanded','false'); };
      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', close);
      nav.querySelectorAll('a').forEach(a=>a.addEventListener('click', close));
      cta.addEventListener('click', close);
      window.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });

      burger.addEventListener('click', ()=>{
        const opened = document.body.classList.toggle('mobile-open');
        burger.setAttribute('aria-expanded', opened ? 'true' : 'false');
      });
    } else {
      // Drawer existe déjà → rebind sécurisés
      const close = ()=>{ document.body.classList.remove('mobile-open'); burger.setAttribute('aria-expanded','false'); };
      overlay.addEventListener('click', close);
      drawer.querySelectorAll('nav a,.cta').forEach(a=>a.addEventListener('click', close));
      burger.onclick = ()=>{
        const opened = document.body.classList.toggle('mobile-open');
        burger.setAttribute('aria-expanded', opened ? 'true' : 'false');
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureBurgerReady);
  } else {
    ensureBurgerReady();
  }
})();
