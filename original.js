(() => {
  'use strict';
  const projects = JSON.parse(document.querySelector('#project-data').textContent);
  const dialog = document.querySelector('#viewer');
  const video = document.querySelector('#film-player');
  const status = document.querySelector('#player-status');
  let previousFocus = null;
  let activeId = null;
  let pendingSeek = null;
  let openedFromPage = false;
  const timestamp = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  function openProject(project) {
    if (activeId === project.id && dialog.open) return;
    previousFocus = document.activeElement;
    activeId = project.id;
    pendingSeek = null;
    video.pause();
    video.poster = `media/${project.id}.webp`;
    video.src = `media/${project.id}.mp4`;
    video.setAttribute('aria-label', `《${project.title}》完整视频`);
    document.querySelector('#direct-video').href = video.src;
    document.querySelector('#viewer-title').textContent = project.title;
    document.querySelector('#viewer-description').textContent = project.description;
    document.querySelector('#viewer-category').textContent = project.category;
    const meta = document.querySelector('#viewer-meta');
    meta.replaceChildren(...[project.type, project.orientation, timestamp(project.duration)].map(text => {
      const span = document.createElement('span'); span.textContent = text; return span;
    }));
    document.querySelector('#viewer-highlights').replaceChildren(...project.highlights.map(text => {
      const li = document.createElement('li'); li.textContent = text; return li;
    }));
    document.querySelector('#viewer-chapters').replaceChildren(...project.chapters.map(([seconds, label]) => {
      const button = document.createElement('button');
      button.className = 'chapter'; button.type = 'button';
      button.setAttribute('aria-label', `跳到 ${timestamp(seconds)}，${label}`);
      const time = document.createElement('time'); time.textContent = timestamp(seconds);
      const name = document.createElement('span'); name.textContent = label;
      button.append(time, name);
      button.addEventListener('click', () => {
        if (video.readyState >= 1) video.currentTime = seconds;
        else pendingSeek = seconds;
        play();
      });
      return button;
    }));
    status.textContent = '点击视频播放按钮，观看完整短片。';
    document.body.classList.add('modal-open');
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    video.load();
  }
  function play() {
    video.play().catch(error => {
      if (activeId && error.name !== 'AbortError') status.textContent = '请点击视频内的播放按钮继续观看。';
    });
  }
  function closeProject() {
    video.pause();
    video.removeAttribute('src');
    video.load();
    activeId = null;
    pendingSeek = null;
    document.body.classList.remove('modal-open');
    if (dialog.open) dialog.close();
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({preventScroll:true});
  }
  function syncHash() {
    const project = projects.find(item => `#watch-${item.id}` === location.hash);
    if (project) openProject(project); else if (dialog.open) closeProject();
  }
  function dismiss() {
    if (openedFromPage && location.hash.startsWith('#watch-')) history.back();
    else {
      history.replaceState(null, '', `${location.pathname}${location.search}#works`);
      closeProject();
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#watch-"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    openedFromPage = true;
    const project = projects.find(item => `#watch-${item.id}` === link.getAttribute('href'));
    if (project) {
      event.preventDefault();
      history.pushState(null, '', link.getAttribute('href'));
      openProject(project);
      play();
    }
  });
  document.querySelector('#close-viewer').addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => {event.preventDefault();dismiss();});
  dialog.addEventListener('click', event => {if (event.target === dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dismiss();}});
  video.addEventListener('loadedmetadata', () => {if(pendingSeek !== null){video.currentTime=pendingSeek;pendingSeek=null;}});
  video.addEventListener('playing', () => {status.textContent='';});
  video.addEventListener('waiting', () => {if(activeId) status.textContent='视频加载中…';});
  video.addEventListener('error', () => {if(activeId) status.textContent='视频暂时无法播放。请重试，或使用下方“单独打开视频”。';});
  window.addEventListener('hashchange', syncHash);
  syncHash();
})();
