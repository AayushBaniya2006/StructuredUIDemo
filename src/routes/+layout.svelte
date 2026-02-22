<script lang="ts">
  import '../app.css';
  import { t } from '$lib/config/app-config';

  let { children } = $props();
</script>

<svelte:head>
  <title>{t.branding.appTitle}</title>
  <meta name="description" content="AI-powered construction blueprint quality assurance by Structured AI" />
  <meta property="og:title" content={t.branding.appTitle} />
  <meta property="og:description" content="Automated QA/QC for construction blueprints using AI" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/logo.svg" />
</svelte:head>

{@render children()}
