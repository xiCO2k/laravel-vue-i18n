export interface PhpAstNode {
  kind: string;
  expr?: PhpAstNode;
  items?: PhpAstNode[];
  value?: string | PhpAstNode;
  key?: {
    kind: string;
    value: string;
    offset?: { name: string };
    what?: { name?: string; offset?: { name: string } };
  };
  left?: PhpAstNode;
  right?: PhpAstNode;
}