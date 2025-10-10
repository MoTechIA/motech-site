/* ====== MoTech app.js — fix popup + scroll RDV ====== */

window.MOTECH_FORMS  = 'mailto';
window.MOTECH_MAILTO = 'contact.workings@gmail.com';

document.addEventListener('DOMContentLoaded', () => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* Utils */
  const enc = (s)=>encodeURIComponent(s).replace(/%20/g,'+');
  const scrollToId = (id)=>{
    const el = id && id.startsWith('#') ? $(id) : null;
    if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
  };

  /* Footer year */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* Smooth scroll sur TOUTES les ancres */
  $$('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id = a.getAttribute('href'); const el = id && id !== '#' ? $(id) : null;
      if (!el) return;
      e.preventDefault(); scrollToId(id);
    });
  });

  /* Forcer TOUS les « Prendre RDV » à scroller vers #rdv */
  function isPrendreRDV(el){ return /prendre\s*rdv/i.test((el.textContent||'').trim()); }
  $$('a,button').forEach(el=>{
    if (isPrendreRDV(el)) {
      el.removeAttribute('data-mailto');
      el.addEventListener('click', (e)=>{ e.preventDefault(); scrollToId('#rdv'); });
    }
  });

  /* ==================== POPUP AUTO ==================== */
  (function(){
    const pop = $('#auto-pop'); if(!pop) return;
    const box = $('.auto-pop-box', pop);
    const closeBtn = $('.auto-pop-close', pop);
    const LS_KEY='motech_autopop_day';
    const d=new Date(); const key=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;

    // n'afficher qu'une fois par jour
    if(localStorage.getItem(LS_KEY) === key) return;

    function open(){
      pop.hidden=false;
      document.body.style.overflow='hidden';
      localStorage.setItem(LS_KEY, key);
      box.querySelector('a,button')?.focus();
      function onKey(e){ if(e.key==='Escape') close(); }
      box._onKey=onKey; document.addEventListener('keydown', onKey);
    }
    function close(){
      pop.hidden=true;
      document.body.style.overflow='';
      document.removeEventListener('keydown', box._onKey||(()=>{}));
    }

    // Affichage après 5 secondes
    setTimeout(open, 5000);

    // Fermeture via la croix et le backdrop
    closeBtn?.addEventListener('click', (e)=>{ e.preventDefault(); close(); });
    pop.addEventListener('click', (e)=>{
      if (e.target.classList.contains('auto-pop-backdrop') || e.target.closest('[data-close]')) {
        e.preventDefault(); close();
      }
    });

    // Les boutons de la pop-up : fermer + scroller vers la bonne section
    pop.querySelectorAll('a[href^="#"]').forEach(a=>{
      a.addEventListener('click', (e)=>{
        const href = a.getAttribute('href');
        e.preventDefault();
        close();
        setTimeout(()=>scrollToId(href), 60);
      });
    });
  })();

  /* ==================== (le reste inchangé) ==================== */

  /* Contact → ouvre le client mail de l'utilisateur (mailto + fallback webmails) */
  function providerFrom(email){
    const m = String(email||'').toLowerCase().match(/@([^@]+)$/);
    const d = m ? m[1] : '';
    if (/(gmail\.com|googlemail\.com)$/.test(d))
      return (to,sub,body)=>`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    if (/(outlook\.com|hotmail\.com|live\.com|msn\.com)$/.test(d))
      return (to,sub,body)=>`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    if (/(yahoo\.[a-z]+)$/.test(d))
      return (to,sub,body)=>`https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    if (/(proton\.me|protonmail\.com)$/.test(d))
      return ()=>`https://mail.proton.me/u/0/inbox`;
    return null;
  }
  function openEmail(to, subject, body, opts={}){
    const fromEmail = opts.from || '';
    const mailtoURL = `mailto:${to}?subject=${enc(subject)}&body=${enc(body)}`;
    window.location.href = mailtoURL;
    const composer = providerFrom(fromEmail);
    if (composer){
      const t = setTimeout(()=>{ const url = composer(to, subject, body); if(url) window.open(url,'_blank','noopener'); }, 900);
      window.addEventListener('pagehide', ()=>clearTimeout(t), {once:true});
    }
  }

  // Formulaire Contact
  (function(){
    const form = $('#contact-form'); if(!form) return;
    const status = $('.form-status', form);
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = (form.querySelector('#name')?.value||'').trim();
      const email= (form.querySelector('#email')?.value||'').trim();
      const msg  = (form.querySelector('#message')?.value||'').trim();
      const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!name||!isEmail||!msg){ status.textContent='Champs invalides.'; return; }
      const to=window.MOTECH_MAILTO||'contact@example.com';
      const subject=`Contact MoTech — ${name}`;
      const body=`Contact :

Nom : ${name}
Email : ${email}

Message :
${msg}`;
      status.textContent='Ouverture de votre client mail…';
      openEmail(to, subject, body, { from: email });
    });
  })();

  // RDV : créneaux + email
  (function(){
    const rForm = $('#rdv-form'); if(!rForm) return;
    const status = $('.form-status', rForm);
    const dateI = $('#rdv-date'); const timeI = $('#rdv-time');
    const OPEN=11, CLOSE=21, STEP=30;
    (function setMin(){ const now=new Date(), min=new Date(); if(now.getHours()>=CLOSE) min.setDate(min.getDate()+1); if(dateI) dateI.min=min.toISOString().slice(0,10); })();
    const slotsWrap = $('#slots'); const hint = $('#slots-hint');
    function isWeekday(d){ const day=d.getDay(); return day>=1&&day<=5; }
    function fmt(h,m){ return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
    function buildSlots(dateStr){
      if(!slotsWrap) return; slotsWrap.innerHTML=''; if(hint) hint.hidden=true; if(!dateStr) return;
      const d=new Date(dateStr+'T00:00:00'); if(!isWeekday(d)){ if(hint){ hint.textContent='Sélectionnez un jour ouvré (lundi à vendredi).'; hint.hidden=false; } return; }
      for(let h=OPEN; h<CLOSE; h++){ for(let m=0; m<60; m+=STEP){
        const t=fmt(h,m); const btn=document.createElement('button');
        btn.type='button'; btn.className='slot'; btn.textContent=t; btn.setAttribute('aria-pressed','false');
        btn.addEventListener('click', ()=>{ slotsWrap.querySelectorAll('.slot[aria-pressed="true"]').forEach(b=>b.setAttribute('aria-pressed','false')); btn.setAttribute('aria-pressed','true'); timeI.value=t; timeI.focus(); });
        slotsWrap.appendChild(btn);
      }}}
    dateI?.addEventListener('change', ()=> buildSlots(dateI.value));
    if (dateI?.value) buildSlots(dateI.value);

    rForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = (rForm.querySelector('#rdv-name')?.value||'').trim();
      const email= (rForm.querySelector('#rdv-email')?.value||'').trim();
      const date = (dateI?.value||'').trim();
      const time = (timeI?.value||'').trim();
      const notes= (rForm.querySelector('#rdv-notes')?.value||'').trim();
      const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!name||!isEmail||!date||!time){ status.textContent='Champs invalides.'; return; }
      const to=window.MOTECH_MAILTO||'contact@example.com';
      const subject='Demande de rendez-vous';
      const body=`Demande de rendez-vous :

Nom : ${name}
Email : ${email}
Date : ${date}
Heure : ${time}

Notes :
${notes||''}`;
      status.textContent='Ouverture de votre client mail…';
      openEmail(to, subject, body, { from: email });
    });
  })();

  // Commentaires (localStorage)
  (function(){
    const form = $('#comment-form'); const list = $('#comments-list'); if(!form||!list) return;
    const status = $('#c-status'); const KEY='motech_comments';
    function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch{ return []; } }
    function save(a){ localStorage.setItem(KEY, JSON.stringify(a)); }
    function fmtDate(d){ return new Date(d).toLocaleString(); }
    function render(){
      const data = load().sort((a,b)=>b.date-a.date);
      list.innerHTML = data.length ? '' : '<p class="muted">Aucun commentaire pour le moment.</p>';
      for(const it of data){
        const card = document.createElement('div'); card.className='comment-card';
        card.innerHTML = `
          <div class="comment-head">
            <div class="logo-mark" style="width:26px;height:26px;font-size:12px">M</div>
            <div>
              <div class="comment-name">${(it.name||'Anonyme').replace(/[<>]/g,'')}</div>
              <div class="comment-meta">${fmtDate(it.date)} ${it.company?('• '+it.company.replace(/[<>]/g,'')) : ''}</div>
            </div>
          </div>
          <p style="margin:8px 0 0">${(it.text||'').replace(/[<>]/g,'')}</p>`;
        list.appendChild(card);
      }
    }
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name=(form.querySelector('#c-name')?.value||'').trim();
      const company=(form.querySelector('#c-company')?.value||'').trim();
      const text=(form.querySelector('#c-text')?.value||'').trim();
      if(!name||!text){ status.textContent='Nom et commentaire requis.'; return; }
      const a=load(); a.push({name,company,text,date:Date.now()}); save(a);
      form.reset(); status.textContent='Merci ! Votre commentaire a été publié.'; render();
      setTimeout(()=>status.textContent='',3000);
    });
    render();
  })();
});

/* === Patch popup & RDV scroll (idempotent) === */
document.addEventListener('DOMContentLoaded', function(){
  var pop = document.getElementById('auto-pop');
  if (!pop) return;
  var box = pop.querySelector('.auto-pop-box');
  var closeBtn = pop.querySelector('.auto-pop-close');

  var shownKey = 'motech_autopop_day';
  var d = new Date(), key = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
  if (localStorage.getItem(shownKey) === key) return;

  function openPop(){
    pop.hidden = false;
    document.body.style.overflow = 'hidden';
    localStorage.setItem(shownKey, key);
    setTimeout(function(){ (box.querySelector('a,button')||closeBtn||box).focus(); }, 0);
  }
  function closePop(){
    pop.hidden = true;
    document.body.style.overflow = '';
  }

  // Affichage après 5 secondes
  setTimeout(openPop, 5000);

  // Fermeture via la croix et le backdrop
  closeBtn && closeBtn.addEventListener('click', function(e){ e.preventDefault(); closePop(); });
  pop.addEventListener('click', function(e){
    if (e.target.classList.contains('auto-pop-backdrop')) { e.preventDefault(); closePop(); }
  });

  // Boutons/liens dans la pop-up : fermer + scroller vers la bonne section (#rdv, #contact, …)
  pop.querySelectorAll('a[href^="#"], button[data-target]').forEach(function(el){
    el.addEventListener('click', function(e){
      var target = el.getAttribute('href') || el.getAttribute('data-target');
      if (target && target.charAt(0)==='#'){
        e.preventDefault();
        closePop();
        setTimeout(function(){
          var sect = document.querySelector(target);
          if (sect) sect.scrollIntoView({behavior:'smooth', block:'start'});
        }, 60);
      }
    });
  });

  // Forcer TOUS les « Prendre RDV » du site à scroller vers #rdv
  Array.from(document.querySelectorAll('a,button')).forEach(function(el){
    if (/prendre\s*rdv/i.test((el.textContent||'').trim())){
      el.addEventListener('click', function(e){
        var rdv = document.querySelector('#rdv');
        if (rdv){
          e.preventDefault();
          closePop();
          rdv.scrollIntoView({behavior:'smooth', block:'start'});
        }
      });
    }
  });
});
