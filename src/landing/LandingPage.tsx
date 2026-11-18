import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Header from '@cloudscape-design/components/header'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Link from '@cloudscape-design/components/link'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table from '@cloudscape-design/components/table'
import TextContent from '@cloudscape-design/components/text-content'
import { useEffect, useState, type ReactNode } from 'react'
import { ArchitectureDiagram, useDemoTimeline } from '../diagram'
import { ContactForm, type ContactFormProps } from './ContactForm'
import { NavRoot, PageFooter, Prose, useFollow } from './nav'
import { ROUTES, landing as t, type Fact, type Link as DocLink, type Topic } from './strings'

const NARROW = '(max-width: 688px)'

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches)
  useEffect(() => {
    const query = window.matchMedia(NARROW)
    const update = () => setNarrow(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return narrow
}

function facts(list: Fact[]) {
  return list.map((fact) => ({
    label: fact.label,
    value: fact.mono ? <Box variant="code">{fact.value}</Box> : fact.value,
  }))
}

function Links({ links }: { links: DocLink[] }) {
  return (
    <SpaceBetween size="m" direction="horizontal">
      {links.map((link) => (
        <Link key={link.href} href={link.href} external>
          {link.text}
        </Link>
      ))}
    </SpaceBetween>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <Prose>
      <TextContent>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </TextContent>
    </Prose>
  )
}

/** The second layer: one expandable block per topic, with its documents and code. */
function Topics({ topics }: { topics: Topic[] }) {
  return (
    <div>
      {topics.map((topic) => (
        <ExpandableSection key={topic.title} variant="footer" headerText={topic.title}>
          <Prose>
            <SpaceBetween size="s">
              {topic.paragraphs.slice(0, 1).map((text) => (
                <Box variant="p" key={text}>{text}</Box>
              ))}
              {topic.items && <List items={topic.items} />}
              {topic.paragraphs.slice(1).map((text) => (
                <Box variant="p" key={text}>{text}</Box>
              ))}
              <Links links={topic.links} />
            </SpaceBetween>
          </Prose>
        </ExpandableSection>
      ))}
    </div>
  )
}

/** A section with a short first layer and the detail in expandable topics. */
function Section({ title, description, children, topics, links }: { title: string; description: string; children?: ReactNode; topics?: Topic[]; links?: DocLink[] }) {
  return (
    <Container
      fitHeight
      header={
        <Header variant="h2" description={description}>
          {title}
        </Header>
      }
      footer={topics ? <Topics topics={topics} /> : links ? <Links links={links} /> : undefined}
    >
      {children}
    </Container>
  )
}

const CONTACT_ID = 'contact'

/** Scrolls to the contact form and moves keyboard focus there. */
function focusContact() {
  const section = document.getElementById(CONTACT_ID)
  if (!section) return
  section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  section.focus({ preventScroll: true })
}

function goToContact(event: { preventDefault: () => void }) {
  event.preventDefault()
  window.history.replaceState(window.history.state, '', `#${CONTACT_ID}`)
  focusContact()
}

function PageHeader() {
  const follow = useFollow()
  return (
    <SpaceBetween size="m">
      <Header variant="h1" description={<span style={{ display: 'block', maxWidth: '72ch' }}>{t.header.tagline}</span>}>
        {t.header.title}
      </Header>
      <Prose>
        <Box variant="p">
          {t.header.aboutBefore}
          <Link href={t.header.author.href} external>
            {t.header.author.text}
          </Link>
          {t.header.aboutAfter}
        </Box>
      </Prose>
      <SpaceBetween size="xs" direction="horizontal" alignItems="center">
        <Box color="text-body-secondary">{t.header.sourceLabel}:</Box>
        {t.header.repos.map((repo) => (
          <Link key={repo.name} href={repo.href} external>
            <Box variant="code" color="inherit">
              {repo.name}
            </Box>
          </Link>
        ))}
      </SpaceBetween>
      <Prose>
        <Box variant="p">
          {t.header.access.account} {t.header.access.contactBefore}
          <Link href={`#${CONTACT_ID}`} onFollow={goToContact}>
            {t.header.access.contactLink}
          </Link>
          . {t.header.access.guestBefore}
          <Link href={t.header.access.guestLink.href} external>
            {t.header.access.guestLink.text}
          </Link>
          .
        </Box>
      </Prose>
      <SpaceBetween size="xs" direction="horizontal">
        <Button variant="primary" href={ROUTES.simulate} onFollow={follow}>
          {t.header.primaryAction}
        </Button>
        <Button href={ROUTES.aks} onFollow={follow}>
          {t.header.secondaryAction}
        </Button>
      </SpaceBetween>
      <Prose>
        <Box color="text-body-secondary" fontSize="body-s">
          {t.header.signInNote}
        </Box>
      </Prose>
      <Box padding={{ bottom: 'xs' }} />
    </SpaceBetween>
  )
}

function DiagramSection() {
  const { events } = useDemoTimeline('functions', { loop: true, autoStart: true })
  return (
    <Container
      header={
        <Header variant="h2" description={t.diagram.description} info={<Badge color="blue">{t.diagram.badge}</Badge>}>
          {t.diagram.title}
        </Header>
      }
      footer={
        <Box color="text-body-secondary" fontSize="body-s">
          {t.diagram.caption}
        </Box>
      }
    >
      <ArchitectureDiagram view="overview" events={events} height={460} />
    </Container>
  )
}

function HostCard({ host }: { host: typeof t.hosts.functions }) {
  const narrow = useNarrow()
  return (
    <Container
      fitHeight
      header={
        <Header variant="h3" description={host.subtitle}>
          {host.title}
        </Header>
      }
      footer={
        <Box fontSize="body-s">{host.tradeOff}</Box>
      }
    >
      <KeyValuePairs columns={narrow ? 1 : 2} items={facts(host.facts)} />
    </Container>
  )
}

function HostsSection() {
  return (
    <SpaceBetween size="m">
      <Header variant="h2" description={t.hosts.description}>
        {t.hosts.title}
      </Header>
      <ColumnLayout columns={2}>
        <HostCard host={t.hosts.functions} />
        <HostCard host={t.hosts.aks} />
      </ColumnLayout>
      <Container>
        <Topics topics={t.hosts.topics} />
      </Container>
    </SpaceBetween>
  )
}

function AccessSection() {
  const narrow = useNarrow()
  const c = t.access.columns
  const header = (
    <Header variant="h2" description={t.access.description}>
      {t.access.title}
    </Header>
  )
  if (narrow) {
    return (
      <Container header={header}>
        <SpaceBetween size="l">
          {t.access.rows.map((row) => (
            <SpaceBetween size="xs" key={row.level}>
              <Box variant="h3">{row.level}</Box>
              <KeyValuePairs
                columns={1}
                items={[
                  { label: c.serverless, value: row.serverless },
                  { label: c.kubernetes, value: row.kubernetes },
                  { label: c.data, value: row.data },
                  { label: c.limits, value: row.limits },
                ]}
              />
            </SpaceBetween>
          ))}
        </SpaceBetween>
      </Container>
    )
  }
  return (
    <Table
      header={header}
      wrapLines
      items={t.access.rows}
      trackBy="level"
      columnDefinitions={[
        { id: 'level', header: c.level, isRowHeader: true, width: 150, cell: (row) => <Box variant="strong">{row.level}</Box> },
        { id: 'serverless', header: c.serverless, cell: (row) => row.serverless },
        { id: 'kubernetes', header: c.kubernetes, cell: (row) => row.kubernetes },
        { id: 'data', header: c.data, cell: (row) => row.data },
        { id: 'limits', header: c.limits, cell: (row) => row.limits },
      ]}
    />
  )
}

function PathSection() {
  return (
    <Section title={t.path.title} description={t.path.description} topics={t.path.topics}>
      <SpaceBetween size="s">
        <TextContent>
          <ol>
            {t.path.steps.map((step) => (
              <li key={step.service}>
                <strong>{step.service}</strong> {step.text}
              </li>
            ))}
          </ol>
        </TextContent>
        <Box fontSize="body-s" color="text-body-secondary">
          {t.path.pageLoad}
        </Box>
      </SpaceBetween>
    </Section>
  )
}

function StackSection() {
  const narrow = useNarrow()
  return (
    <Container header={<Header variant="h2">{t.stack.title}</Header>}>
      <KeyValuePairs
        columns={narrow ? 1 : 3}
        items={t.stack.groups.map((group) => ({ label: group.label, value: group.items.join(', ') }))}
      />
    </Container>
  )
}

export interface LandingPageProps {
  /** Sends a contact message. With no prop, the form only simulates the send. */
  onContactSubmit?: ContactFormProps['onSubmit']
}

export function LandingPage({ onContactSubmit }: LandingPageProps) {
  useEffect(() => {
    if (window.location.hash === `#${CONTACT_ID}`) focusContact()
  }, [])

  return (
    <NavRoot>
      <ContentLayout defaultPadding maxContentWidth={1280} header={<PageHeader />}>
        <SpaceBetween size="xl">
          <DiagramSection />
          <Section title={t.product.title} description={t.product.description} topics={t.product.topics}>
            <Prose>
              <Box variant="p">{t.product.intro}</Box>
            </Prose>
          </Section>
          <HostsSection />
          <AccessSection />
          <ColumnLayout columns={2}>
            <PathSection />
            <Section title={t.identity.title} description={t.identity.description} topics={t.identity.topics}>
              <List items={t.identity.items} />
            </Section>
          </ColumnLayout>
          <ColumnLayout columns={2}>
            <Section title={t.data.title} description={t.data.description}>
              <List items={t.data.items} />
            </Section>
            <Section title={t.delivery.title} description={t.delivery.description} links={t.delivery.links}>
              <List items={t.delivery.items} />
            </Section>
          </ColumnLayout>
          <Section title={t.decisions.title} description={t.decisions.description}>
            <Topics topics={t.decisions.topics} />
          </Section>
          <Section title={t.limits.title} description={t.limits.description} links={t.limits.links}>
            <List items={t.limits.items} />
          </Section>
          <StackSection />
          <div id={CONTACT_ID} tabIndex={-1} style={{ outline: 'none', scrollMarginTop: 16 }}>
            <Container
              header={
                <Header variant="h2" description={t.contact.description}>
                  {t.contact.title}
                </Header>
              }
            >
              <ContactForm onSubmit={onContactSubmit} />
            </Container>
          </div>
          <PageFooter />
        </SpaceBetween>
      </ContentLayout>
    </NavRoot>
  )
}
