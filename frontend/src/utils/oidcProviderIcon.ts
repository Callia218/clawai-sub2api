export function oidcProviderIcon(providerName: string): string | undefined {
  return providerName.trim().toLowerCase().replace(/[.\s_-]/g, '') === 'linuxsb'
    ? '/provider-icons/linux-sb.svg'
    : undefined
}
