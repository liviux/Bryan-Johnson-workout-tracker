// Video tabs: Bryan's own videos (opened at the right minute) and demo videos by
// other coaches. The YouTube player (privacy-enhanced youtube-nocookie.com) only
// loads when you press play.

import { BRYAN_VIDEOS, VIDEO_META } from "../data/videos.js";
import { VIDEO_LENGTHS } from "../data/video-lengths.js";
import { esc, fmtMinSec, fmtRuntime, fmtSecs } from "../util.js";
import { icon } from "./icons.js";
import { locale, t } from "../i18n.js";

export function youtubeId(url) {
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(url || "");
  return m ? m[1] : null;
}

export function isYoutubeShort(url) {
  return /youtube\.com\/shorts\//.test(url || "");
}

const shortTitle = (t) => t.replace(/^Bryan( on X)?: /, "").replace(/^Bryan with /, "With ");

function fmtUploadDate(d) {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return new Intl.DateTimeFormat(locale(), { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  }
  return d;
}

export function videoChannelDate(v) {
  const meta = (v && v.id && VIDEO_META[v.id]) || {};
  const channel = (v && v.channel) || meta.c || (v && v.kind === "bryan" ? "Bryan Johnson" : "");
  const date = (v && v.date && fmtUploadDate(v.date)) || meta.d || "";
  return { channel, date };
}

function buildVideoList(src) {
  const out = [];
  if (!src) return out;
  for (const b of src.bryanVideos || []) {
    const v = BRYAN_VIDEOS[b.k];
    if (!v) continue;
    const at = typeof b.s === "number" ? b.s : 0;
    const end = typeof b.e === "number" ? b.e : null;
    const id = youtubeId(v.u);
    const meta = (id && VIDEO_META[id]) || {};
    out.push({
      kind: "bryan",
      title: shortTitle(v.t) + (b.n ? ` (${b.n})` : ""),
      url: v.u,
      id,
      isShort: isYoutubeShort(v.u),
      short: isYoutubeShort(v.u) || (end != null && end > at && end - at <= 45),
      start: at,
      end,
      length: VIDEO_LENGTHS[id] || (typeof v.length === "number" ? v.length : null),
      channel: v.c || meta.c || "Bryan Johnson",
      date: meta.d || fmtUploadDate(v.date) || "",
    });
  }
  for (const v of src.videos || []) {
    const at = typeof v.s === "number" ? v.s : 0;
    const end = typeof v.e === "number" ? v.e : null;
    const id = youtubeId(v.u);
    const meta = (id && VIDEO_META[id]) || {};
    out.push({
      kind: "demo",
      title: v.t,
      url: v.u,
      id,
      isShort: isYoutubeShort(v.u),
      short: isYoutubeShort(v.u) || (end != null && end > at && end - at <= 45),
      start: at,
      end,
      length: VIDEO_LENGTHS[id] || (typeof v.length === "number" ? v.length : null),
      channel: v.c || meta.c || "",
      date: v.d || fmtUploadDate(v.date) || meta.d || "",
    });
  }
  return out;
}

// Per-movement video groups for exercises that have multiple movements in the animation window.
export function videoGroupsFor(ex) {
  if (!ex) return [];
  if (Array.isArray(ex.clipVideos) && ex.clipVideos.length > 0) {
    return ex.clipVideos.map((cv) => ({
      title: cv.title,
      videos: buildVideoList(cv),
    }));
  }
  return [{ title: ex.name || "", videos: buildVideoList(ex) }];
}

// All videos for an exercise, Bryan's first (deduplicated across sub-movements if present).
export function videosFor(ex) {
  if (!ex) return [];
  if (Array.isArray(ex.clipVideos) && ex.clipVideos.length > 0) {
    const seen = new Set();
    const bryan = [];
    const demo = [];
    for (const src of [ex, ...ex.clipVideos]) {
      for (const v of buildVideoList(src)) {
        const key = `${v.url}#${v.start || 0}`;
        if (seen.has(key)) continue;
        seen.add(key);
        (v.kind === "bryan" ? bryan : demo).push(v);
      }
    }
    return [...bryan, ...demo];
  }
  return buildVideoList(ex);
}

export function watchUrl(v) {
  if (!v.id) return v.url;
  return `https://www.youtube.com/watch?v=${v.id}${v.start ? `&t=${Math.floor(v.start)}s` : ""}`;
}

export function lookDetailHtml(v) {
  const at = typeof v.start === "number" ? v.start : 0;
  const ms = fmtMinSec(at);
  const clock = fmtSecs(at);
  const range = v.end ? ` ${t("to")} <b>${fmtMinSec(v.end)}</b> (${fmtSecs(v.end)})` : "";
  const where = `${t("Where to look:")} <b>${ms}</b> (${clock})${range}`;
  if (!v.id) {
    return `<div class="video-look">${icon("clock", "sm")}<span>${where} · ${t("Direct embedding isn't available for X posts; open the link below to watch the clip.")}</span></div>`;
  }
  if (v.isShort) {
    const detail = at > 0
      ? t("Embed starts at {time}; if the Short restarts from the beginning, look at {time}.", { time: ms })
      : t("Short clip showing this exercise from {time}.", { time: ms });
    return `<div class="video-look">${icon("clock", "sm")}<span>${where} · ${detail}</span></div>`;
  }
  if (at > 0) {
    return `<div class="video-look">${icon("clock", "sm")}<span>${where} · ${t("Embed starts right at this exercise (if your player resets, seek to {time}).", { time: ms })}</span></div>`;
  }
  return `<div class="video-look">${icon("clock", "sm")}<span>${where} · ${t("Dedicated clip demonstrating this exercise from the start.")}</span></div>`;
}

export function renderVideos(container, list, opts = {}) {
  const groups =
    opts.groups && opts.groups.length
      ? opts.groups
      : [{ title: "", videos: Array.isArray(list) ? list : videosFor(list) }];
  const hasAny = groups.some((g) => g.videos && g.videos.length);
  if (!hasAny) {
    container.innerHTML = `<p class="muted">${t("No video available. Follow the instructions and animation.")}</p>`;
    return { setGroup() {}, playing: false, activeGroup: 0 };
  }
  let activeGroup = Math.min(Math.max(0, opts.activeGroup || 0), groups.length - 1);
  let active = 0;
  let playing = false;

  function curList() {
    return (groups[activeGroup] && groups[activeGroup].videos) || [];
  }

  function draw() {
    const items = curList();
    if (active >= items.length) active = 0;
    const v = items[active];
    const subTabsHtml =
      groups.length > 1
        ? `<div class="video-sub">
            <div class="video-sub-head">
              <span class="eyebrow">${t("Movement {current} of {total}: {title}", { current: activeGroup + 1, total: groups.length, title: esc(groups[activeGroup].title) })}</span>
              <span class="muted">${t("Switches with the animation")}</span>
            </div>
            <div class="video-sub-tabs" role="group" aria-label="${esc(t("Exercise movements"))}">
              ${groups
                .map(
                  (g, gi) =>
                    `<button type="button" data-sub="${gi}" aria-pressed="${gi === activeGroup}"><span class="sub-num">${gi + 1}/${groups.length}</span><span>${esc(g.title)}</span><span class="sub-cnt">${g.videos.length}</span></button>`
                )
                .join("")}
            </div>
          </div>`
        : "";
    if (!v) {
      container.innerHTML = `<div class="videos">${subTabsHtml}<p class="muted">${t("No video available for this movement. Follow the instructions and animation.")}</p></div>`;
      return;
    }
    const at = typeof v.start === "number" ? v.start : 0;
    const vm = videoChannelDate(v);
    container.innerHTML = `
      <div class="videos">
        ${subTabsHtml}
        <div class="video-tabs" role="group" aria-label="${esc(t("Videos"))}">
          ${items
            .map((x, i) => {
              const m = videoChannelDate(x);
              const sub = [m.channel, m.date].filter(Boolean).join(" · ");
              return `<button type="button" data-i="${i}" aria-pressed="${i === active}"><span class="tag ${x.kind === "demo" ? (x.short ? "short" : "demo") : ""}">${x.kind === "bryan" ? t("Bryan") : x.short ? t("Short") : t("Demo")}</span><span class="video-tab-info"><span class="video-tab-title">${esc(x.title)}</span>${sub ? `<small class="video-tab-sub">${esc(sub)}</small>` : ""}</span></button>`;
            })
            .join("")}
        </div>
        ${lookDetailHtml(v)}
        ${
          v.id
            ? `<div class="video-frame"><div class="poster" role="button" tabindex="0" aria-label="${esc(t("Play {title}", { title: v.title }))}" style="background-image:url('https://i.ytimg.com/vi/${v.id}/hqdefault.jpg')"><span class="play">${icon("play")}</span><span class="vt">${esc(v.title)} · ${fmtMinSec(at)} (${fmtSecs(at)})</span></div></div>`
            : `<div class="banner"><div class="grow"><b>${esc(v.title)}</b><span class="muted">${t("Open this post on X to watch the clip.")}</span></div></div>`
        }
        <div class="video-meta"><div class="video-meta-info">${(() => {
          const parts = [
            v.length ? `<span class="video-runtime">${fmtRuntime(v.length)}</span>` : "",
            vm.channel ? `<b>${esc(vm.channel)}</b>` : "",
            vm.date ? `<span>${t("Uploaded {date}", { date: esc(vm.date) })}</span>` : "",
          ].filter(Boolean);
          return parts.length ? `<div class="video-byline">${parts.join(" · ")}</div>` : "";
        })()}<div>${v.kind === "bryan" ? (at > 0 ? t("Bryan demonstrates it at {time} ({clock})", { time: fmtMinSec(at), clock: fmtSecs(at) }) : t("Bryan's video or post")) : at > 0 ? t("Demonstration starts at {time} ({clock})", { time: fmtMinSec(at), clock: fmtSecs(at) }) : t("Technique demonstration by another coach")}</div></div><a href="${esc(watchUrl(v))}" target="_blank" rel="noopener">${t("Open link")} ${icon("external", "sm")}</a></div>
      </div>`;
  }

  function play() {
    const items = curList();
    const v = items[active];
    const frame = container.querySelector(".video-frame");
    if (!frame || !v || !v.id) return;
    playing = true;
    if (opts.onPlay) opts.onPlay();
    const params = new URLSearchParams({ autoplay: "1", rel: "0", playsinline: "1", modestbranding: "1" });
    if (v.start > 0) params.set("start", String(Math.floor(v.start)));
    if (v.end > 0) params.set("end", String(Math.floor(v.end)));
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.id}?${params}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }

  if (container._videoClick && container.removeEventListener) {
    container.removeEventListener("click", container._videoClick);
    container.removeEventListener("keydown", container._videoKey);
  }
  container._videoClick = (e) => {
    const sub = e.target.closest("[data-sub]");
    if (sub) {
      const gi = Number(sub.dataset.sub);
      if (gi !== activeGroup) {
        activeGroup = gi;
        active = 0;
        playing = false;
        draw();
      }
      if (opts.onSelectGroup) opts.onSelectGroup(gi);
      return;
    }
    const tab = e.target.closest("[data-i]");
    if (tab) {
      active = Number(tab.dataset.i);
      playing = false;
      draw();
      if (opts.onSelectVideo) opts.onSelectVideo(active);
      return;
    }
    if (e.target.closest(".poster")) play();
  };
  container._videoKey = (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest(".poster")) {
      e.preventDefault();
      play();
    }
  };
  container.addEventListener("click", container._videoClick);
  container.addEventListener("keydown", container._videoKey);
  draw();

  return {
    setGroup(gi, { manual = false } = {}) {
      if (gi < 0 || gi >= groups.length || gi === activeGroup) return;
      if (!manual && playing) return;
      activeGroup = gi;
      active = 0;
      playing = false;
      draw();
    },
    destroy() {
      playing = false;
      if (container._videoClick) {
        container.removeEventListener("click", container._videoClick);
        container.removeEventListener("keydown", container._videoKey);
        container._videoClick = null;
        container._videoKey = null;
      }
      const frame = container.querySelector(".video-frame");
      if (frame) frame.innerHTML = "";
      container.innerHTML = "";
    },
    get playing() {
      return playing;
    },
    get activeGroup() {
      return activeGroup;
    },
  };
}
