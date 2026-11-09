/**
 * 鹈鹕测智 API
 *
 * 同一个固定提示词，让每个分组的模型各画一只骑自行车的鹈鹕，
 * 把模型返回的 HTML 存下来用沙箱 iframe 渲染，直观对比不同模型的能力。
 */

import { apiClient } from './client'

export interface PelicanResult {
  id: number
  group_id: number
  model: string
  reasoning_effort: string
  status: 'ok' | 'error'
  html: string
  error: string
  duration_ms: number
  input_tokens: number
  output_tokens: number
  created_at: string
}

export interface PelicanGroupView {
  group_id: number
  group_name: string
  platform: string
  model: string
  api_key_id: number
  api_key_name: string
  api_key_masked: string
  total: number
  last_created_at: string | null
  results: PelicanResult[]
}

export interface PelicanOverview {
  groups: PelicanGroupView[]
  prompt: string
}

export interface PelicanGroupConfig {
  group_id: number
  api_key_id: number
  model: string
  reasoning_effort?: string
}

export interface PelicanConfig {
  enabled: boolean
  interval_minutes: number
  max_tokens: number
  keep_per_group: number
  retention_days: number
  groups: PelicanGroupConfig[]
}

export interface PelicanOptionGroup {
  id: number
  name: string
  platform: string
  has_accounts: boolean
  key_count: number
}

export interface PelicanOptionKey {
  id: number
  name: string
  group_id: number
  masked: string
}

export interface PelicanOptions {
  groups: PelicanOptionGroup[]
  keys: PelicanOptionKey[]
}

export interface PelicanRunItem {
  group_id: number
  model: string
  status: string
  error?: string
  duration_ms: number
}

export interface PelicanRunReport {
  started_at: string
  finished_at: string
  items: PelicanRunItem[]
}

export interface PelicanStatus {
  running: boolean
  last_run_at: string | null
  last_report: PelicanRunReport | null
  error?: string
}

export async function getOverview(perGroup = 6): Promise<PelicanOverview> {
  const { data } = await apiClient.get<PelicanOverview>('/pelican/overview', {
    params: { per_group: perGroup },
  })
  return data
}

export async function getStatus(): Promise<PelicanStatus> {
  const { data } = await apiClient.get<PelicanStatus>('/pelican/status')
  return data
}

export async function getConfig(): Promise<PelicanConfig> {
  const { data } = await apiClient.get<PelicanConfig>('/pelican/config')
  return data
}

export async function saveConfig(cfg: PelicanConfig): Promise<PelicanConfig> {
  const { data } = await apiClient.put<PelicanConfig>('/pelican/config', cfg)
  return data
}

export async function getOptions(): Promise<PelicanOptions> {
  const { data } = await apiClient.get<PelicanOptions>('/pelican/options')
  return data
}

export async function triggerRun(): Promise<void> {
  await apiClient.post('/pelican/run')
}
