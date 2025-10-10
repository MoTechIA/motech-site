/* ====== MoTech - app.js ====== */

window.MOTECH_FORMS  = 'mailto';
window.MOTECH_MAILTO = 'contact.workings@gmail.com';

document.addEventListener('DOMContentLoaded', () => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const enc = (s)=>encodeURIComponent(s).replace(/%20/g,'+');

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

  /* ==================== MODALE SERVICE ==================== */
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

  /* ==================== CONTACT + RDV (section unique) ==================== */
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

    function providerFrom(email){
      const m = String(email||'').toLowerCase().match(/@([^@]+)$/); const d = m ? m[1] : '';
      if (/(gmail\.com|googlemail\.com)$/.test(d))
        return (to,s,b)=>`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`;
      if (/(outlook\.com|hotmail\.com|live\.com|msn\.com)$/.test(d))
        return (to,s,b)=>`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`;
      if (/(yahoo\.[a-z]+)$/.test(d))
        return (to,s,b)=>`https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(s)}&body=${encodeURIComponent(b)}`;
      if (/(proton\.me|protonmail\.com)$/.test(d))
        return ()=>`https://mail.proton.me/u/0/inbox`;
      return null;
    }
    function openEmail(to, subject, body, from=''){
      const mailtoURL = `mailto:${to}?subject=${enc(subject)}&body=${enc(body)}`;
      window.location.href = mailtoURL;
      const composer = providerFrom(from);
      if (composer){
        const t = setTimeout(()=>{ const url = composer(to, subject, body); if(url) window.open(url,'_blank','noopener'); }, 900);
        window.addEventListener('pagehide', ()=>clearTimeout(t), {once:true});
      }
    }

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = $('#cr-name')?.value.trim() || '';
      const email= $('#cr-email')?.value.trim() || '';
      const msg  = $('#cr-message')?.value.trim() || '';
      const okEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if(!name||!okEmail||!msg){ status.textContent='Champs invalides.'; return; }

      const to = window.MOTECH_MAILTO || 'contact@example.com';
      let subject = `Contact MoTech — ${name}`;
      let body = `Contact :

Nom : ${name}
Email : ${email}

Message :
${msg}`;

      if (want?.checked){
        const date = (dateI?.value||'').trim();
        const time = (timeI?.value||'').trim();
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
      openEmail(to, subject, body, email);
    });
  })();

  /* ==================== Commentaires (localStorage) ==================== */
  (function(){
    const form = $('#comment-form'); const list = $('#comments-list'); if(!form||!list) return;
    const status = $('#c-status'); const KEY='motech_comments';
    const load = ()=>{ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]} };
    const save = (a)=>localStorage.setItem(KEY, JSON.stringify(a));
    const fmtDate = (d)=>new Date(d).toLocaleString();

    function render(){
      const data = load().sort((a,b)=>b.date-a.date);
      list.innerHTML = data.length ? '' : '<p class="muted">Aucun commentaire pour le moment.</p>';
      for(const it of data){
        const card=document.createElement('div'); card.className='comment-card';
        card.innerHTML=`
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
      const name=$('#c-name')?.value.trim()||''; const company=$('#c-company')?.value.trim()||''; const text=$('#c-text')?.value.trim()||'';
      if(!name||!text){ status.textContent='Nom et commentaire requis.'; return; }
      const a=load(); a.push({name,company,text,date:Date.now()}); save(a);
      form.reset(); status.textContent='Merci ! Votre commentaire a été publié.'; render();
      setTimeout(()=>status.textContent='',3000);
    });

    render();
  })();

});
