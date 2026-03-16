import {
  // General
  House, Star, Heart, Bookmark, Flag, Tag, Archive, Globe, GridFour, SquaresFour,
  Circle, Diamond, Hash, At, Infinity, DotsNine,
  // Documents & Files
  Note, File, FileText, Files, FilePdf, FileImage, FileCode, FileAudio, FileZip,
  Folder, FolderOpen, FolderPlus, Stack, Newspaper, Article,
  Book, BookOpen, BookBookmark, Notebook, NotePencil, Scroll, Clipboard, ClipboardText,
  // Writing & Education
  Pencil, PencilSimple, PencilLine, Pen, Eraser, Highlighter,
  GraduationCap, Books, Exam, Chalkboard, MathOperations, Student,
  // Communication
  Chat, ChatText, ChatTeardrop, Envelope, EnvelopeOpen, Bell, BellRinging,
  Phone, VideoCamera, Megaphone, ShareNetwork, LinkSimple, Rss, Broadcast,
  // People
  User, Users, UserCircle, Person, PersonSimple, Handshake, Crown, Trophy, Medal, Certificate,
  // Technology
  Code, Terminal, Bug, Database, Cloud, Cpu, Desktop, DeviceMobile,
  Gear, Wrench, Package, GitBranch, Robot, WifiHigh, Lightning, PlugsConnected,
  BracketsSquare, BracketsCurly,
  // Media
  Image, Images, Camera, FilmSlate, MusicNote, Microphone, SpeakerHigh, Play, Pause, Headphones,
  // Organization & Planning
  CalendarBlank, CalendarCheck, Clock, ClockCountdown, Timer, Alarm,
  CheckSquare, ListBullets, ListDashes, Table, Kanban, ChartBar, ChartLine, ChartPie,
  // Finance & Business
  CurrencyDollar, CreditCard, Wallet, Coins, Bank, Briefcase, Buildings,
  ShoppingCart, ShoppingBag, Barcode,
  // Travel & Location
  MapPin, MapTrifold, NavigationArrow, Compass, Airplane, Car, Train, Boat,
  // Nature & Objects
  Sun, Moon, CloudRain, Snowflake, Fire, Drop, Plant, Tree, Leaf, Coffee, Wind,
  // Misc
  Question, Info, WarningCircle, Smiley, SmileyWink, Gift, Balloon,
  Recycle, Lock, LockOpen, Key, ShieldCheck, Eye, EyeSlash, PuzzlePiece,
} from '@phosphor-icons/react';
import type {Icon} from '@phosphor-icons/react';

export interface IconEntry {
  name: string;
  label: string;
  category: string;
  component: Icon;
}

export const ICON_REGISTRY: IconEntry[] = [
  // General
  {name: 'House', label: 'House', category: 'General', component: House},
  {name: 'Star', label: 'Star', category: 'General', component: Star},
  {name: 'Heart', label: 'Heart', category: 'General', component: Heart},
  {name: 'Bookmark', label: 'Bookmark', category: 'General', component: Bookmark},
  {name: 'Flag', label: 'Flag', category: 'General', component: Flag},
  {name: 'Tag', label: 'Tag', category: 'General', component: Tag},
  {name: 'Archive', label: 'Archive', category: 'General', component: Archive},
  {name: 'Globe', label: 'Globe', category: 'General', component: Globe},
  {name: 'GridFour', label: 'Grid', category: 'General', component: GridFour},
  {name: 'SquaresFour', label: 'Squares', category: 'General', component: SquaresFour},
  {name: 'Circle', label: 'Circle', category: 'General', component: Circle},
  {name: 'Diamond', label: 'Diamond', category: 'General', component: Diamond},
  {name: 'Hash', label: 'Hash', category: 'General', component: Hash},
  {name: 'At', label: 'At', category: 'General', component: At},
  {name: 'Infinity', label: 'Infinity', category: 'General', component: Infinity},
  {name: 'DotsNine', label: 'Dots', category: 'General', component: DotsNine},

  // Documents & Files
  {name: 'Note', label: 'Note', category: 'Documents', component: Note},
  {name: 'File', label: 'File', category: 'Documents', component: File},
  {name: 'FileText', label: 'File Text', category: 'Documents', component: FileText},
  {name: 'Files', label: 'Files', category: 'Documents', component: Files},
  {name: 'FilePdf', label: 'PDF', category: 'Documents', component: FilePdf},
  {name: 'FileImage', label: 'File Image', category: 'Documents', component: FileImage},
  {name: 'FileCode', label: 'File Code', category: 'Documents', component: FileCode},
  {name: 'FileAudio', label: 'File Audio', category: 'Documents', component: FileAudio},
  {name: 'FileZip', label: 'File Zip', category: 'Documents', component: FileZip},
  {name: 'Folder', label: 'Folder', category: 'Documents', component: Folder},
  {name: 'FolderOpen', label: 'Folder Open', category: 'Documents', component: FolderOpen},
  {name: 'FolderPlus', label: 'Folder Plus', category: 'Documents', component: FolderPlus},
  {name: 'Stack', label: 'Stack', category: 'Documents', component: Stack},
  {name: 'Newspaper', label: 'Newspaper', category: 'Documents', component: Newspaper},
  {name: 'Article', label: 'Article', category: 'Documents', component: Article},
  {name: 'Book', label: 'Book', category: 'Documents', component: Book},
  {name: 'BookOpen', label: 'Book Open', category: 'Documents', component: BookOpen},
  {name: 'BookBookmark', label: 'Book Bookmark', category: 'Documents', component: BookBookmark},
  {name: 'Notebook', label: 'Notebook', category: 'Documents', component: Notebook},
  {name: 'NotePencil', label: 'Note Pencil', category: 'Documents', component: NotePencil},
  {name: 'Scroll', label: 'Scroll', category: 'Documents', component: Scroll},
  {name: 'Clipboard', label: 'Clipboard', category: 'Documents', component: Clipboard},
  {name: 'ClipboardText', label: 'Clipboard Text', category: 'Documents', component: ClipboardText},

  // Writing & Education
  {name: 'Pencil', label: 'Pencil', category: 'Writing & Education', component: Pencil},
  {name: 'PencilSimple', label: 'Pencil Simple', category: 'Writing & Education', component: PencilSimple},
  {name: 'PencilLine', label: 'Pencil Line', category: 'Writing & Education', component: PencilLine},
  {name: 'Pen', label: 'Pen', category: 'Writing & Education', component: Pen},
  {name: 'Eraser', label: 'Eraser', category: 'Writing & Education', component: Eraser},
  {name: 'Highlighter', label: 'Highlighter', category: 'Writing & Education', component: Highlighter},
  {name: 'GraduationCap', label: 'Graduation Cap', category: 'Writing & Education', component: GraduationCap},
  {name: 'Books', label: 'Books', category: 'Writing & Education', component: Books},
  {name: 'Exam', label: 'Exam', category: 'Writing & Education', component: Exam},
  {name: 'Chalkboard', label: 'Chalkboard', category: 'Writing & Education', component: Chalkboard},
  {name: 'MathOperations', label: 'Math', category: 'Writing & Education', component: MathOperations},
  {name: 'Student', label: 'Student', category: 'Writing & Education', component: Student},

  // Communication
  {name: 'Chat', label: 'Chat', category: 'Communication', component: Chat},
  {name: 'ChatText', label: 'Chat Text', category: 'Communication', component: ChatText},
  {name: 'ChatTeardrop', label: 'Chat Bubble', category: 'Communication', component: ChatTeardrop},
  {name: 'Envelope', label: 'Envelope', category: 'Communication', component: Envelope},
  {name: 'EnvelopeOpen', label: 'Envelope Open', category: 'Communication', component: EnvelopeOpen},
  {name: 'Bell', label: 'Bell', category: 'Communication', component: Bell},
  {name: 'BellRinging', label: 'Bell Ringing', category: 'Communication', component: BellRinging},
  {name: 'Phone', label: 'Phone', category: 'Communication', component: Phone},
  {name: 'VideoCamera', label: 'Video', category: 'Communication', component: VideoCamera},
  {name: 'Megaphone', label: 'Megaphone', category: 'Communication', component: Megaphone},
  {name: 'ShareNetwork', label: 'Share', category: 'Communication', component: ShareNetwork},
  {name: 'LinkSimple', label: 'Link', category: 'Communication', component: LinkSimple},
  {name: 'Rss', label: 'RSS', category: 'Communication', component: Rss},
  {name: 'Broadcast', label: 'Broadcast', category: 'Communication', component: Broadcast},

  // People
  {name: 'User', label: 'User', category: 'People', component: User},
  {name: 'Users', label: 'Users', category: 'People', component: Users},
  {name: 'UserCircle', label: 'User Circle', category: 'People', component: UserCircle},
  {name: 'Person', label: 'Person', category: 'People', component: Person},
  {name: 'PersonSimple', label: 'Person Simple', category: 'People', component: PersonSimple},
  {name: 'Handshake', label: 'Handshake', category: 'People', component: Handshake},
  {name: 'Crown', label: 'Crown', category: 'People', component: Crown},
  {name: 'Trophy', label: 'Trophy', category: 'People', component: Trophy},
  {name: 'Medal', label: 'Medal', category: 'People', component: Medal},
  {name: 'Certificate', label: 'Certificate', category: 'People', component: Certificate},

  // Technology
  {name: 'Code', label: 'Code', category: 'Technology', component: Code},
  {name: 'Terminal', label: 'Terminal', category: 'Technology', component: Terminal},
  {name: 'Bug', label: 'Bug', category: 'Technology', component: Bug},
  {name: 'Database', label: 'Database', category: 'Technology', component: Database},
  {name: 'Cloud', label: 'Cloud', category: 'Technology', component: Cloud},
  {name: 'Cpu', label: 'CPU', category: 'Technology', component: Cpu},
  {name: 'Desktop', label: 'Desktop', category: 'Technology', component: Desktop},
  {name: 'DeviceMobile', label: 'Mobile', category: 'Technology', component: DeviceMobile},
  {name: 'Gear', label: 'Gear', category: 'Technology', component: Gear},
  {name: 'Wrench', label: 'Wrench', category: 'Technology', component: Wrench},
  {name: 'Package', label: 'Package', category: 'Technology', component: Package},
  {name: 'GitBranch', label: 'Git Branch', category: 'Technology', component: GitBranch},
  {name: 'Robot', label: 'Robot', category: 'Technology', component: Robot},
  {name: 'WifiHigh', label: 'WiFi', category: 'Technology', component: WifiHigh},
  {name: 'Lightning', label: 'Lightning', category: 'Technology', component: Lightning},
  {name: 'PlugsConnected', label: 'Connected', category: 'Technology', component: PlugsConnected},
  {name: 'BracketsSquare', label: 'Brackets', category: 'Technology', component: BracketsSquare},
  {name: 'BracketsCurly', label: 'Curly Brackets', category: 'Technology', component: BracketsCurly},

  // Media
  {name: 'Image', label: 'Image', category: 'Media', component: Image},
  {name: 'Images', label: 'Images', category: 'Media', component: Images},
  {name: 'Camera', label: 'Camera', category: 'Media', component: Camera},
  {name: 'FilmSlate', label: 'Film', category: 'Media', component: FilmSlate},
  {name: 'MusicNote', label: 'Music', category: 'Media', component: MusicNote},
  {name: 'Microphone', label: 'Microphone', category: 'Media', component: Microphone},
  {name: 'SpeakerHigh', label: 'Speaker', category: 'Media', component: SpeakerHigh},
  {name: 'Play', label: 'Play', category: 'Media', component: Play},
  {name: 'Pause', label: 'Pause', category: 'Media', component: Pause},
  {name: 'Headphones', label: 'Headphones', category: 'Media', component: Headphones},

  // Organization & Planning
  {name: 'CalendarBlank', label: 'Calendar', category: 'Organization', component: CalendarBlank},
  {name: 'CalendarCheck', label: 'Calendar Check', category: 'Organization', component: CalendarCheck},
  {name: 'Clock', label: 'Clock', category: 'Organization', component: Clock},
  {name: 'ClockCountdown', label: 'Countdown', category: 'Organization', component: ClockCountdown},
  {name: 'Timer', label: 'Timer', category: 'Organization', component: Timer},
  {name: 'Alarm', label: 'Alarm', category: 'Organization', component: Alarm},
  {name: 'CheckSquare', label: 'Checklist', category: 'Organization', component: CheckSquare},
  {name: 'ListBullets', label: 'List', category: 'Organization', component: ListBullets},
  {name: 'ListDashes', label: 'List Dashes', category: 'Organization', component: ListDashes},
  {name: 'Table', label: 'Table', category: 'Organization', component: Table},
  {name: 'Kanban', label: 'Kanban', category: 'Organization', component: Kanban},
  {name: 'ChartBar', label: 'Bar Chart', category: 'Organization', component: ChartBar},
  {name: 'ChartLine', label: 'Line Chart', category: 'Organization', component: ChartLine},
  {name: 'ChartPie', label: 'Pie Chart', category: 'Organization', component: ChartPie},

  // Finance & Business
  {name: 'CurrencyDollar', label: 'Dollar', category: 'Finance', component: CurrencyDollar},
  {name: 'CreditCard', label: 'Credit Card', category: 'Finance', component: CreditCard},
  {name: 'Wallet', label: 'Wallet', category: 'Finance', component: Wallet},
  {name: 'Coins', label: 'Coins', category: 'Finance', component: Coins},
  {name: 'Bank', label: 'Bank', category: 'Finance', component: Bank},
  {name: 'Briefcase', label: 'Briefcase', category: 'Finance', component: Briefcase},
  {name: 'Buildings', label: 'Buildings', category: 'Finance', component: Buildings},
  {name: 'ShoppingCart', label: 'Cart', category: 'Finance', component: ShoppingCart},
  {name: 'ShoppingBag', label: 'Shopping Bag', category: 'Finance', component: ShoppingBag},
  {name: 'Barcode', label: 'Barcode', category: 'Finance', component: Barcode},

  // Travel & Location
  {name: 'MapPin', label: 'Map Pin', category: 'Travel', component: MapPin},
  {name: 'MapTrifold', label: 'Map', category: 'Travel', component: MapTrifold},
  {name: 'NavigationArrow', label: 'Navigation', category: 'Travel', component: NavigationArrow},
  {name: 'Compass', label: 'Compass', category: 'Travel', component: Compass},
  {name: 'Airplane', label: 'Airplane', category: 'Travel', component: Airplane},
  {name: 'Car', label: 'Car', category: 'Travel', component: Car},
  {name: 'Train', label: 'Train', category: 'Travel', component: Train},
  {name: 'Boat', label: 'Boat', category: 'Travel', component: Boat},

  // Nature & Objects
  {name: 'Sun', label: 'Sun', category: 'Nature', component: Sun},
  {name: 'Moon', label: 'Moon', category: 'Nature', component: Moon},
  {name: 'CloudRain', label: 'Rain', category: 'Nature', component: CloudRain},
  {name: 'Snowflake', label: 'Snowflake', category: 'Nature', component: Snowflake},
  {name: 'Fire', label: 'Fire', category: 'Nature', component: Fire},
  {name: 'Drop', label: 'Drop', category: 'Nature', component: Drop},
  {name: 'Plant', label: 'Plant', category: 'Nature', component: Plant},
  {name: 'Tree', label: 'Tree', category: 'Nature', component: Tree},
  {name: 'Leaf', label: 'Leaf', category: 'Nature', component: Leaf},
  {name: 'Coffee', label: 'Coffee', category: 'Nature', component: Coffee},
  {name: 'Wind', label: 'Wind', category: 'Nature', component: Wind},

  // Misc
  {name: 'Question', label: 'Question', category: 'Misc', component: Question},
  {name: 'Info', label: 'Info', category: 'Misc', component: Info},
  {name: 'WarningCircle', label: 'Warning', category: 'Misc', component: WarningCircle},
  {name: 'Smiley', label: 'Smiley', category: 'Misc', component: Smiley},
  {name: 'SmileyWink', label: 'Wink', category: 'Misc', component: SmileyWink},
  {name: 'Gift', label: 'Gift', category: 'Misc', component: Gift},
  {name: 'Balloon', label: 'Balloon', category: 'Misc', component: Balloon},
  {name: 'PuzzlePiece', label: 'Puzzle', category: 'Misc', component: PuzzlePiece},
  {name: 'Recycle', label: 'Recycle', category: 'Misc', component: Recycle},
  {name: 'Lock', label: 'Lock', category: 'Misc', component: Lock},
  {name: 'LockOpen', label: 'Unlock', category: 'Misc', component: LockOpen},
  {name: 'Key', label: 'Key', category: 'Misc', component: Key},
  {name: 'ShieldCheck', label: 'Shield', category: 'Misc', component: ShieldCheck},
  {name: 'Eye', label: 'Eye', category: 'Misc', component: Eye},
  {name: 'EyeSlash', label: 'Eye Slash', category: 'Misc', component: EyeSlash},
];

export const ICON_MAP: Record<string, Icon> = Object.fromEntries(
  ICON_REGISTRY.map((e) => [e.name, e.component])
);

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
