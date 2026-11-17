import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import Checkbox from '@cloudscape-design/components/checkbox'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Textarea from '@cloudscape-design/components/textarea'
import { borderRadiusContainer, colorBorderDividerDefault } from '@cloudscape-design/design-tokens'
import { useState, type FormEvent } from 'react'
import { sendContact } from '../api/client'
import type { ContactRequest } from '../api/types'
import { MOCK } from '../config'
import { Turnstile, turnstileOn } from '../shell/Turnstile'
import { InternalLink } from './nav'
import { ROUTES, contactForm as t } from './strings'

export type ContactKind = ContactRequest['kind']

export interface ContactInput {
  name: string
  email: string
  kind: ContactKind
  message: string
  consent: boolean
}

export interface ContactFormProps {
  /** Sends the message. With no prop, the form only simulates the send. */
  onSubmit?: (input: ContactInput) => Promise<void>
  defaultKind?: ContactKind
}

type Errors = Partial<Record<'name' | 'email' | 'message' | 'consent' | 'bot', string>>

const KIND_OPTIONS = (Object.keys(t.kinds) as ContactKind[]).map((value) => ({ value, label: t.kinds[value] }))
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(input: ContactInput): Errors {
  const errors: Errors = {}
  const message = input.message.trim()
  if (!input.name.trim()) errors.name = t.errors.name
  if (!EMAIL.test(input.email.trim())) errors.email = t.errors.email
  if (message.length < 10) errors.message = t.errors.message
  else if (message.length > 2000) errors.message = t.errors.messageLong
  if (!input.consent) errors.consent = t.errors.consent
  return errors
}

export function ContactForm({ onSubmit, defaultKind = 'contact' }: ContactFormProps) {
  const empty: ContactInput = { name: '', email: '', kind: defaultKind, message: '', consent: false }
  const [input, setInput] = useState<ContactInput>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [botToken, setBotToken] = useState('')
  const [failure, setFailure] = useState('')
  // The real build sends the message to the gateway. The mock build only simulates the send.
  const live = Boolean(onSubmit) || !MOCK

  function set<K extends keyof ContactInput>(key: K, value: ContactInput[K]) {
    const next = { ...input, [key]: value }
    setInput(next)
    if (submitted) setErrors(validate(next))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (state === 'sending') return
    setSubmitted(true)
    const found = validate(input)
    if (live && turnstileOn && !botToken) found.bot = t.errors.bot
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setState('sending')
    try {
      const clean = { ...input, name: input.name.trim(), email: input.email.trim(), message: input.message.trim() }
      if (onSubmit) await onSubmit(clean)
      else if (!MOCK) await sendContact({ kind: clean.kind, name: clean.name, email: clean.email, message: clean.message, turnstileToken: botToken })
      else await new Promise((resolve) => setTimeout(resolve, 600))
      setState('sent')
    } catch (err) {
      setFailure(err instanceof Error && !MOCK ? err.message : '')
      setState('failed')
    }
  }

  if (state === 'sent') {
    return (
      <div style={{ maxWidth: 720 }}>
        <Alert
          type="success"
          header={t.successTitle}
          action={
            <Button
              onClick={() => {
                setInput(empty)
                setErrors({})
                setSubmitted(false)
                setState('idle')
              }}
            >
              {t.again}
            </Button>
          }
        >
          {t.successText}
          {!live && ` ${t.successSimulated}`}
        </Alert>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <form onSubmit={submit} noValidate>
        <Form
          errorText={state === 'failed' ? failure || t.errors.send : undefined}
          actions={
            <Button variant="primary" formAction="submit" loading={state === 'sending'} loadingText={t.sending}>
              {t.submit}
            </Button>
          }
        >
          <SpaceBetween size="l">
            <ColumnLayout columns={2}>
              <FormField label={t.name} errorText={errors.name} stretch>
                <Input
                  value={input.name}
                  onChange={({ detail }) => set('name', detail.value)}
                  placeholder={t.namePlaceholder}
                  autoComplete="name"
                  name="name"
                />
              </FormField>
              <FormField label={t.email} constraintText={t.emailConstraint} errorText={errors.email} stretch>
                <Input
                  value={input.email}
                  onChange={({ detail }) => set('email', detail.value)}
                  placeholder={t.emailPlaceholder}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  name="email"
                  spellcheck={false}
                />
              </FormField>
            </ColumnLayout>
            <FormField label={t.kind} stretch>
              <Select
                selectedOption={KIND_OPTIONS.find((option) => option.value === input.kind) ?? KIND_OPTIONS[0]}
                options={KIND_OPTIONS}
                onChange={({ detail }) => set('kind', detail.selectedOption.value as ContactKind)}
              />
            </FormField>
            <FormField label={t.message} constraintText={t.messageConstraint} errorText={errors.message} stretch>
              <Textarea
                value={input.message}
                onChange={({ detail }) => set('message', detail.value)}
                placeholder={t.messagePlaceholder}
                rows={5}
                name="message"
              />
            </FormField>
            <FormField label={t.antiBotLabel} errorText={errors.bot} stretch>
              <Turnstile
                onToken={setBotToken}
                failedText={t.antiBotFailed}
                placeholder={
                  <div
                    style={{
                      border: `1px dashed ${colorBorderDividerDefault}`,
                      borderRadius: borderRadiusContainer,
                      minHeight: 65,
                      maxWidth: 300,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Box color="text-status-inactive" fontSize="body-s">
                      {t.antiBotPlaceholder}
                    </Box>
                  </div>
                }
              />
            </FormField>
            <FormField errorText={errors.consent} stretch>
              <Checkbox checked={input.consent} onChange={({ detail }) => set('consent', detail.checked)}>
                {t.consentBefore}
                <InternalLink href={ROUTES.privacy}>{t.consentLink}</InternalLink>
                {t.consentAfter}
              </Checkbox>
            </FormField>
          </SpaceBetween>
        </Form>
      </form>
    </div>
  )
}
