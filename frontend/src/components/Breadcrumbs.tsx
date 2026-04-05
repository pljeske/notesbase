import {Link} from 'react-router-dom';
import {usePageStore} from '../stores/pageStore';
import {PageIcon} from '../utils/icons';
import type {PageTreeNode} from '../types/page';

interface BreadcrumbItem {
  id: string;
  title: string;
  icon: string | null;
  icon_color: string | null;
}

function findAncestors(nodes: PageTreeNode[], targetId: string, path: BreadcrumbItem[] = []): BreadcrumbItem[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return path;
    const found = findAncestors(node.children, targetId, [
      ...path,
      {id: node.id, title: node.title, icon: node.icon, icon_color: node.icon_color},
    ]);
    if (found) return found;
  }
  return null;
}

export function Breadcrumbs({pageId}: { pageId: string }) {
  const tree = usePageStore((s) => s.tree);
  const ancestors = findAncestors(tree, pageId) ?? [];

  if (ancestors.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 px-8 pt-3 text-xs" style={{color: '#9ca3af'}}>
      {ancestors.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1 min-w-0">
          {i > 0 && <span className="mx-0.5">/</span>}
          <Link
            to={`/page/${item.id}`}
            className="flex items-center gap-1 min-w-0 hover:text-gray-600 transition-colors"
          >
            <PageIcon icon={item.icon} color={item.icon_color} size={12} weight="light"/>
            <span className="truncate max-w-[120px]">{item.title || 'Untitled'}</span>
          </Link>
        </span>
      ))}
    </nav>
  );
}
