/* Search is local: the words you enter are not sent to a server. */
(() => {
  'use strict';
  const topicAliases = {
    account: ['登録', 'ログイン', 'あかうんと'],
    profile: ['プロフィール', '自己紹介', 'ぷろふ'],
    camera: ['照明', '背景', '明るさ', '音声', 'かくど', 'がかく'],
    tags: ['タグ', 'たぐ', '設定'],
    'photo-tags-title': ['写真', 'サムネイル', 'タイトル', 'バストアップ'],
    bgm: ['音楽', '音源', '曲', 'びーじーえむ'],
    talking: ['挨拶', 'あいさつ', '会話', 'はなしかた'],
    gifts: ['ギフト', 'アイテム', '投げ銭', 'ぎふと', 'お礼'],
    hiyoko: ['ヒヨコ', 'ビギナー', '初心者'],
    'quiet-chat': ['話題', 'ネタ', '無言', 'コメントがない'],
    remember: ['リスナー', '視聴者', '名前', '常連'],
    schedule: ['時間', '曜日', '固定', 'スケジュール'],
    'stream-schedule': ['配信予定', 'スケジュール', '予定表', '予約'],
    titles: ['配信タイトル', '話題']
  };
  function normalize(value) {
    return String(value || '').normalize('NFKC').toLowerCase()
      .replace(/[ァ-ヶ]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60))
      .replace(/\s+/g, ' ').trim();
  }
  function pageText(topic) {
    return (topic?.carousels || [topic]).flatMap(set => (set?.slides || []).map(slide => slide.text || ''));
  }
  function visitText(visit) {
    return visit ? [visit.title, visit.prompt, ...visit.paths.flatMap(path => [path.purpose, path.destination, path.text, path.example, path.note]), ...visit.steps, visit.noteTitle, visit.note] : [];
  }
  function sectionText(sections) {
    return (sections || []).flatMap(section => [section.title, ...(section.paragraphs || []), ...(section.items || []), ...(section.blocks || []).flatMap(block => [block.text, block.alt, block.caption])]);
  }
  function buildIndex(guide) {
    const entries = [];
    const topicsById = new Map();
    guide.chapters.forEach(chapter => chapter.groups.forEach(group => group.topics.forEach(topic => {
      topicsById.set(topic.id, topic);
      entries.push({
        id: topic.id, kind: 'guide', title: topic.title, description: topic.intro,
        context: `${chapter.number} ${chapter.title}${group.title ? ` / ${group.title}` : ''}`,
        text: normalize([topic.title, topic.intro, topic.takeaway, topic.tip, topic.template?.title, topic.template?.text, ...(topic.examples || []), ...pageText(topic), chapter.title, group.title, ...(topic.aliases || []), ...(topicAliases[topic.id] || [])].join(' '))
      });
    })));
    (guide.glossary || []).forEach(term => entries.push({
      id: `term-${term.id}`, kind: 'glossary', title: term.title, description: term.intro,
      context: '用語集',
      text: normalize([term.title, term.reading, term.intro, term.illustration?.alt, term.illustration?.caption, ...sectionText(term.sections), ...(term.points || []).flatMap(point => [point.label, point.text]), ...visitText(term.visitGuide), term.summaryNote, ...pageText(term.topicId ? topicsById.get(term.topicId) : term), ...(term.aliases || [])].join(' '))
    }));
    return entries;
  }
  function search(entries, value) {
    const query = normalize(value);
    if (!query) return [];
    const words = query.split(' ');
    return entries.filter(entry => words.every(word => entry.text.includes(word)))
      .map(entry => ({ entry, score: normalize(entry.title) === query ? 3 : normalize(entry.title).includes(query) ? 2 : 1 }))
      .sort((a, b) => b.score - a.score).map(result => result.entry);
  }
  window.NEXTWAVE_SEARCH = { normalize, buildIndex, search };
})();
