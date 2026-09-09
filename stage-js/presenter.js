/* Shared by both sample decks; resolve styles relative to this script. */
const presenterStylesheet = new URL("presenter.css", document.currentScript.src).href;
window.createPresenter = ({ slides, getCurrent, goTo, step, getNext }) => {
  let popup;
  let interval;
  let resizeObserver;
  let rendered;
  let elapsed = 0;
  let started = null;
  const clock = () => elapsed + (started === null ? 0 : Date.now() - started);
  const format = milliseconds => {
    const seconds = Math.floor(milliseconds / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const preview = slide => {
    const doc = document.implementation.createHTMLDocument('Slide preview');
    const base = doc.createElement('base');
    base.href = document.baseURI;
    doc.head.append(base);
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => doc.head.append(style.cloneNode(true)));
    const copy = slide.cloneNode(true);
    copy.setAttribute('aria-hidden', 'false');
    copy.querySelectorAll('.speaker-notes, .stage-media-expand, script, iframe, object, embed').forEach(node => node.remove());
    copy.querySelectorAll('video, audio').forEach(media => {
      const poster = media.getAttribute('poster');
      if (poster) {
        const image = doc.createElement('img');
        image.src = poster;
        image.alt = media.getAttribute('aria-label') || 'Video preview';
        image.className = 'video-preview';
        media.replaceWith(image);
      } else media.remove();
    });
    doc.body.className = 'mode-present';
    doc.body.append(copy);
    return '<!doctype html>' + doc.documentElement.outerHTML;
  };
  const update = () => {
    if (!popup || popup.closed) return;
    const doc = popup.document;
    const current = getCurrent();
    if (rendered !== current) {
      rendered = current;
      const next = getNext();
      doc.querySelector('#current').srcdoc = preview(current);
      doc.querySelector('#next').srcdoc = next ? preview(next) : '<body style="background:#20211e;color:#aaa;font:48px system-ui;display:grid;place-items:center;height:95vh">End of presentation</body>';
      doc.querySelector('#title').textContent = current.dataset.title || current.id;
      doc.querySelector('#count').textContent = `${slides.indexOf(current) + 1} / ${slides.length}`;
      doc.querySelector('#notes').textContent = current.querySelector('.speaker-notes')?.textContent.trim() || 'No speaker notes for this slide.';
      doc.querySelector('#jump').value = current.id;
      doc.querySelector('#previous').disabled = slides.indexOf(current) === 0;
      doc.querySelector('#advance').disabled = !next;
    }
    doc.querySelector('#elapsed').textContent = format(clock());
    doc.querySelector('#wall-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const open = () => {
    if (popup && !popup.closed) { popup.focus(); return; }
    popup = window.open('', '_blank', 'popup,width=1280,height=850');
    if (!popup) {
      window.alert('Allow pop-ups for this deck, then press P again.');
      return;
    }
    clearInterval(interval);
    resizeObserver?.disconnect();
    rendered = null;
    const doc = popup.document;
    doc.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Presenter · ${document.title.replace(/[<>&"]/g, '')}</title></head><body><header><div><small>Presenter view</small><h1 id="title"></h1></div><div><span id="count"></span> · <time id="wall-clock"></time></div></header><main class="workspace"><section><div class="label">Audience · current slide</div><div class="preview"><iframe id="current" title="Current slide preview" sandbox="allow-same-origin" tabindex="-1"></iframe></div><nav><button id="previous">← Previous</button><label>Go to slide <select id="jump"></select></label><button id="advance">Next →</button></nav><div class="timer"><div><small>Elapsed time</small><div id="elapsed">00:00</div></div><button id="timer">Start timer</button><button id="reset">Reset</button></div></section><section><div class="label">Up next</div><div class="preview"><iframe id="next" title="Next slide preview" sandbox="allow-same-origin" tabindex="-1"></iframe></div><h2>Speaker notes</h2><div id="notes"></div></section></main><footer>Share only the audience window. Keep this window on your own display.<br>← → / Space to navigate · Home / End to jump · You can close and reopen this window with P.</footer></body></html>`);
    doc.close();
    const stylesheet = doc.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = presenterStylesheet;
    doc.head.append(stylesheet);
    // Copy only the documented UI tokens, never the slide theme's layout rules.
    const theme = getComputedStyle(document.documentElement);
    for (const token of ['--stage-accent', '--stage-ui-bg', '--stage-ui-ink', '--stage-ui-line', '--stage-ui-muted', '--stage-ui-surface', '--stage-ui-hover']) {
      const value = theme.getPropertyValue(token).trim();
      if (value) doc.documentElement.style.setProperty(token, value);
    }
    slides.forEach((slide, index) => {
      const option = doc.createElement('option');
      option.value = slide.id;
      option.textContent = `${index + 1}. ${slide.dataset.title || slide.id}${slide.hasAttribute('data-appendix') ? ' (Appendix)' : ''}`;
      doc.querySelector('#jump').append(option);
    });
    doc.querySelector('#jump').addEventListener('change', event => goTo(slides.find(slide => slide.id === event.target.value)));
    doc.querySelector('#previous').onclick = () => step(-1);
    doc.querySelector('#advance').onclick = () => step(1);
    const timerButton = doc.querySelector('#timer');
    timerButton.textContent = started === null ? 'Start timer' : 'Pause timer';
    timerButton.onclick = () => {
      if (started === null) started = Date.now();
      else { elapsed = clock(); started = null; }
      timerButton.textContent = started === null ? 'Resume timer' : 'Pause timer';
      update();
    };
    doc.querySelector('#reset').onclick = () => {
      elapsed = 0; started = null; timerButton.textContent = 'Start timer'; update();
    };
    doc.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('select, input, textarea, [contenteditable]')) return;
      if (event.target.closest('button') && event.key === ' ') return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); step(1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); step(-1); }
      else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        const main = slides.filter(slide => !slide.hasAttribute('data-appendix'));
        goTo(event.key === 'Home' ? main[0] : main.at(-1));
      }
    });
    resizeObserver = new popup.ResizeObserver(entries => entries.forEach(entry => {
      entry.target.querySelector('iframe').style.transform = `scale(${entry.contentRect.width / 1600})`;
    }));
    doc.querySelectorAll('.preview').forEach(frame => resizeObserver.observe(frame));
    interval = setInterval(() => {
      if (popup.closed) { clearInterval(interval); resizeObserver.disconnect(); return; }
      update();
    }, 250);
    update();
  };
  window.addEventListener('pagehide', () => {
    clearInterval(interval);
    resizeObserver?.disconnect();
    if (popup && !popup.closed) popup.close();
  });
  return { open, update };
};
