export interface Page {
  id: string;
  parent_id: string | null;
  title: string;
  content: JSONContent | null;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PageTreeNode {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  position: number;
  children: PageTreeNode[];
  created_at: string;
  updated_at: string;
}

export interface JSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface CreatePageRequest {
  parent_id?: string | null;
  title?: string;
}

export interface UpdatePageRequest {
  title?: string;
  content?: JSONContent;
  icon?: string;
}

export interface MovePageRequest {
  parent_id: string | null;
  position: number;
}
