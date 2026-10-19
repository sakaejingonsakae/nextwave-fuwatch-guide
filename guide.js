(() => {
  'use strict';
  const guide = window.NEXTWAVE_GUIDE;
  const host = document.getElementById('chapters');
  const viewer = document.getElementById('image-viewer');
  const viewerImage = document.getElementById('viewer-image');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const glossaryHost = document.getElementById('glossary-list');
  const searchInput = document.getElementById('guide-search');
  const searchResults = document.getElementById('search-results');
  const resultList = document.getElementById('result-list');
  const clearButton = document.getElementById('clear-search');
  const tabs = document.getElementById('guide-tabs');
  const panels = { guide: document.getElementById('panel-guide'), glossary: document.getElementById('panel-glossary') };
  const tabButtons = { guide: document.getElementById('tab-guide'), glossary: document.getElementById('tab-glossary') };
  const topicsById = new Map();
  let activeView = 'guide';
  let composing = false;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(direction = 'down') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    const paths = { down: 'm6 9 6 6 6-6', left: 'm15 6-6 6 6 6', right: 'm9 6 6 6-6 6' };
    path.setAttribute('d', paths[direction]);
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.7');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return svg;
  }

  function failedSlide(topic, index, count) {
    const card = el('div', 'placeholder placeholder-empty');
    const top = el('div', 'placeholder-top');
    top.append(el('span', 'placeholder-brand', 'NEXTWAVE'));
    top.append(el('span', 'placeholder-status', '画像未表示'));
    const center = el('div', 'placeholder-center');
    center.append(el('p', 'placeholder-kicker', `${topic.title} ${index + 1}枚目`));
    center.append(el('p', 'placeholder-title', '画像を読み込めませんでした。'));
    center.append(el('p', 'placeholder-point', 'ページを再読み込みしてお試しください。'));
    card.append(top, center, el('p', 'placeholder-page', `${index + 1} / ${count}　・　4:5`));
    return card;
  }

  function makeCarousel(topic, instanceId = topic.id) {
    const sourceSlides = topic.slides || [];
    const count = sourceSlides.length;
    if (!count) return null;
    const region = el('section', 'carousel');
    region.setAttribute('aria-label', `${topic.title}のカルーセル`);
    region.setAttribute('aria-roledescription', 'カルーセル');
    const track = el('div', 'carousel-track');
    track.id = `carousel-${instanceId}`;
    track.tabIndex = 0;
    track.setAttribute('aria-label', '左右の矢印キー、または横にスワイプして読む');
    const slides = [];
    for (let index = 0; index < count; index++) {
      const slide = el('div', 'slide');
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'スライド');
      slide.setAttribute('aria-label', `${count}枚中${index + 1}枚目`);
      const data = sourceSlides[index];
      const src = typeof data === 'string' ? data : data?.src;
      if (src) {
        const imageButton = el('button', 'image-open');
        imageButton.type = 'button';
        imageButton.setAttribute('aria-label', `${data?.alt || `${topic.title} ${index + 1}枚目`}。画像を拡大`);
        const picture = el('picture');
        if (data?.previews?.length) {
          const source = el('source');
          source.type = 'image/webp';
          source.srcset = data.previews.map(preview => `${preview.src} ${preview.width}w`).join(', ');
          source.sizes = '(max-width: 560px) calc(100vw - 64px), 480px';
          picture.append(source);
        }
        const image = el('img');
        image.alt = data?.alt || `${topic.title} ${index + 1}枚目`;
        image.width = data?.width || 1080;
        image.height = data?.height || 1350;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.addEventListener('error', () => {
          const source = picture.querySelector('source');
          if (source) {
            source.remove();
            image.src = src;
            return;
          }
          slide.replaceChildren(failedSlide(topic, index, count));
        });
        imageButton.addEventListener('click', () => {
          viewerImage.src = src;
          viewerImage.alt = image.alt;
          viewer.showModal();
        });
        picture.append(image);
        image.src = src;
        imageButton.append(picture);
        slide.append(imageButton);
      } else {
        slide.append(failedSlide(topic, index, count));
      }
      slides.push(slide);
      track.append(slide);
    }

    const controls = el('div', 'carousel-controls');
    const prev = el('button', 'carousel-arrow');
    const next = el('button', 'carousel-arrow');
    prev.type = next.type = 'button';
    prev.setAttribute('aria-label', '前の画像');
    next.setAttribute('aria-label', '次の画像');
    prev.setAttribute('aria-controls', track.id);
    next.setAttribute('aria-controls', track.id);
    prev.append(icon('left'), el('span', '', '前へ'));
    next.append(el('span', '', '次へ'), icon('right'));
    const caption = el('div', 'carousel-caption');
    const counter = el('p', 'carousel-counter');
    const announcement = el('span', 'sr-only');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    caption.append(counter, el('p', 'carousel-hint', '横にスワイプして読む'), announcement);
    controls.append(prev, caption, next);
    const pagination = el('div', 'carousel-dots');
    pagination.setAttribute('role', 'group');
    pagination.setAttribute('aria-label', '表示する画像を選ぶ');
    const dots = [];
    for (let index = 0; index < count; index++) {
      const dot = el('button', 'carousel-dot');
      dot.type = 'button';
      dot.setAttribute('aria-label', `${index + 1}枚目を表示`);
      dot.setAttribute('aria-controls', track.id);
      dot.addEventListener('click', () => goTo(index));
      dots.push(dot);
      pagination.append(dot);
    }
    region.append(track, controls, pagination);
    let current = 0;

    function update(index) {
      current = Math.max(0, Math.min(count - 1, index));
      counter.textContent = `${current + 1} / ${count}`;
      announcement.textContent = `${count}枚中${current + 1}枚目`;
      prev.disabled = current === 0;
      next.disabled = current === count - 1;
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
      slides.forEach((slide, i) => {
        slide.setAttribute('aria-hidden', String(i !== current));
        const imageButton = slide.querySelector('.image-open');
        if (imageButton) imageButton.tabIndex = i === current ? 0 : -1;
      });
    }

    function goTo(index) {
      const target = Math.max(0, Math.min(count - 1, index));
      if (track.clientWidth === 0) return;
      // scroll events update the counter only when the requested slide is in view.
      track.scrollTo({ left: target * track.clientWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    prev.addEventListener('click', () => goTo(current - 1));
    next.addEventListener('click', () => goTo(current + 1));
    track.addEventListener('keydown', event => {
      const destinations = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: count - 1 };
      if (event.key in destinations) {
        event.preventDefault();
        goTo(destinations[event.key]);
      }
    });
    let scheduled = false;
    track.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        if (track.clientWidth) update(Math.round(track.scrollLeft / track.clientWidth));
      });
    }, { passive: true });
    // Opening an accordion or rotating the phone preserves the selected slide.
    new ResizeObserver(entries => {
      if (entries[0].contentRect.width > 0) {
        track.scrollTo({ left: current * track.clientWidth, behavior: 'instant' });
      }
    }).observe(track);
    update(0);
    return region;
  }

  function makeTranscript(topic, instanceId) {
    const pages = (topic.slides || []).map((slide, index) => ({ ...slide, index })).filter(slide => slide.text?.trim());
    if (!pages.length) return null;
    const details = el('details', 'transcript');
    details.id = `text-${instanceId}`;
    const summary = el('summary', 'transcript-summary');
    summary.setAttribute('aria-label', `${topic.title}を文章で読む`);
    summary.append(el('span', '', '文章で読む'), icon());
    const body = el('div', 'transcript-body');
    body.append(el('p', 'transcript-note', '画像のポイントを文章で確認できます。'));
    pages.forEach(page => {
      const section = el('section', 'transcript-page');
      section.append(el('h4', 'transcript-heading', `${page.index + 1}枚目`), el('p', 'transcript-text', page.text));
      body.append(section);
    });
    details.append(summary, body);
    return details;
  }

  function appendCarousels(body, topic, instanceId) {
    if (!topic) return;
    if (Array.isArray(topic.carousels)) {
      topic.carousels.forEach(part => {
        if (!part.slides?.length) return;
        const section = el('div', 'carousel-set');
        section.append(el('p', 'carousel-set-title', part.title));
        const carouselTopic = { ...topic, ...part, title: `${topic.title}${part.title}` };
        const carouselId = `${instanceId}-${part.id}`;
        section.append(makeCarousel(carouselTopic, carouselId));
        const transcript = makeTranscript(carouselTopic, carouselId);
        if (transcript) section.append(transcript);
        body.append(section);
      });
    } else {
      const carousel = makeCarousel(topic, instanceId);
      if (carousel) body.append(carousel);
      const transcript = makeTranscript(topic, instanceId);
      if (transcript) body.append(transcript);
    }
  }

  function makeTemplate(template, instanceId) {
    const section = el('section', 'profile-template');
    const title = el('h3', 'template-title', template.title);
    title.id = `template-heading-${instanceId}`;
    section.setAttribute('aria-labelledby', title.id);
    const help = el('p', 'template-help', 'コピーして、自分の内容に書き換えて使おう。');
    help.id = `template-help-${instanceId}`;
    const field = el('textarea', 'template-text');
    field.id = `template-text-${instanceId}`;
    field.value = template.text;
    field.readOnly = true;
    field.spellcheck = false;
    field.setAttribute('aria-label', `${template.title}の全文`);
    field.setAttribute('aria-describedby', help.id);
    const copyButton = el('button', 'template-copy', 'テンプレートをコピー');
    copyButton.type = 'button';
    copyButton.setAttribute('aria-controls', field.id);
    const status = el('p', 'template-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const preview = el('details', 'template-preview');
    const previewSummary = el('summary', 'template-preview-summary');
    previewSummary.append(el('span', '', 'テンプレートの中身を見る'), icon());
    preview.append(previewSummary, field);
    copyButton.addEventListener('click', async () => {
      let copied = false;
      copyButton.disabled = true;
      copyButton.textContent = 'コピー中…';
      status.textContent = '';
      try {
        const result = await window.NEXTWAVE_CLIPBOARD.copy(template.text, field, () => { preview.open = true; });
        copied = result === 'copied';
        status.textContent = result === 'copied'
          ? 'テンプレート全文をコピーしました。'
          : '自動コピーできませんでした。選択した文章を、長押しやCtrl+Cでコピーしてください。';
      } catch (_) {
        preview.open = true;
        field.focus({ preventScroll: true });
        field.select();
        status.textContent = '自動コピーできませんでした。枠内の文章を選択してコピーしてください。';
      } finally {
        copyButton.disabled = false;
        copyButton.textContent = 'テンプレートをコピー';
        if (copied) copyButton.focus({ preventScroll: true });
      }
    });
    section.append(title, help, copyButton, status, preview);
    return section;
  }

  function makeIllustration(data) {
    const figure = el('figure', 'term-illustration');
    const button = el('button', 'image-open illustration-open');
    button.type = 'button';
    button.setAttribute('aria-label', `${data.caption}。画像を拡大`);
    const image = el('img');
    image.alt = data.alt;
    image.width = data.width;
    image.height = data.height;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      button.hidden = true;
      figure.querySelector('.illustration-hint')?.remove();
      figure.prepend(el('p', 'illustration-error', '画像を読み込めませんでした。ページを再読み込みしてお試しください。'));
    });
    button.addEventListener('click', () => {
      viewerImage.src = data.src;
      viewerImage.alt = data.alt;
      viewer.showModal();
    });
    image.src = data.src;
    button.append(image);
    const caption = el('figcaption', 'illustration-caption');
    caption.append(el('span', '', data.caption), el('span', 'illustration-hint', '画像をタップして拡大'));
    figure.append(button, caption);
    return figure;
  }

  function makeVisitGuide(visit, topicId) {
    const figure = el('figure', 'visit-map');
    const caption = el('figcaption', 'visit-map-title', visit.title);
    caption.id = `visit-heading-${topicId}`;
    figure.setAttribute('aria-labelledby', caption.id);
    const root = el('p', 'visit-root', visit.prompt);
    const choices = el('ul', 'visit-choices');
    visit.paths.forEach(path => {
      const choice = el('li', 'visit-choice');
      const purpose = el('p', 'visit-purpose', path.purpose);
      const destination = el('p', 'visit-destination');
      const arrow = el('span', 'visit-arrow', '↓');
      arrow.setAttribute('aria-hidden', 'true');
      destination.append(arrow, el('strong', '', path.destination));
      choice.append(purpose, destination, el('p', 'visit-detail', path.text));
      if (path.example) choice.append(el('p', 'visit-example', `「${path.example}」`));
      if (path.note) choice.append(el('p', 'visit-choice-note', path.note));
      choices.append(choice);
    });
    const stepsLabel = el('p', 'visit-step-label', '枠に入ったら、この順で');
    const steps = el('ol', 'visit-steps');
    visit.steps.forEach((text, index) => {
      const step = el('li', 'visit-step');
      const number = el('span', 'visit-step-number', String(index + 1));
      number.setAttribute('aria-hidden', 'true');
      step.append(number, el('span', '', text));
      steps.append(step);
    });
    const note = el('aside', 'visit-note');
    note.append(el('strong', '', visit.noteTitle), el('p', '', visit.note));
    figure.append(caption, root, choices, stepsLabel, steps, note);
    return figure;
  }

  function makeTopic(topic, isTerm = false) {
    const details = el('details', isTerm ? 'topic term' : 'topic');
    details.id = isTerm ? `term-${topic.id}` : topic.id;
    const summary = el('summary', 'topic-summary');
    summary.append(el('span', 'topic-dot'), el('span', 'topic-title', topic.title));
    const arrow = icon();
    arrow.classList.add('chevron');
    summary.append(arrow);
    const body = el('div', 'topic-body');
    if (topic.intro?.trim() && !(isTerm && topic.sections?.length)) body.append(el('p', 'action', topic.intro));
    if (isTerm && topic.sections?.length) {
      topic.sections.forEach((section, index) => {
        const block = el('section', `term-section${section.emphasis ? ' term-section-point' : ''}`);
        const heading = el('h4', 'term-section-heading', `■ ${section.title}`);
        heading.id = `section-${details.id}-${index}`;
        block.setAttribute('aria-labelledby', heading.id);
        if (index === 0 && topic.mascot) {
          const header = el('div', 'term-section-header');
          const mascot = el('img', 'term-mascot');
          mascot.src = topic.mascot.src;
          mascot.alt = topic.mascot.alt;
          mascot.width = topic.mascot.width;
          mascot.height = topic.mascot.height;
          mascot.loading = 'lazy';
          mascot.decoding = 'async';
          mascot.addEventListener('error', () => mascot.remove());
          header.append(heading, mascot);
          block.append(header);
        } else {
          block.append(heading);
        }
        const blocks = section.blocks || (section.paragraphs || []).map(text => ({type: 'paragraph', text}));
        blocks.forEach(content => {
          if (content.type === 'image') {
            block.append(makeIllustration(content));
            return;
          }
          const paragraph = el('p', 'term-section-text');
          paragraph.append(el(section.emphasis ? 'strong' : 'span', '', content.text));
          block.append(paragraph);
        });
        if (section.items?.length) {
          const list = el('ul', 'term-section-list');
          section.items.forEach(text => list.append(el('li', '', text)));
          block.append(list);
        }
        body.append(block);
      });
    }
    if (isTerm && topic.illustration) body.append(makeIllustration(topic.illustration));
    if (isTerm && topic.visitGuide) body.append(makeVisitGuide(topic.visitGuide, details.id));
    if (isTerm && topic.points?.length) {
      const facts = el('div', 'term-facts');
      if (topic.summaryLabel) facts.append(el('p', 'term-facts-label', topic.summaryLabel));
      const list = el('dl', 'term-facts-list');
      topic.points.forEach(point => {
        const row = el('div', 'term-fact');
        row.append(el('dt', '', point.label), el('dd', '', point.text));
        list.append(row);
      });
      facts.append(list);
      if (topic.summaryNote) facts.append(el('p', 'term-facts-note', topic.summaryNote));
      body.append(facts);
    }
    if (topic.examples?.length) {
      const examples = el('section', 'title-examples');
      const heading = el('h4', 'examples-heading', 'タイトルの例');
      const list = el('ul', 'examples-list');
      topic.examples.forEach(example => list.append(el('li', '', `「${example}」`)));
      examples.append(heading, list);
      body.append(examples);
    }
    if (topic.tip?.trim()) {
      const tip = el('aside', 'tip');
      tip.append(el('strong', 'tip-label', 'NEXTWAVEの豆知識'), el('p', '', topic.tip));
      body.append(tip);
    }
    const carouselTopic = isTerm && topic.topicId ? topicsById.get(topic.topicId) : topic;
    if (!isTerm && topic.template?.text) body.append(makeTemplate(topic.template, details.id));
    appendCarousels(body, carouselTopic, details.id);
    if (isTerm) {
      const links = el('div', 'term-links');
      if (topic.documentSource) links.append(el('p', 'source-document', `資料：${topic.documentSource}`));
      if (topic.topicId) {
        const related = el('a', 'related-link', `ガイドの「${carouselTopic.title}」を見る`);
        related.href = `#${topic.topicId}`;
        links.append(related);
      }
      const references = topic.references || (topic.source ? [{ title: 'ふわっち公式ヘルプ', url: topic.source }] : []);
      references.forEach(reference => {
        const source = el('a', 'source-link', `出典：${reference.title} ↗`);
        source.href = reference.url;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        links.append(source);
      });
      if (topic.checkedAt) links.append(el('p', 'source-checked', `${topic.checkedAt} 確認`));
      body.append(links);
    }
    const backLink = el('a', 'back-to-guide', '検索・目次へ');
    backLink.href = '#guide';
    body.append(backLink);
    details.append(summary, body);
    return details;
  }

  function makeChapter(chapter) {
    const details = el('details', 'chapter');
    details.id = chapter.id;
    const summary = el('summary', 'chapter-summary');
    const badge = el('span', 'badge');
    badge.setAttribute('aria-hidden', 'true');
    badge.append(el('span', 'badge-number', chapter.number));
    const text = el('span', 'chapter-copy');
    const titleRow = el('span', 'chapter-heading');
    titleRow.append(el('span', 'chapter-title', chapter.title));
    if (chapter.number === '0') titleRow.append(el('span', 'start-label', 'ここから'));
    text.append(titleRow, el('span', 'chapter-subtitle', chapter.subtitle));
    const arrow = icon();
    arrow.classList.add('chevron');
    summary.setAttribute('aria-label', `${chapter.number} ${chapter.title}。${chapter.subtitle}`);
    summary.append(badge, text, arrow);
    const body = el('div', 'chapter-body');
    chapter.groups.forEach(group => {
      if (group.title) {
        const heading = el('h3', 'section-heading');
        const star = el('span', 'section-star', '★');
        star.setAttribute('aria-hidden', 'true');
        heading.append(star, document.createTextNode(group.title));
        body.append(heading);
      }
      group.topics.forEach(topic => {
        topicsById.set(topic.id, topic);
        body.append(makeTopic(topic));
      });
    });
    details.append(summary, body);
    return details;
  }

  guide.chapters.forEach(chapter => host.append(makeChapter(chapter)));
  (guide.glossary || []).forEach(term => glossaryHost.append(makeTopic(term, true)));
  const searchEntries = window.NEXTWAVE_SEARCH.buildIndex(guide);

  function showView(view) {
    activeView = view;
    Object.keys(panels).forEach(key => {
      panels[key].hidden = key !== view;
      tabButtons[key].setAttribute('aria-selected', String(key === view));
      tabButtons[key].tabIndex = key === view ? 0 : -1;
    });
  }

  function renderSearch() {
    const query = searchInput.value.trim();
    clearButton.hidden = !searchInput.value;
    searchResults.hidden = !query;
    tabs.hidden = Boolean(query);
    if (!query) {
      showView(activeView);
      resultList.replaceChildren();
      document.getElementById('search-count').textContent = '';
      return;
    }
    Object.values(panels).forEach(panel => { panel.hidden = true; });
    const matches = window.NEXTWAVE_SEARCH.search(searchEntries, query);
    resultList.replaceChildren();
    document.getElementById('search-count').textContent = `${matches.length}件`;
    document.getElementById('search-empty').hidden = matches.length > 0;
    matches.forEach(match => {
      const link = el('a', 'search-result');
      link.href = `#${match.id}`;
      const meta = el('div', 'result-meta');
      meta.append(el('span', `result-kind ${match.kind}`, match.kind === 'guide' ? 'ガイド' : '用語集'));
      if (match.kind === 'guide') meta.append(el('span', 'result-context', match.context));
      const title = el('div', 'result-title');
      title.append(el('strong', '', match.title), icon('right'));
      link.append(meta, title, el('p', 'result-description', match.description));
      resultList.append(link);
    });
  }

  function clearSearch(focusInput = false) {
    searchInput.value = '';
    renderSearch();
    if (focusInput) searchInput.focus();
  }

  function setHash(hash, replace = false) {
    if (location.hash === hash) return;
    try { history[replace ? 'replaceState' : 'pushState'](null, '', hash); } catch (_) { /* file preview can still navigate without history */ }
  }

  function openDestination(id, shouldScroll = true) {
    if (id === 'guide' || id === 'glossary') {
      clearSearch();
      showView(id);
      if (shouldScroll) requestAnimationFrame(() => {
        searchInput.focus({ preventScroll: true });
        document.getElementById('guide').scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      });
      return;
    }
    const target = document.getElementById(id);
    if (!target?.matches('.topic, .chapter')) return;
    clearSearch();
    showView(id.startsWith('term-') ? 'glossary' : 'guide');
    if (target.matches('.topic')) {
      const chapter = target.closest('.chapter');
      if (chapter) chapter.open = true;
    }
    target.open = true;
    if (shouldScroll) requestAnimationFrame(() => {
      target.querySelector('summary').focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    });
  }

  Object.entries(tabButtons).forEach(([view, button]) => {
    button.addEventListener('click', () => { clearSearch(); showView(view); setHash(`#${view}`); });
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const other = event.key === 'Home' ? 'guide' : event.key === 'End' ? 'glossary' : view === 'guide' ? 'glossary' : 'guide';
      tabButtons[other].click();
      tabButtons[other].focus();
    });
  });
  document.getElementById('search-form').addEventListener('submit', event => { event.preventDefault(); renderSearch(); });
  searchInput.addEventListener('compositionstart', () => { composing = true; });
  searchInput.addEventListener('compositionend', () => { composing = false; renderSearch(); });
  searchInput.addEventListener('input', () => { if (!composing) renderSearch(); });
  searchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !composing) clearSearch(true);
    if (event.key === 'ArrowDown' && !composing && resultList.firstElementChild) {
      event.preventDefault();
      resultList.firstElementChild.focus();
    }
  });
  clearButton.addEventListener('click', () => clearSearch(true));
  document.getElementById('reset-search').addEventListener('click', () => clearSearch(true));
  document.getElementById('guide').addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
    event.preventDefault();
    const id = link.getAttribute('href').slice(1);
    setHash(`#${id}`);
    openDestination(id);
  });
  function followLocation() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    if (id) openDestination(id);
  }
  window.addEventListener('popstate', () => { if (location.hash) followLocation(); else { clearSearch(); showView('guide'); } });
  window.addEventListener('hashchange', followLocation);
  followLocation();
  viewer.addEventListener('close', () => viewerImage.removeAttribute('src'));
  viewer.addEventListener('click', event => {
    if (event.target === viewer) {
      const bounds = viewer.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
    }
  });
})();
