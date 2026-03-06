import React from 'react';
import { Resource } from '../../graph';
import { Handle, NodeProps, Position } from 'reactflow';

//  Note: the default style assigned to a node gives it a 150px width
// from style: .react-flow__node-default.

export type ResourceNodeProps = Pick<
  NodeProps<Resource & { isPreview?: boolean }>,
  'data'
>;

const previewNodeStyle: React.CSSProperties = {
  border: '2px dashed #9e9e9e',
  borderRadius: '4px',
  backgroundColor: '#f5f5f5',
  opacity: 0.85,
};

const defaultNodeStyle: React.CSSProperties = {};

function ResourceNode(props: ResourceNodeProps) {
  const isPreview = props.data.isPreview ?? false;
  const nodeStyle = isPreview ? previewNodeStyle : defaultNodeStyle;

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div style={{ ...nodeStyle, padding: '2px', fontSize: '.6rem' }}>
        <h3 style={{ textAlign: 'center' }}>{props.data.name}</h3>
        <hr />
        <h6>{props.data.type}</h6>
        {isPreview && (
          <span
            data-testid="not-deployed-badge"
            style={{
              display: 'inline-block',
              marginTop: '4px',
              padding: '1px 6px',
              fontSize: '.5rem',
              fontWeight: 600,
              color: '#757575',
              backgroundColor: '#e0e0e0',
              borderRadius: '8px',
            }}
          >
            Not Deployed
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default ResourceNode;
