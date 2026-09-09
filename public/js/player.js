// Pantalla de jugador — mobile-first, sin ningún control de host.

(function () {
  const CASH_GAUGE_MAX = 40000;
  const VOTED_KEY = 'rn_votedRound'; // "gameId::título" de la última decisión ya votada, persistido

  const socket = io();
  const clientId = getClientId();

  function fillPct(value, max) {
    return Math.max(0, Math.min(100, (value / max) * 100));
  }

  // Actualiza el texto de un gauge y, si cambió, dispara un pulso sutil de
  // opacidad (feedback de "este número se acaba de mover"). `delayMs` permite
  // desfasar el gauge de valor respecto al de caja en el reveal.
  function setGaugeValue(el, text, delayMs) {
    if (!el) return;
    if (el.textContent === text) return;
    el.textContent = text;
    const pulse = () => {
      el.classList.add('is-updating');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-updating')));
    };
    if (delayMs) setTimeout(pulse, delayMs); else pulse();
  }

  function judgeMeta(type) {
    if (type === 'correct') return { cls: 'judge-positive', icon: '✓', label: 'Correcta' };
    if (type === 'incorrect') return { cls: 'judge-negative', icon: '✕', label: 'Incorrecta' };
    return { cls: 'judge-neutral', icon: '–', label: 'Neutral' };
  }

  function renderGauges(prefix, cash, value, goal) {
    const cashEl = document.getElementById(prefix + '-cash');
    const valueEl = document.getElementById(prefix + '-value');
    setGaugeValue(cashEl, money(cash), 0);
    setGaugeValue(valueEl, money(value), 80);

    const cashFill = document.getElementById(prefix + '-cash-fill');
    if (cashFill) {
      cashFill.style.width = fillPct(cash, CASH_GAUGE_MAX) + '%';
      cashFill.classList.toggle('negative', cash <= 0);
    }
    const valueFill = document.getElementById(prefix + '-value-fill');
    if (valueFill) valueFill.style.width = fillPct(value, goal) + '%';

    const goalEl = document.getElementById(prefix + '-goal');
    if (goalEl) goalEl.textContent = money(goal);
  }

  function renderEffectSummary(container, effect) {
    const cashUp = effect.cashAfter >= effect.cashBefore;
    const valueUp = effect.valueAfter >= effect.valueBefore;
    container.innerHTML =
      '<div class="effect-item">Caja: <span class="arrow-from">' + money(effect.cashBefore) +
      '</span> → <span class="arrow-to ' + (cashUp ? 'up' : 'down') + '">' + money(effect.cashAfter) + '</span></div>' +
      '<div class="effect-item">Valor de mercado: <span class="arrow-from">' + money(effect.valueBefore) +
      '</span> → <span class="arrow-to ' + (valueUp ? 'up' : 'down') + '">' + money(effect.valueAfter) + '</span></div>';
  }

  function renderVoteOptionsResult(container, reveal) {
    container.innerHTML = '';
    const maxVotes = Math.max(1, ...reveal.counts);
    reveal.options.forEach((opt, idx) => {
      const isWinner = reveal.winningIndex === idx;
      const judge = judgeMeta(opt.type);
      const div = document.createElement('div');
      div.className = 'vote-result-option ' + judge.cls + (isWinner ? ' winner' : '');
      const votes = reveal.counts[idx];
      const pctWidth = reveal.totalVotes > 0 ? (votes / maxVotes) * 100 : 0;
      div.innerHTML =
        '<div class="vote-result-head">' +
          '<span class="judge-tag ' + judge.cls + '">' + judge.icon + ' ' + judge.label + '</span>' +
          (isWinner ? '<span class="winner-tag">★ Más votada</span>' : '') +
        '</div>' +
        '<div class="vote-result-text">' + opt.text + '</div>' +
        '<div class="vote-bar-track"><div class="vote-bar-fill" style="width:' + pctWidth + '%"></div></div>' +
        '<div class="vote-count-label">' + votes + ' voto' + (votes === 1 ? '' : 's') + '</div>';
      container.appendChild(div);
    });
  }

  function renderExplanation(container, reveal) {
    if (reveal.winningIndex === null) {
      container.innerHTML = '<div class="no-votes-box">Nadie votó en esta ronda — no se aplicaron cambios.</div>';
      return;
    }
    const opt = reveal.winningOption;
    container.innerHTML = opt && opt.explanation
      ? '<div class="explanation-box">' + opt.explanation + '</div>'
      : '';
  }

  function renderVotingOptions(d, gameId) {
    const container = document.getElementById('voting-options');
    const waitingNote = document.getElementById('voting-waiting');
    const roundKey = gameId + '::' + d.title;
    const alreadyVoted = localStorage.getItem(VOTED_KEY) === roundKey;

    if (alreadyVoted) {
      container.innerHTML = '';
      waitingNote.hidden = false;
      return;
    }

    waitingNote.hidden = true;
    container.innerHTML = '';
    d.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => {
        localStorage.setItem(VOTED_KEY, roundKey);
        socket.emit('player:vote', { clientId, optionIndex: idx });
        container.querySelectorAll('.option-btn').forEach((b) => (b.disabled = true));
        btn.classList.add('selected');
        waitingNote.hidden = false;
        container.innerHTML = '';
      });
      container.appendChild(btn);
    });
  }

  function render(state) {
    document.querySelectorAll('[data-phase]').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.phase === state.phase);
    });

    if (state.phase === 'lobby') {
      document.getElementById('lobby-cash').textContent = money(state.startingCash);
      document.getElementById('lobby-value').textContent = money(state.startingValue);
    }

    if (state.phase === 'voting' && state.currentDecision) {
      const d = state.currentDecision;
      document.getElementById('voting-theme').textContent = d.theme;
      document.getElementById('voting-title').textContent = d.title;
      document.getElementById('voting-scenario').textContent = d.scenario;
      renderVotingOptions(d, state.gameId);
    }

    if (state.phase === 'reveal' && state.reveal) {
      const r = state.reveal;
      document.getElementById('reveal-theme').textContent = r.theme;
      document.getElementById('reveal-title').textContent = r.title;
      document.getElementById('reveal-scenario').textContent = r.scenario;
      renderVoteOptionsResult(document.getElementById('reveal-options'), r);
      renderExplanation(document.getElementById('reveal-explanation'), r);
      renderGauges('reveal', state.cash, state.value, state.goal);
      renderEffectSummary(document.getElementById('reveal-effect'), r);
    }

    if (state.phase === 'event' && state.event) {
      const e = state.event;
      document.getElementById('event-icon').textContent = e.icon;
      document.getElementById('event-title').textContent = e.title;
      document.getElementById('event-desc').textContent = e.description;
      renderGauges('event', state.cash, state.value, state.goal);
      renderEffectSummary(document.getElementById('event-effect'), e);
    }

    if (state.phase === 'success') {
      document.getElementById('success-cash').textContent = money(state.cash);
      document.getElementById('success-value').textContent = money(state.value);
    }

    if (state.phase === 'stagnant') {
      document.getElementById('stagnant-cash').textContent = money(state.cash);
      document.getElementById('stagnant-value').textContent = money(state.value);
    }
  }

  socket.on('state', render);
})();
