/* ====== MoTech - app.js (HYBRIDE comments: localStorage + auto-sync Pantry) ====== */

document.addEventListener('DOMContentLoaded', () => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const enc = (s)=>encodeURIComponent(s).replace(/%20/g,'+');

  const PANTRY = (window.MOTECH_PANTRY_ID || '').trim();
  const COMMENTS_URL = PANTRY ? `https://getpantry.cloud/apiv1/pantry/${PANTRY}/basket/comments` : '';
  const LS_KEY = 'motech_comments_queue';

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

  /* ==================== CONTACT + RDV (mailto multi-fournisseur) ==================== */
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
      openEmail(to, subject, body, email);
    });
  })();

  /* ==================== RATING via CountAPI ==================== */
  (function(){
    const starsWrap = $('#rating-stars'); if(!starsWrap) return;
    const avgEl = $('#rating-avg'), countEl = $('#rating-count');

    const NS = 'motech-site';
    const KEY_COUNT = 'rating_count';
    const KEY_SUM   = 'rating_sum';
    const api = (path)=>fetch(`https://api.countapi.xyz/${path}`).then(r=>r.json());

    async function refresh(){
      const [c,s] = await Promise.all([
        api(`get/${NS}/${KEY_COUNT}`).catch(()=>({value:0})),
        api(`get/${NS}/${KEY_SUM}`).catch(()=>({value:0}))
      ]);
      const count = Number(c.value||0), sum = Number(s.value||0);
      const avg = count ? (sum/count).toFixed(2) : '–';
      if (avgEl)   avgEl.textContent = avg;
      if (countEl) countEl.textContent = count;
    }

    async function vote(v){
      await Promise.all([
        api(`update/${NS}/${KEY_COUNT}/?amount=1`),
        api(`update/${NS}/${KEY_SUM}/?amount=${v}`)
      ]);
      highlight(v); refresh();
    }

    function highlight(v){
      const stars = $$('.star', starsWrap);
      stars.forEach((b,i)=> b.classList.toggle('active', i < v));
    }

    starsWrap.addEventListener('click', (e)=>{
      const btn = e.target.closest('.star'); if(!btn) return;
      const v = Number(btn.dataset.value||0); if(!v) return;
      vote(v);
    });

    refresh();
  })();

  /* ==================== COMMENTAIRES HYBRIDES ==================== */
  (function(){
    const list   = $('#comments-list');
    const form   = $('#comment-form');
    const status = $('#c-status');

    function lsGet(){
      try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); } catch(e){ return []; }
    }
    function lsSet(arr){
      try{ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }catch(e){}
    }

    async function fetchPantry(){
      if(!COMMENTS_URL) throw new Error('no pantry');
      const r = await fetch(COMMENTS_URL, {cache:'no-store'});
      if(!r.ok) throw new Error('pantry fetch');
      const data = await r.json();
      return Array.isArray(data.items)? data.items : [];
    }
    async function savePantry(items){
      if(!COMMENTS_URL) throw new Error('no pantry');
      const r = await fetch(COMMENTS_URL, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({items})
      });
      if(!r.ok) throw new Error('pantry save');
      return true;
    }

    function render(items){
      if(!list) return;
      list.innerHTML = items.slice().reverse().map(c=>`
        <div class="comment">
          <div class="who">${c.name || 'Anonyme'} ${c.company?`• <span class="meta">${c.company}</span>`:''}</div>
          <div class="meta">${new Date(c.date||Date.now()).toLocaleString()}</div>
          <p>${(c.text||'').replace(/</g,'&lt;')}</p>
        </div>
      `).join('') || '<p class="muted">Aucun commentaire pour le moment.</p>';
    }

    async function initialLoad(){
      const local = lsGet();
      render(local); // afficher instantanément
      if (!COMMENTS_URL) { return; } // pas de Pantry → mode local seulement
      try{
        const remote = await fetchPantry();
        // Merge: on ajoute les locaux absents du remote
        const key = c => `${(c.date||'')}-${(c.name||'')}-${(c.text||'').slice(0,20)}`;
        const rSet = new Set(remote.map(key));
        const merged = remote.concat(local.filter(c=>!rSet.has(key(c))));
        render(merged);
        lsSet(merged);
        // si on a ajouté du local au merged, push vers pantry
        if (merged.length !== remote.length){
          try{ await savePantry(merged); }catch(e){}
        }
      }catch(e){
        // Pantry KO → on reste en local
      }
    }

    async function addComment(item){
      const cur = lsGet();
      cur.push(item);
      lsSet(cur);
      render(cur);

      if (COMMENTS_URL){
        try{
          // tenter un merge remote + local et sauver
          const remote = await fetchPantry().catch(()=>[]);
          const key = c => `${(c.date||'')}-${(c.name||'')}-${(c.text||'').slice(0,20)}`;
          const rSet = new Set(remote.map(key));
          const merged = remote.concat(cur.filter(c=>!rSet.has(key(c))));
          await savePantry(merged);
          lsSet(merged);
          render(merged);
        }catch(e){
          // laisser en local, un prochain visiteur re-syncera
        }
      }
    }

    // init
    initialLoad();

    // submit
    form?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = $('#c-name')?.value.trim() || 'Anonyme';
      const company = $('#c-company')?.value.trim() || '';
      const text = $('#c-text')?.value.trim() || '';
      if(!text){ status.textContent='Écris un commentaire.'; return; }
      status.textContent='Publication…';
      await addComment({name, company, text, date: new Date().toISOString()});
      form.reset();
      status.textContent='Merci !';
      setTimeout(()=>status.textContent='', 1500);
    });

  })();

  /* === Burger === */
  (function(){
    const btn = document.getElementById('burger');
    const mm  = document.getElementById('mobile-menu');
    if(!btn || !mm) return;
    const panel = mm.querySelector('.mobile-panel');
    function open(){ mm.hidden=false; btn.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; (panel.querySelector('a,button')||panel).focus(); }
    function close(){ mm.hidden=true; btn.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
    btn.addEventListener('click', ()=>{ (mm.hidden?open:close)(); });
    mm.addEventListener('click', (e)=>{ if(e.target.closest('[data-close]') || e.target.classList.contains('mobile-backdrop')) close(); });
    mm.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click', ()=>close()));
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && !mm.hidden) close(); });
  })();

  /* === FAB === */
  (function(){
    const btn = document.getElementById('fabMenu');
    const mm  = document.getElementById('mobile-menu');
    if(!btn || !mm) return;
    const panel = mm.querySelector('.mobile-panel');
    function open(){ mm.hidden=false; btn.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden'; (panel.querySelector('a,button')||panel).focus(); }
    function close(){ mm.hidden=true; btn.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }
    btn.addEventListener('click', ()=>{ (mm.hidden?open:close)(); });
    mm.addEventListener('click', (e)=>{ if(e.target.closest('[data-close]') || e.target.classList.contains('mobile-backdrop')) close(); });
    mm.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click', ()=>close()));
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && !mm.hidden) close(); });
  })();

});
