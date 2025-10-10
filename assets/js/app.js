/* ===============================
   MoTech — app.js (emails multi-fournisseurs)
   =============================== */

/* Config globale */
window.MOTECH_FORMS  = 'mailto';
window.MOTECH_MAILTO = 'contact.workings@gmail.com'; // ← destinataire (toi)

document.addEventListener('DOMContentLoaded', () => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const enc = (s) => encodeURIComponent(s).replace(/%20/g, '+');

  /* ---------- Ouverture email : mailto d’abord, fallback webmail selon le domaine expéditeur ---------- */
  function providerFrom(email){
    const m = String(email||'').toLowerCase().match(/@([^@]+)$/);
    const d = m ? m[1] : '';
    // principaux domaines → URL de composition
    if (/(gmail\.com|googlemail\.com)$/.test(d))
      return (to,sub,body)=>`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;

    if (/(outlook\.com|hotmail\.com|live\.com|msn\.com)$/.test(d))
      return (to,sub,body)=>`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;

    if (/(yahoo\.[a-z]+)$/.test(d))
      return (to,sub,body)=>`https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;

    if (/(proton\.me|protonmail\.com)$/.test(d))
      // Proton nécessite une session ; on ouvre la boîte, le message est pré-rempli via mailto juste avant.
      return ()=>`https://mail.proton.me/u/0/inbox`;

    if (/(icloud\.com|me\.com|mac\.com)$/.test(d))
      // iCloud Mail fonctionne très bien avec le client par défaut → pas d’URL compose publique stable
      return null;

    if (/(gmx\.[a-z]+|zoho\.[a-z]+)$/.test(d))
      // Beaucoup bloquent les deep-links compose → on laisse mailto faire le job
      return null;

    return null; // inconnu → on garde mailto
  }

  function openEmail(to, subject, body, opts={}){
    const fromEmail = opts.from || '';
    const mailtoURL = `mailto:${to}?subject=${enc(subject)}&body=${enc(body)}`;

    // 1) mailto (client par défaut : Apple Mail, Outlook, Thunderbird, Gmail Desktop, etc.)
    window.location.href = mailtoURL;

    // 2) Fallback : si un email expéditeur est fourni, on tente d’ouvrir son webmail après un court délai
    const composer = providerFrom(fromEmail);
    if (composer){
      const t = setTimeout(()=>{
        const url = composer(to, subject, body);
        if (url) window.open(url, '_blank', 'noopener');
      }, 900);
      window.addEventListener('pagehide', ()=>clearTimeout(t), {once:true});
    }
  }

  /* ---------- Année footer ---------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Smooth scroll pour les ancres (hors mailto) ---------- */
  $$('a[href^="#"]:not([data-mailto])').forEach(a=>{
    a.addEventListener('click', e=>{
      const id = a.getAttribute('href'); const el = id && id !== '#' ? $(id) : null;
      if (!el) return; e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  /* ---------- CTA « Prendre RDV » → ouvre email (sans fournisseur connu) ---------- */
  (function(){
    const to = window.MOTECH_MAILTO || 'contact@example.com';
    $$('a[data-mailto]').forEach(a=>{
      a.addEventListener('click', (e)=>{
        e.preventDefault();
        const subject = 'Demande de rendez-vous';
        const body =
`Demande de rendez-vous :

Nom : (à préciser)
Email : (à préciser)
Date : __/__/____
Heure : __:__

Notes :
(à préciser)`;
        // Pas d'email expéditeur ici → pas de fallback ciblé (le client par défaut s'ouvrira)
        openEmail(to, subject, body);
      });
    });
  })();

  /* ---------- Modale Services ---------- */
  (function(){
    const modal = $('#service-modal'); if(!modal) return;
    const dialog   = $('.modal-dialog', modal);
    const titleEl  = $('#service-modal-title', modal);
    const descEl   = $('#service-modal-desc', modal);
    const imgEl    = $('#service-modal-img', modal);
    const capEl    = $('#service-modal-caption', modal);
    const contentEl= $('#service-modal-content', modal);
    let lastFocused=null;

    function open(data){
      lastFocused=document.activeElement;
      titleEl.textContent = data.title || 'Détail du service';
      descEl.textContent  = data.desc  || '';
      if (data.img){ imgEl.src = data.img; imgEl.alt = data.caption || ''; }
      capEl.textContent = data.caption || '';
      contentEl.innerHTML = `<p>${(data.descLong || 'Exemples de travaux réalisés :')}</p>
      <ul>${(data.bullets||[]).map(b=>`<li>${b}</li>`).join('')}</ul>`;
      modal.hidden=false; document.body.style.overflow='hidden';
      const f = dialog.querySelector('a,button'); f && f.focus();
      function onKey(e){ if(e.key==='Escape') close(); }
      dialog._onKey = onKey; document.addEventListener('keydown', onKey);
    }
    function close(){
      modal.hidden=true; document.body.style.overflow='';
      document.removeEventListener('keydown', dialog._onKey || (()=>{}));
      if (lastFocused) lastFocused.focus();
    }
    modal.addEventListener('click', (e)=>{
      if (e.target.closest('[data-close]') || e.target.classList.contains('modal-backdrop')) {
        setTimeout(close, 0);
      }
    });
    $$('#services .card[data-service="true"]').forEach(card=>{
      const data = {
        title:   card.getAttribute('data-title'),
        img:     card.getAttribute('data-img'),
        caption: card.getAttribute('data-caption'),
        desc:    card.getAttribute('data-desc'),
        bullets: (card.getAttribute('data-bullets')||'').split('|').filter(Boolean),
      };
      card.addEventListener('click', ()=> open(data));
      card.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(data); }});
    });
  })();

  /* ---------- Pop-up auto (5s, 1×/jour) ---------- */
  (function(){
    const pop = $('#auto-pop'); if(!pop) return;
    const box = $('.auto-pop-box', pop);
    const LS_KEY = 'motech_autopop_day';
    const d = new Date(); const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    if (localStorage.getItem(LS_KEY) === key) return;
    setTimeout(()=>{ open(); }, 5000);
    function open(){ pop.hidden=false; document.body.style.overflow='hidden'; localStorage.setItem(LS_KEY,key);
      const f = box.querySelector('a,button'); f && f.focus();
      function onKey(e){ if(e.key==='Escape') close(); }
      box._onKey = onKey; document.addEventListener('keydown', onKey);
    }
    function close(){ pop.hidden=true; document.body.style.overflow='';
      document.removeEventListener('keydown', box._onKey || (()=>{}));
    }
    pop.addEventListener('click', (e)=>{
      if (e.target.closest('[data-close]') || e.target.classList.contains('auto-pop-backdrop')) setTimeout(close,0);
    });
  })();

  /* ---------- Formulaire Contact : format simple ---------- */
  (function(){
    const form = $('#contact-form'); if(!form) return;
    const status = $('.form-status', form);
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = (form.querySelector('#name')?.value || '').trim();
      const email= (form.querySelector('#email')?.value || '').trim();
      const msg  = (form.querySelector('#message')?.value || '').trim();
      const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!name||!isEmail||!msg){ status.textContent='Champs invalides.'; return; }
      const to = window.MOTECH_MAILTO || 'contact@example.com';
      const subject = `Contact MoTech — ${name}`;
      const body =
`Contact :

Nom : ${name}
Email : ${email}

Message :
${msg}`;
      status.textContent='Ouverture de votre client mail…';
      openEmail(to, subject, body, { from: email });
    });
  })();

  /* ---------- Formulaire RDV : format EXACT demandé + créneaux ---------- */
  (function(){
    const rForm = $('#rdv-form'); if(!rForm) return;
    const status = $('.form-status', rForm);
    const dateI = $('#rdv-date'); const timeI = $('#rdv-time');

    const OPEN=11, CLOSE=21, STEP=30;
    (function setMin(){
      const now = new Date(), min = new Date();
      if (now.getHours() >= CLOSE) min.setDate(min.getDate()+1);
      if (dateI) dateI.min = min.toISOString().slice(0,10);
    })();

    const slotsWrap = $('#slots'); const hint = $('#slots-hint');
    function isWeekday(d){ const day=d.getDay(); return day>=1 && day<=5; }
    function fmt(h,m){ return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
    function buildSlots(dateStr){
      if(!slotsWrap) return;
      slotsWrap.innerHTML=''; if(hint) hint.hidden=true;
      if(!dateStr) return;
      const d=new Date(dateStr+'T00:00:00');
      if(!isWeekday(d)){ if(hint){ hint.textContent='Sélectionnez un jour ouvré (lundi à vendredi).'; hint.hidden=false; } return; }
      for(let h=OPEN; h<CLOSE; h++){
        for(let m=0; m<60; m+=STEP){
          const t=fmt(h,m);
          const btn=document.createElement('button');
          btn.type='button'; btn.className='slot'; btn.textContent=t; btn.setAttribute('aria-pressed','false');
          btn.addEventListener('click', ()=>{
            slotsWrap.querySelectorAll('.slot[aria-pressed="true"]').forEach(b=>b.setAttribute('aria-pressed','false'));
            btn.setAttribute('aria-pressed','true'); timeI.value=t; timeI.focus();
          });
          slotsWrap.appendChild(btn);
        }
      }
    }
    dateI?.addEventListener('change', ()=> buildSlots(dateI.value));
    if (dateI?.value) buildSlots(dateI.value);

    rForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = (rForm.querySelector('#rdv-name')?.value || '').trim();
      const email= (rForm.querySelector('#rdv-email')?.value || '').trim();
      const date = (dateI?.value || '').trim();
      const time = (timeI?.value || '').trim();
      const notes= (rForm.querySelector('#rdv-notes')?.value || '').trim();
      const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!name||!isEmail||!date||!time){ status.textContent='Champs invalides.'; return; }

      const to = window.MOTECH_MAILTO || 'contact@example.com';
      const subject = 'Demande de rendez-vous';
      const body =
`Demande de rendez-vous :

Nom : ${name}
Email : ${email}
Date : ${date}
Heure : ${time}

Notes :
${notes || ''}`;
      status.textContent='Ouverture de votre client mail…';
      openEmail(to, subject, body, { from: email });
    });
  })();

});
