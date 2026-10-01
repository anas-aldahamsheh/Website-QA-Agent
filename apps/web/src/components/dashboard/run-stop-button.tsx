import { Square } from 'lucide-react';
import { cancelRunAction } from '@/app/actions';

type RunStopButtonProps = {
  runId: string;
  status: string;
  size?: 'sm' | 'md';
};

const stoppableStatuses = ['QUEUED', 'RUNNING', 'PROVISIONING', 'DISCOVERING', 'PLANNING', 'EXECUTING', 'ANALYZING'];

export function RunStopButton({ runId, status, size = 'md' }: RunStopButtonProps) {
  if (!stoppableStatuses.includes(status)) {
    return null;
  }

  const cancelSelectedRunAction = cancelRunAction.bind(null, runId);
  const className =
    size === 'sm'
      ? 'inline-flex items-center gap-1 rounded-md border border-destructive px-3 py-1.5 text-xs font-semibold text-destructive'
      : 'inline-flex h-10 items-center gap-2 rounded-md border border-destructive px-4 text-sm font-semibold text-destructive';

  return (
    <form action={cancelSelectedRunAction}>
      <button className={className}>
        <Square className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        Stop
      </button>
    </form>
  );
}
