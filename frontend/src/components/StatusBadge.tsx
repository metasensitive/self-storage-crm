import type {
  ContainerStatus,
  LocationStatus,
  RentStatus,
  Role,
  UnitStatus,
} from '@/api/types';

const UNIT_LABELS: Record<UnitStatus, string> = {
  free: 'Свободна',
  reserved: 'Резерв',
  rented: 'Арендована',
  blocked: 'Блок.',
};

const CONTAINER_LABELS: Record<ContainerStatus, string> = {
  active: 'Активен',
  inactive: 'Неактивен',
  maintenance: 'Обслуж.',
};

const RENT_LABELS: Record<RentStatus, string> = {
  active: 'Активна',
  finished: 'Завершена',
  cancelled: 'Отменена',
};

const LOCATION_LABELS: Record<LocationStatus, string> = {
  active: 'Активна',
  inactive: 'Неактивна',
};

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
};

export type StatusBadgeProps =
  | { kind: 'unit'; status: UnitStatus }
  | { kind: 'container'; status: ContainerStatus }
  | { kind: 'rent'; status: RentStatus }
  | { kind: 'location'; status: LocationStatus }
  | { kind: 'role'; status: Role };

export function StatusBadge(props: StatusBadgeProps) {
  let label: string;
  let cls: string;

  switch (props.kind) {
    case 'unit':
      label = UNIT_LABELS[props.status];
      cls = `badge ${props.status}`;
      break;
    case 'container':
      label = CONTAINER_LABELS[props.status];
      cls = `badge ${props.status}`;
      break;
    case 'rent':
      label = RENT_LABELS[props.status];
      cls = `badge ${props.status}`;
      break;
    case 'location':
      label = LOCATION_LABELS[props.status];
      cls = `badge ${props.status}`;
      break;
    case 'role':
      label = ROLE_LABELS[props.status];
      cls = `badge role-${props.status}`;
      break;
  }

  return (
    <span className={cls}>
      <span className="dot" />
      {label}
    </span>
  );
}
