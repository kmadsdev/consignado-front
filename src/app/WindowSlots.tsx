import Box from '@cloudscape-design/components/box'
import StatusIndicator from '@cloudscape-design/components/status-indicator'
import type { Me } from '../api/types'
import { useNow } from './common'
import { clock } from './format'
import { T } from './strings'

/** The access windows of one account: used, active (with the countdown), free. */
export function WindowSlots({ me, activeExpiresAt, activeStarting }: { me: Me; activeExpiresAt?: string; activeStarting?: boolean }) {
  const now = useNow(1000)
  const total = Math.min(Math.max(me.windowsMax, 3), 8)
  const used = Math.min(me.windowsUsed, total)
  return (
    <div className="window-slots">
      {Array.from({ length: total }, (_, i) => {
        const active = Boolean(me.activeSessionId) && i === used - 1
        const state = active ? 'active' : i < used ? 'used' : 'free'
        return (
          <div key={i} className="window-slot" data-state={state}>
            <Box variant="awsui-key-label">{T.slots.window(i + 1)}</Box>
            {state === 'used' && <StatusIndicator type="stopped">{T.slots.used}</StatusIndicator>}
            {state === 'free' && <StatusIndicator type="pending">{T.slots.free}</StatusIndicator>}
            {state === 'active' && (
              <>
                <StatusIndicator type={activeStarting ? 'in-progress' : 'success'}>{activeStarting ? T.slots.starting : T.slots.active}</StatusIndicator>
                {activeExpiresAt && !activeStarting && (
                  <Box fontSize="heading-m" fontWeight="bold"><span className="mono">{clock(new Date(activeExpiresAt).getTime() - now)}</span></Box>
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
