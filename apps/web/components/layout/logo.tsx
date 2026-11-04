import { RestroFlowLogo, type RestroFlowLogoProps } from "./restroflow-logo";

export { RestroFlowLogo, RestroFlowIcon } from "./restroflow-logo";

export function Logo({
  className,
  size = 32,
  showText = false,
  showBadge = false,
  badgeText = "POS",
}: RestroFlowLogoProps) {
  return (
    <RestroFlowLogo
      size={size}
      showText={showText}
      showBadge={showBadge}
      badgeText={badgeText}
      className={className}
    />
  );
}
