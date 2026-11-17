import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import TextContent from '@cloudscape-design/components/text-content'
import { InternalLink, NavRoot, PageFooter } from './nav'
import { LOCALE } from '../i18n/lang.ts'
import { NOTICE_DATE, common, privacy, terms, type LegalSection } from './strings'

// A calendar date with no time: formatted in UTC, so that the day does not move.
const NOTICE_DATE_TEXT = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${NOTICE_DATE}T00:00:00Z`))

interface LegalPageProps {
  title: string
  description: string
  alert?: { title: string; text: string }
  sections: LegalSection[]
}

function LegalPage({ title, description, alert, sections }: LegalPageProps) {
  return (
    <NavRoot>
      <ContentLayout
        defaultPadding
        maxContentWidth={660}
        header={
          <SpaceBetween size="m">
            <Header variant="h1" description={description}>
              {title}
            </Header>
            <Box color="text-body-secondary" fontSize="body-s">
              {common.lastUpdated}: <Box variant="code" display="inline" fontSize="body-s">{NOTICE_DATE_TEXT}</Box>
            </Box>
            {alert && (
              <Alert type="info" header={alert.title}>
                {alert.text}
              </Alert>
            )}
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          <Container>
              <SpaceBetween size="xl">
                {sections.map((section) => (
                  <section key={section.title}>
                    <SpaceBetween size="xs">
                      <Header variant="h2">{section.title}</Header>
                      <TextContent>
                        {section.paragraphs?.map((text) => (
                          <p key={text}>{text}</p>
                        ))}
                        {section.items && (
                          <ul>
                            {section.items.map((text) => (
                              <li key={text}>{text}</li>
                            ))}
                          </ul>
                        )}
                        {section.after?.map((text) => (
                          <p key={text}>{text}</p>
                        ))}
                      </TextContent>
                      {section.link && <InternalLink href={section.link.href}>{section.link.text}</InternalLink>}
                    </SpaceBetween>
                  </section>
                ))}
              </SpaceBetween>
          </Container>
          <PageFooter showHome />
        </SpaceBetween>
      </ContentLayout>
    </NavRoot>
  )
}

export function PrivacyPage() {
  return (
    <LegalPage
      title={privacy.title}
      description={privacy.description}
      alert={{ title: privacy.alertTitle, text: privacy.alert }}
      sections={privacy.sections}
    />
  )
}

export function TermsPage() {
  return <LegalPage title={terms.title} description={terms.description} sections={terms.sections} />
}
