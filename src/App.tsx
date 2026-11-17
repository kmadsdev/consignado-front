import { I18nProvider } from '@cloudscape-design/components/i18n'
import enMessages from '@cloudscape-design/components/i18n/messages/all.en'
import ptBRMessages from '@cloudscape-design/components/i18n/messages/all.pt-BR'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AdminPage } from './admin/AdminPage'
import { AksPage } from './app/AksPage'
import { LiveWindowPage } from './app/LiveWindowPage'
import { OperationsPage } from './app/OperationsPage'
import { OverviewPage } from './app/OverviewPage'
import { SimulatePage } from './app/SimulatePage'
import { AuthProvider } from './auth'
import { LANG, LangProvider } from './i18n/index.tsx'
import { LandingPage, PrivacyPage, TermsPage } from './landing'
import { AppShell, PublicShell } from './shell/Layouts'
import { NotFoundPage } from './shell/NotFoundPage'
import { ShellProvider } from './shell/ShellProvider'

export default function App() {
  return (
    <I18nProvider locale={LANG} messages={[enMessages, ptBRMessages]}>
      <LangProvider>
      <BrowserRouter>
        <AuthProvider>
          <ShellProvider>
            <Routes>
              <Route element={<PublicShell />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              <Route element={<AppShell />}>
                <Route path="/app" element={<OverviewPage />} />
                <Route path="/app/operations" element={<OperationsPage />} />
                <Route path="/app/aks" element={<AksPage />} />
                <Route path="/app/simulate" element={<SimulatePage />} />
                <Route path="/app/:sessionId/aks" element={<LiveWindowPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Routes>
          </ShellProvider>
        </AuthProvider>
      </BrowserRouter>
      </LangProvider>
    </I18nProvider>
  )
}
