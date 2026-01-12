import React, { useState, useMemo } from 'react';
import { Typography, Empty, Card, Row, Col, Button, Dropdown, message, Space, Modal, List, Spin, Rate, Input, Select, Tag } from 'antd';
import { PlayCircleOutlined, MoreOutlined, DeleteOutlined, FolderOpenOutlined, SettingOutlined, StarOutlined, StarFilled, EditOutlined, CheckCircleOutlined, FolderOutlined, ClockCircleOutlined, SortAscendingOutlined, FilterOutlined, AppstoreOutlined, BarsOutlined } from '@ant-design/icons';
import { useLibrary } from '../contexts/LibraryContext';
import CollectionsModal from '../components/CollectionsModal';
import PlaytimeModal from '../components/PlaytimeModal';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const LibraryView: React.FC = () => {
  const { installations, loading, refreshInstallations } = useLibrary();
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundExecutables, setFoundExecutables] = useState<string[]>([]);
  const [selectedExe, setSelectedExe] = useState<string | null>(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<any>(null);
  const [notesText, setNotesText] = useState('');
  const [rating, setRating] = useState(0);
  const [completionStatus, setCompletionStatus] = useState<any>('not_started');
  const [collectionsModalVisible, setCollectionsModalVisible] = useState(false);
  const [collectionsInstallationId, setCollectionsInstallationId] = useState<number | undefined>(undefined);
  const [playtimeModalVisible, setPlaytimeModalVisible] = useState(false);
  const [playtimeInstallationId, setPlaytimeInstallationId] = useState<number>(0);
  const [playtimeGameName, setPlaytimeGameName] = useState<string>('');
  
  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<'name' | 'playtime' | 'rating' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterCompletion, setFilterCompletion] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Sorted and filtered installations
  const filteredInstallations = useMemo(() => {
    let result = [...installations];

    // Apply filters
    if (filterFavorites) {
      result = result.filter(inst => inst.is_favorite);
    }
    if (filterCompletion) {
      result = result.filter(inst => inst.completion_status === filterCompletion);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.game?.title || '').localeCompare(b.game?.title || '');
          break;
        case 'playtime':
          comparison = (a.total_playtime_seconds || 0) - (b.total_playtime_seconds || 0);
          break;
        case 'rating':
          comparison = (a.user_rating || 0) - (b.user_rating || 0);
          break;
        case 'date':
          comparison = new Date(a.date_installed).getTime() - new Date(b.date_installed).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [installations, sortBy, sortOrder, filterFavorites, filterCompletion]);

  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleScanDirectory = async () => {
    try {
      const result = await window.electronAPI.selectDirectory();
      if (!result) return;

      setScanning(true);
      setScanModalVisible(true);
      setFoundExecutables([]);

      const scanResult: any = await window.electronAPI.scanDirectoryForGames(result);
      
      if (scanResult.success && scanResult.executables) {
        setFoundExecutables(scanResult.executables);
        if (scanResult.executables.length === 0) {
          message.info('No game executables found in this directory');
        }
      } else {
        message.error(`Scan failed: ${scanResult.error || 'Unknown error'}`);
        setScanModalVisible(false);
      }
    } catch (error) {
      message.error('Failed to scan directory');
      setScanModalVisible(false);
    } finally {
      setScanning(false);
    }
  };

  const handleAddFromScan = async () => {
    if (!selectedExe) {
      message.warning('Please select an executable');
      return;
    }

    try {
      // Get game name from path (last folder name)
      const pathParts = selectedExe.split('\\');
      const exeName = pathParts[pathParts.length - 1].replace('.exe', '');
      const installPath = pathParts.slice(0, -1).join('\\');

      // Check if this game already exists in library
      const existingGame = installations.find(inst => 
        inst.install_path?.toLowerCase() === installPath.toLowerCase()
      );

      if (existingGame) {
        message.warning('This game is already in your library');
        return;
      }

      // For now, we'll just show a message that the user should download the game properly
      // In a future update, we can add support for creating stub game entries
      message.info(`Found: ${exeName}\nPath: ${installPath}\n\nTo add this game to your library, please download it through the Browse page.`);
      return;

      // TODO: Add support for creating stub game entries for scanned games

      message.success(`Added ${exeName} to library`);
      setScanModalVisible(false);
      setSelectedExe(null);
      refreshInstallations();
    } catch (error) {
      message.error('Failed to add game to library');
    }
  };

  const handleSetUninstaller = async (installationId: number) => {
    try {
      const result = await window.electronAPI.selectFile([
        { name: 'Executable', extensions: ['exe'] }
      ]);
      
      if (result) {
        await window.electronAPI.updateInstallation(installationId, {
          uninstall_exe_path: result
        });
        message.success('Uninstaller set successfully');
        refreshInstallations();
      }
    } catch (error) {
      message.error('Failed to set uninstaller');
    }
  };

  const handleToggleFavorite = async (installationId: number, currentFavorite: boolean) => {
    try {
      await window.electronAPI.updateInstallation(installationId, {
        is_favorite: !currentFavorite
      });
      message.success(!currentFavorite ? 'Added to favorites' : 'Removed from favorites');
      refreshInstallations();
    } catch (error) {
      message.error('Failed to update favorite status');
    }
  };

  const handleOpenNotesModal = (installation: any) => {
    setSelectedInstallation(installation);
    setNotesText(installation.user_notes || '');
    setRating(installation.user_rating || 0);
    setCompletionStatus((installation.completion_status || 'not_started') as any);
    setNotesModalVisible(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedInstallation) return;

    try {
      await window.electronAPI.updateInstallation(selectedInstallation.id, {
        user_notes: notesText,
        user_rating: rating,
        completion_status: completionStatus
      });
      message.success('Notes and rating saved');
      setNotesModalVisible(false);
      refreshInstallations();
    } catch (error) {
      message.error('Failed to save notes');
    }
  };

  const getCompletionColor = (status: string) => {
    const colors: any = {
      'not_started': 'default',
      'playing': 'blue',
      'completed': 'green',
      'abandoned': 'red'
    };
    return colors[status] || 'default';
  };

  const getCompletionLabel = (status: string) => {
    const labels: any = {
      'not_started': 'Not Started',
      'playing': 'Playing',
      'completed': 'Completed',
      'abandoned': 'Abandoned'
    };
    return labels[status] || 'Not Started';
  };

  const handlePlay = async (installationId: number) => {
    try {
      const success = await window.electronAPI.launchGame(installationId);
      if (!success) {
        message.error('Failed to launch game');
      }
    } catch (error) {
      message.error('Error launching game');
    }
  };

  const handleUninstall = async (installationId: number) => {
    try {
      // Get installation details to check for uninstaller
      const installation = installations.find(inst => inst.id === installationId);
      
      if (installation?.uninstall_exe_path) {
        // Run the uninstaller
        message.loading({ content: 'Running uninstaller...', key: 'uninstall', duration: 0 });
        
        try {
          const result = await window.electronAPI.runInstaller(installation.uninstall_exe_path);
          message.destroy('uninstall');
          
          if (result.success) {
            message.success('Uninstaller completed successfully');
          } else {
            message.warning('Uninstaller may have failed, removing from library anyway');
          }
        } catch (error) {
          message.destroy('uninstall');
          message.warning('Failed to run uninstaller, removing from library anyway');
        }
      }
      
      // Remove from database
      await window.electronAPI.deleteInstallation(installationId);
      message.success('Game removed from library');
      refreshInstallations();
    } catch (error) {
      message.error('Failed to uninstall game');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (installations.length === 0) {
    return (
      <div className="page-shell">
        <div className="hero-bar">
          <div>
            <Title level={2} className="page-title">My Library</Title>
            <div className="hero-subtitle">No games installed yet. Browse games to get started.</div>
          </div>
        </div>
        <Empty description="No games installed yet. Browse games to get started!" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="hero-bar">
        <div>
          <Title level={2} className="page-title">My Library</Title>
          <div className="hero-subtitle">Installed titles, ready to play.</div>
        </div>
        <div className="hero-actions">
          <Button 
            icon={<FolderOutlined />}
            onClick={() => setCollectionsModalVisible(true)}
            style={{ marginRight: 12 }}
          >
            Collections
          </Button>
          <Button 
            icon={<FolderOpenOutlined />}
            onClick={handleScanDirectory}
            style={{ marginRight: 12 }}
          >
            Scan Directory
          </Button>
          <span className="chip">{filteredInstallations.length} {filterFavorites || filterCompletion ? 'filtered' : 'installed'}</span>
        </div>
      </div>

      {/* Sorting and Filtering Controls */}
      <div style={{ marginBottom: 24, padding: '16px 0', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SortAscendingOutlined style={{ color: '#94a3b8' }} />
          <Select 
            value={sortBy} 
            onChange={setSortBy}
            style={{ width: 140 }}
            size="small"
          >
            <Option value="name">Name</Option>
            <Option value="playtime">Playtime</Option>
            <Option value="rating">Rating</Option>
            <Option value="date">Install Date</Option>
          </Select>
          <Select 
            value={sortOrder} 
            onChange={setSortOrder}
            style={{ width: 120 }}
            size="small"
          >
            <Option value="asc">Ascending</Option>
            <Option value="desc">Descending</Option>
          </Select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FilterOutlined style={{ color: '#94a3b8' }} />
          <Button 
            size="small"
            type={filterFavorites ? 'primary' : 'default'}
            icon={<StarFilled />}
            onClick={() => setFilterFavorites(!filterFavorites)}
          >
            Favorites
          </Button>
          <Select 
            value={filterCompletion} 
            onChange={setFilterCompletion}
            style={{ width: 150 }}
            size="small"
            placeholder="Completion"
            allowClear
          >
            <Option value="playing">Playing</Option>
            <Option value="completed">Completed</Option>
            <Option value="abandoned">Abandoned</Option>
            <Option value="not_started">Not Started</Option>
          </Select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button 
            size="small"
            type={viewMode === 'grid' ? 'primary' : 'default'}
            icon={<AppstoreOutlined />}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button 
            size="small"
            type={viewMode === 'list' ? 'primary' : 'default'}
            icon={<BarsOutlined />}
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {viewMode === 'grid' ? (
          // Grid View
          filteredInstallations.map(installation => (
            <Col key={installation.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                className="glass-card"
                cover={
                  <div className="glass-cover" style={{ position: 'relative' }}>
                    {installation.game?.cover_image_url ? (
                      <img 
                        src={installation.game.cover_image_url} 
                        alt={installation.game.title}
                      />
                    ) : (
                      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#bfe9ff', fontSize: 32 }}>🎮</div>
                    )}
                    <Button
                      icon={installation.is_favorite ? <StarFilled /> : <StarOutlined />}
                      onClick={() => handleToggleFavorite(installation.id, installation.is_favorite || false)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        border: 'none',
                        background: 'rgba(0, 0, 0, 0.5)',
                        color: installation.is_favorite ? '#ffd700' : '#fff',
                        backdropFilter: 'blur(10px)'
                      }}
                      shape="circle"
                    />
                  </div>
                }
                actions={[
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />}
                    onClick={() => handlePlay(installation.id)}
                  >
                    Play
                  </Button>,
                  <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'notes',
                        label: 'Notes & Rating',
                        icon: <EditOutlined />,
                        onClick: () => handleOpenNotesModal(installation)
                      },
                      {
                        key: 'playtime',
                        label: 'View Playtime',
                        icon: <ClockCircleOutlined />,
                        onClick: () => {
                          setPlaytimeInstallationId(installation.id);
                          setPlaytimeGameName(installation.game?.title || 'Game');
                          setPlaytimeModalVisible(true);
                        }
                      },
                      {
                        key: 'collections',
                        label: 'Add to Collection',
                        icon: <FolderOutlined />,
                        onClick: () => {
                          setCollectionsInstallationId(installation.id);
                          setCollectionsModalVisible(true);
                        }
                      },
                      {
                        key: 'favorite',
                        label: installation.is_favorite ? 'Remove from Favorites' : 'Add to Favorites',
                        icon: installation.is_favorite ? <StarFilled /> : <StarOutlined />,
                        onClick: () => handleToggleFavorite(installation.id, installation.is_favorite || false)
                      },
                      {
                        key: 'set-uninstaller',
                        label: 'Set Uninstaller',
                        icon: <SettingOutlined />,
                        onClick: () => handleSetUninstaller(installation.id)
                      },
                      {
                        type: 'divider'
                      },
                      {
                        key: 'uninstall',
                        label: 'Uninstall',
                        icon: <DeleteOutlined />,
                        danger: true,
                        onClick: () => handleUninstall(installation.id)
                      }
                    ]
                  }}
                >
                  <Button icon={<MoreOutlined />} />
                </Dropdown>
              ]}
            >
              <Card.Meta
                title={installation.game?.title || 'Unknown Game'}
                description={
                  <div className="card-meta">
                    {installation.user_rating && installation.user_rating > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        <Rate disabled value={installation.user_rating || 0} style={{ fontSize: 14, color: '#ffd700' }} />
                      </div>
                    )}
                    <div>Playtime: {formatPlaytime(installation.total_playtime_seconds)}</div>
                    <Space size={8} style={{ marginTop: 8, flexWrap: 'wrap' }}>
                      {installation.completion_status && installation.completion_status !== 'not_started' && (
                        <Tag color={getCompletionColor(installation.completion_status)} icon={<CheckCircleOutlined />}>
                          {getCompletionLabel(installation.completion_status)}
                        </Tag>
                      )}
                      {installation.last_played && (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Last played: {new Date(installation.last_played).toLocaleDateString()}
                        </span>
                      )}
                    </Space>
                  </div>
                }
              />
            </Card>
          </Col>
          ))
        ) : (
          // List View
          <Col xs={24}>
            <List
              dataSource={filteredInstallations}
              renderItem={(installation) => (
                <List.Item 
                  style={{
                    background: 'rgba(15, 20, 30, 0.4)',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    marginBottom: 12,
                    padding: 16
                  }}
                  actions={[
                    <Button 
                      type="primary" 
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handlePlay(installation.id)}
                    >
                      Play
                    </Button>,
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'notes',
                            label: 'Notes & Rating',
                            icon: <EditOutlined />,
                            onClick: () => handleOpenNotesModal(installation)
                          },
                          {
                            key: 'playtime',
                            label: 'View Playtime',
                            icon: <ClockCircleOutlined />,
                            onClick: () => {
                              setPlaytimeInstallationId(installation.id);
                              setPlaytimeGameName(installation.game?.title || 'Game');
                              setPlaytimeModalVisible(true);
                            }
                          },
                          {
                            key: 'collections',
                            label: 'Add to Collection',
                            icon: <FolderOutlined />,
                            onClick: () => {
                              setCollectionsInstallationId(installation.id);
                              setCollectionsModalVisible(true);
                            }
                          },
                          {
                            key: 'uninstall',
                            label: 'Uninstall',
                            icon: <DeleteOutlined />,
                            danger: true,
                            onClick: () => handleUninstall(installation.id)
                          }
                        ]
                      }}
                    >
                      <Button size="small" icon={<MoreOutlined />} />
                    </Dropdown>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      installation.game?.cover_image_url ? (
                        <img 
                          src={installation.game.cover_image_url} 
                          alt={installation.game.title}
                          style={{ width: 60, height: 80, objectFit: 'cover', borderRadius: 4 }}
                        />
                      ) : (
                        <div style={{ 
                          width: 60, 
                          height: 80, 
                          background: 'rgba(15, 20, 30, 0.6)', 
                          borderRadius: 4,
                          display: 'grid',
                          placeItems: 'center'
                        }}>
                          <FolderOutlined style={{ fontSize: 28, color: '#6ddcff' }} />
                        </div>
                      )
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: '#bfe9ff', fontSize: 16, fontWeight: 500 }}>
                          {installation.game?.title}
                        </span>
                        {installation.is_favorite && (
                          <StarFilled style={{ color: '#ffd700', fontSize: 16 }} />
                        )}
                        {installation.user_rating && installation.user_rating > 0 && (
                          <span style={{ color: '#ffd700', fontSize: 14 }}>
                            ★ {installation.user_rating}
                          </span>
                        )}
                        {installation.completion_status && installation.completion_status !== 'not_started' && (
                          <Tag 
                            color={installation.completion_status === 'completed' ? 'green' : 
                                   installation.completion_status === 'playing' ? 'blue' : 'red'}
                            style={{ fontSize: 11 }}
                          >
                            {installation.completion_status === 'completed' ? 'Completed' :
                             installation.completion_status === 'playing' ? 'Playing' : 'Abandoned'}
                          </Tag>
                        )}
                      </div>
                    }
                    description={
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                        <div>
                          📁 {installation.install_path}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          🕐 {formatPlaytime(installation.total_playtime_seconds || 0)} playtime
                          {installation.last_played && (
                            <> • Last played: {new Date(installation.last_played).toLocaleDateString()}</>
                          )}
                        </div>
                        {installation.user_notes && (
                          <div style={{ marginTop: 4, fontStyle: 'italic', color: '#64748b' }}>
                            "{installation.user_notes.substring(0, 100)}{installation.user_notes.length > 100 ? '...' : ''}"
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Col>
        )}
      </Row>

      <Modal
        title="Scan Results"
        open={scanModalVisible}
        onCancel={() => {
          setScanModalVisible(false);
          setSelectedExe(null);
          setFoundExecutables([]);
        }}
        onOk={handleAddFromScan}
        okText="Add Selected Game"
        okButtonProps={{ disabled: !selectedExe }}
        width={700}
      >
        {scanning ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#94a3b8' }}>Scanning directory for game executables...</div>
          </div>
        ) : foundExecutables.length > 0 ? (
          <div>
            <div style={{ marginBottom: 16, color: '#94a3b8' }}>
              Found {foundExecutables.length} potential game executable(s). Select one to add to your library:
            </div>
            <List
              bordered
              dataSource={foundExecutables}
              renderItem={(exe) => (
                <List.Item
                  onClick={() => setSelectedExe(exe)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedExe === exe ? 'rgba(109, 220, 255, 0.1)' : 'transparent',
                    border: selectedExe === exe ? '1px solid #6ddcff' : '1px solid #1e293b',
                    borderRadius: 8,
                    marginBottom: 8,
                    padding: '12px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, color: '#bfe9ff', marginBottom: 4 }}>
                      {exe.split('\\').pop()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {exe}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
        ) : (
          <Empty description="No game executables found in the selected directory" />
        )}
      </Modal>

      <Modal
        title="Notes & Rating"
        open={notesModalVisible}
        onCancel={() => setNotesModalVisible(false)}
        onOk={handleSaveNotes}
        okText="Save"
        width={600}
      >
        {selectedInstallation && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: '#bfe9ff', marginBottom: 8 }}>Rating</h4>
              <Rate 
                value={rating} 
                onChange={setRating}
                style={{ fontSize: 24 }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: '#bfe9ff', marginBottom: 8 }}>Completion Status</h4>
              <Select 
                value={completionStatus}
                onChange={setCompletionStatus}
                style={{ width: '100%' }}
              >
                <Option value="not_started">Not Started</Option>
                <Option value="playing">Currently Playing</Option>
                <Option value="completed">Completed</Option>
                <Option value="abandoned">Abandoned</Option>
              </Select>
            </div>

            <div>
              <h4 style={{ color: '#bfe9ff', marginBottom: 8 }}>Notes</h4>
              <TextArea 
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={6}
                placeholder="Add your personal notes about this game..."
                style={{
                  background: 'rgba(15, 20, 30, 0.6)',
                  border: '1px solid #1e293b',
                  color: '#bfe9ff'
                }}
              />
            </div>
          </div>
        )}
      </Modal>

      <CollectionsModal 
        visible={collectionsModalVisible}
        onClose={() => {
          setCollectionsModalVisible(false);
          setCollectionsInstallationId(undefined);
        }}
        installationId={collectionsInstallationId}
      />

      <PlaytimeModal 
        visible={playtimeModalVisible}
        onClose={() => setPlaytimeModalVisible(false)}
        installationId={playtimeInstallationId}
        gameName={playtimeGameName}
      />
    </div>
  );
};

export default LibraryView;
