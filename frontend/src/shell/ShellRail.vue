<template>
  <!-- 移动端遮罩 -->
  <Transition name="rail-scrim">
    <div v-if="mobileOpen" class="rail-scrim" @click="closeMobile" />
  </Transition>

  <aside
    ref="railRef"
    class="rail"
    :class="{
      'rail--collapsed': collapsed && !mobileOpen,
      'rail--mobile-open': mobileOpen,
    }"
    @pointermove="trackPointer"
  >
    <!-- ---------------------------------------------------------- 品牌 -->
    <div class="rail__brand">
      <RouterLink
        :to="homePath"
        class="rail__logo"
        :title="siteName"
        @click="handleMenuItemClick(homePath)"
      >
        <img
          v-if="settingsLoaded"
          :src="siteLogo || '/logo.svg'"
          alt=""
          class="rail__logo-img"
        />
        <span v-else class="rail__logo-fallback" />
      </RouterLink>

      <div v-show="!collapsed || mobileOpen" class="rail__brand-text">
        <RouterLink
          :to="homePath"
          class="rail__brand-name"
          @click="handleMenuItemClick(homePath)"
        >
          {{ siteName }}
        </RouterLink>
        <span class="rail__brand-meta">
          <VersionBadge :version="siteVersion" />
        </span>
      </div>

      <button
        v-if="mobileOpen"
        type="button"
        class="rail__mobile-close"
        aria-label="关闭菜单"
        @click="closeMobile"
      >
        <Icon name="x" size="sm" />
      </button>
    </div>

    <!-- ---------------------------------------------------------- 导航 -->
    <nav ref="navRef" class="rail__nav ui-scroll">
      <div v-for="section in sections" :key="section.key" class="rail__section">
        <p v-if="section.title && (!collapsed || mobileOpen)" class="rail__section-title">
          {{ section.title }}
        </p>
        <div v-else-if="section.title" class="rail__section-sep" />

        <template v-for="item in section.items" :key="item.path">
          <!-- 有子项 -->
          <template v-if="item.children?.length">
            <button
              type="button"
              class="rail__item"
              :class="{
                'is-active': isGroupActive(item) && !isGroupExpanded(item),
                'is-parent': true,
              }"
              :title="collapsed && !mobileOpen ? item.label : undefined"
              @click="handleGroupClick(item)"
            >
              <span class="rail__icon">
                <span
                  v-if="item.iconSvg"
                  class="rail__icon-svg"
                  v-html="sanitizeSvg(item.iconSvg)"
                />
                <Icon v-else-if="item.icon" :name="asIconName(item.icon)" size="md" />
              </span>
              <span v-show="!collapsed || mobileOpen" class="rail__label">{{ item.label }}</span>
              <span
                v-show="!collapsed || mobileOpen"
                class="rail__chevron"
                :class="{ 'is-open': isGroupExpanded(item) }"
              >
                <Icon name="chevronDown" size="sm" />
              </span>
            </button>

            <div
              v-if="(!collapsed || mobileOpen) && isGroupExpanded(item)"
              class="rail__children"
            >
              <RouterLink
                v-for="child in item.children"
                :key="child.path"
                :to="child.path"
                class="rail__child"
                :class="{ 'is-active': route.path === child.path }"
                @click="handleMenuItemClick(child.path)"
              >
                <span class="rail__child-dot" />
                <span class="rail__child-label">{{ child.label }}</span>
              </RouterLink>
            </div>
          </template>

          <!-- 普通项 -->
          <RouterLink
            v-else
            :to="item.path"
            class="rail__item"
            :class="{ 'is-active': isActive(item.path) }"
            :title="collapsed && !mobileOpen ? item.label : undefined"
            :data-tour="item.path === '/keys' ? 'sidebar-my-keys' : undefined"
            :id="
              item.path === '/admin/accounts'
                ? 'sidebar-channel-manage'
                : item.path === '/admin/groups'
                  ? 'sidebar-group-manage'
                  : item.path === '/admin/redeem'
                    ? 'sidebar-wallet'
                    : undefined
            "
            @click="handleMenuItemClick(item.path)"
          >
            <span class="rail__icon">
              <span
                v-if="item.iconSvg"
                class="rail__icon-svg"
                v-html="sanitizeSvg(item.iconSvg)"
              />
              <Icon v-else-if="item.icon" :name="asIconName(item.icon)" size="md" />
            </span>
            <span v-show="!collapsed || mobileOpen" class="rail__label">{{ item.label }}</span>
            <span v-if="item.badge && (!collapsed || mobileOpen)" class="rail__badge">
              {{ item.badge }}
            </span>
          </RouterLink>
        </template>
      </div>
    </nav>

    <!-- ---------------------------------------------------------- 底部 -->
    <div class="rail__foot">
      <button
        type="button"
        class="rail__item rail__item--quiet"
        :title="isDark ? t('nav.lightMode') : t('nav.darkMode')"
        @click="toggleTheme"
      >
        <span class="rail__icon">
          <Icon :name="isDark ? 'sun' : 'moon'" size="md" />
        </span>
        <span v-show="!collapsed || mobileOpen" class="rail__label">
          {{ isDark ? t('nav.lightMode') : t('nav.darkMode') }}
        </span>
      </button>

      <button
        v-if="!mobileOpen"
        type="button"
        class="rail__item rail__item--quiet"
        :title="collapsed ? t('nav.expand') : t('nav.collapse')"
        @click="toggleCollapse"
      >
        <span class="rail__icon">
          <Icon :name="collapsed ? 'chevronRight' : 'chevronLeft'" size="md" />
        </span>
        <span v-show="!collapsed" class="rail__label">{{ t('nav.collapse') }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import { useAppStore } from '@/stores'
import Icon from '@/components/icons/Icon.vue'
import VersionBadge from '@/components/common/VersionBadge.vue'
import { sanitizeSvg } from '@/utils/sanitize'
import { sanitizeUrl } from '@/utils/url'
import { useShellNav } from './useShellNav'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()

const {
  sections,
  homePath,
  isActive,
  isGroupActive,
  isGroupExpanded,
  handleGroupClick,
  handleMenuItemClick,
} = useShellNav()

const collapsed = computed(() => appStore.sidebarCollapsed)
const mobileOpen = computed(() => appStore.mobileOpen)

const siteName = computed(() => appStore.siteName)
const siteLogo = computed(() =>
  sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true })
)
const siteVersion = computed(() => appStore.siteVersion)
const settingsLoaded = computed(() => appStore.publicSettingsLoaded)

const railRef = ref<HTMLElement | null>(null)
const navRef = ref<HTMLElement | null>(null)

const { isDark, toggleTheme } = useTheme()

function toggleCollapse() {
  appStore.toggleSidebar()
}

function closeMobile() {
  appStore.setMobileOpen(false)
}

/**
 * Icon.vue 的 name prop 是 90 个字面量的联合类型，而导航项由数据驱动（string）。
 * 这里做一次受控放宽，避免在每个调用点写类型断言。
 */
function asIconName(name: string | null | undefined) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (name ?? 'grid') as any
}

function trackPointer(ev: PointerEvent) {
  const el = railRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  el.style.setProperty('--ui-mx', `${((ev.clientX - rect.left) / rect.width) * 100}%`)
  el.style.setProperty('--ui-my', `${((ev.clientY - rect.top) / rect.height) * 100}%`)
}

onMounted(() => {
  if (appStore.sidebarScrollTop > 0 && navRef.value) {
    void nextTick(() => {
      if (navRef.value) navRef.value.scrollTop = appStore.sidebarScrollTop
    })
  }
})

onBeforeUnmount(() => {
  if (navRef.value) appStore.sidebarScrollTop = navRef.value.scrollTop
})
</script>

<style scoped>
/* ------------------------------------------------------------------ 遮罩 */
.rail-scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  background-color: rgb(2 6 14 / 0.5);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}

.rail-scrim-enter-active,
.rail-scrim-leave-active {
  transition: opacity var(--ui-dur-base) var(--ui-ease-out);
}
.rail-scrim-enter-from,
.rail-scrim-leave-to {
  opacity: 0;
}

/* ------------------------------------------------------------------ 面板 */
.rail {
  position: fixed;
  top: var(--ui-s-4);
  left: var(--ui-s-4);
  bottom: var(--ui-s-4);
  z-index: 70;
  display: flex;
  flex-direction: column;
  width: var(--ui-panel-w);
  padding: var(--ui-s-3);
  border-radius: var(--ui-r-2xl);
  isolation: isolate;
  font-family: var(--ui-font);

  background-color: rgb(var(--ui-glass-rgb) / calc(var(--ui-glass-alpha) + 0.10));
  -webkit-backdrop-filter: blur(var(--ui-glass-strong-blur)) saturate(var(--ui-glass-sat))
    brightness(var(--ui-glass-bright));
  backdrop-filter: blur(var(--ui-glass-strong-blur)) saturate(var(--ui-glass-sat))
    brightness(var(--ui-glass-bright));
  box-shadow:
    inset 0 1px 2px var(--ui-edge-strong),
    inset 0 -1px 1.5px var(--ui-edge-shade),
    var(--ui-shadow-4);

  transition:
    width var(--ui-dur-slow) var(--ui-ease-out),
    transform var(--ui-dur-slow) var(--ui-ease-out);
}

/* 边缘折射 */
.rail::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    158deg,
    var(--ui-edge-strong) 0%,
    var(--ui-edge) 24%,
    transparent 50%,
    var(--ui-edge-shade) 76%,
    var(--ui-edge) 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* 镜面高光跟指针 */
.rail::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: radial-gradient(
    110% 60% at var(--ui-mx, 30%) var(--ui-my, 4%),
    rgb(255 255 255 / 0.22) 0%,
    rgb(255 255 255 / 0.05) 40%,
    transparent 72%
  );
  pointer-events: none;
  transition: background var(--ui-dur-slow) var(--ui-ease-out);
}

html.dark .rail::after,
html[data-theme='dark'] .rail::after {
  background: radial-gradient(
    110% 60% at var(--ui-mx, 30%) var(--ui-my, 4%),
    rgb(255 255 255 / 0.10) 0%,
    rgb(255 255 255 / 0.02) 42%,
    transparent 74%
  );
}

.rail--collapsed {
  width: var(--ui-rail-w);
  padding-left: var(--ui-s-2);
  padding-right: var(--ui-s-2);
}

/* ------------------------------------------------------------------ 品牌 */
.rail__brand {
  display: flex;
  align-items: center;
  gap: var(--ui-s-3);
  padding: var(--ui-s-2) var(--ui-s-2) var(--ui-s-3);
  min-height: 44px;
}

.rail__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: var(--ui-r-md);
  overflow: hidden;
  box-shadow:
    inset 0 1px 1px var(--ui-edge-inner),
    0 6px 16px -10px rgb(13 148 136 / 0.7);
  transition: transform var(--ui-dur-base) var(--ui-ease-spring);
}
.rail__logo:hover {
  transform: scale(1.06);
}

.rail__logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.rail__logo-fallback {
  width: 100%;
  height: 100%;
  background-image: var(--ui-arc);
}

.rail__brand-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.rail__brand-name {
  font-size: var(--ui-fs-md);
  font-weight: 680;
  letter-spacing: -0.018em;
  color: var(--ui-text);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail__brand-meta {
  display: inline-flex;
  align-items: center;
  transform: scale(0.92);
  transform-origin: left center;
}

.rail__mobile-close {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--ui-r-sm);
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
}

/* ------------------------------------------------------------------ 导航 */
.rail__nav {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--ui-s-1);
  padding-bottom: var(--ui-s-2);
}

.rail__section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail__section-title {
  margin: var(--ui-s-3) 0 4px;
  padding: 0 var(--ui-s-3);
  font-size: 10px;
  font-weight: 680;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ui-text-faint);
  white-space: nowrap;
}

.rail__section-sep {
  height: 1px;
  margin: var(--ui-s-2) var(--ui-s-2);
  background: var(--ui-line);
}

/* ------------------------------------------------------------------ 条目 */
.rail__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--ui-s-3);
  width: 100%;
  min-height: 36px;
  padding: 0 var(--ui-s-3);
  border: 0;
  border-radius: var(--ui-r-md);
  background: transparent;
  color: var(--ui-text-muted);
  font-family: var(--ui-font);
  font-size: var(--ui-fs-sm);
  font-weight: 540;
  letter-spacing: -0.004em;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--ui-dur-fast) var(--ui-ease-out),
    background-color var(--ui-dur-fast) var(--ui-ease-out),
    box-shadow var(--ui-dur-fast) var(--ui-ease-out);
}

.rail--collapsed .rail__item {
  justify-content: center;
  padding: 0;
  gap: 0;
}

.rail__item:hover {
  color: var(--ui-text);
  background-color: rgb(var(--ui-glass-strong-rgb) / calc(var(--ui-glass-strong-alpha) - 0.12));
}

.rail__item.is-active {
  color: var(--ui-text);
  font-weight: 620;
  background-color: rgb(var(--ui-glass-strong-rgb) / calc(var(--ui-glass-strong-alpha) + 0.14));
  box-shadow:
    inset 0 1px 1px var(--ui-edge-inner),
    0 4px 12px -8px rgb(15 23 42 / 0.3);
}

/* 活动指示条 */
.rail__item.is-active::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  border-radius: var(--ui-r-pill);
  background-image: var(--ui-arc);
  box-shadow: 0 0 10px 0 rgb(34 211 238 / 0.7);
}

.rail--collapsed .rail__item.is-active::before {
  left: -2px;
  height: 14px;
}

.rail__item--quiet {
  color: var(--ui-text-faint);
}
.rail__item--quiet:hover {
  color: var(--ui-text-soft);
}

.rail__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.rail__icon-svg {
  display: inline-flex;
  width: 20px;
  height: 20px;
}
.rail__icon-svg :deep(svg) {
  width: 100%;
  height: 100%;
}

.rail__label {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail__chevron {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--ui-text-faint);
  transition: transform var(--ui-dur-base) var(--ui-ease-out);
}
.rail__chevron.is-open {
  transform: rotate(180deg);
}

.rail__badge {
  display: inline-flex;
  align-items: center;
  height: 17px;
  padding: 0 6px;
  border-radius: var(--ui-r-pill);
  font-size: 10px;
  font-weight: 660;
  color: var(--ui-accent);
  background-color: var(--ui-accent-soft);
  flex-shrink: 0;
}

/* ------------------------------------------------------------------ 子项 */
.rail__children {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 2px 0 4px;
  padding-left: 30px;
  position: relative;
}

.rail__children::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 4px;
  bottom: 4px;
  width: 1px;
  background: var(--ui-line);
}

.rail__child {
  display: flex;
  align-items: center;
  gap: var(--ui-s-2);
  min-height: 30px;
  padding: 0 var(--ui-s-2);
  border-radius: var(--ui-r-sm);
  color: var(--ui-text-faint);
  font-family: var(--ui-font);
  font-size: var(--ui-fs-xs);
  font-weight: 520;
  text-decoration: none;
  white-space: nowrap;
  transition:
    color var(--ui-dur-fast) var(--ui-ease-out),
    background-color var(--ui-dur-fast) var(--ui-ease-out);
}

.rail__child:hover {
  color: var(--ui-text-soft);
  background-color: rgb(var(--ui-glass-strong-rgb) / calc(var(--ui-glass-strong-alpha) - 0.14));
}

.rail__child.is-active {
  color: var(--ui-accent);
  font-weight: 600;
}

.rail__child-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
  flex-shrink: 0;
}

.rail__child.is-active .rail__child-dot {
  opacity: 1;
  box-shadow: 0 0 6px 0 currentColor;
}

.rail__child-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ------------------------------------------------------------------ 底部 */
.rail__foot {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: var(--ui-s-2);
  margin-top: var(--ui-s-1);
  border-top: 1px solid var(--ui-line);
}

/* ------------------------------------------------------------------ 移动端 */
@media (max-width: 1023px) {
  .rail {
    top: 0;
    left: 0;
    bottom: 0;
    border-radius: 0 var(--ui-r-2xl) var(--ui-r-2xl) 0;
    width: var(--ui-panel-w);
    transform: translateX(-104%);
    padding-top: var(--ui-s-4);
  }

  .rail--mobile-open {
    transform: translateX(0);
  }

  .rail--collapsed {
    width: var(--ui-panel-w);
    padding-left: var(--ui-s-3);
    padding-right: var(--ui-s-3);
  }

  .rail--collapsed .rail__item {
    justify-content: flex-start;
    padding: 0 var(--ui-s-3);
    gap: var(--ui-s-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rail {
    transition: none;
  }
}
</style>
