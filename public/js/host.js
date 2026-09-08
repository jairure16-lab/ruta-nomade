// Pantalla de host — muestra/oculta secciones según state.phase y renderiza
// los datos recibidos por socket. Sin ningún framework.

(function () {
  const CASH_GAUGE_MAX = 40000; // solo referencia visual para el ancho del gauge

  const socket = io();

  function fillPct(value, max) {
    return Math.max(0, Math.min(100, (value / max) * 100));
  }

  function renderHistoryRows(tbody, history) {
    tbody.innerHTML = '';
    history.forEach((row) => {
      const tr = document.createElement('tr');
      const label = row.type === 'event' ? (row.icon + ' ' + row.title) : row.title;
      tr.innerHTML =
        '<td>' + row.num + '</td>' +
        '<td>' + label + '</td>' +
        '<td><span class="result-badge ' + resultClass(row.result) + '">' + resultIcon(row.result) + '</span></td>' +
        '<td>' + money(row.cashAfter) + '</td>' +
        '<td>' + money(row.valueAfter) + '</td>';
      tbody.appendChild(tr);
    });
  }

  function renderGauges(prefix, cash, value, goal) {
    const cashEl = document.getElementById(prefix + '-cash');
    const valueEl = document.getElementById(prefix + '-value');
    if (cashEl) cashEl.textContent = money(cash);
    if (valueEl) valueEl.textContent = money(value);

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
      const div = document.createElement('div');
      div.className = 'vote-result-option' + (isWinner ? ' winner' : '');
      const votes = reveal.counts[idx];
      const pctWidth = reveal.totalVotes > 0 ? (votes / maxVotes) * 100 : 0;
      div.innerHTML =
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

  function render(state) {
    document.querySelectorAll('[data-phase]').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.phase === state.phase);
    });

    if (state.phase === 'lobby') {
      const storyEl = document.getElementById('briefing-story');
      storyEl.innerHTML = state.briefing.story.map((p) => '<p>' + p + '</p>').join('');
      document.getElementById('lobby-goal').textContent = money(state.goal);
      document.getElementById('lobby-cash').textContent = money(state.startingCash);
      document.getElementById('lobby-value').textContent = money(state.startingValue);
    }

    if (state.phase === 'voting' && state.currentDecision) {
      const d = state.currentDecision;
      document.getElementById('voting-theme').textContent = d.theme;
      document.getElementById('voting-title').textContent = d.title;
      document.getElementById('voting-scenario').textContent = d.scenario;
      document.getElementById('voting-count').textContent = d.voteCount;
      renderGauges('voting', state.cash, state.value, state.goal);

      const optContainer = document.getElementById('voting-options');
      optContainer.innerHTML = '';
      d.options.forEach((opt) => {
        const div = document.createElement('div');
        div.className = 'option-card';
        div.textContent = opt.text;
        optContainer.appendChild(div);
      });

      renderHistoryRows(document.getElementById('voting-history'), state.history);
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

    if (state.phase === 'bankrupt') {
      renderHistoryRows(document.getElementById('bankrupt-history'), state.history);
    }

    if (state.phase === 'success') {
      document.getElementById('success-cash').textContent = money(state.cash);
      document.getElementById('success-value').textContent = money(state.value);
      renderHistoryRows(document.getElementById('success-history'), state.history);
    }

    if (state.phase === 'stagnant') {
      document.getElementById('stagnant-cash').textContent = money(state.cash);
      document.getElementById('stagnant-value').textContent = money(state.value);
      renderHistoryRows(document.getElementById('stagnant-history'), state.history);
    }
  }

  fetch('/api/public-url').then((r) => r.json()).then((data) => {
    document.getElementById('qr-link').textContent = data.publicUrl;
  }).catch(() => {});

  document.getElementById('btn-start').addEventListener('click', () => socket.emit('host:start'));
  document.getElementById('btn-close-vote').addEventListener('click', () => socket.emit('host:closeVote'));
  document.getElementById('btn-next-reveal').addEventListener('click', () => socket.emit('host:next'));
  document.getElementById('btn-next-event').addEventListener('click', () => socket.emit('host:next'));
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('¿Reiniciar la simulación? Esto corta cualquier partida en curso.')) {
      socket.emit('host:reset');
    }
  });

  socket.on('state', render);
})();
