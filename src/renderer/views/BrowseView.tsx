import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Button, Input, Space, Tag, message, Spin, Pagination } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Game } from '../../shared/types';
import FileSelectionModal from '../components/FileSelectionModal';

const { Title } = Typography;
const { Search } = Input;

const BrowseView: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [totalGames, setTotalGames] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileSelectionVisible, setFileSelectionVisible] = useState(false);
  const [torrentFiles, setTorrentFiles] = useState<any[]>([]);
  const [fileFetching, setFileFetching] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGameTitle, setSelectedGameTitle] = useState('');

  useEffect(() => {
    loadTotalCount();
  }, []);

  useEffect(() => {
    loadGames();
  }, [currentPage, pageSize]);

  const loadTotalCount = async () => {
    try {
      const count = await window.electronAPI.getGamesCount();
      setTotalGames(count);
    } catch (error) {
      console.error('Failed to load games count:', error);
    }
  };

  const loadGames = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const data = await window.electronAPI.getGames(pageSize, offset);
      // Filter out games without magnet links
      const gamesWithMagnets = data.filter(game => game.magnet_link && game.magnet_link.trim() !== '');
      setGames(gamesWithMagnets);
    } catch (error) {
      message.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    
    if (!value) {
      loadGames();
      return;
    }

    setLoading(true);
    try {
      const results = await window.electronAPI.searchGames(value);
      // Filter out games without magnet links
      const gamesWithMagnets = results.filter(game => game.magnet_link && game.magnet_link.trim() !== '');
      setGames(gamesWithMagnets);
      setTotalGames(gamesWithMagnets.length);
    } catch (error) {
      message.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (gameId: number, gameTitle: string) => {
    try {
      const game = games.find(g => g.id === gameId);
      if (!game || !game.magnet_link) {
        message.error('Game magnet link not found');
        return;
      }

      setSelectedGameId(gameId);
      setSelectedGameTitle(gameTitle);
      setFileFetching(true);

      try {
        const files = await window.electronAPI.getTorrentFiles(game.magnet_link);
        setTorrentFiles(files);

        // Check if there are optional files
        const hasOptionalFiles = files.some((f: any) => f.isOptional);
        
        if (hasOptionalFiles) {
          // Show modal for file selection
          setFileSelectionVisible(true);
        } else {
          // No optional files, start download directly
          await window.electronAPI.startDownload(gameId);
          message.success('Download started!');
        }
      } catch (fileError) {
        console.error('Error fetching torrent files:', fileError);
        // Fallback: start download without file selection
        await window.electronAPI.startDownload(gameId);
        message.success('Download started!');
      }
    } catch (error) {
      message.error('Failed to start download');
    } finally {
      setFileFetching(false);
    }
  };

  const handleFileSelectionConfirm = async (selectedIndices: number[]) => {
    if (!selectedGameId) return;

    try {
      setFileSelectionVisible(false);
      await window.electronAPI.startDownload(selectedGameId, selectedIndices);
      message.success('Download started!');
    } catch (error) {
      message.error('Failed to start download');
    }
  };

  const handleFileSelectionCancel = () => {
    setFileSelectionVisible(false);
  };

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
      setCurrentPage(1);
    }
  };

  if (loading) {
    return (
      <div className="page-shell" style={{ textAlign: 'center', paddingTop: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <FileSelectionModal
        visible={fileSelectionVisible}
        files={torrentFiles}
        loading={fileFetching}
        gameName={selectedGameTitle}
        onConfirm={handleFileSelectionConfirm}
        onCancel={handleFileSelectionCancel}
      />
      <div className="hero-bar">
        <div>
          <Title level={2} className="page-title">Browse Games</Title>
          <div className="hero-subtitle">Search the catalog and start a download.</div>
        </div>
        <div className="hero-actions">
          <span className="chip">{totalGames.toLocaleString()} titles</span>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Search
          placeholder="Search games..."
          onSearch={handleSearch}
          style={{ maxWidth: '640px' }}
          size="large"
          prefix={<SearchOutlined />}
          allowClear
        />
        <div style={{ marginTop: '12px', color: '#94a3b8' }}>
          Showing {games.length} of {totalGames.toLocaleString()} games
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {games.map(game => (
          <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              className="glass-card"
              cover={
                <div className="glass-cover">
                  {game.cover_image_url ? (
                    <img 
                      src={game.cover_image_url} 
                      alt={game.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:#bfe9ff;font-size:32px">🎮</div>';
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#bfe9ff', fontSize: 32 }}>🎮</div>
                  )}
                </div>
              }
              actions={[
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(game.id, game.title)}
                  disabled={!game.magnet_link}
                >
                  Download
                </Button>
              ]}
            >
              <Card.Meta
                title={<div style={{ fontSize: '14px', color: '#e2e8f0' }}>{game.title}</div>}
                description={
                  <div className="card-meta">
                    <div>{game.repack_size_mb ? `${(game.repack_size_mb / 1024).toFixed(1)} GB` : 'Size unknown'}</div>
                    <Space wrap style={{ marginTop: '8px' }}>
                      {game.genres.slice(0, 3).map(genre => (
                        <Tag key={genre} className="tag-pill">{genre}</Tag>
                      ))}
                    </Space>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      {!searchTerm && (
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={totalGames}
            onChange={handlePageChange}
            onShowSizeChange={handlePageChange}
            showSizeChanger
            pageSizeOptions={[12, 24, 48, 96]}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} games`}
          />
        </div>
      )}
    </div>
  );
};

export default BrowseView;
