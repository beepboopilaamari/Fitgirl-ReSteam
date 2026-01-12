import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Statistic, List, Empty, Button, Progress, Tag } from 'antd';
import { PlayCircleOutlined, StarFilled, DownloadOutlined, FolderOutlined, ClockCircleOutlined, TrophyOutlined, HddOutlined } from '@ant-design/icons';
import { useLibrary } from '../contexts/LibraryContext';
import { useDownloads } from '../contexts/DownloadContext';
import { useNavigate } from 'react-router-dom';
import { DownloadStatus } from '../../shared/types';

const { Title } = Typography;

const DashboardView: React.FC = () => {
  const { installations, loading: libraryLoading } = useLibrary();
  const { activeDownloads } = useDownloads();
  const navigate = useNavigate();
  const [totalPlaytime, setTotalPlaytime] = useState(0);
  const [totalDiskSpace, setTotalDiskSpace] = useState(0);

  useEffect(() => {
    // Calculate total playtime
    const playtime = installations.reduce((acc, inst) => acc + (inst.total_playtime_seconds || 0), 0);
    setTotalPlaytime(playtime);

    // Calculate total disk space
    const diskSpace = installations.reduce((acc, inst) => acc + (inst.install_size_bytes || 0), 0);
    setTotalDiskSpace(diskSpace);
  }, [installations]);

  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(1)} GB`;
  };

  const recentlyPlayed = installations
    .filter(inst => inst.last_played)
    .sort((a, b) => new Date(b.last_played!).getTime() - new Date(a.last_played!).getTime())
    .slice(0, 5);

  const favorites = installations.filter(inst => inst.is_favorite).slice(0, 5);

  const activeDownloadsList = activeDownloads.filter(d => 
    [DownloadStatus.DOWNLOADING, DownloadStatus.PAUSED, DownloadStatus.QUEUED].includes(d.status as DownloadStatus)
  );

  const topRated = installations
    .filter(inst => inst.user_rating && inst.user_rating > 0)
    .sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0))
    .slice(0, 5);

  const handlePlay = async (installationId: number) => {
    try {
      await window.electronAPI.launchGame(installationId);
    } catch (error) {
      console.error('Failed to launch game:', error);
    }
  };

  const getCompletionColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'playing': return 'blue';
      case 'abandoned': return 'red';
      default: return 'default';
    }
  };

  const getCompletionLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'playing': return 'Playing';
      case 'abandoned': return 'Abandoned';
      default: return 'Not Started';
    }
  };

  if (libraryLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div className="page-shell">
      <div className="hero-bar">
        <div>
          <Title level={2} className="page-title">Dashboard</Title>
          <div className="hero-subtitle">Welcome back! Here's your gaming overview.</div>
        </div>
      </div>

      {/* Stats Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-card" style={{ textAlign: 'center' }}>
            <FolderOutlined style={{ fontSize: 32, color: '#6ddcff', marginBottom: 8 }} />
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Total Games</span>}
              value={installations.length}
              valueStyle={{ color: '#bfe9ff', fontSize: 32 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-card" style={{ textAlign: 'center' }}>
            <ClockCircleOutlined style={{ fontSize: 32, color: '#6ddcff', marginBottom: 8 }} />
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Total Playtime</span>}
              value={formatPlaytime(totalPlaytime)}
              valueStyle={{ color: '#bfe9ff', fontSize: 32 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-card" style={{ textAlign: 'center' }}>
            <HddOutlined style={{ fontSize: 32, color: '#6ddcff', marginBottom: 8 }} />
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Disk Space Used</span>}
              value={formatBytes(totalDiskSpace)}
              valueStyle={{ color: '#bfe9ff', fontSize: 32 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="glass-card" style={{ textAlign: 'center' }}>
            <StarFilled style={{ fontSize: 32, color: '#ffd700', marginBottom: 8 }} />
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Favorites</span>}
              value={favorites.length}
              valueStyle={{ color: '#bfe9ff', fontSize: 32 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Active Downloads */}
        {activeDownloadsList.length > 0 && (
          <Col xs={24} lg={12}>
            <Card 
              className="glass-card"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#bfe9ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DownloadOutlined /> Active Downloads
                  </span>
                  <Button size="small" onClick={() => navigate('/downloads')}>View All</Button>
                </div>
              }
            >
              <List
                dataSource={activeDownloadsList}
                renderItem={(download) => (
                  <List.Item style={{ padding: '12px 0' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: '#bfe9ff' }}>{download.game?.title}</span>
                        <span style={{ color: '#94a3b8' }}>{Math.round(download.progress)}%</span>
                      </div>
                      <Progress 
                        percent={Math.round(download.progress)} 
                        status="active" 
                        showInfo={false}
                        strokeWidth={6}
                      />
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}

        {/* Recently Played */}
        <Col xs={24} lg={activeDownloadsList.length > 0 ? 12 : 12}>
          <Card 
            className="glass-card"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#bfe9ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClockCircleOutlined /> Recently Played
                </span>
                <Button size="small" onClick={() => navigate('/library')}>View Library</Button>
              </div>
            }
          >
            {recentlyPlayed.length > 0 ? (
              <List
                dataSource={recentlyPlayed}
                renderItem={(installation) => (
                  <List.Item 
                    style={{ padding: '12px 0' }}
                    actions={[
                      <Button 
                        size="small" 
                        type="primary" 
                        icon={<PlayCircleOutlined />}
                        onClick={() => handlePlay(installation.id)}
                      >
                        Play
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        installation.game?.cover_image_url ? (
                          <img 
                            src={installation.game.cover_image_url} 
                            alt={installation.game.title}
                            style={{ width: 50, height: 65, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ) : (
                          <div style={{ 
                            width: 50, 
                            height: 65, 
                            background: 'rgba(15, 20, 30, 0.6)', 
                            borderRadius: 4,
                            display: 'grid',
                            placeItems: 'center'
                          }}>
                            <FolderOutlined style={{ fontSize: 24, color: '#6ddcff' }} />
                          </div>
                        )
                      }
                      title={<span style={{ color: '#bfe9ff' }}>{installation.game?.title}</span>}
                      description={
                        <div style={{ fontSize: 12 }}>
                          <div style={{ color: '#94a3b8' }}>
                            Played {new Date(installation.last_played!).toLocaleDateString()}
                          </div>
                          {installation.total_playtime_seconds > 0 && (
                            <div style={{ color: '#64748b', marginTop: 4 }}>
                              {formatPlaytime(installation.total_playtime_seconds)} playtime
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No games played yet" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>

        {/* Favorites */}
        <Col xs={24} lg={12}>
          <Card 
            className="glass-card"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#bfe9ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StarFilled style={{ color: '#ffd700' }} /> Favorites
                </span>
                <Button size="small" onClick={() => navigate('/library')}>View All</Button>
              </div>
            }
          >
            {favorites.length > 0 ? (
              <List
                dataSource={favorites}
                renderItem={(installation) => (
                  <List.Item 
                    style={{ padding: '12px 0' }}
                    actions={[
                      <Button 
                        size="small" 
                        type="primary" 
                        icon={<PlayCircleOutlined />}
                        onClick={() => handlePlay(installation.id)}
                      >
                        Play
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        installation.game?.cover_image_url ? (
                          <img 
                            src={installation.game.cover_image_url} 
                            alt={installation.game.title}
                            style={{ width: 50, height: 65, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ) : (
                          <div style={{ 
                            width: 50, 
                            height: 65, 
                            background: 'rgba(15, 20, 30, 0.6)', 
                            borderRadius: 4,
                            display: 'grid',
                            placeItems: 'center'
                          }}>
                            <FolderOutlined style={{ fontSize: 24, color: '#6ddcff' }} />
                          </div>
                        )
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#bfe9ff' }}>{installation.game?.title}</span>
                          {installation.user_rating && installation.user_rating > 0 && (
                            <span style={{ fontSize: 12, color: '#ffd700' }}>
                              ★ {installation.user_rating}
                            </span>
                          )}
                        </div>
                      }
                      description={
                        <div style={{ fontSize: 12 }}>
                          {installation.completion_status && installation.completion_status !== 'not_started' && (
                            <Tag 
                              color={getCompletionColor(installation.completion_status)} 
                              style={{ marginRight: 0, fontSize: 11 }}
                            >
                              {getCompletionLabel(installation.completion_status)}
                            </Tag>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No favorites yet" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>

        {/* Top Rated */}
        <Col xs={24} lg={12}>
          <Card 
            className="glass-card"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#bfe9ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrophyOutlined /> Top Rated
                </span>
                <Button size="small" onClick={() => navigate('/library')}>View All</Button>
              </div>
            }
          >
            {topRated.length > 0 ? (
              <List
                dataSource={topRated}
                renderItem={(installation) => (
                  <List.Item 
                    style={{ padding: '12px 0' }}
                    actions={[
                      <Button 
                        size="small" 
                        type="primary" 
                        icon={<PlayCircleOutlined />}
                        onClick={() => handlePlay(installation.id)}
                      >
                        Play
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        installation.game?.cover_image_url ? (
                          <img 
                            src={installation.game.cover_image_url} 
                            alt={installation.game.title}
                            style={{ width: 50, height: 65, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ) : (
                          <div style={{ 
                            width: 50, 
                            height: 65, 
                            background: 'rgba(15, 20, 30, 0.6)', 
                            borderRadius: 4,
                            display: 'grid',
                            placeItems: 'center'
                          }}>
                            <FolderOutlined style={{ fontSize: 24, color: '#6ddcff' }} />
                          </div>
                        )
                      }
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#bfe9ff' }}>{installation.game?.title}</span>
                          <span style={{ fontSize: 14, color: '#ffd700' }}>
                            {'★'.repeat(installation.user_rating || 0)}
                          </span>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          Your rating: {installation.user_rating}/5
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No rated games yet" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardView;
