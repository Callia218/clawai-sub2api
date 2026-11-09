<template>
  <div class="shell-bg" aria-hidden="true">
    <div class="shell-bg__blob shell-bg__blob--a" />
    <div class="shell-bg__blob shell-bg__blob--b" />
    <div class="shell-bg__blob shell-bg__blob--c" />
    <div class="shell-bg__blob shell-bg__blob--d" />
    <div class="shell-bg__grid" />
    <div class="shell-bg__grain" />
  </div>
</template>

<style scoped>
.shell-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 12% 0%, var(--ui-canvas-tint-1) 0%, transparent 46%),
    radial-gradient(110% 70% at 92% 8%, var(--ui-canvas-tint-2) 0%, transparent 44%),
    radial-gradient(120% 90% at 50% 104%, var(--ui-canvas-tint-3) 0%, transparent 52%),
    linear-gradient(168deg, var(--ui-canvas) 0%, var(--ui-canvas-deep) 100%);
  opacity: 1;
}

.shell-bg__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(62px);
  opacity: var(--ui-blob-opacity, 0.74);
  will-change: transform;
}

.shell-bg__blob--a {
  width: 46vw;
  height: 46vw;
  top: -14vw;
  left: -8vw;
  background: radial-gradient(circle, var(--ui-canvas-tint-1) 0%, transparent 68%);
  animation: shell-drift-a 34s var(--ui-ease-in-out) infinite alternate;
}

.shell-bg__blob--b {
  width: 40vw;
  height: 40vw;
  top: 4vw;
  right: -10vw;
  background: radial-gradient(circle, var(--ui-canvas-tint-2) 0%, transparent 68%);
  animation: shell-drift-b 42s var(--ui-ease-in-out) infinite alternate;
}

.shell-bg__blob--c {
  width: 52vw;
  height: 52vw;
  bottom: -22vw;
  left: 18vw;
  background: radial-gradient(circle, var(--ui-canvas-tint-3) 0%, transparent 66%);
  animation: shell-drift-c 48s var(--ui-ease-in-out) infinite alternate;
}

.shell-bg__blob--d {
  width: 30vw;
  height: 30vw;
  bottom: -8vw;
  right: 4vw;
  background: radial-gradient(circle, var(--ui-canvas-tint-4) 0%, transparent 70%);
  opacity: calc(var(--ui-blob-opacity, 0.74) * 0.6);
  animation: shell-drift-d 38s var(--ui-ease-in-out) infinite alternate;
}

/* 极细网格，只在左上角淡出，给玻璃提供可折射的细节 */
.shell-bg__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--ui-line-soft) 1px, transparent 1px),
    linear-gradient(to bottom, var(--ui-line-soft) 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask-image: radial-gradient(120% 90% at 30% 0%, #000 0%, transparent 72%);
  mask-image: radial-gradient(120% 90% at 30% 0%, #000 0%, transparent 72%);
  opacity: 0.7;
}

/* 颗粒：让大面积渐变不出现色带 */
.shell-bg__grain {
  position: absolute;
  inset: 0;
  opacity: 0.16;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
}

@keyframes shell-drift-a {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(6vw, 5vh, 0) scale(1.12);
  }
}
@keyframes shell-drift-b {
  from {
    transform: translate3d(0, 0, 0) scale(1.06);
  }
  to {
    transform: translate3d(-7vw, 7vh, 0) scale(0.94);
  }
}
@keyframes shell-drift-c {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-5vw, -6vh, 0) scale(1.1);
  }
}
@keyframes shell-drift-d {
  from {
    transform: translate3d(0, 0, 0) scale(1.1);
  }
  to {
    transform: translate3d(4vw, -5vh, 0) scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  .shell-bg__blob {
    animation: none;
  }
}
</style>
