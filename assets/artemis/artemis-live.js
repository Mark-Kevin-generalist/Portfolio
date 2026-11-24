/* Artemis live demo for the portfolio.
   Wake word "Artemis" via the browser's own speech recognition (Chrome/Edge), spoken replies via speechSynthesis.
   No server, no recording, no storage: every answer below is written in this file. */
(function () {
  'use strict';
  var BASE = 'assets/artemis/';
  var THEMES = {
    Classic:  { c: ['5FD4FF', 'B08CFF', 'D9B25A'], spin: 1.0 },
    Flame:    { c: ['FF7A2E', 'FF3B4E', 'FFC94A'], spin: 1.2 },
    Electric: { c: ['3DF5FF', 'A66BFF', 'F4FF52'], spin: 1.8 },
    Wind:     { c: ['9FF5D9', 'C9D8F0', '6CFFB0'], spin: 2.2 },
    Water:    { c: ['2E9BFF', '25E0C6', '9EE8FF'], spin: 0.7 },
    Earth:    { c: ['8FD14F', 'C98A4B', 'E3B341'], spin: 0.45 }
  };
  var SHEET = { size: 160, cols: 6, frames: 36 };
  var WAKE = /\b(art[ae]?m[iy]s+|artemus|artemiss|art[\s-]?e?miss?|arte mis|our temis|artemi[sz]e?)\b/i;
  var CONTACT = 'For anything more, Mark can build an assistant like me for your business. Just reach him through the contact section below.';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rgb(h) { return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }

  window.pvArtemis = function (box) {
    var theme = 'Classic', state = 'asleep', sheets = {}, frame = 0, ang = 0, last = performance.now();
    var rec = null, micOn = false, speaking = false, sleepTimer = null, answers = 0, pitched = false, voice = null;

    box.innerHTML =
      '<div class="pvwin"><div class="pvbar"><i></i><i></i><i></i><span>Artemis &middot; live demo in your browser</span></div>' +
      '<div class="pvbody"><div class="arte asleep">' +
      '<div class="orbw"><canvas width="240" height="240" role="img" aria-label="Artemis orb"></canvas></div>' +
      '<div class="ast">Sleeping</div>' +
      '<div class="say">Say <b>&ldquo;Artemis&rdquo;</b></div>' +
      '<div class="pvctl" style="justify-content:center;margin-top:0"><button class="btn" type="button" data-a="mic">&#127908; Allow microphone and start</button></div>' +
      '<div class="heard" aria-live="polite"></div>' +
      '<div class="athemes" role="radiogroup" aria-label="Orb theme"></div>' +
      '<div class="acloud" aria-live="polite"></div>' +
      '<form class="atype"><input placeholder="No mic? Type &ldquo;Artemis&rdquo; or a question" aria-label="Type to Artemis" maxlength="140"><button class="btn" type="submit" style="padding:7px 14px;font-size:13.5px">Send</button></form>' +
      '</div><p class="pvnote">Works best in Chrome or Edge. Your voice is turned into text by the browser&rsquo;s own speech service; this site does not record or keep anything. Answers are basic and pre-written.</p></div></div>';

    var wrap = box.querySelector('.arte'), cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
    var sayEl = box.querySelector('.say'), stEl = box.querySelector('.ast'), heard = box.querySelector('.heard'), cloud = box.querySelector('.acloud');
    var micBtn = box.querySelector('[data-a=mic]'), form = box.querySelector('.atype'), input = form.querySelector('input');

    // ----- themes -----
    var picker = box.querySelector('.athemes');
    Object.keys(THEMES).forEach(function (n) {
      var b = el('button'); b.type = 'button'; b.dataset.t = n; b.setAttribute('role', 'radio');
      var im = new Image(); im.alt = ''; im.src = BASE + 'icon-' + n.toLowerCase() + '.png'; b.appendChild(im); b.appendChild(el('span', '', n));
      b.onclick = function () { setTheme(n); };
      picker.appendChild(b);
    });
    function setTheme(n) {
      theme = n;
      Array.prototype.forEach.call(picker.children, function (b) { var on = b.dataset.t === n; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
      if (n !== 'Classic' && !sheets[n]) { var im = new Image(); im.src = BASE + 'orb-' + n.toLowerCase() + '.png'; sheets[n] = im; }
      colour();
    }
    function hex() { var c = THEMES[theme].c; return state === 'thinking' ? c[1] : state === 'speaking' ? c[2] : c[0]; }
    function colour() { box.style.setProperty('--ag', rgb(hex()).join(',')); }
    function setState(s) {
      state = s; wrap.classList.toggle('asleep', s === 'asleep');
      sayEl.innerHTML = s === 'asleep' ? 'Say <b>&ldquo;Artemis&rdquo;</b>' : 'Ask me <b>something simple</b>';
      stEl.textContent = { asleep: micOn ? 'Listening for her name' : 'Sleeping', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' }[s];
      colour();
    }

    // ----- orb drawing -----
    function classic(w, t) {
      var c = rgb(hex()), col = function (a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }, cx = w / 2, R = w * 0.42;
      var h = ctx.createRadialGradient(cx, cx, R * 0.2, cx, cx, R * 1.15); h.addColorStop(0, col(0.35)); h.addColorStop(1, col(0));
      ctx.fillStyle = h; ctx.beginPath(); ctx.arc(cx, cx, R * 1.15, 0, 6.283); ctx.fill();
      ctx.lineCap = 'round'; ctx.lineWidth = w * 0.035; ctx.strokeStyle = col(0.95); ctx.shadowColor = col(1); ctx.shadowBlur = 16;
      for (var k = 0; k < 2; k++) { var a0 = t + k * Math.PI; ctx.beginPath(); ctx.arc(cx, cx, R, a0, a0 + Math.PI * 0.62); ctx.stroke(); }
      ctx.shadowBlur = 0;
      var b = ctx.createRadialGradient(cx, cx * 0.9, R * 0.05, cx, cx, R * 0.78); b.addColorStop(0, col(0.9)); b.addColorStop(0.35, '#0f2540'); b.addColorStop(1, '#0a1426');
      ctx.fillStyle = b; ctx.beginPath(); ctx.arc(cx, cx, R * 0.76, 0, 6.283); ctx.fill();
      ctx.save(); ctx.translate(cx, cx); ctx.rotate(-t * 0.7); ctx.setLineDash([w * 0.045, w * 0.03]); ctx.lineWidth = w * 0.014; ctx.strokeStyle = 'rgba(235,245,255,.85)';
      ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, 6.283); ctx.stroke(); ctx.restore();
    }
    function sheet(w, img) {
      var c = rgb(hex()), h = ctx.createRadialGradient(w / 2, w / 2, w * 0.1, w / 2, w / 2, w * 0.5);
      h.addColorStop(0, 'rgba(' + c + ',.28)'); h.addColorStop(1, 'rgba(' + c + ',0)'); ctx.fillStyle = h; ctx.fillRect(0, 0, w, w);
      var f = Math.floor(frame) % SHEET.frames;
      ctx.drawImage(img, (f % SHEET.cols) * SHEET.size, Math.floor(f / SHEET.cols) * SHEET.size, SHEET.size, SHEET.size, 0, 0, w, w);
    }
    function render(now) {
      if (!document.body.contains(box) || !box.contains(cv)) { shutdown(); return; }
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      var pace = ({ asleep: 0.4, listening: 1, thinking: 1.8, speaking: 1.3 })[state] * THEMES[theme].spin;
      if (!reduce) { ang += dt * 1.6 * pace; frame += dt * 12 * pace; }
      var w = cv.width, img = sheets[theme]; ctx.clearRect(0, 0, w, w);
      if (theme !== 'Classic' && img && img.complete && img.naturalWidth) sheet(w, img); else classic(w, ang);
      requestAnimationFrame(render);
    }

    // ----- chat cloud and voice -----
    function add(cls, text) { var d = el('div', 'sm ' + cls); d.appendChild(el('small', '', cls === 'me' ? 'You' : 'Artemis')); d.appendChild(el('span', '', text)); cloud.appendChild(d); cloud.scrollTop = cloud.scrollHeight; return d; }
    function pickVoice() {
      if (!window.speechSynthesis) return; var v = speechSynthesis.getVoices();
      voice = v.filter(function (x) { return /^en[-_](GB|US|AU)/i.test(x.lang) && /(female|aria|jenny|sonia|libby|natasha|samantha|serena|google uk english female|zira)/i.test(x.name); })[0]
        || v.filter(function (x) { return /^en/i.test(x.lang) && /natural|neural|google/i.test(x.name); })[0] || v.filter(function (x) { return /^en/i.test(x.lang); })[0] || null;
    }
    if (window.speechSynthesis) { pickVoice(); speechSynthesis.addEventListener('voiceschanged', pickVoice); }

    function speak(text, cta, then) {
      setState('thinking');
      setTimeout(function () {
        setState('speaking'); var d = add('them', text);
        if (cta) { var a = el('a', 'acta', 'Contact Mark →'); a.href = '#contact'; d.appendChild(el('br')); d.appendChild(a); }
        var done = function () { speaking = false; setState(micOn || state !== 'asleep' ? 'listening' : 'asleep'); armSleep(); resume(); if (then) then(); };
        if (!window.speechSynthesis) { setTimeout(done, 900); return; }
        speaking = true; pause(); speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.rate = 1.03; u.pitch = 1.1;
        var guard = setTimeout(done, 2500 + text.length * 80); // some browsers never fire onend
        u.onend = u.onerror = function () { clearTimeout(guard); done(); };
        speechSynthesis.speak(u);
      }, reduce ? 0 : 500);
    }
    function armSleep() { clearTimeout(sleepTimer); sleepTimer = setTimeout(function () { if (!speaking && state === 'listening') { setState('asleep'); heard.textContent = 'Say “Artemis” to wake her again.'; } }, 15000); }

    function wake(rest) {
      if (state !== 'asleep') { if (rest) answer(rest); return; }
      setState('listening');
      if (rest && rest.length > 3) { answer(rest); return; }
      speak(greeting());
    }
    function greeting() {
      var h = new Date().getHours(), part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
      return part + "! I'm Artemis, Mark's voice assistant. Ask me something simple, like what I can do, what time it is, or to switch to the Flame orb.";
    }

    var KB = [
      [/\b(what can you do|what do you do|your features|capabilit|help me with)\b/, "On Mark's PC I listen for my name, answer out loud, search the web, open pages, work on files and keep notes, and I always ask before doing anything risky. Here in the browser I can only do the basics.", 1],
      [/\b(who (made|built|created) you|your (creator|maker|developer)|who.*mark)\b/, "Mark Kevin built me. He's an admin and virtual assistant who builds practical AI tools, like me and his call assistant, Scripto."],
      [/\b(your name|who are you|what are you)\b/, "I'm Artemis, a desktop voice assistant. My orb glows while I listen, think and speak."],
      [/\b(time)\b/, function () { return 'It is ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' where you are.'; }],
      [/\b(date|today|day is it)\b/, function () { return 'Today is ' + new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + '.'; }],
      [/\b(how are you|how's it going|how are things)\b/, "I'm glowing nicely, thank you. How can I help?"],
      [/\b(joke|funny)\b/, "Why did the assistant go to school? To improve its listening skills. I'm still working on mine."],
      [/\b(weather|news|search|google|look up|price of|stock)\b/, "In this demo I can't go online. The full version of me can search the web and read the results to you.", 1],
      [/\b(build|make|create).*(assistant|one|me|for (me|us|my))|\b(hire|cost|price|pricing|quote|business|company|contact|reach)\b/, 'Yes! ' + CONTACT, 2],
      [/\b(thank|thanks)\b/, "You're welcome!"],
      [/\b(bye|goodbye|sleep|stop|that's all)\b/, 'Goodbye! Say my name if you need me again.', 0, 'sleep'],
      [/\b(hello|hi|hey)\b/, 'Hello! What would you like to know?']
    ];
    function answer(q) {
      clearTimeout(sleepTimer);
      var t = q.toLowerCase(), th = Object.keys(THEMES).filter(function (n) { return t.indexOf(n.toLowerCase()) > -1; })[0];
      answers++;
      if (th && /\b(orb|theme|switch|change|make|turn|try|go)\b|^\s*\w+\s*$/.test(t)) { setTheme(th); speak(th + ' orb on. ' + (th === 'Classic' ? 'Back to my usual look.' : 'How do I look?')); return; }
      var hit = null; for (var i = 0; i < KB.length; i++) { if (KB[i][0].test(t)) { hit = KB[i]; break; } }
      var text, cta = false, after = null;
      if (hit) { text = typeof hit[1] === 'function' ? hit[1]() : hit[1]; cta = hit[2] === 2; if (hit[3] === 'sleep') after = function () { setState('asleep'); }; if (hit[2] === 2) pitched = true; }
      else { text = "That's beyond what I can do in this little demo."; if (!pitched) { text += ' ' + CONTACT; cta = true; pitched = true; } }
      if (!cta && !pitched && answers >= 3) { text += ' By the way, ' + CONTACT.charAt(0).toLowerCase() + CONTACT.slice(1); cta = true; pitched = true; }
      speak(text, cta, after);
    }

    function hear(text, typed) {
      text = text.trim(); if (!text) return;
      var m = text.match(WAKE);
      if (state === 'asleep') {
        if (!m) { if (!typed) heard.textContent = '“' + text + '” (say “Artemis” first)'; else add('me', text), speak('Say or type my name, “Artemis”, to wake me up first.'); return; }
        add('me', text); wake(text.replace(WAKE, '').replace(/^[\s,.!?]+/, '')); return;
      }
      add('me', text); answer(m ? text.replace(WAKE, '').replace(/^[\s,.!?]+/, '') || text : text);
    }

    // ----- speech recognition -----
    function pause() { if (rec) { try { rec.abort(); } catch (e) {} } }
    function resume() { if (micOn && rec && !speaking) { try { rec.start(); } catch (e) {} } }
    function startMic() {
      if (!Rec) { heard.textContent = 'Voice needs Chrome or Edge on a computer or Android. You can still type to her below.'; micBtn.disabled = true; return; }
      if (!rec) {
        rec = new Rec(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true;
        rec.onresult = function (e) {
          if (speaking) return;
          for (var i = e.resultIndex; i < e.results.length; i++) {
            var r = e.results[i], txt = r[0].transcript;
            if (!r.isFinal) { heard.textContent = txt; if (state === 'asleep' && WAKE.test(txt)) { heard.textContent = ''; } continue; }
            heard.textContent = ''; hear(txt);
          }
        };
        rec.onerror = function (e) {
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { micOn = false; micBtn.disabled = false; micBtn.textContent = '🎤 Allow microphone and start'; heard.textContent = 'Microphone blocked. Allow it in the address bar, or type below.'; setState('asleep'); }
        };
        rec.onend = function () { if (!document.body.contains(box)) { shutdown(); return; } if (micOn && !speaking) setTimeout(resume, 250); };
      }
      micOn = true; micBtn.disabled = true; micBtn.textContent = 'Microphone on'; heard.textContent = 'Listening for “Artemis”…'; setState('asleep'); resume();
    }
    function shutdown() { micOn = false; clearTimeout(sleepTimer); pause(); if (window.speechSynthesis && speaking) speechSynthesis.cancel(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden && micOn) { shutdown(); micBtn.disabled = false; micBtn.textContent = '🎤 Turn the microphone back on'; setState('asleep'); } });

    micBtn.onclick = startMic;
    form.onsubmit = function (e) { e.preventDefault(); var v = input.value; input.value = ''; hear(v, true); };

    setTheme('Classic'); setState('asleep');
    requestAnimationFrame(render);
  };
})();
