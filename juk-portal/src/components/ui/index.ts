// Buttons & forms
export { Button, buttonClasses, type ButtonVariant, type ButtonSize } from "./button";
export { LinkButton } from "./link-button";
export {
  Field,
  Label,
  Input,
  Textarea,
  Select,
  Checkbox,
  HelpText,
  ErrorText,
} from "./field";
export { DateInput } from "./date-input";

// Badges & status
export {
  Badge,
  StepBadge,
  TripBadge,
  MoraBadge,
  type StepState,
  type TripState,
} from "./badge";

// Cards & alerts
export { StatCard, Alert } from "./stat-card";
export { TripCard } from "./trip-card";

// Step tracking
export { StepStrip, StepLegend, STEP_LABELS, type Step } from "./step-strip";

// Tables
export {
  TableWrap,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  StudentCell,
  CodeCell,
  DateCell,
  MoneyCell,
} from "./data-table";

// App Shell
export {
  AppShell,
  SidebarLogo,
  SidebarNavSection,
  SidebarNavItem,
  SidebarUserChip,
  Breadcrumb,
  TopbarSearch,
} from "./app-shell";

// Page header
export { PageHeader } from "./page-header";

// Pagination
export { Pagination } from "./pagination";

// Overlays
export {
  ConfirmProvider,
  useConfirm,
  type ConfirmOptions,
  type ConfirmResultado,
} from "./confirm-dialog";

// Loading
export { GlobeLoader } from "./globe-loader";
export {
  Skeleton,
  PageHeaderSkeleton,
  ListPageSkeleton,
  FormPageSkeleton,
  FichaAlumnoSkeleton,
  ViajeDetalleSkeleton,
  DashboardSkeleton,
} from "./skeleton";
