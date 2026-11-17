import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Header from '@cloudscape-design/components/header'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import Link from '@cloudscape-design/components/link'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Table from '@cloudscape-design/components/table'
import TextContent from '@cloudscape-design/components/text-content'
import { useEffect, useState } from 'react'
import { ArchitectureDiagram, useDemoTimeline } from '../diagram'
import { ContactForm, type ContactFormProps } from './ContactForm'
import { NavRoot, PageFooter, Prose, useFollow } from './nav'
import { ROUTES, landing as t, type Fact } from './strings'

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

function PageHeader() {
  const follow = useFollow()
  return (
    <SpaceBetween size="m">
      <Header variant="h1" description={t.header.tagline}>
        {t.header.title}
      </Header>
      <Prose>
        <Box variant="p">{t.header.about}</Box>
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
      <SpaceBetween size="xs" direction="horizontal">
        <Button variant="primary" href={ROUTES.simulate} onFollow={follow}>
          {t.header.primaryAction}
        </Button>
        <Button href={ROUTES.aks} onFollow={follow}>
          {t.header.secondaryAction}
        </Button>
      </SpaceBetween>
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
        <Box fontSize="body-s">
          <Box variant="strong" fontSize="body-s">
            {t.hosts.tradeOffLabel}.
          </Box>{' '}
          {host.tradeOff}
        </Box>
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
    <Container
      fitHeight
      header={
        <Header variant="h2" description={t.path.description}>
          {t.path.title}
        </Header>
      }
      footer={
        <Box fontSize="body-s" color="text-body-secondary">
          <Box variant="strong" fontSize="body-s" color="inherit">
            {t.path.pageLoadLabel}.
          </Box>{' '}
          {t.path.pageLoad}
        </Box>
      }
    >
      <TextContent>
        <ol>
          {t.path.steps.map((step) => (
            <li key={step.service}>
              <strong>{step.service}</strong> {step.text}
            </li>
          ))}
        </ol>
      </TextContent>
    </Container>
  )
}

function SecuritySection() {
  return (
    <Container
      fitHeight
      header={
        <Header variant="h2" description={t.security.description}>
          {t.security.title}
        </Header>
      }
    >
      <TextContent>
        <ul>
          {t.security.items.map((item) => (
            <li key={item.lead}>
              <strong>{item.lead}</strong> {item.text}
            </li>
          ))}
        </ul>
      </TextContent>
    </Container>
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
    if (window.location.hash === '#contact') document.getElementById('contact')?.scrollIntoView()
  }, [])

  return (
    <NavRoot>
      <ContentLayout defaultPadding maxContentWidth={1280} header={<PageHeader />}>
        <SpaceBetween size="xl">
          <DiagramSection />
          <HostsSection />
          <AccessSection />
          <ColumnLayout columns={2}>
            <PathSection />
            <SecuritySection />
          </ColumnLayout>
          <StackSection />
          <div id="contact">
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
