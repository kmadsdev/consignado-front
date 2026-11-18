import Box from '@cloudscape-design/components/box'
import { localizeDetail } from '../api/details'

/** A frontend text as the main line, and the gateway's own detail under it as a raw value in monospace. */
export function DetailText(props: { main?: string; raw?: string | null; error?: boolean }) {
  const raw = localizeDetail(props.raw)
  if (!props.main && !raw) return <>-</>
  return (
    <div>
      {props.main && <Box fontSize="body-s" color={props.error ? 'text-status-error' : 'inherit'}>{props.main}</Box>}
      {raw && raw !== props.main && <Box fontSize="body-s" color="text-body-secondary"><span className="mono">{raw}</span></Box>}
    </div>
  )
}
