import React, { useState, useEffect } from 'react';
import { Modal, List, Checkbox, Button, Spin, Tag, Space, Typography } from 'antd';
import { CheckCircleOutlined, LockOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TorrentFile {
  index: number;
  name: string;
  length: number;
  isOptional: boolean;
}

interface FileSelectionModalProps {
  visible: boolean;
  files: TorrentFile[];
  loading?: boolean;
  gameName?: string;
  onConfirm: (selectedIndices: number[]) => void;
  onCancel: () => void;
}

const FileSelectionModal: React.FC<FileSelectionModalProps> = ({
  visible,
  files,
  loading = false,
  gameName = 'Game',
  onConfirm,
  onCancel
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (visible && files.length > 0) {
      // Pre-select all required files
      const required = files
        .filter(f => !f.isOptional)
        .map(f => f.index);
      setSelectedIndices(new Set(required));
    }
  }, [visible, files]);

  const handleFileToggle = (index: number, isOptional: boolean) => {
    if (!isOptional) return; // Can't deselect required files

    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleSelectAll = () => {
    const allIndices = new Set(files.map(f => f.index));
    setSelectedIndices(allIndices);
  };

  const handleDeselectOptional = () => {
    const required = new Set(files.filter(f => !f.isOptional).map(f => f.index));
    setSelectedIndices(required);
  };

  const getTotalSize = (indices: Set<number>) => {
    const bytes = files
      .filter(f => indices.has(f.index))
      .reduce((sum, f) => sum + f.length, 0);
    return formatBytes(bytes);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const requiredCount = files.filter(f => !f.isOptional).length;
  const optionalCount = files.filter(f => f.isOptional).length;

  return (
    <Modal
      title={`Select Files to Download - ${gameName}`}
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="deselect-opt" onClick={handleDeselectOptional}>
          Deselect Optional
        </Button>,
        <Button key="select-all" onClick={handleSelectAll}>
          Select All
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={loading}
          onClick={() => onConfirm(Array.from(selectedIndices))}
        >
          Download ({getTotalSize(selectedIndices)})
        </Button>
      ]}
      width={700}
      bodyStyle={{ maxHeight: '500px', overflowY: 'auto' }}
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Text strong>Total files: {files.length}</Text>
            <Text>Required: {requiredCount}</Text>
            <Text type="warning">Optional: {optionalCount}</Text>
          </Space>
        </div>

        <List
          dataSource={files}
          renderItem={(file) => (
            <List.Item
              key={file.index}
              style={{
                opacity: file.isOptional ? 1 : 0.85,
                backgroundColor: file.isOptional ? 'transparent' : 'rgba(109, 220, 255, 0.05)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid rgba(109, 220, 255, 0.15)'
              }}
            >
              <List.Item.Meta
                avatar={
                  file.isOptional ? (
                    <Checkbox
                      checked={selectedIndices.has(file.index)}
                      onChange={() => handleFileToggle(file.index, true)}
                      style={{ marginRight: '8px' }}
                    />
                  ) : (
                    <CheckCircleOutlined
                      style={{
                        color: '#6ddcff',
                        fontSize: '18px',
                        marginRight: '8px'
                      }}
                    />
                  )
                }
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: file.isOptional ? '#ffffff' : 'rgba(255, 255, 255, 0.65)' }}>
                      {file.name}
                    </span>
                    {!file.isOptional && (
                      <Tag icon={<LockOutlined />} color="blue">
                        Required
                      </Tag>
                    )}
                    {file.isOptional && (
                      <Tag color="orange">Optional</Tag>
                    )}
                  </div>
                }
                description={
                  <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '12px' }}>
                    {formatBytes(file.length)}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      </Spin>
    </Modal>
  );
};

export default FileSelectionModal;
