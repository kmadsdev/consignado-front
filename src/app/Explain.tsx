// The second layer of a screen: a closed section that explains the system under it, one paragraph per string.
import Box from '@cloudscape-design/components/box'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import SpaceBetween from '@cloudscape-design/components/space-between'

export function Explain({ text, variant = 'footer' }: { text: { title: string; body: readonly string[] }; variant?: 'footer' | 'default' | 'container' }) {
  return (
    <ExpandableSection headerText={text.title} variant={variant}>
      <SpaceBetween size="s">
        {text.body.map((p) => <Box key={p.slice(0, 40)}>{p}</Box>)}
      </SpaceBetween>
    </ExpandableSection>
  )
}
