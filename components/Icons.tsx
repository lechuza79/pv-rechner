interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function IconLock({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M11.333 7.333V5.333a3.333 3.333 0 0 0-6.666 0v2m1.2 6.667h4.266c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874c.218-.428.218-.988.218-2.108v-.267c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874c-.428-.218-.988-.218-2.108-.218H5.867c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C2.667 9.187 2.667 9.747 2.667 10.867v.266c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874c.428.218.988.218 2.108.218Z" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLink({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M7.37 9.86a3.75 3.75 0 0 0 5.58.72l2.5-2.5a3.336 3.336 0 0 0-4.69-4.75L9.53 4.56m1.1 3.63a3.75 3.75 0 0 0-5.58-.72l-2.5 2.5a3.336 3.336 0 0 0 4.69 4.75l1.43-1.43" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconShare({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M15.576 8.267c.204-.175.305-.262.343-.366a.5.5 0 0 0 0-.282c-.038-.104-.14-.19-.343-.366L8.517 1.204c-.35-.3-.525-.45-.674-.454a.5.5 0 0 0-.333.153c-.094.115-.094.346-.094.807v3.579a8.36 8.36 0 0 0-6.666 7.93v.51a8.74 8.74 0 0 0 6.666-3.497v3.492c0 .461 0 .692.094.807a.5.5 0 0 0 .333.153c.149-.003.324-.153.674-.454l7.059-6.05Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWhatsApp({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.019-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347ZM12.05 21.785h-.008a9.65 9.65 0 0 1-4.922-1.35l-.353-.21-3.662.96.977-3.57-.23-.367A9.643 9.643 0 0 1 2.39 12.06c.002-5.334 4.342-9.674 9.68-9.674a9.62 9.62 0 0 1 6.84 2.834 9.62 9.62 0 0 1 2.83 6.842c-.003 5.334-4.343 9.674-9.68 9.674l-.01.05ZM20.52 3.449C18.247 1.226 15.236 0 12.05 0 5.463 0 .104 5.334.102 11.893a11.864 11.864 0 0 0 1.588 5.945L0 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.585 0 11.946-5.336 11.949-11.896a11.836 11.836 0 0 0-3.48-8.449h.058Z" fill={color} />
    </svg>
  );
}

export function IconArrowRight({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M3.333 8h9.334m0 0L8 3.333M12.667 8 8 12.667" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRefresh({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M16.458 6.458s-1.67-2.276-3.028-3.635A7.5 7.5 0 1 0 15.332 10.208M16.458 6.458V1.458M16.458 6.458h-5" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronDown({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M1 1.5l5 5 5-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheck({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M13.333 4 6 11.333 2.667 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPlus({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M8 3.333v9.334M3.333 8h9.334" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHelpCircle({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M6.06 6a2 2 0 0 1 3.887.667c0 1.333-2 2-2 2M8 11.333h.007M14.667 8A6.667 6.667 0 1 1 1.333 8a6.667 6.667 0 0 1 13.334 0Z" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSparkle({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M8 1v3.5M8 11.5V15M15 8h-3.5M4.5 8H1M12.95 3.05l-2.475 2.475M5.525 10.475 3.05 12.95M3.05 3.05l2.475 2.475M10.475 10.475l2.475 2.475" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUser({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M13.333 14v-1.333A2.667 2.667 0 0 0 10.667 10H5.333a2.667 2.667 0 0 0-2.666 2.667V14M8 7.333A2.667 2.667 0 1 0 8 2a2.667 2.667 0 0 0 0 5.333Z" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSun({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M8 1.333V2m0 12v.667M3.287 3.287l.473.473m8.48 8.48.473.473M1.333 8H2m12 0h.667M3.287 12.713l.473-.473m8.48-8.48.473-.473M10.667 8a2.667 2.667 0 1 1-5.334 0 2.667 2.667 0 0 1 5.334 0Z" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBattery({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M14.667 7.333v1.334M1.333 5.2c0-.747 0-1.12.146-1.405a1.333 1.333 0 0 1 .582-.583C2.347 3.067 2.72 3.067 3.467 3.067h6.4c.746 0 1.12 0 1.404.145.25.128.455.333.583.583.146.285.146.658.146 1.405v5.6c0 .747 0 1.12-.146 1.405a1.333 1.333 0 0 1-.583.582c-.284.146-.658.146-1.404.146h-6.4c-.747 0-1.12 0-1.405-.146a1.333 1.333 0 0 1-.582-.582C1.333 11.92 1.333 11.547 1.333 10.8V5.2Z" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBolt({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M8.667 1.333 3.2 9.067h4.8L7.333 14.667 12.8 6.933H8l.667-5.6Z" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEdit({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M11.333 2a1.886 1.886 0 0 1 2.667 2.667L5.333 13.333 2 14l.667-3.333L11.333 2Z" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconClose({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M12 4 4 12M4 4l8 8" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMenu({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M2 4h12M2 8h12M2 12h12" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDownload({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M14 10v1.333A1.334 1.334 0 0 1 12.667 12.667H3.333A1.334 1.334 0 0 1 2 11.333V10M4.667 6.667 8 10l3.333-3.333M8 10V2" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTwitter({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M12.6 1.5h2.246L9.93 6.98 15.72 14.5h-4.597L7.41 9.955 3.27 14.5H1.022l5.23-5.98L.72 1.5h4.714l3.36 4.143L12.6 1.5Zm-.788 11.688h1.244L4.68 2.775H3.34l8.472 10.413Z" fill={color} />
    </svg>
  );
}

export function IconCar({ size = 16, color = "currentColor", style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}>
      <path d="M3.667 10h.006m8.66 0h.007M3.333 7.333l.88-2.64a1.333 1.333 0 0 1 1.264-.906h5.046c.556 0 1.05.345 1.244.866l.9 2.68M3.333 7.333H2.4a1.067 1.067 0 0 0-1.067 1.067v2.267c0 .589.478 1.066 1.067 1.066h.933m.667-4.4h8m0 0h.933c.59 0 1.067.478 1.067 1.067v2.267c0 .589-.478 1.066-1.067 1.066H12m-8.667 0v1.334m0-1.334H12m0 0v1.334" stroke={color} strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
