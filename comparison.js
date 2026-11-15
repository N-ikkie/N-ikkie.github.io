(() => {
  'use strict';
  document.querySelectorAll('[data-comparison]').forEach(group => {
    const videos = [...group.querySelectorAll('video')];
    const lead = videos[0], sound = videos.at(-1);
    const playButton = group.querySelector('[data-comparison-play]');
    const replayButton = group.querySelector('[data-comparison-replay]');
    const soundButton = group.querySelector('[data-comparison-sound]');
    const seek = group.querySelector('[data-comparison-seek]');
    const status = group.querySelector('.comparison-status');
    let running = false, revision = 0, frame = 0;
    const duration = () => videos.every(v => Number.isFinite(v.duration))
      ? Math.min(...videos.map(v => v.duration)) : 0;
    function stop() {
      running = false; revision++;
      videos.forEach(v => v.pause());
      cancelAnimationFrame(frame);
      playButton.textContent = '同步播放';
      playButton.setAttribute('aria-pressed', 'false');
    }
    function tick() {
      if (!running) return;
      if (group.closest('[hidden]') || lead.paused) { stop(); return; }
      const end = duration();
      if (end && (lead.ended || lead.currentTime >= end - .035)) {
        stop(); seek.value = '100'; return;
      }
      if (end) seek.value = String(lead.currentTime / end * 100);
      videos.slice(1).forEach(v => {
        if (v.readyState >= 2 && Math.abs(v.currentTime - lead.currentTime) > .12)
          v.currentTime = lead.currentTime;
      });
      frame = requestAnimationFrame(tick);
    }
    async function start(rewind = false) {
      stop();
      const current = revision;
      const end = duration();
      const time = rewind || lead.ended || (end && lead.currentTime >= end - .1)
        ? 0 : lead.currentTime;
      videos.forEach(v => { v.currentTime = time; });
      running = true;
      playButton.textContent = '暂停';
      playButton.setAttribute('aria-pressed', 'true');
      status.textContent = '正在加载对比视频…';
      const results = await Promise.allSettled(videos.map(v => v.play()));
      if (current !== revision) return;
      if (group.closest('[hidden]')) { stop(); status.textContent = ''; return; }
      if (results.some(result => result.status === 'rejected')) {
        stop(); status.textContent = '视频暂未加载完成，请再次点击同步播放。'; return;
      }
      status.textContent = '';
      frame = requestAnimationFrame(tick);
    }
    playButton.addEventListener('click', () => running ? stop() : start());
    replayButton.addEventListener('click', () => start(true));
    soundButton?.addEventListener('click', () => {
      sound.muted = !sound.muted;
      soundButton.textContent = sound.muted ? '开启声音' : '关闭声音';
      soundButton.setAttribute('aria-pressed', String(!sound.muted));
    });
    seek.addEventListener('input', () => {
      stop(); status.textContent = '';
      const time = Number(seek.value) / 100 * duration();
      videos.forEach(v => { v.currentTime = time; });
    });
    videos.forEach(v => {
      v.addEventListener('loadedmetadata', () => { seek.disabled = !duration(); });
      v.addEventListener('error', () => { stop(); status.textContent = '视频暂时无法读取，请刷新后重试。'; });
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  });
})();
