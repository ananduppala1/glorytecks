// ─────────────────────────────────────────────────────────────────────────────
// Compatibility re-export.
//
// `useContactInfo()` and `whatsappLink()` kept their original import path so
// call sites did not have to change during the migration. The implementation
// moved into the site-data context, where the Settings singleton is supplied by
// the server instead of a client-side React Query fetch.
// ─────────────────────────────────────────────────────────────────────────────
export {
  useContactInfo,
  whatsappLink,
  type ContactInfo,
} from '@/components/site/SiteDataProvider';
