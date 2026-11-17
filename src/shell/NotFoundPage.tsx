import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import SpaceBetween from '@cloudscape-design/components/space-between'
import { useLocation, useNavigate } from 'react-router-dom'
import { S } from './strings'

export function NotFoundPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (
    <Box padding={{ vertical: 'xxxl', horizontal: 'l' }} textAlign="center">
      <SpaceBetween size="m">
        <Box variant="h1">{S.notFound.title}</Box>
        <Box color="text-body-secondary">
          {S.notFound.text} <span className="mono">{pathname}</span>
        </Box>
        <SpaceBetween size="xs" direction="horizontal" alignItems="center">
          <Button variant="primary" onClick={() => navigate('/')}>{S.notFound.home}</Button>
          <Button onClick={() => navigate('/app')}>{S.notFound.app}</Button>
        </SpaceBetween>
      </SpaceBetween>
    </Box>
  )
}
