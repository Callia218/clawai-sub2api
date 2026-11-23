<template>
  <div class="space-y-5">
    <!-- 页头(独立形态下展示标题;后台形态 AppHeader 已有页面标题) -->
    <div v-if="!embedded">
      <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">{{ t('modelPlaza.title') }}</h1>
      <p class="mt-1.5 text-sm text-gray-500 dark:text-dark-400">{{ t('modelPlaza.description') }}</p>
    </div>

    <!-- 全局价格说明(管理员配置,Markdown) -->
    <div
      v-if="descriptionHtml"
      class="plaza-description rounded-2xl border border-gray-100 bg-white px-5 py-4 text-sm shadow-card dark:border-dark-700/50 dark:bg-dark-800/50"
      v-html="descriptionHtml"
    ></div>

    <!-- 未登录提示 -->
    <p
      v-if="!isAuthenticated && !preview"
      class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-dark-500"
    >
      <Icon name="infoCircle" size="xs" class="h-3.5 w-3.5" />
      {{ t('modelPlaza.anonymousHint') }}
    </p>

    <!-- 加载/错误/空 -->
    <div v-if="loading" class="plaza-pending" :class="{ 'plaza-paused': paused }">
      <span role="status" class="sr-only">{{ t('common.loading') }}</span>
      <div aria-hidden="true" class="plaza-skeleton">
        <div class="plaza-sk-tools"><i /><i /><i /></div>
        <div class="plaza-sk-list"><div class="plaza-sk-title"><i /><i /></div><div v-for="row in 4" :key="row" class="plaza-sk-row"><i /><i /><i /></div></div>
      </div>
      <div v-if="percent != null" class="plaza-progress" role="progressbar" :aria-label="t('common.loading')" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
        <span>{{ t('common.loading') }} <b>{{ percent }}%</b></span><div class="plaza-meter"><i :style="{ transform: `scaleX(${percent / 100})` }" /></div>
      </div>
    </div>
    <div
      v-else-if="error"
      class="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
    >
      {{ t('modelPlaza.loadFailed') }}
    </div>
    <div v-else class="plaza-ready space-y-5" :class="{ 'plaza-revealing': revealing }" @animationend.self="revealing = false">
      <!-- 筛选区:平台 → 分组 → 倍率 -->
      <PlazaFilterBar
        :platforms="platforms"
        :groups="groupOptions"
        :rates="rates"
        :platform="selectedPlatform"
        :group-id="selectedGroupId"
        :rate="selectedRate"
        :search="searchQuery"
        @update:platform="selectedPlatform = $event"
        @update:group-id="selectedGroupId = $event"
        @update:rate="selectedRate = $event"
        @update:search="searchQuery = $event"
      />

      <!-- 分组分节的模型清单(默认按生效倍率升序) -->
      <div v-if="filteredGroups.length > 0" class="space-y-5">
        <PlazaGroupSection v-for="g in filteredGroups" :key="g.id" :group="g" />
      </div>
      <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center text-sm text-gray-500 dark:border-dark-600 dark:text-dark-400"
      >
        {{ searchActive ? t('modelPlaza.noSearchResult') : t('modelPlaza.empty') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import Icon from '@/components/icons/Icon.vue'
import PlazaFilterBar from './PlazaFilterBar.vue'
import PlazaGroupSection from './PlazaGroupSection.vue'
import type { ModelPlazaGroup, ModelPlazaResponse } from '@/api/modelPlaza'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  response: ModelPlazaResponse | null
  loading: boolean
  percent?: number | null
  preview?: boolean
  paused?: boolean
  error?: boolean
  /** 后台内嵌形态(AppLayout 内):隐藏页头。 */
  embedded?: boolean
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

const selectedPlatform = ref<string>('all')
const selectedGroupId = ref<number | 'all'>('all')
const selectedRate = ref<number | 'all'>('all')
const searchQuery = ref('')

const searchActive = computed(() => searchQuery.value.trim() !== '')
const revealing = ref(false)
watch(() => props.loading, (loading, wasLoading) => {
  revealing.value = wasLoading && !loading && !props.error && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
})

const descriptionHtml = computed(() => {
  const md = props.response?.description?.trim()
  if (!md) return ''
  return DOMPurify.sanitize(marked.parse(md) as string)
})

/** 生效倍率 = 用户专属倍率 ?? 分组默认倍率。 */
function effectiveRate(g: ModelPlazaGroup): number {
  return g.user_rate_multiplier ?? g.rate_multiplier
}

const platforms = computed(() =>
  [...new Set((props.response?.groups ?? []).map((g) => g.platform).filter(Boolean))].sort()
)

const groupOptions = computed(() =>
  (props.response?.groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    platform: g.platform,
    rate: effectiveRate(g)
  }))
)

/** 全量生效倍率;当前组合下不可用的项由 FilterBar 置灰而非隐藏。 */
const rates = computed(() =>
  [...new Set((props.response?.groups ?? []).map(effectiveRate))].sort((a, b) => a - b)
)

/** 数据刷新后选中的倍率可能不复存在,重置为全部。 */
watch(rates, (list) => {
  if (selectedRate.value !== 'all' && !list.includes(selectedRate.value)) {
    selectedRate.value = 'all'
  }
})

const filteredGroups = computed(() => {
  let groups = props.response?.groups ?? []
  if (selectedPlatform.value !== 'all') {
    groups = groups.filter((g) => g.platform === selectedPlatform.value)
  }
  if (selectedGroupId.value !== 'all') {
    groups = groups.filter((g) => g.id === selectedGroupId.value)
  }
  if (selectedRate.value !== 'all') {
    groups = groups.filter((g) => effectiveRate(g) === selectedRate.value)
  }
  // 模型名搜索:分组内只留命中的模型,整组无命中则隐藏该分组。
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    groups = groups
      .map((g) => ({ ...g, models: g.models.filter((m) => m.name.toLowerCase().includes(q)) }))
      .filter((g) => g.models.length > 0)
  }
  // 专属倍率会改变生效值,不能只依赖后端按默认倍率的排序。
  return [...groups].sort(
    (a, b) => effectiveRate(a) - effectiveRate(b) || a.name.localeCompare(b.name)
  )
})
</script>

<style scoped>
.plaza-description {
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.plaza-description :deep(h1),
.plaza-description :deep(h2),
.plaza-description :deep(h3) {
  @apply mb-2 mt-3 font-semibold text-gray-900 first:mt-0 dark:text-white;
}

.plaza-description :deep(p) {
  @apply mb-2 text-gray-700 last:mb-0 dark:text-dark-200;
}

.plaza-description :deep(a) {
  @apply text-primary-600 underline underline-offset-4 hover:text-primary-700 dark:text-primary-300;
}

.plaza-description :deep(ul) {
  @apply mb-2 list-disc pl-5;
}

.plaza-description :deep(ol) {
  @apply mb-2 list-decimal pl-5;
}

.plaza-description :deep(li) {
  @apply mb-0.5 text-gray-700 dark:text-dark-200;
}

.plaza-description :deep(code) {
  @apply rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-dark-800;
}

.plaza-description :deep(blockquote) {
  @apply my-2 border-l-4 border-gray-300 pl-3 text-gray-600 dark:border-dark-600 dark:text-dark-300;
}
.plaza-pending { position: relative; max-width: 100%; }
.plaza-skeleton { position: relative; overflow: hidden; border-radius: 16px; color: #e2e3e0; }
.plaza-sk-tools, .plaza-sk-list { padding: 18px 20px; border: 1px solid #e3e5e2; border-radius: 14px; background: white; }
.plaza-sk-tools, .plaza-sk-title, .plaza-sk-row { display: flex; align-items: center; gap: 10px; }
.plaza-sk-tools { margin-bottom: 16px; }
.plaza-skeleton i { display: block; height: 10px; background: currentColor; border-radius: 5px; }
.plaza-sk-tools i { height: 24px; width: min(19%, 100px); }
.plaza-sk-title { padding-block: 6px 16px; }
.plaza-sk-title i { height: 16px; width: 22%; } .plaza-sk-title i + i { width: 11%; }
.plaza-sk-row { min-height: 42px; border-top: 1px solid #e8e9e7; }
.plaza-sk-row i { width: 23%; } .plaza-sk-row i + i { width: 13%; margin-left: auto; }
.plaza-progress { position: absolute; top: 0; inset-inline: 9px; color: inherit; font-size: .75rem; pointer-events: none; }
.plaza-progress > span { position: absolute; top: 19px; right: 9px; font-variant-numeric: tabular-nums; }
.plaza-meter { height: 3px; border-radius: 99px; overflow: hidden; background: #e8edde; }
.plaza-meter i { display: block; height: 100%; background: #8cc515; transform-origin: left; }
:global(.dark) .plaza-skeleton { color: #39434e; }
:global(.dark) :is(.plaza-sk-list,.plaza-sk-tools) { background: #20262d; border-color: #39424b; }
:global(.dark) .plaza-sk-row { border-color: #353d47; }
@media (prefers-reduced-motion:no-preference) {
  .plaza-skeleton::after { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg,transparent 22%,rgb(255 255 255 / .65) 50%,transparent 78%); animation: plaza-sweep 1500ms linear infinite; pointer-events: none; }
  .plaza-paused .plaza-skeleton::after { animation-play-state: paused; }
  :global(.dark) .plaza-skeleton::after { opacity: .18; }
  .plaza-meter i { transition: transform 600ms cubic-bezier(.33,1,.68,1); }
  .plaza-revealing { animation: plaza-arrived 700ms cubic-bezier(.16,1,.3,1); }
  .plaza-revealing :deep(section:first-of-type header) { animation: plaza-resolve 700ms cubic-bezier(.16,1,.3,1); }
  @keyframes plaza-sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
  @keyframes plaza-arrived { from { opacity: .4; } to { opacity: 1; } }
  @keyframes plaza-resolve { from { filter: blur(14px); } to { filter: blur(0); } }
}
</style>
