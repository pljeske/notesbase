import {Note} from '@phosphor-icons/react';
import {ICON_MAP} from './icon-registry';

export {ICON_REGISTRY, ICON_MAP} from './icon-registry';
export type {IconEntry} from './icon-registry';

interface PageIconProps {
  icon: string | null;
  color?: string | null;
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill';
  className?: string;
}

export function PageIcon({icon, color, size = 16, weight = 'light', className}: PageIconProps) {
  const style = color ? {color} : undefined;
  if (!icon) {
    const DefaultIcon = Note;
    return <DefaultIcon size={size} weight={weight} className={className} style={style}/>;
  }
  const IconComponent = ICON_MAP[icon];
  if (IconComponent) {
    return <IconComponent size={size} weight={weight} className={className} style={style}/>;
  }
  // Legacy emoji fallback
  return (
    <span style={{fontSize: size * 0.8, lineHeight: 1}} className={className}>
      {icon}
    </span>
  );
}
