(() => {
  'use strict';
  const data = JSON.parse(document.querySelector('#portfolio-data').textContent);
  const films = [...data.films, ...data.archive];
  const dialog = document.querySelector('#viewer');
  const player = document.querySelector('#film-player');
  const status = document.querySelector('#player-status');
  const promptPanel = document.querySelector('#viewer-prompt');
  const promptText = document.querySelector('#prompt-text');
  const promptStatus = document.querySelector('#prompt-status');
  const copyPrompt = document.querySelector('#copy-prompt');
  const promptCache = new Map();
  let promptRevision = 0;
  let active = null, pendingSeek = null, origin = null;
  const tabs = [...document.querySelectorAll('[data-case]')];
  function activateCase(id) {
    tabs.forEach(tab => {
      const selected=tab.dataset.case===id;
      tab.setAttribute('aria-selected', String(selected));tab.tabIndex=selected?0:-1;
      const panel=document.getElementById(tab.getAttribute('aria-controls'));
      if(!selected)panel.querySelectorAll('video').forEach(v=>v.pause());
      panel.hidden=!selected;
    });
  }
  function closeFilm() {
    player.pause();player.removeAttribute('src');player.load();active=null;pendingSeek=null;
    resetPrompt();
    document.body.classList.remove('modal-open');
    if(dialog.open)dialog.close();
    if(origin?.isConnected)origin.focus({preventScroll:true});
  }
  function dismiss() {
    const section = films.find(film => film.id === active)?.section || 'works';
    history.replaceState(null, '', `${location.pathname}${location.search}#${section}`);
    closeFilm();
  }
  function play(){player.play().catch(error=>{if(active&&error.name!=='AbortError')status.textContent='点击视频播放按钮继续观看。';});}
  function resetPrompt(film=null) {
    promptRevision++;
    promptPanel.open=false;
    promptPanel.hidden=!film?.prompt;
    promptText.textContent='';promptStatus.textContent='';copyPrompt.disabled=true;
    document.querySelector('#prompt-meta').textContent=film?.prompt
      ? `${film.prompt.parts} 段合并` : '';
    document.querySelector('#prompt-context').textContent=film?.prompt?.note
      || '各段提示词的时间与参考素材编号独立。';
  }
  promptPanel.addEventListener('toggle',async()=>{
    if(!promptPanel.open)return;
    const film=films.find(f=>f.id===active);
    if(!film?.prompt)return;
    const revision=promptRevision;
    promptStatus.textContent='正在读取提示词…';
    try {
      let text=promptCache.get(film.id);
      if(!text){
        const response=await fetch(film.prompt.url);
        if(!response.ok)throw new Error('Prompt unavailable');
        text=await response.text();
        if(!text.trim())throw new Error('Empty prompt');
        promptCache.set(film.id,text);
      }
      if(revision!==promptRevision)return;
      promptText.textContent=text;copyPrompt.disabled=false;promptStatus.textContent='';
    } catch {
      if(revision===promptRevision)promptStatus.textContent='暂时无法读取，请收起后重新展开。';
    }
  });
  copyPrompt.addEventListener('click',async()=>{
    const text=promptText.textContent,revision=promptRevision;
    if(!text)return;
    try {
      await navigator.clipboard.writeText(text);
      if(revision===promptRevision)promptStatus.textContent='已复制全部提示词。';
    } catch {
      if(revision===promptRevision)promptStatus.textContent='复制未成功，可选中下方文字手动复制。';
    }
  });
  function openFilm(film, start=null, autoplay=false) {
    if(active===film.id&&dialog.open){if(start!==null)player.currentTime=start;return;}
    origin=document.activeElement;active=film.id;pendingSeek=start;
    resetPrompt(film);
    document.querySelectorAll('main video').forEach(v=>v.pause());
    player.pause();player.src=film.video;player.poster=film.poster;
    player.setAttribute('aria-label',`《${film.title}》完整视频`);
    document.querySelector('#viewer-category').textContent=film.category;
    document.querySelector('#viewer-meta').textContent=film.game;
    document.querySelector('#viewer-title').textContent=film.title;
    document.querySelector('#viewer-description').textContent=film.description;
    document.querySelector('#direct-video').href=film.video;
    document.querySelector('#viewer-highlights').replaceChildren(...film.highlights.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
    document.querySelector('#viewer-chapters').replaceChildren(...(film.chapters||[]).map(([seconds,title])=>{
      const b=document.createElement('button');b.type='button';
      b.textContent=title;
      b.addEventListener('click',()=>{if(player.readyState>=1)player.currentTime=seconds;else pendingSeek=seconds;play();});return b;
    }));
    const caseLink=document.querySelector('#viewer-case');caseLink.hidden=!film.caseId;caseLink.dataset.caseTarget=film.caseId||'';
    status.textContent='';
    document.body.classList.add('modal-open');if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
    player.load();if(autoplay)play();
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#watch-"]');
    if(!link||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    const film=films.find(f=>`#watch-${f.id}`===link.hash);
    if(film){event.preventDefault();history.pushState(null,'',link.hash);openFilm(film,null,true);}
  });
  const syncHash=()=>{const film=films.find(f=>`#watch-${f.id}`===location.hash);if(film)openFilm(film);else {if(dialog.open)closeFilm();const selectedCase=data.cases.find(c=>`#${c.id}`===location.hash);if(selectedCase){activateCase(selectedCase.id);document.querySelector('#case-breakdowns').scrollIntoView();}}};
  document.querySelector('#close-viewer').addEventListener('click',dismiss);
  dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dismiss();});
  player.addEventListener('loadedmetadata',()=>{if(pendingSeek!==null){player.currentTime=pendingSeek;pendingSeek=null;}});
  player.addEventListener('playing',()=>status.textContent='');
  player.addEventListener('waiting',()=>{if(active)status.textContent='视频加载中…';});
  player.addEventListener('error',()=>{if(active)status.textContent='视频暂时无法播放，请重试或单独打开视频。';});
  document.querySelector('#viewer-case').addEventListener('click',event=>{
    event.preventDefault();const id=event.currentTarget.dataset.caseTarget;closeFilm();activateCase(id);
    history.replaceState(null,'',`${location.pathname}#case-breakdowns`);
    document.querySelector('#case-breakdowns').scrollIntoView();
  });
  window.addEventListener('hashchange',syncHash);window.addEventListener('popstate',syncHash);
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activateCase(tab.dataset.case));
    tab.addEventListener('keydown',event=>{
      let next=index;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
      else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
      event.preventDefault();activateCase(tabs[next].dataset.case);tabs[next].focus();
    });
  });
  document.querySelectorAll('main video').forEach(video=>video.addEventListener('play',()=>{
    const group=video.closest('[data-comparison]');
    document.querySelectorAll('main video').forEach(other=>{
      if(other!==video&&(!group||other.closest('[data-comparison]')!==group))other.pause();
    });
  }));
  document.querySelectorAll('[data-copy-case-prompt]').forEach(button=>button.addEventListener('click',async()=>{
    const text=document.getElementById(button.dataset.copyCasePrompt).textContent;
    const status=button.parentElement.querySelector('.prompt-status');
    try { await navigator.clipboard.writeText(text);status.textContent='已复制提示词。'; }
    catch { status.textContent='复制未成功，可选中下方文字手动复制。'; }
  }));
  syncHash();
})();
