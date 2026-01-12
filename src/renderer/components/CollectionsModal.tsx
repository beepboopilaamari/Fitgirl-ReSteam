import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, List, message, Space, Popconfirm } from 'antd';
import { FolderOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface Collection {
  id: number;
  name: string;
  description?: string;
  color?: string;
  date_created: string;
}

interface CollectionsModalProps {
  visible: boolean;
  onClose: () => void;
  installationId?: number;
}

const CollectionsModal: React.FC<CollectionsModalProps> = ({ visible, onClose, installationId }) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState('#6ddcff');

  useEffect(() => {
    if (visible) {
      loadCollections();
    }
  }, [visible]);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getAllCollections();
      setCollections(result);
    } catch (error) {
      message.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      message.warning('Please enter a collection name');
      return;
    }

    try {
      await window.electronAPI.createCollection(
        newCollectionName,
        newCollectionDescription || undefined,
        newCollectionColor
      );
      message.success('Collection created');
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNewCollectionColor('#6ddcff');
      setShowCreateForm(false);
      loadCollections();
    } catch (error) {
      message.error('Failed to create collection');
    }
  };

  const handleDeleteCollection = async (id: number) => {
    try {
      await window.electronAPI.deleteCollection(id);
      message.success('Collection deleted');
      loadCollections();
    } catch (error) {
      message.error('Failed to delete collection');
    }
  };

  const handleAddToCollection = async (collectionId: number) => {
    if (!installationId) return;

    try {
      await window.electronAPI.addGameToCollection(collectionId, installationId);
      message.success('Game added to collection');
      onClose();
    } catch (error) {
      message.error('Failed to add game to collection');
    }
  };

  return (
    <Modal
      title={installationId ? "Add to Collection" : "Manage Collections"}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div>
        {!showCreateForm ? (
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setShowCreateForm(true)}
            style={{ marginBottom: 16, width: '100%' }}
          >
            Create New Collection
          </Button>
        ) : (
          <div style={{ 
            marginBottom: 16, 
            padding: 16, 
            background: 'rgba(15, 20, 30, 0.6)', 
            borderRadius: 8,
            border: '1px solid #1e293b'
          }}>
            <Input
              placeholder="Collection Name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <TextArea
              placeholder="Description (optional)"
              value={newCollectionDescription}
              onChange={(e) => setNewCollectionDescription(e.target.value)}
              rows={2}
              style={{ marginBottom: 12 }}
            />
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#94a3b8', marginBottom: 8, display: 'block' }}>Color</label>
              <input 
                type="color" 
                value={newCollectionColor}
                onChange={(e) => setNewCollectionColor(e.target.value)}
                style={{ 
                  width: 100, 
                  height: 40, 
                  border: '1px solid #1e293b', 
                  borderRadius: 8, 
                  cursor: 'pointer' 
                }}
              />
            </div>
            <Space>
              <Button type="primary" onClick={handleCreateCollection}>
                Create
              </Button>
              <Button onClick={() => {
                setShowCreateForm(false);
                setNewCollectionName('');
                setNewCollectionDescription('');
              }}>
                Cancel
              </Button>
            </Space>
          </div>
        )}

        <List
          loading={loading}
          dataSource={collections}
          renderItem={(collection) => (
            <List.Item
              style={{
                background: 'rgba(15, 20, 30, 0.4)',
                border: '1px solid #1e293b',
                borderRadius: 8,
                marginBottom: 8,
                padding: 16,
                cursor: installationId ? 'pointer' : 'default'
              }}
              onClick={() => installationId && handleAddToCollection(collection.id)}
              actions={!installationId ? [
                <Popconfirm
                  title="Delete this collection?"
                  description="Games won't be deleted, just removed from the collection."
                  onConfirm={() => handleDeleteCollection(collection.id)}
                  okText="Delete"
                  cancelText="Cancel"
                >
                  <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />}
                  />
                </Popconfirm>
              ] : undefined}
            >
              <List.Item.Meta
                avatar={
                  <div 
                    style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 8,
                      background: collection.color || '#6ddcff',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <FolderOutlined style={{ fontSize: 20, color: '#fff' }} />
                  </div>
                }
                title={
                  <div style={{ color: '#bfe9ff', fontSize: 16, fontWeight: 500 }}>
                    {collection.name}
                  </div>
                }
                description={
                  <div>
                    {collection.description && (
                      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
                        {collection.description}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Created: {new Date(collection.date_created).toLocaleDateString()}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No collections yet. Create your first one!' }}
        />
      </div>
    </Modal>
  );
};

export default CollectionsModal;
