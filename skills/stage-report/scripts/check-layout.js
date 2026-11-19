// Layout check for a Stage.js deck. Evaluate this file's text in the deck's page
// (browser console, or any browser tool that can run JavaScript in the page) while
// the deck is in presentation mode. It returns one entry per problem; an empty
// "problems" list means every slide fits its 16:9 canvas.
(() => {
  const problems = [];
  const tolerance = 1.5;
  const describe = el => {
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48);
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls}${text ? ` "${text}"` : ''}`;
  };
  const frames = [...document.querySelectorAll('.slide-frame')];
  for (const frame of frames) {
    const slide = frame.querySelector('.slide');
    if (!slide) { problems.push({ slide: frame.id, issue: 'no .slide inside the frame' }); continue; }
    const box = slide.getBoundingClientRect();
    const scale = box.width / 1920;
    const seen = new Set();
    for (const el of slide.querySelectorAll('*')) {
      if (el.closest('.speaker-notes, .print-poster')) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const outside = r.bottom > box.bottom + tolerance || r.right > box.right + tolerance || r.top < box.top - tolerance || r.left < box.left - tolerance;
      if (outside && ![...seen].some(parent => parent.contains(el))) {
        seen.add(el);
        problems.push({ slide: frame.id, issue: 'content is cut off by the slide edge', element: describe(el) });
      }
      if (el.scrollWidth > el.clientWidth + 2 && ['hidden', 'clip'].includes(style.overflowX) && el !== slide) {
        problems.push({ slide: frame.id, issue: 'content is wider than its box', element: describe(el) });
      }
      const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      const matrix = el instanceof SVGTextElement ? el.getScreenCTM() : null;
      const textScale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
      const fontSize = parseFloat(style.fontSize) * textScale / scale;
      if (ownText && !el.closest('.presentation-ui') && fontSize < 19) {
        problems.push({ slide: frame.id, issue: `text is ${Math.round(fontSize)}px at 1920 wide; keep it at 20px or more`, element: describe(el) });
      }
    }
    const foot = slide.querySelector('.slide-foot, .cover-meta');
    const body = slide.querySelector('.slide-body');
    if (foot && body && body.scrollHeight > body.clientHeight + tolerance) {
      problems.push({ slide: frame.id, issue: 'body content is taller than the space above the footer', element: describe(body.lastElementChild || body) });
    }
    const title = slide.querySelector('.slide-title');
    if (body) {
      const children = [...body.children].filter(el => el.getBoundingClientRect().height);
      const titleText = title ? [...title.querySelectorAll('h1,h2,h3,p')].filter(el => el.getBoundingClientRect().height) : [];
      const titleBottom = titleText.length ? Math.max(...titleText.map(el => el.getBoundingClientRect().bottom)) : title?.getBoundingClientRect().bottom;
      if (title && children.some(el => el.getBoundingClientRect().top < titleBottom - tolerance)) {
        problems.push({ slide: frame.id, issue: 'body content overlaps the title' });
      }
      if (foot && children.some(el => el.getBoundingClientRect().bottom > foot.getBoundingClientRect().top + tolerance)) {
        problems.push({ slide: frame.id, issue: 'body content overlaps the footer' });
      }
    }
  }
  const grouped = new Map();
  for (const p of problems) {
    const key = `${p.slide}|${p.issue}`;
    const entry = grouped.get(key) || { slide: p.slide, issue: p.issue, count: 0, examples: [] };
    entry.count += 1;
    if (p.element && entry.examples.length < 3) entry.examples.push(p.element);
    grouped.set(key, entry);
  }
  return { slides: frames.length, ok: problems.length === 0, problems: [...grouped.values()] };
})()
