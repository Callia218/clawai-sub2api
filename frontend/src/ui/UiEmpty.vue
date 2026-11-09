<template>
  <div class="ui-empty">
    <div class="ui-empty__glyph">
      <slot name="icon">
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="9" y="13" width="30" height="22" rx="5" stroke="currentColor" stroke-width="1.6" opacity=".55" />
          <path d="M15 24h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".32" />
          <circle cx="24" cy="13" r="3.2" stroke="currentColor" stroke-width="1.6" opacity=".7" />
        </svg>
      </slot>
    </div>
    <p class="ui-empty__title">{{ title }}</p>
    <p v-if="description" class="ui-empty__desc">{{ description }}</p>
    <div v-if="$slots.action" class="ui-empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  { title: '暂无数据', description: undefined }
)
</script>

<style scoped>
.ui-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ui-s-2);
  padding: var(--ui-s-12) var(--ui-s-6);
  text-align: center;
  font-family: var(--ui-font);
}

.ui-empty__glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 62px;
  margin-bottom: var(--ui-s-2);
  border-radius: var(--ui-r-xl);
  color: var(--ui-text-muted);
  background-color: rgb(var(--ui-glass-soft-rgb) / calc(var(--ui-glass-soft-alpha) + 0.05));
  box-shadow:
    inset 0 1px 1px var(--ui-edge-inner),
    0 0 0 1px var(--ui-line);
}

.ui-empty__glyph :deep(svg) {
  width: 32px;
  height: 32px;
}

.ui-empty__title {
  margin: 0;
  font-size: var(--ui-fs-md);
  font-weight: 600;
  color: var(--ui-text-soft);
}

.ui-empty__desc {
  margin: 0;
  max-width: 42ch;
  font-size: var(--ui-fs-xs);
  line-height: 1.55;
  color: var(--ui-text-faint);
}

.ui-empty__action {
  margin-top: var(--ui-s-3);
}
</style>
