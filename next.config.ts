import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['ioredis', 'pdf-parse'],
  experimental: {
    staleTimes: {
      dynamic: 120,
    },
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  async redirects() {
    return [
      // CRM index
      { source: '/org/:slug/crm', destination: '/org/:slug/crm/deals', permanent: false },

      // Home / Dashboard → CRM início
      { source: '/org/:slug/home', destination: '/org/:slug/crm/home', permanent: true },
      { source: '/org/:slug/dashboard', destination: '/org/:slug/crm/home', permanent: true },
      { source: '/org/:slug/dashboard/v1', destination: '/org/:slug/crm/home', permanent: true },
      { source: '/org/:slug/dashboard/v2', destination: '/org/:slug/crm/home', permanent: true },

      // Contacts fallback → CRM
      { source: '/org/:slug/contacts', destination: '/org/:slug/crm/contacts', permanent: true },
      {
        source: '/org/:slug/contacts/import',
        destination: '/org/:slug/crm/contacts/import',
        permanent: true,
      },
      {
        source: '/org/:slug/contacts/:id',
        destination: '/org/:slug/crm/contacts/:id',
        permanent: true,
      },

      // Notifications fallback → CRM
      {
        source: '/org/:slug/notifications',
        destination: '/org/:slug/crm/notifications',
        permanent: true,
      },
      {
        source: '/org/:slug/notifications/preferences',
        destination: '/org/:slug/crm/notifications/preferences',
        permanent: true,
      },

      // AI Agent → Agents
      {
        source: '/org/:slug/ai-agent',
        destination: '/org/:slug/agents/ai-agent',
        permanent: true,
      },
      {
        source: '/org/:slug/ai-agent/:path*',
        destination: '/org/:slug/agents/ai-agent/:path*',
        permanent: true,
      },

      // Professional Portal → CRM
      {
        source: '/org/:slug/professional-portal',
        destination: '/org/:slug/crm/professional-portal',
        permanent: true,
      },
      {
        source: '/org/:slug/professional-portal/:path*',
        destination: '/org/:slug/crm/professional-portal/:path*',
        permanent: true,
      },

      // Reports → CRM
      {
        source: '/org/:slug/reports',
        destination: '/org/:slug/crm/reports/overview',
        permanent: true,
      },
      {
        source: '/org/:slug/reports/overview',
        destination: '/org/:slug/crm/reports/overview',
        permanent: true,
      },
      {
        source: '/org/:slug/reports/pipeline',
        destination: '/org/:slug/crm/reports/pipeline',
        permanent: true,
      },
      {
        source: '/org/:slug/reports/lost-deals',
        destination: '/org/:slug/crm/reports/lost-deals',
        permanent: true,
      },
      {
        source: '/org/:slug/reports/team',
        destination: '/org/:slug/crm/reports/team',
        permanent: true,
      },
      {
        source: '/org/:slug/reports/products',
        destination: '/org/:slug/crm/reports/products',
        permanent: true,
      },

      // Reports → Inbox / Agents
      {
        source: '/org/:slug/reports/inbox',
        destination: '/org/:slug/inbox/reports',
        permanent: true,
      },
      {
        source: '/org/:slug/reports/ai',
        destination: '/org/:slug/agents/reports',
        permanent: true,
      },

      // Settings → CRM Settings
      {
        source: '/org/:slug/settings/pipelines',
        destination: '/org/:slug/crm/settings/pipelines',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/pipelines/:path*',
        destination: '/org/:slug/crm/settings/pipelines/:path*',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/loss-reasons',
        destination: '/org/:slug/crm/settings/loss-reasons',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/catalog',
        destination: '/org/:slug/crm/settings/catalog',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/catalog/:path*',
        destination: '/org/:slug/crm/settings/catalog/:path*',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/custom-fields',
        destination: '/org/:slug/crm/settings/custom-fields',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/custom-fields/:path*',
        destination: '/org/:slug/crm/settings/custom-fields/:path*',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/goals',
        destination: '/org/:slug/crm/settings/goals',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/professionals',
        destination: '/org/:slug/crm/settings/professionals',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/professionals/:path*',
        destination: '/org/:slug/crm/settings/professionals/:path*',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/scheduling',
        destination: '/org/:slug/crm/settings/scheduling',
        permanent: true,
      },

      // Settings → Inbox Settings
      {
        source: '/org/:slug/settings/inboxes',
        destination: '/org/:slug/inbox/settings/inboxes',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/inboxes/:path*',
        destination: '/org/:slug/inbox/settings/inboxes/:path*',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/labels',
        destination: '/org/:slug/inbox/settings/labels',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/automations',
        destination: '/org/:slug/crm/settings/automations',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/automations/:path*',
        destination: '/org/:slug/crm/settings/automations/:path*',
        permanent: true,
      },
      {
        source: '/org/:slug/settings/capture-forms',
        destination: '/org/:slug/inbox/settings/capture-forms',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
