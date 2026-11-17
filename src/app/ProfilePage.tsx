import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Checkbox from '@cloudscape-design/components/checkbox'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import Link from '@cloudscape-design/components/link'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveProfile } from '../api/client'
import { useAuth } from '../auth'
import { T } from './strings'

const LINKEDIN = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]{3,}\/?$/

/** Shown in place of any signed-in page while `me.profileComplete` is false. */
export function ProfilePage() {
  const { me, refresh, signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(me?.name ?? '')
  const [company, setCompany] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [consent, setConsent] = useState(false)
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState('')

  const errors = {
    name: name.trim().length >= 3 ? '' : T.profile.errName,
    company: company.trim().length >= 2 ? '' : T.profile.errCompany,
    linkedin: LINKEDIN.test(linkedin.trim()) ? '' : T.profile.errLinkedin,
    consent: consent ? '' : T.profile.errConsent,
  }
  const valid = !errors.name && !errors.company && !errors.linkedin && !errors.consent

  const submit = async () => {
    setTouched(true)
    if (!valid) return
    setSaving(true); setFailure('')
    try {
      await saveProfile({ name, company, linkedin, consent })
      await refresh()
      navigate('/app')
    } catch (err) {
      setFailure(err instanceof Error ? err.message : T.profile.failed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ContentLayout header={<Header variant="h1" description={T.profile.description}>{T.profile.title}</Header>}>
      <form onSubmit={(e) => { e.preventDefault(); void submit() }} noValidate>
        <Form
          errorText={failure || (touched && !valid ? T.profile.fixErrors : '')}
          actions={
            <SpaceBetween size="xs" direction="horizontal">
              <Button variant="link" formAction="none" onClick={() => { signOut(); navigate('/') }}>{T.profile.signOut}</Button>
              <Button variant="primary" loading={saving}>{T.profile.save}</Button>
            </SpaceBetween>
          }
        >
          <SpaceBetween size="l">
            <Container header={<Header variant="h2" description={T.profile.whoHint}>{T.profile.who}</Header>}>
              <SpaceBetween size="m">
                <FormField label={T.profile.email} description={T.profile.emailHint}>
                  <Input value={me?.email ?? ''} readOnly />
                </FormField>
                <FormField label={T.profile.name} errorText={touched ? errors.name : ''}>
                  <Input value={name} onChange={(e) => setName(e.detail.value)} autoComplete="name" placeholder="Marcos Vidal" />
                </FormField>
                <FormField label={T.profile.company} errorText={touched ? errors.company : ''}>
                  <Input value={company} onChange={(e) => setCompany(e.detail.value)} autoComplete="organization" placeholder="Northwind Talent" />
                </FormField>
                <FormField label={T.profile.linkedin} description={T.profile.linkedinHint} errorText={touched ? errors.linkedin : ''}>
                  <Input value={linkedin} onChange={(e) => setLinkedin(e.detail.value)} type="url" inputMode="url" placeholder="https://www.linkedin.com/in/your-name" />
                </FormField>
              </SpaceBetween>
            </Container>
            <Container header={<Header variant="h2">{T.profile.consentTitle}</Header>}>
              <SpaceBetween size="m">
                <FormField errorText={touched ? errors.consent : ''}>
                  <Checkbox checked={consent} onChange={(e) => setConsent(e.detail.checked)}>
                    {T.profile.consent}{' '}
                    <Link href="/privacy" onFollow={(e) => { e.preventDefault(); navigate('/privacy') }}>{T.profile.privacyLink}</Link>.
                  </Checkbox>
                </FormField>
                <div className="turnstile-box" role="group" aria-label={T.profile.turnstileTitle}>
                  <SpaceBetween size="xxs">
                    <StatusIndicator type="pending">{T.profile.turnstileTitle}</StatusIndicator>
                    <Box color="text-body-secondary" fontSize="body-s">{T.profile.turnstileText}</Box>
                  </SpaceBetween>
                </div>
              </SpaceBetween>
            </Container>
          </SpaceBetween>
        </Form>
      </form>
    </ContentLayout>
  )
}
