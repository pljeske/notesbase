import type {Tag} from './tag';

export type {Tag};

export interface Page {
  id: string;
  parent_id: string | null;
  title: string;
  content: JSONContent | null;
  icon: string | null;
  icon_color: string | null;
  position: number;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PageTreeNode {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  icon_color: string | null;
  position: number;
  tags: Tag[];
  children: PageTreeNode[];
  created_at: string;
  updated_at: string;
}

export interface TrashedPage {
  id: string;
  title: string;
  icon: string | null;
  icon_color: string | null;
  deleted_at: string;
}

export interface JSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  icon: string | null;
  icon_color: string | null;
}

export interface CreatePageRequest {
  parent_id?: string | null;
  title?: string;
}

export interface UpdatePageRequest {
  title?: string;
  content?: JSONContent;
  icon?: string;
  icon_color?: string;
  tag_ids?: string[];
}

export interface MovePageRequest {
  parent_id: string | null;
  position: number;
}
