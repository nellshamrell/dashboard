import React from 'react';
import { Resource } from '../../graph';
import { Handle, NodeProps, Position } from 'reactflow';

//  Note: the default style assigned to a node gives it a 150px width
// from style: .react-flow__node-default.

export type ResourceNodeProps = Pick<NodeProps<Resource>, 'data'>;

function ResourceNode(props: ResourceNodeProps) {
  const isPreview = props.data.provisioningState === 'Preview';

  const containerStyle: React.CSSProperties = {
    padding: '2px',
    fontSize: '.6rem',
    ...(isPreview
      ? {
          border: '2px dashed #1976d2',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
        }
      : {}),
  };

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div style={containerStyle}>
        <h3 style={{ textAlign: 'center' }}>{props.data.name}</h3>
        {isPreview && (
          <div
            style={{
              textAlign: 'center',
              marginBottom: '2px',
            }}
          >
            <span
              style={{
                fontSize: '.5rem',
                backgroundColor: '#1976d2',
                color: 'white',
                padding: '1px 4px',
                borderRadius: '8px',
              }}
            >
              Preview
            </span>
          </div>
        )}
        <hr />
        <h6>{props.data.type}</h6>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default ResourceNode;
