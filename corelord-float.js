/* âââââââââââââââââââââââââââââââââââââââââââââââââââ
   CORE LORD FLOATING WIDGET  â  corelord-float.js
   Drop this script tag into any Quiver page.
   It reads page context automatically and injects
   the floating Core Lord chat panel.
âââââââââââââââââââââââââââââââââââââââââââââââââââ */

(function(){
  'use strict';

  // ââ CONFIG âââââââââââââââââââââââââââââââââââââââ
  const CL_IMG = 'https://quiver-forecast.vercel.app/images/Core%20Lord.png';
  const API_URL = 'https://quiver-proxy.quiver-ie.workers.dev/chat';
  const MODEL   = 'claude-haiku-4-5-20251001';

  // ââ HELPERS ââââââââââââââââââââââââââââââââââââââ
  function getProfile(){
    try{const p=JSON.parse(localStorage.getItem('quiver_profile'));return p&&p.skill?p:null;}
    catch(e){return null;}
  }
  function getLogbook(){
    try{return JSON.parse(localStorage.getItem('quiver_logbook'))||[];}
    catch(e){return[];}
  }

  // ââ PAGE CONTEXT READER ââââââââââââââââââââââââââ
  // Reads whichever page we're on and returns a context string for the system prompt
  function readPageContext(){
    const path = window.location.pathname;
    const ctx = [];

    // ââ FORECAST PAGE ââ
    if(path.includes('index') || path === '/' || path.endsWith('/')){
      const fc = window.__clForecast;
      if(fc){
        ctx.push(`User is viewing the forecast for: ${fc.spot} (${fc.county}, ${fc.type})`);
        ctx.push(`Current conditions: ${fc.waveHeight}m waves, ${fc.wavePeriod}s period, wind ${fc.windSpeed}mph from ${fc.windDir}`);
        ctx.push(`Swell: ${fc.swellDir} at ${fc.swellPeriod}s`);
        ctx.push(`Overall rating: ${fc.rating}. Wave energy: ${fc.energy} kJ/mÂ²`);
        if(fc.read) ctx.push(`Conditions read: ${fc.read}`);
        const goodRows = document.querySelectorAll('.forecast-row.good, .forecast-row.great');
        if(goodRows.length) ctx.push(`${goodRows.length} good/great windows in today's forecast.`);
      } else {
        // Fallback: DOM read
        if(window.currentSpot){
          const s = window.currentSpot;
          ctx.push(`Forecast page open for: ${s.groupName||s.name}, ${s.county||'Ireland'}`);
        }
        const tableRows = document.querySelectorAll('.forecast-row');
        if(tableRows.length) ctx.push(`Forecast table loaded with ${tableRows.length} time slots.`);
      }
      ctx.push(`The user is on the forecast page.`);
    }

    // ââ LOGBOOK PAGE ââ
    if(path.includes('logbook')){
      const sessions = getLogbook();
      ctx.push(`The user is on their Logbook page.`);
      if(sessions.length > 0){
        ctx.push(`Logbook has ${sessions.length} sessions logged.`);
        const recent = sessions.slice(-3).reverse();
        recent.forEach(s => {
          ctx.push(`Recent session: ${s.spot} on ${s.date} â ${s.rating}/5 stars, ${s.duration || '?'}, notes: "${(s.notes||'').slice(0,80)}"`);
        });
      } else {
        // Read from DOM static data if no localStorage sessions yet
        const cards = document.querySelectorAll('.session-card');
        if(cards.length){
          ctx.push(`${cards.length} session cards visible in the logbook.`);
          const spotNames = [...document.querySelectorAll('.spot-name')].map(el=>el.textContent.trim()).slice(0,3);
          if(spotNames.length) ctx.push(`Recent spots: ${spotNames.join(', ')}`);
        }
      }
    }

    // ââ WORKSHOP PAGE ââ
    if(path.includes('workshop')){
      ctx.push(`The user is on the Workshop page (Core Lord's home page).`);
    }

    // ââ TRIP PAGE ââ
    if(path.includes('trip')){
      ctx.push(`The user is on the Trip Planner page, browsing surf destinations.`);
      const destEls = document.querySelectorAll('.dest-name, .destination-name, [class*="dest"]');
      if(destEls.length) ctx.push(`Destinations visible: ${[...destEls].slice(0,3).map(e=>e.textContent.trim()).join(', ')}`);
    }

    return ctx.length ? ctx.join('\n') : 'Unknown page context.';
  }

  // ââ SYSTEM PROMPT ââââââââââââââââââââââââââââââââ
  function buildSystemPrompt(){
    const profile = getProfile();
    const sessions = getLogbook();
    const pageCtx = readPageContext();

    const surferBlock = profile
      ? `Surfer profile:\n- Name: ${profile.name||'unknown'}\n- Level: ${profile.skill||'intermediate'}\n- Board: ${profile.board||'unknown'}\n- Goal: ${profile.goal||'general improvement'}`
      : `No surfer profile saved yet. They haven't set up their account.`;

    const logbookBlock = sessions.length > 0
      ? `Logbook summary:\n- ${sessions.length} sessions logged\n- Recent spots: ${[...new Set(sessions.map(s=>s.spot))].slice(0,5).join(', ')}`
      : `No sessions in logbook yet.`;

    return `You are Core Lord â the surf intelligence built into the Quiver app. Think of yourself as a knowledgeable surf friend who has full context of what the user is doing across the whole app.

You can help with anything surf-related: reading forecasts, understanding conditions, reviewing sessions, technique, gear, surf travel advice, tide questions, trip planning â whatever comes up. You have real knowledge of surf destinations worldwide so share it freely when asked about travel.

Be warm, conversational and genuinely helpful. Don't give orders or unsolicited advice. Let the user lead and follow their thread naturally. Ask a follow-up question if it would genuinely help. Match your response length to what's needed â sometimes a sentence is enough.

You have full context across the app:

${surferBlock}

${logbookBlock}

Current page context:
${pageCtx}

You can speak to what's on screen. If someone asks about surf travel or destinations, draw on your knowledge freely â best seasons, spot recommendations, what suits different levels, travel tips.

One critical rule: never invent specific local details you don't actually know. This includes coach names, surf school names, specific venues, local businesses, break names or people. If you don't know something specific, say so honestly and suggest how the user could find out (e.g. ask at the local surf shop, check Irish Surfing's website). A confident wrong answer is far worse than an honest "I don't know that specifically".`;
  }

  // ââ CHAT STATE âââââââââââââââââââââââââââââââââââ
  let messages = [];
  let isOpen = false;
  let isThinking = false;

  // ââ INJECT STYLES ââââââââââââââââââââââââââââââââ
  function injectStyles(){
    if(document.getElementById('cl-float-styles')) return;
    const style = document.createElement('style');
    style.id = 'cl-float-styles';
    style.textContent = `
      /* ââ FLOATING BUTTON ââ */
      #cl-fab{
        position:fixed;bottom:100px;right:20px;z-index:9000;
        width:52px;height:52px;border-radius:50%;
        background:radial-gradient(circle at 38% 32%,#1e1800,#080600);
        border:1.5px solid rgba(245,200,0,0.5);
        box-shadow:0 0 18px rgba(245,200,0,0.2),0 4px 16px rgba(0,0,0,0.6);
        cursor:pointer;overflow:hidden;padding:0;
        transition:transform 0.2s, box-shadow 0.2s;
        display:flex;align-items:center;justify-content:center;
      }
      #cl-fab:hover{
        transform:scale(1.08);
        box-shadow:0 0 28px rgba(245,200,0,0.35),0 4px 20px rgba(0,0,0,0.7);
      }
      #cl-fab img{
        width:100%;height:100%;object-fit:cover;
        filter:grayscale(1) sepia(0.6) saturate(4) contrast(1.5) brightness(0.65);
      }
      #cl-fab .cl-pulse{
        position:absolute;inset:0;border-radius:50%;
        border:1.5px solid rgba(245,200,0,0.4);
        animation:cl-pulse 2.5s ease-out infinite;
      }
      @keyframes cl-pulse{
        0%{transform:scale(1);opacity:0.7;}
        100%{transform:scale(1.6);opacity:0;}
      }
      @media(max-width:640px){
        #cl-fab{bottom:98px;right:16px;}
      }

      /* ââ PANEL ââ */
      #cl-panel{
        position:fixed;bottom:164px;right:20px;z-index:9001;
        width:340px;max-height:520px;
        background:#111;border:1px solid rgba(245,200,0,0.2);
        box-shadow:0 8px 40px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.04);
        display:flex;flex-direction:column;
        transform:translateY(12px) scale(0.97);opacity:0;pointer-events:none;
        transition:transform 0.2s ease,opacity 0.2s ease;
        font-family:'Archivo Black',sans-serif;
      }
      #cl-panel.open{
        transform:translateY(0) scale(1);opacity:1;pointer-events:all;
      }
      @media(max-width:640px){
        #cl-panel{
          width:calc(100vw - 32px);right:16px;bottom:172px;
          max-height:60vh;
        }
      }

      /* Panel header */
      #cl-panel-hdr{
        display:flex;align-items:center;gap:10px;
        padding:12px 14px;border-bottom:1px solid rgba(255,255,255,0.07);
        flex-shrink:0;
      }
      #cl-panel-avatar{
        width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0;
        border:1px solid rgba(245,200,0,0.3);
      }
      #cl-panel-avatar img{
        width:100%;height:100%;object-fit:cover;
        filter:grayscale(1) sepia(0.6) saturate(4) contrast(1.5) brightness(0.65);
      }
      #cl-panel-name{
        flex:1;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;
        color:#fff;
      }
      #cl-panel-sub{
        font-family:'DM Mono',monospace;font-size:7px;letter-spacing:1.5px;
        text-transform:uppercase;color:rgba(255,255,255,0.35);margin-top:2px;
      }
      .cl-live-dot{
        width:6px;height:6px;border-radius:50%;background:#22c55e;
        box-shadow:0 0 6px #22c55e;flex-shrink:0;
      }
      #cl-panel-close{
        background:none;border:none;color:rgba(255,255,255,0.3);
        font-size:16px;cursor:pointer;padding:2px 4px;line-height:1;
        transition:color 0.15s;
      }
      #cl-panel-close:hover{color:#fff;}

      /* Context pill */
      #cl-ctx-pill{
        padding:7px 14px;border-bottom:1px solid rgba(255,255,255,0.05);
        font-family:'DM Mono',monospace;font-size:7px;letter-spacing:1.5px;
        text-transform:uppercase;color:rgba(245,200,0,0.6);
        background:rgba(245,200,0,0.04);flex-shrink:0;
      }

      /* Messages */
      #cl-msgs{
        flex:1;overflow-y:auto;padding:14px;
        display:flex;flex-direction:column;gap:10px;
        scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent;
        min-height:80px;
      }
      .cl-msg{
        max-width:88%;font-size:12px;line-height:1.55;
        padding:9px 12px;
      }
      .cl-msg.cl-bot{
        background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.07);
        color:#fff;align-self:flex-start;
        font-family:'DM Mono',monospace;font-size:11px;
      }
      .cl-msg.cl-user{
        background:rgba(245,200,0,0.1);border:1px solid rgba(245,200,0,0.2);
        color:rgba(255,255,255,0.85);align-self:flex-end;
        font-family:'DM Mono',monospace;font-size:11px;
      }
      .cl-thinking{
        display:flex;gap:4px;align-items:center;padding:10px 14px;
        align-self:flex-start;
      }
      .cl-thinking span{
        width:5px;height:5px;border-radius:50%;
        background:rgba(245,200,0,0.5);
        animation:cl-bounce 1.2s ease-in-out infinite;
      }
      .cl-thinking span:nth-child(2){animation-delay:0.2s;}
      .cl-thinking span:nth-child(3){animation-delay:0.4s;}
      @keyframes cl-bounce{
        0%,80%,100%{transform:translateY(0);}
        40%{transform:translateY(-5px);}
      }

      /* Input */
      #cl-input-row{
        display:flex;gap:0;border-top:1px solid rgba(255,255,255,0.07);
        flex-shrink:0;
      }
      #cl-input{
        flex:1;background:transparent;border:none;outline:none;
        color:#fff;font-family:'DM Mono',monospace;font-size:11px;
        padding:12px 14px;resize:none;height:44px;
        caret-color:rgba(245,200,0,0.8);
      }
      #cl-input::placeholder{color:rgba(255,255,255,0.2);}
      #cl-send{
        background:none;border:none;border-left:1px solid rgba(255,255,255,0.07);
        color:rgba(245,200,0,0.6);cursor:pointer;padding:0 14px;
        font-size:16px;transition:color 0.15s;flex-shrink:0;
      }
      #cl-send:hover{color:#f5c800;}
      #cl-send:disabled{color:rgba(255,255,255,0.15);cursor:default;}
    `;
    document.head.appendChild(style);
  }

  // ââ INJECT HTML ââââââââââââââââââââââââââââââââââ
  function injectHTML(){
    if(document.getElementById('cl-fab')) return;

    // Floating button
    const fab = document.createElement('button');
    fab.id = 'cl-fab';
    fab.setAttribute('aria-label', 'Open Core Lord');
    fab.innerHTML = `<div class="cl-pulse"></div><img src="${CL_IMG}" alt="Core Lord">`;
    fab.addEventListener('click', togglePanel);
    document.body.appendChild(fab);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'cl-panel';
    panel.innerHTML = `
      <div id="cl-panel-hdr">
        <div id="cl-panel-avatar"><img src="${CL_IMG}" alt="Core Lord"></div>
        <div>
          <div id="cl-panel-name">Core Lord</div>
          <div id="cl-panel-sub">Your surf intelligence</div>
        </div>
        <div class="cl-live-dot"></div>
        <button id="cl-panel-close" onclick="window.__clClose()">â</button>
      </div>
      <div id="cl-ctx-pill">ð <span id="cl-ctx-text">Reading page context...</span></div>
      <div id="cl-msgs"></div>
      <div id="cl-input-row">
        <input id="cl-input" type="text" placeholder="Ask Core Lord..." autocomplete="off">
        <button id="cl-send">â</button>
      </div>
    `;
    document.body.appendChild(panel);

    // Wire up input
    const input = document.getElementById('cl-input');
    const sendBtn = document.getElementById('cl-send');
    input.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }});
    sendBtn.addEventListener('click', sendMessage);

    // Expose close globally (for inline onclick)
    window.__clClose = () => { isOpen = false; panel.classList.remove('open'); };
  }

  // ââ CONTEXT PILL ââââââââââââââââââââââââââââââââ
  function updateContextPill(){
    const pill = document.getElementById('cl-ctx-text');
    if(!pill) return;
    const path = window.location.pathname;
    if(path.includes('logbook')) pill.textContent = 'Reading your logbook';
    else if(path.includes('workshop')) pill.textContent = 'On Workshop page';
    else if(path.includes('trip')) pill.textContent = 'On Trip Planner';
    else pill.textContent = 'Reading forecast';
  }

  // ââ TOGGLE âââââââââââââââââââââââââââââââââââââââ
  function togglePanel(){
    const panel = document.getElementById('cl-panel');
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if(isOpen){
      updateContextPill();
      if(messages.length === 0) sendGreeting();
      setTimeout(() => document.getElementById('cl-input')?.focus(), 200);
    }
  }

  // ââ GREETING âââââââââââââââââââââââââââââââââââââ
  function sendGreeting(){
    const profile = getProfile();
    const path = window.location.pathname;
    let greeting;
    if(path.includes('logbook')){
      greeting = profile?.name
        ? `Hey ${profile.name}! I can see your logbook â happy to chat through sessions or anything you're working on.`
        : `Hey! I can see your logbook. Happy to chat through your sessions or anything you're working on.`;
    } else if(path.includes('trip')){
      greeting = `Hey! Thinking about a surf trip? Happy to help â where are you considering, or do you want some ideas based on time of year?`;
    } else if(path.includes('workshop')){
      greeting = `Hey! What can I help you with today?`;
    } else {
      greeting = profile?.name
        ? `Hey ${profile.name}! I can see the forecast â what are you trying to figure out?`
        : `Hey! I can see the forecast. What are you trying to work out?`;
    }
    appendMessage(greeting, 'bot');
    messages.push({ role: 'assistant', content: greeting });
  }

  // ââ APPEND MESSAGE âââââââââââââââââââââââââââââââ
  function appendMessage(text, role){
    const msgs = document.getElementById('cl-msgs');
    if(!msgs) return;
    const div = document.createElement('div');
    div.className = `cl-msg cl-${role}`;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showThinking(){
    const msgs = document.getElementById('cl-msgs');
    if(!msgs) return;
    const div = document.createElement('div');
    div.className = 'cl-thinking';
    div.id = 'cl-thinking';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideThinking(){
    document.getElementById('cl-thinking')?.remove();
  }

  // ââ SEND âââââââââââââââââââââââââââââââââââââââââ
  async function sendMessage(){
    if(isThinking) return;
    const input = document.getElementById('cl-input');
    const sendBtn = document.getElementById('cl-send');
    const text = (input?.value || '').trim();
    if(!text) return;

    input.value = '';
    appendMessage(text, 'user');
    messages.push({ role: 'user', content: text });

    isThinking = true;
    if(sendBtn) sendBtn.disabled = true;
    showThinking();

    try {
      const systemPrompt = buildSystemPrompt();
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          system: systemPrompt,
          messages: messages.slice(-10) // last 10 turns for context window
        })
      });
      const data = await resp.json();
      const reply = data?.content?.[0]?.text || "Can't reach me right now. Try again.";
      hideThinking();
      appendMessage(reply, 'bot');
      messages.push({ role: 'assistant', content: reply });
    } catch(e) {
      hideThinking();
      appendMessage("Signal's down. Try again in a sec.", 'bot');
    } finally {
      isThinking = false;
      if(sendBtn) sendBtn.disabled = false;
      input?.focus();
    }
  }

  // ââ INIT âââââââââââââââââââââââââââââââââââââââââ
  function init(){
    // On workshop page Core Lord IS the page â don't show float
    const path = window.location.pathname;
    if(path.includes('workshop')) return;
    injectStyles();
    injectHTML();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
