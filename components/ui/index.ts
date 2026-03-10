/**
 * UI Components
 * 
 * Extension-specific UI components.
 * Base primitives are imported from @dracon/wxt-shared/ui.
 */

// Re-export shared UI primitives
export {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Badge,
  Spinner,
  Alert,
  FloatingPanel,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
  type CardProps,
  type InputProps,
  type BadgeProps,
  type BadgeVariant,
  type SpinnerProps,
  type SpinnerSize,
  type AlertProps,
  type AlertVariant,
  type FloatingPanelProps,
  type PanelPosition,
} from "@dracon/wxt-shared/ui";

// Extension-specific components (keep local)
export { default as AuthGuard } from "./AuthGuard";
export { default as ErrorBoundary } from "./ErrorBoundary";
export { default as Toast } from "./Toast";
