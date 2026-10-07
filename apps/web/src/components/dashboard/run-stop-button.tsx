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
  const className = size === 'sm' ? 'btn-danger h-7 px-2.5 text-xs' : 'btn-danger h-10 px-4';

  return (
    <form action={cancelSelectedRunAction}>
      <button className={className}>
        <Square className={size === 'sm' ? 'h-3 w-3 fill-current' : 'h-4 w-4 fill-current'} />
        Stop
      </button>
    </form>
  );
}
