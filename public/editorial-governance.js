(() => {
  'use strict';

  const ROOT_ID = 'newsflow-governance-root';
  const DATA_TIMEOUT_MS = 5000;
  const TABS = [
    { id: 'edition', label: '刊物判断', english: 'EDITION' },
    { id: 'storyline', label: '长期议题', english: 'STORYLINES' },
    { id: 'source', label: '信源', english: 'SOURCES' },
    { id: 'editorial', label: '编辑部', english: 'EDITORIAL BOARD' }
  ];

  const state = {
    open: false,
    loading: false,
    busy: false,
    tab: 'edition',
    edition: null,
    storylines: [],
    sources: [],
    governanceStatus: null,
    drafts: new Map(),
    members: [],
    invitations: [],
    selectedStoryline: '',
    selectedSource: '',
    newSource: null,
    invite: null,
    notice: '',
    error: ''
  };

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const lines = (value) => Array.isArray(value) ? value.join('\n') : String(value || '');
  const splitLines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
  const splitComma = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  const draftKey = (kind, targetId) => `${kind}:${targetId}`;
  const isChief = () => window.NewsFlowMode?.isChief?.() === true;
  const accountState = () => window.HaoAccount?.getState?.();
  const userId = () => String(accountState()?.user?.id || '');
  const getClient = async () => window.HaoAccount?.getClient?.();

  const ensureRoot = () => {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }
    return root;
  };

  const fetchJson = async (path) => {
    const response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(DATA_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  };

  const mergedPayload = (kind, targetId, base = {}) => ({
    ...base,
    ...(state.drafts.get(draftKey(kind, targetId))?.payload || {})
  });

  const flash = (message) => {
    state.notice = message;
    render();
    window.setTimeout(() => {
      if (state.notice === message) {
        state.notice = '';
        render();
      }
    }, 3600);
  };

  const load = async () => {
    if (!isChief()) throw new Error('只有主编可以维护刊物治理。');
    const client = await getClient();
    if (!client) throw new Error('主编治理数据库暂不可用。');
    const [edition, storylines, sources, governanceStatus, draftsResult, membersResult, invitationsResult] = await Promise.all([
      fetchJson('./data/edition.json'),
      fetchJson('./data/storylines.json'),
      fetchJson('./data/source-registry.json'),
      fetchJson('./data/governance-status.json').catch(() => null),
      client.from('newsflow_governance_drafts').select('id,kind,target_id,payload,status,updated_at,published_at'),
      client.from('newsflow_editorial_members').select('user_id,role,active,appointed_at,updated_at').order('appointed_at', { ascending: true }),
      client.from('newsflow_editorial_invitations').select('id,expires_at,accepted_at,created_at').order('created_at', { ascending: false }).limit(12)
    ]);
    if (draftsResult.error) throw draftsResult.error;
    if (membersResult.error) throw membersResult.error;
    if (invitationsResult.error) throw invitationsResult.error;
    state.edition = edition;
    state.storylines = Array.isArray(storylines) ? storylines : [];
    state.sources = Array.isArray(sources) ? sources : [];
    state.governanceStatus = governanceStatus;
    state.drafts = new Map((draftsResult.data || []).map((draft) => [draftKey(draft.kind, draft.target_id), draft]));
    state.members = membersResult.data || [];
    state.invitations = invitationsResult.data || [];
    const activeStorylines = state.storylines.filter((item) => item.status !== 'retired');
    if (!activeStorylines.some((item) => item.id === state.selectedStoryline)) state.selectedStoryline = activeStorylines[0]?.id || '';
    if (!state.sources.some((item) => item.id === state.selectedSource)) state.selectedSource = state.sources[0]?.id || '';
  };

  const open = async () => {
    if (!isChief()) return;
    state.open = true;
    state.loading = true;
    state.error = '';
    state.notice = '';
    document.documentElement.classList.add('nf-governance-open');
    render();
    try {
      await load();
    } catch (error) {
      state.error = error?.message || '刊物设置暂时无法加载。';
    } finally {
      state.loading = false;
      render();
    }
  };

  const close = () => {
    state.open = false;
    state.newSource = null;
    document.documentElement.classList.remove('nf-governance-open');
    render();
  };

  const field = (label, name, value, options = {}) => {
    const textarea = options.textarea !== false;
    const help = options.help ? `<small>${escapeHtml(options.help)}</small>` : '';
    const input = textarea
      ? `<textarea name="${escapeHtml(name)}" rows="${options.rows || 4}" ${options.readonly ? 'readonly' : ''}>${escapeHtml(value)}</textarea>`
      : `<input name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${options.readonly ? 'readonly' : ''}>`;
    return `<label class="nf-gov-field"><span>${escapeHtml(label)}</span>${input}${help}</label>`;
  };

  const renderDraftStatus = (kind, targetId) => {
    const draft = state.drafts.get(draftKey(kind, targetId));
    if (!draft) return '<span class="nf-gov-status">GitHub 当前版本</span>';
    if (draft.status === 'published') {
      const appliedAt = Date.parse(state.governanceStatus?.last_applied_at || '');
      const publishedAt = Date.parse(draft.published_at || '');
      if (Number.isFinite(appliedAt) && Number.isFinite(publishedAt) && appliedAt >= publishedAt) {
        return '<span class="nf-gov-status is-synced">已同步 GitHub</span>';
      }
      return '<span class="nf-gov-status is-queued">已发布 · 等待 GitHub 同步</span>';
    }
    return '<span class="nf-gov-status is-draft">私有草稿</span>';
  };

  const renderEdition = () => {
    const edition = mergedPayload('edition', state.edition.id, state.edition);
    return `<section class="nf-gov-editor" data-gov-form="edition" data-target-id="${escapeHtml(state.edition.id)}">
      <header><div><span>EDITORIAL CONSTITUTION</span><h2>刊物判断</h2></div>${renderDraftStatus('edition', state.edition.id)}</header>
      <p class="nf-gov-intro">修改这里会改变 Frontier Systems Review 的长期读者承诺与主编判断。自动采集和普通编辑无权修改。</p>
      ${field('Reader promise', 'reader_promise', edition.reader_promise || '', { rows: 4 })}
      ${field('Editorial view', 'editorial_view', edition.editorial_view || '', { rows: 6 })}
      ${field('Core questions · 每行一项', 'core_questions', lines(edition.core_questions), { rows: 6 })}
      ${renderFormActions('edition')}
    </section>`;
  };

  const renderStoryline = () => {
    const active = state.storylines.filter((item) => item.status !== 'retired');
    const selected = active.find((item) => item.id === state.selectedStoryline) || active[0];
    if (!selected) return '<section class="nf-gov-empty">暂无长期议题。</section>';
    const payload = mergedPayload('storyline', selected.id, selected);
    return `<div class="nf-gov-split">
      <nav class="nf-gov-index" aria-label="长期议题">${active.map((item) => `<button class="${item.id === selected.id ? 'is-active' : ''}" data-gov-action="select-storyline" data-id="${escapeHtml(item.id)}"><span>${escapeHtml(item.channel_id === 'ai-infrastructure' ? 'AI' : 'CCUS')}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.movement || 'watching')}</small></button>`).join('')}</nav>
      <section class="nf-gov-editor" data-gov-form="storyline" data-target-id="${escapeHtml(selected.id)}">
        <header><div><span>RESEARCH AGENDA</span><h2>${escapeHtml(payload.title || selected.title)}</h2></div>${renderDraftStatus('storyline', selected.id)}</header>
        ${field('标题', 'title', payload.title || '')}
        ${field('核心问题', 'question', payload.question || '', { rows: 3 })}
        ${field('主编当前判断', 'current_view', payload.current_view || selected.current_view || '', { rows: 6, help: '这是 Reader 的长期认知，不由新证据自动改写。' })}
        ${field('重点观察 · 每行一项', 'watch_for', lines(payload.watch_for || selected.watch_for), { rows: 6 })}
        ${field('反证条件 · 每行一项', 'falsifiers', lines(payload.falsifiers || selected.falsifiers), { rows: 6 })}
        ${renderFormActions('storyline')}
      </section>
    </div>`;
  };

  const emptySource = () => ({
    id: '', name: '', domain: '', class: 'primary', tier: 'Tier A',
    channels: ['ai-infrastructure'], storylines: [], allowed_uses: ['primary_evidence'],
    limitations: [], path_prefixes: []
  });

  const renderSource = () => {
    const base = state.newSource || state.sources.find((item) => item.id === state.selectedSource) || state.sources[0] || emptySource();
    const isNew = Boolean(state.newSource);
    const targetId = isNew ? String(base.id || '') : base.id;
    const payload = isNew ? base : mergedPayload('source', base.id, base);
    const sourceList = state.sources.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return `<div class="nf-gov-split">
      <nav class="nf-gov-index is-sources" aria-label="信源"><button class="nf-gov-add" data-gov-action="new-source">＋ 新增信源</button>${sourceList.map((item) => `<button class="${!isNew && item.id === base.id ? 'is-active' : ''}" data-gov-action="select-source" data-id="${escapeHtml(item.id)}"><span>${escapeHtml(item.tier || '')}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.domain)}</small></button>`).join('')}</nav>
      <section class="nf-gov-editor" data-gov-form="source" data-target-id="${escapeHtml(targetId)}">
        <header><div><span>TRUSTED SOURCE REGISTRY</span><h2>${isNew ? '新增信源' : escapeHtml(payload.name || base.name)}</h2></div>${isNew ? '<span class="nf-gov-status is-draft">新信源</span>' : renderDraftStatus('source', base.id)}</header>
        <div class="nf-gov-pair">${field('Source ID', 'source_id', isNew ? payload.id || '' : base.id, { textarea: false, readonly: !isNew, help: '小写字母、数字与连字符；发布后作为稳定标识。' })}${field('Name', 'name', payload.name || '', { textarea: false })}</div>
        <div class="nf-gov-pair">${field('Domain', 'domain', payload.domain || '', { textarea: false })}${field('Tier', 'tier', payload.tier || 'Tier A', { textarea: false })}</div>
        <div class="nf-gov-pair">${field('Class', 'class', payload.class || 'primary', { textarea: false })}${field('Path prefixes · 每行一项', 'path_prefixes', lines(payload.path_prefixes), { rows: 3 })}</div>
        ${field('Channels · 逗号分隔', 'channels', (payload.channels || []).join(', '), { rows: 2 })}
        ${field('Storylines · 逗号分隔', 'storylines', (payload.storylines || []).join(', '), { rows: 3 })}
        ${field('Allowed uses · 每行一项', 'allowed_uses', lines(payload.allowed_uses), { rows: 4 })}
        ${field('Limitations · 每行一项', 'limitations', lines(payload.limitations), { rows: 5, help: '把机构立场、公司披露、预测/目标等使用边界写清楚。' })}
        ${renderFormActions('source')}
      </section>
    </div>`;
  };

  const renderEditorialBoard = () => {
    const chiefCount = state.members.filter((member) => member.active && member.role === 'editor_in_chief').length;
    const editorCount = state.members.filter((member) => member.active && member.role === 'editor').length;
    const pendingInvites = state.invitations.filter((invite) => !invite.accepted_at && new Date(invite.expires_at).getTime() > Date.now()).length;
    return `<section class="nf-gov-editor is-board">
      <header><div><span>EDITORIAL BOARD</span><h2>编辑部</h2></div><span class="nf-gov-status">权限来自 Supabase RLS</span></header>
      <p class="nf-gov-intro">主编拥有最终出版权；编辑拥有独立评审权。编辑意见不会按多数票自动出版，也不会在 Reader 暴露。</p>
      <div class="nf-gov-board-stats"><div><span>主编</span><strong>${chiefCount}</strong><small>final authority</small></div><div><span>编辑</span><strong>${editorCount}</strong><small>advisory review</small></div><div><span>待接受任命</span><strong>${pendingInvites}</strong><small>14-day one-time links</small></div></div>
      <div class="nf-gov-board-action"><div><span>任命编辑</span><p>生成一次性链接。对方必须登录后接受，才能读取私有 Candidate 并提交编辑意见。</p></div><button data-gov-action="create-invite">生成任命链接</button></div>
      ${state.invite?.url ? `<div class="nf-gov-invite"><span>EDITOR APPOINTMENT</span><code>${escapeHtml(state.invite.url)}</code><button data-gov-action="copy-invite">复制</button><small>有效期至 ${escapeHtml(String(state.invite.expires_at || '').slice(0, 10))}</small></div>` : ''}
      <div class="nf-gov-sync-note"><strong>GitHub 同步</strong><p>主编在本页面发布 Edition / Storyline / Source 变更后，会先进入私有 publication queue，再由 GitHub Actions 拉取并提交到 main。网页端不持有 GitHub token。</p><small>最近同步：${escapeHtml(state.governanceStatus?.last_applied_at ? String(state.governanceStatus.last_applied_at).replace('T', ' ').slice(0, 16) : '尚无在线治理变更')}</small></div>
    </section>`;
  };

  const renderFormActions = (kind) => `<footer class="nf-gov-form-actions"><span>保存草稿不会改变 Reader；发布后进入 GitHub 同步队列。</span><div><button data-gov-action="save" data-kind="${kind}">保存草稿</button><button class="is-primary" data-gov-action="publish" data-kind="${kind}">发布到 GitHub</button></div></footer>`;

  const formPayload = (form, kind) => {
    const data = new FormData(form);
    if (kind === 'edition') return {
      reader_promise: String(data.get('reader_promise') || '').trim(),
      editorial_view: String(data.get('editorial_view') || '').trim(),
      core_questions: splitLines(data.get('core_questions'))
    };
    if (kind === 'storyline') return {
      title: String(data.get('title') || '').trim(),
      question: String(data.get('question') || '').trim(),
      current_view: String(data.get('current_view') || '').trim(),
      watch_for: splitLines(data.get('watch_for')),
      falsifiers: splitLines(data.get('falsifiers'))
    };
    return {
      name: String(data.get('name') || '').trim(),
      domain: String(data.get('domain') || '').trim(),
      class: String(data.get('class') || '').trim(),
      tier: String(data.get('tier') || '').trim(),
      path_prefixes: splitLines(data.get('path_prefixes')),
      channels: splitComma(data.get('channels')),
      storylines: splitComma(data.get('storylines')),
      allowed_uses: splitLines(data.get('allowed_uses')),
      limitations: splitLines(data.get('limitations'))
    };
  };

  const validatePayload = (kind, targetId, payload) => {
    if (!targetId) throw new Error('缺少稳定 ID。');
    if (kind === 'source' && !/^[a-z0-9][a-z0-9-]*$/.test(targetId)) throw new Error('Source ID 只能使用小写字母、数字和连字符。');
    if (kind === 'edition' && (!payload.reader_promise || !payload.editorial_view || !payload.core_questions.length)) throw new Error('刊物判断字段不能为空。');
    if (kind === 'storyline' && (!payload.title || !payload.question || !payload.current_view || !payload.watch_for.length || !payload.falsifiers.length)) throw new Error('长期议题需要完整的问题、判断、观察项和反证条件。');
    if (kind === 'source' && (!payload.name || !payload.domain || !payload.class || !payload.tier || !payload.channels.length || !payload.storylines.length || !payload.allowed_uses.length)) throw new Error('信源需要 Name、Domain、Class、Tier、Channels、Storylines 和 Allowed uses。');
  };

  const saveGovernance = async (kind, publish) => {
    if (state.busy || !isChief()) return;
    const form = document.querySelector(`[data-gov-form="${kind}"]`);
    if (!form) return;
    let targetId = String(form.dataset.targetId || '');
    if (kind === 'source' && state.newSource) targetId = String(new FormData(form).get('source_id') || '').trim();
    const payload = formPayload(form, kind);
    validatePayload(kind, targetId, payload);
    state.busy = true;
    render();
    try {
      const client = await getClient();
      if (!client) throw new Error('主编治理数据库暂不可用。');
      const existing = state.drafts.get(draftKey(kind, targetId));
      const row = {
        kind,
        target_id: targetId,
        payload,
        status: 'draft',
        created_by: existing?.created_by || userId(),
        updated_by: userId()
      };
      const { data: saved, error: saveError } = await client
        .from('newsflow_governance_drafts')
        .upsert(row, { onConflict: 'kind,target_id' })
        .select('id,kind,target_id,payload,status,updated_at,published_at')
        .single();
      if (saveError) throw saveError;
      let finalDraft = saved;
      if (publish) {
        const { data: published, error: publishError } = await client
          .from('newsflow_governance_drafts')
          .update({ status: 'published', payload, updated_by: userId() })
          .eq('id', saved.id)
          .select('id,kind,target_id,payload,status,updated_at,published_at')
          .single();
        if (publishError) throw publishError;
        finalDraft = published;
      }
      state.drafts.set(draftKey(kind, targetId), finalDraft);
      if (kind === 'source' && state.newSource) {
        state.selectedSource = targetId;
        state.newSource = null;
      }
      flash(publish ? '已签发治理变更：等待 GitHub 自动同步并部署。' : '私有草稿已保存。');
    } catch (error) {
      flash(error?.message || '治理变更保存失败。');
    } finally {
      state.busy = false;
      render();
    }
  };

  const createInvite = async () => {
    if (state.busy || !isChief()) return;
    state.busy = true;
    render();
    try {
      state.invite = await window.NewsFlowMode?.createEditorInvite?.();
      await load();
      flash('编辑任命链接已签发。');
    } catch (error) {
      flash(error?.message || '任命链接生成失败。');
    } finally {
      state.busy = false;
      render();
    }
  };

  const copyInvite = async () => {
    if (!state.invite?.url) return;
    try {
      await navigator.clipboard.writeText(state.invite.url);
      flash('任命链接已复制。');
    } catch {
      flash('复制失败，请手动复制。');
    }
  };

  const renderBody = () => {
    if (state.loading) return '<div class="nf-gov-loading">正在读取刊物治理状态…</div>';
    if (state.error) return `<div class="nf-gov-error"><strong>刊物设置暂未就绪</strong><p>${escapeHtml(state.error)}</p><button data-gov-action="reload">重试</button></div>`;
    if (state.tab === 'edition') return renderEdition();
    if (state.tab === 'storyline') return renderStoryline();
    if (state.tab === 'source') return renderSource();
    return renderEditorialBoard();
  };

  function render() {
    const root = ensureRoot();
    if (!state.open) {
      root.innerHTML = '';
      return;
    }
    root.innerHTML = `<section class="nf-governance-shell" role="dialog" aria-modal="true" aria-labelledby="nf-governance-title">
      <header class="nf-gov-header"><div><span>FRONTIER SYSTEMS REVIEW</span><h1 id="nf-governance-title">Publication Settings</h1><p>EDITOR-IN-CHIEF · CANONICAL GOVERNANCE</p></div><button class="nf-gov-close" data-gov-action="close" aria-label="关闭刊物设置">×</button></header>
      <nav class="nf-gov-tabs">${TABS.map((tab) => `<button class="${state.tab === tab.id ? 'is-active' : ''}" data-gov-action="tab" data-tab="${tab.id}"><span>${escapeHtml(tab.english)}</span><strong>${escapeHtml(tab.label)}</strong></button>`).join('')}</nav>
      <main class="nf-gov-main">${renderBody()}</main>
      ${state.notice ? `<div class="nf-gov-notice" role="status">${escapeHtml(state.notice)}</div>` : ''}
    </section>`;
  }

  const handleClick = async (event) => {
    const target = event.target.closest('[data-gov-action]');
    if (!target) return;
    const action = target.dataset.govAction;
    if (action === 'close') close();
    else if (action === 'reload') await open();
    else if (action === 'tab') { state.tab = target.dataset.tab || 'edition'; state.newSource = null; render(); }
    else if (action === 'select-storyline') { state.selectedStoryline = target.dataset.id || ''; render(); }
    else if (action === 'select-source') { state.selectedSource = target.dataset.id || ''; state.newSource = null; render(); }
    else if (action === 'new-source') { state.newSource = emptySource(); render(); }
    else if (action === 'save') await saveGovernance(target.dataset.kind || '', false);
    else if (action === 'publish') await saveGovernance(target.dataset.kind || '', true);
    else if (action === 'create-invite') await createInvite();
    else if (action === 'copy-invite') await copyInvite();
  };

  const root = ensureRoot();
  root.addEventListener('click', (event) => { void handleClick(event); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.open) close();
  });

  window.NewsFlowGovernance = Object.freeze({ open, close, isOpen: () => state.open });
  window.dispatchEvent(new CustomEvent('newsflow:governance-ready'));
})();
