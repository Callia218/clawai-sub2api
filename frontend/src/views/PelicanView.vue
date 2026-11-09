<template>
  <AppLayout>
    <div class="pelican">
    <!-- ── 头部 ─────────────────────────────────────────────── -->
    <header class="card pelican__head">
      <div class="pelican__head-main">
        <div class="min-w-0">
          <h1 class="pelican__title">
            <Icon name="lightbulb" size="md" class="pelican__title-icon" />
            {{ t('pelican.title') }}
          </h1>
          <p class="pelican__subtitle">{{ t('pelican.subtitle') }}</p>
        </div>
        <div class="pelican__actions">
          <button v-if="isAdmin" type="button" class="pelican-btn" @click="toggleConfig">
            <Icon name="cog" size="sm" />
            {{ showConfig ? t('pelican.closeConfig') : t('pelican.config') }}
          </button>
          <button
            v-if="isAdmin"
            type="button"
            class="pelican-btn pelican-btn--primary"
            :disabled="running"
            @click="runNow"
          >
            <Icon name="play" size="sm" />
            {{ running ? t('pelican.running') : t('pelican.runNow') }}
          </button>
          <button type="button" class="pelican-btn" :disabled="loading" @click="reload">
            <Icon name="refresh" size="sm" :class="loading ? 'animate-spin' : ''" />
            {{ t('pelican.refresh') }}
          </button>
        </div>
      </div>

      <div class="pelican__prompt">
        <span class="pelican__prompt-label">{{ t('pelican.promptLabel') }}</span>
        <code class="pelican__prompt-text">{{ prompt }}</code>
      </div>

      <div class="pelican__facts">
        <span>{{ t('pelican.factGroups', { n: groups.length }) }}</span>
        <span>{{ t('pelican.factLastRun', { time: lastRunText }) }}</span>
      </div>
    </header>

    <!-- ── 运行报告 ─────────────────────────────────────────── -->
    <div v-if="runItems.length" class="card pelican__report">
      <div class="pelican__report-title">{{ t('pelican.lastRunReport') }}</div>
      <ul class="pelican__report-list">
        <li v-for="(item, idx) in runItems" :key="idx" :class="item.status === 'ok' ? 'is-ok' : 'is-bad'">
          <span class="pelican__report-model">{{ item.model || '—' }}</span>
          <span class="pelican__report-group">#{{ item.group_id }}</span>
          <span>{{ item.status === 'ok' ? t('pelican.ok') : item.error || t('pelican.failed') }}</span>
          <span class="pelican__report-dur">{{ formatDuration(item.duration_ms) }}</span>
        </li>
      </ul>
    </div>

    <!-- ── 配置面板（仅管理员） ─────────────────────────────── -->
    <section v-if="showConfig && isAdmin" class="card pelican__config">
      <div class="pelican__config-head">
        <h2 class="pelican__section-title">{{ t('pelican.config') }}</h2>
        <div class="flex items-center gap-2">
          <button type="button" class="pelican-btn" @click="showConfig = false">
            {{ t('common.cancel') }}
          </button>
          <button type="button" class="pelican-btn pelican-btn--primary" :disabled="saving" @click="save">
            {{ saving ? t('common.submitting') : t('common.save') }}
          </button>
        </div>
      </div>

      <div class="pelican__config-grid">
        <label class="pelican__field">
          <span>{{ t('pelican.enabled') }}</span>
          <input v-model="form.enabled" type="checkbox" class="pelican__checkbox" />
          <small>{{ t('pelican.enabledHint') }}</small>
        </label>
        <label class="pelican__field">
          <span>{{ t('pelican.interval') }}</span>
          <input v-model.number="form.interval_minutes" type="number" min="5" max="1440" class="pelican__input" />
        </label>
        <label class="pelican__field">
          <span>{{ t('pelican.maxTokens') }}</span>
          <input v-model.number="form.max_tokens" type="number" min="256" max="32000" class="pelican__input" />
        </label>
        <label class="pelican__field">
          <span>{{ t('pelican.keepPerGroup') }}</span>
          <input v-model.number="form.keep_per_group" type="number" min="1" max="500" class="pelican__input" />
        </label>
        <label class="pelican__field">
          <span>{{ t('pelican.retention') }}</span>
          <input v-model.number="form.retention_days" type="number" min="1" max="90" class="pelican__input" />
        </label>
      </div>

      <div class="pelican__group-editor">
        <div class="pelican__group-editor-head">
          <h3 class="pelican__section-title">{{ t('pelican.groupBindings') }}</h3>
          <button type="button" class="pelican-btn" @click="addGroupRow">
            <Icon name="plus" size="sm" />
            {{ t('pelican.addGroup') }}
          </button>
        </div>

        <p v-if="!form.groups.length" class="pelican__empty-hint">{{ t('pelican.noGroupYet') }}</p>

        <div v-for="(row, idx) in form.groups" :key="idx" class="pelican__group-row">
          <select v-model.number="row.group_id" class="pelican__input pelican__input--grow" @change="onGroupChange(row)">
            <option :value="0">{{ t('pelican.selectGroup') }}</option>
            <option v-for="g in options.groups" :key="g.id" :value="g.id">
              #{{ g.id }} {{ g.name }} ({{ g.platform }}){{ g.has_accounts ? '' : ' — ' + t('pelican.noAccounts') }}
            </option>
          </select>

          <select v-model.number="row.api_key_id" class="pelican__input pelican__input--grow">
            <option :value="0">{{ t('pelican.selectKey') }}</option>
            <option v-for="k in keysForGroup(row.group_id)" :key="k.id" :value="k.id">
              #{{ k.id }} {{ k.name }} · {{ k.masked }}
            </option>
          </select>

          <input
            v-model="row.model"
            type="text"
            class="pelican__input pelican__input--grow"
            :placeholder="t('pelican.modelPlaceholder')"
          />

          <select v-model="row.reasoning_effort" class="pelican__input">
            <option value="">{{ t('pelican.effortDefault') }}</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>

          <button type="button" class="pelican-btn pelican-btn--danger" @click="form.groups.splice(idx, 1)">
            <Icon name="trash" size="sm" />
          </button>
        </div>
      </div>
    </section>

    <!-- ── 分组结果 ─────────────────────────────────────────── -->
    <p v-if="!loading && !groups.length" class="pelican__empty">
      {{ t('pelican.empty') }}
    </p>

    <section v-for="g in groups" :key="g.group_id" class="card pelican__group">
      <div class="pelican__group-head">
        <div class="min-w-0">
          <h2 class="pelican__group-name">
            #{{ g.group_id }} {{ g.group_name || '—' }}
            <span class="pelican__badge">{{ g.platform || 'unknown' }}</span>
          </h2>
          <p class="pelican__group-meta">
            <span>{{ t('pelican.model') }}: <strong>{{ g.model || '—' }}</strong></span>
            <span v-if="g.api_key_id">· {{ t('pelican.key') }}: {{ g.api_key_name || '#' + g.api_key_id }}</span>
            <span>· {{ t('pelican.totalResults', { n: g.total }) }}</span>
          </p>
        </div>
        <span class="pelican__group-time">{{ formatTime(g.last_created_at) }}</span>
      </div>

      <p v-if="!g.results.length" class="pelican__empty-hint">{{ t('pelican.noResult') }}</p>

      <div v-else class="pelican__frames">
        <figure v-for="r in g.results" :key="r.id" class="pelican__frame">
          <figcaption class="pelican__frame-meta">
            <span class="pelican__frame-time">{{ formatTime(r.created_at) }}</span>
            <span class="pelican__frame-chip">{{ formatDuration(r.duration_ms) }}</span>
            <span class="pelican__frame-chip">
              {{ r.input_tokens }} → {{ r.output_tokens }} tok
            </span>
            <span v-if="r.reasoning_effort" class="pelican__frame-chip">{{ r.reasoning_effort }}</span>
          </figcaption>
          <template v-if="r.status === 'ok' && r.html">
            <PelicanPreview :html="r.html" :title="`${g.group_name} ${r.created_at}`" />
            <button type="button" class="pelican__expand" @click="expandedResult = { html: r.html, title: `${g.group_name} · ${r.model}` }">
              {{ t('pelican.expand') }} <Icon name="search" size="sm" />
            </button>
          </template>
          <div v-else class="pelican__canvas pelican__canvas--error">
            <Icon name="x" size="lg" />
            <span>{{ r.error || t('pelican.failed') }}</span>
          </div>
        </figure>
      </div>
      </section>
    </div>
    <BaseDialog :show="!!expandedResult" :title="expandedResult?.title || t('pelican.expand')" width="wide" @close="expandedResult = null">
      <PelicanPreview v-if="expandedResult" :html="expandedResult.html" :title="expandedResult.title" expanded />
      <p class="pelican__preview-hint">{{ t('pelican.previewHint') }}</p>
    </BaseDialog>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import PelicanPreview from '@/components/common/PelicanPreview.vue'
import { useAuthStore } from '@/stores'
import {
  getConfig,
  getOptions,
  getOverview,
  getStatus,
  saveConfig,
  triggerRun,
  type PelicanConfig,
  type PelicanGroupConfig,
  type PelicanGroupView,
  type PelicanOptions,
  type PelicanRunItem,
  type PelicanStatus,
} from '@/api/pelican'

const { t } = useI18n()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const loading = ref(false)
const saving = ref(false)
const showConfig = ref(false)
const expandedResult = ref<{ html: string; title: string } | null>(null)
const groups = ref<PelicanGroupView[]>([])
const prompt = ref('')
const status = ref<PelicanStatus>({ running: false, last_run_at: null, last_report: null })
const options = ref<PelicanOptions>({ groups: [], keys: [] })

const form = reactive<PelicanConfig>({
  enabled: false,
  interval_minutes: 60,
  max_tokens: 4096,
  keep_per_group: 100,
  retention_days: 7,
  groups: [],
})

const running = computed(() => status.value.running)
const runItems = computed<PelicanRunItem[]>(() => status.value.last_report?.items ?? [])

const lastRunText = computed(() =>
  status.value.last_run_at ? formatTime(status.value.last_run_at) : t('pelican.never')
)

let pollTimer: ReturnType<typeof setInterval> | null = null

function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function keysForGroup(groupId: number) {
  return options.value.keys.filter((k) => k.group_id === groupId)
}

function onGroupChange(row: PelicanGroupConfig) {
  const candidates = keysForGroup(row.group_id)
  if (!candidates.some((k) => k.id === row.api_key_id)) {
    row.api_key_id = candidates[0]?.id ?? 0
  }
}

function addGroupRow() {
  form.groups.push({ group_id: 0, api_key_id: 0, model: '', reasoning_effort: '' })
}

async function loadOverview() {
  loading.value = true
  try {
    const data = await getOverview(6)
    groups.value = data.groups ?? []
    prompt.value = data.prompt ?? ''
  } catch {
    groups.value = []
  } finally {
    loading.value = false
  }
}

async function loadStatus() {
  try {
    status.value = await getStatus()
  } catch {
    /* 轮询失败不打扰用户 */
  }
}

async function reload() {
  await Promise.all([loadOverview(), loadStatus()])
}

async function toggleConfig() {
  if (!showConfig.value) {
    try {
      const [cfg, opts] = await Promise.all([getConfig(), getOptions()])
      Object.assign(form, cfg)
      form.groups = (cfg.groups ?? []).map((g) => ({ ...g, reasoning_effort: g.reasoning_effort ?? '' }))
      options.value = opts
    } catch {
      return
    }
  }
  showConfig.value = !showConfig.value
}

async function save() {
  saving.value = true
  try {
    const saved = await saveConfig({ ...form, groups: form.groups.filter((g) => g.group_id > 0) })
    Object.assign(form, saved)
    form.groups = (saved.groups ?? []).map((g) => ({ ...g, reasoning_effort: g.reasoning_effort ?? '' }))
    showConfig.value = false
    await reload()
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || t('pelican.saveFailed')
    window.alert(message)
  } finally {
    saving.value = false
  }
}

async function runNow() {
  try {
    await triggerRun()
    status.value = { ...status.value, running: true }
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || t('pelican.runFailed')
    window.alert(message)
  }
}

onMounted(async () => {
  await reload()
  // 运行中才需要轮询；空闲时保持 20 秒一次，足够发现「别人刚跑完」
  pollTimer = setInterval(async () => {
    await loadStatus()
    if (!status.value.running && pollTimer) {
      // 从 running 变 idle 的那一次需要刷新结果
      if (runItems.value.length) await loadOverview()
    }
  }, 5000)
})

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<style scoped>
.pelican {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

.pelican__head {
  padding: 20px;
}

.pelican__head-main {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pelican__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.pelican__title-icon {
  color: var(--ui-accent, #6366f1);
}

.pelican__subtitle {
  margin-top: 6px;
  max-width: 62ch;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ui-text-muted, #64748b);
}

.pelican__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pelican-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid var(--ui-hairline, rgb(15 23 42 / 0.13));
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.pelican-btn:hover:not(:disabled) {
  background: rgb(127 127 127 / 0.1);
}

.pelican-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pelican-btn--primary {
  background: var(--ui-accent, #6366f1);
  border-color: transparent;
  color: #fff;
}

.pelican-btn--primary:hover:not(:disabled) {
  background: var(--ui-accent-hover, #0f766e);
}

.pelican-btn--danger {
  color: #dc2626;
  border-color: rgb(220 38 38 / 0.35);
}

.pelican__prompt {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgb(127 127 127 / 0.08);
}

.pelican__prompt-label {
  flex: none;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ui-text-muted, #64748b);
}

.pelican__prompt-text {
  font-family: var(--ui-font-mono, ui-monospace, monospace);
  font-size: 12.5px;
  line-height: 1.6;
  word-break: break-word;
}

.pelican__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--ui-text-muted, #64748b);
}

.pelican__report {
  padding: 14px 16px;
}

.pelican__report-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ui-text-muted, #64748b);
}

.pelican__report-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  font-size: 12.5px;
}

.pelican__report-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.pelican__report-list li.is-ok .pelican__report-model {
  color: #16a34a;
}

.pelican__report-list li.is-bad .pelican__report-model {
  color: #dc2626;
}

.pelican__report-model {
  font-weight: 600;
}

.pelican__report-group,
.pelican__report-dur {
  color: var(--ui-text-muted, #64748b);
  font-variant-numeric: tabular-nums;
}

.pelican__config {
  padding: 18px 20px;
}

.pelican__config-head,
.pelican__group-editor-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pelican__section-title {
  font-size: 14px;
  font-weight: 600;
}

.pelican__config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.pelican__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
}

.pelican__field small {
  font-size: 11px;
  color: var(--ui-text-muted, #64748b);
}

.pelican__input {
  min-width: 0;
  padding: 7px 10px;
  border-radius: 9px;
  border: 1px solid var(--ui-hairline, rgb(15 23 42 / 0.13));
  background: transparent;
  font-size: 12.5px;
  color: inherit;
}

.pelican__input--grow {
  flex: 1 1 180px;
}

select.pelican__input {
  min-width: 132px;
}

.pelican__checkbox {
  width: 16px;
  height: 16px;
}

.pelican__group-editor {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--ui-hairline, rgb(15 23 42 / 0.13));
}

.pelican__group-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.pelican__group {
  padding: 18px 20px;
}

.pelican__group-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.pelican__group-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 620;
}

.pelican__badge {
  padding: 2px 7px;
  border-radius: 6px;
  background: rgb(99 102 241 / 0.12);
  color: var(--ui-accent, #6366f1);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.pelican__group-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 5px;
  font-size: 12px;
  color: var(--ui-text-muted, #64748b);
}

.pelican__group-time {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted, #64748b);
}

.pelican__frames {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 14px;
  margin-top: 14px;
}

.pelican__frame {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  align-self: start;
}

.pelican__frame-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ui-text-muted, #64748b);
}

.pelican__frame-time {
  font-variant-numeric: tabular-nums;
}

.pelican__frame-chip {
  padding: 1px 6px;
  border-radius: 5px;
  background: rgb(127 127 127 / 0.12);
  font-variant-numeric: tabular-nums;
}

.pelican__canvas {
  width: 100%;
  height: 380px;
  border: 1px solid var(--ui-hairline, rgb(15 23 42 / 0.13));
  border-radius: 12px;
  background: #fff;
}

.pelican__expand { display: inline-flex; align-items: center; align-self: flex-end; gap: 6px; padding: 6px 2px; font-size: 12px; color: var(--ui-text-muted); }
.pelican__expand:hover { color: var(--ui-accent); }
.pelican__expand:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 3px; border-radius: 4px; }
.pelican__preview-hint { margin-top: 12px; text-align: center; font-size: 12px; color: var(--ui-text-muted); }

.pelican__canvas--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  font-size: 12.5px;
  color: #dc2626;
  background: rgb(220 38 38 / 0.06);
}

.pelican__empty,
.pelican__empty-hint {
  font-size: 13px;
  color: var(--ui-text-muted, #64748b);
}

.pelican__empty {
  padding: 40px 0;
  text-align: center;
}

.pelican__empty-hint {
  margin-top: 10px;
}
</style>
