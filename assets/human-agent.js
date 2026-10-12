(() => {
  'use strict';

  function revealChapter(hash) {
    if (!hash || hash === '#') return null;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (_) { return null; }
    const target = document.getElementById(id);
    if (!target) return null;
    for (let node = target; node; node = node.parentElement) {
      if (node.matches('details.chapter')) node.open = true;
    }
    return target;
  }

  function focusMain(target) {
    if (!target || !target.matches('main')) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function initializeNavigation() {
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
      if (!link) return;
      const target = revealChapter(link.getAttribute('href'));
      focusMain(target);
    });
    const revealCurrentHash = () => {
      const target = revealChapter(window.location.hash);
      if (target) requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'start', behavior: 'instant' });
        focusMain(target);
      });
    };
    window.addEventListener('hashchange', revealCurrentHash);
    revealCurrentHash();
  }

  function initializeMessageTool() {
    const form = document.getElementById('message-form');
    const fields = document.getElementById('message-fields');
    const state = document.getElementById('tool-state');
    const status = document.getElementById('message-status');
    const choices = [...document.querySelectorAll('button[data-plan-choice]')];
    // Native submission is never part of this local text tool.
    if (form) form.addEventListener('submit', event => event.preventDefault());
    if (fields) fields.disabled = true;
    choices.forEach(button => { button.disabled = true; });

    try {
      const topic = document.getElementById('topic');
      const tier = document.getElementById('tier');
      const brief = document.getElementById('brief');
      const availability = document.getElementById('availability');
      const output = document.getElementById('message-output');
      const selectedNote = document.getElementById('selected-note');
      const preview = document.getElementById('message-preview');
      const copyButton = document.getElementById('copy-message');
      const saveButton = document.getElementById('save-message');
      const connectTitle = document.getElementById('connect-title');
      if (![form, fields, state, status, topic, tier, brief, availability, output, selectedNote, preview, copyButton, saveButton, connectTitle].every(Boolean)) {
        throw new Error('Message tool is missing required elements.');
      }

      const currency = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
      const planKeys = ['single', 'multi', 'ongoing', 'api'];
      const plans = new Map();
      const cards = [...document.querySelectorAll('article.time-plan[data-plan]')];
      if (cards.length !== planKeys.length) throw new Error('Expected four fixed quota plans.');
      for (const key of planKeys) {
        const matching = cards.filter(card => card.dataset.plan === key);
        if (matching.length !== 1) throw new Error('Missing or duplicate time plan.');
        const card = matching[0];
        const name = card.querySelector('[data-plan-name]')?.textContent.trim();
        const rawPrice = card.querySelector('[data-plan-price]')?.textContent.replace(/[¥￥,，\s]/g, '');
        const rawHours = card.querySelector('[data-plan-hours]')?.textContent.trim();
        const hoursMatch = rawHours?.match(/^(\d+(?:\.\d+)?)\s*(?:小时|h)?$/i);
        const rate = card.querySelector('[data-plan-rate]');
        const quota = card.querySelector('[data-plan-tokens]');
        if (!name || !rawPrice || !/^\d+(?:\.\d{1,2})?$/.test(rawPrice) || !hoursMatch || !rate || !quota) {
          throw new Error('Invalid time plan data.');
        }
        const price = Number(rawPrice);
        const hours = Number(hoursMatch[1]);
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(hours) || hours <= 0) {
          throw new Error('Time plan values must be positive numbers.');
        }
        const tokens = hours * 60;
        quota.textContent = currency.format(tokens);
        plans.set(key, { name, price, hours, tokens, rate });
      }
      if (!choices.length || choices.some(button => !plans.has(button.dataset.planChoice) && button.dataset.planChoice !== 'custom')) {
        throw new Error('Unknown time plan button.');
      }
      if (!tier.querySelector('option[value="undecided"]')) throw new Error('Missing undecided option.');

      // The displayed cards are the only source of plan names, hours and prices.
      const options = document.createDocumentFragment();
      for (const [key, plan] of plans) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${plan.name} · ${currency.format(plan.tokens)} Token · ¥${currency.format(plan.price)}`;
        options.append(option);
      }
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = '超级会员 · 定制额度与报价待沟通';
      options.append(customOption);
      tier.append(options);
      for (const plan of plans.values()) {
        const hourlyRate = plan.price / plan.hours;
        const cents = hourlyRate * 100;
        const rounded = Math.abs(cents - Math.round(cents)) > Number.EPSILON * Math.max(1, Math.abs(cents)) * 4;
        plan.rate.textContent = `时间价值折合${rounded ? '约' : ''} ¥${currency.format(hourlyRate)} / 小时`;
      }

      let busy = false;
      let lastActionMessage = null;

      function chosenPlanDescription() {
        const plan = plans.get(tier.value);
        if (plan) return `${plan.name}（${currency.format(plan.tokens)} Token，相当于 ${plan.hours} 小时标准时间价值，¥${currency.format(plan.price)}；以沟通确认的范围和安排为准）`;
        if (tier.value === 'custom') return '超级会员（定制额度、范围与报价待沟通）';
        return '先确认需求，再选择协作额度';
      }

      function buildMessage() {
        return [
          '霄，你好，我想咨询一次真人 Agent 协作。',
          '',
          `想聊的方向：${topic.value}`,
          `倾向的方案：${chosenPlanDescription()}`,
          `想一起处理的事：${brief.value.trim() || '（请填写需要讨论的问题或希望推进的事情）'}`,
          `方便交流的时间：${availability.value.trim() || '待沟通确认'}`,
          '',
          '以上是需求意向，请先帮我判断是否适合，再确认协作范围、费用与时间。',
          '这条消息不代表已认领额度、已付款或已锁定时段。'
        ].join('\n');
      }

      function sync() {
        const message = buildMessage();
        // Do not replace inputs or move focus while the visitor is typing.
        if (output.value !== message) {
          const focused = document.activeElement === output;
          const start = output.selectionStart;
          const end = output.selectionEnd;
          const direction = output.selectionDirection;
          const scrollTop = output.scrollTop;
          output.value = message;
          if (focused) {
            output.setSelectionRange(Math.min(start, message.length), Math.min(end, message.length), direction);
            output.scrollTop = scrollTop;
          }
        }
        choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.planChoice === tier.value)));
        const plan = plans.get(tier.value);
        const note = plan
          ? `当前意向：${plan.name}，${currency.format(plan.tokens)} Token（${plan.hours} 小时标准时间价值），¥${currency.format(plan.price)}。认领与预约安排需另行确认。`
          : tier.value === 'custom'
            ? '当前意向：超级会员。定制额度、范围与报价需另行沟通。'
            : '先描述需求，再决定是否协作及选择哪档额度方案。';
        if (selectedNote.textContent !== note) selectedNote.textContent = note;
        if (lastActionMessage !== null && lastActionMessage !== message) {
          status.textContent = '内容已更新，可重新复制或保存。页面不会自动发送消息。';
          lastActionMessage = null;
        }
        return message;
      }

      function validate() {
        brief.setCustomValidity(brief.value.trim() ? '' : '请先写下想一起处理的问题。');
        return form.reportValidity();
      }

      function selectPreview() {
        preview.open = true;
        output.focus();
        output.select();
        output.setSelectionRange(0, output.value.length);
      }

      function setBusy(value) {
        busy = value;
        copyButton.disabled = value;
        saveButton.disabled = value;
      }

      async function copyText(message) {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(message);
            return true;
          }
        } catch (_) { /* Browser permission or context may prevent Clipboard API use. */ }
        const wasOpen = preview.open;
        output.value = message;
        selectPreview();
        let copied = false;
        try { copied = Boolean(document.execCommand?.('copy')); } catch (_) { copied = false; }
        if (copied) preview.open = wasOpen;
        return copied;
      }

      function moveToMessageTool() {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        connectTitle.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
        connectTitle.focus({ preventScroll: true });
      }

      choices.forEach(button => button.addEventListener('click', () => {
        tier.value = button.dataset.planChoice;
        sync();
        moveToMessageTool();
      }));
      document.querySelectorAll('[data-topic-choice]').forEach(link => link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const chosen = link.dataset.topicChoice;
        if (![...topic.options].some(option => option.value === chosen)) return;
        event.preventDefault();
        topic.value = chosen;
        sync();
        moveToMessageTool();
      }));
      form.addEventListener('input', () => {
        brief.setCustomValidity('');
        sync();
      });
      form.addEventListener('change', sync);

      copyButton.addEventListener('click', async () => {
        if (busy || !validate()) return;
        const message = sync();
        setBusy(true);
        let copied = false;
        try {
          copied = await copyText(message);
        } catch (_) {
          copied = false;
        } finally {
          // A disabled button cannot be focused: restore availability first.
          setBusy(false);
        }
        const currentMessage = sync();
        if (copied) {
          lastActionMessage = message;
          status.textContent = currentMessage === message
            ? '需求消息已复制。页面不会发送消息或确认预约。'
            : '已复制操作前的消息。内容已有更新，请重新复制。';
          copyButton.focus({ preventScroll: true });
        } else {
          selectPreview();
          status.textContent = '浏览器未允许自动复制。请复制下方已选中的文字：Mac 按 ⌘ + C，Windows 按 Ctrl + C；手机或平板请长按文字，选择“全选”后再“复制”。页面不会发送消息或确认预约。';
        }
      });

      saveButton.addEventListener('click', () => {
        if (busy || !validate()) return;
        const message = sync();
        let objectURL;
        let link;
        try {
          const blob = new Blob(['\uFEFF', message], { type: 'text/plain;charset=utf-8' });
          objectURL = URL.createObjectURL(blob);
          link = document.createElement('a');
          link.href = objectURL;
          link.download = '真人Agent-需求意向.txt';
          link.hidden = true;
          document.body.append(link);
          link.click();
          lastActionMessage = message;
          status.textContent = '已发起 TXT 下载。页面不会发送消息或确认预约。';
        } catch (_) {
          selectPreview();
          status.textContent = '浏览器未能发起下载。请直接复制下方的需求消息。';
        } finally {
          link?.remove();
          if (objectURL) setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
        }
      });

      sync();
      state.textContent = '文字只在当前页面生成，填写内容不会自动保存。';
      fields.disabled = false;
      copyButton.disabled = false;
      saveButton.disabled = false;
      choices.forEach(button => { button.disabled = false; });
    } catch (error) {
      if (fields) fields.disabled = true;
      choices.forEach(button => { button.disabled = true; });
      if (state) state.textContent = '消息工具暂时不可用。页面信息仍可阅读，请稍后重试。';
      if (status) status.textContent = '未生成或发送任何消息。';
      console.error('Unable to initialize the local message tool.', error);
    }
  }

  function initialize() {
    initializeNavigation();
    initializeMessageTool();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
