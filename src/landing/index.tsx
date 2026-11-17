// CONTRACT (owned by the landing worker): pages outside the signed-in app.
// The pages render page content and the footer line only. The shell gives the
// top navigation and imports the Cloudscape global styles.
export { LandingPage, type LandingPageProps } from './LandingPage'
export { PrivacyPage, TermsPage } from './LegalPage'
export { ContactForm, type ContactFormProps, type ContactInput, type ContactKind } from './ContactForm'
